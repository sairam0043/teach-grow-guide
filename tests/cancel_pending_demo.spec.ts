import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:8080";

test.describe("Cancellation of Pending Demo Requests", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Log in as test student
    await page.goto(`${BASE_URL}/login`);
    await page.locator("input#email").fill("student@test.com");
    await page.locator("input#password").fill("secret123");
    await page.locator("button[type='submit']").click();
    
    // Wait until logged in (e.g. redirected or page changes)
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test("Should book a demo request and cancel it from the Tutor Profile sidebar", async ({ page }) => {
    // 2. Navigate to tutors list
    await page.goto(`${BASE_URL}/tutors`);
    
    // 3. Find and click first tutor card
    const firstTutorLink = page.locator("a:has-text('Book Demo')").first();
    await expect(firstTutorLink).toBeVisible();
    await firstTutorLink.click();
    await expect(page).toHaveURL(/.*tutors\/.*/);

    // 4. Select the first subject
    const subjectSelectTrigger = page.locator("button:has-text('Select a subject')").first();
    await expect(subjectSelectTrigger).toBeVisible();
    await subjectSelectTrigger.click();
    
    const firstSubjectOption = page.locator("role=option").first();
    await expect(firstSubjectOption).toBeVisible();
    await firstSubjectOption.click();

    // 5. Select "Free Demo Class" plan
    const demoPlanOption = page.locator("text=Free Demo Class").first();
    await expect(demoPlanOption).toBeVisible();
    await demoPlanOption.click();

    // 6. Open calendar popover and select the first available date
    const popoverTrigger = page.locator("button:has(svg.lucide-calendar)").first();
    await expect(popoverTrigger).toBeVisible();
    await popoverTrigger.click();

    const calendarDayButton = page.locator("table button:not([disabled])").first();
    await expect(calendarDayButton).toBeVisible();
    await calendarDayButton.click();

    // 7. Click the first available timing slot
    const firstTimingSlot = page.locator("button:has(div.font-medium)").first();
    await expect(firstTimingSlot).toBeVisible();
    await firstTimingSlot.click();

    // 8. Book the Free Demo Class
    const bookBtn = page.locator("button:has-text('Book Free Demo Session')");
    await expect(bookBtn).toBeEnabled();
    await bookBtn.click();

    // 9. Verify redirection/UI update to Pending Approval state
    // The sidebar should update to show "Pending Approvals" and the "Cancel Demo Request" button
    const pendingTitle = page.locator("text=Pending Approvals");
    await expect(pendingTitle).toBeVisible();

    const cancelRequestBtn = page.locator("button:has-text('Cancel Demo Request')");
    await expect(cancelRequestBtn).toBeVisible();

    // 10. Click Cancel Demo Request button
    await cancelRequestBtn.click();

    // 11. Verify cancel dialog appears and submit cancellation
    await expect(page.locator("text=Cancel Demo Session")).toBeVisible();
    
    const reasonSelectTrigger = page.locator("button:has-text('Select a reason')");
    await expect(reasonSelectTrigger).toBeVisible();
    await reasonSelectTrigger.click();
    
    const scheduleConflictOption = page.locator("role=option").filter({ hasText: "Schedule Conflict" }).first();
    await expect(scheduleConflictOption).toBeVisible();
    await scheduleConflictOption.click();

    const confirmCancelBtn = page.locator("button:has-text('Confirm Cancellation')");
    await expect(confirmCancelBtn).toBeEnabled();
    await confirmCancelBtn.click();

    // 12. Verify toast message & UI resets (the pending title should disappear)
    await expect(page.locator("text=Booking cancelled successfully")).toBeVisible();
    await expect(pendingTitle).not.toBeVisible();
  });

  test("Should book a demo request and cancel it from the Student Dashboard Demo Tracker", async ({ page }) => {
    // 2. Navigate to tutors list
    await page.goto(`${BASE_URL}/tutors`);
    
    // 3. Find and click first tutor card
    const firstTutorLink = page.locator("a:has-text('Book Demo')").first();
    await expect(firstTutorLink).toBeVisible();
    await firstTutorLink.click();
    await expect(page).toHaveURL(/.*tutors\/.*/);

    // 4. Select the first subject
    const subjectSelectTrigger = page.locator("button:has-text('Select a subject')").first();
    await expect(subjectSelectTrigger).toBeVisible();
    await subjectSelectTrigger.click();
    
    const firstSubjectOption = page.locator("role=option").first();
    await expect(firstSubjectOption).toBeVisible();
    await firstSubjectOption.click();

    // 5. Select "Free Demo Class" plan
    const demoPlanOption = page.locator("text=Free Demo Class").first();
    await expect(demoPlanOption).toBeVisible();
    await demoPlanOption.click();

    // 6. Open calendar popover and select the first available date
    const popoverTrigger = page.locator("button:has(svg.lucide-calendar)").first();
    await expect(popoverTrigger).toBeVisible();
    await popoverTrigger.click();

    const calendarDayButton = page.locator("table button:not([disabled])").first();
    await expect(calendarDayButton).toBeVisible();
    await calendarDayButton.click();

    // 7. Click first available timing slot
    const firstTimingSlot = page.locator("button:has(div.font-medium)").first();
    await expect(firstTimingSlot).toBeVisible();
    await firstTimingSlot.click();

    // 8. Book Demo
    const bookBtn = page.locator("button:has-text('Book Free Demo Session')");
    await expect(bookBtn).toBeEnabled();
    await bookBtn.click();
    await expect(page.locator("text=Pending Approvals")).toBeVisible();

    // 9. Go to student dashboard demo tracker
    await page.goto(`${BASE_URL}/dashboard/student`);
    const demoTrackerTab = page.locator("button:has-text('Demo Tracker')");
    await expect(demoTrackerTab).toBeVisible();
    await demoTrackerTab.click();

    // 10. Verify Pending status and check buttons visibility
    const statusBadge = page.locator("text=PENDING").first();
    await expect(statusBadge).toBeVisible();

    // Verify Join Demo Room is NOT visible
    const joinRoomBtn = page.locator("a:has-text('Join Demo Room')");
    await expect(joinRoomBtn).not.toBeVisible();

    // Verify Cancel Demo is IS visible
    const cancelDemoBtn = page.locator("button:has-text('Cancel Demo')").first();
    await expect(cancelDemoBtn).toBeVisible();

    // 11. Click Cancel Demo button
    await cancelDemoBtn.click();

    // 12. Submit cancel form in dialog
    await expect(page.locator("text=Cancel Demo Session")).toBeVisible();
    
    const reasonSelectTrigger = page.locator("button:has-text('Select a reason')");
    await expect(reasonSelectTrigger).toBeVisible();
    await reasonSelectTrigger.click();
    
    const scheduleConflictOption = page.locator("role=option").filter({ hasText: "Schedule Conflict" }).first();
    await expect(scheduleConflictOption).toBeVisible();
    await scheduleConflictOption.click();

    const confirmCancelBtn = page.locator("button:has-text('Confirm Cancellation')");
    await expect(confirmCancelBtn).toBeEnabled();
    await confirmCancelBtn.click();

    // 13. Verify status updates to CANCELLED
    await expect(page.locator("text=Booking cancelled successfully")).toBeVisible();
    const cancelledBadge = page.locator("text=CANCELLED").first();
    await expect(cancelledBadge).toBeVisible();
  });
});
