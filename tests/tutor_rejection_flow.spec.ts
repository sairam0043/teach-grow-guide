import { test, expect } from "@playwright/test";
import { execSync } from "child_process";

const BASE_URL = "http://localhost:8080";

test.describe("Tutor Application Rejection and Resubmission Flow", () => {
  test.beforeAll(async () => {
    // Reset test tutor status to pending
    execSync("node backend/scripts/resetTutorPending.js", { stdio: "inherit" });
  });

  test.beforeEach(async ({ page }) => {
    page.on("console", msg => console.log(">>> BROWSER CONSOLE:", msg.text()));
    page.on("pageerror", err => console.log(">>> BROWSER ERROR:", err.message));
  });

  test("Admin rejects tutor with reason, tutor updates profile to resubmit", async ({ page }) => {
    // 1. Log in as admin
    await page.goto(`${BASE_URL}/login`);
    await page.locator("input#email").fill("admin@test.com");
    await page.locator("input#password").fill("secret123");
    await page.locator("button[type='submit']").click();
    await expect(page).toHaveURL(/.*dashboard\/admin/);

    // 2. Locate and check the Tutor Approvals tab (it is selected by default)
    const approvalsTab = page.locator("button:has-text('Tutor Approvals')").first();
    await expect(approvalsTab).toBeVisible();

    // 3. Reject Sarah Johnson with a reason
    const tutorRow = page.locator("tr:has-text('Sarah Johnson')");
    await expect(tutorRow).toBeVisible();

    const rejectBtn = tutorRow.locator("button:has-text('Reject')").first();
    await expect(rejectBtn).toBeVisible();
    await rejectBtn.click();

    // 4. Verify rejection reason modal appears
    const modalTitle = page.locator("text=Reject Tutor Application");
    await expect(modalTitle).toBeVisible();

    const reasonTextarea = page.locator("textarea#rejection-reason");
    await expect(reasonTextarea).toBeVisible();
    const customReason = "Please upload a higher-quality Resume/CV file. The current one is blurry.";
    await reasonTextarea.fill(customReason);

    const confirmRejectBtn = page.locator("button:has-text('Confirm Reject')");
    await expect(confirmRejectBtn).toBeEnabled();
    await confirmRejectBtn.click();

    // 5. Verify modal is closed and tutor is removed from pending list
    await expect(modalTitle).not.toBeVisible();
    await page.waitForTimeout(1000);
    await expect(tutorRow).not.toBeVisible();

    // 6. Log out of admin
    const logoutBtn = page.locator("button:has-text('Sign out')").first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
    } else {
      await page.goto(`${BASE_URL}/login`);
    }

    // 7. Log in as Tutor
    await page.goto(`${BASE_URL}/login`);
    await page.locator("input#email").fill("tutor@test.com");
    await page.locator("input#password").fill("secret123");
    await page.locator("button[type='submit']").click();
    await expect(page).toHaveURL(/.*dashboard\/tutor/);

    // 8. Verify the rejection reason is displayed on Tutor Dashboard
    const rejectionAlert = page.locator("text=Application Status: Rejected");
    await expect(rejectionAlert).toBeVisible();
    await expect(page.locator(`text=${customReason}`)).toBeVisible();

    // 9. Go to Profile Settings tab
    const profileTab = page.locator("button:has-text('Profile Settings')");
    await expect(profileTab).toBeVisible();
    await profileTab.click();

    // 10. Update bio slightly to resubmit profile
    const bioTextarea = page.locator("textarea#bio");
    await expect(bioTextarea).toBeVisible();
    const currentBio = await bioTextarea.inputValue();
    await bioTextarea.fill(currentBio + " (Updated for approval)");

    // 11. Click "Update Public Profile" to submit changes
    const submitBtn = page.locator("button:has-text('Update Public Profile')");
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // 12. Verify success toast and dashboard status changes back to pending
    await expect(page.locator("text=Public profile updated successfully!")).toBeVisible();
    
    // Switch back to any tab or refresh to verify alert state (or check directly on page)
    const pendingAlert = page.locator("text=Account Pending Approval");
    await expect(pendingAlert).toBeVisible();
    await expect(rejectionAlert).not.toBeVisible();
    await expect(page.locator(`text=${customReason}`)).not.toBeVisible();
  });
});
