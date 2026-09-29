import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { format, parse } from "date-fns";
import {
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  AlertCircle,
  Check,
  X,
  CalendarCheck,
  CalendarX,
  ShieldAlert,
  Loader2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import API_URL from "@/config/api";
import {
  convertTutorSlotsToStudentTime,
  detectUserTimeZone,
  getTimeZoneAbbreviation,
  getTutorUpcomingAvailableDates,
  normalizeLegacyAvailability,
  ConvertedSlot
} from "@/utils/timezone";

interface RescheduleDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any;
  userRole: "Student" | "Tutor" | "Admin";
  userTimezone?: string;
  onSuccess: (updatedBooking: any) => void;
}

export const RescheduleDialog: React.FC<RescheduleDialogProps> = ({
  isOpen,
  onOpenChange,
  booking,
  userRole,
  userTimezone = detectUserTimeZone(),
  onSuccess
}) => {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [tutorData, setTutorData] = useState<any>(null);
  const [tutorBookings, setTutorBookings] = useState<any[]>([]);
  const [loadingTutor, setLoadingTutor] = useState<boolean>(false);
  const [adminOverride, setAdminOverride] = useState<boolean>(false);
  const [adminCustomTime, setAdminCustomTime] = useState<string>("");

  // Minimum allowed date is today
  const minDate = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (isOpen && booking) {
      setSelectedDate("");
      setSelectedSlot("");
      setReason("");
      setAdminOverride(false);
      setAdminCustomTime("");

      const tutorId =
        typeof booking.tutorId === "object" && booking.tutorId !== null
          ? booking.tutorId._id || booking.tutorId.id
          : booking.tutorId;

      if (tutorId && typeof tutorId === "string" && tutorId !== "admin") {
        setLoadingTutor(true);
        Promise.all([
          axios.get(`${API_URL}/tutors/${tutorId}`).catch(() => ({ data: null })),
          axios.get(`${API_URL}/dashboard/tutor/${tutorId}/bookings`).catch(() => ({ data: [] }))
        ])
          .then(([tutorRes, bookingsRes]) => {
            if (tutorRes.data) {
              setTutorData(tutorRes.data);
            }
            if (Array.isArray(bookingsRes.data)) {
              setTutorBookings(bookingsRes.data);
            }
          })
          .finally(() => {
            setLoadingTutor(false);
          });
      }
    }
  }, [isOpen, booking]);

  // Extract tutor available days
  const tutorAvailableDays = useMemo(() => {
    if (!tutorData) return [];
    if (tutorData.availability && tutorData.availability.length > 0) {
      const days = tutorData.availability.map((a: any) => a.day);
      return Array.from(new Set(days));
    }
    if (tutorData.availableTimings && tutorData.availableTimings.length > 0) {
      return ["Everyday"];
    }
    return [];
  }, [tutorData]);

  // Calculate upcoming available dates for quick picking
  const upcomingAvailableDates = useMemo(() => {
    if (!tutorData) return [];
    return getTutorUpcomingAvailableDates(tutorData, userTimezone, new Date(), 21, 4);
  }, [tutorData, userTimezone]);

  // Compute available slots for the selected date
  const { availableSlots, isTutorAvailableOnDate, selectedDayName } = useMemo(() => {
    if (!selectedDate) {
      return { availableSlots: [], isTutorAvailableOnDate: true, selectedDayName: "" };
    }

    const dateParts = selectedDate.split("-").map(Number);
    const dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 12, 0, 0);
    if (isNaN(dateObj.getTime())) {
      return { availableSlots: [], isTutorAvailableOnDate: false, selectedDayName: "" };
    }

    const dayName = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone: userTimezone
    }).format(dateObj);

    if (!tutorData) {
      return { availableSlots: [], isTutorAvailableOnDate: true, selectedDayName: dayName };
    }

    const tutorTz = tutorData.timezone || "Asia/Kolkata";
    let calculatedSlots: ConvertedSlot[] = [];

    if (tutorData.availability && tutorData.availability.length > 0) {
      calculatedSlots = convertTutorSlotsToStudentTime(
        tutorData.availability,
        tutorTz,
        dateObj,
        userTimezone
      );
    } else if (tutorData.availableTimings && tutorData.availableTimings.length > 0) {
      const legacy = normalizeLegacyAvailability(tutorData.availableTimings, dateObj, tutorTz);
      calculatedSlots = convertTutorSlotsToStudentTime(
        legacy,
        tutorTz,
        dateObj,
        userTimezone
      );
    } else {
      // Tutor has not set any explicit hours
      return { availableSlots: [], isTutorAvailableOnDate: true, selectedDayName: dayName };
    }

    // Filter slots at least 3 hours in future
    const minTime = Date.now() + 3 * 60 * 60 * 1000;
    const futureSlots = calculatedSlots.filter(s => s.utcTimeMs >= minTime);

    const hasConfiguredAvailability =
      (tutorData.availability && tutorData.availability.length > 0) ||
      (tutorData.availableTimings && tutorData.availableTimings.length > 0);

    const isAvailable = !hasConfiguredAvailability || calculatedSlots.length > 0;

    return {
      availableSlots: futureSlots,
      isTutorAvailableOnDate: isAvailable,
      selectedDayName: dayName
    };
  }, [selectedDate, tutorData, userTimezone]);

  // Check which slots are already booked by other sessions
  const bookedTimestamps = useMemo(() => {
    const booked = new Set<number>();
    const activeStatuses = ["pending", "pending_payment", "confirmed", "enrolled"];

    tutorBookings.forEach(b => {
      if (b._id === booking?._id) return; // Skip self
      if (!activeStatuses.includes(b.status)) return;

      if (b.utcTiming) {
        booked.add(new Date(b.utcTiming).getTime());
      }
      if (b.sessions && Array.isArray(b.sessions)) {
        b.sessions.forEach((s: any) => {
          if (s.status !== "cancelled" && s.status !== "completed") {
            if (s.utcDate) booked.add(new Date(s.utcDate).getTime());
          }
        });
      }
    });

    return booked;
  }, [tutorBookings, booking]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    if (!selectedDate) {
      toast.error("Please select a date for rescheduling");
      return;
    }

    let finalTime = selectedSlot;
    if (userRole === "Admin" && adminOverride) {
      finalTime = adminCustomTime;
    }

    if (!finalTime) {
      toast.error("Please select an available timing slot");
      return;
    }

    // Format the timing string
    let d: Date;
    if (finalTime.includes(":") && (finalTime.includes("AM") || finalTime.includes("PM"))) {
      const parsedTime = parse(finalTime, "h:mm a", new Date());
      const hours = parsedTime.getHours();
      const mins = parsedTime.getMinutes();
      const dateParts = selectedDate.split("-").map(Number);
      d = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], hours, mins);
    } else if (finalTime.includes(":")) {
      const [h, m] = finalTime.split(":").map(Number);
      const dateParts = selectedDate.split("-").map(Number);
      d = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], h, m);
    } else {
      d = new Date(`${selectedDate} ${finalTime}`);
    }

    if (isNaN(d.getTime())) {
      toast.error("Invalid date or time selected");
      return;
    }

    // Validate 3 hours in future unless admin override
    if (!adminOverride && d.getTime() < Date.now() + 3 * 60 * 60 * 1000) {
      toast.error("You can only reschedule to slots at least 3 hours in the future.");
      return;
    }

    const monthName = d.toLocaleDateString("en-US", { month: "long" });
    const day = d.getDate();
    const year = d.getFullYear();
    const timeStr = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });

    const getOrdinal = (n: number) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    const formattedTiming = `${monthName} ${getOrdinal(day)}, ${year} at ${timeStr}`;
    const utcTiming = d.toISOString();

    setIsSubmitting(true);
    try {
      if (userRole === "Admin") {
        const res = await axios.post(`${API_URL}/tutors/booking/${booking._id}/admin-reschedule`, {
          requestedTiming: formattedTiming,
          requestedUtcTiming: utcTiming,
          reason,
          overrideAvailability: adminOverride
        });
        toast.success("Class rescheduled successfully by Administrator!");
        onSuccess(res.data.booking);
        onOpenChange(false);
      } else {
        const res = await axios.post(`${API_URL}/tutors/booking/${booking._id}/reschedule-request`, {
          requestedTiming: formattedTiming,
          requestedUtcTiming: utcTiming,
          reason,
          requestedBy: userRole
        });
        const target = userRole === "Student" ? "Tutor" : "Student";
        toast.success(`Reschedule request sent! Awaiting ${target}'s confirmation.`);
        onSuccess(res.data.booking);
        onOpenChange(false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit reschedule request");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!booking) return null;

  const allWeekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Reschedule Class Session
          </DialogTitle>
          <DialogDescription>
            {userRole === "Admin"
              ? "Select a new date and available timing slot. This will directly update the schedule and notify all parties."
              : `Select a new date and available timing slot. The ${
                  userRole === "Student" ? "tutor" : "student"
                } will be notified to confirm.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Current Booking Info Card */}
          <div className="p-3.5 bg-secondary/30 rounded-xl border border-border/50 text-xs space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-foreground text-sm">{booking.subject}</span>
              <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                {booking.planType || "Demo Class"}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {userRole === "Student" ? (
                <>
                  Tutor: <strong className="text-foreground">{booking.tutorName}</strong>
                </>
              ) : (
                <>
                  Student: <strong className="text-foreground">{booking.studentName}</strong>
                </>
              )}
            </p>
            <p className="text-muted-foreground flex items-center gap-1.5 font-medium pt-0.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              Current Timing: <span className="text-foreground font-semibold">{booking.timing}</span>
            </p>
          </div>

          {/* Tutor Availability Schedule Info */}
          {loadingTutor ? (
            <div className="flex items-center justify-center p-3 text-xs text-muted-foreground gap-2 bg-muted/40 rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Loading tutor schedule and availability...
            </div>
          ) : tutorData ? (
            <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <CalendarCheck className="h-4 w-4 text-primary" />
                  {booking.tutorName}&apos;s Availability Schedule
                </span>
                <span className="text-[11px] text-muted-foreground font-medium">
                  {tutorData.timezone || "Asia/Kolkata"}
                </span>
              </div>

              {/* Day Badges */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {allWeekdays.map((day) => {
                  const isAvailable = tutorAvailableDays.includes(day) || tutorAvailableDays.includes("Everyday");
                  return (
                    <span
                      key={day}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors ${
                        isAvailable
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-semibold"
                          : "bg-muted/40 text-muted-foreground/60 border-transparent opacity-60 line-through"
                      }`}
                    >
                      {day.slice(0, 3)}
                    </span>
                  );
                })}
              </div>

              {/* Working Hours Info */}
              {tutorData.availability && tutorData.availability.length > 0 && (
                <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                  {tutorData.availability.slice(0, 3).map((a: any, idx: number) => (
                    <span key={idx}>
                      • <strong>{a.day.slice(0, 3)}:</strong> {a.startTime} - {a.endTime}
                    </span>
                  ))}
                  {tutorData.availability.length > 3 && (
                    <span>• +{tutorData.availability.length - 3} more days</span>
                  )}
                </div>
              )}
            </div>
          ) : null}

          {/* Date Picker & Quick Pick Suggestions */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="reschedule-date" className="text-xs font-semibold flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5 text-primary" /> Select New Date
              </Label>
              <span className="text-[10px] text-muted-foreground">
                Local Time ({getTimeZoneAbbreviation(userTimezone)})
              </span>
            </div>

            <Input
              id="reschedule-date"
              type="date"
              min={minDate}
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedSlot("");
              }}
              required
              className="text-sm rounded-lg"
            />

            {/* Quick Pick Upcoming Available Dates */}
            {upcomingAvailableDates.length > 0 && (
              <div className="space-y-1 pt-1">
                <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  Quick Pick Tutor&apos;s Next Available Days:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {upcomingAvailableDates.map((item) => (
                    <button
                      key={item.dateStr}
                      type="button"
                      onClick={() => {
                        setSelectedDate(item.dateStr);
                        setSelectedSlot("");
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                        selectedDate === item.dateStr
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-secondary/50 hover:bg-secondary border-border text-foreground hover:border-primary/40"
                      }`}
                    >
                      {item.displayDate}
                      <span className="ml-1 opacity-75 text-[10px]">({item.slotsCount} slots)</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Time Slot Selection OR Unavailable Alert */}
          {selectedDate && (
            <div className="space-y-2 pt-1">
              {isTutorAvailableOnDate && availableSlots.length > 0 ? (
                <>
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-primary" /> Available Timing Slots on{" "}
                      <span className="text-primary font-bold">{selectedDayName}</span>
                    </Label>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      {availableSlots.length} available
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 rounded-lg border border-border/40 bg-card/50">
                    {availableSlots.map((slot, idx) => {
                      const isBooked = bookedTimestamps.has(slot.utcTimeMs);
                      const isSelected = selectedSlot === slot.studentDisplayTime;

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={isBooked}
                          onClick={() => !isBooked && setSelectedSlot(slot.studentDisplayTime)}
                          className={`relative py-2 px-2 rounded-lg text-xs font-semibold border transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
                            isBooked
                              ? "bg-muted/50 border-border/40 text-muted-foreground/50 cursor-not-allowed opacity-60"
                              : isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/30"
                              : "bg-card hover:bg-primary/10 border-border text-foreground hover:border-primary/40"
                          }`}
                        >
                          <span>{slot.studentDisplayTime}</span>
                          {slot.studentTimeZoneAbbr !== slot.tutorTimeZoneAbbr && (
                            <span
                              className={`text-[9px] ${
                                isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                              }`}
                            >
                              ({slot.tutorDisplayTime} {slot.tutorTimeZoneAbbr})
                            </span>
                          )}
                          {isBooked && (
                            <span className="text-[9px] text-rose-500 font-normal">Booked</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : !isTutorAvailableOnDate || availableSlots.length === 0 ? (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <CalendarX className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-amber-900 dark:text-amber-200">
                        Tutor is not available on {selectedDayName} ({selectedDate})
                      </p>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        {booking.tutorName} does not teach on this day. Please select from their active teaching days:{" "}
                        <strong className="text-foreground">
                          {tutorAvailableDays.length > 0 ? tutorAvailableDays.join(", ") : "Configured slots only"}
                        </strong>
                        .
                      </p>
                    </div>
                  </div>

                  {upcomingAvailableDates.length > 0 && (
                    <div className="pt-1 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-medium text-foreground">Select next available day:</span>
                      {upcomingAvailableDates.slice(0, 3).map((item) => (
                        <Button
                          key={item.dateStr}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDate(item.dateStr);
                            setSelectedSlot("");
                          }}
                          className="h-7 text-[11px] font-semibold bg-background hover:bg-primary/10 border-amber-500/40"
                        >
                          {item.displayDate}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* Admin Override Option */}
          {userRole === "Admin" && (
            <div className="p-3 bg-secondary/30 rounded-xl border border-border/50 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="admin-override" className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                  <ShieldAlert className="h-3.5 w-3.5 text-primary" /> Admin Availability Override
                </Label>
                <input
                  id="admin-override"
                  type="checkbox"
                  checked={adminOverride}
                  onChange={(e) => setAdminOverride(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
              </div>
              {adminOverride && (
                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="admin-custom-time" className="text-[11px] text-muted-foreground">
                    Enter custom time directly (Bypasses tutor schedule restriction):
                  </Label>
                  <Input
                    id="admin-custom-time"
                    type="time"
                    value={adminCustomTime}
                    onChange={(e) => setAdminCustomTime(e.target.value)}
                    required={adminOverride}
                    className="text-xs h-8"
                  />
                </div>
              )}
            </div>
          )}

          {/* Reschedule Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="reschedule-reason" className="text-xs font-semibold">
              Reason for Rescheduling <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Textarea
              id="reschedule-reason"
              placeholder="e.g. Schedule conflict, family emergency, exam preparation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="text-xs resize-none rounded-lg"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !selectedDate ||
                (!selectedSlot && (!adminOverride || !adminCustomTime))
              }
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs min-w-[140px]"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting...
                </span>
              ) : userRole === "Admin" ? (
                "Confirm Reschedule"
              ) : (
                "Request Reschedule"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface DeclineDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any;
  userRole: "Student" | "Tutor";
  onSuccess: (updatedBooking: any) => void;
}

export const DeclineRescheduleDialog: React.FC<DeclineDialogProps> = ({
  isOpen,
  onOpenChange,
  booking,
  userRole,
  onSuccess
}) => {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDecline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    setIsSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/tutors/booking/${booking._id}/reschedule-confirm`, {
        action: "decline",
        declinedReason: reason,
        confirmedBy: userRole
      });
      toast.success("Reschedule request declined. Class remains at original timing.");
      onSuccess(res.data.booking);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to decline reschedule request");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!booking) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-rose-600">
            <X className="h-5 w-5" /> Decline Reschedule Request
          </DialogTitle>
          <DialogDescription>
            The class will remain scheduled at its original timing: <strong>{booking.timing}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleDecline} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="decline-reason" className="text-xs font-semibold">
              Reason for Declining <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Textarea
              id="decline-reason"
              placeholder="e.g. Unavailable at the proposed time, already booked..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="text-xs resize-none rounded-lg"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isSubmitting}
              className="font-semibold text-xs"
            >
              {isSubmitting ? "Declining..." : "Decline Reschedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
