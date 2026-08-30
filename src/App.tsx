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
import RecentlyViewed from "./pages/RecentlyViewed";
import NotFound from "./pages/NotFound";
import ApproveBooking from "./pages/ApproveBooking";
import TutorWelcome from "./pages/TutorWelcome";
import GoogleCallback from "./pages/GoogleCallback";

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
            <div className="sticky top-0 z-40 border-b border-red-200 bg-red-50/95 text-red-800 backdrop-blur-sm dark:border-red-900/80 dark:bg-red-950/80 dark:text-red-200">
              <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/60">
                    <AlertCircle className="h-4 w-4 animate-pulse" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold">Temporary Network Issue</p>
                    <p className="text-sm text-red-700 dark:text-red-200">
                      The website is temporarily facing connection issues. We are working to restore service. Please try again shortly.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleRetry}
                  disabled={isChecking}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:bg-red-800"
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
              path="/recently-viewed"
              element={<ProtectedRoute allowedRoles={["student"]}><RecentlyViewed /></ProtectedRoute>}
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
            <Route path="/google-callback" element={<GoogleCallback />} />
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
