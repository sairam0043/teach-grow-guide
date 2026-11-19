const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const PORT = 4173;
const DIST_DIR = path.resolve(__dirname, '../dist');

// 1. Simple SPA static HTTP server
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
      // SPA Fallback to index.html
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

async function record() {
  const server = await startServer();
  const outputDir = path.resolve(__dirname, '../public/recordings');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Launching Chromium for 9:16 vertical website screen recording...');
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  // 9:16 Vertical Video (720 x 1280 or 1080 x 1920)
  const context = await browser.newContext({
    viewport: { width: 540, height: 960 }, // crisp 9:16 mobile frame
    deviceScaleFactor: 2,
    recordVideo: {
      dir: outputDir,
      size: { width: 720, height: 1280 }
    }
  });

  const page = await context.newPage();

  // Helper to inject styled subtitles and animated spotlight/zoom effects
  async function showSubtitleAndHighlight(text, zoomSelector = null) {
    await page.evaluate(({ text, zoomSelector }) => {
      let sub = document.getElementById('cuvasol-video-subtitle');
      if (!sub) {
        sub = document.createElement('div');
        sub.id = 'cuvasol-video-subtitle';
        sub.style.cssText = `
          position: fixed;
          bottom: 40px;
          left: 5%;
          right: 5%;
          background: rgba(15, 23, 42, 0.92);
          border: 2px solid #0d9488;
          color: #ffffff;
          padding: 14px 20px;
          border-radius: 18px;
          font-family: 'DM Sans', -apple-system, sans-serif;
          font-weight: 700;
          font-size: 17px;
          text-align: center;
          z-index: 999999;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          transition: all 0.3s ease;
          letter-spacing: -0.2px;
          line-height: 1.35;
        `;
        document.body.appendChild(sub);
      }
      sub.innerHTML = text;

      // Remove previous zoom
      document.querySelectorAll('.video-zoom-highlight').forEach(el => {
        el.classList.remove('video-zoom-highlight');
        el.style.transform = '';
        el.style.boxShadow = '';
      });

      if (zoomSelector) {
        const target = document.querySelector(zoomSelector);
        if (target) {
          target.classList.add('video-zoom-highlight');
          target.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
          target.style.transform = 'scale(1.18)';
          target.style.boxShadow = '0 0 0 6px #0d9488, 0 12px 30px rgba(13, 148, 136, 0.4)';
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, { text, zoomSelector });
  }

  console.log('--- SCENE 1 (0-5s): Homepage & Cuvasol Logo ---');
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await showSubtitleAndHighlight("Welcome to Cuvasol! Let's see how to book your FREE Demo Class.");
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollBy({ top: 350, behavior: 'smooth' }));
  await page.waitForTimeout(2800);

  console.log('--- SCENE 2 (5-10s): Student Login & Dashboard ---');
  // Inject demo student in localStorage
  await page.evaluate(() => {
    const studentUser = {
      id: "demo-student-aijaz",
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
  await showSubtitleAndHighlight("First, log in to your Cuvasol student account.", "button, a[href*='tutor']");
  await page.waitForTimeout(2200);
  await page.evaluate(() => window.scrollBy({ top: 220, behavior: 'smooth' }));
  await page.waitForTimeout(2600);

  console.log('--- SCENE 3 (10-16s): Subject Selection Page ---');
  await page.goto(`http://127.0.0.1:${PORT}/tutors`, { waitUntil: 'networkidle' });
  await showSubtitleAndHighlight("Choose your preferred subject based on your learning needs.", "input[placeholder*='Search'], button");
  await page.waitForTimeout(2500);
  // Scroll down to show subject categories
  await page.evaluate(() => window.scrollBy({ top: 280, behavior: 'smooth' }));
  await page.waitForTimeout(3000);

  console.log('--- SCENE 4 (16-22s): Tutor Profiles & Explore ---');
  // Zoom on first tutor card "Book Free Demo" button
  await showSubtitleAndHighlight("Explore experienced tutors & select the right tutor for you.", "a[href*='/tutors/']");
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.scrollBy({ top: 240, behavior: 'smooth' }));
  await page.waitForTimeout(3000);

  console.log('--- SCENE 5 (22-29s): Demo Booking Calendar ---');
  await page.goto(`http://127.0.0.1:${PORT}/tutors/1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  // Scroll to booking calendar
  await page.evaluate(() => {
    const cal = document.querySelector(".rdp, [class*='calendar'], button[class*='emerald']");
    if (cal) cal.scrollIntoView({ behavior: 'smooth', block: 'center' });
    else window.scrollBy({ top: 500, behavior: 'smooth' });
  });
  await showSubtitleAndHighlight("Select your preferred date & time, then confirm your FREE Demo!", "button[class*='emerald'], button[type='submit']");
  await page.waitForTimeout(3000);
  await page.evaluate(() => window.scrollBy({ top: 200, behavior: 'smooth' }));
  await page.waitForTimeout(3500);

  console.log('--- SCENE 6 (29-35s): Grand Call to Action ---');
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await showSubtitleAndHighlight("That's it! Start learning with Cuvasol. Book your FREE Demo today! 🎉", "header, a[href*='register']");
  await page.waitForTimeout(5500);

  console.log('Finalizing video recording...');
  await page.close();
  await context.close();
  await browser.close();
  server.close();

  // Find the generated webm file in outputDir and rename it to a clean name
  const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.webm'));
  if (files.length > 0) {
    const latestFile = files.sort((a, b) => fs.statSync(path.join(outputDir, b)).mtimeMs - fs.statSync(path.join(outputDir, a)).mtimeMs)[0];
    const targetFile = path.join(outputDir, 'cuvasol-actual-website-9x16.webm');
    fs.copyFileSync(path.join(outputDir, latestFile), targetFile);
    console.log(`✅ Actual website recording saved to: ${targetFile}`);
  }
}

record().catch(err => {
  console.error('Recording error:', err);
  process.exit(1);
});
