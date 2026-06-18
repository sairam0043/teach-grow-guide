import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { BookOpen, Calendar, Clock, Award, CheckCircle, ArrowLeft, Sparkles, CreditCard, Monitor, Check, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageLayout from "@/components/layout/PageLayout";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";
import API_URL from "@/config/api";

const AIFullCourseEnrollment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [enrollmentStatus, setEnrollmentStatus] = useState<{
    hasAssessment: boolean;
    isShortlisted: boolean;
    isEnrolled: boolean;
  } | null>(null);

  // Sandbox Modal State
  const [sandboxOrder, setSandboxOrder] = useState<any>(null);
  const [sandboxMethod, setSandboxMethod] = useState<"card" | "upi" | "netbanking">("card");
  const [isSandboxPaying, setIsSandboxPaying] = useState(false);
  const [sandboxPaymentSuccess, setSandboxPaymentSuccess] = useState(false);

  // Load Razorpay checkout script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Fetch enrollment and shortlist status
  useEffect(() => {
    const fetchStatus = async () => {
      if (!user) {
        setCheckingStatus(false);
        return;
      }
      try {
        setCheckingStatus(true);
        const res = await axios.get(`${API_URL}/payments/check-enrollment-status/${user.id}`);
        setEnrollmentStatus(res.data);
      } catch (err) {
        console.error("Failed to check enrollment status:", err);
        toast.error("Failed to verify shortlisting status.");
      } finally {
        setCheckingStatus(false);
      }
    };
    fetchStatus();
  }, [user]);

  const handleCheckout = async () => {
    if (loading || !user) return;

    setLoading(true);
    try {
      const studentName = String(user.full_name || "Student");
      const studentEmail = user.email;

      // 1. Create order on backend
      const orderRes = await axios.post(`${API_URL}/payments/create-course-order`, {
        studentId: user.id,
        studentName,
        studentEmail,
        purchaseType: "full_course"
      });

      const orderData = orderRes.data;

      if (orderData.isSandbox) {
        // Open custom mock sandbox dialog
        setSandboxOrder({
          orderId: orderData.orderId,
          coursePaymentId: orderData.coursePayment._id,
          amount: orderData.amount,
          price: 1500,
          purchaseType: "full_course",
          studentName,
          studentEmail
        });
        setLoading(false);
      } else {
        // Open official Razorpay checkout modal
        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "Cuvasol Direct Courses",
          description: "AI Future Skills Program Enrollment",
          image: "/logo.png",
          order_id: orderData.orderId,
          handler: async function (response: any) {
            try {
              toast.loading("Verifying transaction...");
              const verifyRes = await axios.post(`${API_URL}/payments/verify-course-payment`, {
                coursePaymentId: orderData.coursePayment._id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              });
              
              toast.dismiss();
              toast.success("Payment verified! Full Course Enrollment is confirmed.");
              setLoading(false);
              navigate("/dashboard/student");
            } catch (verifyErr: any) {
              toast.dismiss();
              toast.error(verifyErr.response?.data?.message || "Payment verification failed.");
              setLoading(false);
            }
          },
          prefill: {
            name: studentName,
            email: studentEmail,
            contact: user.phone || ""
          },
          theme: {
            color: "#6366f1" // Indigo
          },
          modal: {
            ondismiss: function() {
              setLoading(false);
              toast.warning("Payment checkout cancelled.");
            }
          }
        };

        const rzp = (window as any).Razorpay ? new (window as any).Razorpay(options) : null;
        if (rzp) {
          rzp.open();
        } else {
          throw new Error("Razorpay SDK not loaded.");
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to initiate payment");
      setLoading(false);
    }
  };

  const handleCompleteSandboxPayment = async () => {
    if (!sandboxOrder) return;
    setIsSandboxPaying(true);
    
    // Simulate transaction processing delay
    setTimeout(async () => {
      setSandboxPaymentSuccess(true);
      
      // Simulate success delay
      setTimeout(async () => {
        try {
          const mockPaymentId = `pay_mock_${Math.random().toString(36).substring(2, 11)}`;
          
          toast.loading("Verifying sandbox transaction...");
          await axios.post(`${API_URL}/payments/verify-course-payment`, {
            coursePaymentId: sandboxOrder.coursePaymentId,
            razorpay_payment_id: mockPaymentId,
            razorpay_order_id: sandboxOrder.orderId,
            razorpay_signature: `sig_mock_${Math.random().toString(36).substring(2, 11)}`
          });
          
          toast.dismiss();
          toast.success("Payment verified! Enrollment confirmed.");
          
          setSandboxOrder(null);
          setIsSandboxPaying(false);
          setSandboxPaymentSuccess(false);
          navigate("/dashboard/student");
        } catch (verifyErr: any) {
          toast.dismiss();
          toast.error(verifyErr.response?.data?.message || "Payment verification failed.");
          setIsSandboxPaying(false);
          setSandboxPaymentSuccess(false);
        }
      }, 1200);
    }, 1500);
  };

  const handleCancelSandboxPayment = () => {
    setSandboxOrder(null);
    setLoading(false);
    toast.warning("Payment checkout cancelled.");
  };

  if (checkingStatus) {
    return (
      <PageLayout>
        <div className="container py-16 flex flex-col items-center justify-center min-h-[50vh]">
          <div className="h-10 w-10 rounded-full border-4 border-teal-600 border-t-transparent animate-spin mb-4"></div>
          <p className="text-muted-foreground text-sm font-semibold">Verifying shortlist invitation status...</p>
        </div>
      </PageLayout>
    );
  }

  // Not Logged In
  if (!user) {
    return (
      <PageLayout>
        <div className="container py-12 max-w-md mx-auto">
          <Card className="border-amber-500/20 shadow-lg text-center p-6 bg-card/60 backdrop-blur-md">
            <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 mb-4 animate-pulse" />
            <CardTitle className="text-lg font-bold text-foreground">Authentication Required</CardTitle>
            <CardDescription className="mt-2">
              You must be logged in as a student to access the secure enrollment page.
            </CardDescription>
            <div className="mt-6 flex flex-col gap-2">
              <Button className="w-full bg-primary" asChild>
                <Link to={`/login?redirect=${encodeURIComponent(location.pathname)}`}>Log In</Link>
              </Button>
              <Button variant="ghost" className="w-full" asChild>
                <Link to="/ai-program">Back to Course Info</Link>
              </Button>
            </div>
          </Card>
        </div>
      </PageLayout>
    );
  }

  // Not Shortlisted (And not enrolled)
  if (!enrollmentStatus?.isShortlisted && !enrollmentStatus?.isEnrolled) {
    return (
      <PageLayout>
        <div className="container py-12 max-w-lg mx-auto">
          <Card className="border-rose-500/20 shadow-xl text-center p-8 bg-card/60 backdrop-blur-md">
            <AlertTriangle className="mx-auto h-16 w-16 text-rose-500 mb-4" />
            <h3 className="text-2xl font-extrabold text-foreground tracking-tight">Access Restricted</h3>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              This secure page is reserved only for students shortlisted for the **AI Future Skills Program**. 
              If you haven't taken the assessment test yet, please register and complete it first.
            </p>
            <div className="bg-secondary/30 rounded-xl p-4 border border-border/40 text-left text-xs mt-6 space-y-2">
              <span className="font-bold text-foreground block">How to enroll:</span>
              <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
                <li>Go to the main course page and register for the assessment (₹150).</li>
                <li>Wait for evaluation and shortlisting by the admissions team.</li>
                <li>You will receive an invitation email once you are shortlisted!</li>
              </ol>
            </div>
            <div className="mt-8 flex gap-3">
              <Button variant="default" className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold" asChild>
                <Link to="/ai-program">Go to Course Page</Link>
              </Button>
              <Button variant="outline" className="flex-1" asChild>
                <Link to="/dashboard/student">Go to Dashboard</Link>
              </Button>
            </div>
          </Card>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container py-8 max-w-5xl">
        <Button variant="ghost" asChild className="mb-6 hover:bg-secondary/40">
          <Link to="/ai-program"><ArrowLeft className="mr-2 h-4 w-4" /> Course Details</Link>
        </Button>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column: Confirmation Information */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-3">
                Shortlist Confirmed
              </Badge>
              <Badge variant="outline" className="border-indigo-500/30 text-indigo-600 font-bold bg-indigo-50 py-1 px-3">
                Full Program Enrollment
              </Badge>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
                <Sparkles className="h-7 w-7 text-indigo-600 animate-pulse" />
                Complete AI Program Enrollment
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Welcome, **{user.full_name}**! You have successfully passed our assessment screening and are officially shortlisted for the AI Future Skills Program. Complete the tuition fee payment below to secure your seat.
              </p>
            </div>

            {/* Course Program Benefits Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: Clock, value: "Daily Interactive Sessions", label: "1 hour weekday classes" },
                { icon: BookOpen, value: "Full Syllabus Access", label: "Creative coding & prompt labs" },
                { icon: Award, value: "Verifiable Certificate", label: "Sharable student credential" }
              ].map((item, idx) => (
                <div key={idx} className="bg-secondary/20 border border-border/40 p-4 rounded-2xl text-center space-y-1">
                  <item.icon className="mx-auto h-5 w-5 text-indigo-600 mb-1" />
                  <p className="font-bold text-foreground text-sm leading-tight">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-5 space-y-3">
              <h4 className="font-bold text-indigo-900 dark:text-indigo-400 flex items-center gap-1.5 text-base">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                Enrollment Guarantee
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                By completing this checkout, your seat in the batch starting **1 July 2026** is reserved. Daily class links, learning material logins, and mentor group details will be emailed to **{user.email}** within 24 hours of enrollment.
              </p>
            </div>
          </div>

          {/* Right Column: Checkout Pricing Card */}
          <div className="space-y-6">
            <Card className="border border-indigo-500/20 shadow-lg bg-card/75 backdrop-blur-md sticky top-6">
              <CardHeader className="bg-gradient-to-r from-indigo-500/15 to-indigo-500/5 border-b pb-4">
                <CardTitle className="text-xl font-bold text-foreground">Tuition Payment</CardTitle>
                <CardDescription>Secure payment for full program access.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                
                {/* Plan Cost */}
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 flex justify-between items-center">
                  <div className="space-y-0.5">
                    <span className="font-extrabold text-sm block text-indigo-800 dark:text-indigo-300">Full Course Fees</span>
                    <span className="text-xs text-muted-foreground block">1 Month program tuition</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-extrabold text-2xl block text-indigo-600">₹1,500</span>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground block">one-time</span>
                  </div>
                </div>

                {enrollmentStatus?.isEnrolled ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center space-y-2">
                    <CheckCircle className="mx-auto h-8 w-8 text-emerald-600 animate-bounce" />
                    <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Already Enrolled!</p>
                    <p className="text-xs text-muted-foreground leading-normal">You are successfully enrolled in the full course. Classes start on July 1, 2026.</p>
                    <Button variant="outline" className="w-full border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5 mt-2" asChild>
                      <Link to="/dashboard/student">Go to Student Dashboard</Link>
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleCheckout}
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-6 text-base rounded-2xl shadow-md hover:shadow-indigo-500/15 hover:-translate-y-0.5 transition-all duration-300"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"></span>
                        Initiating Order...
                      </span>
                    ) : (
                      "Enroll & Pay ₹1,500"
                    )}
                  </Button>
                )}

                {/* Corporate Address Footer */}
                <div className="border-t border-border/40 pt-4 space-y-2 text-[10px] text-muted-foreground text-center">
                  <p className="font-bold flex items-center justify-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5 text-indigo-600" />
                    Verified Secure Razorpay Checkout
                  </p>
                  <p className="leading-normal">
                    <strong>Cuvasol Technologies Private Limited</strong><br />
                    HD-169, We Work, 78 Old Madras Road, Bangalore 560016, Karnataka, IN
                  </p>
                </div>

              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Sandbox Mock Checkout Overlay */}
      {sandboxOrder && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all duration-300">
          <div className="bg-slate-900 text-slate-100 rounded-3xl border border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] max-w-md w-full overflow-hidden flex flex-col transform transition-all duration-300 scale-100 relative max-h-[90vh]">
            
            {/* Header with gradient */}
            <div className="bg-gradient-to-br from-indigo-600 to-teal-700 p-6 text-white relative">
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 animate-pulse">
                  🧪 Sandbox Mode
                </Badge>
                <button 
                  onClick={handleCancelSandboxPayment}
                  className="rounded-full p-1.5 bg-black/20 hover:bg-black/40 transition-colors text-white/80 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-indigo-200 font-semibold tracking-wider uppercase mb-1">Direct Platform Purchase</p>
              <h3 className="text-2xl font-bold tracking-tight">Cuvasol Course Checkout</h3>
              <div className="mt-4 flex items-baseline justify-between border-t border-white/10 pt-4">
                <span className="text-sm text-indigo-100">Amount to Pay</span>
                <span className="text-3xl font-extrabold text-white">₹{sandboxOrder.price}</span>
              </div>
            </div>

            {/* Main content body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Summary card */}
              <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Course:</span>
                  <span className="font-semibold text-slate-200">AI Future Skills Program</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Student Name:</span>
                  <span className="font-semibold text-slate-200">{sandboxOrder.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Student Email:</span>
                  <span className="font-semibold text-slate-200">{sandboxOrder.studentEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Purchase Item:</span>
                  <span className="font-semibold text-indigo-400">
                    Full Course Enrollment
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-800/80 pt-2 text-[10px] text-slate-500">
                  <span>Order ID Reference:</span>
                  <span className="font-mono">{sandboxOrder.orderId}</span>
                </div>
              </div>

              {/* Payment Methods tabs */}
              <div className="space-y-4">
                <div className="flex border-b border-slate-800">
                  <button
                    onClick={() => setSandboxMethod("card")}
                    className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all ${
                      sandboxMethod === "card" 
                        ? "border-indigo-500 text-indigo-400" 
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <CreditCard className="inline-block h-4 w-4 mr-1.5 -mt-0.5" />
                    Card
                  </button>
                  <button
                    onClick={() => setSandboxMethod("upi")}
                    className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all ${
                      sandboxMethod === "upi" 
                        ? "border-indigo-500 text-indigo-400" 
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span className="inline-block font-mono font-bold mr-1 bg-slate-800 text-slate-300 text-[10px] px-1 rounded">UPI</span>
                    UPI Pay
                  </button>
                  <button
                    onClick={() => setSandboxMethod("netbanking")}
                    className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all ${
                      sandboxMethod === "netbanking" 
                        ? "border-indigo-500 text-indigo-400" 
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Monitor className="inline-block h-4 w-4 mr-1.5 -mt-0.5" />
                    Netbanking
                  </button>
                </div>

                {/* Card Fields */}
                {sandboxMethod === "card" && (
                  <div className="space-y-4 text-xs">
                    <div className="bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-700/50 p-4 rounded-xl shadow-inner relative overflow-hidden h-28 flex flex-col justify-between">
                      <div className="absolute -top-6 -right-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none"></div>
                      <div className="flex justify-between items-start">
                        <div className="h-6 w-8 bg-amber-500/30 border border-amber-500/40 rounded-sm"></div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Sandbox Card</span>
                      </div>
                      <div className="text-base font-mono tracking-widest text-slate-300 my-1">
                        4111 1111 1111 1111
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <div>
                          <p className="text-[8px] text-slate-500 uppercase">Card Holder</p>
                          <p className="font-semibold text-slate-400">{sandboxOrder.studentName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] text-slate-500 uppercase">Expires</p>
                          <p className="font-semibold text-slate-400">12/29</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Card Number</label>
                        <input
                          type="text"
                          readOnly
                          value="4111 1111 1111 1111"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-400 font-medium mb-1">Expiry Date</label>
                          <input
                            type="text"
                            readOnly
                            value="12/29"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 font-medium mb-1">CVV</label>
                          <input
                            type="password"
                            readOnly
                            value="***"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 text-center"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* UPI Fields */}
                {sandboxMethod === "upi" && (
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      {["Google Pay", "PhonePe", "Paytm", "BHIM"].map((app) => (
                        <div 
                          key={app}
                          className="p-2 border border-slate-800 bg-slate-950/40 rounded-lg text-center font-medium text-slate-300 flex items-center justify-center gap-1.5"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                          {app}
                        </div>
                      ))}
                    </div>
                    <div>
                      <label className="block text-slate-400 font-medium mb-1">UPI ID (VPA)</label>
                      <input
                        type="text"
                        readOnly
                        value="student@sandboxupi"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 font-mono text-center"
                      />
                    </div>
                  </div>
                )}

                {/* Netbanking Fields */}
                {sandboxMethod === "netbanking" && (
                  <div className="space-y-3 text-xs">
                    <label className="block text-slate-400 font-medium">Select Your Bank</label>
                    <div className="grid grid-cols-2 gap-2">
                      {["State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank"].map((bank) => (
                        <div 
                          key={bank}
                          className="p-3 border border-slate-800 bg-slate-950/40 rounded-lg text-center font-medium text-slate-300 hover:border-indigo-500/50 cursor-pointer transition-colors"
                        >
                          {bank}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="space-y-2 pt-4">
                <Button 
                  onClick={handleCompleteSandboxPayment}
                  className="w-full bg-gradient-to-r from-indigo-500 to-teal-600 hover:from-indigo-600 hover:to-teal-700 text-white rounded-xl py-5 font-bold text-sm tracking-wide shadow-lg border-0"
                >
                  <CheckCircle className="h-4 w-4 mr-1.5" /> Authorize Mock Payment
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={handleCancelSandboxPayment}
                  className="w-full text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 rounded-xl py-5 text-xs font-semibold"
                >
                  Cancel and Go Back
                </Button>
              </div>

              <div className="text-center text-[10px] text-slate-600 flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                Sandbox Mock Gateway • Encrypted connection simulation
              </div>
            </div>

            {/* Spinner Overlay during Pay */}
            {isSandboxPaying && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center">
                {!sandboxPaymentSuccess ? (
                  <div className="space-y-4 flex flex-col items-center">
                    <div className="relative w-16 h-16">
                      <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                      <div className="absolute inset-2 w-12 h-12 rounded-full border-4 border-teal-500/10 border-b-teal-400 animate-spin [animation-direction:reverse]"></div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white tracking-wide">Processing Sandbox Transaction</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                        Simulating payment gateway authorization and updating course enrollment logs...
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.3)] animate-pulse">
                      <Check className="h-8 w-8 text-emerald-400 stroke-[3]" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-emerald-400 tracking-wide">Payment Successful</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs">
                        RefId: {sandboxOrder.orderId.replace('order_mock_', 'tx_')} <br />
                        Updating platform database and sending confirmation email...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default AIFullCourseEnrollment;
