import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Calendar, BookOpen, CreditCard, User, Search, Clock, Save, History, PlayCircle, Star, Video, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageLayout from "@/components/layout/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useSelector, useDispatch } from "react-redux";
import { fetchStudentStats } from "@/redux/slices/dashboardSlice";
import { updateUser } from "@/redux/slices/authSlice";
import { RootState, AppDispatch } from "@/redux/store";
import API_URL from "@/config/api";
import { Badge } from "@/components/ui/badge";
import ChatPanel from "@/components/chat/ChatPanel";
import { toast } from "@/components/ui/sonner";
import { detectUserTimeZone, COMMON_TIMEZONES, formatBookingTime, formatSessionDateTime } from "@/utils/timezone";

const parseTimingStringToDate = (timingStr: string): Date | null => {
  try {
    const parts = timingStr.split(' at ');
    if (parts.length === 2) {
      const datePartCleaned = parts[0].replace(/(\d+)(st|nd|rd|th)/, '$1');
      const timePart = parts[1];
      const combined = `${datePartCleaned} ${timePart}`;
      const parsed = new Date(combined);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error parsing timing string:", e);
  }
  return null;
};

const isBookingPast = (timingStr: string): boolean => {
  const parsed = parseTimingStringToDate(timingStr);
  if (parsed) {
    const bufferMs = 2 * 60 * 60 * 1000; // 2 hours buffer
    return (parsed.getTime() + bufferMs) < Date.now();
  }
  return false;
};

const parseSessionStringToDate = (dateStr: string, timeStr: string): Date | null => {
  try {
    const datePartCleaned = dateStr.replace(/(\d+)(st|nd|rd|th)/, '$1');
    const combined = `${datePartCleaned} ${timeStr}`;
    const parsed = new Date(combined);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  } catch (e) {
    console.error("Error parsing session date/time:", e);
  }
  return null;
};

const isSessionPast = (dateStr: string, timeStr: string): boolean => {
  const parsed = parseSessionStringToDate(dateStr, timeStr);
  if (parsed) {
    const bufferMs = 2 * 60 * 60 * 1000; // 2 hours buffer
    return (parsed.getTime() + bufferMs) < Date.now();
  }
  return false;
};

const capitalizeName = (str: string): string => {
  return str
    .split(' ')
    .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : '')
    .join(' ');
};

const StudentDashboard = () => {
  const { user } = useAuth();
  const initialName = String(user?.user_metadata?.full_name || user?.full_name || "Student");
  
  const dispatch = useDispatch<AppDispatch>();
  const { studentStats, loading: statsLoading } = useSelector((state: RootState) => state.dashboard);

  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  // Tab & Chat State redirects
  const [activeTab, setActiveTab] = useState(() => {
    const saved = sessionStorage.getItem("student_dashboard_tab");
    if (saved) {
      sessionStorage.removeItem("student_dashboard_tab");
      return saved;
    }
    return "upcoming";
  });

  const [activeChatUserId] = useState<string | undefined>(() => {
    const saved = sessionStorage.getItem("active_chat_user_id");
    if (saved) {
      sessionStorage.removeItem("active_chat_user_id");
      return saved;
    }
    return undefined;
  });

  // Profile Form States
  const [profileName, setProfileName] = useState(initialName);
  const [profilePhone, setProfilePhone] = useState(user?.phone || "");
  const [studentTimezone, setStudentTimezone] = useState(
    user?.user_metadata?.timezone || user?.timezone || detectUserTimeZone()
  );
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileName(String(user.user_metadata?.full_name || user.full_name || "Student"));
      setProfilePhone(user.phone || "");
      if (user.timezone) {
        setStudentTimezone(user.timezone);
      } else if (user.user_metadata?.timezone) {
        setStudentTimezone(user.user_metadata.timezone);
      }
    }
  }, [user]);

  const timezonesList = studentTimezone && !COMMON_TIMEZONES.includes(studentTimezone)
    ? [studentTimezone, ...COMMON_TIMEZONES]
    : COMMON_TIMEZONES;

  // Rating States
  const [ratingBookingId, setRatingBookingId] = useState<string | null>(null);
  const [ratingTutorId, setRatingTutorId] = useState<string | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false);
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // Cancellation Reason states
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelReasonType, setCancelReasonType] = useState<string>("");
  const [customCancelReason, setCustomCancelReason] = useState<string>("");
  const [isSubmittingCancellation, setIsSubmittingCancellation] = useState(false);

  const CANCELLATION_REASONS = [
    "Schedule Conflict / Time clash",
    "Found another tutor",
    "Personal emergency / Health reasons",
    "No longer need tutoring for this subject",
    "Other"
  ];

  const handleCancelSubmit = async () => {
    if (!cancellingBookingId) return;
    if (!cancelReasonType) {
      toast.error("Please select a reason for cancellation");
      return;
    }
    const finalReason = cancelReasonType === "Other" ? customCancelReason : cancelReasonType;
    if (cancelReasonType === "Other" && !customCancelReason.trim()) {
      toast.error("Please specify your reason");
      return;
    }
    
    setIsSubmittingCancellation(true);
    try {
      await axios.put(`${API_URL}/tutors/booking/${cancellingBookingId}/status`, { 
        status: 'cancelled',
        cancellationReason: finalReason
      });
      toast.success("Booking cancelled successfully.");
      setBookings(prev => prev.map(b => b._id === cancellingBookingId ? { ...b, status: 'cancelled', cancellationReason: finalReason } : b));
      setIsCancelDialogOpen(false);
      setCancellingBookingId(null);
      setCancelReasonType("");
      setCustomCancelReason("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to cancel booking");
    } finally {
      setIsSubmittingCancellation(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    
    const fetchUnreadCount = async () => {
      if (document.hidden) return; // skip polling when browser tab is inactive/backgrounded
      try {
        const res = await axios.get(`${API_URL}/messages/inbox/${user.id}`);
        const total = res.data.reduce((acc: number, c: any) => acc + (c.unreadCount || 0), 0);
        setUnreadMessagesCount(total);
      } catch (err) {
        console.error("Error fetching unread count", err);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 12000); // Check every 12 seconds
    return () => clearInterval(interval);
  }, [user?.id]);

  useEffect(() => {
    if (activeTab === "messages") {
      setUnreadMessagesCount(0);
    }
  }, [activeTab]);

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchStudentStats(user.id));
      axios.get(`${API_URL}/dashboard/student/${user.id}/bookings`)
        .then(res => setBookings(res.data))
        .catch(err => console.error(err))
        .finally(() => setLoadingBookings(false));
    }
  }, [dispatch, user?.id]);

  const handleBookingAction = async (bookingId: string, status: string) => {
    try {
      await axios.put(`${API_URL}/tutors/booking/${bookingId}/status`, { status });
      toast.success(`Booking ${status} successfully.`);
      setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status } : b));
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update booking");
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setIsUpdatingProfile(true);
    try {
      const response = await axios.put(`${API_URL}/auth/profile/${user.id}`, { 
        full_name: profileName, 
        phone: profilePhone,
        timezone: studentTimezone
      });
      if (response.data && response.data.user) {
        dispatch(updateUser({
          full_name: response.data.user.full_name,
          phone: response.data.user.phone,
          timezone: response.data.user.timezone
        }));
      }
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const submitRating = async () => {
    if (!ratingBookingId || !ratingTutorId || ratingValue === 0) {
      toast.error("Please select a star rating");
      return;
    }
    setIsSubmittingRating(true);
    try {
      await axios.post(`${API_URL}/tutors/${ratingTutorId}/rate`, {
        bookingId: ratingBookingId,
        rating: ratingValue,
        reviewText,
        studentName: profileName
      });
      toast.success("Rating submitted successfully!");
      setBookings(prev => prev.map(b => b._id === ratingBookingId ? { ...b, isRated: true } : b));
      setIsRatingDialogOpen(false);
      setRatingValue(0);
      setReviewText("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit rating");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const enrolledClasses = bookings.filter(b => b.status === 'enrolled');
  const paymentHistory = bookings.filter(b => b.status === 'enrolled' && b.amountPaid);

  return (
    <PageLayout>
      <div className="container py-10 max-w-7xl">
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-foreground tracking-tight">Welcome, {profileName}!</h1>
            <p className="text-lg text-muted-foreground mt-1">Manage your learning journey, classes, and payments.</p>
          </div>
          <Button asChild size="lg" className="shadow-md rounded-full px-8">
            <Link to="/tutors"><Search className="mr-2 h-4 w-4" /> Find a New Tutor</Link>
          </Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          {[
            { icon: Calendar, label: "Upcoming Classes", value: studentStats?.upcomingClasses || 0, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30", tab: "upcoming" },
            { icon: Clock, label: "Demo Bookings", value: studentStats?.demoBookings ?? studentStats?.completedSessions ?? 0, color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/30", tab: "demos" },
            { icon: BookOpen, label: "Enrolled Courses", value: studentStats?.enrolledCourses || 0, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30", tab: "upcoming" },
            { icon: CreditCard, label: "Total Spent", value: `₹${paymentHistory.reduce((acc, curr) => acc + (curr.amountPaid || 0), 0)}`, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30", tab: "payments" },
          ].map((stat, idx) => (
            <Card 
              key={stat.label} 
              onClick={() => setActiveTab(stat.tab)}
              className="border-none shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary hover:bg-secondary/10"
            >
              <CardContent className="flex items-center gap-5 p-6">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${stat.bg}`}>
                  <stat.icon className={`h-7 w-7 ${stat.color}`} />
                </div>
                <div>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16 mb-1" />
                  ) : (
                    <p className="text-3xl font-bold text-foreground tracking-tight">
                      {String(stat.value)}
                    </p>
                  )}
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-secondary/50 p-1 rounded-xl shadow-sm border mb-4 w-full overflow-x-auto whitespace-nowrap justify-start h-auto">
            <TabsTrigger value="upcoming" className="rounded-lg px-6 py-2.5 shrink-0">My Classes</TabsTrigger>
            <TabsTrigger value="demos" className="rounded-lg px-6 py-2.5 shrink-0">Demo Tracker</TabsTrigger>
            <TabsTrigger value="payments" className="rounded-lg px-6 py-2.5 shrink-0">Payment Ledger</TabsTrigger>
            <TabsTrigger value="messages" className="rounded-lg px-6 py-2.5 shrink-0 flex items-center gap-1.5">
              Messages
              {unreadMessagesCount > 0 && (
                <span className="h-5 w-5 bg-rose-500 text-white font-extrabold text-[10px] flex items-center justify-center rounded-full shrink-0 animate-pulse">
                  {unreadMessagesCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="profile" className="rounded-lg px-6 py-2.5 shrink-0">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            <Card className="shadow-md border-border/50">
              <CardHeader className="bg-secondary/20 border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2"><PlayCircle className="h-5 w-5 text-primary" /> Active Enrolled Classes</CardTitle>
                <CardDescription>Your current ongoing classes with tutors.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {loadingBookings ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-20 w-full rounded-xl" />
                    <Skeleton className="h-20 w-full rounded-xl" />
                  </div>
                ) : enrolledClasses.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-secondary/10 rounded-2xl border border-dashed mt-4">
                    <Calendar className="mx-auto mb-4 h-16 w-16 opacity-30 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Active Classes</h3>
                    <p className="max-w-sm mx-auto">You aren't enrolled in any paid classes right now. Find a tutor and book a demo to get started!</p>
                    <Button asChild className="mt-6 rounded-full px-8"><Link to="/tutors">Browse Tutors</Link></Button>
                  </div>
                ) : (
                  <div className="grid gap-6 mt-4 grid-cols-1">
                    {enrolledClasses.map((cls: any) => {
                      const isPack = cls.sessions && cls.sessions.length > 0;
                      const totalSessions = isPack ? cls.sessions.length : 0;
                      const completedSessions = isPack ? cls.sessions.filter((s: any) => s.status === 'completed').length : 0;
                      const percentComplete = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
                      const isExpanded = expandedBookingId === cls._id;

                      if (isPack) {
                        return (
                          <div key={cls._id} className="flex flex-col bg-card hover:border-primary/30 transition-all duration-300 p-6 rounded-2xl border shadow-sm space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                              <div>
                                <h4 className="font-extrabold text-xl text-foreground flex items-center gap-2">
                                  {cls.subject} 
                                  <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none px-3 py-1 text-xs">Monthly Package</Badge>
                                </h4>
                                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1.5"><User className="h-3.5 w-3.5 text-primary"/> Tutor: <span className="font-semibold text-foreground">{cls.tutorName}</span></p>
                              </div>

                              {cls.tutorAddress && (cls.tutorMode?.toLowerCase() === "offline" || cls.tutorMode?.toLowerCase() === "both") && (
                                <div className="p-3.5 border rounded-xl bg-secondary/5 space-y-3">
                                  <div className="flex items-start gap-2">
                                    <MapPin className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-xs font-bold text-foreground">Classroom Location</p>
                                      <p className="text-xs text-muted-foreground mt-0.5">{cls.tutorAddress}</p>
                                    </div>
                                  </div>

                                  <div className="relative w-full h-32 overflow-hidden rounded-lg border bg-secondary/20 shadow-inner">
                                    <iframe
                                      title="Classroom Map Preview"
                                      width="100%"
                                      height="100%"
                                      style={{ border: 0 }}
                                      loading="lazy"
                                      src={`https://maps.google.com/maps?q=${encodeURIComponent(cls.tutorAddress + ", " + (cls.tutorCity || ""))}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                                    />
                                  </div>

                                  {cls.tutorGoogleMapsUrl && (
                                    <a 
                                      href={cls.tutorGoogleMapsUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-xs font-semibold text-rose-500 hover:underline inline-flex items-center gap-1"
                                    >
                                      <MapPin className="h-3 w-3" /> View large map
                                    </a>
                                  )}
                                </div>
                              )}
                              <div className="text-left sm:text-right w-full sm:w-auto">
                                <span className="text-xs font-bold text-muted-foreground block uppercase tracking-wider">Plan Type</span>
                                <span className="font-extrabold text-indigo-500 text-sm sm:text-base">{cls.planType}</span>
                              </div>
                            </div>

                            {/* Progress Indicator */}
                            <div className="space-y-2 bg-secondary/10 p-4 rounded-xl border border-border/40">
                              <div className="flex justify-between items-center text-xs font-semibold">
                                <span className="text-muted-foreground">Course Completion Progress</span>
                                <span className="text-foreground">{completedSessions} of {totalSessions} Classes Completed ({percentComplete}%)</span>
                              </div>
                              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${percentComplete}%` }} />
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 justify-between items-center pt-2">
                              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Clock className="h-4 w-4 text-primary"/> {formatBookingTime(cls, studentTimezone)}</span>
                              
                              <div className="flex gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                                {!cls.isRated && completedSessions === totalSessions && (
                                  <Button size="sm" variant="secondary" className="text-yellow-600 bg-yellow-50 hover:bg-yellow-100" onClick={() => {
                                    setRatingBookingId(cls._id);
                                    setRatingTutorId(cls.tutorId);
                                    setIsRatingDialogOpen(true);
                                  }}>
                                    <Star className="h-4 w-4 mr-1" fill="currentColor"/> Rate Course
                                  </Button>
                                )}
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setExpandedBookingId(isExpanded ? null : cls._id)}
                                  className="font-semibold"
                                >
                                  {isExpanded ? "Hide Course Schedule ▲" : "View Course Schedule ▼"}
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                  <Link to={`/tutors/${cls.tutorId}`}>View Tutor Profile</Link>
                                </Button>
                              </div>
                            </div>

                            {/* Expandable Sessions Timeline */}
                            {isExpanded && (
                              <div className="border border-border/60 rounded-xl overflow-hidden mt-4 animate-in slide-in-from-top duration-300">
                                <div className="bg-secondary/40 border-b p-3">
                                  <h5 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Calendar className="h-4 w-4 text-primary" /> Monthly Class Calendar Schedule</h5>
                                </div>
                                <div className="divide-y divide-border/40">
                                  {cls.sessions.map((session: any, sIdx: number) => {
                                    const formattedSession = session.utcDate 
                                      ? formatSessionDateTime(session.utcDate, studentTimezone) 
                                      : { date: session.date, time: session.time };

                                    return (
                                      <div key={sIdx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-card hover:bg-secondary/5 transition-colors gap-3">
                                        <div className="flex items-center gap-3">
                                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                                            #{sIdx + 1}
                                          </div>
                                          <div>
                                            <p className="font-bold text-sm text-foreground">{formattedSession.date}</p>
                                            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-0.5"><Clock className="h-3 w-3" /> Time: {formattedSession.time}</p>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                          <Badge variant="outline" className={`px-2.5 py-0.5 border-none text-[10px] uppercase font-bold tracking-wider ${
                                            session.status === 'completed' ? 'bg-green-100 text-green-700' :
                                            session.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                            'bg-blue-100 text-blue-700'
                                          }`}>
                                            {session.status}
                                          </Badge>

                                          {session.status === 'scheduled' && !isSessionPast(formattedSession.date, formattedSession.time) && (
                                            <Button
                                              size="sm"
                                              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1 font-semibold text-xs"
                                              asChild
                                            >
                                              <a
                                                href={`${session.meetingLink || `https://meet.jit.si/cuvasol-tutor-class-${cls._id}-session-${sIdx + 1}`}#config.prejoinPageEnabled=false&userInfo.displayName="${encodeURIComponent(profileName)}"&userInfo.email="${encodeURIComponent(user?.email || '')}"`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                              >
                                                <Video className="h-3.5 w-3.5" /> Join Session
                                              </a>
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }

                      // Standard Booking Card
                      return (
                        <div key={cls._id} className="flex flex-col bg-card hover:bg-secondary/10 transition-colors p-5 rounded-xl border shadow-sm">
                          <div className="flex justify-between items-start mb-4">
                             <div>
                               <h4 className="font-bold text-lg text-foreground">{cls.subject}</h4>
                               <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><User className="h-3 w-3"/> Tutor: {cls.tutorName}</p>
                             </div>
                             <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none px-3 py-1">{cls.planType}</Badge>
                          </div>
                          
                          {cls.tutorAddress && (cls.tutorMode?.toLowerCase() === "offline" || cls.tutorMode?.toLowerCase() === "both") && (
                            <div className="mb-4 p-3.5 border rounded-xl bg-secondary/5 space-y-3">
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-xs font-bold text-foreground">Classroom Location</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">{cls.tutorAddress}</p>
                                </div>
                              </div>

                              <div className="relative w-full h-32 overflow-hidden rounded-lg border bg-secondary/20 shadow-inner">
                                <iframe
                                  title="Classroom Map Preview"
                                  width="100%"
                                  height="100%"
                                  style={{ border: 0 }}
                                  loading="lazy"
                                  src={`https://maps.google.com/maps?q=${encodeURIComponent(cls.tutorAddress + ", " + (cls.tutorCity || ""))}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                                />
                              </div>

                              {cls.tutorGoogleMapsUrl && (
                                <a 
                                  href={cls.tutorGoogleMapsUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs font-semibold text-rose-500 hover:underline inline-flex items-center gap-1"
                                >
                                  <MapPin className="h-3 w-3" /> View large map
                                </a>
                              )}
                            </div>
                          )}
                          
                          <div className="mt-auto pt-4 border-t flex justify-between items-center">
                             <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                               <Clock className="h-4 w-4"/> {formatBookingTime(cls, studentTimezone)}
                               {(cls.utcTiming ? new Date(cls.utcTiming).getTime() + 2 * 3600 * 1000 < Date.now() : isBookingPast(cls.timing)) && (
                                 <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none ml-2">Past Class</Badge>
                               )}
                             </span>
                             <div className="flex gap-2">
                               {!cls.isRated && (
                                 <Button size="sm" variant="secondary" className="text-yellow-600 bg-yellow-50 hover:bg-yellow-100" onClick={() => {
                                   setRatingBookingId(cls._id);
                                   setRatingTutorId(cls.tutorId);
                                   setIsRatingDialogOpen(true);
                                  }}>
                                    <Star className="h-4 w-4 mr-1" fill="currentColor"/> Rate
                                  </Button>
                                )}
                               {!(cls.utcTiming ? new Date(cls.utcTiming).getTime() + 2 * 3600 * 1000 < Date.now() : isBookingPast(cls.timing)) && (
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-1 animate-pulse"
                                  asChild
                                >
                                  <a
                                    href={`${cls.meetingLink || `https://meet.jit.si/cuvasol-tutor-class-${cls._id}`}#config.prejoinPageEnabled=false&userInfo.displayName="${encodeURIComponent(profileName)}"&userInfo.email="${encodeURIComponent(user?.email || '')}"`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Video className="h-4 w-4" /> Join Class
                                  </a>
                                </Button>
                               )}
                               <Button variant="outline" size="sm" asChild>
                                 <Link to={`/tutors/${cls.tutorId}`}>View Tutor</Link>
                               </Button>
                             </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="demos">
            <Card className="shadow-md border-border/50">
              <CardHeader className="bg-secondary/20 border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2"><Clock className="h-5 w-5 text-indigo-500" /> Demo Bookings Tracker</CardTitle>
                <CardDescription>Track the status of your free demo sessions.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {loadingBookings ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-20 w-full rounded-xl" />
                  </div>
                ) : bookings.filter(b => b.status !== 'enrolled').length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-secondary/10 rounded-2xl border border-dashed mt-4">
                    <Clock className="mx-auto mb-4 h-16 w-16 opacity-30 text-indigo-500" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Demos Booked</h3>
                    <p>You haven't booked any demo sessions yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4 mt-4">
                    {bookings.filter(b => b.status !== 'enrolled').map((booking: any) => (
                      <div key={booking._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card p-5 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
                        <div className="mb-4 sm:mb-0">
                          <p className="font-bold text-lg text-foreground flex items-center gap-2">
                             <User className="h-5 w-5 text-primary"/> {booking.tutorName}
                          </p>
                          {booking.subject && <p className="text-sm font-medium text-primary mt-1 px-2 py-0.5 bg-primary/10 rounded-md inline-block">{booking.subject}</p>}
                          <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                            <Calendar className="h-4 w-4"/> {formatBookingTime(booking, studentTimezone)}
                            {['confirmed', 'pending'].includes(booking.status) && (booking.utcTiming ? new Date(booking.utcTiming).getTime() + 2 * 3600 * 1000 < Date.now() : isBookingPast(booking.timing)) && (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none ml-2">Past Demo</Badge>
                            )}
                          </p>
                          
                          {booking.tutorAddress && (booking.tutorMode?.toLowerCase() === "offline" || booking.tutorMode?.toLowerCase() === "both") && (
                             <div className="mt-3 p-3 border rounded-xl bg-secondary/5 space-y-2 w-full max-w-md">
                               <div className="flex items-center gap-1.5">
                                 <MapPin className="h-3.5 w-3.5 text-rose-500" />
                                 <span className="text-xs font-semibold text-foreground">Location: {booking.tutorAddress}</span>
                               </div>
                               <div className="relative w-full h-32 overflow-hidden rounded-lg border bg-secondary/20 shadow-inner">
                                 <iframe
                                   title="Demo Map Preview"
                                   width="100%"
                                   height="100%"
                                   style={{ border: 0 }}
                                   loading="lazy"
                                   src={`https://maps.google.com/maps?q=${encodeURIComponent(booking.tutorAddress + ", " + (booking.tutorCity || ""))}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                                 />
                               </div>
                               {booking.tutorGoogleMapsUrl && (
                                 <a 
                                   href={booking.tutorGoogleMapsUrl} 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   className="text-[11px] font-semibold text-rose-500 hover:underline inline-flex items-center gap-1"
                                 >
                                   <MapPin className="h-3 w-3" /> View large map
                                 </a>
                               )}
                             </div>
                           )}
                        </div>
                        <div className="flex flex-col items-start sm:items-end gap-3 w-full sm:w-auto">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-medium">STATUS:</span>
                            <Badge variant="outline" className={`px-3 py-1 border-none ${
                               booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                               booking.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                               booking.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                               'bg-red-100 text-red-700'
                             }`}>
                               {booking.status.toUpperCase()}
                             </Badge>
                          </div>
                          
                          <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                            {(booking.status === 'confirmed' || booking.status === 'pending') && (
                               <>
                                 {booking.status === 'confirmed' && !(booking.utcTiming ? new Date(booking.utcTiming).getTime() + 2 * 3600 * 1000 < Date.now() : isBookingPast(booking.timing)) && (
                                   <Button
                                     size="sm"
                                     className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-1 animate-pulse"
                                     asChild
                                   >
                                     <a
                                       href={`${booking.meetingLink || `https://meet.jit.si/cuvasol-tutor-demo-${booking._id}`}#config.prejoinPageEnabled=false&userInfo.displayName="${encodeURIComponent(profileName)}"&userInfo.email="${encodeURIComponent(user?.email || '')}"`}
                                       target="_blank"
                                       rel="noopener noreferrer"
                                     >
                                       <Video className="h-4 w-4" /> Join Demo Room
                                     </a>
                                   </Button>
                                 )}
                                 {!(booking.utcTiming ? new Date(booking.utcTiming).getTime() + 2 * 3600 * 1000 < Date.now() : isBookingPast(booking.timing)) && (
                                   <Button size="sm" variant="outline" className="w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={() => {
                                      setCancellingBookingId(booking._id);
                                      setIsCancelDialogOpen(true);
                                    }}>Cancel Demo</Button>
                                 )}
                               </>
                            )}
                            {booking.status === 'completed' && (
                                <>
                                  {!booking.isRated && (
                                     <Button size="sm" variant="secondary" className="w-full sm:w-auto text-yellow-600 bg-yellow-50 hover:bg-yellow-100" onClick={() => {
                                       setRatingBookingId(booking._id);
                                       setRatingTutorId(booking.tutorId);
                                       setIsRatingDialogOpen(true);
                                     }}>
                                       <Star className="h-4 w-4 mr-1" fill="currentColor"/> Rate
                                     </Button>
                                  )}
                                  <Button asChild size="sm" className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md">
                                    <Link to={`/tutors/${booking.tutorId}`}>Enroll & Pay</Link>
                                  </Button>
                                </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card className="shadow-md border-border/50">
              <CardHeader className="bg-secondary/20 border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2"><History className="h-5 w-5 text-emerald-500" /> Payment Ledger</CardTitle>
                <CardDescription>A record of all your enrolled class payments.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {loadingBookings ? (
                   <div className="py-4"><Skeleton className="h-32 w-full rounded-xl" /></div>
                ) : paymentHistory.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-secondary/10 rounded-2xl border border-dashed mt-4">
                    <CreditCard className="mx-auto mb-4 h-16 w-16 opacity-30 text-emerald-500" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Payments Found</h3>
                    <p>Your payment history is currently empty.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto mt-4 rounded-xl border">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground bg-secondary/50 uppercase border-b">
                        <tr>
                          <th className="px-6 py-4 font-medium">Date</th>
                          <th className="px-6 py-4 font-medium">Tutor / Subject</th>
                          <th className="px-6 py-4 font-medium">Plan Type</th>
                          <th className="px-6 py-4 font-medium text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentHistory.map((payment: any) => (
                          <tr key={payment._id} className="bg-card border-b last:border-0 hover:bg-secondary/20 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground">
                              {new Date(payment.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-foreground">{payment.tutorName}</div>
                              <div className="text-muted-foreground text-xs">{payment.subject}</div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant="secondary" className="bg-primary/10 text-primary">{payment.planType}</Badge>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-emerald-600">
                              ₹{payment.amountPaid}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="messages">
            <ChatPanel initialActiveUserId={activeChatUserId} />
          </TabsContent>

          <TabsContent value="profile">
            <Card className="shadow-md border-border/50 max-w-2xl">
              <CardHeader className="bg-secondary/20 border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2"><User className="h-5 w-5 text-blue-500" /> Profile Settings</CardTitle>
                <CardDescription>Update your personal information.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-semibold">Full Name</Label>
                    <Input id="name" value={profileName} onChange={(e) => setProfileName(capitalizeName(e.target.value.replace(/[^a-zA-Z\s'-]/g, '')))} className="bg-secondary/20 border-border/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold">Email Address <span className="text-xs font-normal text-muted-foreground">(Cannot be changed)</span></Label>
                    <Input id="email" value={String(user?.email || "")} disabled className="bg-secondary/50 opacity-70" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-semibold">Phone Number</Label>
                    <Input id="phone" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value.replace(/[^0-9+\s-]/g, ''))} placeholder="+1 234 567 890" className="bg-secondary/20 border-border/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone" className="text-sm font-semibold">Time Zone</Label>
                    <Select value={studentTimezone} onValueChange={setStudentTimezone}>
                      <SelectTrigger id="timezone" className="bg-secondary/20 border-border/50">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {timezonesList.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" disabled={isUpdatingProfile} className="w-full sm:w-auto shadow-md rounded-full px-8">
                    {isUpdatingProfile ? "Saving..." : <><Save className="mr-2 h-4 w-4"/> Save Changes</>}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Rating Dialog */}
      <Dialog open={isRatingDialogOpen} onOpenChange={setIsRatingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rate Your Tutor</DialogTitle>
            <DialogDescription>
              How was your class? Please leave a rating and optional review.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center space-y-4 py-4">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatingValue(star)}
                  className={`p-1 transition-all ${ratingValue >= star ? 'text-yellow-500 scale-110' : 'text-muted-foreground/30 hover:text-yellow-200'}`}
                >
                  <Star className="h-8 w-8" fill={ratingValue >= star ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
            <div className="w-full">
              <Label htmlFor="review" className="text-xs text-muted-foreground mb-2 block">Written Review (Optional)</Label>
              <Textarea
                id="review"
                placeholder="Share your experience..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="resize-none bg-secondary/10"
                rows={3}
              />
            </div>
            <Button onClick={submitRating} disabled={isSubmittingRating} className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold">
              {isSubmittingRating ? "Submitting..." : "Submit Rating"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancellation Reason Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Demo Session</DialogTitle>
            <DialogDescription>
              Please let us and the tutor know why you are cancelling this demo class.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Select Reason</Label>
              <Select value={cancelReasonType} onValueChange={setCancelReasonType}>
                <SelectTrigger className="w-full bg-secondary/10">
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {CANCELLATION_REASONS.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {cancelReasonType === "Other" && (
              <div className="w-full space-y-2 animate-in fade-in duration-200">
                <Label htmlFor="customCancelReason" className="text-xs text-muted-foreground">Specify Reason</Label>
                <Textarea
                  id="customCancelReason"
                  placeholder="Tell the tutor why you are cancelling..."
                  value={customCancelReason}
                  onChange={(e) => setCustomCancelReason(e.target.value)}
                  className="resize-none bg-secondary/10"
                  rows={3}
                />
              </div>
            )}

            <div className="flex gap-3 justify-end mt-4">
              <Button variant="outline" onClick={() => {
                setIsCancelDialogOpen(false);
                setCancellingBookingId(null);
                setCancelReasonType("");
                setCustomCancelReason("");
              }}>
                Cancel
              </Button>
              <Button onClick={handleCancelSubmit} disabled={isSubmittingCancellation} className="bg-destructive hover:bg-destructive/90 text-white font-semibold">
                {isSubmittingCancellation ? "Submitting..." : "Confirm Cancellation"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default StudentDashboard;
