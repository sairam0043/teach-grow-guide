import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play, Sparkles, ExternalLink, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { resolveAssetUrl } from "@/lib/assetUrl";
import { parseVideoUrl } from "@/lib/videoHelper";

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
  };
}

export const TutorVideoModal: React.FC<TutorVideoModalProps> = ({ isOpen, onClose, tutor }) => {
  const tutorId = tutor._id || tutor.id;
  const rawUrl = tutor.introVideo?.url || "";
  const parsed = parseVideoUrl(rawUrl);
  const embedUrl = tutor.introVideo?.embedUrl || parsed.embedUrl;
  const isDirectVideo = parsed.provider === 'direct' || parsed.provider === 'upload';
  const videoTitle = tutor.introVideo?.title || `Meet ${tutor.name} - Introduction Video`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-background border border-border shadow-2xl rounded-2xl sm:rounded-3xl">
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/40 bg-secondary/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full overflow-hidden border-2 border-primary/20 shrink-0 bg-secondary">
              <img
                src={resolveAssetUrl(tutor.photo) || `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.name)}`}
                alt={tutor.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base sm:text-lg font-bold truncate">
                  {videoTitle}
                </DialogTitle>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                  <Sparkles className="h-3 w-3" /> Featured Tutor
                </span>
              </div>
              <DialogDescription className="text-xs text-muted-foreground truncate">
                Taught by {tutor.name} • {tutor.subjects?.slice(0, 3).join(", ") || "Academic & Extracurricular"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Video Player Container (16:9 Aspect Ratio) */}
        <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
          {embedUrl ? (
            isDirectVideo ? (
              <video
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

        {/* Action footer */}
        <div className="p-4 sm:p-5 bg-card/60 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/40">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            Ready to learn with <strong className="text-foreground">{tutor.name}</strong>? Book a 1-on-1 trial session.
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
