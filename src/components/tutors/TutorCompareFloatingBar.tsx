import { X, ArrowRight, Scale, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Tutor } from "@/data/mockTutors";
import { resolveAssetUrl } from "@/lib/assetUrl";

interface TutorCompareFloatingBarProps {
  selectedTutors: Tutor[];
  onRemoveTutor: (tutorId: string) => void;
  onClearAll: () => void;
  onOpenCompareModal: () => void;
}

export default function TutorCompareFloatingBar({
  selectedTutors,
  onRemoveTutor,
  onClearAll,
  onOpenCompareModal,
}: TutorCompareFloatingBarProps) {
  if (selectedTutors.length === 0) return null;

  const count = selectedTutors.length;
  const canCompare = count >= 2;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[92vw] max-w-2xl animate-in slide-in-from-bottom-6 duration-300">
      <div className="bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left Section: Selected Tutors Thumbnails */}
        <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1.5 shrink-0 pr-2 border-r border-border">
            <Scale className="h-5 w-5 text-primary animate-pulse" />
            <span className="font-semibold text-xs sm:text-sm text-foreground">
              Compare ({count}/3)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {selectedTutors.map((tutor) => {
              const photoSrc =
                resolveAssetUrl(tutor.photo) ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.name)}&background=random&size=400`;

              return (
                <div
                  key={tutor.id}
                  className="flex items-center gap-1.5 bg-muted/60 dark:bg-muted/40 rounded-full pl-1 pr-2 py-1 border border-border shrink-0 text-xs transition-all hover:bg-muted"
                >
                  <img
                    src={photoSrc}
                    alt={tutor.name}
                    className="h-6 w-6 rounded-full object-cover border border-primary/30"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.name)}&background=random&size=400`;
                    }}
                  />
                  <span className="font-medium text-foreground max-w-[80px] sm:max-w-[100px] truncate">
                    {tutor.name.split(" ")[0]}
                  </span>
                  <button
                    onClick={() => onRemoveTutor(tutor.id)}
                    className="p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive text-muted-foreground transition-colors ml-0.5"
                    title={`Remove ${tutor.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}

            {/* Empty slots placeholders if count < 3 */}
            {Array.from({ length: 3 - count }).map((_, idx) => (
              <div
                key={idx}
                className="hidden md:flex items-center justify-center h-8 w-8 rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground text-xs font-semibold"
                title="Select another tutor to compare"
              >
                +{idx + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-xs text-muted-foreground hover:text-destructive h-9 px-2.5"
          >
            <Trash2 className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Clear</span>
          </Button>

          <Button
            onClick={onOpenCompareModal}
            disabled={!canCompare}
            size="sm"
            className="h-9 px-4 font-semibold gap-1.5 shadow-md shadow-primary/20"
          >
            <span>{canCompare ? `Compare (${count})` : "Select 1 more"}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
