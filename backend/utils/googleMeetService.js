const { google } = require('googleapis');
const Tutor = require('../schemas/tutorSchema');
const { v4: uuidv4 } = require('uuid');

const getOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
};

const getOAuth2ClientForTutor = async (tutor) => {
  if (!tutor.googleTokens || !tutor.googleTokens.refreshToken) {
    throw new Error('Tutor does not have Google Calendar connected');
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tutor.googleTokens.accessToken,
    refresh_token: tutor.googleTokens.refreshToken,
    expiry_date: tutor.googleTokens.expiryDate,
  });

  // Listen for automatically refreshed tokens and save them
  oauth2Client.on('tokens', async (tokens) => {
    let updated = false;
    if (tokens.access_token) {
      tutor.googleTokens.accessToken = tokens.access_token;
      updated = true;
    }
    if (tokens.expiry_date) {
      tutor.googleTokens.expiryDate = tokens.expiry_date;
      updated = true;
    }
    // Google doesn't always send a new refresh token on refresh cycles
    if (tokens.refresh_token) {
      tutor.googleTokens.refreshToken = tokens.refresh_token;
      updated = true;
    }
    if (updated) {
      await tutor.save();
      console.log(`[GoogleMeetService] Refreshed and saved Google OAuth tokens for tutor: ${tutor.name}`);
    }
  });

  return oauth2Client;
};

/**
 * Creates a Google Calendar Event with a Google Meet conference link.
 * @param {Object} tutor - The tutor MongoDB document
 * @param {Object} details 
 * @param {string} details.summary - Title of the class
 * @param {string} details.description - Description
 * @param {Date} details.startTime - Start Time (Date object)
 * @param {Date} details.endTime - End Time (Date object)
 * @param {string[]} details.attendees - Attendee email array
 * @returns {Promise<string>} The Google Meet Hangout link
 */
const createGoogleMeetEvent = async (tutor, details) => {
  try {
    const authClient = await getOAuth2ClientForTutor(tutor);
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    const event = {
      summary: details.summary,
      description: details.description,
      start: {
        dateTime: details.startTime.toISOString(),
        timeZone: tutor.timezone || 'Asia/Kolkata',
      },
      end: {
        dateTime: details.endTime.toISOString(),
        timeZone: tutor.timezone || 'Asia/Kolkata',
      },
      attendees: (details.attendees || []).map(email => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: uuidv4(),
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: 1, // Required to trigger Meet creation
    });

    return response.data.hangoutLink;
  } catch (error) {
    console.error(`[GoogleMeetService] Failed to create meeting for tutor ${tutor.name}:`, error.message);
    throw error;
  }
};

const parseTimingStringToDate = (timingStr) => {
  try {
    const parts = timingStr.split(' at ');
    if (parts.length === 2) {
      const datePartCleaned = parts[0].replace(/(\d+)(st|nd|rd|th)/, '$1');
      const timePart = parts[1];
      const combined = `${datePartCleaned} ${timePart}`;
      const parsed = new Date(combined);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error parsing timing string in googleMeetService:", e);
  }
  return null;
};

const generateMeetingLinkForBooking = async ({
  tutor,
  studentId,
  subject,
  timing,
  utcTiming,
  fallbackJitsiPrefix
}) => {
  if (tutor.googleTokens && tutor.googleTokens.refreshToken) {
    try {
      const User = require('../schemas/userSchema');
      const tutorUser = await User.findById(tutor.userId);
      let studentEmail = null;

      if (studentId && studentId !== 'admin' && studentId !== 'anonymous_student') {
        const studentUser = await User.findById(studentId);
        if (studentUser) studentEmail = studentUser.email;
      }

      let startTime = utcTiming ? new Date(utcTiming) : parseTimingStringToDate(timing);
      if (!startTime || isNaN(startTime.getTime())) {
        startTime = new Date();
      }
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      const attendees = [];
      if (tutorUser && tutorUser.email) attendees.push(tutorUser.email);
      if (studentEmail) attendees.push(studentEmail);

      const link = await createGoogleMeetEvent(tutor, {
        summary: `${subject} - Teach Grow Guide`,
        description: `${subject} tutoring session between ${tutor.name} and student.`,
        startTime,
        endTime,
        attendees
      });
      if (link) {
        console.log(`[GoogleMeetService] Generated Meet URL: ${link}`);
        return link;
      }
    } catch (err) {
      console.error(`[GoogleMeetService] Failed to generate Meet link, falling back to Jitsi:`, err.message);
    }
  }

  return `https://meet.jit.si/${fallbackJitsiPrefix}`;
};

module.exports = {
  getOAuth2Client,
  getOAuth2ClientForTutor,
  createGoogleMeetEvent,
  generateMeetingLinkForBooking
};
