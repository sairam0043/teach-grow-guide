import React, { useEffect, useState } from "react";
import axios from "axios";
import API_URL from "@/config/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Calendar, 
  Clock, 
  Video, 
  Plus, 
  Trash2, 
  Save, 
  ExternalLink, 
  Copy, 
  CheckCircle, 
  AlertCircle, 
  Sparkles, 
  Globe, 
  Users, 
  ShieldCheck,
  RefreshCw
} from "lucide-react";
import { COMMON_TIMEZONES } from "@/utils/timezone";

interface TimeSlot {
  _id?: string;
  startTime: string;
  endTime: string;
  label?: string;
}

interface DaySchedule {
  _id?: string;
  day: string;
  isEnabled: boolean;
  timeSlots: TimeSlot[];
}

interface AdminAvailabilityData {
  _id?: string;
  googleMeetLink: string;
  timezone: string;
  slotDurationMinutes: number;
  bufferMinutes: number;
  daysAhead: number;
  instructions: string;
  weeklySchedule: DaySchedule[];
  isActive: boolean;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface AdminAvailabilityManagerProps {
  onRefreshBookings?: () => void;
  verificationDemos?: any[];
  onCompleteBooking?: (booking: any) => void;
}

export const AdminAvailabilityManager: React.FC<AdminAvailabilityManagerProps> = ({
  onRefreshBookings,
  verificationDemos = [],
  onCompleteBooking
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availability, setAvailability] = useState<AdminAvailabilityData>({
    googleMeetLink: "",
    timezone: "Asia/Kolkata",
    slotDurationMinutes: 30,
    bufferMinutes: 0,
    daysAhead: 14,
    instructions: "Please join the Google Meet session on time with your degree certificates and a valid photo ID ready for verification.",
    weeklySchedule: DAYS_OF_WEEK.map(day => ({
      day,
      isEnabled: day !== 'Sunday',
      timeSlots: day === 'Saturday' 
        ? [{ startTime: "10:00", endTime: "13:00", label: "Morning Session" }]
        : day === 'Sunday'
          ? []
          : [
              { startTime: "10:00", endTime: "13:00", label: "Morning Session" },
              { startTime: "14:00", endTime: "17:00", label: "Afternoon Session" }
            ]
    })),
    isActive: true
  });

  const [copiedLink, setCopiedLink] = useState(false);

  // Fetch admin availability from DB
  const fetchAvailability = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/dashboard/admin/availability`);
      if (res.data?.availability) {
        const fetched = res.data.availability;
        // Merge with all 7 days to guarantee every day exists
        const mergedSchedule = DAYS_OF_WEEK.map(dayName => {
          const existing = fetched.weeklySchedule?.find((s: any) => s.day === dayName);
          if (existing) {
            return {
              day: dayName,
              isEnabled: existing.isEnabled ?? true,
              timeSlots: existing.timeSlots && existing.timeSlots.length > 0 
                ? existing.timeSlots 
                : [{ startTime: "10:00", endTime: "13:00", label: "Morning Session" }]
            };
          }
          return {
            day: dayName,
            isEnabled: dayName !== 'Sunday',
            timeSlots: [{ startTime: "10:00", endTime: "13:00", label: "Morning Session" }]
          };
        });

        setAvailability({
          ...fetched,
          weeklySchedule: mergedSchedule
        });
      }
    } catch (err: any) {
      console.error("Failed to load admin availability:", err);
      toast.error(err.response?.data?.message || "Failed to load admin availability settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, []);

  // Save changes to database
  const handleSave = async () => {
    try {
      setSaving(true);

      // Validate Google Meet Link format if entered
      let cleanMeet = availability.googleMeetLink.trim();
      if (cleanMeet && !cleanMeet.toLowerCase().includes("meet.google.com")) {
        toast.warning("Warning: Recommended Google Meet link format is 'https://meet.google.com/xxx-yyyy-zzz'");
      }

      const res = await axios.put(`${API_URL}/dashboard/admin/availability`, {
        ...availability,
        googleMeetLink: cleanMeet
      });

      if (res.data?.success) {
        toast.success("Admin availability & Google Meet link saved successfully to database!");
        if (res.data.availability) {
          setAvailability(prev => ({ ...prev, ...res.data.availability }));
        }
      }
    } catch (err: any) {
      console.error("Failed to save availability:", err);
      toast.error(err.response?.data?.message || "Failed to save availability settings");
    } finally {
      setSaving(false);
    }
  };

  // Toggle day active state
  const handleToggleDay = (dayIndex: number, enabled: boolean) => {
    setAvailability(prev => {
      const updated = [...prev.weeklySchedule];
      updated[dayIndex] = {
        ...updated[dayIndex],
        isEnabled: enabled,
        timeSlots: enabled && updated[dayIndex].timeSlots.length === 0
          ? [{ startTime: "10:00", endTime: "13:00", label: "Morning Session" }]
          : updated[dayIndex].timeSlots
      };
      return { ...prev, weeklySchedule: updated };
    });
  };

  // Add time slot to a day
  const handleAddTimeSlot = (dayIndex: number) => {
    setAvailability(prev => {
      const updated = [...prev.weeklySchedule];
      const slots = [...updated[dayIndex].timeSlots];
      // Default to 14:00 - 17:00 if one already exists, else 10:00 - 13:00
      const newSlot = slots.length > 0 
        ? { startTime: "14:00", endTime: "17:00", label: "Afternoon Session" }
        : { startTime: "10:00", endTime: "13:00", label: "Morning Session" };
      
      updated[dayIndex] = {
        ...updated[dayIndex],
        timeSlots: [...slots, newSlot]
      };
      return { ...prev, weeklySchedule: updated };
    });
  };

  // Update time slot
  const handleUpdateSlot = (dayIndex: number, slotIndex: number, field: keyof TimeSlot, value: string) => {
    setAvailability(prev => {
      const updated = [...prev.weeklySchedule];
      const slots = [...updated[dayIndex].timeSlots];
      slots[slotIndex] = {
        ...slots[slotIndex],
        [field]: value
      };
      updated[dayIndex] = {
        ...updated[dayIndex],
        timeSlots: slots
      };
      return { ...prev, weeklySchedule: updated };
    });
  };

  // Remove time slot
  const handleRemoveSlot = (dayIndex: number, slotIndex: number) => {
    setAvailability(prev => {
      const updated = [...prev.weeklySchedule];
      const slots = updated[dayIndex].timeSlots.filter((_, idx) => idx !== slotIndex);
      updated[dayIndex] = {
        ...updated[dayIndex],
        timeSlots: slots
      };
      return { ...prev, weeklySchedule: updated };
    });
  };

  // Quick preset handlers
  const applyWeekdaysPreset = () => {
    setAvailability(prev => ({
      ...prev,
      weeklySchedule: DAYS_OF_WEEK.map(day => ({
        day,
        isEnabled: !['Saturday', 'Sunday'].includes(day),
        timeSlots: !['Saturday', 'Sunday'].includes(day)
          ? [
              { startTime: "10:00", endTime: "13:00", label: "Morning" },
              { startTime: "14:00", endTime: "17:00", label: "Afternoon" }
            ]
          : []
      }))
    }));
    toast.info("Applied Weekdays 10 AM - 5 PM preset");
  };

  const applyFullWeekPreset = () => {
    setAvailability(prev => ({
      ...prev,
      weeklySchedule: DAYS_OF_WEEK.map(day => ({
        day,
        isEnabled: day !== 'Sunday',
        timeSlots: [{ startTime: "10:00", endTime: "14:00", label: "General Verification" }]
      }))
    }));
    toast.info("Applied Mon-Sat 10 AM - 2 PM preset");
  };

  const copyMeetLink = () => {
    if (!availability.googleMeetLink) {
      toast.error("No Google Meet link configured yet");
      return;
    }
    navigator.clipboard.writeText(availability.googleMeetLink);
    setCopiedLink(true);
    toast.success("Google Meet link copied to clipboard");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-6 py-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  const isMeetValid = availability.googleMeetLink && availability.googleMeetLink.includes("meet.google.com");

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header Card with Quick Save */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 rounded-2xl border border-blue-500/20 shadow-sm backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-blue-600 text-white shadow-sm">
              <Calendar className="h-5 w-5" />
            </span>
            <h2 className="text-2xl font-extrabold text-foreground tracking-tight">Admin Availability & Verification Slots</h2>
          </div>
          <p className="text-sm text-muted-foreground ml-11">
            Configure your working days, daily verification time windows, and Google Meet room for tutor profile interviews.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchAvailability}
            className="gap-1.5 font-semibold"
          >
            <RefreshCw className="h-4 w-4" /> Reset
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-md shadow-blue-500/20 gap-2"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save Availability
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Google Meet Link & General Configuration (1 col) */}
        <div className="space-y-6 lg:col-span-1">
          {/* Google Meet Link Card */}
          <Card className="border-border/60 shadow-md bg-card overflow-hidden">
            <CardHeader className="bg-gradient-to-br from-blue-500/15 via-blue-500/5 to-transparent border-b pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Video className="h-5 w-5 text-blue-600" /> Google Meet Link
                </CardTitle>
                {isMeetValid ? (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Valid Link
                  </Badge>
                ) : availability.googleMeetLink ? (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-bold flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Custom URL
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-slate-100 text-slate-700 dark:bg-slate-800 text-[10px]">
                    Not Configured
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs">
                Permanent Google Meet room used for all tutor verification demo calls.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="adminGoogleMeet" className="text-xs font-bold text-foreground">
                  Meeting URL
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="adminGoogleMeet"
                    type="url"
                    placeholder="https://meet.google.com/xxx-yyyy-zzz"
                    value={availability.googleMeetLink}
                    onChange={(e) => setAvailability(prev => ({ ...prev, googleMeetLink: e.target.value }))}
                    className="font-mono text-xs h-10 bg-background"
                  />
                  {availability.googleMeetLink && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={copyMeetLink}
                      className="shrink-0 h-10 w-10"
                      title="Copy Link"
                    >
                      {copiedLink ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Create a recurring Google Meet room in your Google Calendar and paste the meeting link here.
                </p>
              </div>

              {availability.googleMeetLink && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full bg-blue-50/50 hover:bg-blue-100/50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/40 dark:text-blue-300 font-semibold text-xs gap-1.5"
                    asChild
                  >
                    <a
                      href={availability.googleMeetLink.startsWith('http') ? availability.googleMeetLink : `https://${availability.googleMeetLink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Test Meeting Link
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Verification Settings Card */}
          <Card className="border-border/60 shadow-md bg-card">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Globe className="h-5 w-5 text-indigo-600" /> Slot Settings
              </CardTitle>
              <CardDescription className="text-xs">
                Timezone, verification session duration, and booking parameters.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Timezone */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Admin Timezone</Label>
                <Select
                  value={availability.timezone}
                  onValueChange={(val) => setAvailability(prev => ({ ...prev, timezone: val }))}
                >
                  <SelectTrigger className="h-10 text-xs bg-background">
                    <SelectValue placeholder="Select Timezone" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {COMMON_TIMEZONES.map(tz => (
                      <SelectItem key={tz.value} value={tz.value} className="text-xs">
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Slot Duration */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Verification Session Duration</Label>
                <Select
                  value={String(availability.slotDurationMinutes)}
                  onValueChange={(val) => setAvailability(prev => ({ ...prev, slotDurationMinutes: Number(val) }))}
                >
                  <SelectTrigger className="h-10 text-xs bg-background">
                    <SelectValue placeholder="Select Duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15" className="text-xs">15 Minutes (Express)</SelectItem>
                    <SelectItem value="30" className="text-xs">30 Minutes (Recommended)</SelectItem>
                    <SelectItem value="45" className="text-xs">45 Minutes</SelectItem>
                    <SelectItem value="60" className="text-xs">60 Minutes (Comprehensive)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Booking Horizon */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Booking Horizon</Label>
                <Select
                  value={String(availability.daysAhead)}
                  onValueChange={(val) => setAvailability(prev => ({ ...prev, daysAhead: Number(val) }))}
                >
                  <SelectTrigger className="h-10 text-xs bg-background">
                    <SelectValue placeholder="Days ahead" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7" className="text-xs">Next 7 Days</SelectItem>
                    <SelectItem value="14" className="text-xs">Next 14 Days (Recommended)</SelectItem>
                    <SelectItem value="21" className="text-xs">Next 21 Days</SelectItem>
                    <SelectItem value="30" className="text-xs">Next 30 Days</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  How many days in advance tutors are permitted to schedule.
                </p>
              </div>

              {/* Instructions for tutors */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-bold text-foreground">Instructions for Tutors</Label>
                <Textarea
                  rows={3}
                  value={availability.instructions}
                  onChange={(e) => setAvailability(prev => ({ ...prev, instructions: e.target.value }))}
                  placeholder="e.g. Please join on time with your certificates ready..."
                  className="text-xs bg-background leading-relaxed"
                />
                <p className="text-[11px] text-muted-foreground">
                  Shown to tutors on their verification booking screen and in confirmation emails.
                </p>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border bg-secondary/10 mt-2">
                <div>
                  <p className="text-xs font-bold text-foreground">Accepting Verification Bookings</p>
                  <p className="text-[11px] text-muted-foreground">Allow tutors to book new verification slots</p>
                </div>
                <Switch
                  checked={availability.isActive}
                  onCheckedChange={(checked) => setAvailability(prev => ({ ...prev, isActive: checked }))}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Weekly Schedule & Availability Timings (2 cols) */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-border/60 shadow-md bg-card">
            <CardHeader className="border-b pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" /> Weekly Availability Schedule
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Define the daily time windows when you are available for tutor verification calls.
                  </CardDescription>
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={applyWeekdaysPreset}
                    className="text-xs h-8 font-semibold bg-secondary/30 hover:bg-secondary/60"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-blue-500 mr-1" /> Mon - Fri (10-5)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={applyFullWeekPreset}
                    className="text-xs h-8 font-semibold bg-secondary/30 hover:bg-secondary/60"
                  >
                    Mon - Sat (10-2)
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {availability.weeklySchedule.map((daySchedule, dayIndex) => {
                return (
                  <div 
                    key={daySchedule.day} 
                    className={`p-4 rounded-xl border transition-all ${
                      daySchedule.isEnabled 
                        ? "bg-card border-border/80 shadow-xs" 
                        : "bg-secondary/15 border-dashed border-border/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <Switch
                          id={`switch-${daySchedule.day}`}
                          checked={daySchedule.isEnabled}
                          onCheckedChange={(checked) => handleToggleDay(dayIndex, checked)}
                        />
                        <Label 
                          htmlFor={`switch-${daySchedule.day}`} 
                          className="font-bold text-sm cursor-pointer text-foreground flex items-center gap-2"
                        >
                          {daySchedule.day}
                          {daySchedule.isEnabled && (
                            <Badge variant="outline" className="text-[10px] py-0 px-2 font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                              {daySchedule.timeSlots.length} {daySchedule.timeSlots.length === 1 ? 'window' : 'windows'}
                            </Badge>
                          )}
                        </Label>
                      </div>

                      {daySchedule.isEnabled && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddTimeSlot(dayIndex)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20 text-xs font-bold h-8 px-2.5"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" /> Add Timing Window
                        </Button>
                      )}
                    </div>

                    {daySchedule.isEnabled && (
                      <div className="space-y-2.5 pl-0 sm:pl-11 mt-2">
                        {daySchedule.timeSlots.map((slot, slotIndex) => (
                          <div 
                            key={slotIndex} 
                            className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 p-2.5 rounded-lg bg-secondary/20 border border-border/50"
                          >
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 w-10">
                                From:
                              </span>
                              <Input
                                type="time"
                                value={slot.startTime}
                                onChange={(e) => handleUpdateSlot(dayIndex, slotIndex, "startTime", e.target.value)}
                                className="h-9 w-32 font-mono text-xs bg-background"
                              />
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 w-8">
                                To:
                              </span>
                              <Input
                                type="time"
                                value={slot.endTime}
                                onChange={(e) => handleUpdateSlot(dayIndex, slotIndex, "endTime", e.target.value)}
                                className="h-9 w-32 font-mono text-xs bg-background"
                              />
                            </div>

                            <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
                              <Input
                                type="text"
                                placeholder="Label (e.g. Morning, Evening)"
                                value={slot.label || ""}
                                onChange={(e) => handleUpdateSlot(dayIndex, slotIndex, "label", e.target.value)}
                                className="h-9 text-xs bg-background flex-1"
                              />
                              {daySchedule.timeSlots.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveSlot(dayIndex, slotIndex)}
                                  className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 shrink-0 h-9 w-9"
                                  title="Remove Window"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Bottom Save Action Bar */}
          <div className="flex items-center justify-between p-5 bg-card border rounded-2xl shadow-sm">
            <div>
              <p className="text-sm font-bold text-foreground">Save Your Availability Schedule</p>
              <p className="text-xs text-muted-foreground">Changes take effect immediately for all tutors booking verification slots.</p>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 shadow-sm gap-2"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAvailabilityManager;
