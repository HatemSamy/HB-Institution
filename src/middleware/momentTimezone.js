import moment from 'moment-timezone';
import { AppError } from "./erroeHandling.js";

/**
 * Parse date and time with timezone using moment-timezone
 * @param {string} dateString - Date in format like "09/08/2025"
 * @param {string} timeString - Time in format like "10:40 PM"
 * @param {string} timezone - Timezone (e.g., "Africa/Cairo", "UTC", "America/New_York")
 * @param {string} dateFormat - "DD/MM/YYYY" or "MM/DD/YYYY"
 * @returns {Date} - Date object in UTC
 */
export const parseWithMomentTimezone = (dateString, timeString = "00:00", timezone = "UTC", dateFormat = "DD/MM/YYYY") => {
  if (!dateString) return null;
  
  try {
    // Determine the moment format based on dateFormat
    let momentDateFormat;
    if (dateFormat === "MM/DD/YYYY") {
      momentDateFormat = "MM/DD/YYYY";
    } else {
      momentDateFormat = "DD/MM/YYYY";
    }
    
    // Combine date and time
    const dateTimeString = `${dateString} ${timeString}`;
    const momentFormat = `${momentDateFormat} h:mm A`;
    
    // Parse in the specified timezone
    const momentInTimezone = moment.tz(dateTimeString, momentFormat, timezone);
    
    // Check if parsing was successful
    if (!momentInTimezone.isValid()) {
      throw new Error(`Invalid date/time: ${dateTimeString} in timezone ${timezone}`);
    }
    
    // Convert to UTC and return as JavaScript Date
    const utcDate = momentInTimezone.utc().toDate();
    
        
    return utcDate;
    
  } catch (error) {
    throw new Error(`Timezone parsing error: ${error.message}`);
  }
};

/**
 * Get user's timezone from request or default
 * @param {Object} req - Express request object
 * @returns {string} - Timezone identifier
 */
export const getUserTimezone = (req) => {
  // Priority order:
  // 1. Explicit timezone in request body
  // 2. User profile timezone
  // 3. Header timezone
  // 4. Default to server timezone or UTC
  
  if (req.body?.timezone) return req.body.timezone;
  if (req.user?.timezone) return req.user.timezone;
  if (req.headers['x-timezone']) return req.headers['x-timezone'];
  
  // Default to server timezone or UTC
  return moment.tz.guess() || 'UTC';
};

/**
 * Enhanced date parsing with automatic timezone detection using moment
 * @param {string} dateString 
 * @param {string} timeString 
 * @param {Object} req - Express request object
 * @param {string} dateFormat 
 * @returns {Date} - UTC Date
 */
export const parseWithAutoMomentTimezone = (dateString, timeString, req, dateFormat = "DD/MM/YYYY") => {
  const timezone = getUserTimezone(req);
  return parseWithMomentTimezone(dateString, timeString, timezone, dateFormat);
};

/**
 * Convert UTC date to user's local timezone for display using moment
 * @param {Date} utcDate - UTC date
 * @param {string} timezone - Target timezone
 * @returns {string} - Formatted local time string
 */
export const formatInMomentTimezone = (utcDate, timezone = 'UTC') => {
  try {
    return moment(utcDate).tz(timezone).format('YYYY-MM-DD HH:mm:ss z');
  } catch (error) {
    return moment(utcDate).utc().format('YYYY-MM-DD HH:mm:ss UTC');
  }
};


/**
 * Middleware to add moment-timezone support to meeting creation
 */
export const addMomentTimezoneSupport = (req, res, next) => {
  try {
    // If scheduledDate and scheduledTime are provided, parse with moment-timezone
    if (req.body.scheduledDate && req.body.scheduledTime) {
      const timezone = getUserTimezone(req);
      const utcDate = parseWithMomentTimezone(
        req.body.scheduledDate,
        req.body.scheduledTime,
        timezone,
        req.body.dateFormat
      );
      
      // Replace the original scheduledStartTime with timezone-aware UTC date
      req.body.scheduledStartTime = utcDate;
      
      // Store timezone info for later use
      req.body._parsedTimezone = timezone;
      req.body._originalLocalTime = `${req.body.scheduledDate} ${req.body.scheduledTime}`;
      
          }
    
    next();
  } catch (error) {
    next(new AppError(`Moment timezone parsing error: ${error.message}`, 400));
  }
};

export default {
  parseWithMomentTimezone,
  parseWithAutoMomentTimezone,
  getUserTimezone,
  formatInMomentTimezone,
  addMomentTimezoneSupport
};