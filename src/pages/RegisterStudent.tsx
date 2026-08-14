import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PageLayout from "@/components/layout/PageLayout";
import { Eye, EyeOff, Check, ArrowLeft, ArrowRight } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";

import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { detectUserTimeZone } from "@/utils/timezone";

const CLASS_OPTIONS = [
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
  "College / University",
  "Other"
];

const capitalizeName = (str: string): string => {
  return str
    .split(' ')
    .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : '')
    .join(' ');
};

const RegisterStudent = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [studentOrParent, setStudentOrParent] = useState("Student");
  const [studentClass, setStudentClass] = useState("");
  const [customClass, setCustomClass] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showFormMobile, setShowFormMobile] = useState(false);
  const { signUp, googleSignIn, user, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      if (role === "student") {
        navigate("/dashboard/student");
      } else if (role === "tutor") {
        navigate("/dashboard/tutor");
      } else if (role === "admin") {
        navigate("/dashboard/admin");
      }
    }
  }, [user, role, navigate]);

  const queryParams = new URLSearchParams(location.search);
  const redirectUrl = queryParams.get("redirect");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalClass = studentClass === "Other" ? customClass.trim() : studentClass;
    if (!finalClass) {
      toast.error("Please select or specify your class / grade.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Password and confirm password must match.");
      return;
    }

    if (!agreeTerms) {
      toast.error("You must accept the Terms & Conditions to register.");
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, {
      full_name: name,
      phone,
      student_class: finalClass,
      student_or_parent: studentOrParent,
      role: "student",
      timezone: detectUserTimeZone(),
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Create student record after auth — wait for session
    toast.success("Account created! Please check your email to confirm, then log in.");
    setLoading(false);
    navigate(redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : "/login");
  };
  return (
    <PageLayout>
      <div className="w-full min-h-[calc(100vh-64px)] flex items-center justify-center p-0 sm:p-4 md:p-8 relative bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] bg-background">

        {/* Centered card containing both value proposition and registration form */}
        <div className="w-full max-w-5xl bg-transparent sm:bg-card/95 backdrop-blur-none sm:backdrop-blur-sm rounded-none sm:rounded-2xl border-none sm:border border-border/60 shadow-none sm:shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch relative z-10 my-4">

          {/* Left Column: Dark Blue Value Proposition */}
          <div className={`relative bg-slate-950 text-white p-8 xl:p-12 flex-col overflow-hidden lg:flex lg:col-span-5 ${showFormMobile ? 'hidden' : 'flex min-h-[calc(100vh-120px)] sm:min-h-[600px] lg:min-h-0'
            }`}>
            {/* Grid overlay lines */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none animate-pulse duration-1000" />

            {/* Theme-colored gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/5 to-transparent pointer-events-none" />

            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/20 rounded-full blur-[80px] pointer-events-none -mr-30 -mt-30" />
            <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-primary/10 rounded-full blur-[60px] pointer-events-none -ml-15 -mb-15" />

            {/* Top Logo & Portal Info */}
            <div className="relative z-10 flex items-center gap-2.5 mb-6">
              <img src="/logo.png" alt="Logo" className="h-9 w-auto" />
              <div>
                <span className="font-bold text-base tracking-tight block leading-none text-white">Cuvasol</span>
                <span className="text-[10px] uppercase tracking-wider text-white/80 font-bold mt-1 block">Student Portal</span>
              </div>
            </div>

            {/* Middle Value Props */}
            <div className="relative z-10 max-w-sm flex-grow flex flex-col justify-start">
              <div className="mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/90 text-[10px] font-semibold uppercase tracking-wider border border-white/5">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  Student Portal
                </span>
              </div>

              {/* Promotional Offer Card */}
              <div className="mb-6 p-5 rounded-xl bg-gradient-to-br from-primary/25 via-primary/10 to-transparent border border-primary/35 shadow-lg backdrop-blur-md relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 opacity-50" />
                <span className="relative z-10 text-[9px] font-extrabold tracking-wider text-primary bg-white px-2 py-0.5 rounded uppercase inline-block mb-1.5">
                  Special Offer
                </span>
                <h3 className="relative z-10 text-base font-extrabold text-white leading-snug">
                  30% OFF on Monthly Tutor Plans
                </h3>
                <p className="relative z-10 text-[13px] text-white/90 mt-1 font-semibold">
                  Plans starting from ₹1,500/month
                </p>
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-white mb-8">
                Your Questions, Answered.
              </h2>

              <div className="space-y-[38px]">
                {[
                  {
                    q: "Why should I register?",
                    a: "Connect with 200+ hand-picked tutors specializing in your exact subjects."
                  },
                  {
                    q: "What benefits will I receive?",
                    a: "Access to a personal dashboard, direct chat with tutors, and easy progress tracking."
                  },
                  {
                    q: "Is it free?",
                    a: "Yes! Creating an account and booking your initial demo class is 100% free."
                  },
                  {
                    q: "What happens after I register?",
                    a: "Browse tutor profiles, request a demo slot, and start your first session."
                  },
                  {
                    q: "Can I try before subscribing?",
                    a: "Yes — book a FREE demo class"
                  }
                ].map((item, idx) => (
                  <div key={idx} className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                    <div className="flex items-start gap-2.5">
                      <div className="flex-shrink-0 h-5 w-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mt-0.5">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                      <h3 className="text-base font-bold text-white tracking-wide leading-snug font-sans antialiased">
                        {item.q}
                      </h3>
                    </div>
                    <p className="text-sm text-white/85 pl-7 leading-relaxed font-normal antialiased">
                      {item.a}
                    </p>
                  </div>
                ))}
              </div>

              {/* Mobile-only Continue Button */}
              <div className="lg:hidden mt-8 pt-2">
                <Button
                  onClick={() => setShowFormMobile(true)}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-6 rounded-xl text-sm shadow-lg flex items-center justify-center gap-2 group transition-all duration-200"
                >
                  Continue to Sign Up
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>

                <div className="mt-4 text-center text-xs text-white/60">
                  Already have an account?{" "}
                  <Link
                    to={redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : "/login"}
                    className="text-primary hover:underline font-bold"
                  >
                    Log in
                  </Link>
                </div>
              </div>
            </div>

            {/* Bottom Footer */}
            <div className="relative z-10 text-[11px] text-white/60 font-medium pt-4 mt-8 border-t border-white/5">
              © 2026 Cuvasol - Live classes powered by Cuvasol Live
            </div>
          </div>

          {/* Right Column: Registration Form */}
          <div className={`col-span-1 lg:col-span-7 flex-col justify-center px-4 py-6 sm:p-8 lg:p-10 bg-transparent ${showFormMobile ? 'flex' : 'hidden lg:flex'
            }`}>
            <div className="mx-auto w-full max-w-md animate-in fade-in duration-350">
              <div className="text-center pb-4">
                <div className="mx-auto mb-2 flex h-12 w-auto items-center justify-center">
                  <img src="/logo.png" alt="Logo" className="h-12 w-auto" />
                </div>
                <h2 className="text-xl font-bold">Student Registration</h2>
                <p className="text-xs text-muted-foreground mt-1">Create your free student account and start learning</p>

                {/* Mobile-only Back to Benefits Button */}
                <button
                  type="button"
                  onClick={() => setShowFormMobile(false)}
                  className="lg:hidden mt-3 inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline"
                >
                  <ArrowLeft className="h-3 w-3" />
                  View Benefits & Questions
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" required maxLength={100} value={name} onChange={(e) => setName(capitalizeName(e.target.value.replace(/[^a-zA-Z\s'-]/g, '')))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9+\s-]/g, ''))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentOrParent">Are you a Student or Parent?</Label>
                  <Select value={studentOrParent} onValueChange={setStudentOrParent} required>
                    <SelectTrigger id="studentOrParent">
                      <SelectValue placeholder="Select Option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Student">Student</SelectItem>
                      <SelectItem value="Parent">Parent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentClass">Class / Grade</Label>
                  <Select value={studentClass} onValueChange={setStudentClass} required>
                    <SelectTrigger id="studentClass">
                      <SelectValue placeholder="Select Class / Grade" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[260px]">
                      {CLASS_OPTIONS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {studentClass === "Other" && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Label htmlFor="customClass">Specify Class / Grade</Label>
                    <Input
                      id="customClass"
                      required
                      placeholder="e.g. Masters, Diploma, Grade 5"
                      value={customClass}
                      onChange={(e) => setCustomClass(e.target.value)}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 pt-2 pb-1">
                  <Checkbox
                    id="agreeTerms"
                    checked={agreeTerms}
                    onCheckedChange={(checked) => setAgreeTerms(checked === true)}
                  />
                  <Label htmlFor="agreeTerms" className="text-xs text-muted-foreground leading-snug cursor-pointer">
                    I have read and agree to the{" "}
                    <Link to="/terms" target="_blank" className="text-primary font-semibold underline hover:text-primary/80">
                      Terms & Conditions
                    </Link>{" "}
                    and Privacy Policy. <span className="text-destructive">*</span>
                  </Label>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating Account..." : "Sign Up"}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account? <Link to={redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : "/login"} className="text-primary hover:underline font-semibold">Log in</Link>
                <br />
                <span className="inline-block mt-2">
                  Want to teach? <Link to="/register/tutor" className="text-primary hover:underline font-semibold">Register as Tutor</Link>
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </PageLayout>
  );
};

export default RegisterStudent;
