import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import BrowseTutors from "./pages/BrowseTutors";
import TutorProfile from "./pages/TutorProfile";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Terms from "./pages/Terms";
import Login from "./pages/Login";
import RegisterStudent from "./pages/RegisterStudent";
import RegisterTutor from "./pages/RegisterTutor";
import StudentDashboard from "./pages/dashboard/StudentDashboard";
import TutorDashboard from "./pages/dashboard/TutorDashboard";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import NotFound from "./pages/NotFound";
import ApproveBooking from "./pages/ApproveBooking";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
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
              path="/dashboard/admin"
              element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>}
            />
            <Route path="/approve-booking/:bookingId" element={<ApproveBooking />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
