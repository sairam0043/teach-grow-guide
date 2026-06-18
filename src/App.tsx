import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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

const App = () => (
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
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/tutors" element={<BrowseTutors />} />
            <Route path="/tutors/:id" element={<TutorProfile />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/ai-program" element={<AIFutureSkills />} />
            <Route 
              path="/ai-program/enroll" 
              element={<ProtectedRoute allowedRoles={["student"]}><AIFullCourseEnrollment /></ProtectedRoute>} 
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

export default App;
