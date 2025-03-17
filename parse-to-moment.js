const moment = require('moment');

function normalizeDateString(input) {
  let dateString = input.trim().replace(/[^:a-zA-Z0-9\s-]+/g,"").replace('Start:', '').toUpperCase();
  ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'].forEach(day => {
    dateString = dateString.replace(day, '').trim();
  });
  return dateString;
}

function parseToMoment(dateString) {
  // Normalize the input string
  const normalized = normalizeDateString(dateString);
  
  // ISO format with timezone information (2025-03-18 18:00:00 UTC...)
  if (normalized.includes('UTC')) {
    // Extract the date part before any timezone information
    const datePart = normalized.split('UTC')[0].trim();
    
    // Parse the ISO format
    return moment(datePart, 'YYYY-MM-DD HH:mm:ss');
  }
  
  // Month name format (FEBRUARY 06 2025...)
  if (/[A-Z]+ \d{2} \d{4}/.test(normalized)) {
    // Extract parts
    const parts = normalized.split(' ');
    const month = parts[0];
    const day = parts[1];
    const year = parts[2];
    
    // Extract time if present
    let time = '00:00';
    if (parts.length > 3 && parts[3].includes(':')) {
      time = parts[3];
      // Handle AM/PM
      if (parts.length > 4 && (parts[4] === 'PM' || parts[4] === 'AM')) {
        time += ' ' + parts[4];
      }
    }
    
    // Combine and parse
    return moment(`${month} ${day} ${year} ${time}`, 'MMMM DD YYYY h:mm A');
  }
  
  // ISO format without timezone (2024-12-17...)
  if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
    return moment(normalized.split(' ')[0] + ' ' + normalized.split(' ')[1], 'YYYY-MM-DD HH:mm:ss');
  }
  
  // If all else fails, try moment's auto-parse
  const result = moment(dateString);
  
  // Check if parsing was successful
  if (!result.isValid()) {
    console.error(`Failed to parse date string: "${dateString}"`);
    return null;
  }
  
  return result;
}

module.exports = parseToMoment;