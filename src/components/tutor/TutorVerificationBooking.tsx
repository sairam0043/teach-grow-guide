import React, { useEffect, useState } from "react";
import axios from "axios";
import API_URL from "@/config/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ShieldCheck, 
  Calendar, 
  Clock, 
  Video, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  FileText, 
  GraduationCap, 
  Sparkles,
  RefreshCw,
  XCircle,
  HelpCircle,
  ArrowRight
} from "lucide-react";
import { getMeetingHref } from "@/utils/meeting";
import { getTimeZoneAbbreviation } from "@/utils/timezone";

interface AvailableSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  displayTime: string;
  displayTimingStr: string;
  utcTiming: string;
  isAvailable: boolean;
  isPast: boolean;
  isBooked: boolean;
}

interface AvailableDate {
  date: string;
  dayName: string;
  formattedDate: string;
  fullDateText: string;
  slots: AvailableSlot[];
}

interface TutorVerificationBookingProps {
  tutorProfile: any;
  onBookingUpdated?: () => void;
}

export const TutorVerificationBooking: React.FC<TutorVerificationBookingProps> = ({
  tutorProfile,
  onBookingUpdated
}) => {
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Available slots data from Admin
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [adminGoogleMeetLink, setAdminGoogleMeetLink] = useState("");
  const [adminInstructions, setAdminInstructions] = useState("");
  const [adminTimezone, setAdminTimezone] = useState("Asia/Kolkata");
  const [slotDuration, setSlotDuration] = useState(30);
  const [isSystemActive, setIsSystemActive] = useState(true);

  // Selection state
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [demoTopic, setDemoTopic] = useState("");

  // Existing booking for this tutor
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Fetch tutor's existing verification booking & admin available slots
  const loadData = async () => {
    if (!tutorProfile?.id && !tutorProfile?._id) return;
    const tutorId = tutorProfile.id || tutorProfile._id;

    try {
      setLoading(true);
      // Fetch both in parallel
      const [bookingRes, slotsRes] = await Promise.all([
        axios.get(`${API_URL}/dashboard/tutor/${tutorId}/verification-booking`).catch(() => ({ data: null })),
        axios.get(`${API_URL}/dashboard/admin/availability/slots`).catch(() => ({ data: null }))
      ]);

      if (bookingRes?.data?.booking) {
        const b = bookingRes.data.booking;
        if (['pending', 'confirmed'].includes(b.status)) {
          setActiveBooking(b);
        } else {
          setActiveBooking(null);
        }
      } else {
        setActiveBooking(null);
      }

      if (slotsRes?.data?.success) {
        setAvailableDates(slotsRes.data.availableDates || []);
        setAdminGoogleMeetLink(slotsRes.data.googleMeetLink || "");
        setAdminInstructions(slotsRes.data.instructions || "");
        setAdminTimezone(slotsRes.data.timezone || "Asia/Kolkata");
        setSlotDuration(slotsRes.data.slotDurationMinutes || 30);
        setIsSystemActive(slotsRes.data.isActive ?? true);

        // Auto-select first date that has available slots
        const firstAvailableDate = (slotsRes.data.availableDates || []).find(
          (d: AvailableDate) => d.slots.some(s => s.isAvailable)
        );
        if (firstAvailableDate) {
          setSelectedDate(firstAvailableDate.date);
        }
      }
    } catch (err: any) {
      console.error("Error loading verification details:", err);
      toast.error("Failed to load verification slots");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tutorProfile?.id, tutorProfile?._id]);

  // Handle booking confirmation
  const handleConfirmBooking = async () => {
    if (!selectedSlot) {
      toast.error("Please select a preferred timing slot.");
      return;
    }

    const tutorId = tutorProfile.id || tutorProfile._id;
    try {
      setBookingLoading(true);
      const res = await axios.post(`${API_URL}/dashboard/tutor/book-verification-slot`, {
        tutorId,
        timing: selectedSlot.displayTimingStr,
        utcTiming: selectedSlot.utcTiming,
        topicToLearn: demoTopic.trim() || "Tutor Profile Verification & Demo Lesson",
        notes: demoTopic.trim()
      });

      if (res.data?.success) {
        toast.success("Verification session booked successfully!");
        setActiveBooking(res.data.booking);
        setIsRescheduling(false);
        setSelectedSlot(null);
        setDemoTopic("");
        if (onBookingUpdated) onBookingUpdated();
        loadData();
      }
    } catch (err: any) {
      console.error("Failed to book verification slot:", err);
      toast.error(err.response?.data?.message || "Failed to book verification slot. Please try another time.");
    } finally {
      setBookingLoading(false);
    }
  };

  // Cancel existing booking
  const handleCancelBooking = async () => {
    if (!activeBooking) return;
    if (!window.confirm("Are you sure you want to cancel this verification demo booking? You can select a new slot afterwards.")) {
      return;
    }

    const tutorId = tutorProfile.id || tutorProfile._id;
    try {
      setCancelling(true);
      const res = await axios.post(`${API_URL}/dashboard/tutor/cancel-verification-slot`, {
        tutorId,
        bookingId: activeBooking._id,
        reason: "Tutor requested cancellation to reschedule"
      });

      if (res.data?.success) {
        toast.success("Verification session cancelled. You can now choose a new slot.");
        setActiveBooking(null);
        setIsRescheduling(false);
        if (onBookingUpdated) onBookingUpdated();
        loadData();
      }
    } catch (err: any) {
      console.error("Failed to cancel verification slot:", err);
      toast.error(err.response?.data?.message || "Failed to cancel verification session");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 py-6">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const isVerified = Boolean(tutorProfile?.isVerified);
  const selectedDateObj = availableDates.find(d => d.date === selectedDate);
  const slotsForSelectedDate = selectedDateObj?.slots || [];

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Verified Hero Card if already verified */}
      {isVerified && (
        <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent shadow-lg overflow-hidden rounded-2xl">
          <CardContent className="p-8 flex flex-col md:flex-row items-center gap-6">
            <div className="h-20 w-20 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30">
              <ShieldCheck className="h-10 w-10" />
            </div>
            <div className="space-y-2 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <h3 className="text-2xl font-extrabold text-foreground tracking-tight">Verified Tutor Profile</h3>
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-0.5 text-xs">
                  Active & Verified
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                Congratulations! Your tutor credentials and interview have been verified by our administration team. Your profile enjoys verified priority placement, higher student trust, and direct lesson bookings.
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Blue Verified Badge on Profile</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Top Rank in Student Search</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Instant Demo Bookings</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Active Scheduled Verification Session (if any and not rescheduling) */}
      {activeBooking && !isRescheduling && (
        <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent shadow-lg overflow-hidden rounded-2xl">
          <CardHeader className="bg-blue-500/15 border-b border-blue-500/20 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-foreground">
                    Verification Demo Class Scheduled
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Your 1-on-1 video verification meeting with the platform administrator is confirmed.
                  </CardDescription>
                </div>
              </div>

              <Badge className="bg-emerald-600 text-white font-bold px-3 py-1 text-xs self-start sm:self-center shadow-xs">
                CONFIRMED
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card p-6 rounded-xl border shadow-xs">
              <div className="space-y-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                  Scheduled Timing
                </span>
                <p className="text-xl font-extrabold text-foreground flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  {activeBooking.timing}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-indigo-500" /> Timezone: {tutorProfile?.timezone || adminTimezone || 'Asia/Kolkata'}
                </p>
                {activeBooking.topicToLearn && (
                  <p className="text-xs text-foreground/90 bg-secondary/30 p-2.5 rounded-lg border mt-2">
                    <span className="font-semibold text-muted-foreground">Topic:</span> {activeBooking.topicToLearn}
                  </p>
                )}
              </div>

              <div className="flex flex-col justify-between space-y-4">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                  Google Meet Video Room
                </span>

                <Button
                  size="lg"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 h-12"
                  asChild
                >
                  <a
                    href={getMeetingHref(
                      activeBooking.meetingLink || adminGoogleMeetLink,
                      activeBooking._id,
                      tutorProfile?.name || "Tutor",
                      "",
                      "Verification Demo Class"
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Video className="h-5 w-5" /> Join Google Meet Call
                  </a>
                </Button>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRescheduling(true)}
                    className="flex-1 font-semibold text-xs border-primary/30 text-primary hover:bg-primary/5"
                  >
                    <Clock className="h-3.5 w-3.5 mr-1" /> Reschedule Slot
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={cancelling}
                    onClick={handleCancelBooking}
                    className="flex-1 font-semibold text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel Booking
                  </Button>
                </div>
              </div>
            </div>

            {/* Preparation Checklist */}
            <div className="p-5 rounded-xl border bg-secondary/15 space-y-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-500" /> Preparation Checklist for Verification Call
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Original Degrees & Certificates:</strong> Keep scanned copies or physical degrees handy.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Valid Photo ID:</strong> Government-issued ID (Aadhaar, Passport, or Driving License).</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>10-Min Demo Lesson:</strong> Prepare to explain any fundamental concept in your chosen subject.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Webcam & Audio:</strong> Join 5 minutes early in a quiet, well-lit environment.</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Slot Booking Wizard (When no active booking, or tutor clicked Reschedule) */}
      {(!activeBooking || isRescheduling) && (
        <Card className="border-border/60 shadow-lg bg-card overflow-hidden rounded-2xl">
          <CardHeader className="bg-gradient-to-r from-blue-600/10 via-indigo-600/5 to-transparent border-b pb-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" /> Book Verification Demo Slot
                </CardTitle>
                <CardDescription className="text-xs mt-1 leading-relaxed">
                  Select your preferred day and time from the administrator's live availability schedule.
                </CardDescription>
              </div>

              {isRescheduling && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRescheduling(false)}
                  className="self-start sm:self-center text-xs font-semibold"
                >
                  Keep Existing Booking
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-6 md:p-8 space-y-8">
            {/* Info notice about Google Meet */}
            <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-blue-600 text-white shrink-0 mt-0.5">
                <Video className="h-4 w-4" />
              </div>
              <div className="text-xs space-y-1">
                <p className="font-bold text-blue-900 dark:text-blue-200">
                  Online Video Verification via Google Meet
                </p>
                <p className="text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
                  {adminInstructions || "The meeting will take place over Google Meet. You will receive immediate access to the meeting room link upon booking."}
                </p>
                <p className="text-[11px] text-muted-foreground pt-0.5">
                  Duration: <strong>{slotDuration} minutes</strong> • Timezone: <strong>{tutorProfile?.timezone || adminTimezone || 'Asia/Kolkata'} ({getTimeZoneAbbreviation(adminTimezone)})</strong>
                </p>
              </div>
            </div>

            {availableDates.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground bg-secondary/10 rounded-2xl border border-dashed">
                <Calendar className="mx-auto mb-3 h-14 w-14 opacity-30 text-blue-500" />
                <h3 className="text-base font-bold text-foreground mb-1">No Available Verification Slots Currently</h3>
                <p className="text-xs max-w-md mx-auto">
                  The administrator has not configured open availability windows for the upcoming days. Please check back shortly or reach out to platform support.
                </p>
              </div>
            ) : (
              <>
                {/* Step 1: Date Selector */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <span className="h-5 w-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-bold">1</span>
                      Select Available Date
                    </Label>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {availableDates.length} days with open availability
                    </span>
                  </div>

                  <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                    {availableDates.map((dateObj) => {
                      const isSelected = selectedDate === dateObj.date;
                      const hasOpenSlots = dateObj.slots.some(s => s.isAvailable);

                      return (
                        <button
                          key={dateObj.date}
                          type="button"
                          disabled={!hasOpenSlots}
                          onClick={() => {
                            setSelectedDate(dateObj.date);
                            setSelectedSlot(null);
                          }}
                          className={`flex flex-col items-center justify-center min-w-[105px] py-3 px-3 rounded-xl border text-center transition-all ${
                            isSelected
                              ? "bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02]"
                              : hasOpenSlots
                                ? "bg-card hover:bg-secondary/40 border-border/80 text-foreground cursor-pointer"
                                : "bg-secondary/15 text-muted-foreground/40 border-border/30 cursor-not-allowed opacity-50"
                          }`}
                        >
                          <span className={`text-[11px] font-bold uppercase tracking-wider ${isSelected ? "text-blue-100" : "text-muted-foreground"}`}>
                            {dateObj.dayName.slice(0, 3)}
                          </span>
                          <span className="text-lg font-extrabold my-0.5">
                            {dateObj.date.split("-")[2]}
                          </span>
                          <span className={`text-[10px] font-semibold ${isSelected ? "text-blue-100" : "text-muted-foreground"}`}>
                            {dateObj.formattedDate.split(" ")[0]}
                          </span>
                          <span className={`text-[9px] mt-1 font-bold ${isSelected ? "text-white" : "text-emerald-600 dark:text-emerald-400"}`}>
                            {dateObj.slots.filter(s => s.isAvailable).length} slots
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: Time Slots for Selected Date */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <span className="h-5 w-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-bold">2</span>
                      Choose Your Preferred Timing
                    </Label>
                    {selectedDateObj && (
                      <span className="text-xs font-bold text-primary">
                        {selectedDateObj.fullDateText}
                      </span>
                    )}
                  </div>

                  {slotsForSelectedDate.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground bg-secondary/10 rounded-xl border border-dashed text-xs">
                      No timings available for this date.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                      {slotsForSelectedDate.map((slot) => {
                        const isSelected = selectedSlot?.id === slot.id;
                        const isAvailable = slot.isAvailable;

                        return (
                          <button
                            key={slot.id}
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => setSelectedSlot(slot)}
                            className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center relative ${
                              isSelected
                                ? "bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02] ring-2 ring-blue-500/50"
                                : isAvailable
                                  ? "bg-card hover:bg-blue-50/50 dark:hover:bg-blue-950/20 hover:border-blue-400 border-border/80 text-foreground cursor-pointer"
                                  : "bg-secondary/20 border-border/30 text-muted-foreground/40 cursor-not-allowed opacity-50"
                            }`}
                          >
                            <span className="text-xs font-bold flex items-center gap-1">
                              <Clock className={`h-3 w-3 ${isSelected ? "text-white" : "text-blue-500"}`} />
                              {slot.displayTime.split(" - ")[0]}
                            </span>
                            <span className={`text-[10px] mt-0.5 ${isSelected ? "text-blue-100" : "text-muted-foreground"}`}>
                              until {slot.displayTime.split(" - ")[1]}
                            </span>
                            {slot.isBooked && (
                              <Badge variant="outline" className="mt-1 text-[9px] py-0 px-1 bg-rose-50 text-rose-600 border-rose-200">
                                Booked
                              </Badge>
                            )}
                            {slot.isPast && !slot.isBooked && (
                              <Badge variant="outline" className="mt-1 text-[9px] py-0 px-1 bg-slate-100 text-slate-500 border-slate-200">
                                Past
                              </Badge>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Step 3: Demo Lesson Subject / Topic (Optional) */}
                <div className="space-y-2 pt-2">
                  <Label htmlFor="demoTopic" className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <span className="h-5 w-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-bold">3</span>
                    Demo Lesson Topic or Notes (Optional)
                  </Label>
                  <Input
                    id="demoTopic"
                    type="text"
                    placeholder="e.g. Mathematics - Introduction to Quadratic Equations (10 min demo)"
                    value={demoTopic}
                    onChange={(e) => setDemoTopic(e.target.value)}
                    className="text-xs h-10 bg-background"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Briefly mention what subject or concept you'll demonstrate to the admin moderator.
                  </p>
                </div>

                {/* Booking Summary & Submit Button */}
                <div className="p-5 rounded-2xl bg-secondary/20 border border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                      Selected Appointment
                    </span>
                    {selectedSlot ? (
                      <p className="text-base font-extrabold text-foreground mt-0.5 flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                        <CheckCircle2 className="h-4 w-4" />
                        {selectedSlot.displayTimingStr}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic mt-0.5">
                        Please choose a date and time slot above.
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={handleConfirmBooking}
                    disabled={!selectedSlot || bookingLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 h-11 rounded-xl shadow-md shadow-blue-500/20 shrink-0 gap-2 w-full sm:w-auto"
                  >
                    {bookingLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" /> Booking Slot...
                      </>
                    ) : (
                      <>
                        Confirm Verification Booking <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TutorVerificationBooking;
