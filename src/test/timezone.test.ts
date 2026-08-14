import { describe, it, expect } from "vitest";
import {
  detectUserTimeZone,
  getTimeZoneOffsetMs,
  getUtcTimeForLocalTimeInTimeZone,
  getLocalDatePartsInTimeZone,
  convertTutorSlotsToStudentTime,
  formatBookingTime,
  formatSessionDateTime
} from "../utils/timezone";

describe("Timezone Utilities", () => {
  it("detectUserTimeZone should return a valid string", () => {
    const tz = detectUserTimeZone();
    expect(tz).toBeTypeOf("string");
    expect(tz.length).toBeGreaterThan(0);
  });

  it("getTimeZoneOffsetMs should return correct offset in milliseconds", () => {
    // UTC offset is always 0
    const date = new Date(Date.UTC(2026, 5, 16, 12, 0, 0)); // June 16, 2026
    const utcOffset = getTimeZoneOffsetMs("UTC", date);
    expect(utcOffset).toBe(0);

    // Asia/Kolkata is UTC+5:30
    const kolkataOffset = getTimeZoneOffsetMs("Asia/Kolkata", date);
    expect(kolkataOffset).toBe(5.5 * 60 * 60 * 1000);

    // America/New_York in June 2026 is EDT (UTC-4)
    const nyOffset = getTimeZoneOffsetMs("America/New_York", date);
    expect(nyOffset).toBe(-4 * 60 * 60 * 1000);
  });

  it("getUtcTimeForLocalTimeInTimeZone should translate local input to UTC", () => {
    // 2026-06-16 10:00 AM local time in Asia/Kolkata (which is 04:30 AM UTC)
    const utcTimeMs = getUtcTimeForLocalTimeInTimeZone(2026, 5, 16, 10, 0, "Asia/Kolkata");
    const d = new Date(utcTimeMs);
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(5); // 0-indexed June
    expect(d.getUTCDate()).toBe(16);
    expect(d.getUTCHours()).toBe(4);
    expect(d.getUTCMinutes()).toBe(30);
  });

  it("getLocalDatePartsInTimeZone should extract local calendar parts", () => {
    // June 16, 2026 04:30 AM UTC is June 16, 2026 10:00 AM local in Asia/Kolkata
    const utcDate = new Date(Date.UTC(2026, 5, 16, 4, 30));
    const parts = getLocalDatePartsInTimeZone(utcDate, "Asia/Kolkata");
    expect(parts.year).toBe(2026);
    expect(parts.month).toBe(5);
    expect(parts.day).toBe(16);
  });

  it("convertTutorSlotsToStudentTime should shift and project slots correctly across timezones", () => {
    // Tutor has slot on Monday 09:00 - 10:00 AM in Asia/Kolkata
    const tutorAvailability = [
      { day: "Monday", startTime: "09:00", endTime: "10:00" }
    ];

    // Selected date: June 15, 2026 (Monday) in student timezone
    const studentSelectedDate = new Date(Date.UTC(2026, 5, 15, 12, 0, 0)); // June 15 is Monday

    // America/New_York (EDT, UTC-4) student.
    // Monday 09:00 AM IST (Kolkata) is Sunday 11:30 PM EDT (New York).
    // Monday 09:30 AM IST (Kolkata) is Sunday 11:45 PM EDT.
    // If student selects Sunday, they see Sunday slots. If they select Monday, they see Monday slots.
    // Let's verify for both Sunday and Monday in student's timezone.
    
    // Student selects Sunday June 14, 2026 (in NY timezone)
    const sundayDate = new Date(2026, 5, 14); // Sunday in local
    const sundaySlots = convertTutorSlotsToStudentTime(
      tutorAvailability,
      "Asia/Kolkata",
      sundayDate,
      "America/New_York"
    );

    // There should be slots on Sunday evening EDT because Monday 09:00 AM IST is Sunday 11:30 PM EDT!
    expect(sundaySlots.length).toBe(1); 
    expect(sundaySlots[0].studentDisplayTime).toBe("11:30 PM");
    expect(sundaySlots[0].tutorDisplayTime).toBe("9:00 AM");
    expect(sundaySlots[0].tutorTimeZoneAbbr).toBeTypeOf("string");
    expect(sundaySlots[0].studentTimeZoneAbbr).toBeTypeOf("string");

    // Student selects Monday June 15, 2026 (in NY timezone).
    // The tutor's second slot (Monday 09:30 AM IST) starts at Monday 12:00 AM EDT.
    const mondayDate = new Date(2026, 5, 15);
    const mondaySlots = convertTutorSlotsToStudentTime(
      tutorAvailability,
      "Asia/Kolkata",
      mondayDate,
      "America/New_York"
    );
    expect(mondaySlots.length).toBe(1);
    expect(mondaySlots[0].studentDisplayTime).toBe("12:00 AM");
    expect(mondaySlots[0].tutorDisplayTime).toBe("9:30 AM");
  });

  it("formatBookingTime should support timezone overrides", () => {
    // June 16, 2026 04:30 AM UTC
    const booking = {
      utcTiming: new Date(Date.UTC(2026, 5, 16, 4, 30)).toISOString(),
      timing: "June 16, 2026 at 10:00 AM"
    };

    // Format to Asia/Kolkata (IST)
    const kolkataTime = formatBookingTime(booking, "Asia/Kolkata");
    expect(kolkataTime).toContain("June 16, 2026");
    expect(kolkataTime).toContain("10:00 AM");

    // Format to America/New_York (EDT)
    const nyTime = formatBookingTime(booking, "America/New_York");
    expect(nyTime).toContain("June 16, 2026");
    expect(nyTime).toContain("12:30 AM");
  });

  it("formatSessionDateTime should format package session accurately", () => {
    const utcDateStr = new Date(Date.UTC(2026, 5, 16, 4, 30)).toISOString();
    const formatted = formatSessionDateTime(utcDateStr, "America/New_York");
    expect(formatted.date).toBe("June 16, 2026");
    expect(formatted.time).toBe("12:30 AM");
  });
});
