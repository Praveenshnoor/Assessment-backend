const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { exportExamResults } = require('../services/exportService');
const verifyAdmin = require('../middleware/verifyAdmin');

// Get all results as JSON - admin only (shows only highest score per student per test)
router.get('/all-results', verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      WITH ranked_results AS (
        SELECT 
          r.id,
          r.marks_obtained,
          r.total_marks,
          r.created_at as submitted_at,
          ROUND((r.marks_obtained::numeric / r.total_marks::numeric * 100), 2) as percentage,
          e.name as exam_name,
          e.date as exam_date,
          s.full_name as student_name,
          s.roll_number,
          s.email as student_email,
          s.id as student_id,
          t.id as test_id,
          t.duration,
          t.max_attempts,
          t.passing_percentage,
          t.start_datetime,
          t.end_datetime,
          ROW_NUMBER() OVER (
            PARTITION BY s.id, t.id 
            ORDER BY r.marks_obtained DESC, r.created_at DESC
          ) as rank
        FROM results r
        INNER JOIN exams e ON r.exam_id = e.id
        INNER JOIN students s ON r.student_id = s.id
        LEFT JOIN tests t ON t.title = e.name
        WHERE t.id IS NOT NULL
      )
      SELECT 
        id,
        marks_obtained,
        total_marks,
        submitted_at,
        percentage,
        exam_name,
        exam_date,
        student_name,
        roll_number,
        student_email,
        test_id,
        duration,
        max_attempts,
        passing_percentage,
        start_datetime,
        end_datetime
      FROM ranked_results
      WHERE rank = 1
      ORDER BY submitted_at DESC
    `);

    res.json({
      success: true,
      results: result.rows
    });
  } catch (error) {
    console.error('Error fetching all results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch results'
    });
  }
});

// Export endpoint - admin only
router.get('/results', verifyAdmin, async (req, res) => {
  console.log('=== EXPORT ROUTE HIT ===');
  console.log('Query params:', req.query);
  console.log('Headers:', req.headers.authorization);
  
  try {
    const { examId, testId, startDate, endDate, studentIds } = req.query;
    console.log('Parsed examId:', examId, 'testId:', testId);

    const filters = {};

    // If testId is provided, find the corresponding exam(s) by name
    if (testId) {
      const parsedTestId = parseInt(testId, 10);
      if (isNaN(parsedTestId)) {
        return res.status(400).json({ error: 'Invalid test ID format' });
      }
      
      // Get the test name
      const testResult = await pool.query('SELECT title FROM tests WHERE id = $1', [parsedTestId]);
      if (testResult.rows.length === 0) {
        return res.status(404).json({ error: 'Test not found' });
      }
      
      const testName = testResult.rows[0].title;
      
      // Find ALL matching exams by name
      const examResult = await pool.query('SELECT id FROM exams WHERE name = $1', [testName]);
      if (examResult.rows.length === 0) {
        return res.status(404).json({ error: 'No results found for this exam. Please ensure students have completed the exam before exporting.' });
      }
      
      // Use ALL matching exam IDs
      filters.examIds = examResult.rows.map(row => row.id);
      console.log('Found matching exam IDs:', filters.examIds, 'for test:', testName);
    } else if (examId) {
      const parsedExamId = parseInt(examId, 10);
      console.log('Parsed exam ID:', parsedExamId);
      if (isNaN(parsedExamId)) {
        return res.status(400).json({ error: 'Invalid exam ID format' });
      }
      filters.examId = parsedExamId;
    }

    if (startDate) {
      filters.startDate = startDate;
    }
    if (endDate) {
      filters.endDate = endDate;
    }

    if (studentIds) {
      filters.studentIds = studentIds;
    }

    console.log('Calling exportExamResults with filters:', filters);
    const { buffer, filename } = await exportExamResults(filters);
    console.log('Export successful, filename:', filename);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );

    res.send(buffer);

  } catch (error) {
    console.error('=== EXPORT ERROR ===');
    console.error('Error:', error);
    console.error('Status code:', error.statusCode);
    console.error('Message:', error.message);
    
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal server error';

    if (statusCode === 500) {
      console.error('Error in export endpoint:', error);
    }

    res.status(statusCode).json({ error: message });
  }
});

router.get('/institutes', verifyAdmin, async (req, res) => {
  try {
    console.log('=== FETCHING INSTITUTES ===');
    const result = await pool.query(
      `SELECT DISTINCT 
        CASE 
          WHEN institute IS NULL OR institute = '' THEN 'Not Specified'
          ELSE institute 
        END as institute_name 
      FROM students 
      ORDER BY institute_name`
    );
    const institutes = result.rows.map(row => row.institute_name);
    console.log('Found institutes:', institutes);
    res.json({ success: true, institutes });
  } catch (error) {
    console.error('Error fetching institutes:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch institutes' });
  }
});

router.get('/students', verifyAdmin, async (req, res) => {
  try {
    const { institutes } = req.query;
    console.log('=== STUDENT EXPORT REQUEST ===');
    console.log('Raw institutes param:', institutes);
    console.log('Decoded institutes:', decodeURIComponent(institutes || ''));

    let queryText = `SELECT id, full_name, roll_number, email, 
      COALESCE(phone, 'N/A') as phone, 
      COALESCE(address, 'N/A') as address, 
      COALESCE(institute, 'Not Specified') as institute_name, 
      COALESCE(course, 'N/A') as course, 
      COALESCE(specialization, 'N/A') as specialization,
      COALESCE(resume_link, 'N/A') as resume_link,
      created_at
    FROM students`;
    const queryParams = [];

    if (institutes && institutes !== 'ALL') {
      const instituteList = institutes.split(',').map(c => c.trim());
      console.log('Institute list after split:', instituteList);
      
      if (instituteList.length > 0) {
        // Handle "Not Specified" case
        const hasNotSpecified = instituteList.includes('Not Specified');
        const otherInstitutes = instituteList.filter(c => c !== 'Not Specified');
        
        console.log('Has Not Specified:', hasNotSpecified);
        console.log('Other institutes:', otherInstitutes);
        
        if (hasNotSpecified && otherInstitutes.length > 0) {
          // Case-insensitive matching using LOWER()
          queryText += ` WHERE (LOWER(institute) = ANY($1) OR institute IS NULL OR institute = '')`;
          queryParams.push(otherInstitutes.map(i => i.toLowerCase()));
        } else if (hasNotSpecified) {
          queryText += ` WHERE (institute IS NULL OR institute = '')`;
        } else {
          // Case-insensitive matching using LOWER()
          queryText += ` WHERE LOWER(institute) = ANY($1)`;
          queryParams.push(instituteList.map(i => i.toLowerCase()));
        }
      }
    }

    queryText += ` ORDER BY institute, full_name`;
    
    console.log('Final query:', queryText);
    console.log('Query params:', queryParams);
    
    const result = await pool.query(queryText, queryParams);
    const students = result.rows;

    console.log(`Found ${students.length} students`);
    
    if (students.length > 0) {
      console.log('Sample student institutes:', students.slice(0, 3).map(s => s.institute_name));
    }

    // Check if no students found
    if (students.length === 0) {
      console.log('No students found - returning 404');
      return res.status(404).json({ 
        success: false, 
        message: 'No students found for the selected institute(s)' 
      });
    }

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Student Report');

    // Define columns
    worksheet.columns = [
      { header: 'Registration ID', key: 'roll_number', width: 15 },
      { header: 'Name', key: 'full_name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Institute Name', key: 'institute_name', width: 30 },
      { header: 'Course', key: 'course', width: 15 },
      { header: 'Specialization', key: 'specialization', width: 20 },
      { header: 'Address', key: 'address', width: 40 },
      { header: 'Resume Link', key: 'resume_link', width: 50 },
      { header: 'Registration Date', key: 'created_at', width: 20 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 20;

    // Add data rows
    students.forEach((student, index) => {
      const row = worksheet.addRow({
        roll_number: student.roll_number || 'N/A',
        full_name: student.full_name || 'N/A',
        email: student.email || 'N/A',
        phone: student.phone || 'N/A',
        institute_name: student.institute_name || 'Not Specified',
        course: student.course || 'N/A',
        specialization: student.specialization || 'N/A',
        address: student.address || 'N/A',
        resume_link: student.resume_link || 'N/A',
        created_at: student.created_at ? new Date(student.created_at).toLocaleDateString('en-IN') : 'N/A'
      });

      // Alternate row colors
      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F4F6' }
        };
      }
    });

    // Add borders to all cells
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    console.log('Excel file generated successfully');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `Students_Report_${timestamp}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
    
    console.log('Excel file sent successfully');
  } catch (error) {
    console.error('=== STUDENT EXPORT ERROR ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ success: false, message: 'Failed to export students', error: error.message });
  }
});

module.exports = router;
