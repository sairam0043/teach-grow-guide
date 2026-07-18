import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:8080";

test.describe("Admin Dashboard Tutor Details Modal", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", msg => console.log(">>> BROWSER CONSOLE:", msg.text()));
    page.on("pageerror", err => console.log(">>> BROWSER ERROR:", err.message));
    // 1. Log in as admin
    await page.goto(`${BASE_URL}/login`);
    await page.locator("input#email").fill("admin@test.com");
    await page.locator("input#password").fill("secret123");
    await page.locator("button[type='submit']").click();
    
    // Wait until logged in
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test("Should open and close the Tutor Details Modal from 'All Tutors' table", async ({ page }) => {
    // 2. Wait for automatic redirect to Admin Dashboard
    await page.waitForTimeout(3000);
    console.log(">>> CURRENT URL:", page.url());
    console.log(">>> PAGE CONTENT:", (await page.textContent("body"))?.substring(0, 500));
    await expect(page).toHaveURL(/.*dashboard\/admin/);
    await expect(page.locator("h1")).toContainText("Admin Dashboard");

    // 3. Switch to "All Tutors" tab
    const allTutorsTab = page.locator("button:has-text('All Tutors')");
    await expect(allTutorsTab).toBeVisible();
    await allTutorsTab.click();

    // 4. Find the first tutor profile cell and click it
    // The clickable profile cell has the title 'Click to view full tutor details'
    const tutorProfileCell = page.locator("td[title='Click to view full tutor details']").first();
    await expect(tutorProfileCell).toBeVisible();
    await tutorProfileCell.click();

    // 5. Verify the dialog title and contents are displayed
    await expect(page.locator("text=Tutor Credentials Profile")).toBeVisible();
    await expect(page.locator("text=Email Address")).toBeVisible();
    await expect(page.locator("text=Professional Bio")).toBeVisible();
    await expect(page.locator("text=Highest Qualification")).toBeVisible();

    // 6. Click "Close" inside the modal to close it
    const closeBtn = page.locator("button:has-text('Close')").first();
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // 7. Verify the modal is closed
    await expect(page.locator("text=Tutor Credentials Profile")).not.toBeVisible();
  });
});
