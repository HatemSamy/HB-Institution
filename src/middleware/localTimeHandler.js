import { AppError } from "./erroeHandling.js";

/**
 * Parse instructor's local date and time and handle timezone properly
 * @param {string} dateString - Date in format like "06/08/2025"
 * @param {string} timeString - Time in format like "15:30" or "3:30 PM"
 * @param {string} dateFormat - "DD/MM/YYYY" or "MM/DD/YYYY" (default: "DD/MM/YYYY")
 * @returns {Date} - Date object in instructor's local time
 */
export const parseInstructorLocalTime = (dateString, timeString = "00:00", dateFormat = "DD/MM/YYYY") => {
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
    
    // Create date object in LOCAL TIME (this is key!)
    // Using new Date(year, month, day, hours, minutes) creates a date in the system's local timezone
    const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
    
    // Validate the created date
    if (isNaN(localDate.getTime())) {
      throw new Error('Invalid date combination');
    }
    
    // Check if the date components match (handles invalid dates like Feb 30)
    if (localDate.getDate() !== day || 
        localDate.getMonth() !== month - 1 || 
        localDate.getFullYear() !== year) {
      throw new Error('Invalid date - day does not exist in the specified month');
    }
    
    // Log for debugging
    console.log(`📅 Instructor entered: ${dateString} ${timeString}`);
    console.log(`📅 Parsed as LOCAL time: ${localDate.toLocaleString()}`);
    console.log(`📅 Will be stored as UTC: ${localDate.toISOString()}`);
    
    return localDate;
    
  } catch (error) {
    throw new Error(`Invalid date/time format: ${error.message}. Expected date: "DD/MM/YYYY" (e.g., "06/08/2025") and time: "HH:MM" or "H:MM AM/PM" (e.g., "15:30" or "3:30 PM")`);
  }
};

/**
 * Calculate reminder time based on local meeting time
 * @param {Date} meetingLocalTime - Meeting time in local timezone
 * @param {number} minutesBefore - Minutes before meeting to send reminder (default: 2)
 * @returns {Date} - Reminder time in local timezone
 */
export const calculateLocalReminderTime = (meetingLocalTime, minutesBefore = 2) => {
  const reminderTime = new Date(meetingLocalTime.getTime() - minutesBefore * 60 * 1000);
  
  console.log(`⏰ Meeting time (local): ${meetingLocalTime.toLocaleString()}`);
  console.log(`⏰ Reminder time (local): ${reminderTime.toLocaleString()}`);
  console.log(`⏰ Reminder will be sent ${minutesBefore} minutes before meeting`);
  
  return reminderTime;
};

/**
 * Check if current time matches reminder time (with 1-minute tolerance)
 * @param {Date} reminderTime - When reminder should be sent
 * @param {Date} currentTime - Current time (default: now)
 * @returns {boolean} - True if reminder should be sent now
 */
export const shouldSendReminderNow = (reminderTime, currentTime = new Date()) => {
  const timeDiff = Math.abs(currentTime.getTime() - reminderTime.getTime());
  const oneMinute = 60 * 1000; // 1 minute in milliseconds
  
  const shouldSend = timeDiff <= oneMinute;
  
  if (shouldSend) {
    console.log(`📢 Reminder should be sent now!`);
    console.log(`📢 Current time: ${currentTime.toLocaleString()}`);
    console.log(`📢 Reminder time: ${reminderTime.toLocaleString()}`);
    console.log(`📢 Time difference: ${Math.round(timeDiff / 1000)} seconds`);
  }
  
  return shouldSend;
};

/**
 * Get meeting status based on local time
 * @param {Date} meetingLocalTime - Meeting time in local timezone
 * @param {Date} currentTime - Current time (default: now)
 * @returns {object} - Meeting status information
 */
export const getMeetingStatus = (meetingLocalTime, currentTime = new Date()) => {
  const timeDiff = meetingLocalTime.getTime() - currentTime.getTime();
  const minutesUntilMeeting = Math.round(timeDiff / (1000 * 60));
  
  let status = 'scheduled';
  let message = '';
  
  if (minutesUntilMeeting <= 0) {
    status = 'active';
    message = 'Meeting is active now';
  } else if (minutesUntilMeeting <= 2) {
    status = 'starting-soon';
    message = `Meeting starts in ${minutesUntilMeeting} minute(s)`;
  } else {
    status = 'scheduled';
    message = `Meeting starts in ${minutesUntilMeeting} minutes`;
  }
  
  return {
    status,
    message,
    minutesUntilMeeting,
    meetingTime: meetingLocalTime.toLocaleString(),
    currentTime: currentTime.toLocaleString(),
    isImmediate: minutesUntilMeeting <= 0
  };
};

export default {
  parseInstructorLocalTime,
  calculateLocalReminderTime,
  shouldSendReminderNow,
  getMeetingStatus
};