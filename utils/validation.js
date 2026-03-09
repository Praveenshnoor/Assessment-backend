// validation functions for checking user inputs

// checks if date string is in correct format (YYYY-MM-DD)
function isValidDateFormat(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }
  
  // regex pattern for YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }
  
  // make sure it's actually a valid date
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return false;
  }
  
  // double check the components match (catches stuff like Feb 30th)
  const [year, month, day] = dateString.split('-').map(Number);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 && // months start at 0 in JS
    date.getDate() === day
  );
}

// makes sure start date comes before end date
function isValidDateRange(startDate, endDate) {
  if (!startDate || !endDate) {
    return true; // if one is missing, skip this check
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return start <= end;
}

// validates student IDs - can be array or comma-separated string
function isValidStudentIds(studentIds) {
  if (studentIds === undefined || studentIds === null) {
    return true; // optional field
  }
  
  if (studentIds === '') {
    return false;
  }
  
  let idsArray;
  
  // handle both string and array formats
  if (typeof studentIds === 'string') {
    idsArray = studentIds.split(',').map(id => id.trim());
  } else if (Array.isArray(studentIds)) {
    idsArray = studentIds;
  } else {
    return false;
  }
  
  // all IDs must be positive integers
  return idsArray.length > 0 && idsArray.every(id => {
    const num = Number(id);
    return !isNaN(num) && Number.isInteger(num) && num > 0;
  });
}

// main validation function - checks all parameters and returns error if something's wrong
function validateQueryParameters(params = {}) {
  const { startDate, endDate, studentIds } = params;
  
  // check start date
  if (startDate && !isValidDateFormat(startDate)) {
    return {
      status: 400,
      message: 'Invalid start date format. Expected YYYY-MM-DD.'
    };
  }
  
  // check end date
  if (endDate && !isValidDateFormat(endDate)) {
    return {
      status: 400,
      message: 'Invalid end date format. Expected YYYY-MM-DD.'
    };
  }
  
  // make sure date range makes sense
  if (startDate && endDate && !isValidDateRange(startDate, endDate)) {
    return {
      status: 400,
      message: 'Invalid date range. Start date must be less than or equal to end date.'
    };
  }
  
  // check student IDs format
  if (studentIds && !isValidStudentIds(studentIds)) {
    return {
      status: 400,
      message: 'Invalid student IDs. Expected comma-separated positive integers or an array of positive integers.'
    };
  }
  
  // everything looks good
  return null;
}

// converts student IDs from string/array to array of numbers
function parseStudentIds(studentIds) {
  if (!studentIds) {
    return null;
  }
  
  let idsArray;
  
  // split string or use array as-is
  if (typeof studentIds === 'string') {
    idsArray = studentIds.split(',').map(id => id.trim());
  } else if (Array.isArray(studentIds)) {
    idsArray = studentIds;
  } else {
    return null;
  }
  
  // convert everything to integers
  return idsArray.map(id => parseInt(id, 10));
}

module.exports = {
  validateQueryParameters,
  parseStudentIds
};
