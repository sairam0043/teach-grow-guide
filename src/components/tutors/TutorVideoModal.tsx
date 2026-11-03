import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play, Sparkles, Calendar, Image as ImageIcon, Video as VideoIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Link } from "react-router-dom";
import { resolveAssetUrl } from "@/lib/assetUrl";
import { parseVideoUrl, GalleryVideo, GalleryImage } from "@/lib/videoHelper";

interface TutorVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  tutor: {
    _id?: string;
    id?: string;
    name: string;
    photo?: string;
    category?: string;
    subjects?: string[];
    introVideo?: {
      url?: string;
      embedUrl?: string;
      title?: string;
      provider?: string;
    };
    mediaGallery?: {
      videos?: GalleryVideo[];
      images?: GalleryImage[];
      isEnabled?: boolean;
    };
  };
}

export const TutorVideoModal: React.FC<TutorVideoModalProps> = ({ isOpen, onClose, tutor }) => {
  const tutorId = tutor._id || tutor.id;
  
  // Aggregate videos: from mediaGallery.videos, or fallback to introVideo
  const galleryVideos: GalleryVideo[] = (tutor.mediaGallery?.videos && tutor.mediaGallery.videos.length > 0)
    ? tutor.mediaGallery.videos
    : (tutor.introVideo?.url ? [{
        url: tutor.introVideo.url,
        embedUrl: tutor.introVideo.embedUrl,
        title: tutor.introVideo.title || `Introduction with ${tutor.name}`,
        provider: tutor.introVideo.provider
      }] : []);

  const galleryImages: GalleryImage[] = tutor.mediaGallery?.images || [];

  const [activeTab, setActiveTab] = useState<'videos' | 'photos'>('videos');
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null);

  const effectiveTab = galleryVideos.length === 0 ? 'photos' : (galleryImages.length === 0 ? 'videos' : activeTab);

  const currentVideo = galleryVideos[selectedVideoIndex] || galleryVideos[0];
  const parsed = currentVideo ? parseVideoUrl(currentVideo.url) : null;
  const embedUrl = currentVideo?.embedUrl || parsed?.embedUrl;
  const isDirectVideo = parsed?.provider === 'direct' || parsed?.provider === 'upload';
  const videoTitle = currentVideo?.title || `Meet ${tutor.name} - Demo Lesson`;

  const hasMultipleVideos = galleryVideos.length > 1;
  const hasImages = galleryImages.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background border border-border shadow-2xl rounded-2xl sm:rounded-3xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/40 bg-secondary/20 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full overflow-hidden border-2 border-primary/20 shrink-0 bg-secondary">
                <img
                  src={resolveAssetUrl(tutor.photo) || `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.name)}`}
                  alt={tutor.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base sm:text-lg font-bold">
                    {tutor.name} • Teaching Portfolio
                  </DialogTitle>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                    <Sparkles className="h-3 w-3" /> VIP Showcase
                  </span>
                </div>
                <DialogDescription className="text-xs text-muted-foreground">
                  {tutor.subjects?.slice(0, 3).join(", ") || "Academic & Extracurricular"}
                </DialogDescription>
              </div>
            </div>

            {/* Tabs switcher if both videos and images exist */}
            {hasImages && galleryVideos.length > 0 ? (
              <div className="flex items-center bg-secondary/60 p-1 rounded-xl border border-border/40 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('videos')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    effectiveTab === 'videos'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <VideoIcon className="h-3.5 w-3.5" />
                  Videos ({galleryVideos.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('photos')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    effectiveTab === 'photos'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  Photos ({galleryImages.length})
                </button>
              </div>
            ) : hasImages ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-secondary text-foreground border border-border/60">
                <ImageIcon className="h-3.5 w-3.5 text-primary" />
                Photo Gallery ({galleryImages.length})
              </span>
            ) : null}
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto">
          {effectiveTab === 'videos' ? (
            <div className="space-y-3">
              {/* Active Video Player (16:9) */}
              <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
                {embedUrl ? (
                  isDirectVideo ? (
                    <video
                      key={embedUrl}
                      src={embedUrl}
                      controls
                      autoPlay
                      playsInline
                      className="w-full h-full object-contain"
                    >
                      Your browser does not support HTML video.
                    </video>
                  ) : (
                    <iframe
                      key={embedUrl}
                      src={embedUrl}
                      title={videoTitle}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  )
                ) : (
                  <div className="text-center p-8 text-muted-foreground">
                    <Play className="h-12 w-12 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">No video source found</p>
                  </div>
                )}
              </div>

              {/* Video Title Bar */}
              <div className="px-5 pt-1 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-foreground">{videoTitle}</h4>
                  <p className="text-xs text-muted-foreground">
                    Video {selectedVideoIndex + 1} of {galleryVideos.length}
                  </p>
                </div>
              </div>

              {/* Playlist Carousel / Thumbnails if multiple videos */}
              {hasMultipleVideos && (
                <div className="px-5 pb-3">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-2">
                    More Videos in Playlist:
                  </p>
                  <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                    {galleryVideos.map((vid, idx) => {
                      const isSelected = idx === selectedVideoIndex;
                      const thumb = vid.thumbnail || (vid.url.includes('youtube') ? `https://img.youtube.com/vi/${vid.url.match(/v=([a-zA-Z0-9_-]{11})/)?.[1] || ''}/hqdefault.jpg` : '');
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedVideoIndex(idx)}
                          className={`relative shrink-0 w-36 rounded-xl overflow-hidden border-2 text-left transition-all ${
                            isSelected
                              ? 'border-primary ring-2 ring-primary/40 shadow-md scale-[1.02]'
                              : 'border-border/60 hover:border-primary/40 opacity-80 hover:opacity-100'
                          }`}
                        >
                          <div className="aspect-video bg-secondary/80 relative flex items-center justify-center overflow-hidden">
                            {thumb ? (
                              <img src={thumb} alt={vid.title || `Video ${idx + 1}`} className="w-full h-full object-cover" />
                            ) : (
                              <Play className="h-6 w-6 text-primary" />
                            )}
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <Play className="h-4 w-4 fill-white text-white drop-shadow" />
                            </div>
                          </div>
                          <div className="p-1.5 bg-card">
                            <p className="text-[11px] font-bold text-foreground line-clamp-1">
                              {vid.title || `Lesson ${idx + 1}`}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Photos Tab */
            <div className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setLightboxImage(img)}
                    className="group relative aspect-square rounded-xl overflow-hidden border border-border/60 bg-secondary/30 hover:border-primary transition-all hover:shadow-lg focus:outline-none"
                  >
                    <img
                      src={resolveAssetUrl(img.url)}
                      alt={img.caption || `Classroom photo ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    {img.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-left">
                        <p className="text-[11px] font-medium text-white line-clamp-2">
                          {img.caption}
                        </p>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lightbox Modal for Full-Size Image Preview */}
        {lightboxImage && (
          <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="max-w-3xl max-h-[80vh] flex flex-col items-center">
              <img
                src={resolveAssetUrl(lightboxImage.url)}
                alt={lightboxImage.caption || "Full photo"}
                className="max-w-full max-h-[70vh] rounded-xl object-contain shadow-2xl"
              />
              {lightboxImage.caption && (
                <p className="mt-3 text-sm font-semibold text-white/90 text-center bg-black/50 px-4 py-1.5 rounded-full">
                  {lightboxImage.caption}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action Footer */}
        <div className="p-4 sm:p-5 bg-card/60 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/40 shrink-0">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            Book a trial session to start learning with <strong className="text-foreground">{tutor.name}</strong>.
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {tutorId && (
              <Button asChild className="w-full sm:w-auto gap-1.5 font-bold shadow-md rounded-xl" onClick={onClose}>
                <Link to={`/tutors/${tutorId}`}>
                  <Calendar className="h-4 w-4" /> Book Session
                </Link>
              </Button>
            )}
            <Button variant="outline" className="rounded-xl text-xs" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
