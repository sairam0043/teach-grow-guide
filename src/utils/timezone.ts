/**
 * Timezone-aware utility functions using native JavaScript Intl APIs.
 * Avoids the need for heavy external libraries like moment-timezone.
 */

export const COMMON_TIMEZONES = [
  'Asia/Kolkata',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Halifax',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Dubai',
  'Asia/Hong_Kong',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
  'UTC'
];

/**
 * Detect the user's browser timezone, fallback to 'Asia/Kolkata'.
 */
export function detectUserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch (e) {
    return 'Asia/Kolkata';
  }
}

/**
 * Calculates the offset in milliseconds for a specific timezone at a given instant.
 */
export function getTimeZoneOffsetMs(timeZone: string, date: Date = new Date()): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
  
  const parts = formatter.formatToParts(date);
  const getVal = (type: string) => {
    const part = parts.find(p => p.type === type);
    return part ? parseInt(part.value, 10) : 0;
  };
  
  const year = getVal('year');
  const month = getVal('month') - 1;
  const day = getVal('day');
  let hour = getVal('hour');
  if (hour === 24) hour = 0; // Handle 24:00 wrap
  const minute = getVal('minute');
  const second = getVal('second');
  
  const localDateAsUtc = Date.UTC(year, month, day, hour, minute, second);
  return localDateAsUtc - date.getTime();
}

/**
 * Get the UTC timestamp that corresponds to a local y-m-d hr:min in a specific timezone.
 */
export function getUtcTimeForLocalTimeInTimeZone(
  y: number,
  m: number,
  d: number,
  hr: number,
  min: number,
  timeZone: string
): number {
  const approxUtc = Date.UTC(y, m, d, hr, min);
  let utc = approxUtc;
  // Converge to find the exact offset incorporating DST
  for (let i = 0; i < 3; i++) {
    const offset = getTimeZoneOffsetMs(timeZone, new Date(utc));
    utc = Date.UTC(y, m, d, hr, min) - offset;
  }
  return utc;
}

/**
 * Gets local calendar year, month (0-indexed), and day in a timezone.
 */
export function getLocalDatePartsInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const getVal = (type: string) => {
    const part = parts.find(p => p.type === type);
    return part ? parseInt(part.value, 10) : 0;
  };
  
  let hour = getVal('hour');
  if (hour === 24) hour = 0;
  
  return {
    year: getVal('year'),
    month: getVal('month') - 1,
    day: getVal('day')
  };
}

export interface ConvertedSlot {
  utcTimeMs: number;
  studentDisplayTime: string; // e.g. "09:30 AM"
  tutorDisplayTime: string;   // e.g. "07:00 PM"
  tutorTimeZoneAbbr: string;  // e.g. "IST"
  studentTimeZoneAbbr: string;// e.g. "EDT"
}

/**
 * Returns abbreviation of timezone (e.g. "IST", "EDT") for a given date.
 */
export function getTimeZoneAbbreviation(timeZone: string, date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'short'
    });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    return tzPart ? tzPart.value : timeZone;
  } catch (e) {
    return timeZone;
  }
}

/**
 * Projects a tutor's weekly recurring availability into the student's selected date in their local timezone.
 */
export function convertTutorSlotsToStudentTime(
  tutorAvailability: { day: string; startTime: string; endTime: string }[],
  tutorTimeZone: string,
  studentSelectedDate: Date,
  studentTimeZone: string
): ConvertedSlot[] {
  if (!tutorAvailability || tutorAvailability.length === 0) return [];
  
  const sy = studentSelectedDate.getFullYear();
  const sm = studentSelectedDate.getMonth();
  const sd = studentSelectedDate.getDate();
  
  // Midday in student timezone to anchor our "surrounding days" projection safely
  const studentMiddayUtc = new Date(getUtcTimeForLocalTimeInTimeZone(sy, sm, sd, 12, 0, studentTimeZone));
  
  // Check yesterday, today, and tomorrow to catch all possible wraps across timezone boundaries
  const targetDates = [
    new Date(studentMiddayUtc.getTime() - 24 * 3600 * 1000), // yesterday
    studentMiddayUtc,                                        // today
    new Date(studentMiddayUtc.getTime() + 24 * 3600 * 1000)  // tomorrow
  ];
  
  const slotsMap = new Map<number, ConvertedSlot>();
  
  targetDates.forEach(targetDate => {
    // Determine targetDate's weekday name in tutor timezone
    const tutorWeekday = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      timeZone: tutorTimeZone
    }).format(targetDate);
    
    // Get year, month, date in tutor timezone
    const tutorParts = getLocalDatePartsInTimeZone(targetDate, tutorTimeZone);
    
    // Filter tutor's schedule matching this weekday
    const matchingAvailabilities = tutorAvailability.filter(a => a.day === tutorWeekday);
    
    matchingAvailabilities.forEach(avail => {
      if (!avail.startTime || !avail.endTime) return;
      
      const [startHr, startMin] = avail.startTime.split(':').map(Number);
      const [endHr, endMin] = avail.endTime.split(':').map(Number);
      
      const startUtc = getUtcTimeForLocalTimeInTimeZone(tutorParts.year, tutorParts.month, tutorParts.day, startHr, startMin, tutorTimeZone);
      const endUtc = getUtcTimeForLocalTimeInTimeZone(tutorParts.year, tutorParts.month, tutorParts.day, endHr, endMin, tutorTimeZone);
      
      // Slice into 30 minute chunks
      let currentUtc = startUtc;
      while (currentUtc < endUtc) {
        const slotDate = new Date(currentUtc);
        
        // Check if this slot falls on the student's selected calendar date in student's timezone
        const studentParts = getLocalDatePartsInTimeZone(slotDate, studentTimeZone);
        if (studentParts.year === sy && studentParts.month === sm && studentParts.day === sd) {
          
          // Formats for student and tutor
          const studentDisplayTime = new Intl.DateTimeFormat('en-US', {
            timeZone: studentTimeZone,
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }).format(slotDate);
          
          const tutorDisplayTime = new Intl.DateTimeFormat('en-US', {
            timeZone: tutorTimeZone,
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }).format(slotDate);
          
          const tutorTimeZoneAbbr = getTimeZoneAbbreviation(tutorTimeZone, slotDate);
          const studentTimeZoneAbbr = getTimeZoneAbbreviation(studentTimeZone, slotDate);
          
          slotsMap.set(currentUtc, {
            utcTimeMs: currentUtc,
            studentDisplayTime,
            tutorDisplayTime,
            tutorTimeZoneAbbr,
            studentTimeZoneAbbr
          });
        }
        
        currentUtc += 30 * 60 * 1000; // Increment 30 minutes
      }
    });
  });
  
  // Return sorted slots by UTC timestamp
  return Array.from(slotsMap.values()).sort((a, b) => a.utcTimeMs - b.utcTimeMs);
}

/**
 * Format a booking's timing. Resolves using utcTiming if available, otherwise fallback.
 */
export function formatBookingTime(booking: any, userTimeZone: string): string {
  if (booking.utcTiming) {
    const d = new Date(booking.utcTiming);
    const dateStr = new Intl.DateTimeFormat('en-US', {
      timeZone: userTimeZone,
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(d);
    
    const timeStr = new Intl.DateTimeFormat('en-US', {
      timeZone: userTimeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(d);
    
    return `${dateStr} at ${timeStr}`;
  }
  return booking.timing || "";
}

/**
 * Format a Date object to a clean date string in a specific timezone.
 */
export function formatDateInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

/**
 * Format a package session date and time into target user timezone.
 */
export function formatSessionDateTime(utcDateStr: string | Date, userTimeZone: string): { date: string; time: string } {
  const d = new Date(utcDateStr);
  const dateStr = new Intl.DateTimeFormat('en-US', {
    timeZone: userTimeZone,
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(d);
  
  const timeStr = new Intl.DateTimeFormat('en-US', {
    timeZone: userTimeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(d);
  
  return { date: dateStr, time: timeStr };
}

/**
 * Normalizes legacy tutor availableTimings array into standard availability objects
 */
export function normalizeLegacyAvailability(
  availableTimings: string[],
  targetDate: Date,
  timeZone: string = 'Asia/Kolkata'
): { day: string; startTime: string; endTime: string }[] {
  if (!availableTimings || availableTimings.length === 0) return [];

  const tutorWeekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone
  }).format(targetDate);

  return availableTimings.map((timeStr: string) => {
    let hour = 0;
    let minute = 0;
    const clean = timeStr.trim();
    if (clean.toLowerCase().includes('am') || clean.toLowerCase().includes('pm')) {
      const match = clean.match(/(\d+):?(\d+)?\s*(am|pm)/i);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = match[2] ? parseInt(match[2], 10) : 0;
        const period = match[3].toLowerCase();
        if (period === 'pm' && h < 12) h += 12;
        if (period === 'am' && h === 12) h = 0;
        hour = h;
        minute = m;
      }
    } else if (clean.includes(':')) {
      const [h, m] = clean.split(':').map(Number);
      hour = h || 0;
      minute = m || 0;
    }

    const startHrStr = hour.toString().padStart(2, '0');
    const startMinStr = minute.toString().padStart(2, '0');
    
    // Add 30 mins for end time
    let endHr = hour;
    let endMin = minute + 30;
    if (endMin >= 60) {
      endHr += 1;
      endMin -= 60;
    }
    const endHrStr = endHr.toString().padStart(2, '0');
    const endMinStr = endMin.toString().padStart(2, '0');

    return {
      day: tutorWeekday,
      startTime: `${startHrStr}:${startMinStr}`,
      endTime: `${endHrStr}:${endMinStr}`
    };
  });
}

/**
 * Returns the next upcoming available calendar dates for a tutor (at least 3 hours in future).
 */
export function getTutorUpcomingAvailableDates(
  tutor: any,
  studentTimeZone: string,
  startDate: Date = new Date(),
  maxDaysToScan: number = 21,
  limit: number = 5
): { dateStr: string; displayDate: string; weekday: string; slotsCount: number }[] {
  if (!tutor) return [];

  const hasDynamic = tutor.availability && tutor.availability.length > 0;
  const hasLegacy = tutor.availableTimings && tutor.availableTimings.length > 0;
  if (!hasDynamic && !hasLegacy) return [];

  const tutorTz = tutor.timezone || 'Asia/Kolkata';
  const results: { dateStr: string; displayDate: string; weekday: string; slotsCount: number }[] = [];
  const minTime = Date.now() + 3 * 60 * 60 * 1000;

  for (let i = 0; i < maxDaysToScan; i++) {
    const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    
    // Calculate slots
    let slots: ConvertedSlot[] = [];
    if (hasDynamic) {
      slots = convertTutorSlotsToStudentTime(tutor.availability, tutorTz, d, studentTimeZone);
    } else if (hasLegacy) {
      const legacyAvail = normalizeLegacyAvailability(tutor.availableTimings, d, tutorTz);
      slots = convertTutorSlotsToStudentTime(legacyAvail, tutorTz, d, studentTimeZone);
    }

    const validSlots = slots.filter(s => s.utcTimeMs >= minTime);
    if (validSlots.length > 0) {
      const y = d.getFullYear();
      const m = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;

      const displayDate = new Intl.DateTimeFormat('en-US', {
        timeZone: studentTimeZone,
        month: 'short',
        day: 'numeric'
      }).format(d);

      const weekday = new Intl.DateTimeFormat('en-US', {
        timeZone: studentTimeZone,
        weekday: 'short'
      }).format(d);

      results.push({
        dateStr,
        displayDate: `${weekday}, ${displayDate}`,
        weekday,
        slotsCount: validSlots.length
      });

      if (results.length >= limit) break;
    }
  }

  return results;
}

