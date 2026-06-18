import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Calendar, Users, Clock, DollarSign, BookOpen, AlertCircle, Save, CheckCircle, PlusCircle, Check, Video, Sparkles, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageLayout from "@/components/layout/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useSelector, useDispatch } from "react-redux";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { fetchTutorStats, updateTutorAvailability } from "@/redux/slices/dashboardSlice";
import { updateUser } from "@/redux/slices/authSlice";
import { RootState, AppDispatch } from "@/redux/store";
import { toast } from "@/components/ui/sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import API_URL from "@/config/api";
import { Textarea } from "@/components/ui/textarea";
import { resolveAssetUrl } from "@/lib/assetUrl";
import ChatPanel from "@/components/chat/ChatPanel";
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
    .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1) : '')
    .join(' ');
};

const TutorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const name = String(user?.user_metadata?.full_name || "Tutor");
  
  const dispatch = useDispatch<AppDispatch>();
  const { tutorStats, loading: statsLoading } = useSelector((state: RootState) => state.dashboard);
  
  const [tutorProfile, setTutorProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);

  const initialName = String(user?.user_metadata?.full_name || user?.full_name || "Tutor");
  const [profileName, setProfileName] = useState(initialName);
  const [profilePhone, setProfilePhone] = useState(user?.phone || "");

  const [tutorTimezone, setTutorTimezone] = useState(() => {
    return user?.user_metadata?.timezone || user?.timezone || detectUserTimeZone();
  });

  useEffect(() => {
    if (user) {
      setProfileName(String(user.user_metadata?.full_name || user.full_name || "Tutor"));
      setProfilePhone(user.phone || "");
      if (user.timezone) {
        setTutorTimezone(user.timezone);
      } else if (user.user_metadata?.timezone) {
        setTutorTimezone(user.user_metadata.timezone);
      }
    }
  }, [user]);

  const timezonesList = tutorTimezone && !COMMON_TIMEZONES.includes(tutorTimezone)
    ? [tutorTimezone, ...COMMON_TIMEZONES]
    : COMMON_TIMEZONES;

  // Tab redirects
  const [activeTab, setActiveTab] = useState(() => {
    const saved = sessionStorage.getItem("tutor_dashboard_tab");
    if (saved) {
      sessionStorage.removeItem("tutor_dashboard_tab");
      return saved;
    }
    return "demos";
  });
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // Rejection Reason states
  const [rejectingBookingId, setRejectingBookingId] = useState<string | null>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReasonType, setRejectReasonType] = useState<string>("");
  const [customRejectReason, setCustomRejectReason] = useState<string>("");
  const [isSubmittingRejection, setIsSubmittingRejection] = useState(false);

  const REJECTION_REASONS = [
    "Schedule Conflict / Slot unavailable",
    "Subject / Skill level mismatch",
    "Personal emergency / Time off",
    "Technical / Internet issue",
    "Other"
  ];

  const handleRejectSubmit = async () => {
    if (!rejectingBookingId) return;
    if (!rejectReasonType) {
      toast.error("Please select a reason for rejection");
      return;
    }
    const finalReason = rejectReasonType === "Other" ? customRejectReason : rejectReasonType;
    if (rejectReasonType === "Other" && !customRejectReason.trim()) {
      toast.error("Please specify your reason");
      return;
    }
    
    setIsSubmittingRejection(true);
    try {
      await axios.put(`${API_URL}/tutors/booking/${rejectingBookingId}/status`, { 
        status: 'rejected',
        cancellationReason: finalReason
      });
      toast.success("Booking rejected successfully.");
      setBookings(prev => prev.map(b => b._id === rejectingBookingId ? { ...b, status: 'rejected', cancellationReason: finalReason } : b));
      setIsRejectDialogOpen(false);
      setRejectingBookingId(null);
      setRejectReasonType("");
      setCustomRejectReason("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reject booking");
    } finally {
      setIsSubmittingRejection(false);
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

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const [availability, setAvailability] = useState<{ day: string; selected: boolean; slots: { startTime: string; endTime: string }[] }[]>(
    DAYS.map(day => ({ day, selected: false, slots: [{ startTime: '09:00', endTime: '17:00' }] }))
  );
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);

  // Profile Edit State
  const [profileData, setProfileData] = useState({
    bio: "",
    qualification: "",
    address: "",
    googleMapsUrl: "",
  });
  const [subjectRates, setSubjectRates] = useState<{ subject: string; rate: number }[]>([]);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectRate, setNewSubjectRate] = useState(500);
  const [customSubjectInput, setCustomSubjectInput] = useState(false);
  const [newSubjectCategory, setNewSubjectCategory] = useState("Academic");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [selectedDocFile, setSelectedDocFile] = useState<File | null>(null);
  const [docNamePreview, setDocNamePreview] = useState<string>("");

  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Document must be less than 10MB.");
        return;
      }
      setSelectedDocFile(file);
      setDocNamePreview(file.name);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB.");
        return;
      }
      setSelectedFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  useEffect(() => {
    if (user?.id) {
      axios.get(`${API_URL}/tutors/user/${user.id}`)
        .then(res => {
          setTutorProfile(res.data);
          if (res.data.timezone) {
            setTutorTimezone(res.data.timezone);
          }
          setProfileData({
            bio: res.data.bio || "",
            qualification: res.data.qualification || "",
            address: res.data.address || "",
            googleMapsUrl: res.data.googleMapsUrl || "",
          });
          const legacyRates = res.data.subjectRates && res.data.subjectRates.length > 0
            ? res.data.subjectRates
            : (res.data.subjects || []).map((sub: string) => ({ subject: sub, rate: res.data.hourlyRate || 500 }));
          setSubjectRates(legacyRates);
          dispatch(fetchTutorStats(res.data.id)); // Database object ID natively fetched
          axios.get(`${API_URL}/dashboard/tutor/${res.data.id}/bookings`)
            .then(bRes => setBookings(bRes.data))
            .catch(err => console.error("Error fetching bookings", err))
            .finally(() => setLoadingBookings(false));
        })
        .catch(err => {
          console.error("Error fetching tutor profile", err);
          setLoadingBookings(false);
        })
        .finally(() => setLoading(false));
    }
  }, [user, dispatch]);

  useEffect(() => {
    if (tutorStats?.availability && tutorStats.availability.length > 0) {
      setAvailability(prev => prev.map(p => {
        const foundSlots = tutorStats.availability?.filter(a => a.day === p.day);
        if (foundSlots && foundSlots.length > 0) {
          return { 
            ...p, 
            selected: true, 
            slots: foundSlots.map(s => ({ startTime: s.startTime, endTime: s.endTime })) 
          };
        }
        return { ...p, selected: false, slots: [{ startTime: '09:00', endTime: '17:00' }] };
      }));
    }
  }, [tutorStats?.availability]);

  const handleSaveAvailability = () => {
    if (!tutorProfile) return;
    
    const selectedDays = availability.filter(a => a.selected);
    if (selectedDays.length === 0) {
      toast.error("Please select at least one available day.");
      return;
    }

    for (const day of selectedDays) {
      for (const slot of day.slots) {
        if (!slot.startTime || !slot.endTime) {
           toast.error(`Please set valid times for ${day.day}.`);
           return;
        }
        if (slot.endTime <= slot.startTime) {
           toast.error(`End time must be later than start time for ${day.day}.`);
           return;
        }
      }
    }

    const payload = selectedDays.flatMap(dayObj => 
      dayObj.slots.map(slot => ({ day: dayObj.day, startTime: slot.startTime, endTime: slot.endTime }))
    );
    
    setIsSavingAvailability(true);
    dispatch(updateTutorAvailability({ tutorId: tutorProfile.id, availability: payload }))
      .unwrap()
      .then(() => toast.success("Availability saved successfully"))
      .catch(() => toast.error("Failed to save availability"))
      .finally(() => setIsSavingAvailability(false));
  };

  const handleBookingAction = async (bookingId: string, status: string) => {
    try {
      await axios.put(`${API_URL}/tutors/booking/${bookingId}/status`, { status });
      toast.success(`Booking marked as ${status}.`);
      setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status } : b));
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Failed to update booking`);
    }
  };

  const handleSessionStatusChange = async (bookingId: string, sessionIdx: number, newStatus: string) => {
    try {
      await axios.put(`${API_URL}/tutors/booking/${bookingId}/session/${sessionIdx}/status`, { status: newStatus });
      toast.success(`Session marked as ${newStatus}`);
      setBookings(prev => prev.map(b => {
        if (b._id === bookingId) {
          const newSessions = [...b.sessions];
          newSessions[sessionIdx] = { ...newSessions[sessionIdx], status: newStatus };
          return { ...b, sessions: newSessions };
        }
        return b;
      }));
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update session status");
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutorProfile?.id || !user?.id) return;
    setIsSavingProfile(true);
    try {
      let uploadedPhotoUrl = tutorProfile?.photo || "";
      if (selectedFile) {
        const formData = new FormData();
        formData.append("photo", selectedFile);
        const uploadRes = await axios.post(`${API_URL}/upload/photo`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        uploadedPhotoUrl = uploadRes.data.url;
      }

      let uploadedDocUrl = tutorProfile?.verificationDocument || "";
      if (selectedDocFile) {
        const formData = new FormData();
        formData.append("document", selectedDocFile);
        const uploadRes = await axios.post(`${API_URL}/upload/document`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        uploadedDocUrl = uploadRes.data.url;
      }

      if (subjectRates.length === 0) {
        toast.error("Please add at least one subject with a rate.");
        setIsSavingProfile(false);
        return;
      }

      const payload = {
        bio: profileData.bio,
        qualification: profileData.qualification,
        address: profileData.address,
        googleMapsUrl: profileData.googleMapsUrl,
        subjectRates,
        photo: uploadedPhotoUrl,
        verificationDocument: uploadedDocUrl,
        timezone: tutorTimezone
      };
      
      const [authRes] = await Promise.all([
        axios.put(`${API_URL}/auth/profile/${user.id}`, {
          full_name: profileName,
          phone: profilePhone,
          timezone: tutorTimezone
        }),
        axios.put(`${API_URL}/tutors/${tutorProfile.id}/profile`, payload)
      ]);

      if (authRes.data && authRes.data.user) {
        dispatch(updateUser({
          full_name: authRes.data.user.full_name,
          phone: authRes.data.user.phone,
          timezone: authRes.data.user.timezone
        }));
      }
      
      // Update local state
      setTutorProfile((prev: any) => ({ 
        ...prev, 
        name: profileName,
        photo: uploadedPhotoUrl,
        verificationDocument: uploadedDocUrl,
        timezone: tutorTimezone
      }));
      setSelectedFile(null);
      setSelectedDocFile(null);
      setDocNamePreview("");
      
      toast.success("Public profile updated successfully!");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const enrolledClasses = bookings.filter(b => b.status === 'enrolled');
  const demoRequests = bookings.filter(b => b.status !== 'enrolled');
  
  // Extract unique students
  const uniqueStudents = Array.from(new Map(enrolledClasses.map(cls => [cls.studentId, cls])).values());

  const photoSrc =
    resolveAssetUrl(tutorProfile?.photo) ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=400`;

  return (
    <PageLayout>
      <div className="container py-10 max-w-7xl">
        <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-foreground tracking-tight">Hello, {name}</h1>
            <p className="text-lg text-muted-foreground mt-1">Manage your teaching schedule, students, and profile.</p>
          </div>
          {tutorProfile?.status === "approved" && (
            <Button
              variant="outline"
              className="flex items-center gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all duration-300 rounded-lg shadow-sm w-fit"
              onClick={() => navigate("/tutor/welcome")}
            >
              <Sparkles className="h-4 w-4 text-amber-500" />
              Getting Started Guide
            </Button>
          )}
        </div>

        {tutorProfile?.status === "pending" && (
          <Alert variant="destructive" className="mb-8 border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-500 shadow-sm rounded-xl">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="font-bold text-lg">Account Pending Approval</AlertTitle>
            <AlertDescription className="mt-2 text-sm leading-relaxed">
              Your tutor profile is under review by our admin team. Once approved, you will be publicly listed on the platform and students will be able to book your slots.
            </AlertDescription>
          </Alert>
        )}

        {tutorProfile?.status === "rejected" && (
          <Alert variant="destructive" className="mb-8 border-rose-500 bg-rose-500/10 text-rose-800 dark:text-rose-500 shadow-sm rounded-xl">
            <AlertCircle className="h-5 w-5 text-rose-600" />
            <AlertTitle className="font-bold text-lg">Application Status: Rejected</AlertTitle>
            <AlertDescription className="mt-2 text-sm leading-relaxed">
              Your tutor application was rejected by the admin team due to verification discrepancies. 
              <span className="block mt-1 font-semibold text-foreground">
                How to resolve: Please update your bio, qualification, or re-upload a clean, valid KYC verification document (PDF/Image) below and click "Update Public Profile" to automatically re-submit your profile for review!
              </span>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          {[
            { icon: Clock, label: "Demo Requests", value: tutorStats?.demoRequests || 0, color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/30", tab: "demos" },
            { icon: Users, label: "Active Students", value: uniqueStudents.length, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30", tab: "students" },
            { icon: Calendar, label: "Upcoming Classes", value: enrolledClasses.length, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30", tab: "schedule" },
            { icon: DollarSign, label: "Total Earnings", value: `₹${enrolledClasses.reduce((acc, curr) => acc + (curr.amountPaid || 0), 0)}`, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30", tab: "earnings" },
          ].map((stat) => (
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
          <TabsList className="bg-secondary/50 p-1 rounded-xl shadow-sm border mb-4 h-auto justify-start w-full overflow-x-auto whitespace-nowrap">
            <TabsTrigger value="demos" className="rounded-lg px-6 py-2.5 shrink-0">Demo Requests</TabsTrigger>
            <TabsTrigger value="schedule" className="rounded-lg px-6 py-2.5 shrink-0">Class Schedule</TabsTrigger>
            <TabsTrigger value="students" className="rounded-lg px-6 py-2.5 shrink-0">Students</TabsTrigger>
            <TabsTrigger value="availability" className="rounded-lg px-6 py-2.5 shrink-0">Availability</TabsTrigger>
            <TabsTrigger value="earnings" className="rounded-lg px-6 py-2.5 shrink-0">Earnings</TabsTrigger>
            <TabsTrigger value="messages" className="rounded-lg px-6 py-2.5 shrink-0 flex items-center gap-1.5">
              Messages
              {unreadMessagesCount > 0 && (
                <span className="h-5 w-5 bg-rose-500 text-white font-extrabold text-[10px] flex items-center justify-center rounded-full shrink-0 animate-pulse">
                  {unreadMessagesCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="profile" className="rounded-lg px-6 py-2.5 shrink-0">Profile Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="demos">
            <Card className="shadow-md border-border/50">
              <CardHeader className="bg-secondary/20 border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2"><Clock className="h-5 w-5 text-indigo-500" /> Requested Demo Bookings</CardTitle>
                <CardDescription>Manage incoming demo requests from new students.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {loadingBookings ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-20 w-full rounded-xl" />
                    <Skeleton className="h-20 w-full rounded-xl" />
                  </div>
                ) : demoRequests.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-secondary/10 rounded-2xl border border-dashed mt-4">
                    <Clock className="mx-auto mb-4 h-16 w-16 opacity-30 text-indigo-500" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Demo Requests</h3>
                    <p>You don't have any pending demo requests right now.</p>
                  </div>
                ) : (
                  <div className="space-y-4 mt-4">
                    {demoRequests.map((booking: any) => (
                      <div key={booking._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card p-5 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
                        <div className="mb-4 sm:mb-0">
                          <p className="font-bold text-lg text-foreground flex items-center gap-2">
                             <Users className="h-5 w-5 text-primary"/> Student: {booking.studentName}
                          </p>
                          {booking.subject && <p className="text-sm font-medium text-primary mt-1 px-2 py-0.5 bg-primary/10 rounded-md inline-block">{booking.subject}</p>}
                          <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                            <Calendar className="h-4 w-4"/> {formatBookingTime(booking, tutorTimezone)}
                            {booking.status === 'confirmed' && (booking.utcTiming ? new Date(booking.utcTiming).getTime() + 2 * 3600 * 1000 < Date.now() : isBookingPast(booking.timing)) && (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none ml-2">Past Demo</Badge>
                            )}
                          </p>
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
                            {booking.status === 'pending' && (
                              <>
                                <Button 
                                  size="sm" 
                                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1 font-semibold" 
                                  onClick={() => handleBookingAction(booking._id, 'confirmed')}
                                >
                                  <Check className="mr-1 h-4 w-4"/> Accept Request
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" 
                                  onClick={() => {
                                    setRejectingBookingId(booking._id);
                                    setIsRejectDialogOpen(true);
                                  }}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            {booking.status === 'confirmed' && (
                               <>
                                {!(booking.utcTiming ? new Date(booking.utcTiming).getTime() + 2 * 3600 * 1000 < Date.now() : isBookingPast(booking.timing)) && (
                                  <Button
                                    size="sm"
                                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1 animate-pulse"
                                    asChild
                                  >
                                    <a
                                      href={`${booking.meetingLink || `https://meet.jit.si/cuvasol-tutor-demo-${booking._id}`}#config.prejoinPageEnabled=false&userInfo.displayName="${encodeURIComponent(name)}"&userInfo.email="${encodeURIComponent(user?.email || '')}"`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <Video className="h-4 w-4" /> Join Demo Room
                                    </a>
                                  </Button>
                                 )}
                                <Button size="sm" className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white shadow-sm" onClick={() => handleBookingAction(booking._id, 'completed')}>
                                  <Check className="mr-1 h-4 w-4"/> Mark Completed
                                </Button>
                                <Button size="sm" variant="outline" className="w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={() => {
                                  setRejectingBookingId(booking._id);
                                  setIsRejectDialogOpen(true);
                                }}>Reject</Button>
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

          <TabsContent value="schedule">
            <Card className="shadow-md border-border/50">
              <CardHeader className="bg-secondary/20 border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2"><Calendar className="h-5 w-5 text-green-500" /> Active Class Schedule</CardTitle>
                <CardDescription>Your ongoing paid classes.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {enrolledClasses.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-secondary/10 rounded-2xl border border-dashed mt-4">
                    <Calendar className="mx-auto mb-4 h-16 w-16 opacity-30 text-green-500" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Active Classes</h3>
                    <p>You don't have any enrolled classes right now.</p>
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
                                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1.5"><Users className="h-3.5 w-3.5 text-primary"/> Student: <span className="font-semibold text-foreground">{cls.studentName}</span></p>
                              </div>
                              <div className="text-left sm:text-right w-full sm:w-auto">
                                <span className="text-xs font-bold text-muted-foreground block uppercase tracking-wider">Plan Type</span>
                                <span className="font-extrabold text-indigo-500 text-sm sm:text-base">{cls.planType}</span>
                              </div>
                            </div>

                            {/* Progress Indicator */}
                            <div className="space-y-2 bg-secondary/10 p-4 rounded-xl border border-border/40">
                              <div className="flex justify-between items-center text-xs font-semibold">
                                <span className="text-muted-foreground">Class Completion Status</span>
                                <span className="text-foreground">{completedSessions} of {totalSessions} Classes Completed ({percentComplete}%)</span>
                              </div>
                              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${percentComplete}%` }} />
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 justify-between items-center pt-2">
                              <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><Clock className="h-4 w-4 text-primary"/> {formatBookingTime(cls, tutorTimezone)}</span>
                              
                              <div className="flex gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setExpandedBookingId(isExpanded ? null : cls._id)}
                                  className="font-semibold"
                                >
                                  {isExpanded ? "Hide Schedule ▲" : "View Schedule ▼"}
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
                                      ? formatSessionDateTime(session.utcDate, tutorTimezone)
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

                                          <div className="flex gap-2">
                                            {session.status === 'scheduled' && (
                                              <>
                                                {!isSessionPast(formattedSession.date, formattedSession.time) && (
                                                  <Button
                                                    size="sm"
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1 font-semibold text-xs animate-pulse"
                                                    asChild
                                                  >
                                                    <a
                                                      href={`${session.meetingLink || `https://meet.jit.si/cuvasol-tutor-class-${cls._id}-session-${sIdx + 1}`}#config.prejoinPageEnabled=false&userInfo.displayName="${encodeURIComponent(name)}"&userInfo.email="${encodeURIComponent(user?.email || '')}"`}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                    >
                                                      <Video className="h-3.5 w-3.5" /> Start Classroom
                                                    </a>
                                                  </Button>
                                                )}
                                                <Button 
                                                  size="sm" 
                                                  className="bg-green-600 hover:bg-green-700 text-white shadow-sm text-xs font-semibold"
                                                  onClick={() => handleSessionStatusChange(cls._id, sIdx, 'completed')}
                                                >
                                                  <Check className="mr-1 h-3.5 w-3.5"/> Complete
                                                </Button>
                                                <Button 
                                                  size="sm" 
                                                  variant="outline" 
                                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 text-xs"
                                                  onClick={() => handleSessionStatusChange(cls._id, sIdx, 'cancelled')}
                                                >
                                                  Cancel
                                                </Button>
                                              </>
                                            )}
                                          </div>
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
                               <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><Users className="h-3 w-3"/> Student: {cls.studentName}</p>
                             </div>
                             <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none px-3 py-1">{cls.planType}</Badge>
                          </div>
                          <div className="mt-auto pt-4 border-t flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                             <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                               <Clock className="h-4 w-4"/> {formatBookingTime(cls, tutorTimezone)}
                               {(cls.utcTiming ? new Date(cls.utcTiming).getTime() + 2 * 3600 * 1000 < Date.now() : isBookingPast(cls.timing)) && (
                                 <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none ml-2">Past Class</Badge>
                               )}
                             </span>
                             {!(cls.utcTiming ? new Date(cls.utcTiming).getTime() + 2 * 3600 * 1000 < Date.now() : isBookingPast(cls.timing)) && (
                               <Button
                                 size="sm"
                                 className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-1 animate-pulse w-full sm:w-auto"
                                 asChild
                               >
                                 <a
                                   href={`${cls.meetingLink || `https://meet.jit.si/cuvasol-tutor-class-${cls._id}`}#config.prejoinPageEnabled=false&userInfo.displayName="${encodeURIComponent(name)}"&userInfo.email="${encodeURIComponent(user?.email || '')}"`}
                                   target="_blank"
                                   rel="noopener noreferrer"
                                 >
                                   <Video className="h-4 w-4" /> Join Classroom
                                 </a>
                               </Button>
                             )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students">
            <Card className="shadow-md border-border/50">
              <CardHeader className="bg-secondary/20 border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2"><Users className="h-5 w-5 text-blue-500" /> Enrolled Students</CardTitle>
                <CardDescription>A list of students currently taking your classes.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {uniqueStudents.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-secondary/10 rounded-2xl border border-dashed mt-4">
                    <Users className="mx-auto mb-4 h-16 w-16 opacity-30 text-blue-500" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Students Yet</h3>
                    <p>Complete demo sessions to convert leads into enrolled students.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 mt-4 sm:grid-cols-2 lg:grid-cols-3">
                    {uniqueStudents.map((cls: any) => (
                      <div key={cls.studentId} className="flex items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                          {cls.studentName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{cls.studentName}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Enrolled Subject: {cls.subject}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="availability">
            <Card className="shadow-md border-border/50">
              <CardHeader className="bg-secondary/20 border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2"><Calendar className="h-5 w-5 text-orange-500" /> Manage Availability</CardTitle>
                <CardDescription>Select the days you are available and set your working hours.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4 max-w-2xl mt-4">
                  {availability.map((dayObj, i) => (
                    <div key={dayObj.day} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border rounded-xl bg-card hover:bg-secondary/10 transition-colors shadow-sm">
                      <div className="flex items-center gap-3 min-w-[140px]">
                        <Checkbox 
                           id={`day-${dayObj.day}`} 
                           checked={dayObj.selected}
                           onCheckedChange={(checked) => {
                             const newAvail = [...availability];
                             newAvail[i].selected = checked === true;
                             setAvailability(newAvail);
                           }}
                           className="h-5 w-5"
                        />
                        <Label htmlFor={`day-${dayObj.day}`} className="font-medium cursor-pointer text-base">{dayObj.day}</Label>
                      </div>
                      
                      <div className={`flex flex-col gap-3 transition-opacity ${dayObj.selected ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                        {dayObj.slots.map((slot, slotIdx) => (
                          <div key={slotIdx} className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 bg-secondary/30 p-1.5 rounded-lg border">
                              <Label className="text-xs text-muted-foreground w-8 text-center font-semibold">IN</Label>
                              <Input 
                                type="time" 
                                className="w-[130px] h-8 border-none bg-transparent shadow-none focus-visible:ring-0 px-2" 
                                value={slot.startTime}
                                onChange={(e) => {
                                  const newAvail = [...availability];
                                  newAvail[i].slots[slotIdx].startTime = e.target.value;
                                  setAvailability(newAvail);
                                }}
                              />
                            </div>
                            <div className="flex items-center gap-2 bg-secondary/30 p-1.5 rounded-lg border">
                              <Label className="text-xs text-muted-foreground w-8 text-center font-semibold">OUT</Label>
                              <Input 
                                type="time" 
                                className="w-[130px] h-8 border-none bg-transparent shadow-none focus-visible:ring-0 px-2"
                                value={slot.endTime}
                                onChange={(e) => {
                                  const newAvail = [...availability];
                                  newAvail[i].slots[slotIdx].endTime = e.target.value;
                                  setAvailability(newAvail);
                                }}
                              />
                            </div>
                            {dayObj.slots.length > 1 && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  const newAvail = [...availability];
                                  newAvail[i].slots = newAvail[i].slots.filter((_, idx) => idx !== slotIdx);
                                  setAvailability(newAvail);
                                }}
                              >
                                <PlusCircle className="h-4 w-4 rotate-45" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-fit text-xs h-7 gap-1 border-dashed"
                          onClick={() => {
                            const newAvail = [...availability];
                            newAvail[i].slots.push({ startTime: '09:00', endTime: '17:00' });
                            setAvailability(newAvail);
                          }}
                        >
                          <PlusCircle className="h-3 w-3" /> Add Slot
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-6 flex justify-end">
                    <Button onClick={handleSaveAvailability} disabled={isSavingAvailability} className="shadow-md rounded-full px-8">
                      {isSavingAvailability ? 'Saving...' : <><Save className="mr-2 h-4 w-4"/> Save Availability</>}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="earnings">
            <Card className="shadow-md border-border/50">
              <CardHeader className="bg-secondary/20 border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2"><DollarSign className="h-5 w-5 text-emerald-500" /> Earnings Ledger</CardTitle>
                <CardDescription>A record of all your enrolled class payments.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {loadingBookings ? (
                   <div className="py-4"><Skeleton className="h-32 w-full rounded-xl" /></div>
                ) : enrolledClasses.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-secondary/10 rounded-2xl border border-dashed mt-4">
                    <DollarSign className="mx-auto mb-4 h-16 w-16 opacity-30 text-emerald-500" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Earnings Found</h3>
                    <p>You haven't earned anything yet. Teach a class to start earning!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto mt-4 rounded-xl border shadow-sm">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground bg-secondary/50 uppercase border-b">
                        <tr>
                          <th className="px-6 py-4 font-medium">Date Enrolled</th>
                          <th className="px-6 py-4 font-medium">Student / Subject</th>
                          <th className="px-6 py-4 font-medium text-right">Amount Earned</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrolledClasses.map((cls: any) => (
                          <tr key={cls._id} className="bg-card border-b last:border-0 hover:bg-secondary/20 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground">
                              {new Date(cls.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-foreground">{cls.studentName}</div>
                              <div className="text-muted-foreground text-xs">{cls.subject}</div>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-emerald-600 text-lg">
                              +₹{cls.amountPaid}
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
            <ChatPanel />
          </TabsContent>

          <TabsContent value="profile">
            <Card className="shadow-md border-border/50">
              <CardHeader className="bg-secondary/20 border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2"><AlertCircle className="h-5 w-5 text-blue-500" /> Public Profile Settings</CardTitle>
                <CardDescription>Customize how students see you on the platform.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid lg:grid-cols-3 gap-8">
                   <div className="lg:col-span-1 border rounded-xl p-5 bg-secondary/10 self-start shadow-sm">
                      <h4 className="font-semibold mb-4 text-foreground border-b pb-2">Account Overview</h4>
                      
                      {/* Profile Photo Display and Upload */}
                      <div className="flex flex-col items-center mb-6 pb-6 border-b">
                        <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-background shadow-md bg-secondary/30">
                          <img 
                            src={photoPreview || photoSrc} 
                            alt={name} 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=400`;
                            }}
                          />
                        </div>
                        <div className="mt-4 w-full">
                          <Label htmlFor="photo-upload" className="text-xs font-semibold text-muted-foreground block mb-1">
                            Change Profile Photo
                          </Label>
                          <Input 
                            id="photo-upload" 
                            type="file" 
                            accept="image/*" 
                            className="bg-background cursor-pointer text-xs" 
                            onChange={handleFileChange}
                          />
                        </div>
                      </div>

                      {/* Verification Credentials Display and Upload */}
                      <div className="flex flex-col mb-6 pb-6 border-b">
                        <Label htmlFor="doc-upload" className="text-xs font-semibold text-muted-foreground block mb-2">
                          Verification Credential (PDF/Image)
                        </Label>
                        <Input 
                          id="doc-upload" 
                          type="file" 
                          accept="application/pdf,image/*" 
                          className="bg-background cursor-pointer text-xs" 
                          onChange={handleDocFileChange}
                        />
                        {docNamePreview && (
                          <p className="text-[10px] text-emerald-600 font-semibold mt-1.5">✓ Selected: {docNamePreview}</p>
                        )}
                        {tutorProfile?.verificationDocument && (
                          <div className="mt-3">
                            <a 
                              href={resolveAssetUrl(tutorProfile.verificationDocument)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5"
                            >
                              📄 View Uploaded Credential
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Name</p>
                          <p className="font-medium text-foreground">{name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Email</p>
                          <p className="font-medium text-foreground">{String(user?.email || "")}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Approval Status</p>
                          {loading ? (
                            <Skeleton className="h-5 w-20 mt-1" />
                          ) : (
                            <Badge variant={tutorProfile?.status === 'approved' ? 'default' : 'secondary'} className={`mt-1 ${tutorProfile?.status === 'approved' ? 'bg-green-600' : ''}`}>
                              {tutorProfile?.status ? tutorProfile.status.charAt(0).toUpperCase() + tutorProfile.status.slice(1) : "Unknown"}
                            </Badge>
                          )}
                        </div>
                      </div>
                   </div>

                   <div className="lg:col-span-2">
                     <form onSubmit={handleProfileUpdate} className="space-y-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="name" className="text-sm font-semibold">Full Name</Label>
                            <Input 
                              id="name" 
                              value={profileName} 
                              onChange={(e) => setProfileName(capitalizeName(e.target.value))} 
                              className="bg-secondary/20 border-border/50 shadow-sm" 
                              required 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone" className="text-sm font-semibold">Phone Number</Label>
                            <Input 
                              id="phone" 
                              value={profilePhone} 
                              onChange={(e) => setProfilePhone(e.target.value)} 
                              placeholder="+1 234 567 890" 
                              className="bg-secondary/20 border-border/50 shadow-sm" 
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="bio" className="text-sm font-semibold">Professional Bio</Label>
                          <textarea 
                            id="bio" 
                            rows={4}
                            value={profileData.bio} 
                            onChange={(e) => setProfileData({...profileData, bio: e.target.value})} 
                            placeholder="Tell students about yourself, your teaching style, and why they should choose you..."
                            className="flex min-h-[100px] w-full rounded-md border border-input bg-secondary/20 px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" 
                          />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="qualification" className="text-sm font-semibold">Highest Qualification</Label>
                            <Input id="qualification" value={profileData.qualification} onChange={(e) => setProfileData({...profileData, qualification: e.target.value})} placeholder="e.g. M.Sc. in Mathematics" className="bg-secondary/20 shadow-sm" />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="timezone" className="text-sm font-semibold">Time Zone</Label>
                            <Select value={tutorTimezone} onValueChange={setTutorTimezone}>
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

                         {(tutorProfile?.mode?.toLowerCase() === "offline" || tutorProfile?.mode?.toLowerCase() === "both") && (
                           <div className="grid gap-4 sm:grid-cols-2 p-4 border rounded-xl bg-secondary/5 animate-in fade-in slide-in-from-top-2 duration-200">
                             <div className="space-y-2">
                               <Label htmlFor="address" className="text-sm font-semibold">Classroom Address</Label>
                               <Input 
                                 id="address" 
                                 value={profileData.address} 
                                 onChange={(e) => setProfileData({...profileData, address: e.target.value})} 
                                 placeholder="e.g. 1st Floor, Building Name, Street Name" 
                                 className="bg-secondary/20 shadow-sm"
                               />
                             </div>
                             <div className="space-y-2">
                               <Label htmlFor="googleMapsUrl" className="text-sm font-semibold">Google Maps Link</Label>
                               <Input 
                                 id="googleMapsUrl" 
                                 type="url"
                                 value={profileData.googleMapsUrl} 
                                 onChange={(e) => setProfileData({...profileData, googleMapsUrl: e.target.value})} 
                                 placeholder="e.g. https://maps.app.goo.gl/..." 
                                 className="bg-secondary/20 shadow-sm"
                               />
                             </div>
                           </div>
                         )}

                        <div className="space-y-4 border rounded-xl p-4 bg-secondary/5">
                          <Label className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                            📚 Subjects & Hourly Rates
                          </Label>
                          
                          {/* Subject Rates List */}
                          {subjectRates.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic p-2 bg-background rounded-lg border border-dashed text-center">
                              No subjects added yet. Please add at least one subject below.
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                              {subjectRates.map((sr, sIdx) => (
                                <div key={sIdx} className="flex items-center justify-between gap-4 bg-background p-3 rounded-lg border shadow-sm transition-all hover:border-primary/20">
                                  <span className="text-sm font-bold text-foreground truncate max-w-[200px]">
                                    {sr.subject.replace(/\s*\((Academic|Extracurricular)\)/i, "")}
                                  </span>
                                  <div className="flex items-center gap-3 shrink-0">
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-muted-foreground font-semibold">₹</span>
                                      <Input 
                                        type="number" 
                                        min={100} 
                                        max={10000} 
                                        className="w-20 h-8 text-xs font-bold text-center" 
                                        value={sr.rate !== undefined ? sr.rate : ""} 
                                        onChange={(e) => {
                                          const val = e.target.value === "" ? "" : parseInt(e.target.value, 10);
                                          setSubjectRates(prev => prev.map((item, idx) => idx === sIdx ? { ...item, rate: isNaN(val as number) ? "" : val } : item));
                                        }} 
                                      />
                                      <span className="text-[10px] text-muted-foreground">/hr</span>
                                    </div>
                                    <Button 
                                      type="button" 
                                      variant="ghost" 
                                      size="sm"
                                      className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                      onClick={() => {
                                        setSubjectRates(prev => prev.filter((_, idx) => idx !== sIdx));
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add New Subject Sub-Form */}
                          <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-border/40 items-end sm:items-center">
                            <div className="flex-1 w-full space-y-1">
                              <Label className="text-[10px] font-bold text-muted-foreground uppercase">Subject Name</Label>
                              {customSubjectInput ? (
                                <div className="flex flex-col sm:flex-row gap-2 w-full">
                                  <Select value={newSubjectCategory} onValueChange={setNewSubjectCategory}>
                                    <SelectTrigger className="h-9 text-xs bg-background w-full sm:w-36">
                                      <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Academic">Academic</SelectItem>
                                      <SelectItem value="Extracurricular">Extracurricular</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <div className="flex flex-1 gap-1.5 w-full">
                                    <Input 
                                      placeholder="Enter subject name..." 
                                      value={newSubjectName} 
                                      onChange={(e) => setNewSubjectName(e.target.value)}
                                      className="h-9 text-xs bg-background"
                                    />
                                    <Button 
                                      type="button" 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => { setCustomSubjectInput(false); setNewSubjectName(""); }}
                                      className="h-9 px-2 text-xs shrink-0"
                                    >
                                      Back
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <Select 
                                  value={newSubjectName} 
                                  onValueChange={(val) => {
                                    if (val === "custom") {
                                      setCustomSubjectInput(true);
                                      setNewSubjectName("");
                                    } else {
                                      setNewSubjectName(val);
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-9 text-xs bg-background">
                                    <SelectValue placeholder="Choose subject..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[
                                      "Mathematics", "Physics", "Chemistry", "Biology", "Coding / Computer Science", "English", "History", "Geography", "Economics & Finance", "Foreign Languages",
                                      "Music (Vocal/Instruments)", "Dance", "Fine Arts & Drawing", "Chess", "Yoga & Meditation", "Public Speaking & Debate", "Creative Writing", "Photography & Video"
                                    ]
                                      .filter(sub => !subjectRates.some(sr => sr.subject === sub))
                                      .map(sub => (
                                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                                      ))
                                    }
                                    <SelectItem value="custom">+ Custom Subject...</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </div>

                            <div className="w-fit space-y-1">
                              <Label className="text-[10px] font-bold text-muted-foreground uppercase">Rate (₹/hr)</Label>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground">₹</span>
                                <Input 
                                  type="number" 
                                  min={100} 
                                  max={10000} 
                                  className="w-20 h-9 text-xs font-bold text-center bg-background" 
                                  value={newSubjectRate !== undefined ? newSubjectRate : ""} 
                                  onChange={(e) => {
                                    const val = e.target.value === "" ? "" : parseInt(e.target.value, 10);
                                    setNewSubjectRate(isNaN(val as number) ? "" : val as any);
                                  }} 
                                />
                              </div>
                            </div>

                            <Button 
                              type="button" 
                              variant="secondary"
                              onClick={() => {
                                if (!newSubjectName.trim()) {
                                  toast.error("Please select or enter a subject name.");
                                  return;
                                }
                                const subjectName = customSubjectInput
                                  ? `${newSubjectName.trim()} (${newSubjectCategory})`
                                  : newSubjectName.trim();
                                  
                                if (subjectRates.some(sr => sr.subject.toLowerCase() === subjectName.toLowerCase())) {
                                  toast.error("This subject is already in your profile.");
                                  return;
                                }
                                setSubjectRates(prev => [...prev, { subject: subjectName, rate: newSubjectRate as number }]);
                                setNewSubjectName("");
                                setCustomSubjectInput(false);
                              }}
                              className="h-9 text-xs shrink-0"
                            >
                              <PlusCircle className="mr-1 h-3.5 w-3.5" /> Add
                            </Button>
                          </div>
                        </div>
                        
                        <div className="pt-2">
                          <Button type="submit" disabled={isSavingProfile} className="w-full sm:w-auto shadow-md rounded-full px-8">
                            {isSavingProfile ? "Saving..." : <><Save className="mr-2 h-4 w-4"/> Update Public Profile</>}
                          </Button>
                        </div>
                     </form>
                   </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Rejection Reason Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Demo Request</DialogTitle>
            <DialogDescription>
              Please specify the reason why you are declining this demo session request. The student will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Select Reason</Label>
              <Select value={rejectReasonType} onValueChange={setRejectReasonType}>
                <SelectTrigger className="w-full bg-secondary/10">
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_REASONS.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {rejectReasonType === "Other" && (
              <div className="w-full space-y-2 animate-in fade-in duration-200">
                <Label htmlFor="customRejectReason" className="text-xs text-muted-foreground">Specify Reason</Label>
                <Textarea
                  id="customRejectReason"
                  placeholder="Explain to the student why you are rejecting the request..."
                  value={customRejectReason}
                  onChange={(e) => setCustomRejectReason(e.target.value)}
                  className="resize-none bg-secondary/10"
                  rows={3}
                />
              </div>
            )}

            <div className="flex gap-3 justify-end mt-4">
              <Button variant="outline" onClick={() => {
                setIsRejectDialogOpen(false);
                setRejectingBookingId(null);
                setRejectReasonType("");
                setCustomRejectReason("");
              }}>
                Cancel
              </Button>
              <Button onClick={handleRejectSubmit} disabled={isSubmittingRejection} className="bg-destructive hover:bg-destructive/90 text-white font-semibold">
                {isSubmittingRejection ? "Submitting..." : "Confirm Rejection"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default TutorDashboard;
