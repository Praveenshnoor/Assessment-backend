const ExcelJS = require('exceljs');
const { validateQueryParameters, parseStudentIds } = require('../utils/validation');
const { getExamResults, getExamById } = require('../config/queries');

// takes raw database rows and formats them for excel
function formatResultsForExcel(rows) {
  if (!Array.isArray(rows)) {
    throw new Error('Input must be an array');
  }

  return rows.map(row => {
    // calculate percentage
    const percentage = row.total_marks > 0 
      ? (row.marks_obtained / row.total_marks * 100) 
      : 0;

    // format date as YYYY-MM-DD
    let formattedDate = '';
    if (row.exam_date) {
      const date = new Date(row.exam_date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      formattedDate = `${year}-${month}-${day}`;
    }

    return {
      student_id: row.student_id,
      student_name: row.student_name,
      email: row.student_email,
      exam_name: row.exam_name,
      exam_date: formattedDate,
      marks_obtained: row.marks_obtained,
      total_marks: row.total_marks,
      percentage: percentage,
      status: row.status || (percentage >= 50 ? 'Pass' : 'Fail')
    };
  });
}

// creates the actual excel file with formatting
async function generateExcelFile(data, filename) {
  if (!Array.isArray(data)) {
    throw new Error('Data must be an array');
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Exam Results');

  // set up columns
  worksheet.columns = [
    { header: 'Student ID', key: 'student_id', width: 12 },
    { header: 'Student Name', key: 'student_name', width: 20 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Exam Name', key: 'exam_name', width: 25 },
    { header: 'Exam Date', key: 'exam_date', width: 12 },
    { header: 'Marks Obtained', key: 'marks_obtained', width: 15 },
    { header: 'Total Marks', key: 'total_marks', width: 12 },
    { header: 'Percentage', key: 'percentage', width: 12 },
    { header: 'Status', key: 'status', width: 10 }
  ];

  // style the header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // add all the data
  data.forEach(row => {
    worksheet.addRow(row);
  });

  // format percentage column to show 2 decimals
  const percentageColumn = worksheet.getColumn('percentage');
  percentageColumn.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
    if (rowNumber > 1) {
      cell.numFmt = '0.00';
    }
  });

  // auto-size columns based on content
  worksheet.columns.forEach(column => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, cell => {
      const cellValue = cell.value ? cell.value.toString() : '';
      maxLength = Math.max(maxLength, cellValue.length);
    });
    column.width = Math.max(column.width || 10, maxLength + 2);
  });

  // convert to buffer for sending
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

// main function that handles the whole export process
async function exportExamResults(filters = {}) {
  try {
    // validate inputs first
    const validationError = validateQueryParameters(filters);
    if (validationError) {
      const error = new Error(validationError.message);
      error.statusCode = validationError.status;
      throw error;
    }

    // parse student IDs if they're provided
    let parsedFilters = { ...filters };
    if (filters.studentIds) {
      parsedFilters.studentIds = parseStudentIds(filters.studentIds);
      if (!parsedFilters.studentIds) {
        const error = new Error('Invalid student IDs format');
        error.statusCode = 400;
        throw error;
      }
    }

    // check if the exam actually exists
    if (parsedFilters.examId) {
      try {
        const exam = await getExamById(parsedFilters.examId);
        if (!exam) {
          const error = new Error(`Exam with ID ${parsedFilters.examId} not found`);
          error.statusCode = 404;
          throw error;
        }
      } catch (err) {
        if (err.statusCode === 404) {
          throw err;
        }
        const error = new Error('Database error while checking exam');
        error.statusCode = 500;
        throw error;
      }
    }

    // get the data from database
    let rows;
    try {
      rows = await getExamResults(parsedFilters);
    } catch (err) {
      console.error('Database error in exportExamResults:', err);
      const error = new Error('Database error while retrieving exam results');
      error.statusCode = 500;
      throw error;
    }

    // make sure we got some results
    if (!rows || rows.length === 0) {
      const error = new Error('No exam results found matching the specified filters');
      error.statusCode = 404;
      throw error;
    }

    // format the data for excel
    let formattedData;
    try {
      formattedData = formatResultsForExcel(rows);
    } catch (err) {
      console.error('Error formatting results for Excel:', err);
      const error = new Error('Error formatting exam results');
      error.statusCode = 500;
      throw error;
    }

    // create filename based on what was filtered
    let filename;
    if (parsedFilters.examId && rows.length > 0) {
      const examName = rows[0].exam_name.replace(/[^a-zA-Z0-9]/g, '_');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      filename = `exam_results_${examName}_${timestamp}.xlsx`;
    } else {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      filename = `exam_results_all_${timestamp}.xlsx`;
    }

    // generate the excel file
    let buffer;
    try {
      buffer = await generateExcelFile(formattedData, filename);
    } catch (err) {
      console.error('Error generating Excel file:', err);
      const error = new Error('Error generating Excel file');
      error.statusCode = 500;
      throw error;
    }

    // send it back
    return {
      buffer,
      filename
    };

  } catch (err) {
    if (err.statusCode) {
      throw err;
    }
    
    console.error('Unexpected error in exportExamResults:', err);
    const error = new Error('Internal server error');
    error.statusCode = 500;
    throw error;
  }
}

module.exports = {
  formatResultsForExcel,
  generateExcelFile,
  exportExamResults
};
