const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const PORT = 4173;
const DIST_DIR = path.resolve(__dirname, '../dist');
const OUTPUT_DIR = path.resolve(__dirname, '../public/website-screens');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function startServer() {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2'
  };

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    let filePath = path.join(DIST_DIR, reqPath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      const indexPath = path.join(DIST_DIR, 'index.html');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      fs.createReadStream(indexPath).pipe(res);
    }
  });

  return new Promise((resolve) => {
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`Static server running at http://127.0.0.1:${PORT}`);
      resolve(server);
    });
  });
}

async function capture() {
  const server = await startServer();

  console.log('Launching Chrome to capture actual Cuvasol website screens...');
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  // 9:16 Vertical Viewport (e.g., iPhone 14 Pro Max / Modern Phone: 430 x 932 @ 2.5x = 1075 x 2330)
  const context = await browser.newContext({
    viewport: { width: 450, height: 800 }, // Exact 9:16 mobile aspect ratio
    deviceScaleFactor: 2, // High resolution output
  });

  const page = await context.newPage();

  // 1. Scene 1: Homepage Hero & Logo
  console.log('Capturing Scene 1: Homepage & Logo...');
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'scene1_home.png'), type: 'png' });

  // 1b. Scene 1 scrolled (features)
  await page.evaluate(() => window.scrollBy({ top: 380, behavior: 'instant' }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'scene1_hero_scroll.png'), type: 'png' });

  // 2. Scene 2: Student Login / Dashboard
  console.log('Capturing Scene 2: Student Dashboard...');
  await page.evaluate(() => {
    const studentUser = {
      id: "demo-student",
      full_name: "Aijaz",
      email: "aijaz@example.com",
      role: "student",
      walletBalance: 200,
      student_class: "Class 10",
      interested_subject: "Mathematics"
    };
    localStorage.setItem('cuvasol_user', JSON.stringify(studentUser));
    localStorage.setItem('token', 'demo-token');
  });
  await page.goto(`http://127.0.0.1:${PORT}/dashboard/student`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'scene2_dashboard.png'), type: 'png' });

  // 3. Scene 3: Subject Selection
  console.log('Capturing Scene 3: Subject Selection & Filters...');
  await page.goto(`http://127.0.0.1:${PORT}/tutors`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'scene3_subjects.png'), type: 'png' });

  // 4. Scene 4: Tutor Profile
  console.log('Capturing Scene 4: Tutor Profiles...');
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'instant' }));
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'scene4_tutors.png'), type: 'png' });

  // 5. Scene 5: Demo Booking Calendar on Tutor Detail
  console.log('Capturing Scene 5: Tutor Profile & Booking Calendar...');
  await page.goto(`http://127.0.0.1:${PORT}/tutors/1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Scroll directly to booking card
  await page.evaluate(() => {
    const card = document.getElementById('booking-card');
    if (card) {
      card.scrollIntoView({ behavior: 'instant', block: 'start' });
    } else {
      window.scrollBy({ top: 900, behavior: 'instant' });
    }
  });
  await page.waitForTimeout(600);

  // Select a slot if present to show active choice
  await page.evaluate(() => {
    const slotBtns = Array.from(document.querySelectorAll('button')).filter(b => 
      b.textContent && /\d{1,2}:\d{2}\s*(?:AM|PM)/i.test(b.textContent)
    );
    if (slotBtns.length > 0) {
      slotBtns[0].click();
    }
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'scene5_booking.png'), type: 'png' });

  // 6. Scene 6: CTA Screen
  console.log('Capturing Scene 6: CTA Screen...');
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'scene6_cta.png'), type: 'png' });

  await page.close();
  await context.close();
  await browser.close();
  server.close();

  console.log('✅ All actual website screens successfully captured in public/website-screens/ !');
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
