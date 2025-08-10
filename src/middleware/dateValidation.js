import { AppError } from "./erroeHandling.js";

/**
 * Parse simple date format (DD/MM/YYYY or MM/DD/YYYY) and separate time
 * @param {string} dateString - Date in format like "06/08/2025" or "2025-08-06"
 * @param {string} timeString - Time in format like "09:44" or "9:44 AM"
 * @param {string} dateFormat - "DD/MM/YYYY" or "MM/DD/YYYY" (default: "DD/MM/YYYY")
 * @returns {Date} - Combined date and time as Date object (local time)
 */
export const parseSimpleDateAndTime = (dateString, timeString = "00:00", dateFormat = "DD/MM/YYYY") => {
  if (!dateString) return null;
  
  try {
    let day, month, year;
    
    // Handle different date formats
    if (dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length !== 3) {
        throw new Error('Date must be in DD/MM/YYYY or MM/DD/YYYY format');
      }
      
      if (dateFormat === "MM/DD/YYYY") {
        [month, day, year] = parts;
      } else { // Default DD/MM/YYYY
        [day, month, year] = parts;
      }
    } else if (dateString.includes('-')) {
      // Handle YYYY-MM-DD format
      const parts = dateString.split('-');
      if (parts.length !== 3) {
        throw new Error('Date must be in YYYY-MM-DD format');
      }
      [year, month, day] = parts;
    } else {
      throw new Error('Date must contain / or - separators');
    }
    
    // Parse and validate date components
    day = parseInt(day, 10);
    month = parseInt(month, 10);
    year = parseInt(year, 10);
    
    if (day < 1 || day > 31) {
      throw new Error('Day must be between 1 and 31');
    }
    if (month < 1 || month > 12) {
      throw new Error('Month must be between 1 and 12');
    }
    if (year < 2020 || year > 2030) {
      throw new Error('Year must be between 2020 and 2030');
    }
    
    // Parse time
    let hours = 0, minutes = 0;
    if (timeString && timeString.trim() !== "") {
      const timeStr = timeString.trim().toLowerCase();
      let isPM = false;
      
      // Handle AM/PM format
      if (timeStr.includes('am') || timeStr.includes('pm')) {
        isPM = timeStr.includes('pm');
        const cleanTime = timeStr.replace(/[ap]m/g, '').trim();
        const timeParts = cleanTime.split(':');
        hours = parseInt(timeParts[0], 10);
        minutes = timeParts[1] ? parseInt(timeParts[1], 10) : 0;
        
        // Convert to 24-hour format
        if (isPM && hours !== 12) {
          hours += 12;
        } else if (!isPM && hours === 12) {
          hours = 0;
        }
      } else {
        // Handle 24-hour format
        const timeParts = timeString.split(':');
        hours = parseInt(timeParts[0], 10);
        minutes = timeParts[1] ? parseInt(timeParts[1], 10) : 0;
      }
      
      // Validate time
      if (hours < 0 || hours > 23) {
        throw new Error('Hours must be between 0 and 23');
      }
      if (minutes < 0 || minutes > 59) {
        throw new Error('Minutes must be between 0 and 59');
      }
    }
    
    // Create date using UTC to avoid timezone issues
    // This ensures consistent behavior across different server timezones
    const combinedDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
    
    // Validate the created date
    if (isNaN(combinedDate.getTime())) {
      throw new Error('Invalid date combination');
    }
    
    // Additional validation: check if the parsed components match
    const testDate = new Date(year, month - 1, day);
    if (testDate.getDate() !== day || 
        testDate.getMonth() !== month - 1 || 
        testDate.getFullYear() !== year) {
      throw new Error('Invalid date - day does not exist in the specified month');
    }
    
        
    return combinedDate;
    
  } catch (error) {
    throw new Error(`Invalid date/time format: ${error.message}. Expected date: "DD/MM/YYYY" (e.g., "06/08/2025") and time: "HH:MM" or "H:MM AM/PM" (e.g., "09:44" or "9:44 AM")`);
  }
};

/**
 * Normalize and validate ISO date strings (legacy support)
 * Fixes common formatting issues like single-digit hours, minutes, seconds
 */
export const normalizeISODate = (dateString) => {
  if (!dateString) return null;
  
  try {
    let normalizedDateString = dateString.toString().trim();
    
    // Fix single-digit hours (e.g., "T9:44:00Z" -> "T09:44:00Z")
    normalizedDateString = normalizedDateString.replace(/T(\d):/, 'T0$1:');
    
    // Fix single-digit minutes (e.g., "T09:4:00Z" -> "T09:04:00Z")
    normalizedDateString = normalizedDateString.replace(/T(\d{2}):(\d):/, 'T$1:0$2:');
    
    // Fix single-digit seconds (e.g., "T09:44:4Z" -> "T09:44:04Z")
    normalizedDateString = normalizedDateString.replace(/T(\d{2}):(\d{2}):(\d)Z/, 'T$1:$2:0$3Z');
    
    // Handle missing seconds (e.g., "T09:44Z" -> "T09:44:00Z")
    normalizedDateString = normalizedDateString.replace(/T(\d{2}):(\d{2})Z/, 'T$1:$2:00Z');
    
    // Handle missing timezone (e.g., "2025-08-06T09:44:00" -> "2025-08-06T09:44:00Z")
    if (!normalizedDateString.endsWith('Z') && !normalizedDateString.includes('+') && !normalizedDateString.includes('-', 10)) {
      normalizedDateString += 'Z';
    }
    
    const parsedDate = new Date(normalizedDateString);
    
    // Check if the date is valid
    if (isNaN(parsedDate.getTime())) {
      throw new Error('Invalid date format');
    }
    
    return parsedDate;
  } catch (error) {
    throw new Error(`Invalid date format. Please use ISO 8601 format (e.g., "2025-08-06T09:44:00Z"). Error: ${error.message}`);
  }
};

/**
 * Middleware to validate and normalize date fields in request body
 * Usage: validateDates(['scheduledStartTime', 'endTime'])
 */
export const validateDates = (dateFields = []) => {
  return (req, res, next) => {
    try {
      for (const field of dateFields) {
        if (req.body[field]) {
          try {
            req.body[field] = normalizeISODate(req.body[field]);
          } catch (error) {
            throw new AppError(`Invalid ${field}: ${error.message}`, 400);
          }
        }
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware specifically for meeting creation date validation
 */
export const validateMeetingDates = validateDates(['scheduledStartTime', 'scheduledEndTime']);

/**
 * Utility function to validate date range
 */
export const validateDateRange = (startDate, endDate, fieldNames = { start: 'startDate', end: 'endDate' }) => {
  if (!startDate || !endDate) return;
  
  if (startDate >= endDate) {
    throw new AppError(`${fieldNames.start} must be before ${fieldNames.end}`, 400);
  }
};

/**
 * Utility function to validate future date
 */
export const validateFutureDate = (date, fieldName = 'date', allowPast = false) => {
  if (!date) return;
  
  const now = new Date();
  if (!allowPast && date < now) {
    throw new AppError(`${fieldName} cannot be in the past`, 400);
  }
};

/**
 * Simple date validation for meetings - NO TIMEZONE RESTRICTIONS
 */
export const validateMeetingDateTime = (scheduledStartTime, duration = 120) => {
  if (!scheduledStartTime) return;
  
  const now = new Date();
  const startTime = new Date(scheduledStartTime);
  const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
  
  // NO PAST TIME VALIDATION - Allow any time
  // NO FUTURE TIME VALIDATION - Allow any time
  
  // Only validate duration
  if (duration < 15 || duration > 480) {
    throw new AppError('Meeting duration must be between 15 minutes and 8 hours', 400);
  }
  
  return {
    startTime,
    endTime,
    isImmediate: startTime <= now,
    duration
  };
};

export default {
  normalizeISODate,
  validateDates,
  validateMeetingDates,
  validateDateRange,
  validateFutureDate,
  validateMeetingDateTime
};