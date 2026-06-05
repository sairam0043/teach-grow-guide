import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import PageLayout from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { 
  CheckCircle, 
  Bell, 
  ArrowRight, 
  Sparkles, 
  Award, 
  Star, 
  Clock, 
  Video, 
  AlertCircle, 
  Tv, 
  BookOpen, 
  Users, 
  DollarSign, 
  TrendingUp,
  ChevronRight
} from "lucide-react";
import axios from "axios";
import API_URL from "@/config/api";

interface TutorProfileData {
  id: string;
  name: string;
  photo?: string;
  status: string;
  hourlyRate?: number;
  rating?: number;
  subjectRates?: { subject: string; rate: number }[];
  [key: string]: unknown;
}

interface TutorStatsData {
  demoRequests: number;
  activeStudents: number;
  upcomingClasses: number;
  totalEarnings: number;
  availableTimings: string[];
  [key: string]: unknown;
}

const TutorWelcome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tutorProfile, setTutorProfile] = useState<TutorProfileData | null>(null);
  const [tutorStats, setTutorStats] = useState<TutorStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (user?.id) {
      setLoading(true);
      axios.get(`${API_URL}/tutors/user/${user.id}`)
        .then(res => {
          setTutorProfile(res.data);
          return axios.get(`${API_URL}/dashboard/tutor/${res.data.id}`);
        })
        .then(statsRes => {
          setTutorStats(statsRes.data);
        })
        .catch(err => {
          console.error("Error fetching tutor welcome info:", err);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  const tutorName = String(tutorProfile?.name || user?.user_metadata?.full_name || "Sarah Johnson");

  const handleEnableNotifications = () => {
    if ("Notification" in window) {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          toast.success("Notifications enabled! You will now receive instant alerts on this device.");
          setNotificationsEnabled(true);
        } else if (permission === "denied") {
          toast.error("Notification permission was denied. You can enable them manually in your browser settings.");
        } else {
          toast.info("Notification permission prompt dismissed.");
        }
      });
    } else {
      toast.success("Notifications enabled! We'll alert you via email.");
      setNotificationsEnabled(true);
    }
  };

  const handleSkipNotifications = () => {
    toast.info("You can enable notifications anytime from your device settings.");
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  } as const;

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  } as const;

  return (
    <PageLayout>
      <div className="relative min-h-screen bg-slate-50/50 dark:bg-slate-950/20 overflow-hidden py-12">
        {/* Animated Background Orbs */}
        <div className="absolute top-1/4 left-1/10 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10 animate-pulse [animation-duration:6000ms]" />
        <div className="absolute bottom-1/4 right-1/10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10 animate-pulse [animation-duration:8000ms]" />

        <div className="container max-w-4xl px-4 mx-auto">
          {/* Confetti & Congrats Header */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 80, damping: 15 }}
            className="text-center mb-12 relative"
          >
            <div className="inline-flex items-center justify-center p-3 bg-emerald-100 dark:bg-emerald-950/40 rounded-full mb-4 shadow-sm border border-emerald-200/50">
              <Award className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 via-primary to-indigo-600 bg-clip-text text-transparent">
              Congratulations, {tutorName}! 🎉
            </h1>
            <p className="text-xl font-medium text-slate-700 dark:text-slate-300 mt-4 max-w-2xl mx-auto leading-relaxed">
              Your application has been approved! You're now a verified tutor on our marketplace.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            {/* 1. Stat Cards Grid */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: "Active Students", value: loading ? "..." : String(tutorStats?.activeStudents ?? 0), icon: Users, color: "from-blue-500/20 to-cyan-500/20 text-blue-600 dark:text-blue-400 border-blue-200/40" },
                { 
                  label: "Hourly Rate Range", 
                  value: loading ? "..." : (() => {
                    const rates = tutorProfile?.subjectRates?.map((sr: any) => sr.rate) || [];
                    if (rates.length === 0) {
                      return tutorProfile?.hourlyRate ? `₹${tutorProfile.hourlyRate}/hr` : "₹500/hr";
                    }
                    const minRate = Math.min(...rates);
                    const maxRate = Math.max(...rates);
                    if (minRate === maxRate) {
                      return `₹${minRate}/hr`;
                    }
                    return `₹${minRate}-${maxRate}/hr`;
                  })(), 
                  icon: DollarSign, 
                  color: "from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200/40" 
                },
                { label: "Success Rate", value: loading ? "..." : (tutorProfile?.rating && tutorProfile.rating > 0 ? `${Math.round(tutorProfile.rating * 20)}%` : "100%"), icon: TrendingUp, color: "from-purple-500/20 to-indigo-500/20 text-purple-600 dark:text-purple-400 border-purple-200/40" }
              ].map((stat, idx) => (
                <Card 
                  key={idx} 
                  className={`border border-border bg-card/60 backdrop-blur-md overflow-hidden relative group hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}
                >
                  <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${stat.color.includes('blue') ? 'from-blue-500 to-cyan-500' : stat.color.includes('emerald') ? 'from-emerald-500 to-teal-500' : 'from-purple-500 to-indigo-500'}`} />
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                      <h3 className="text-3xl font-extrabold text-foreground tracking-tight mt-1">{stat.value}</h3>
                    </div>
                    <div className={`p-3 rounded-2xl bg-gradient-to-br ${stat.color} shadow-inner`}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>

            {/* 2. Getting Started Steps */}
            <motion.div variants={itemVariants} className="space-y-6">
              <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-amber-500" /> Getting Started Guide
              </h2>

              <div className="grid gap-6">
                {/* Step 1 */}
                <div className="flex gap-4 p-6 bg-card border rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-extrabold text-lg dark:bg-emerald-950/60 dark:text-emerald-400">
                    1
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-foreground">Set Your Availability</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Configure your teaching schedule so students know when you're available for bookings.
                    </p>
                    <div className="inline-flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 px-3 py-1.5 rounded-lg border border-amber-200/30 font-medium">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Tip: Tutors with flexible availability get 3x more bookings!
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4 p-6 bg-card border rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-extrabold text-lg dark:bg-indigo-950/60 dark:text-indigo-400">
                    2
                  </div>
                  <div className="space-y-3 w-full">
                    <h3 className="text-lg font-bold text-foreground">Enable Notifications</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Get instant alerts when students book sessions or send messages.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-1">
                      <Button 
                        onClick={handleEnableNotifications} 
                        disabled={notificationsEnabled}
                        className={`bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm shadow-indigo-500/10 transition-all ${notificationsEnabled ? 'bg-emerald-600 hover:bg-emerald-600' : ''}`}
                      >
                        {notificationsEnabled ? (
                          <>
                            <CheckCircle className="mr-1.5 h-4 w-4" /> Notifications Enabled
                          </>
                        ) : (
                          <>
                            <Bell className="mr-1.5 h-4 w-4 animate-bounce" /> Enable Notifications
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={handleSkipNotifications}
                        className="rounded-lg text-muted-foreground hover:bg-secondary/40"
                      >
                        Skip for Now
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4 p-6 bg-card border rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500" />
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-extrabold text-lg dark:bg-purple-950/60 dark:text-purple-400">
                    3
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-foreground">Build Your Reputation</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Deliver quality sessions to earn 5-star reviews. Top-rated tutors appear first in search results.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 3. What Happens Next & Pro Tips */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              {/* What Happens Next */}
              <div className="bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/20 p-6 rounded-2xl space-y-4">
                <h3 className="text-lg font-extrabold text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" /> What Happens Next?
                </h3>
                <ul className="space-y-3">
                  {[
                    "Your profile is now live and visible to all students searching for tutors",
                    "Students can book sessions with you based on your availability",
                    "You'll receive booking notifications and payment after each completed session",
                    "Track your earnings and student reviews in your dashboard"
                  ].map((text, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pro Tips */}
              <div className="bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/20 p-6 rounded-2xl space-y-4">
                <h3 className="text-lg font-extrabold text-indigo-800 dark:text-indigo-400 flex items-center gap-2">
                  <Sparkles className="h-5 w-5" /> Pro Tips for Success
                </h3>
                <ul className="space-y-3">
                  {[
                    "Respond to booking requests within 2 hours to increase your response rate score",
                    "Complete your first 5 sessions to get your \"Rising Star\" badge",
                    "Add a video introduction to your profile (tutors with videos get 60% more views)",
                    "Offer a free 15-minute trial to attract your first students"
                  ].map((text, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      <span className="text-indigo-500 font-extrabold shrink-0">•</span>
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* 4. Action / Redirect Footer */}
            <motion.div variants={itemVariants} className="text-center pt-8 space-y-3 border-t">
              <Button 
                size="lg" 
                onClick={() => navigate("/dashboard/tutor")}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold rounded-full px-10 h-12 shadow-md hover:shadow-emerald-500/20 transition-all hover:scale-[1.02]"
              >
                Go to Your Dashboard <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 text-primary" /> You can access this guide anytime from your dashboard.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </PageLayout>
  );
};

export default TutorWelcome;
