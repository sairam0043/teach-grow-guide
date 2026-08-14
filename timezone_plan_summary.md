# Timezone-Aware Tutor Timings Plan

**Goal:** Allow students and tutors in different countries to view availability, book classes, and check schedules in their own local timezones seamlessly.

---

## 1. Database Updates (Backend)
* **Tutor Schema:** Add a `timezone` field (defaulting to `'Asia/Kolkata'`).
* **Student Schema:** Add a `timezone` field (so we can format email notifications in their local timezone).
* **Bookings:** Save all booked sessions in universal **UTC timestamps** (`utcTiming` / `utcDate`).

---

## 2. Tutor Signup Flow
* **Auto-Detect & Pre-Select:** The signup page automatically detects the tutor's local timezone.
* **Searchable Dropdown:** The detected timezone is pre-selected in a visible, searchable dropdown of standard timezones, letting the tutor adjust it if needed before submitting.

---

## 3. Student Signup Flow
* **Silent Capture:** To keep student registration short and quick, we **silently detect and save** their timezone in the background using JavaScript.
* **Settings:** The student can adjust their timezone later inside their Dashboard Settings.

---

## 4. Tutor Profile & Booking Page (Student View)
* **Double Timezone Display:** Availability slots will show **both** times for maximum clarity:
  * **Main Button:** Student's local time (e.g., `09:30 AM EDT`).
  * **Parenthesis/Label:** Tutor's local time (e.g., `(Tutor's local time: 07:00 PM IST)`).
* **Override Option:** A small text link will say: *"Times shown in America/New_York (change)"* so students can manually override the timezone if traveling or booking for a different location.

---

## 5. Dashboard & Emails
* **Tutor Dashboard:** Tutors see their dashboard bookings and schedules updated to their registered timezone.
* **Student Dashboard:** Students see dashboard bookings and schedules updated to their registered timezone.
* **Emails:** System booking confirmation emails are formatted in the user's specific local timezone.

---

## 6. Technical Approach
* Uses native browser Web APIs (`Intl.DateTimeFormat`) so the application remains lightweight, fast, and does not require third-party libraries like `moment-timezone`.
