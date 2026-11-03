/**
 * Utility functions and configuration for Tutor Multi-Media Showcase (Videos & Photo Gallery)
 */

export const VIDEO_FEATURE_WHITELIST_EMAILS = [
  'n210043@rguktn.ac.in'
];

export interface IntroVideoData {
  url?: string;
  embedUrl?: string;
  title?: string;
  provider?: 'youtube' | 'vimeo' | 'drive' | 'direct' | 'upload' | string;
  thumbnail?: string;
  isEnabled?: boolean;
}

export interface GalleryVideo {
  url: string;
  embedUrl?: string;
  title?: string;
  provider?: string;
  thumbnail?: string;
  createdAt?: string | Date;
}

export interface GalleryImage {
  url: string;
  caption?: string;
  createdAt?: string | Date;
}

export interface MediaGalleryData {
  videos: GalleryVideo[];
  images: GalleryImage[];
  isEnabled: boolean;
}

export function canUserManageVideo(user: any, tutorProfile?: any): boolean {
  if (!user) return false;
  const email = (user.email || user.user_metadata?.email || '').toLowerCase().trim();
  if (VIDEO_FEATURE_WHITELIST_EMAILS.includes(email)) return true;
  if (tutorProfile?.hasVideoFeature) return true;
  return false;
}

export function parseVideoUrl(rawUrl: string): {
  isValid: boolean;
  url: string;
  embedUrl: string;
  provider: 'youtube' | 'vimeo' | 'drive' | 'direct' | 'upload' | '';
  thumbnail: string;
} {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, url: '', embedUrl: '', provider: '', thumbnail: '' };
  }

  const url = rawUrl.trim();

  // 1. YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      isValid: true,
      url,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&autoplay=1`,
      provider: 'youtube',
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    };
  }

  // 2. Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|)(\d+)(?:$|\/|\?)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    const videoId = vimeoMatch[1];
    return {
      isValid: true,
      url,
      embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=1`,
      provider: 'vimeo',
      thumbnail: ''
    };
  }

  // 3. Google Drive
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
