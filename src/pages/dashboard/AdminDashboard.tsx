import { useEffect, useState, Fragment } from "react";
import { Users, BookOpen, CreditCard, CheckCircle, XCircle, Clock, Shield, Star, DollarSign, Activity, Trash2, ChevronDown, ChevronUp, Calendar, History, Percent, Sparkles, MapPin, Video, MessageSquare, Globe, Search, FileText, GraduationCap, Award, Mail, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PageLayout from "@/components/layout/PageLayout";
import { toast } from "@/components/ui/sonner";
import { useSelector, useDispatch } from "react-redux";
import { fetchAdminStats } from "@/redux/slices/dashboardSlice";
import { RootState, AppDispatch } from "@/redux/store";
import axios from "axios";
import API_URL from "@/config/api";
import { resolveAssetUrl } from "@/lib/assetUrl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import ChatPanel from "@/components/chat/ChatPanel";
import { format, parse } from "date-fns";
import { getTimeZoneAbbreviation, COMMON_TIMEZONES } from "@/utils/timezone";
import { getMeetingHref } from "@/utils/meeting";

const CLASS_TAUGHT_OPTIONS = [
  "Class 1 - 5 (Primary)",
  "Class 6 - 8 (Middle School)",
  "Class 9 - 10 (High School)",
  "Class 11 - 12 (Senior Secondary)",
  "College / University",
  "Competitive Exams"
];

const BOARD_TAUGHT_OPTIONS = [
  "CBSE",
  "ICSE / ISC",
  "State Board",
  "IB (International Baccalaureate)",
  "IGCSE / Cambridge",
  "Other"
];

const ALL_SUBJECTS = [
  "Mathematics", 
  "Physics", 
  "Chemistry", 
  "Biology", 
  "Coding / Computer Science", 
  "English", 
  "History", 
  "Geography", 
  "Economics & Finance", 
  "Foreign Languages", 
  "Malayalam",
  "Music (Vocal/Instruments)", 
  "Dance", 
  "Fine Arts & Drawing", 
  "Chess", 
  "Yoga & Meditation", 
  "Public Speaking & Debate", 
  "Creative Writing", 
  "Photography & Video", 
  "Other"
];

const AdminDashboard = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuth();
  const { adminStats, loading: statsLoading } = useSelector((state: RootState) => state.dashboard);
  const [tutors, setTutors] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [approvedTutorSearch, setApprovedTutorSearch] = useState("");
  const [pendingTutorSearch, setPendingTutorSearch] = useState("");
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const [expandedTutorId, setExpandedTutorId] = useState<string | null>(null);
  const [selectedPayoutSubject, setSelectedPayoutSubject] = useState<Record<string, string>>({});
  const [coursePayments, setCoursePayments] = useState<any[]>([]);
  const [loadingCoursePayments, setLoadingCoursePayments] = useState(false);
  const [selectedTutorForDetail, setSelectedTutorForDetail] = useState<any | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<any | null>(null);
  const [isStudentDetailDialogOpen, setIsStudentDetailDialogOpen] = useState(false);
  const [selectedAssessmentPayment, setSelectedAssessmentPayment] = useState<any | null>(null);
  const [isAnswersDialogOpen, setIsAnswersDialogOpen] = useState(false);
  const [editedScores, setEditedScores] = useState<Record<string, number>>({});
  const [isSavingScores, setIsSavingScores] = useState(false);

  // Edit Profile States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editTimezone, setEditTimezone] = useState("Asia/Kolkata");
  const [editCategory, setEditCategory] = useState("Academic");
  const [editCity, setEditCity] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editGoogleMapsUrl, setEditGoogleMapsUrl] = useState("");
  const [editMode, setEditMode] = useState("Online");
  const [editQualification, setEditQualification] = useState("");
  const [editExperience, setEditExperience] = useState<number | string>(0);
  const [editBio, setEditBio] = useState("");
  const [editSubjectRates, setEditSubjectRates] = useState<{ subject: string; rate: number }[]>([]);
  const [editClassesTaught, setEditClassesTaught] = useState<string[]>([]);
  const [editBoardsTaught, setEditBoardsTaught] = useState<string[]>([]);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Rejection Dialog States
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectTutorId, setRejectTutorId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  // New States for Admin booking details and support messages
  const [activeTab, setActiveTab] = useState(() => {
    const saved = sessionStorage.getItem("admin_dashboard_tab");
    if (saved) {
      sessionStorage.removeItem("admin_dashboard_tab");
      return saved;
    }
    return "approvals";
  });

  const [activeChatUserId, setActiveChatUserId] = useState<string | undefined>(() => {
    const saved = sessionStorage.getItem("active_chat_user_id");
    if (saved) {
      sessionStorage.removeItem("active_chat_user_id");
      return saved;
    }
    return undefined;
  });

  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [selectedBookingForDetail, setSelectedBookingForDetail] = useState<any | null>(null);
  const [isBookingDetailDialogOpen, setIsBookingDetailDialogOpen] = useState(false);
  const [verificationDemoTiming, setVerificationDemoTiming] = useState("");
  const [isBookingDemo, setIsBookingDemo] = useState(false);
  const [isSendingProfileEmails, setIsSendingProfileEmails] = useState(false);
  const [isSendingReferralEmails, setIsSendingReferralEmails] = useState(false);

  const handleSendReferralEmails = async () => {
    if (!window.confirm("Send Referral Program introduction emails to ALL registered tutors?")) {
      return;
    }

    try {
      setIsSendingReferralEmails(true);
      toast.loading("Sending referral program emails to all tutors...");
      const res = await axios.post(`${API_URL}/dashboard/admin/send-referral-emails`, {});
      toast.dismiss();
      toast.success(`Referral email process completed! Sent: ${res.data.successCount}, Failed: ${res.data.failCount}`);
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.response?.data?.error || "Failed to send referral emails");
    } finally {
      setIsSendingReferralEmails(false);
    }
  };

  const handleSendProfileEmails = async () => {
    if (!window.confirm("Send Board, Class & Profile completion reminder emails to all members with incomplete profiles?")) {
      return;
    }
    try {
      setIsSendingProfileEmails(true);
      toast.loading("Sending profile reminder emails to all members with incomplete profiles...");
      const res = await axios.post(`${API_URL}/dashboard/admin/send-profile-emails`, { onlyIncomplete: true });
      toast.dismiss();
      toast.success(`Profile emails dispatched! Sent: ${res.data.successCount}, Skipped: ${res.data.results?.filter((r: any) => r.status === 'skipped').length || 0}`);
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.response?.data?.error || "Failed to send profile reminder emails");
    } finally {
      setIsSendingProfileEmails(false);
    }
  };

  const handleDownloadTutorsCSV = () => {
    if (tutors.length === 0) {
      toast.error("No tutor data available to download");
      return;
    }

    const headers = ["Name", "Phone Number", "Referral Code"];
    const rows = tutors.map(t => {
      const name = t.name || t.userId?.full_name || "";
      const phone = t.phone || t.userId?.phone || "";
      const code = t.referralCode || "";

      const escapedName = `"${name.replace(/"/g, '""')}"`;
      const escapedPhone = `"\t${phone.replace(/"/g, '""')}"`;
      const escapedCode = `"${code.replace(/"/g, '""')}"`;

      return [escapedName, escapedPhone, escapedCode].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `tutors_referral_codes_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Tutors CSV downloaded successfully!");
  };

  const handleViewStudentDetail = (student: any) => {
    setSelectedStudentForDetail(student);
    setIsStudentDetailDialogOpen(true);
  };

  const handleViewTutorDetail = (tutor: any) => {
    setSelectedTutorForDetail(tutor);
    setIsEditingProfile(false);
    setEditName(tutor.name || "");
    setEditPhone(tutor.phone || "");
    setEditTimezone(tutor.timezone || "Asia/Kolkata");
    setEditCategory(tutor.category || "Academic");
    setEditCity(tutor.city || "");
    setEditAddress(tutor.address || "");
    setEditGoogleMapsUrl(tutor.googleMapsUrl || "");
    setEditMode(tutor.mode || "Online");
    setEditQualification(tutor.qualification || "");
    setEditExperience(tutor.experience ?? 0);
    setEditBio(tutor.bio || "");
    
    const legacyRates = tutor.subjectRates && tutor.subjectRates.length > 0
      ? tutor.subjectRates
      : (tutor.subjects || []).map((sub: string) => ({ subject: sub, rate: tutor.hourlyRate || 300 }));
    setEditSubjectRates(legacyRates);
    
    setEditClassesTaught(tutor.classesTaught || []);
    setEditBoardsTaught(tutor.boardsTaught || []);
    
    setIsDetailDialogOpen(true);
  };

  const handleSaveTutorProfile = async () => {
    if (!selectedTutorForDetail) return;
    
    if (!editName.trim()) {
      toast.error("Name is required");
      return;
    }
    
    try {
      setIsSavingProfile(true);
      
      const userId = selectedTutorForDetail.userId?._id || selectedTutorForDetail.userId;
      if (!userId) {
        toast.error("User ID associated with tutor not found.");
        setIsSavingProfile(false);
        return;
      }
      
      // Update User collection
      await axios.put(`${API_URL}/auth/profile/${userId}`, {
        full_name: editName.trim(),
        phone: editPhone.trim(),
        timezone: editTimezone
      });
      
      // Update Tutor collection
      const payload = {
        bio: editBio,
        qualification: editQualification,
        experience: Number(editExperience),
        address: editAddress,
        googleMapsUrl: editGoogleMapsUrl,
        mode: editMode,
        category: editCategory,
        subjectRates: editSubjectRates,
        classesTaught: editClassesTaught,
        boardsTaught: editBoardsTaught,
        timezone: editTimezone,
        city: editCity
      };
      
      const res = await axios.put(`${API_URL}/tutors/${selectedTutorForDetail.id}/profile`, payload);
      
      toast.success("Tutor profile updated successfully!");
      
      // Update local state in the list
      setTutors(prev => prev.map(t => t.id === selectedTutorForDetail.id ? { 
        ...t, 
        ...res.data, 
        name: editName.trim(), 
        phone: editPhone.trim(), 
        email: selectedTutorForDetail.email 
      } : t));
      
      // Update selected tutor detail in modal
      setSelectedTutorForDetail({ 
        ...selectedTutorForDetail, 
        ...res.data, 
        name: editName.trim(), 
        phone: editPhone.trim() 
      });
      
      setIsEditingProfile(false);
    } catch (error: any) {
      console.error("Error saving tutor profile:", error);
      toast.error(error.response?.data?.message || "Failed to update tutor profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleViewBookingDetail = (booking: any) => {
    setSelectedBookingForDetail(booking);
    setIsBookingDetailDialogOpen(true);
  };

  const formatDemoTiming = (val: string) => {
    if (!val) return "";
    const d = new Date(val);
    const dateStr = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${dateStr} at ${timeStr}`;
  };

  const handleBookVerificationDemo = async () => {
    if (!selectedTutorForDetail) return;
    if (!verificationDemoTiming) {
      toast.error("Please select a date and time for the demo class.");
      return;
    }
    
    const d = new Date(verificationDemoTiming);
    if (d < new Date()) {
      toast.error("You cannot book a demo class in the past.");
      return;
    }

    try {
      setIsBookingDemo(true);
      const timingStr = formatDemoTiming(verificationDemoTiming);
      await axios.post(`${API_URL}/tutors/${selectedTutorForDetail.id}/book-verification-demo`, {
        timing: timingStr,
        utcTiming: d.toISOString()
      });
      toast.success("Verification demo class booked successfully! A request has been sent to the tutor.");
      setVerificationDemoTiming("");
      fetchTutors();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to book verification demo class");
    } finally {
      setIsBookingDemo(false);
    }
  };

  const handleViewAnswers = (payment: any) => {
    setSelectedAssessmentPayment(payment);
    setEditedScores(payment.assessmentQuestionScores || {});
    setIsAnswersDialogOpen(true);
  };

  const handleSaveScores = async () => {
    if (!selectedAssessmentPayment) return;
    try {
      setIsSavingScores(true);
      const res = await axios.post(`${API_URL}/payments/assessment/${selectedAssessmentPayment._id}/update-score`, {
        questionScores: editedScores
      });
      toast.success("Assessment scores updated successfully!");
      setCoursePayments(prev => prev.map(p => p._id === selectedAssessmentPayment._id ? { ...p, assessmentScore: res.data.score, assessmentQuestionScores: res.data.questionScores } : p));
      setSelectedAssessmentPayment(prev => prev ? { ...prev, assessmentScore: res.data.score, assessmentQuestionScores: res.data.questionScores } : null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update scores");
    } finally {
      setIsSavingScores(false);
    }
  };

  const fetchPayouts = async () => {
    try {
      setLoadingPayouts(true);
      const res = await axios.get(`${API_URL}/dashboard/admin/payouts`);
      setPayouts(res.data);
    } catch (err) {
      toast.error("Failed to load payout calculations");
    } finally {
      setLoadingPayouts(false);
    }
  };

  const fetchCoursePayments = async () => {
    try {
      setLoadingCoursePayments(true);
      const res = await axios.get(`${API_URL}/dashboard/admin/course-payments`);
      setCoursePayments(res.data);
    } catch (err) {
      toast.error("Failed to load platform course payments");
    } finally {
      setLoadingCoursePayments(false);
    }
  };

  const fetchTutors = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/tutors`);
      setTutors(res.data);
      const studentRes = await axios.get(`${API_URL}/dashboard/admin/students`);
      setStudents(studentRes.data);
      const bookingsRes = await axios.get(`${API_URL}/dashboard/admin/bookings`);
      setBookings(bookingsRes.data);
      dispatch(fetchAdminStats());
      
      // Fetch payouts and course payments in the background
      fetchPayouts();
      fetchCoursePayments();
    } catch (err) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTutors();
    dispatch(fetchAdminStats());
  }, [dispatch]);

  // Poll for unread support messages
  useEffect(() => {
    if (!user?.id) return;
    
    const fetchUnreadCount = async () => {
      if (document.hidden) return;
      try {
        const res = await axios.get(`${API_URL}/messages/inbox/${user.id}`);
        const total = res.data.reduce((acc: number, c: any) => acc + (c.unreadCount || 0), 0);
        setUnreadMessagesCount(total);
      } catch (err) {
        console.error("Error fetching unread count", err);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 12000);
    return () => clearInterval(interval);
  }, [user?.id]);

  useEffect(() => {
    if (activeTab === "messages") {
      setUnreadMessagesCount(0);
    }
  }, [activeTab]);

  const pendingTutors = tutors.filter((t) => t.status === "pending");
  const approvedTutors = tutors.filter((t) => t.status === "approved");

  const matchesTutorSearch = (tutor: any, search: string) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();

    const name = String(tutor.name || tutor.full_name || "").toLowerCase();
    const email = String(tutor.email || tutor.userId?.email || "").toLowerCase();
    const phone = String(tutor.phone || tutor.userId?.phone || "").toLowerCase();
    const city = String(tutor.city || "").toLowerCase();
    const pincode = String(tutor.pincode || "").toLowerCase();
    const category = String(tutor.category || "").toLowerCase();
    const qualification = String(tutor.qualification || "").toLowerCase();
    const bio = String(tutor.bio || "").toLowerCase();
    const hearAboutUs = String(tutor.hearAboutUs || "").toLowerCase();
    const address = String(tutor.address || "").toLowerCase();
    const mode = String(tutor.mode || "").toLowerCase();
    const experience = String(tutor.experience || "").toLowerCase();
    const status = String(tutor.status || "").toLowerCase();

    const subjects = Array.isArray(tutor.subjects) ? tutor.subjects.join(" ").toLowerCase() : "";
    const classesTaught = Array.isArray(tutor.classesTaught) ? tutor.classesTaught.join(" ").toLowerCase() : "";
    const boardsTaught = Array.isArray(tutor.boardsTaught) ? tutor.boardsTaught.join(" ").toLowerCase() : "";

    return (
      name.includes(q) ||
      email.includes(q) ||
      phone.includes(q) ||
      city.includes(q) ||
      pincode.includes(q) ||
      category.includes(q) ||
      qualification.includes(q) ||
      bio.includes(q) ||
      hearAboutUs.includes(q) ||
      address.includes(q) ||
      mode.includes(q) ||
      experience.includes(q) ||
      status.includes(q) ||
      subjects.includes(q) ||
      classesTaught.includes(q) ||
      boardsTaught.includes(q)
    );
  };

  const filteredPendingTutors = pendingTutors.filter((t) => matchesTutorSearch(t, pendingTutorSearch));
  const filteredApprovedTutors = approvedTutors.filter((t) => matchesTutorSearch(t, approvedTutorSearch));

  const enrolledBookings = bookings.filter((b) => (b.status === "enrolled" || b.status === "completed") && (b.amountPaid || 0) > 0);
  const studentBookings = bookings.filter((b) => b.subject !== "Verification Demo Class");
  const verificationDemos = bookings.filter((b) => b.subject === "Verification Demo Class");

  const totalPlatformRevenue = enrolledBookings.reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);

  const handleApproval = async (tutorId: string, status: "approved" | "rejected") => {
    if (status === "rejected") {
      setRejectTutorId(tutorId);
      setRejectionReason("");
      setIsRejectDialogOpen(true);
      return;
    }

    try {
      await axios.put(`${API_URL}/tutors/${tutorId}/admin`, { status });
      toast.success(`Tutor ${status} successfully!`);
      fetchTutors();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const submitRejection = async () => {
    if (!rejectTutorId || !rejectionReason.trim()) {
      toast.error("Please enter a reason for rejection.");
      return;
    }
    try {
      setIsRejecting(true);
      await axios.put(`${API_URL}/tutors/${rejectTutorId}/admin`, {
        status: "rejected",
        rejectionReason: rejectionReason.trim(),
      });
      toast.success("Tutor application rejected with reason.");
      setIsRejectDialogOpen(false);
      setRejectTutorId(null);
      setRejectionReason("");
      fetchTutors();
    } catch (err) {
      toast.error("Failed to reject tutor application");
    } finally {
      setIsRejecting(false);
    }
  };

  const toggleFeatured = async (tutor: any) => {
    try {
      await axios.put(`${API_URL}/tutors/${tutor.id}/admin`, { featured: !tutor.featured });
      toast.success(tutor.featured ? "Removed from featured" : "Added to featured");
      fetchTutors();
    } catch (err) {
      toast.error("Failed to update featured status");
    }
  };

  const toggleVerified = async (tutor: any) => {
    try {
      await axios.put(`${API_URL}/tutors/${tutor.id}/admin`, { isVerified: !tutor.isVerified });
      toast.success(tutor.isVerified ? "Removed verified badge" : "Granted verified badge");
      fetchTutors();
    } catch (err) {
      toast.error("Failed to update verification status");
    }
  };

  const handleDeleteTutor = async (tutorId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete tutor "${name}" and their associated user login account? This action cannot be undone.`)) {
      return;
    }
    try {
      await axios.delete(`${API_URL}/tutors/${tutorId}/admin`);
      toast.success(`Tutor "${name}" deleted successfully.`);
      fetchTutors();
    } catch (err) {
      toast.error("Failed to delete tutor account");
    }
  };

  const handleDeleteStudent = async (studentId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete student "${name}" and their associated booking/payment history? This action cannot be undone.`)) {
      return;
    }
    try {
      await axios.delete(`${API_URL}/dashboard/admin/students/${studentId}`);
      toast.success(`Student "${name}" deleted successfully.`);
      fetchTutors();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete student account");
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, status: string) => {
    try {
      await axios.put(`${API_URL}/tutors/booking/${bookingId}/status`, { status });
      toast.success(`Booking status updated to ${status} successfully.`);
      fetchTutors();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update booking status");
    }
  };

  const handleShortlist = async (coursePaymentId: string) => {
    try {
      toast.loading("Shortlisting student and sending email invitation...");
      const res = await axios.post(`${API_URL}/payments/shortlist-student`, { coursePaymentId });
      toast.dismiss();
      toast.success(res.data.message || "Student shortlisted successfully!");
      fetchCoursePayments();
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.response?.data?.message || "Failed to shortlist student");
    }
  };

  const geoStats = adminStats?.geoStats || { North: 0, South: 0, East: 0, West: 0, Unspecified: 0 };
  const topCitiesData = adminStats?.topCities || [];

  const pieData = [
    { name: "North India", value: geoStats.North || 0, color: "#6366f1" },
    { name: "South India", value: geoStats.South || 0, color: "#10b981" },
    { name: "East India", value: geoStats.East || 0, color: "#f59e0b" },
    { name: "West India", value: geoStats.West || 0, color: "#0ea5e9" },
    { name: "Unspecified/Other", value: geoStats.Unspecified || 0, color: "#94a3b8" }
  ].filter(d => d.value > 0);

  return (
    <PageLayout>
      <div className="container py-10 max-w-7xl">
        <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">Admin Dashboard</h1>
            <p className="text-base text-muted-foreground mt-1.5">Manage platform operations, verify tutor credentials, and track ledger analytics.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
            <Button 
              onClick={handleSendProfileEmails} 
              disabled={isSendingProfileEmails} 
              variant="default" 
              className="h-10 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all duration-300 rounded-lg shadow-sm"
            >
              <Mail className={`h-4 w-4 ${isSendingProfileEmails ? 'animate-bounce' : ''}`} />
              Send Board & Class Reminder Emails
            </Button>
            <Button 
              onClick={handleSendReferralEmails} 
              disabled={isSendingReferralEmails} 
              variant="default" 
              className="h-10 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-all duration-300 rounded-lg shadow-sm"
            >
              <Sparkles className={`h-4 w-4 ${isSendingReferralEmails ? 'animate-bounce' : ''}`} />
              Send Referral Program Emails
            </Button>
            <Button 
              onClick={handleDownloadTutorsCSV} 
              disabled={loading || tutors.length === 0}
              variant="outline" 
              className="h-10 gap-2 border-indigo-200/60 hover:bg-indigo-50 hover:text-indigo-700 dark:border-indigo-900/40 dark:hover:bg-indigo-950/20 transition-all duration-300 rounded-lg shadow-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Activity className="h-4 w-4 animate-spin text-indigo-500" />
              ) : (
                <FileText className="h-4 w-4 text-indigo-500" />
              )}
              {loading ? "Loading Tutors..." : "Download Tutors CSV"}
            </Button>
            <Button 
              onClick={fetchTutors} 
              disabled={loading} 
              variant="outline" 
              className="h-10 gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all duration-300 rounded-lg shadow-sm"
            >
              <Activity className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Platform Data
            </Button>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5 mb-10">
          {[
            { icon: Clock, label: "Pending Approvals", value: adminStats?.pendingApprovals || pendingTutors.length, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-900/20" },
            { icon: Users, label: "Active Tutors", value: adminStats?.activeTutors || approvedTutors.length, color: "text-sky-500", bg: "bg-sky-50 dark:bg-sky-950/20 border border-sky-200/40 dark:border-sky-900/20" },
            { icon: GraduationCap, label: "Total Students", value: adminStats?.totalStudents !== undefined ? adminStats.totalStudents : students.length, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200/40 dark:border-indigo-900/20" },
            { icon: BookOpen, label: "Total Bookings", value: adminStats?.totalBookings || bookings.length, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950/20 border border-violet-200/40 dark:border-violet-900/20" },
            { icon: DollarSign, label: "Total Revenue", value: `₹${totalPlatformRevenue}`, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/40 dark:border-emerald-900/20" },
          ].map((stat) => (
            <Card key={stat.label} className="border border-border/50 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-card/60 backdrop-blur-md">
              <CardContent className="flex items-center gap-5 p-6">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${stat.bg}`}>
                  <stat.icon className={`h-7 w-7 ${stat.color}`} />
                </div>
                <div>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16 mb-1" />
                  ) : (
                    <p className="text-3xl font-extrabold text-foreground tracking-tight">
                      {String(stat.value)}
                    </p>
                  )}
                  <p className="text-sm font-medium text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-secondary/40 p-1 rounded-xl shadow-sm border mb-4 h-auto justify-start w-full overflow-x-auto whitespace-nowrap">
            <TabsTrigger value="approvals" className="rounded-lg px-6 py-2.5 shrink-0 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              Tutor Approvals 
              {pendingTutors.length > 0 && (
                <Badge variant="destructive" className="ml-2 rounded-full px-2 py-0.5 text-[10px] bg-rose-500 text-white font-extrabold border-none">
                  {pendingTutors.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="verification-demos" className="rounded-lg px-6 py-2.5 shrink-0 data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-1.5">
              Verification Demos
              {verificationDemos.filter(b => b.status === 'pending').length > 0 && (
                <Badge variant="destructive" className="ml-1.5 rounded-full px-2 py-0.5 text-[10px] bg-amber-500 text-white font-extrabold border-none">
                  {verificationDemos.filter(b => b.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tutors" className="rounded-lg px-6 py-2.5 shrink-0 data-[state=active]:bg-card data-[state=active]:shadow-sm">All Tutors</TabsTrigger>
            <TabsTrigger value="students" className="rounded-lg px-6 py-2.5 shrink-0 data-[state=active]:bg-card data-[state=active]:shadow-sm">Students</TabsTrigger>
            <TabsTrigger value="bookings" className="rounded-lg px-6 py-2.5 shrink-0 data-[state=active]:bg-card data-[state=active]:shadow-sm">Bookings</TabsTrigger>
            <TabsTrigger value="payments" className="rounded-lg px-6 py-2.5 shrink-0 data-[state=active]:bg-card data-[state=active]:shadow-sm">Payments</TabsTrigger>
            <TabsTrigger value="platform-courses" className="rounded-lg px-6 py-2.5 shrink-0 data-[state=active]:bg-card data-[state=active]:shadow-sm">Platform Courses</TabsTrigger>
            <TabsTrigger value="payouts" className="rounded-lg px-6 py-2.5 shrink-0 data-[state=active]:bg-card data-[state=active]:shadow-sm">Tutor Payouts</TabsTrigger>
            <TabsTrigger value="geo-analytics" className="rounded-lg px-6 py-2.5 shrink-0 data-[state=active]:bg-card data-[state=active]:shadow-sm">Geo Analytics</TabsTrigger>
            <TabsTrigger value="messages" className="rounded-lg px-6 py-2.5 shrink-0 data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-1.5">
              Messages
              {unreadMessagesCount > 0 && (
                <Badge variant="destructive" className="ml-1 rounded-full px-2 py-0.5 text-[10px] bg-rose-500 text-white font-extrabold border-none">
                  {unreadMessagesCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="approvals">
            <Card className="shadow-lg border border-border/50 bg-card/60 backdrop-blur-md overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2 font-bold text-foreground">
                  <Shield className="h-5 w-5 text-amber-500" /> Pending Tutor Approvals
                </CardTitle>
                <CardDescription>Review credentials and approve applications of newly registered tutors.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search pending applications by name, email, city, subject..."
                      value={pendingTutorSearch}
                      onChange={(e) => setPendingTutorSearch(e.target.value)}
                      className="pl-9 pr-8 rounded-xl bg-secondary/20 border-border/60 focus:bg-background transition-all"
                    />
                    {pendingTutorSearch && (
                      <button
                        onClick={() => setPendingTutorSearch("")}
                        className="absolute right-2.5 top-2.5 text-xs text-muted-foreground hover:text-foreground p-0.5 rounded-full hover:bg-secondary"
                        title="Clear search"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground font-medium self-end sm:self-center">
                    Showing <strong className="text-foreground">{filteredPendingTutors.length}</strong> of {pendingTutors.length} pending
                  </div>
                </div>

                {loading ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-12 w-full rounded-lg" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                  </div>
                ) : pendingTutors.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-secondary/5 rounded-2xl border border-dashed border-border/70 mt-4 max-w-lg mx-auto">
                    <CheckCircle className="mx-auto mb-4 h-16 w-16 opacity-30 text-emerald-500" />
                    <h3 className="text-lg font-bold text-foreground mb-1">You're All Caught Up</h3>
                    <p className="text-sm">There are no pending tutor approvals at this time.</p>
                  </div>
                ) : filteredPendingTutors.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-secondary/5 rounded-2xl border border-dashed border-border/70 mt-4 max-w-lg mx-auto">
                    <Search className="mx-auto mb-4 h-12 w-12 opacity-30 text-muted-foreground" />
                    <h3 className="text-lg font-bold text-foreground mb-1">No Matching Applications</h3>
                    <p className="text-sm text-muted-foreground mb-4">No pending applications matched "{pendingTutorSearch}".</p>
                    <Button variant="outline" size="sm" onClick={() => setPendingTutorSearch("")} className="rounded-lg">
                      Clear Search Filter
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-xl border shadow-sm overflow-hidden bg-card mt-4">
                    <Table>
                      <TableHeader className="bg-secondary/30 uppercase text-[10px] tracking-wider text-muted-foreground font-bold border-b border-border/40">
                        <TableRow>
                          <TableHead className="font-bold h-12">Tutor Profile</TableHead>
                          <TableHead className="font-bold h-12">Email</TableHead>
                          <TableHead className="font-bold h-12">Category</TableHead>
                          <TableHead className="font-bold h-12">City</TableHead>
                          <TableHead className="font-bold h-12">Referral Source</TableHead>
                          <TableHead className="font-bold h-12">Subjects</TableHead>
                          <TableHead className="font-bold h-12">Experience</TableHead>
                          <TableHead className="font-bold h-12">Resume / CV</TableHead>
                          <TableHead className="font-bold h-12">Applied</TableHead>
                          <TableHead className="font-bold h-12 text-right px-6">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPendingTutors.map((tutor) => (
                          <TableRow key={tutor.id} className="hover:bg-secondary/10 transition-colors border-b border-border/40">
                            <TableCell className="py-3 cursor-pointer hover:bg-secondary/20 transition-all rounded-l-lg" onClick={() => handleViewTutorDetail(tutor)} title="Click to view full tutor details">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full border border-primary/10 shadow-sm overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                                  {tutor.photo || tutor.avatar ? (
                                    <img 
                                      src={resolveAssetUrl(tutor.photo || tutor.avatar)} 
                                      alt={tutor.name} 
                                      className="h-full w-full object-cover" 
                                      onError={(e: any) => {
                                        e.target.onerror = null;
                                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.name || "T")}&background=random`;
                                      }}
                                    />
                                  ) : (
                                    <span className="font-bold text-sm text-primary uppercase">
                                      {(tutor.name || "T").charAt(0)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-foreground leading-tight text-sm capitalize">{tutor.name || "–"}</span>
                                  <span className="text-[11px] text-muted-foreground mt-0.5">{tutor.city || "Remote"}{tutor.pincode ? ` (${tutor.pincode})` : ""}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium text-foreground text-sm">{tutor.email || "–"}</TableCell>
                            <TableCell><Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs font-semibold">{tutor.category}</Badge></TableCell>
                            <TableCell className="font-semibold text-foreground text-sm capitalize">
                              {tutor.city || "Remote"}
                              {tutor.pincode && <span className="text-xs text-muted-foreground block font-normal">{tutor.pincode}</span>}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate" title={tutor.hearAboutUs || "–"}>{tutor.hearAboutUs || "–"}</TableCell>
                            <TableCell className="max-w-[180px] text-sm">
                              <div className="font-semibold text-foreground truncate" title={tutor.subjects?.join(", ")}>{tutor.subjects?.join(", ") || "–"}</div>
                              {tutor.boardsTaught && tutor.boardsTaught.length > 0 && (
                                <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium truncate mt-0.5" title={`Boards: ${tutor.boardsTaught.join(", ")}`}>
                                  📋 {tutor.boardsTaught.join(", ")}
                                </div>
                              )}
                              {tutor.classesTaught && tutor.classesTaught.length > 0 && (
                                <div className="text-[11px] text-primary font-medium truncate mt-0.5" title={`Classes: ${tutor.classesTaught.join(", ")}`}>
                                  🎓 {tutor.classesTaught.join(", ")}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-sm font-medium">{tutor.experience} yrs</TableCell>
                            <TableCell>
                              {tutor.verificationDocument ? (
                                <a 
                                  href={resolveAssetUrl(tutor.verificationDocument)} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:hover:bg-indigo-950/50 py-1.5 px-3 rounded-lg border border-indigo-100 dark:border-indigo-900/20 inline-flex items-center gap-1 transition-all"
                                >
                                  📄 View Resume/CV
                                </a>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">No document</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                              {tutor.createdAt ? new Date(tutor.createdAt).toLocaleDateString() : "–"}
                            </TableCell>
                            <TableCell className="text-right px-6 py-3">
                              <div className="flex justify-end gap-2.5">
                                <Button 
                                  size="sm" 
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-0.5 rounded-lg h-9 px-3" 
                                  onClick={() => handleApproval(tutor.id, "approved")}
                                >
                                  <CheckCircle className="mr-1.5 h-4 w-4" /> Approve
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/20 rounded-lg h-9 px-3 transition-all duration-200" 
                                  onClick={() => handleApproval(tutor.id, "rejected")}
                                >
                                  <XCircle className="mr-1.5 h-4 w-4" /> Reject
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 rounded-lg h-9 px-3 transition-all duration-200" 
                                  onClick={() => handleDeleteTutor(tutor.id, tutor.name)}
                                >
                                  <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tutors">
            <Card className="shadow-lg border border-border/50 bg-card/60 backdrop-blur-md overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2 font-bold text-foreground">
                  <Users className="h-5 w-5 text-blue-500" /> All Approved Tutors
                </CardTitle>
                <CardDescription>Manage active tutors and customize their homepage featured status.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tutors by name, email, phone, city, subject, board, class..."
                      value={approvedTutorSearch}
                      onChange={(e) => setApprovedTutorSearch(e.target.value)}
                      className="pl-9 pr-8 rounded-xl bg-secondary/20 border-border/60 focus:bg-background transition-all"
                    />
                    {approvedTutorSearch && (
                      <button
                        onClick={() => setApprovedTutorSearch("")}
                        className="absolute right-2.5 top-2.5 text-xs text-muted-foreground hover:text-foreground p-0.5 rounded-full hover:bg-secondary"
                        title="Clear search"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground font-medium self-end sm:self-center">
                    Showing <strong className="text-foreground">{filteredApprovedTutors.length}</strong> of {approvedTutors.length} tutors
                  </div>
                </div>

                {loading ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-12 w-full rounded-lg" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                  </div>
                ) : approvedTutors.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-secondary/5 rounded-2xl border border-dashed border-border/70 mt-4 max-w-lg mx-auto">
                    <Users className="mx-auto mb-4 h-16 w-16 opacity-30 text-blue-500" />
                    <h3 className="text-lg font-bold text-foreground mb-1">No Active Tutors Found</h3>
                    <p className="text-sm">Tutor profiles will appear here once approved.</p>
                  </div>
                ) : filteredApprovedTutors.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-secondary/5 rounded-2xl border border-dashed border-border/70 mt-4 max-w-lg mx-auto">
                    <Search className="mx-auto mb-4 h-12 w-12 opacity-30 text-muted-foreground" />
                    <h3 className="text-lg font-bold text-foreground mb-1">No Matching Tutors Found</h3>
                    <p className="text-sm text-muted-foreground mb-4">No tutors matched "{approvedTutorSearch}".</p>
                    <Button variant="outline" size="sm" onClick={() => setApprovedTutorSearch("")} className="rounded-lg">
                      Clear Search Filter
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-xl border shadow-sm overflow-hidden bg-card mt-4">
                    <Table>
                      <TableHeader className="bg-secondary/30 uppercase text-[10px] tracking-wider text-muted-foreground font-bold border-b border-border/40">
                        <TableRow>
                          <TableHead className="font-bold h-12">Tutor Profile</TableHead>
                          <TableHead className="font-bold h-12">Category</TableHead>
                          <TableHead className="font-bold h-12">City</TableHead>
                          <TableHead className="font-bold h-12">Referral Source</TableHead>
                          <TableHead className="font-bold h-12">Referrals (Completed/Invited)</TableHead>
                          <TableHead className="font-bold h-12">Subjects/Boards/Classes</TableHead>
                          <TableHead className="font-bold h-12">Status</TableHead>
                          <TableHead className="font-bold h-12">Resume / CV</TableHead>
                          <TableHead className="font-bold h-12 text-center">Verified</TableHead>
                          <TableHead className="font-bold h-12 text-center">Featured</TableHead>
                          <TableHead className="font-bold h-12">Joined</TableHead>
                          <TableHead className="font-bold h-12 text-right px-6">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredApprovedTutors.map((tutor) => (
                          <TableRow key={tutor.id} className="hover:bg-secondary/10 transition-colors border-b border-border/40">
                            <TableCell className="py-3 cursor-pointer hover:bg-secondary/20 transition-all rounded-l-lg" onClick={() => handleViewTutorDetail(tutor)} title="Click to view full tutor details">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full border border-primary/10 shadow-sm overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                                  {tutor.photo || tutor.avatar ? (
                                    <img 
                                      src={resolveAssetUrl(tutor.photo || tutor.avatar)} 
                                      alt={tutor.name} 
                                      className="h-full w-full object-cover" 
                                      onError={(e: any) => {
                                        e.target.onerror = null;
                                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.name || "T")}&background=random`;
                                      }}
                                    />
                                  ) : (
                                    <span className="font-bold text-sm text-primary uppercase">
                                      {(tutor.name || "T").charAt(0)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-foreground leading-tight text-sm capitalize">{tutor.name || "–"}</span>
                                  <span className="text-[11px] text-muted-foreground mt-0.5">{tutor.city || "Remote"}{tutor.pincode ? ` (${tutor.pincode})` : ""}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell><Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs font-semibold">{tutor.category}</Badge></TableCell>
                            <TableCell className="font-semibold text-foreground text-sm capitalize">
                              {tutor.city || "Remote"}
                              {tutor.pincode && <span className="text-xs text-muted-foreground block font-normal">{tutor.pincode}</span>}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate" title={tutor.hearAboutUs || "–"}>{tutor.hearAboutUs || "–"}</TableCell>
                            <TableCell className="text-sm text-foreground">
                              <div className="flex flex-col">
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                  {tutor.referralsCompleted ?? 0} <span className="text-[10px] text-muted-foreground font-normal">/ {tutor.referralsInvited ?? 0}</span>
                                </span>
                                {(tutor.referralsEarnings ?? 0) > 0 && (
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-500 font-semibold">
                                    ₹{tutor.referralsEarnings} earned
                                  </span>
                                )}
                              </div>
                            </TableCell>
                             <TableCell className="max-w-[180px] text-sm">
                               <div className="font-semibold text-foreground truncate" title={tutor.subjects?.join(", ")}>{tutor.subjects?.join(", ") || "–"}</div>
                               {tutor.boardsTaught && tutor.boardsTaught.length > 0 && (
                                 <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium truncate mt-0.5" title={`Boards: ${tutor.boardsTaught.join(", ")}`}>
                                   📋 {tutor.boardsTaught.join(", ")}
                                 </div>
                               )}
                               {tutor.classesTaught && tutor.classesTaught.length > 0 && (
                                 <div className="text-[11px] text-primary font-medium truncate mt-0.5" title={`Classes: ${tutor.classesTaught.join(", ")}`}>
                                   🎓 {tutor.classesTaught.join(", ")}
                                 </div>
                               )}
                             </TableCell>
                            <TableCell>
                              <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/30 text-xs font-semibold">Active</Badge>
                            </TableCell>
                            <TableCell>
                              {tutor.verificationDocument ? (
                                <a 
                                  href={resolveAssetUrl(tutor.verificationDocument)} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:hover:bg-indigo-950/50 py-1.5 px-3 rounded-lg border border-indigo-100 dark:border-indigo-900/20 inline-flex items-center gap-1 transition-all"
                                >
                                  📄 View Resume/CV
                                </a>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">No document</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {tutor.isVerified ? (
                                <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/30 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleVerified(tutor)}>
                                  <CheckCircle className="h-3.5 w-3.5 fill-blue-500 text-white" /> Verified
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground italic cursor-pointer hover:underline" onClick={() => toggleVerified(tutor)}>Not Verified</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {tutor.featured ? (
                                <Star className="h-5 w-5 fill-amber-400 text-amber-500 mx-auto drop-shadow-sm filter animate-wiggle" />
                              ) : (
                                <Star className="h-5 w-5 text-muted-foreground opacity-30 mx-auto" />
                              )}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                              {tutor.createdAt ? new Date(tutor.createdAt).toLocaleDateString() : "–"}
                            </TableCell>
                            <TableCell className="text-right px-6 py-3">
                              <div className="flex justify-end gap-2.5">
                                <Button 
                                  size="sm" 
                                  variant={tutor.isVerified ? "outline" : "default"} 
                                  className={`rounded-lg h-9 px-3 transition-all duration-300 hover:-translate-y-0.5 ${
                                    tutor.isVerified 
                                      ? "border-blue-500/50 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20" 
                                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-blue-500/20"
                                  }`} 
                                  onClick={() => toggleVerified(tutor)}
                                >
                                  {tutor.isVerified ? "Remove Badge" : "Give Verified"}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant={tutor.featured ? "outline" : "default"} 
                                  className={`rounded-lg h-9 px-3 transition-all duration-300 hover:-translate-y-0.5 ${
                                    tutor.featured 
                                      ? "border-amber-500/50 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20" 
                                      : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-indigo-500/20"
                                  }`} 
                                  onClick={() => toggleFeatured(tutor)}
                                >
                                  {tutor.featured ? "Remove Featured" : "Make Featured"}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/20 rounded-lg h-9 px-3 transition-all duration-200" 
                                  onClick={() => handleApproval(tutor.id, "rejected")}
                                >
                                  <XCircle className="mr-1.5 h-4 w-4" /> Disapprove
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 rounded-lg h-9 px-3 transition-all duration-200" 
                                  onClick={() => handleDeleteTutor(tutor.id, tutor.name)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students">
            <Card className="shadow-md border-border/50">
              <CardHeader className="bg-secondary/20 border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2"><Users className="h-5 w-5 text-indigo-500" /> Registered Students</CardTitle>
                <CardDescription>View all students on the platform.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="mb-4 relative max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students by name..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="pl-9 rounded-lg"
                    disabled={loading}
                  />
                </div>
                {(() => {
                  const filteredStudents = students.filter(student =>
                    (student.full_name || "").toLowerCase().includes(studentSearch.toLowerCase())
                  );

                  if (loading) {
                    return (
                      <div className="space-y-4 py-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    );
                  }

                  if (students.length === 0) {
                    return (
                      <div className="py-16 text-center text-muted-foreground bg-secondary/10 rounded-2xl border border-dashed mt-4">
                        <Users className="mx-auto mb-4 h-16 w-16 opacity-30 text-indigo-500" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">No Students Found</h3>
                        <p>No students have registered yet.</p>
                      </div>
                    );
                  }

                  if (filteredStudents.length === 0) {
                    return (
                      <div className="py-16 text-center text-muted-foreground bg-secondary/5 rounded-2xl border border-dashed mt-4">
                        <Search className="mx-auto mb-4 h-12 w-12 opacity-30 text-muted-foreground" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">No Match Found</h3>
                        <p>No students match the name "{studentSearch}".</p>
                      </div>
                    );
                  }

                  return (
                    <div className="rounded-xl border shadow-sm overflow-x-auto mt-4">
                      <Table>
                        <TableHeader className="bg-secondary/50 uppercase text-xs">
                          <TableRow>
                            <TableHead className="font-medium h-12">Student ID</TableHead>
                            <TableHead className="font-medium h-12">Full Name</TableHead>
                            <TableHead className="font-medium h-12">Email</TableHead>
                            <TableHead className="font-medium h-12">Contact</TableHead>
                            <TableHead className="font-medium h-12">Class / Grade</TableHead>
                            <TableHead className="font-medium h-12">Source</TableHead>
                            <TableHead className="font-medium h-12 text-right">Joined</TableHead>
                            <TableHead className="font-medium h-12 text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredStudents.map((student) => (
                            <TableRow key={student._id || student.id} className="hover:bg-secondary/10 transition-colors">
                              <TableCell className="font-mono text-xs text-muted-foreground">{String(student._id || student.id).slice(-8)}</TableCell>
                              <TableCell 
                                className="font-semibold text-foreground cursor-pointer hover:underline hover:text-primary transition-all" 
                                onClick={() => handleViewStudentDetail(student)} 
                                title="Click to view student details"
                              >
                                {student.full_name || "–"}
                              </TableCell>
                              <TableCell>{student.email || "–"}</TableCell>
                              <TableCell>{student.phone || "–"}</TableCell>
                              <TableCell><Badge variant="outline" className="font-normal bg-secondary/20">{student.student_class || student.studentClass || "–"}</Badge></TableCell>
                              <TableCell className="text-muted-foreground text-xs">{student.heard_about_us || student.heardAboutUs || "–"}</TableCell>
                              <TableCell className="text-right">{new Date(student.createdAt).toLocaleDateString()}</TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 rounded-lg h-9 px-3 transition-all duration-200" 
                                  onClick={() => handleDeleteStudent(student._id || student.id, student.full_name || "Student")}
                                  title="Delete student account"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="verification-demos">
            <Card className="shadow-lg border border-border/50 bg-card/60 backdrop-blur-md overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2 font-bold text-foreground">
                  <Video className="h-5 w-5 text-blue-500" /> Tutor Verification Demos
                </CardTitle>
                <CardDescription>Monitor and join scheduled mock classes for tutor profile verification.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {loading ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-12 w-full rounded-lg" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                  </div>
                ) : verificationDemos.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-secondary/5 rounded-2xl border border-dashed border-border/70 mt-4 max-w-lg mx-auto">
                    <Video className="mx-auto mb-4 h-16 w-16 opacity-30 text-blue-500" />
                    <h3 className="text-lg font-bold text-foreground mb-1">No Verification Demos Requested</h3>
                    <p className="text-sm">Requested demo classes for verification will appear here.</p>
                  </div>
                ) : (
                  <div className="rounded-xl border shadow-sm overflow-hidden bg-card mt-4">
                    <Table>
                      <TableHeader className="bg-secondary/30 uppercase text-[10px] tracking-wider text-muted-foreground font-bold border-b border-border/40">
                        <TableRow>
                          <TableHead className="font-bold h-12">Tutor Name</TableHead>
                          <TableHead className="font-bold h-12">Booking ID</TableHead>
                          <TableHead className="font-bold h-12">Timing</TableHead>
                          <TableHead className="font-bold h-12 text-center">Status</TableHead>
                          <TableHead className="font-bold h-12 text-center">Video Room</TableHead>
                          <TableHead className="font-bold h-12 text-right px-6">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {verificationDemos.map((demo) => (
                          <TableRow key={demo._id} className="hover:bg-secondary/10 transition-colors border-b border-border/40">
                            <TableCell className="py-3 font-semibold text-foreground">
                              {demo.tutorName || "Unknown Tutor"}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {String(demo._id).slice(-8)}
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {demo.timing}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={`px-2.5 py-1 border-none font-bold text-xs ${
                                demo.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                demo.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                demo.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {demo.status.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {['confirmed', 'pending'].includes(demo.status) ? (
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm flex items-center gap-1 mx-auto"
                                  asChild
                                >
                                  <a
                                    href={getMeetingHref(demo.meetingLink, demo._id, "Admin Moderator", "", "Verification Demo Class")}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Video className="h-4 w-4" /> Join Room
                                  </a>
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">Unavailable</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right px-6 py-3">
                              <div className="flex justify-end gap-2">
                                {demo.status === 'confirmed' && (
                                  <Button
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 px-3 rounded-lg"
                                    onClick={() => handleUpdateBookingStatus(demo._id, 'completed')}
                                  >
                                    Mark Completed
                                  </Button>
                                )}
                                {['pending', 'confirmed'].includes(demo.status) && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 font-bold h-9 px-3 rounded-lg"
                                    onClick={() => {
                                      if (window.confirm("Are you sure you want to cancel this verification demo booking?")) {
                                        handleUpdateBookingStatus(demo._id, 'cancelled');
                                      }
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-9 font-semibold text-xs rounded-lg"
                                  onClick={() => handleViewBookingDetail(demo)}
                                >
                                  View Details
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card className="shadow-md border-border/50">
              <CardHeader className="bg-secondary/20 border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2"><BookOpen className="h-5 w-5 text-purple-500" /> All Platform Bookings</CardTitle>
                <CardDescription>Track both demos and enrolled classes across all users.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {loading ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : studentBookings.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-secondary/10 rounded-2xl border border-dashed mt-4">
                    <BookOpen className="mx-auto mb-4 h-16 w-16 opacity-30 text-purple-500" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Bookings Yet</h3>
                    <p>There are no active bookings on the platform.</p>
                  </div>
                ) : (
                  <div className="rounded-xl border shadow-sm overflow-x-auto mt-4">
                    <Table>
                      <TableHeader className="bg-secondary/50 uppercase text-xs">
                        <TableRow>
                          <TableHead className="font-medium h-12">Booking ID</TableHead>
                          <TableHead className="font-medium h-12">Tutor Name</TableHead>
                          <TableHead className="font-medium h-12">Student Name</TableHead>
                          <TableHead className="font-medium h-12">Timing</TableHead>
                          <TableHead className="font-medium h-12">Status</TableHead>
                          <TableHead className="font-medium h-12">Created At</TableHead>
                          <TableHead className="font-medium h-12 text-right px-6">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentBookings.map((booking) => (
                          <TableRow 
                            key={booking._id} 
                            className="hover:bg-secondary/10 transition-colors cursor-pointer"
                            onClick={() => handleViewBookingDetail(booking)}
                          >
                            <TableCell className="font-mono text-xs text-muted-foreground">{String(booking._id).slice(-8)}</TableCell>
                            <TableCell className="font-semibold text-foreground">{booking.tutorName || "Unknown"}</TableCell>
                            <TableCell>{booking.studentName || "Anonymous"}</TableCell>
                            <TableCell className="text-sm">{booking.timing}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`border-none ${
                                booking.status === 'enrolled' ? 'bg-indigo-100 text-indigo-700' :
                                booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                booking.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                'bg-secondary text-secondary-foreground'
                              }`}>
                                {booking.status.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{new Date(booking.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right px-6" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 font-semibold text-xs rounded-lg"
                                onClick={() => handleViewBookingDetail(booking)}
                              >
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card className="shadow-md border-border/50">
              <CardHeader className="bg-secondary/20 border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2"><Activity className="h-5 w-5 text-emerald-500" /> Platform Payments</CardTitle>
                <CardDescription>Monitor successful transactions and platform revenue.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {loading ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : enrolledBookings.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-secondary/10 rounded-2xl border border-dashed mt-4">
                    <CreditCard className="mx-auto mb-4 h-16 w-16 opacity-30 text-emerald-500" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Payments Recorded</h3>
                    <p>There are no successful course enrollments yet.</p>
                  </div>
                ) : (
                  <div className="rounded-xl border shadow-sm overflow-x-auto mt-4">
                    <Table>
                      <TableHeader className="bg-secondary/50 uppercase text-xs">
                        <TableRow>
                          <TableHead className="font-medium h-12">Date</TableHead>
                          <TableHead className="font-medium h-12">Student</TableHead>
                          <TableHead className="font-medium h-12">Tutor</TableHead>
                          <TableHead className="font-medium h-12">Course Subject</TableHead>
                          <TableHead className="font-medium h-12">Plan</TableHead>
                          <TableHead className="font-medium h-12 text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {enrolledBookings.map((payment) => (
                          <TableRow key={payment._id} className="hover:bg-secondary/10 transition-colors">
                            <TableCell>{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell className="font-semibold text-foreground">{payment.studentName}</TableCell>
                            <TableCell>{payment.tutorName}</TableCell>
                            <TableCell>{payment.subject}</TableCell>
                            <TableCell><Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">{payment.planType}</Badge></TableCell>
                            <TableCell className="text-right font-bold text-emerald-600 text-lg">₹{payment.amountPaid}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="platform-courses">
            <Card className="shadow-lg border border-border/50 bg-card/60 backdrop-blur-md overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-teal-500/10 via-teal-500/5 to-transparent border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2 font-bold text-foreground">
                  <Sparkles className="h-5 w-5 text-teal-600" /> Platform Direct Courses Ledger
                </CardTitle>
                <CardDescription>Monitor direct course payments and assessment registrations separate from tutor payouts.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                
                {/* Course stats block */}
                {(() => {
                  const completedPayments = coursePayments.filter(p => p.status === 'completed');
                  const totalCourseCollected = completedPayments.reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);
                  const assessmentsCount = completedPayments.filter(p => p.purchaseType === 'assessment').length;
                  const fullCourseCount = completedPayments.filter(p => p.purchaseType === 'full_course').length;

                  return (
                    <div className="grid gap-4 sm:grid-cols-3 bg-teal-500/5 p-4 rounded-xl border border-teal-500/10 mb-2">
                      <div className="text-center p-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Total Course Revenue</span>
                        <span className="text-2xl font-extrabold text-teal-600 mt-1 block">₹{totalCourseCollected}</span>
                      </div>
                      <div className="text-center p-2 border-x border-border/40">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Assessments Registered</span>
                        <span className="text-2xl font-extrabold text-foreground mt-1 block">{assessmentsCount}</span>
                      </div>
                      <div className="text-center p-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Full Course Enrollments</span>
                        <span className="text-2xl font-extrabold text-indigo-600 mt-1 block">{fullCourseCount}</span>
                      </div>
                    </div>
                  );
                })()}

                {loadingCoursePayments ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                ) : coursePayments.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-secondary/5 rounded-2xl border border-dashed border-border/70 mt-4 max-w-lg mx-auto">
                    <CreditCard className="mx-auto mb-4 h-16 w-16 opacity-30 text-teal-600" />
                    <h3 className="text-lg font-bold text-foreground mb-1">No Course Purchases Yet</h3>
                    <p className="text-sm">Direct platform course transactions will appear here once student checkouts are recorded.</p>
                  </div>
                ) : (
                  <div className="rounded-xl border shadow-sm overflow-hidden bg-card mt-4">
                    <Table>
                      <TableHeader className="bg-secondary/30 uppercase text-[10px] tracking-wider text-muted-foreground font-bold border-b border-border/40">
                        <TableRow>
                          <TableHead className="font-bold h-12">Date</TableHead>
                          <TableHead className="font-bold h-12">Student Name</TableHead>
                          <TableHead className="font-bold h-12">Email</TableHead>
                          <TableHead className="font-bold h-12">Purchase Type</TableHead>
                          <TableHead className="font-bold h-12">Payment Status</TableHead>
                          <TableHead className="font-bold h-12">Assessment Status</TableHead>
                          <TableHead className="font-bold h-12 text-right">Amount</TableHead>
                          <TableHead className="font-bold h-12 text-right px-6">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {coursePayments.map((payment) => (
                          <TableRow key={payment._id} className="hover:bg-secondary/10 transition-colors border-b border-border/40">
                            <TableCell className="text-sm">{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell className="font-semibold text-foreground text-sm">{payment.studentName}</TableCell>
                            <TableCell className="text-sm">{payment.studentEmail}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`font-bold ${
                                payment.purchaseType === 'full_course' 
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                  : 'bg-teal-50 border-teal-200 text-teal-700'
                              }`}>
                                {payment.purchaseType === 'full_course' ? 'Full Course' : 'Assessment'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={`font-bold border-none ${
                                payment.status === 'completed' 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : payment.status === 'failed'
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-secondary text-secondary-foreground'
                              }`}>
                                {payment.status.toUpperCase().replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {payment.purchaseType === 'assessment' && payment.status === 'completed' ? (
                                payment.assessmentAttempted ? (
                                  <Badge 
                                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer text-[10px]"
                                    onClick={() => handleViewAnswers(payment)}
                                    title="Click to view answers"
                                  >
                                    Attempted ({payment.assessmentScore}/100)
                                  </Badge>
                                ) : (
                                  (() => {
                                    const completedTime = new Date(payment.updatedAt).getTime();
                                    const isExpired = Date.now() - completedTime > 24 * 60 * 60 * 1000;
                                    return isExpired ? (
                                      <Badge variant="outline" className="bg-rose-50 border-rose-200 text-rose-700 text-[10px]">
                                        Expired
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700 text-[10px] animate-pulse">
                                        Pending (Active)
                                      </Badge>
                                    );
                                  })()
                                )
                              ) : (
                                <span className="text-muted-foreground text-xs">–</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-extrabold text-foreground text-sm">₹{payment.amountPaid}</TableCell>
                            <TableCell className="text-right px-6">
                              {payment.purchaseType === 'assessment' && payment.status === 'completed' && (
                                payment.shortlisted ? (
                                  <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold border-none text-xs px-2.5 py-1">
                                    Shortlisted
                                  </Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => handleShortlist(payment._id)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 rounded-lg"
                                  >
                                    Shortlist Student
                                  </Button>
                                )
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payouts">
            <Card className="shadow-lg border border-border/50 bg-card/60 backdrop-blur-md overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2 font-bold text-foreground">
                  <CreditCard className="h-5 w-5 text-emerald-500" /> Tutor Payouts & Ledger Audit
                </CardTitle>
                <CardDescription>Track tutor hourly rate changes, completed sessions, and calculated payouts (gross vs net payouts minus 10% platform commission).</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {loadingPayouts ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-12 w-full rounded-lg" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                  </div>
                ) : payouts.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-secondary/5 rounded-2xl border border-dashed border-border/70 mt-4 max-w-lg mx-auto">
                    <CreditCard className="mx-auto mb-4 h-16 w-16 opacity-30 text-emerald-500" />
                    <h3 className="text-lg font-bold text-foreground mb-1">No Payout Data</h3>
                    <p className="text-sm">There are no tutor sessions recorded for payout calculations yet.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Overall Summary Row */}
                    <div className="grid gap-4 sm:grid-cols-3 bg-secondary/10 p-4 rounded-xl border border-border/40 mb-4">
                      <div className="text-center p-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Total Collected (Gross)</span>
                        <span className="text-2xl font-extrabold text-foreground mt-1 block">₹{payouts.reduce((acc, curr) => acc + curr.totalCollected, 0)}</span>
                      </div>
                      <div className="text-center p-2 border-x border-border/40">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Platform Commission (10%)</span>
                        <span className="text-2xl font-extrabold text-emerald-600 mt-1 block">₹{payouts.reduce((acc, curr) => acc + curr.totalCommission, 0)}</span>
                      </div>
                      <div className="text-center p-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Total Tutor Payouts (90%)</span>
                        <span className="text-2xl font-extrabold text-indigo-500 mt-1 block">₹{payouts.reduce((acc, curr) => acc + curr.totalPayout, 0)}</span>
                      </div>
                    </div>

                    <div className="rounded-xl border shadow-sm overflow-hidden bg-card mt-4">
                      <Table>
                        <TableHeader className="bg-secondary/30 uppercase text-[10px] tracking-wider text-muted-foreground font-bold border-b border-border/40">
                          <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead className="font-bold h-12">Tutor Profile</TableHead>
                            <TableHead className="font-bold h-12">Contact Info</TableHead>
                            <TableHead className="font-bold h-12 text-center">Completed Sessions</TableHead>
                            <TableHead className="font-bold h-12 text-right">Gross Collected</TableHead>
                            <TableHead className="font-bold h-12 text-right">Commission (10%)</TableHead>
                            <TableHead className="font-bold h-12 text-right">Net Payout (90%)</TableHead>
                            <TableHead className="font-bold h-12 text-right px-6">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payouts.map((tutorPayout) => {
                            const isExpanded = expandedTutorId === tutorPayout.tutorId;
                            return (
                              <Fragment key={tutorPayout.tutorId}>
                                <TableRow className="hover:bg-secondary/5 transition-colors border-b border-border/40">
                                  <TableCell className="text-center">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0"
                                      onClick={() => setExpandedTutorId(isExpanded ? null : tutorPayout.tutorId)}
                                    >
                                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </Button>
                                  </TableCell>
                                  <TableCell className="font-semibold text-foreground">{tutorPayout.tutorName}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    <div>{tutorPayout.email}</div>
                                    <div>{tutorPayout.phone}</div>
                                  </TableCell>
                                  <TableCell className="text-center font-bold text-sm">{tutorPayout.totalCompletedSessions}</TableCell>
                                  <TableCell className="text-right font-medium">₹{tutorPayout.totalCollected}</TableCell>
                                  <TableCell className="text-right font-medium text-emerald-600">₹{tutorPayout.totalCommission}</TableCell>
                                  <TableCell className="text-right font-bold text-indigo-500">₹{tutorPayout.totalPayout}</TableCell>
                                  <TableCell className="text-right px-6">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setExpandedTutorId(isExpanded ? null : tutorPayout.tutorId)}
                                      className="font-semibold h-8"
                                    >
                                      {isExpanded ? "Hide Logs" : "Audit Details"}
                                    </Button>
                                  </TableCell>
                                </TableRow>

                                {isExpanded && (
                                  <TableRow className="bg-secondary/10 hover:bg-secondary/10">
                                    <TableCell colSpan={8} className="p-6">
                                      <div className="space-y-6">
                                        <h4 className="font-extrabold text-sm uppercase tracking-wider text-muted-foreground border-b pb-2 flex items-center gap-1.5">
                                          <History className="h-4 w-4 text-primary" /> Pricing Period Payout Log & Class Timeline
                                        </h4>

                                        {(() => {
                                          const subjectsInPeriods = Array.from(new Set(tutorPayout.pricingPeriods.map((p: any) => p.subject).filter(Boolean)));
                                          const activeSubject = selectedPayoutSubject[tutorPayout.tutorId] || subjectsInPeriods[0] || "";
                                          const filteredPeriods = tutorPayout.pricingPeriods.filter((p: any) => p.subject === activeSubject);

                                          return (
                                            <>
                                              {subjectsInPeriods.length > 1 && (
                                                <div className="flex flex-wrap gap-2 mb-4 bg-background p-2 px-3 rounded-lg border border-border/45 w-fit items-center">
                                                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mr-1">Filter Subject:</span>
                                                  {subjectsInPeriods.map((sub: any) => (
                                                    <button
                                                      key={sub}
                                                      onClick={() => setSelectedPayoutSubject(prev => ({ ...prev, [tutorPayout.tutorId]: sub }))}
                                                      className={`px-3 py-1 text-xs font-bold rounded-full transition-all duration-200 border ${
                                                        activeSubject === sub 
                                                          ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                                                          : "bg-secondary text-muted-foreground hover:bg-secondary/80 border-transparent"
                                                      }`}
                                                    >
                                                      {sub}
                                                    </button>
                                                  ))}
                                                </div>
                                              )}

                                              {filteredPeriods.length === 0 ? (
                                                <p className="text-xs text-muted-foreground italic p-2 bg-background rounded-lg border border-dashed text-center">
                                                  No payout history recorded for this subject.
                                                </p>
                                              ) : (
                                                filteredPeriods.map((period: any, pIdx: number) => {
                                                  const fromDate = new Date(period.effectiveFrom).toLocaleDateString();
                                                  const toDate = period.effectiveTo ? new Date(period.effectiveTo).toLocaleDateString() : "Current Rate";
                                                  return (
                                                    <div key={pIdx} className="bg-card p-4 rounded-xl border shadow-sm space-y-3">
                                                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-2 border-border/40 gap-2">
                                                        <div className="flex items-center gap-2">
                                                          <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none font-bold">
                                                            Rate: ₹{period.rate}/hr
                                                          </Badge>
                                                          {period.subject && (
                                                            <Badge variant="outline" className="font-bold border-indigo-200 text-indigo-600 bg-indigo-50/50">
                                                              {period.subject}
                                                            </Badge>
                                                          )}
                                                          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                                                            <Calendar className="h-3.5 w-3.5" /> Effective Period: {fromDate} – {toDate}
                                                          </span>
                                                        </div>
                                                        <div className="flex gap-4 text-xs font-bold text-muted-foreground">
                                                          <span>Bookings: <strong className="text-foreground">{period.bookingsCount}</strong></span>
                                                          <span>Sessions Taught: <strong className="text-foreground">{period.completedSessions}</strong></span>
                                                          <span>Collected: <strong className="text-foreground">₹{period.totalCollected}</strong></span>
                                                          <span>Payout: <strong className="text-indigo-500">₹{period.tutorPayout}</strong></span>
                                                        </div>
                                                      </div>

                                                      {/* Period Bookings list */}
                                                      {period.bookings.length === 0 ? (
                                                        <p className="text-xs text-muted-foreground italic p-2">No bookings recorded during this pricing period.</p>
                                                      ) : (
                                                        <div className="overflow-x-auto rounded-lg border border-border/60">
                                                          <Table>
                                                            <TableHeader className="bg-secondary/30 uppercase text-[9px] font-bold text-muted-foreground">
                                                              <TableRow>
                                                                <TableHead className="font-bold h-10">Student</TableHead>
                                                                <TableHead className="font-bold h-10">Subject</TableHead>
                                                                <TableHead className="font-bold h-10">Plan Type</TableHead>
                                                                <TableHead className="font-bold h-10">Timing</TableHead>
                                                                <TableHead className="font-bold h-10 text-center">Sessions Taught</TableHead>
                                                                <TableHead className="font-bold h-10 text-right">Amt Collected</TableHead>
                                                                <TableHead className="font-bold h-10 text-right">Commission</TableHead>
                                                                <TableHead className="font-bold h-10 text-right">Tutor Payout</TableHead>
                                                              </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                              {period.bookings.map((booking: any) => (
                                                                <TableRow key={booking.bookingId} className="hover:bg-secondary/10 transition-colors">
                                                                  <TableCell className="font-medium text-xs py-2">{booking.studentName}</TableCell>
                                                                  <TableCell className="text-xs py-2">{booking.subject}</TableCell>
                                                                  <TableCell className="py-2">
                                                                    <Badge variant="outline" className="text-[10px] font-semibold py-0.5 px-2 bg-primary/5 text-primary border-primary/20">{booking.planType}</Badge>
                                                                  </TableCell>
                                                                  <TableCell className="text-[11px] text-muted-foreground py-2">{booking.timing}</TableCell>
                                                                  <TableCell className="text-center font-bold text-xs py-2">{booking.completedSessions} / {booking.totalSessions}</TableCell>
                                                                  <TableCell className="text-right text-xs py-2">₹{booking.amountPaid}</TableCell>
                                                                  <TableCell className="text-right text-xs text-emerald-600 py-2">₹{Math.round(booking.commission)}</TableCell>
                                                                  <TableCell className="text-right font-bold text-indigo-500 text-xs py-2">₹{Math.round(booking.netPayout)}</TableCell>
                                                                </TableRow>
                                                              ))}
                                                            </TableBody>
                                                          </Table>
                                                        </div>
                                                      )}
                                                    </div>
                                                  );
                                                })
                                              )}
                                            </>
                                          );
                                        })()}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </Fragment>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="geo-analytics" className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Region Pie Chart Card */}
              <Card className="shadow-lg border border-border/50 bg-card/60 backdrop-blur-md overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent border-b pb-4">
                  <CardTitle className="text-xl flex items-center gap-2 font-bold text-foreground">
                    <Globe className="h-5 w-5 text-indigo-500" /> Regional Distribution (India)
                  </CardTitle>
                  <CardDescription>Visual breakdown of registered users by geographical zone.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {statsLoading ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <Skeleton className="h-48 w-48 rounded-full" />
                    </div>
                  ) : pieData.length === 0 ? (
                    <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground italic">
                      <Globe className="h-12 w-12 opacity-30 mb-2" />
                      <span>No regional data available yet</span>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                      <div className="w-full sm:w-[50%] h-[260px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={85}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value: any) => [`${value} registrations`, 'Count']}
                              contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-2xl font-extrabold text-foreground">
                            {pieData.reduce((acc, curr) => acc + curr.value, 0)}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Tutors</span>
                        </div>
                      </div>
                      
                      <div className="w-full sm:w-[45%] space-y-3">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Zones Summary</h4>
                        {pieData.map((d, index) => {
                          const total = pieData.reduce((acc, curr) => acc + curr.value, 0);
                          const pct = total > 0 ? ((d.value / total) * 100).toFixed(0) : "0";
                          return (
                            <div key={index} className="flex items-center justify-between text-sm p-1.5 border-b border-border/30 hover:bg-secondary/5 transition-colors">
                              <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                                <span className="font-semibold text-foreground">{d.name}</span>
                              </div>
                              <span className="font-bold text-muted-foreground">{d.value} ({pct}%)</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Cities Bar Chart Card */}
              <Card className="shadow-lg border border-border/50 bg-card/60 backdrop-blur-md overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-transparent border-b pb-4">
                  <CardTitle className="text-xl flex items-center gap-2 font-bold text-foreground">
                    <MapPin className="h-5 w-5 text-sky-500" /> Top Registered Cities
                  </CardTitle>
                  <CardDescription>Top 10 cities with the highest count of registered tutors.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {statsLoading ? (
                    <div className="space-y-4 py-4 h-[300px] flex flex-col justify-end">
                      <Skeleton className="h-8 w-[80%] rounded" />
                      <Skeleton className="h-8 w-[60%] rounded" />
                      <Skeleton className="h-8 w-[90%] rounded" />
                    </div>
                  ) : topCitiesData.length === 0 ? (
                    <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground italic">
                      <MapPin className="h-12 w-12 opacity-30 mb-2" />
                      <span>No city registration data available yet</span>
                    </div>
                  ) : (
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={topCitiesData}
                          layout="vertical"
                          margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.15} />
                          <XAxis type="number" hide />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={100}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--foreground))', fontSize: 11, fontWeight: 500 }}
                          />
                          <Tooltip 
                            formatter={(value: any) => [`${value} registrations`, 'Tutors']}
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                          />
                          <Bar 
                            dataKey="count" 
                            fill="#0ea5e9" 
                            radius={[0, 4, 4, 0]}
                            barSize={15}
                          >
                            {topCitiesData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? "#10b981" : "#0ea5e9"} opacity={1 - index * 0.08} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Geographical Zones Raw Table */}
            <Card className="shadow-lg border border-border/50 bg-card/60 backdrop-blur-md overflow-hidden">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-lg font-bold text-foreground">Detailed Regional Breakdown</CardTitle>
                <CardDescription>Complete statistics per regional zone across India.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="rounded-xl border shadow-sm overflow-hidden bg-card">
                  <Table>
                    <TableHeader className="bg-secondary/30 uppercase text-[10px] tracking-wider text-muted-foreground font-bold border-b border-border/40">
                      <TableRow>
                        <TableHead className="font-bold h-12">Zone</TableHead>
                        <TableHead className="font-bold h-12">States / Cities Covered</TableHead>
                        <TableHead className="font-bold h-12 text-right">Registration Count</TableHead>
                        <TableHead className="font-bold h-12 text-right px-6">Percentage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { zone: "South India", states: "Karnataka, Tamil Nadu, Andhra Pradesh, Telangana, Kerala (e.g. Bangalore, Chennai, Hyderabad, Nuzvid, Vijayawada, Vizag)", count: geoStats.South || 0, color: "bg-emerald-500" },
                        { zone: "North India", states: "Delhi, Haryana, Punjab, Uttar Pradesh, Uttarakhand, Himachal (e.g. New Delhi, Noida, Gurgaon, Kanpur, Chandigarh)", count: geoStats.North || 0, color: "bg-indigo-500" },
                        { zone: "West India", states: "Maharashtra, Gujarat, Goa, Rajasthan, Madhya Pradesh (e.g. Mumbai, Pune, Thane, Ahmedabad, Surat)", count: geoStats.West || 0, color: "bg-sky-500" },
                        { zone: "East India", states: "West Bengal, Bihar, Odisha, Jharkhand, North-Eastern States (e.g. Kolkata, Patna, Bhubaneswar, Ranchi, Guwahati)", count: geoStats.East || 0, color: "bg-amber-500" },
                        { zone: "Other / Unspecified", states: "Not specified or couldn't be automatically mapped", count: geoStats.Unspecified || 0, color: "bg-slate-400" },
                      ].map((item, index) => {
                        const total = (geoStats.South || 0) + (geoStats.North || 0) + (geoStats.West || 0) + (geoStats.East || 0) + (geoStats.Unspecified || 0);
                        const pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : "0.0";
                        return (
                          <TableRow key={index} className="hover:bg-secondary/10 transition-colors border-b border-border/40">
                            <TableCell className="font-semibold py-4 flex items-center gap-3">
                              <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                              {item.zone}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[400px] truncate" title={item.states}>{item.states}</TableCell>
                            <TableCell className="text-right font-extrabold text-foreground text-sm">{item.count}</TableCell>
                            <TableCell className="text-right font-bold text-indigo-600 dark:text-indigo-400 px-6 text-sm">{pct}%</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages">
            <Card className="shadow-lg border border-border/50 bg-card/60 backdrop-blur-md overflow-hidden p-0">
              <ChatPanel initialActiveUserId={activeChatUserId} />
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Rejection Reason Modal */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-[500px] border border-border bg-card/95 backdrop-blur-md shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-rose-600">
              <XCircle className="h-5 w-5" /> Reject Tutor Application
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Please provide a clear reason for rejecting this tutor application. The tutor will see this message on their dashboard and in their email notification, helping them understand what corrections are needed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="rejection-reason" className="text-sm font-semibold text-foreground">
                Reason for Rejection <span className="text-rose-500">*</span>
              </label>
              <Textarea
                id="rejection-reason"
                placeholder="e.g., The uploaded resume is blurry and unreadable. Please upload a clear PDF of your resume. Also, please expand your bio to be at least 100 characters."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={5}
                className="resize-none rounded-xl border-border focus-visible:ring-rose-500 focus-visible:ring-offset-0 focus-visible:border-rose-500 bg-background/50 transition-all"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setIsRejectDialogOpen(false);
                setRejectTutorId(null);
                setRejectionReason("");
              }}
              disabled={isRejecting}
              className="rounded-lg h-10 px-4 hover:bg-secondary/20"
            >
              Cancel
            </Button>
            <Button
              onClick={submitRejection}
              disabled={!rejectionReason.trim() || isRejecting}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-lg h-10 px-4 shadow-md shadow-rose-600/10 font-medium"
            >
              {isRejecting ? "Rejecting..." : "Confirm Reject"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tutor Details Modal */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" /> Tutor Credentials Profile
            </DialogTitle>
            <DialogDescription>
              Full details and verification documents for this tutor profile.
            </DialogDescription>
          </DialogHeader>

          {selectedTutorForDetail && (
            isEditingProfile ? (
              <div className="space-y-6 py-4">
                {/* Profile fields: Name, Phone, Timezone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Full Name</label>
                    <Input 
                      value={editName} 
                      onChange={(e) => setEditName(e.target.value)} 
                      placeholder="Tutor's Full Name"
                      className="bg-background text-sm font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Phone Number</label>
                    <Input 
                      value={editPhone} 
                      onChange={(e) => setEditPhone(e.target.value)} 
                      placeholder="Phone number"
                      className="bg-background text-sm font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Timezone</label>
                    <Select value={editTimezone} onValueChange={setEditTimezone}>
                      <SelectTrigger className="bg-background text-sm font-semibold">
                        <SelectValue placeholder="Select Timezone" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[220px]">
                        {COMMON_TIMEZONES.map((tz) => (
                          <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Category</label>
                    <Select value={editCategory} onValueChange={(val) => {
                      setEditCategory(val);
                    }}>
                      <SelectTrigger className="bg-background text-sm font-semibold">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Academic">Academic</SelectItem>
                        <SelectItem value="Extracurricular">Extracurricular</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">City</label>
                    <Input 
                      value={editCity} 
                      onChange={(e) => setEditCity(e.target.value)} 
                      placeholder="City"
                      className="bg-background text-sm font-semibold"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Address (Offline Classroom)</label>
                    <Input 
                      value={editAddress} 
                      onChange={(e) => setEditAddress(e.target.value)} 
                      placeholder="Full Address"
                      className="bg-background text-sm font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Google Maps URL</label>
                    <Input 
                      value={editGoogleMapsUrl} 
                      onChange={(e) => setEditGoogleMapsUrl(e.target.value)} 
                      placeholder="https://maps.google.com/..."
                      className="bg-background text-sm font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Teaching Mode</label>
                    <Select value={editMode} onValueChange={setEditMode}>
                      <SelectTrigger className="bg-background text-sm font-semibold">
                        <SelectValue placeholder="Select Mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Online">Online</SelectItem>
                        <SelectItem value="Offline">Offline</SelectItem>
                        <SelectItem value="Both">Online & Offline</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Highest Qualification</label>
                    <Input 
                      value={editQualification} 
                      onChange={(e) => setEditQualification(e.target.value)} 
                      placeholder="Degree, e.g. B.Tech CS"
                      className="bg-background text-sm font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Teaching Experience (Years)</label>
                    <Input 
                      type="number"
                      value={editExperience} 
                      onChange={(e) => setEditExperience(e.target.value)} 
                      placeholder="Years"
                      className="bg-background text-sm font-semibold"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Professional Bio</label>
                  <Textarea 
                    value={editBio} 
                    onChange={(e) => setEditBio(e.target.value)} 
                    placeholder="Tell students about your qualifications and teaching methodology..."
                    rows={4}
                    className="bg-background text-sm leading-relaxed"
                  />
                </div>

                {/* Classes Taught */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Classes / Grade Levels Taught</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CLASS_TAUGHT_OPTIONS.map((c) => {
                      const isChecked = editClassesTaught.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditClassesTaught(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all text-left ${
                            isChecked
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background text-foreground border-border hover:bg-secondary/40"
                          }`}
                        >
                          <span className="truncate">{c}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Boards Taught */}
                {(editCategory === "Academic") && (
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Educational Boards Taught</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {BOARD_TAUGHT_OPTIONS.map((b) => {
                        const isChecked = editBoardsTaught.includes(b);
                        return (
                          <button
                            key={b}
                            type="button"
                            onClick={() => setEditBoardsTaught(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b])}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all text-left ${
                              isChecked
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                : "bg-background text-foreground border-border hover:bg-secondary/40"
                            }`}
                          >
                            <span className="truncate">{b}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Subjects & Rates */}
                <div className="space-y-2 border-t pt-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Subjects & Hourly Rates</label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      className="text-xs h-8 border-primary/20 text-primary hover:bg-primary/5 font-semibold"
                      onClick={() => setEditSubjectRates(prev => [...prev, { subject: "", rate: 300 }])}
                    >
                      + Add Subject
                    </Button>
                  </div>

                  <div className="space-y-2 mt-2">
                    {editSubjectRates.map((sr, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <Select 
                          value={sr.subject} 
                          onValueChange={(val) => {
                            setEditSubjectRates(prev => prev.map((item, i) => i === idx ? { ...item, subject: val } : item));
                          }}
                        >
                          <SelectTrigger className="flex-1 bg-background text-sm">
                            <SelectValue placeholder="Select Subject" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px]">
                            {ALL_SUBJECTS.map((sub) => (
                              <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="flex items-center border rounded-lg bg-background px-3 w-32">
                          <span className="text-muted-foreground text-sm font-semibold">₹</span>
                          <Input 
                            type="number"
                            value={sr.rate}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setEditSubjectRates(prev => prev.map((item, i) => i === idx ? { ...item, rate: val } : item));
                            }}
                            className="border-0 shadow-none focus-visible:ring-0 text-right h-9 text-sm font-bold p-1 pr-0"
                            placeholder="Rate"
                          />
                          <span className="text-muted-foreground text-xs font-normal ml-1">/hr</span>
                        </div>

                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="text-muted-foreground hover:text-destructive h-9 w-9"
                          onClick={() => setEditSubjectRates(prev => prev.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    {editSubjectRates.length === 0 && (
                      <div className="p-4 rounded-xl border border-dashed text-center text-xs text-muted-foreground italic">
                        No subjects added. Tutors must teach at least one subject.
                      </div>
                    )}
                  </div>
                </div>

                {/* Edit Actions Footer */}
                <div className="flex justify-end gap-2.5 pt-4 border-t border-border/40">
                  <Button 
                    type="button"
                    variant="ghost"
                    onClick={() => setIsEditingProfile(false)}
                    disabled={isSavingProfile}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="button"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    onClick={handleSaveTutorProfile}
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            ) : (
            <div className="space-y-6 py-4">
              {/* Header profile info */}
              <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center p-4 rounded-xl bg-secondary/10 border border-border/40">
                <div className="h-20 w-20 rounded-full border-2 border-primary/20 shadow-md overflow-hidden bg-muted flex items-center justify-center shrink-0">
                  {selectedTutorForDetail.photo || selectedTutorForDetail.avatar ? (
                    <img 
                      src={resolveAssetUrl(selectedTutorForDetail.photo || selectedTutorForDetail.avatar)} 
                      alt={selectedTutorForDetail.name} 
                      className="h-full w-full object-cover" 
                      onError={(e: any) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedTutorForDetail.name || "T")}&background=random&size=200`;
                      }}
                    />
                  ) : (
                    <span className="font-bold text-3xl text-primary uppercase">
                      {(selectedTutorForDetail.name || "T").charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-foreground leading-tight">{selectedTutorForDetail.name}</h3>
                    <Badge variant={selectedTutorForDetail.status === "approved" ? "default" : "secondary"} className={selectedTutorForDetail.status === "approved" ? "bg-emerald-600 hover:bg-emerald-600 border-none" : ""}>
                      {selectedTutorForDetail.status ? selectedTutorForDetail.status.toUpperCase() : "PENDING"}
                    </Badge>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                      {selectedTutorForDetail.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedTutorForDetail.city || "Remote"}
                    {selectedTutorForDetail.pincode ? ` - ${selectedTutorForDetail.pincode}` : ""}
                  </p>
                  
                  {/* Reviews rating */}
                  <div className="flex items-center gap-1 text-sm pt-1">
                    <Star className="h-4 w-4 fill-warning text-warning" />
                    <span className="font-semibold text-foreground">{selectedTutorForDetail.rating ?? 0}</span>
                    <span className="text-muted-foreground">({selectedTutorForDetail.reviewCount ?? 0} reviews)</span>
                  </div>
                </div>
              </div>

               {/* Contact Information */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-card p-4 rounded-xl border">
                <div>
                  <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Email Address</span>
                  <span className="text-sm font-semibold text-foreground mt-0.5 block">{selectedTutorForDetail.email || "No email provided"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Phone Number</span>
                  <span className="text-sm font-semibold text-foreground mt-0.5 block">{selectedTutorForDetail.phone || "No phone provided"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Registration Date</span>
                  <span className="text-sm font-semibold text-foreground mt-0.5 block">
                    {selectedTutorForDetail.createdAt ? new Date(selectedTutorForDetail.createdAt).toLocaleString() : "Not available"}
                  </span>
                </div>
              </div>

              {/* Source (Where did they hear about us?) */}
              {selectedTutorForDetail.hearAboutUs && (
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Where did they hear about us?</h4>
                  <div className="p-4 rounded-xl bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-100/30 leading-relaxed text-sm text-foreground font-medium">
                    {selectedTutorForDetail.hearAboutUs}
                  </div>
                </div>
              )}

              {/* Professional Bio */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Professional Bio</h4>
                <div className="p-4 rounded-xl bg-secondary/5 border leading-relaxed text-sm text-muted-foreground min-h-[60px] whitespace-pre-wrap">
                  {selectedTutorForDetail.bio || "No professional bio written yet."}
                </div>
              </div>

              {/* Credentials & Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Highest Qualification</span>
                  <span className="text-sm font-semibold text-foreground bg-secondary/15 px-3 py-2 rounded-lg border border-border/30 block">
                    {selectedTutorForDetail.qualification || "Not specified"}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Teaching Experience</span>
                  <span className="text-sm font-semibold text-foreground bg-secondary/15 px-3 py-2 rounded-lg border border-border/30 block">
                    {selectedTutorForDetail.experience ? `${selectedTutorForDetail.experience} Years` : "Not specified"}
                  </span>
                </div>
              </div>

              {/* Target Classes and Boards Taught */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5 text-primary" /> Classes / Grade Levels Taught
                  </span>
                  {selectedTutorForDetail.classesTaught && selectedTutorForDetail.classesTaught.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 bg-secondary/15 p-3 rounded-lg border border-border/30">
                      {selectedTutorForDetail.classesTaught.map((cls: string) => (
                        <Badge key={cls} variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
                          {cls}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic bg-secondary/15 p-3 rounded-lg border border-border/30 block">
                      Not specified
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block flex items-center gap-1">
                    <Award className="h-3.5 w-3.5 text-indigo-500" /> Educational Boards Taught
                  </span>
                  {selectedTutorForDetail.boardsTaught && selectedTutorForDetail.boardsTaught.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 bg-secondary/15 p-3 rounded-lg border border-border/30">
                      {selectedTutorForDetail.boardsTaught.map((board: string) => (
                        <Badge key={board} variant="outline" className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 text-xs font-semibold">
                          {board}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic bg-secondary/15 p-3 rounded-lg border border-border/30 block">
                      Not specified
                    </span>
                  )}
                </div>
              </div>

              {/* Subjects and Rates */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Subjects & Hourly Rates</h4>
                {selectedTutorForDetail.subjectRates && selectedTutorForDetail.subjectRates.length > 0 ? (
                  <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
                    <Table>
                      <TableHeader className="bg-secondary/40 text-[9px] uppercase tracking-wider font-bold">
                        <TableRow>
                          <TableHead className="font-bold h-9">Subject</TableHead>
                          <TableHead className="font-bold h-9 text-right px-4">Hourly Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedTutorForDetail.subjectRates.map((sr: any, idx: number) => (
                          <TableRow key={idx} className="hover:bg-secondary/5 border-b last:border-0 border-border/40">
                            <TableCell className="font-bold text-xs py-2">{sr.subject.replace(/\s*\((Academic|Extracurricular)\)/i, "")}</TableCell>
                            <TableCell className="text-right font-extrabold text-xs text-emerald-600 py-2 px-4">₹{sr.rate}/hr</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="p-3 bg-secondary/10 rounded-lg text-xs text-muted-foreground italic border border-dashed text-center">
                    Default rate applies: ₹{selectedTutorForDetail.hourlyRate || 500}/hr (No subject-specific rates set)
                  </div>
                )}
              </div>

               {/* Classroom Location (Offline/Hybrid) */}
              {(selectedTutorForDetail.mode?.toLowerCase() === "offline" || selectedTutorForDetail.mode?.toLowerCase() === "both") && selectedTutorForDetail.address && (
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Classroom Location (Offline)</h4>
                  <div className="p-4 rounded-xl bg-secondary/5 border space-y-3">
                    <div>
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Classroom Address</span>
                      <span className="text-sm font-semibold text-foreground mt-0.5 block">{selectedTutorForDetail.address}</span>
                    </div>

                    <div className="relative w-full h-40 overflow-hidden rounded-lg border bg-secondary/20 shadow-inner">
                      <iframe
                        title="Tutor Classroom Location Map"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedTutorForDetail.address + ", " + (selectedTutorForDetail.city || ""))}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                      />
                    </div>

                    {selectedTutorForDetail.googleMapsUrl && (
                      <a 
                        href={selectedTutorForDetail.googleMapsUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-rose-500 hover:underline inline-flex items-center gap-1"
                      >
                        <MapPin className="h-3.5 w-3.5" /> View on Google Maps
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* KYC Document Section */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Resume / CV</h4>
                {selectedTutorForDetail.verificationDocument ? (
                  <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/20 dark:bg-indigo-950/10 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">📄</span>
                      <div>
                        <p className="text-xs font-bold text-foreground">Resume / CV Document</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Uploaded resume or CV (PDF/Image)</p>
                      </div>
                    </div>
                    <a 
                      href={resolveAssetUrl(selectedTutorForDetail.verificationDocument)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 py-2 px-4 rounded-lg border border-indigo-200 dark:border-indigo-900/30 transition-colors"
                    >
                      Open Document
                    </a>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-secondary/5 border border-dashed text-center text-xs text-muted-foreground italic">
                    No Resume/CV document has been uploaded yet.
                  </div>
                )}
              </div>

              {/* Book Verification Demo Section */}
              <div className="space-y-2 border-t pt-4 border-border/40 mt-4">
                <h4 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Video className="h-4 w-4 text-blue-500" /> Book Verification Demo Class
                </h4>
                <p className="text-xs text-muted-foreground">
                  Send a request to the tutor to schedule a demo class with the administrator for verification.
                </p>

                {/* Tutor Availability Info */}
                {((selectedTutorForDetail.availability && selectedTutorForDetail.availability.length > 0) || 
                  (selectedTutorForDetail.availableTimings && selectedTutorForDetail.availableTimings.length > 0)) ? (
                  <div className="mt-3 p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/10 dark:bg-amber-950/5 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> Tutor's General Availability
                      </span>
                      <Badge variant="outline" className="bg-amber-100/50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900 text-[10px] font-bold">
                        Timezone: {selectedTutorForDetail.timezone ? `${getTimeZoneAbbreviation(selectedTutorForDetail.timezone)} (${selectedTutorForDetail.timezone})` : 'IST (Asia/Kolkata)'}
                      </Badge>
                    </div>

                    {selectedTutorForDetail.availability && selectedTutorForDetail.availability.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                          const rawSlots = selectedTutorForDetail.availability.filter((a: any) => a.day === day);
                          if (rawSlots.length === 0) return null;
                          
                          // Deduplicate slots to prevent displaying the exact same timings
                          const seen = new Set<string>();
                          const daySlots = rawSlots.filter((slot: any) => {
                            const key = `${slot.startTime}-${slot.endTime}`;
                            if (seen.has(key)) return false;
                            seen.add(key);
                            return true;
                          });

                          return (
                            <div key={day} className="flex flex-col p-2 border rounded-lg bg-background/50">
                              <span className="font-bold text-foreground text-xs">{day}</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {daySlots.map((slot: any, idx: number) => (
                                  <Badge key={idx} variant="secondary" className="text-[9px] font-semibold py-0.5 px-1.5 bg-secondary/50">
                                    {format(parse(slot.startTime, 'HH:mm', new Date()), 'h:mm a')} - {format(parse(slot.endTime, 'HH:mm', new Date()), 'h:mm a')}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {selectedTutorForDetail.availableTimings.map((timing: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-[10px] py-0.5 px-2 font-medium">{timing}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 p-3 rounded-xl border border-dashed text-center text-xs text-muted-foreground italic">
                    No availability timings or days specified by this tutor.
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center mt-2 p-4 border rounded-xl bg-secondary/5">
                  <div className="flex-1 w-full space-y-1">
                    <label htmlFor="demo-datetime" className="text-[10px] font-bold text-muted-foreground uppercase">
                      Select Date & Time
                    </label>
                    <Input 
                      id="demo-datetime"
                      type="datetime-local" 
                      className="bg-background shadow-sm h-9 text-xs" 
                      value={verificationDemoTiming}
                      onChange={(e) => setVerificationDemoTiming(e.target.value)}
                    />
                  </div>
                  <Button 
                    type="button"
                    onClick={handleBookVerificationDemo}
                    disabled={isBookingDemo}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 px-4 shrink-0 shadow-sm hover:shadow-blue-500/20"
                  >
                    {isBookingDemo ? "Booking..." : "Request Demo Class"}
                  </Button>
                </div>
              </div>

              {/* Quick Actions Footer inside Modal */}
              <div className="flex flex-wrap gap-2.5 justify-end pt-4 border-t border-border/40">
                {selectedTutorForDetail.status === "pending" ? (
                  <>
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold" 
                      onClick={() => {
                        handleApproval(selectedTutorForDetail.id, "approved");
                        setIsDetailDialogOpen(false);
                      }}
                    >
                      <CheckCircle className="mr-1.5 h-4 w-4" /> Approve Tutor
                    </Button>
                    <Button 
                      variant="outline"
                      className="text-rose-600 hover:bg-rose-50 border-rose-200 font-bold" 
                      onClick={() => {
                        handleApproval(selectedTutorForDetail.id, "rejected");
                        setIsDetailDialogOpen(false);
                      }}
                    >
                      <XCircle className="mr-1.5 h-4 w-4" /> Reject Tutor
                    </Button>
                  </>
                ) : (
                  <>
                    {selectedTutorForDetail.status === "approved" && (
                      <Button 
                        variant="outline"
                        className="text-rose-600 hover:bg-rose-50 border-rose-200 font-bold" 
                        onClick={() => {
                          handleApproval(selectedTutorForDetail.id, "rejected");
                          setIsDetailDialogOpen(false);
                        }}
                      >
                        <XCircle className="mr-1.5 h-4 w-4" /> Disapprove Tutor
                      </Button>
                    )}
                    <Button 
                      variant={selectedTutorForDetail.featured ? "outline" : "default"} 
                      className={`font-bold ${
                        selectedTutorForDetail.featured 
                          ? "border-amber-500/50 text-amber-600 hover:bg-amber-50" 
                          : "bg-indigo-600 hover:bg-indigo-700 text-white"
                      }`}
                      onClick={() => {
                        toggleFeatured(selectedTutorForDetail);
                        // Update modal state instantly to reflect UI feature changes
                        setSelectedTutorForDetail((prev: any) => prev ? { ...prev, featured: !prev.featured } : null);
                      }}
                    >
                      <Star className={`mr-1.5 h-4 w-4 ${selectedTutorForDetail.featured ? "fill-amber-400 text-amber-500" : ""}`} />
                      {selectedTutorForDetail.featured ? "Remove Featured" : "Make Featured"}
                    </Button>
                  </>
                 )}
                 <Button 
                   variant={selectedTutorForDetail.isVerified ? "outline" : "default"} 
                   className={`font-bold ${
                     selectedTutorForDetail.isVerified 
                       ? "border-blue-500/50 text-blue-600 hover:bg-blue-50" 
                       : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-blue-500/20"
                   }`}
                   onClick={() => {
                     toggleVerified(selectedTutorForDetail);
                     setSelectedTutorForDetail((prev: any) => prev ? { ...prev, isVerified: !prev.isVerified } : null);
                   }}
                 >
                   <CheckCircle className={`mr-1.5 h-4 w-4 ${selectedTutorForDetail.isVerified ? "fill-blue-500 text-white" : ""}`} />
                   {selectedTutorForDetail.isVerified ? "Remove Verified" : "Give Verified"}
                 </Button>
                 <Button 
                   variant="outline"
                   className="border-primary/20 text-primary hover:bg-primary/5 font-bold"
                   onClick={() => setIsEditingProfile(true)}
                 >
                   Edit Profile
                 </Button>
                 <Button variant="ghost" onClick={() => setIsDetailDialogOpen(false)}>
                   Close
                 </Button>
              </div>
            </div>
            )
          )}
        </DialogContent>
      </Dialog>

      {/* Student Details Modal */}
      <Dialog open={isStudentDetailDialogOpen} onOpenChange={setIsStudentDetailDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-indigo-500" /> Student Profile
            </DialogTitle>
            <DialogDescription>
              View detailed registration information for this student account.
            </DialogDescription>
          </DialogHeader>

          {selectedStudentForDetail && (
            <div className="space-y-6 py-4">
              {/* Header profile section with Avatar */}
              <div className="flex items-center gap-4 pb-4 border-b">
                <div className="h-16 w-16 rounded-full border shadow-sm overflow-hidden bg-muted flex items-center justify-center shrink-0">
                  {selectedStudentForDetail.avatar ? (
                    <img 
                      src={resolveAssetUrl(selectedStudentForDetail.avatar)} 
                      alt={selectedStudentForDetail.full_name} 
                      className="h-full w-full object-cover" 
                      onError={(e: any) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedStudentForDetail.full_name || "S")}&background=random&size=200`;
                      }}
                    />
                  ) : (
                    <span className="font-bold text-2xl text-indigo-500 uppercase">
                      {(selectedStudentForDetail.full_name || "S").charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground leading-tight">
                    {selectedStudentForDetail.full_name}
                  </h3>
                  <Badge variant="outline" className="mt-1 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-200">
                    {selectedStudentForDetail.student_or_parent || "Student"}
                  </Badge>
                </div>
              </div>

              {/* General details grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Email Address</span>
                  <span className="text-sm font-semibold text-foreground break-all">{selectedStudentForDetail.email || "–"}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Phone Number</span>
                  <span className="text-sm font-semibold text-foreground">{selectedStudentForDetail.phone || "–"}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Class / Grade</span>
                  <span className="text-sm font-semibold text-foreground">
                    <Badge variant="outline" className="bg-secondary/20">{selectedStudentForDetail.student_class || selectedStudentForDetail.studentClass || "–"}</Badge>
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Time Zone</span>
                  <span className="text-sm font-semibold text-foreground">
                    {selectedStudentForDetail.timezone ? `${getTimeZoneAbbreviation(selectedStudentForDetail.timezone)} (${selectedStudentForDetail.timezone})` : 'IST (Asia/Kolkata)'}
                  </span>
                </div>
              </div>

              {/* Conditional section if Parent was registered */}
              {selectedStudentForDetail.student_or_parent === "Parent" && selectedStudentForDetail.student_name && (
                <div className="space-y-1 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                  <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider block">Child (Student) Name</span>
                  <span className="text-sm font-bold text-foreground">{selectedStudentForDetail.student_name}</span>
                </div>
              )}

              {/* Referral Source */}
              <div className="space-y-1 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider block flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> How they heard about us
                </span>
                <span className="text-sm font-bold text-foreground">
                  {selectedStudentForDetail.heard_about_us || selectedStudentForDetail.heardAboutUs || "Not specified / Existing User"}
                </span>
              </div>

              {/* Dates / Metadata */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t text-xs text-muted-foreground">
                <div>
                  <span>Joined Date:</span>
                  <span className="block font-medium text-foreground mt-0.5">
                    {selectedStudentForDetail.createdAt ? new Date(selectedStudentForDetail.createdAt).toLocaleString() : "Not available"}
                  </span>
                </div>
                <div>
                  <span>User ID:</span>
                  <span className="block font-mono text-[10px] text-foreground mt-0.5 select-all">
                    {selectedStudentForDetail._id || selectedStudentForDetail.id || "–"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => setIsStudentDetailDialogOpen(false)}
              className="rounded-lg h-10 px-4 hover:bg-secondary/20 hover:text-foreground"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assessment Answers Dialog */}
      <Dialog open={isAnswersDialogOpen} onOpenChange={setIsAnswersDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-teal-600" />
              AI Assessment Review
            </DialogTitle>
            <DialogDescription>
              Reviewing quiz responses submitted by {selectedAssessmentPayment?.studentName}.
            </DialogDescription>
          </DialogHeader>

          {selectedAssessmentPayment && (
            <div className="space-y-6 mt-4">
              {/* Score / Meta summary */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-gradient-to-r from-teal-500/15 via-teal-500/5 to-transparent border border-teal-500/20 rounded-2xl">
                <div>
                  <h4 className="font-bold text-foreground text-sm">Graded Assessment Score</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Submitted: {selectedAssessmentPayment.assessmentAttemptedAt ? new Date(selectedAssessmentPayment.assessmentAttemptedAt).toLocaleString() : "N/A"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {(() => {
                    const currentTotal = Object.keys(editedScores).reduce((acc, qid) => acc + (editedScores[qid] || 0), 0);
                    const isModified = currentTotal !== selectedAssessmentPayment.assessmentScore;
                    return (
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground uppercase font-extrabold block">Total Score</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {isModified && (
                            <span className="text-xs text-muted-foreground line-through mr-1">
                              {selectedAssessmentPayment.assessmentScore}/100
                            </span>
                          )}
                          <span className={`font-extrabold px-3 py-1.5 rounded-xl text-lg shadow-sm text-white ${isModified ? 'bg-indigo-600' : 'bg-teal-600'}`}>
                            {currentTotal}/100
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Answers details */}
              <div className="space-y-6">
                {/* Part A: Multiple Choice Questions */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b pb-1.5 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-teal-600" /> Part A: MCQs (Auto-Graded, 5 pts each)
                  </h4>
                  {[
                    { id: "q1", question: "What does the 'AI' in 'AI Future Skills' stand for?", correct: "Artificial Intelligence" },
                    { id: "q2", question: "Which of the following is an example of an AI-powered system that can write essays, answer questions, and write code?", correct: "A chatbot like ChatGPT" },
                    { id: "q3", question: "How does a machine learning model learn to recognize a dog in an image?", correct: "By looking at thousands of labeled dog photos" },
                    { id: "q4", question: "What is 'prompt engineering' in the context of generative AI?", correct: "Writing clear instructions to guide an AI's response" },
                    { id: "q5", question: "When an AI chatbot creates an answer that sounds very convincing but is completely made up and incorrect, this is called:", correct: "A hallucination" },
                    { id: "q6", question: "Why is data important for training Artificial Intelligence models?", correct: "AI models use data to find patterns and learn from examples" },
                    { id: "q7", question: "What is an 'algorithm' in computer science?", correct: "A step-by-step set of instructions to solve a problem" },
                    { id: "q8", question: "What is the main difference between a regular computer and an AI robot?", correct: "A robot has physical sensors and actuators to interact with the physical world" },
                    { id: "q9", question: "What is a 'deepfake'?", correct: "An AI-generated fake video or image that looks extremely realistic" },
                    { id: "q10", question: "If an AI tool asks you to upload personal details like your home address or phone number to test its features, what is the best practice?", correct: "Do not share personal details and check with a parent or teacher" }
                  ].map((q, idx) => {
                    const studentAns = selectedAssessmentPayment.assessmentAnswers?.[q.id];
                    const isCorrect = studentAns === q.correct;
                    const qScore = editedScores[q.id] || 0;

                    return (
                      <div key={q.id} className="p-3.5 border border-border/40 rounded-xl space-y-2 bg-card">
                        <div className="font-semibold text-xs text-foreground flex items-start gap-2">
                          <span className="h-5 w-5 bg-secondary text-foreground text-[10px] rounded-full flex items-center justify-center shrink-0 mt-0.5 font-bold">
                            {idx + 1}
                          </span>
                          <span className="flex-1 leading-snug">{q.question}</span>
                          <Badge variant="outline" className={`font-bold shrink-0 text-[10px] px-1.5 py-0.5 border-none ${isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {qScore} / 5 pts
                          </Badge>
                        </div>

                        <div className="grid gap-1.5 text-xs pl-7">
                          <div className={`p-2 rounded-lg flex items-center justify-between ${
                            isCorrect 
                              ? "bg-emerald-500/5 text-emerald-800 dark:text-emerald-300 border border-emerald-500/10" 
                              : "bg-rose-500/5 text-rose-800 dark:text-rose-300 border border-rose-500/10"
                          }`}>
                            <span className="leading-snug">
                              <strong>Student's Answer:</strong> {studentAns || "No answer submitted"}
                            </span>
                            {isCorrect ? (
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                            )}
                          </div>

                          {!isCorrect && (
                            <div className="p-2 rounded-lg bg-emerald-500/5 text-emerald-800 dark:text-emerald-300 border border-emerald-500/10">
                              <strong>Correct Option:</strong> {q.correct}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Part B: Written Explanations */}
                <div className="space-y-3 pt-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b pb-1.5 flex items-center gap-1">
                    <BookOpen className="h-4 w-4 text-teal-600" /> Part B: Written Explanations (Heuristic Auto-Graded, 10 pts max)
                  </h4>
                  {[
                    { id: "t1", question: "In your own words, explain how an AI model learns to complete a task (like identifying fruits or predicting weather) without being explicitly programmed for it.", keywords: "patterns, data, examples, train, learn, predict, features" },
                    { id: "t2", question: "Imagine you want an AI chatbot to help you write a science fiction story about a friendly robot. Write a good, detailed prompt that you would use to get the best result.", keywords: "role, context, instructions, topic, friendly, story, robot, details" },
                    { id: "t3", question: "Why is it important to make sure that the data used to train AI models is fair and diverse? What could happen if the data is biased?", keywords: "fairness, bias, unfair, diverse, mistakes, discrimination, incorrect" },
                    { id: "t4", question: "Identify one way you or your family uses AI in daily life (e.g., streaming recommendations, map navigation, voice helpers) and explain how it makes tasks easier.", keywords: "recommend, map, assistant, easier, save, time, search, smart" },
                    { id: "t5", question: "If you use an AI tool to write an assignment or project for school, why is it risky to copy and paste the answer directly without reading or editing it?", keywords: "incorrect, hallucination, cheat, plagiarism, check, learn, fact" }
                  ].map((t, idx) => {
                    const studentAns = selectedAssessmentPayment.assessmentAnswers?.[t.id];
                    const currentScore = editedScores[t.id] !== undefined ? editedScores[t.id] : 0;

                    return (
                      <div key={t.id} className="p-4 border border-border/40 rounded-xl space-y-3 bg-card shadow-sm">
                        <div className="font-semibold text-xs text-foreground flex items-start gap-2">
                          <span className="h-5 w-5 bg-secondary text-foreground text-[10px] rounded-full flex items-center justify-center shrink-0 mt-0.5 font-bold">
                            {idx + 11}
                          </span>
                          <span className="flex-1 leading-snug">{t.question}</span>
                          <Badge variant="outline" className={`font-bold shrink-0 text-[10px] px-1.5 py-0.5 border-none ${currentScore >= 7 ? 'bg-indigo-100 text-indigo-700' : currentScore >= 4 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                            {currentScore} / 10 pts
                          </Badge>
                        </div>

                        <div className="text-xs pl-7 space-y-2.5">
                          {/* Student Answer Textarea display */}
                          <div className="p-3 bg-secondary/10 rounded-xl border leading-relaxed text-muted-foreground italic min-h-[45px] whitespace-pre-wrap">
                            {studentAns || "No response submitted."}
                          </div>

                          {/* Matching Guidelines */}
                          <div className="text-[10px] text-muted-foreground leading-normal bg-secondary/5 p-2 rounded-lg border border-border/30">
                            <strong>Grading Target Keywords:</strong> <code className="text-teal-600 dark:text-teal-400">{t.keywords}</code>
                          </div>

                          {/* Override controls */}
                          <div className="flex items-center gap-3 mt-1.5 pt-1.5 border-t border-border/30">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Override Score:</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={0}
                                max={10}
                                value={currentScore}
                                onChange={(e) => {
                                  const val = Math.max(0, Math.min(10, Number(e.target.value)));
                                  setEditedScores(prev => ({ ...prev, [t.id]: val }));
                                }}
                                className="w-14 h-8 text-center text-xs font-bold rounded-lg border border-border/50 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                              />
                              <span className="text-xs text-muted-foreground">/ 10 pts</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action */}
              <div className="flex justify-end gap-2.5 pt-4 border-t">
                <Button 
                  disabled={isSavingScores}
                  variant="outline"
                  onClick={handleSaveScores}
                  className="border-teal-600 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/20 font-bold h-10 rounded-lg px-4 shadow-sm"
                >
                  {isSavingScores ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"></span>
                      Saving...
                    </span>
                  ) : "Save Score Updates"}
                </Button>
                {!selectedAssessmentPayment.shortlisted && (
                  <Button 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 rounded-lg px-4 shadow-sm"
                    onClick={() => {
                      handleShortlist(selectedAssessmentPayment._id);
                      setIsAnswersDialogOpen(false);
                    }}
                  >
                    Shortlist Student
                  </Button>
                )}
                <Button variant="outline" onClick={() => setIsAnswersDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Booking Details Modal */}
      <Dialog open={isBookingDetailDialogOpen} onOpenChange={setIsBookingDetailDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" /> Booking Detail Audit
            </DialogTitle>
            <DialogDescription>
              View metadata, contact information, and meeting links for this booking transaction.
            </DialogDescription>
          </DialogHeader>

          {selectedBookingForDetail && (() => {
            const tutorObj = tutors.find((t: any) =>
              (t.id && selectedBookingForDetail.tutorId && (t.id === selectedBookingForDetail.tutorId || t._id === selectedBookingForDetail.tutorId)) ||
              (t._id && selectedBookingForDetail.tutorId && (t._id === selectedBookingForDetail.tutorId || t.id === selectedBookingForDetail.tutorId)) ||
              (t.name && selectedBookingForDetail.tutorName && t.name.toLowerCase() === selectedBookingForDetail.tutorName.toLowerCase())
            );
            const tutorResumeDoc = selectedBookingForDetail.tutorVerificationDocument || tutorObj?.verificationDocument;

            return (
            <div className="space-y-6 py-4">
              {/* Core metadata stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-secondary/15 border border-border/40">
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Booking ID</span>
                  <span className="text-xs font-mono font-bold text-foreground mt-0.5 block">
                    {selectedBookingForDetail._id}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Status</span>
                  <Badge variant="outline" className={`mt-0.5 border-none font-bold text-[10px] ${
                    selectedBookingForDetail.status === 'enrolled' ? 'bg-indigo-100 text-indigo-700' :
                    selectedBookingForDetail.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    selectedBookingForDetail.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    selectedBookingForDetail.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {selectedBookingForDetail.status.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Subject</span>
                  <span className="text-sm font-semibold text-foreground mt-0.5 block truncate" title={selectedBookingForDetail.subject}>
                    {selectedBookingForDetail.subject}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Plan Type</span>
                  <Badge variant="secondary" className="mt-0.5 text-xs bg-primary/10 text-primary hover:bg-primary/20">
                    {selectedBookingForDetail.planType || "Demo Session"}
                  </Badge>
                </div>
              </div>

              {/* Timing and Financials Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-card border">
                  <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Date & Timing</span>
                  <span className="text-sm font-semibold text-foreground mt-1 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-primary" /> {selectedBookingForDetail.timing}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-card border">
                  <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Amount Paid (Gross)</span>
                  <span className="text-lg font-bold text-emerald-600 mt-0.5 block">
                    ₹{selectedBookingForDetail.amountPaid || 0}
                  </span>
                </div>
              </div>

              {/* Participant Profiles: Tutor and Student Side-by-Side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Tutor Card */}
                <div className="p-4 rounded-xl bg-card border flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-wider block">Tutor Information</span>
                    <h4 className="font-bold text-sm text-foreground">{selectedBookingForDetail.tutorName}</h4>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p className="truncate"><strong>Email:</strong> {selectedBookingForDetail.tutorEmail || "N/A"}</p>
                      <p><strong>Phone:</strong> {selectedBookingForDetail.tutorPhone || "N/A"}</p>
                      {tutorResumeDoc ? (
                        <p className="pt-0.5 flex items-center gap-1">
                          <strong className="text-muted-foreground">Resume:</strong>{" "}
                          <a
                            href={resolveAssetUrl(tutorResumeDoc)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center gap-1"
                          >
                            <FileText className="h-3.5 w-3.5" /> View Resume
                          </a>
                        </p>
                      ) : (
                        <p className="pt-0.5"><strong>Resume:</strong> <span className="italic">Not uploaded</span></p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {selectedBookingForDetail.tutorUserId ? (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 gap-1.5 h-9 font-semibold text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50/50"
                        onClick={() => {
                          sessionStorage.setItem("active_chat_user_id", selectedBookingForDetail.tutorUserId);
                          setActiveChatUserId(selectedBookingForDetail.tutorUserId);
                          setActiveTab("messages");
                          setIsBookingDetailDialogOpen(false);
                          toast.success(`Opening chat thread with tutor ${selectedBookingForDetail.tutorName}`);
                        }}
                      >
                        <MessageSquare className="h-4 w-4" /> Message Tutor
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="flex-1 h-9 text-xs" disabled>
                        No Tutor Chat Available
                      </Button>
                    )}
                    {tutorResumeDoc && (
                      <a
                        href={resolveAssetUrl(tutorResumeDoc)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 h-9 px-3 font-semibold text-xs rounded-md border border-indigo-200 bg-indigo-50/80 text-indigo-600 hover:bg-indigo-100 transition-colors shrink-0"
                      >
                        <FileText className="h-4 w-4" /> View Resume
                      </a>
                    )}
                  </div>
                </div>

                {/* Student Card */}
                <div className="p-4 rounded-xl bg-card border flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="text-[10px] text-sky-600 font-extrabold uppercase tracking-wider block">Student Information</span>
                    <h4 className="font-bold text-sm text-foreground">{selectedBookingForDetail.studentName}</h4>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p className="truncate"><strong>Email:</strong> {selectedBookingForDetail.studentEmail || "N/A"}</p>
                      <p><strong>Phone:</strong> {selectedBookingForDetail.studentPhone || "N/A"}</p>
                      <p><strong>Class:</strong> {selectedBookingForDetail.studentClass || "N/A"}</p>
                      <p><strong>Parent Name:</strong> {selectedBookingForDetail.parentName || "N/A"}</p>
                      <p className="truncate"><strong>Subject:</strong> {selectedBookingForDetail.subject || "N/A"}</p>
                    </div>
                  </div>
                  {selectedBookingForDetail.studentId ? (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full gap-1.5 h-9 font-semibold text-xs border-sky-200 text-sky-600 hover:bg-sky-50/50"
                      onClick={() => {
                        sessionStorage.setItem("active_chat_user_id", selectedBookingForDetail.studentId);
                        setActiveChatUserId(selectedBookingForDetail.studentId);
                        setActiveTab("messages");
                        setIsBookingDetailDialogOpen(false);
                        toast.success(`Opening chat thread with student ${selectedBookingForDetail.studentName}`);
                      }}
                    >
                      <MessageSquare className="h-4 w-4" /> Message Student
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="w-full h-9 text-xs" disabled>
                      No Student Chat Available
                    </Button>
                  )}
                </div>
              </div>

              {/* Classroom Meeting Room Link details */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider block">Live Session Classrooms</span>
                
                {selectedBookingForDetail.sessions && selectedBookingForDetail.sessions.length > 0 ? (
                  /* Package session calendar logs */
                  <div className="border rounded-xl overflow-hidden bg-card shadow-inner max-h-60 overflow-y-auto divide-y divide-border/40">
                    {selectedBookingForDetail.sessions.map((session: any, sIdx: number) => {
                      const sessMeetLink = session.meetingLink || `https://meet.jit.si/cuvasol-tutor-class-${selectedBookingForDetail._id}-session-${sIdx + 1}`;
                      return (
                        <div key={sIdx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-card hover:bg-secondary/5 transition-colors gap-3">
                          <div className="flex items-center gap-3">
                            <span className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                              #{sIdx + 1}
                            </span>
                            <div>
                              <p className="font-bold text-xs text-foreground">{session.date}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">Time: {session.time}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                            <Badge variant="outline" className={`px-2 py-0.5 border-none text-[9px] uppercase font-bold tracking-wider ${
                              session.status === 'completed' ? 'bg-green-100 text-green-700' :
                              session.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {session.status}
                            </Badge>
                            
                            {session.status !== 'cancelled' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs font-bold bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                                asChild
                              >
                                <a 
                                  href={getMeetingHref(sessMeetLink, '', "Admin Moderator", '')}
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  <Video className="h-3.5 w-3.5 mr-1" /> {sessMeetLink.includes('meet.google.com') ? 'Join Google Meet' : 'Join Jitsi Room'}
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Standard / Demo class Meet links */
                  <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/20 dark:bg-indigo-950/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl mt-0.5">🎥</span>
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          {selectedBookingForDetail.meetingLink?.includes('meet.google.com') 
                            ? 'Google Meet Classroom' 
                            : 'Jitsi Meet Classroom'}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1 max-w-sm">
                          This is a dynamic secure video conference room. You can join the room as a moderator helper to support the live session.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 px-4 text-xs shadow-sm"
                        asChild
                      >
                        <a 
                          href={getMeetingHref(selectedBookingForDetail.meetingLink, selectedBookingForDetail._id, "Admin Moderator", '', selectedBookingForDetail.subject)}
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <Video className="h-3.5 w-3.5 mr-1.5" /> Join Room
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 px-3 text-xs"
                        onClick={() => {
                          const link = getMeetingHref(selectedBookingForDetail.meetingLink, selectedBookingForDetail._id, "Admin Moderator", '', selectedBookingForDetail.subject);
                          navigator.clipboard.writeText(link);
                          toast.success("Meeting link copied to clipboard!");
                        }}
                      >
                        Copy Link
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal footer controls */}
              <div className="flex justify-end pt-4 border-t border-border/40">
                <Button variant="ghost" onClick={() => setIsBookingDetailDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default AdminDashboard;
