import fs from 'fs';
import path from 'path';

const SITE_URL = 'https://tutor.cuvasol.com';

// Order of endpoints to try: local, then production fallback
const API_ENDPOINTS = [
  'http://localhost:5000/api',
  'http://127.0.0.1:5000/api',
  'https://cuvasol-tutor.onrender.com/api'
];

const staticRoutes = [
  '/',
  '/about',
  '/contact',
  '/ai-program',
  '/terms',
  '/tutors',
  '/login',
  '/register/student',
  '/register/tutor'
];

async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function getTutors() {
  for (const apiBase of API_ENDPOINTS) {
    try {
      const url = `${apiBase}/tutors?status=approved`;
      console.log(`Trying to fetch tutors from: ${url}`);
      const response = await fetchWithTimeout(url, {}, 4000);
      if (response.ok) {
        const data = await response.json();
        console.log(`Successfully fetched ${data.length} approved tutors from ${apiBase}`);
        return data;
      }
      console.warn(`Endpoint ${url} returned status: ${response.status}`);
    } catch (err) {
      console.warn(`Failed to fetch from ${apiBase}: ${err.message}`);
    }
  }
  throw new Error('All tutor API endpoints failed.');
}

async function generateSitemap() {
  console.log('Generating sitemap.xml...');
  
  const urls = [...staticRoutes];

  try {
    const tutors = await getTutors();
    tutors.forEach(tutor => {
      const id = tutor.id || tutor._id;
      if (id) {
        urls.push(`/tutors/${id}`);
      }
    });
  } catch (error) {
    console.error('Proceeding with static routes only due to error:', error.message);
  }

  const currentDate = new Date().toISOString().split('T')[0];

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(route => `  <url>
    <loc>${SITE_URL}${route}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${route === '/' || route.startsWith('/tutors') ? 'daily' : 'monthly'}</changefreq>
    <priority>${route === '/' ? '1.0' : route.startsWith('/tutors/') ? '0.8' : '0.6'}</priority>
  </url>`).join('\n')}
</urlset>`;

  const outputPath = path.resolve(process.cwd(), 'public', 'sitemap.xml');
  fs.writeFileSync(outputPath, xmlContent, 'utf8');
  console.log(`Sitemap written successfully to: ${outputPath} (Total routes: ${urls.length})`);
}

generateSitemap();
