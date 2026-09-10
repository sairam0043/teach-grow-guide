import { Link } from "react-router-dom";
import { Star, MapPin, Monitor, CheckCircle2, X, Award, BookOpen, GraduationCap, Calendar, ArrowRight, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Tutor } from "@/data/mockTutors";
import { resolveAssetUrl } from "@/lib/assetUrl";

interface TutorComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  tutors: Tutor[];
  onRemoveTutor: (tutorId: string) => void;
  onClearAll: () => void;
}

export default function TutorComparisonModal({
  isOpen,
  onClose,
  tutors,
  onRemoveTutor,
  onClearAll,
}: TutorComparisonModalProps) {
  if (tutors.length === 0) return null;

  // Helpers to calculate rates
  const getMinRate = (tutor: Tutor): number => {
    const rates = (tutor as any).subjectRates?.map((sr: any) => sr.rate) || [];
    if (rates.length > 0) return Math.min(...rates);
    return tutor.hourlyRate || 500;
  };

  const getRateDisplay = (tutor: Tutor): string => {
    const rates = (tutor as any).subjectRates?.map((sr: any) => sr.rate) || [];
    if (rates.length === 0) return `₹${tutor.hourlyRate || 500}/hr`;
    const minRate = Math.min(...rates);
    const maxRate = Math.max(...rates);
    if (minRate === maxRate) return `₹${minRate}/hr`;
    return `₹${minRate} - ₹${maxRate}/hr`;
  };

  // Find max experience and min price to highlight best attributes
  const maxExp = Math.max(...tutors.map((t) => t.experience || 0));
  const minPrice = Math.min(...tutors.map((t) => getMinRate(t)));
  const maxRating = Math.max(...tutors.map((t) => t.rating || 0));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6 bg-card text-card-foreground">
        <DialogHeader className="flex flex-row items-center justify-between pb-4 border-b border-border pr-6">
          <div>
            <DialogTitle className="text-xl sm:text-2xl font-bold font-serif flex items-center gap-2">
              <Award className="h-6 w-6 text-primary" />
              Compare Tutors ({tutors.length} Selected)
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Side-by-side comparison of qualifications, experience, teaching mode, and fees rate.
            </DialogDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClearAll} className="text-xs text-muted-foreground hover:text-destructive">
            Clear Selection
          </Button>
        </DialogHeader>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm min-w-[600px]">
            <thead>
              <tr>
                {/* Feature Label Column */}
                <th className="p-3 text-left w-48 bg-muted/30 font-semibold text-muted-foreground border-b border-r border-border rounded-tl-lg">
                  Tutor Profile
                </th>
                {/* Tutor Columns */}
                {tutors.map((tutor) => {
                  const photoSrc =
                    resolveAssetUrl(tutor.photo) ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.name)}&background=random&size=400`;

                  return (
                    <th key={tutor.id} className="p-4 text-center border-b border-r border-border last:border-r-0 min-w-[220px] bg-card relative">
                      <button
                        onClick={() => onRemoveTutor(tutor.id)}
                        className="absolute top-2 right-2 p-1 rounded-full text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                        title="Remove tutor"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="flex flex-col items-center">
                        <div className="relative mb-3 h-20 w-20 rounded-full overflow-hidden border-2 border-primary/20 shadow-sm">
                          <img
                            src={photoSrc}
                            alt={tutor.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.name)}&background=random&size=400`;
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <h4 className="font-semibold text-base capitalize line-clamp-1">{tutor.name}</h4>
                          {tutor.isVerified && (
                            <span title="Verified Tutor">
                              <CheckCircle2 className="h-4 w-4 fill-blue-500 text-white shrink-0" aria-label="Verified Tutor" />
                            </span>
                          )}
                        </div>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {tutor.category}
                        </Badge>
                        <Button size="sm" className="mt-3 w-full gap-1.5 shadow-sm text-xs" asChild>
                          <Link to={`/tutors/${tutor.id}`}>
                            View Profile <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* Experience Row */}
              <tr className="hover:bg-muted/20 transition-colors">
                <td className="p-3 font-medium text-muted-foreground border-b border-r border-border flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" />
                  Experience
                </td>
                {tutors.map((tutor) => {
                  const isTopExp = tutor.experience === maxExp && maxExp > 0;
                  return (
                    <td key={tutor.id} className="p-3 text-center border-b border-r border-border last:border-r-0">
                      <span className={`font-semibold ${isTopExp ? "text-amber-600 dark:text-amber-400" : ""}`}>
                        {tutor.experience} {tutor.experience === 1 ? "Year" : "Years"}
                      </span>
                      {isTopExp && (
                        <Badge className="ml-2 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 text-[10px]">
                          Highest
                        </Badge>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Hourly Rate / Fees Row */}
              <tr className="hover:bg-muted/20 transition-colors bg-emerald-50/30 dark:bg-emerald-950/10">
                <td className="p-3 font-medium text-muted-foreground border-b border-r border-border flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  Fees Rate
                </td>
                {tutors.map((tutor) => {
                  const minRate = getMinRate(tutor);
                  const isBestPrice = minRate === minPrice;
                  const subjectRates = (tutor as any).subjectRates || [];

                  return (
                    <td key={tutor.id} className="p-3 text-center border-b border-r border-border last:border-r-0">
                      <div className="font-bold text-base text-emerald-600 dark:text-emerald-400">
                        {getRateDisplay(tutor)}
                      </div>
                      {isBestPrice && (
                        <Badge className="mt-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 text-[10px]">
                          Lowest Starting Rate
                        </Badge>
                      )}
                      {subjectRates.length > 0 && (
                        <div className="mt-2 text-[11px] text-muted-foreground space-y-0.5 max-h-20 overflow-y-auto pr-1">
                          {subjectRates.map((sr: any, idx: number) => (
                            <div key={idx} className="flex justify-between gap-1 text-[10px] border-b border-dashed border-border/50 py-0.5">
                              <span className="truncate">{sr.subject}:</span>
                              <span className="font-semibold text-foreground">₹{sr.rate}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Teaching Mode Row */}
              <tr className="hover:bg-muted/20 transition-colors">
                <td className="p-3 font-medium text-muted-foreground border-b border-r border-border flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-blue-500" />
                  Teaching Mode
                </td>
                {tutors.map((tutor) => (
                  <td key={tutor.id} className="p-3 text-center border-b border-r border-border last:border-r-0 font-medium">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs">
                      <Monitor className="h-3.5 w-3.5" />
                      {tutor.mode?.toLowerCase() === "both" ? "Online & Offline" : tutor.mode}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Subjects Row */}
              <tr className="hover:bg-muted/20 transition-colors">
                <td className="p-3 font-medium text-muted-foreground border-b border-r border-border flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-purple-500" />
                  Subjects Taught
                </td>
                {tutors.map((tutor) => (
                  <td key={tutor.id} className="p-3 border-b border-r border-border last:border-r-0">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {(tutor.subjects || []).map((sub) => (
                        <Badge key={sub} variant="secondary" className="text-[11px] font-normal">
                          {sub.replace(/\s*\((Academic|Extracurricular)\)/i, "")}
                        </Badge>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Boards Taught Row */}
              <tr className="hover:bg-muted/20 transition-colors">
                <td className="p-3 font-medium text-muted-foreground border-b border-r border-border flex items-center gap-2">
                  <span className="text-sm">📋</span>
                  Board(s)
                </td>
                {tutors.map((tutor) => {
                  const boards = tutor.boardsTaught || [];
                  return (
                    <td key={tutor.id} className="p-3 text-center border-b border-r border-border last:border-r-0">
                      {boards.length > 0 ? (
                        <div className="flex flex-wrap gap-1 justify-center">
                          {boards.map((b) => (
                            <Badge key={b} variant="outline" className="text-[11px] border-indigo-200 text-indigo-700 dark:text-indigo-300 dark:border-indigo-900">
                              {b}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">All Boards / N/A</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Classes Taught Row */}
              <tr className="hover:bg-muted/20 transition-colors">
                <td className="p-3 font-medium text-muted-foreground border-b border-r border-border flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-indigo-500" />
                  Classes / Grades
                </td>
                {tutors.map((tutor) => {
                  const classes = tutor.classesTaught || [];
                  return (
                    <td key={tutor.id} className="p-3 text-center border-b border-r border-border last:border-r-0">
                      {classes.length > 0 ? (
                        <div className="flex flex-wrap gap-1 justify-center">
                          {classes.map((c) => (
                            <Badge key={c} variant="outline" className="text-[11px]">
                              {c}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">All Classes</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Rating & Reviews Row */}
              <tr className="hover:bg-muted/20 transition-colors">
                <td className="p-3 font-medium text-muted-foreground border-b border-r border-border flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  Rating & Reviews
                </td>
                {tutors.map((tutor) => {
                  const isTopRating = tutor.rating === maxRating && maxRating > 0;
                  return (
                    <td key={tutor.id} className="p-3 text-center border-b border-r border-border last:border-r-0">
                      {tutor.rating > 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-bold text-foreground">{tutor.rating}</span>
                          <span className="text-xs text-muted-foreground">({tutor.reviewCount} reviews)</span>
                          {isTopRating && (
                            <Badge className="ml-1 bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200 border-yellow-300 text-[10px]">
                              Top Rated
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">No reviews yet</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Qualifications Row */}
              <tr className="hover:bg-muted/20 transition-colors">
                <td className="p-3 font-medium text-muted-foreground border-b border-r border-border flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-emerald-500" />
                  Qualification
                </td>
                {tutors.map((tutor) => (
                  <td key={tutor.id} className="p-3 text-center border-b border-r border-border last:border-r-0 text-xs font-medium text-foreground">
                    {tutor.qualification || "Not specified"}
                  </td>
                ))}
              </tr>

              {/* City / Location Row */}
              <tr className="hover:bg-muted/20 transition-colors">
                <td className="p-3 font-medium text-muted-foreground border-b border-r border-border flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-rose-500" />
                  Location / City
                </td>
                {tutors.map((tutor) => (
                  <td key={tutor.id} className="p-3 text-center border-b border-r border-border last:border-r-0 text-xs font-medium">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      {tutor.city || "N/A"}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Demo Availability Row */}
              <tr className="hover:bg-muted/20 transition-colors">
                <td className="p-3 font-medium text-muted-foreground border-b border-r border-border flex items-center gap-2 rounded-bl-lg">
                  <Calendar className="h-4 w-4 text-cyan-500" />
                  Demo Slots
                </td>
                {tutors.map((tutor) => {
                  const demoCount = tutor.demoSlots?.filter((d) => d.available).length || 0;
                  return (
                    <td key={tutor.id} className="p-3 text-center border-b border-r border-border last:border-r-0 text-xs">
                      {demoCount > 0 ? (
                        <Badge className="bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border-cyan-300">
                          {demoCount} Slots Available
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground italic">Contact for slots</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
