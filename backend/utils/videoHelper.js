/**
 * Helper to validate and normalize video URLs and multi-media galleries
 */

const VIDEO_FEATURE_WHITELIST_EMAILS = [
  'n210043@rguktn.ac.in'
];

function isVideoFeatureAllowed(email, tutorDoc) {
  if (email && VIDEO_FEATURE_WHITELIST_EMAILS.includes(String(email).toLowerCase().trim())) {
    return true;
  }
  if (tutorDoc && tutorDoc.hasVideoFeature) {
    return true;
  }
  return false;
}

function parseVideoUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return {
      isValid: false,
      url: '',
      embedUrl: '',
      provider: '',
      thumbnail: ''
    };
  }

  const url = rawUrl.trim();

  // 1. YouTube Matchers
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      isValid: true,
      url,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`,
      provider: 'youtube',
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    };
  }

  // 2. Vimeo Matcher
  const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|)(\d+)(?:$|\/|\?)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    const videoId = vimeoMatch[1];
    return {
      isValid: true,
      url,
      embedUrl: `https://player.vimeo.com/video/${videoId}`,
      provider: 'vimeo',
      thumbnail: ''
    };
  }

  // 3. Google Drive Matcher
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveMatch && driveMatch[1]) {
    const fileId = driveMatch[1];
    return {
      isValid: true,
      url,
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      provider: 'drive',
      thumbnail: ''
    };
  }

  // 4. Direct video URL (.mp4, .webm, or /upload/ video path)
  if (url.match(/\.(mp4|webm|ogg)($|\?)/i) || url.includes('/upload/')) {
    return {
      isValid: true,
      url,
      embedUrl: url,
      provider: url.includes('/upload/') ? 'upload' : 'direct',
      thumbnail: ''
    };
  }

  return {
    isValid: false,
    url,
    embedUrl: url,
    provider: 'direct',
    thumbnail: ''
  };
}

function normalizeMediaGallery(input) {
  if (!input || typeof input !== 'object') {
    return {
      videos: [],
      images: [],
      isEnabled: true
    };
  }

  const rawVideos = Array.isArray(input.videos) ? input.videos : [];
  const normalizedVideos = rawVideos
    .filter(v => v && v.url && typeof v.url === 'string' && v.url.trim())
    .map(v => {
      const parsed = parseVideoUrl(v.url);
      return {
        url: v.url.trim(),
        embedUrl: parsed.embedUrl,
        title: (v.title || '').trim(),
        provider: parsed.provider,
        thumbnail: v.thumbnail || parsed.thumbnail || '',
        createdAt: v.createdAt || new Date()
      };
    });

  const rawImages = Array.isArray(input.images) ? input.images : [];
  const normalizedImages = rawImages
    .filter(img => img && img.url && typeof img.url === 'string' && img.url.trim())
    .map(img => ({
      url: img.url.trim(),
      caption: (img.caption || '').trim(),
      createdAt: img.createdAt || new Date()
    }));

  return {
    videos: normalizedVideos,
    images: normalizedImages,
    isEnabled: input.isEnabled !== undefined ? Boolean(input.isEnabled) : true
  };
}

module.exports = {
  VIDEO_FEATURE_WHITELIST_EMAILS,
  isVideoFeatureAllowed,
  parseVideoUrl,
  normalizeMediaGallery
};
