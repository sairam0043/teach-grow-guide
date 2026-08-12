import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import API_URL from "@/config/api";
import { AlertCircle, X, RefreshCw } from "lucide-react";
import TagManager from "react-gtm-module";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import BrowseTutors from "./pages/BrowseTutors";
import TutorProfile from "./pages/TutorProfile";
import About from "./pages/About";
import Contact from "./pages/Contact";
import AIFutureSkills from "./pages/AIFutureSkills";
import AIFullCourseEnrollment from "./pages/AIFullCourseEnrollment";
import AIAssessment from "./pages/AIAssessment";
import Terms from "./pages/Terms";
import Login from "./pages/Login";
import RegisterStudent from "./pages/RegisterStudent";
import RegisterTutor from "./pages/RegisterTutor";
import StudentDashboard from "./pages/dashboard/StudentDashboard";
import TutorDashboard from "./pages/dashboard/TutorDashboard";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import NotFound from "./pages/NotFound";
import ApproveBooking from "./pages/ApproveBooking";
import TutorWelcome from "./pages/TutorWelcome";

const queryClient = new QueryClient();

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function TrackPageViews() {
  const location = useLocation();

  useEffect(() => {
    TagManager.dataLayer({
      dataLayer: {
        event: "page_view",
        page_path: location.pathname,
      },
    });
  }, [location]);

  return null;
}

const App = () => {
  const [showNetworkAlert, setShowNetworkAlert] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // 1. Initial health check
    const checkHealth = async () => {
      try {
        await axios.get(`${API_URL}/health`);
        setShowNetworkAlert(false);
      } catch (error) {
        setShowNetworkAlert(true);
      }
    };
    checkHealth();

    // 2. Response interceptor for network/server failures
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (!error.response || error.response.status >= 500) {
          setShowNetworkAlert(true);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const handleRetry = async () => {
    setIsChecking(true);
    try {
      await axios.get(`${API_URL}/health`);
      setShowNetworkAlert(false);
    } catch (error) {
      // Keep showing warning
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        themes={[
          "light",
          "dark-midnight",
          "dark-oled",
          "dark-forest",
          "dark-purple",
          "dark-sunset",
          "dark-ocean",
          "dark-nordic",
          "dark-neon",
          "dark-sakura",
          "dark-mocha",
          "dark-crimson",
          "dark-nebula",
          "light-blue",
          "light-rose",
          "light-amber",
          "light-lavender",
          "light-slate",
          "dark-gold",
          "dark-coral",
          "dark-mint",
          "dark-indigo",
          "dark-steel"
        ]}
        enableSystem={false}
      >
        <TooltipProvider>
          {showNetworkAlert && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 sm:p-8 max-w-lg w-full text-center relative overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Decorative top border gradient */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-amber-500 to-red-600" />
                
                {/* Close button */}
                <button
                  onClick={() => setShowNetworkAlert(false)}
                  className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-800 cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
                
                {/* Large warning icon */}
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 shadow-inner">
                  <AlertCircle className="h-10 w-10 animate-pulse" />
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-3 tracking-tight">
                  Temporary Network Issue
                </h3>
                
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
                  The website is temporarily facing connection issues. We are working to restore service. Please try again shortly.
                </p>

                <div className="flex justify-center">
                  <button
                    onClick={handleRetry}
                    disabled={isChecking}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded-xl text-sm font-semibold shadow-md transition-all duration-200 cursor-pointer min-w-[160px]"
                  >
                    {isChecking ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    <span>Try Again</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <TrackPageViews />
            <AuthProvider>
              <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/tutors" element={<BrowseTutors />} />
            <Route path="/tutors/:id" element={<TutorProfile />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/ai-program" element={<Navigate to="/" replace />} />
            <Route 
              path="/ai-program/enroll" 
              element={<Navigate to="/" replace />} 
            />
            <Route 
              path="/ai-program/take-assessment/:paymentId" 
              element={<Navigate to="/" replace />} 
            />
            <Route path="/terms" element={<Terms />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register/student" element={<RegisterStudent />} />
            <Route path="/register/tutor" element={<RegisterTutor />} />
            <Route
              path="/dashboard/student"
              element={<ProtectedRoute allowedRoles={["student"]}><StudentDashboard /></ProtectedRoute>}
            />
            <Route
              path="/dashboard/tutor"
              element={<ProtectedRoute allowedRoles={["tutor"]}><TutorDashboard /></ProtectedRoute>}
            />
            <Route
              path="/tutor/welcome"
              element={<ProtectedRoute allowedRoles={["tutor"]}><TutorWelcome /></ProtectedRoute>}
            />
            <Route
              path="/dashboard/admin"
              element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>}
            />
            <Route path="/approve-booking/:bookingId" element={<ApproveBooking />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;
