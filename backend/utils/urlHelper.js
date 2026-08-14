const axios = require('axios');

/**
 * Follows HTTP redirects to expand a shortened Google Maps URL (e.g. maps.app.goo.gl).
 * This exposes the full URL containing explicit coordinates which can be parsed client-side.
 */
async function expandGoogleMapsUrl(url) {
  if (!url) return '';
  const isShortened = url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps');
  if (!isShortened) {
    return url;
  }
  try {
    console.log(`[urlHelper] Expanding shortened Google Maps URL: ${url}`);
    const res = await axios.get(url, {
      maxRedirects: 5,
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const expanded = res.request.res.responseUrl || res.config.url || url;
    console.log(`[urlHelper] Expanded to: ${expanded}`);
    return expanded;
  } catch (err) {
    console.error('[urlHelper] Failed to expand Google Maps URL:', err.message);
    return url;
  }
}

module.exports = { expandGoogleMapsUrl };
