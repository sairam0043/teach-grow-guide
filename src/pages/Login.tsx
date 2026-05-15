import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PageLayout from "@/components/layout/PageLayout";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";
import API_URL from "@/config/api";
import { GoogleLogin } from "@react-oauth/google";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [view, setView] = useState<"login" | "forgot" | "reset">("login");
  const [resetEmail, setResetEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const { signIn, googleSignIn } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    const { error } = await googleSignIn(credentialResponse.credential);
    setLoading(false);
    
    if (error) {
      toast.error(error.message || "Google login failed");
    } else {
      toast.success("Logged in with Google!");
      navigate("/");
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error(
        error.message === "Invalid login credentials"
          ? "Invalid login credentials. Check your email/password."
          : error.message,
      );
    } else {
      toast.success("Logged in successfully!");
      const checkAndRedirect = async () => {
        try {
          const raw = localStorage.getItem("demo_auth");
          if (raw) {
            const parsed = JSON.parse(raw);
            const userRole = parsed.role;
            if (userRole === "admin") navigate("/dashboard/admin");
            else if (userRole === "tutor") navigate("/dashboard/tutor");
            else navigate("/dashboard/student");
            return;
          }
        } catch { }
        navigate("/");
      };
      setTimeout(checkAndRedirect, 300);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return toast.error("Please enter your email");
    setLoading(true);
    console.log(`[Forgot Password] Initiating OTP request for: ${resetEmail}`);
    try {
      await axios.post(`${API_URL}/auth/forgot-password`, { email: resetEmail });
      console.log(`[Forgot Password] OTP request successful for: ${resetEmail}`);
      toast.success("OTP sent to your email!");
      setView("reset");
    } catch (err: any) {
      console.error(`[Forgot Password] Failed for ${resetEmail}:`, err.response?.data || err.message);
      toast.error(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !newPassword) return toast.error("Please fill all fields");
    setLoading(true);
    console.log(`[Reset Password] Initiating password reset for: ${resetEmail}`);
    try {
      await axios.post(`${API_URL}/auth/reset-password`, {
        email: resetEmail,
        otp,
        newPassword
      });
      console.log(`[Reset Password] Password reset successful for: ${resetEmail}`);
      toast.success("Password reset successfully! Please log in.");
      setView("login");
      setOtp("");
      setNewPassword("");
      setResetEmail("");
    } catch (err: any) {
      console.error(`[Reset Password] Failed for ${resetEmail}:`, err.response?.data || err.message);
      toast.error(err.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <div className="flex min-h-[70vh] items-center justify-center py-12">
        <Card className="w-full max-w-md shadow-card">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-16 w-auto items-center justify-center">
              <img src="/" alt="Logo" className="h-16 w-auto" />
            </div>
            <CardTitle className="text-2xl">
              {view === "login" ? "Welcome Back" : view === "forgot" ? "Reset Password" : "Enter OTP"}
            </CardTitle>
            <CardDescription>
              {view === "login" ? "Log in to your Cuvasol Tutor account" : view === "forgot" ? "Enter your email to receive an OTP" : "Enter the OTP sent to your email and your new password"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {view === "login" && (
              <>
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="your@email.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <button type="button" onClick={() => setView("forgot")} className="text-sm text-primary hover:underline">
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        required
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
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Logging in..." : "Log In"}
                  </Button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t"></span>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => toast.error("Google Login Failed")}
                    useOneTap
                  />
                </div>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link to="/register/student" className="text-primary hover:underline">Sign up as Student</Link>
                  {" or "}
                  <Link to="/register/tutor" className="text-primary hover:underline">as Tutor</Link>
                </div>
              </>
            )}

            {view === "forgot" && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resetEmail">Email</Label>
                  <Input id="resetEmail" type="email" placeholder="your@email.com" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending..." : "Send OTP"}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setView("login")} disabled={loading}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
                </Button>
              </form>
            )}

            {view === "reset" && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">6-Digit OTP</Label>
                  <Input id="otp" type="text" placeholder="123456" maxLength={6} required value={otp} onChange={(e) => setOtp(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                      aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Resetting..." : "Reset Password"}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setView("login")} disabled={loading}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default Login;
