import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:8080";

test.describe("Cuvasol Tutor - Basic E2E Tests", () => {
  
  test("1. Homepage and Static Pages should load successfully", async ({ page }) => {
    // Load Homepage
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/Cuvasol Tutor/i);
    
    // Check main navigation links
    const homeLink = page.locator("nav").filter({ hasText: "Home" });
    await expect(homeLink).toBeVisible();

    // Navigate to About page
    await page.goto(`${BASE_URL}/about`);
    await expect(page.locator("h1")).toContainText(/About/i);

    // Navigate to Contact page
    await page.goto(`${BASE_URL}/contact`);
    await expect(page.locator("h1")).toContainText(/Contact/i);
  });

  test("2. Browse Tutors catalog page should load and render list", async ({ page }) => {
    await page.goto(`${BASE_URL}/tutors`);
    
    // Check filter sidebar/elements exist
    const heading = page.locator("h1");
    await expect(heading).toContainText(/Find Your Perfect Tutor/i);
    
    // Check subject filters or search input is visible
    const searchInput = page.locator("input[placeholder*='Search']");
    await expect(searchInput).toBeVisible();
  });

  test("3. Student Registration and Form Fields check", async ({ page }) => {
    await page.goto(`${BASE_URL}/register/student`);
    
    // Check registration heading
    await expect(page.locator("h3")).toContainText(/Student Registration/i);

    // Fill out form elements
    await page.locator("input#name").fill("Automated Student");
    await page.locator("input#email").fill(`student.${Date.now()}@test.com`);
    await page.locator("input#phone").fill("9876543210");

    // Select Class / Grade
    await page.locator("button#studentClass").click();
    await page.locator("div[role='option']:has-text('Class 10')").click();

    await page.locator("input#password").fill("studentpass123");
    await page.locator("input#confirmPassword").fill("studentpass123");

    // Form submit button should be enabled
    const submitBtn = page.locator("button[type='submit']");
    await expect(submitBtn).toBeEnabled();
  });

  test("4. Tutor Registration and Availability Picker test", async ({ page }) => {
    await page.goto(`${BASE_URL}/register/tutor`);

    // Verify tutor registration page heading
    await expect(page.locator("h3")).toContainText(/Tutor Registration/i);

    // Fill essential tutor details
    await page.locator("input#name").fill("Automated Tutor");
    const uniqueEmail = `tutor.${Date.now()}@test.com`;
    await page.locator("input#email").fill(uniqueEmail);
    await page.locator("input#phone").fill("8765432109");
    await page.locator("input#city").fill("Bangalore");
    await page.locator("input#qualification").fill("M.Sc in Physics, B.Ed");
    await page.locator("input#experience").fill("4");

    // Select category (Academic)
    await page.locator("button:has-text('Select category')").click();
    await page.locator("role=option[name='Academic']").click();

    // Select teaching mode
    await page.locator("button:has-text('Select mode')").click();
    await page.locator("role=option[name='Online']").click();

    // Verify availability timings section is visible
    await expect(page.locator("text=Available Demo Timings")).toBeVisible();

    // Check Sunday availability
    const sundayCheckboxEl = page.locator("#day-Sunday");
    await sundayCheckboxEl.click({ force: true });

    // Verify time slots render when day is selected
    const startTimeInput = page.locator("input[type='time']").first();
    await expect(startTimeInput).toBeVisible();
    await expect(startTimeInput).toHaveValue("09:00");
  });

  test("5. Authentication & Login flow test", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Check login header
    await expect(page.locator("h3")).toContainText(/Welcome Back/i);

    // Verify form input elements
    await page.locator("input#email").fill("student@test.com");
    await page.locator("input#password").fill("secret123");

    const submitBtn = page.locator("button[type='submit']");
    await expect(submitBtn).toBeEnabled();
  });

});
