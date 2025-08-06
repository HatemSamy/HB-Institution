import crypto from 'crypto';
import axios from 'axios';
import { nanoid } from 'nanoid';

class BigBlueButtonService {
  constructor() {
    this.initialized = false;
    this.url = null;
    this.secret = null;
  }

  /**
   * Initialize the service with environment variables
   */
  init() {
    if (this.initialized) return;

    if (!process.env.BBB_URL || !process.env.BBB_SECRET) {
      throw new Error('BBB_URL and BBB_SECRET environment variables are required');
    }
    
    // Ensure URL ends with /
    this.url = process.env.BBB_URL.endsWith('/') 
      ? process.env.BBB_URL 
      : process.env.BBB_URL + '/';
    
    this.secret = process.env.BBB_SECRET;
    this.initialized = true;
    console.log('BigBlueButton service initialized with URL:', this.url);
  }

  /**
   * Generate checksum for BBB API calls
   */
  generateChecksum(callName, queryString) {
    const data = callName + queryString + this.secret;
    return crypto.createHash('sha1').update(data).digest('hex');
  }

  /**
   * Build API URL with checksum
   */
  buildApiUrl(callName, params = {}) {
    // Manually build query string to ensure proper encoding
    const queryParts = [];
    
    // Add all parameters
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      }
    }
    
    const queryString = queryParts.join('&');
    const checksum = this.generateChecksum(callName, queryString);
    
    return `${this.url}api/${callName}?${queryString}&checksum=${checksum}`;
  }

  /**
   * Test BBB server connection
   * @returns {Promise<boolean>} True if server is accessible
   */
  async testConnection() {
    this.init();
    try {
      const url = this.buildApiUrl('getMeetings');
      console.log('Testing BBB connection to:', url);
      const response = await axios.get(url, {
        timeout: 10000,
        headers: { 'User-Agent': 'HB-Institution-BBB-Client' }
      });
      console.log('BBB server connection test successful');
      return response.status === 200;
    } catch (error) {
      console.error('BBB server connection test failed:', error.message);
      console.error('BBB URL being used:', this.url);
      return false;
    }
  }

  /**
   * Create a new meeting for a lesson
   * @param {Object} meetingData - Meeting configuration
   * @param {string} meetingData.lessonId - Lesson ID
   * @param {string} meetingData.lessonTitle - Lesson title
   * @param {string} meetingData.groupCode - Group code
   * @param {string} meetingData.instructorName - Instructor name
   * @param {number} meetingData.duration - Meeting duration in minutes (optional)
   * @returns {Promise<Object>} Meeting creation response
   */
  async createMeeting(meetingData) {
    this.init();
    const { lessonId, lessonTitle, groupCode, instructorName, duration = 120 } = meetingData;
    
    // Generate unique meeting ID
    const meetingID = `lesson-${lessonId}-${nanoid(8)}`;
    console.log('Generated meeting ID:', meetingID);
    
    const meetingParams = {
      name: `${lessonTitle} - Group ${groupCode}`,
      meetingID,
      attendeePW: 'student123',
      moderatorPW: 'instructor456',
      welcome: `Welcome to ${lessonTitle}! This is a live session for Group ${groupCode}.`,
      maxParticipants: 50,
      record: 'true',
      duration: duration,
      autoStartRecording: 'false',
      allowStartStopRecording: 'true',
      muteOnStart: 'true'
    };

    try {
      const url = this.buildApiUrl('create', meetingParams);
      console.log('Creating meeting with URL:', url);
      
      // Try with increased timeout and retry logic
      let response;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          attempts++;
          console.log(`Attempt ${attempts} of ${maxAttempts} to create meeting...`);
          
          response = await axios.get(url, {
            timeout: 30000, // Increased timeout to 30 seconds
            headers: { 'User-Agent': 'HB-Institution-BBB-Client' }
          });
          break; // Success, exit retry loop
          
        } catch (error) {
          console.log(`Attempt ${attempts} failed:`, error.message);
          
          if (attempts === maxAttempts) {
            throw error; // Last attempt failed, throw the error
          }
          
          // Wait before retrying (exponential backoff)
          const waitTime = Math.pow(2, attempts) * 1000; // 2s, 4s, 8s
          console.log(`Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

      console.log('BBB Response status:', response.status);
      console.log('BBB Response data type:', typeof response.data);
      console.log('BBB Response data:', response.data);

      // Convert response data to string properly
      let responseText;
      if (typeof response.data === 'string') {
        responseText = response.data;
      } else if (typeof response.data === 'object') {
        responseText = JSON.stringify(response.data);
      } else {
        responseText = String(response.data);
      }

      console.log('Converted response text:', responseText);

      if (response.status === 200 && responseText.includes('<returncode>SUCCESS</returncode>')) {
        console.log('Meeting created successfully');
        
        // Extract the actual meeting ID from the response (in case it was modified)
        const meetingIDMatch = responseText.match(/<meetingID>(.*?)<\/meetingID>/);
        const actualMeetingID = meetingIDMatch ? meetingIDMatch[1] : meetingID;
        
        console.log('Original meeting ID:', meetingID);
        console.log('Actual meeting ID from response:', actualMeetingID);
        
        // Check if we need to extract the actual server URL from response headers or redirects
        if (response.headers && response.headers.location) {
          console.log('Redirect location found:', response.headers.location);
        }
        
        return {
          success: true,
          meetingID: actualMeetingID, // Use the actual meeting ID from response
          data: responseText,
          actualServerUrl: response.config?.url ? new URL(response.config.url).origin : null
        };
      } else {
        console.error('Meeting creation failed. Response:', responseText);
        throw new Error(`Meeting creation failed: ${responseText}`);
      }
    } catch (error) {
      console.error('Error creating BBB meeting:', error);
      if (error.response) {
        console.error('Error response status:', error.response.status);
        console.error('Error response data:', error.response.data);
      }
      throw new Error(`Failed to create meeting: ${error.message}`);
    }
  }

  /**
   * Generate join URL for a participant
   * @param {Object} joinData - Join configuration
   * @param {string} joinData.meetingID - Meeting ID
   * @param {string} joinData.fullName - Participant's full name
   * @param {string} joinData.role - 'instructor' or 'student'
   * @param {string} joinData.userID - User ID (optional)
   * @returns {string} Join URL
   */
  generateJoinURL(joinData) {
    this.init();
    const { meetingID, fullName, role, userID } = joinData;
    
    // Enhanced input validation
    if (!meetingID || typeof meetingID !== 'string' || meetingID.trim().length === 0) {
      throw new Error('Invalid meeting ID: Meeting ID must be a non-empty string');
    }
    
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0) {
      throw new Error('Invalid full name: Full name must be a non-empty string');
    }
    
    if (!role || !['instructor', 'student'].includes(role)) {
      throw new Error('Invalid role: Role must be either "instructor" or "student"');
    }
    
    // Sanitize inputs
    const sanitizedMeetingID = meetingID.trim();
    const sanitizedFullName = fullName.trim();
    const sanitizedUserID = userID ? userID.trim() : nanoid(10);
    
    // Validate meeting ID format (basic check)
    if (sanitizedMeetingID.length > 100) {
      throw new Error('Meeting ID is too long (max 100 characters)');
    }
    
    // Validate full name length
    if (sanitizedFullName.length > 50) {
      throw new Error('Full name is too long (max 50 characters)');
    }
    
    const password = role === 'instructor' ? 'instructor456' : 'student123';
    
    const joinParams = {
      fullName: sanitizedFullName,
      meetingID: sanitizedMeetingID,
      password,
      userID: sanitizedUserID,
      redirect: 'true',
      // Add additional parameters for better user experience
      'userdata-bbb_preferred_camera_profile': 'low',
      'userdata-bbb_auto_join_audio': 'true',
      'userdata-bbb_listen_only_mode': role === 'student' ? 'true' : 'false'
    };
    
    try {
      const joinURL = this.buildApiUrl('join', joinParams);
      
      // Validate generated URL
      const urlObj = new URL(joinURL);
      if (!urlObj.protocol.startsWith('http')) {
        throw new Error('Generated URL has invalid protocol');
      }
      
      if (!urlObj.host) {
        throw new Error('Generated URL has invalid host');
      }
      
      if (!urlObj.pathname.includes('/api/join')) {
        throw new Error('Generated URL has invalid path');
      }
      
      // Log successful generation (only in debug mode)
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Generated join URL for ${sanitizedFullName} (${role}) in meeting ${sanitizedMeetingID}`);
      }
      
      return joinURL;
      
    } catch (error) {
      console.error('❌ Error generating join URL:', error.message);
      console.error('Input data:', { meetingID: sanitizedMeetingID, fullName: sanitizedFullName, role, userID: sanitizedUserID });
      throw new Error(`Failed to generate join URL: ${error.message}`);
    }
  }

  /**
   * Get meeting information
   * @param {string} meetingID - Meeting ID
   * @returns {Promise<Object>} Meeting information
   */
  async getMeetingInfo(meetingID) {
    this.init();
    try {
      const params = { meetingID };
      const url = this.buildApiUrl('getMeetingInfo', params);
      const response = await axios.get(url, {
        timeout: 10000,
        headers: { 'User-Agent': 'HB-Institution-BBB-Client' }
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error getting meeting info:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if meeting is running
   * @param {string} meetingID - Meeting ID
   * @returns {Promise<boolean>} True if meeting is running
   */
  async isMeetingRunning(meetingID) {
    this.init();
    try {
      const params = { meetingID };
      const url = this.buildApiUrl('isMeetingRunning', params);
      const response = await axios.get(url, {
        timeout: 10000,
        headers: { 'User-Agent': 'HB-Institution-BBB-Client' }
      });
      const responseText = typeof response.data === 'string' ? response.data : String(response.data);
      return responseText.includes('<running>true</running>');
    } catch (error) {
      console.error('Error checking meeting status:', error);
      return false;
    }
  }

  /**
   * End a meeting
   * @param {string} meetingID - Meeting ID
   * @returns {Promise<Object>} End meeting response
   */
  async endMeeting(meetingID) {
    this.init();
    try {
      const params = {
        meetingID,
        password: 'instructor456'
      };
      const url = this.buildApiUrl('end', params);
      const response = await axios.get(url, {
        timeout: 10000,
        headers: { 'User-Agent': 'HB-Institution-BBB-Client' }
      });
      return {
        success: response.status === 200,
        data: response.data
      };
    } catch (error) {
      console.error('Error ending meeting:', error);
      throw new Error(`Failed to end meeting: ${error.message}`);
    }
  }

  /**
   * Get all meetings
   * @returns {Promise<Object>} List of all meetings
   */
  async getAllMeetings() {
    this.init();
    try {
      const url = this.buildApiUrl('getMeetings');
      const response = await axios.get(url, {
        timeout: 10000,
        headers: { 'User-Agent': 'HB-Institution-BBB-Client' }
      });
      return {
        success: response.status === 200,
        data: response.data
      };
    } catch (error) {
      console.error('Error getting meetings:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get recordings for a meeting
   * @param {string} meetingID - Meeting ID
   * @returns {Promise<Object>} Meeting recordings
   */
  async getRecordings(meetingID) {
    this.init();
    try {
      const params = { meetingID };
      const url = this.buildApiUrl('getRecordings', params);
      const response = await axios.get(url, {
        timeout: 10000,
        headers: { 'User-Agent': 'HB-Institution-BBB-Client' }
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error getting recordings:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete recordings
   * @param {string} recordID - Record ID
   * @returns {Promise<Object>} Delete response
   */
  async deleteRecordings(recordID) {
    this.init();
    try {
      const params = { recordID };
      const url = this.buildApiUrl('deleteRecordings', params);
      const response = await axios.get(url, {
        timeout: 10000,
        headers: { 'User-Agent': 'HB-Institution-BBB-Client' }
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error deleting recordings:', error);
      throw new Error(`Failed to delete recordings: ${error.message}`);
    }
  }
}

export default new BigBlueButtonService();