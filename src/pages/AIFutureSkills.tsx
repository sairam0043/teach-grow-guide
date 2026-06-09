import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Mail, Phone, MapPin, BookOpen, Calendar, Clock, Award, CheckCircle, ArrowLeft, Sparkles, CreditCard, Monitor, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageLayout from "@/components/layout/PageLayout";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";
import API_URL from "@/config/api";

const AIFutureSkills = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"assessment" | "full_course">("full_course");
  
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

  const handleCheckout = async () => {
    if (loading) return;

    if (!user) {
      toast.error(
        <div className="flex flex-col gap-2 w-full text-left">
          <span className="font-semibold text-sm text-foreground">
            Please log in to register or enroll in this course.
          </span>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => {
                toast.dismiss();
                navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
              }}
              className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
            >
              Log In
            </button>
            <button
              onClick={() => {
                toast.dismiss();
                navigate(`/register/student?redirect=${encodeURIComponent(location.pathname)}`);
              }}
              className="bg-secondary text-secondary-foreground border text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-secondary/80 transition-colors shadow-sm"
            >
              Sign Up
            </button>
          </div>
        </div>,
        { duration: 8000 }
      );
      return;
    }

    setLoading(true);
    try {
      const studentName = String(user.full_name || "Student");
      const studentEmail = user.email;

      // 1. Create order on backend
      const orderRes = await axios.post(`${API_URL}/payments/create-course-order`, {
        studentId: user.id,
        studentName,
        studentEmail,
        purchaseType: selectedPlan
      });

      const orderData = orderRes.data;

      if (orderData.isSandbox) {
        // Open custom mock sandbox dialog
        setSandboxOrder({
          orderId: orderData.orderId,
          coursePaymentId: orderData.coursePayment._id,
          amount: orderData.amount,
          price: selectedPlan === 'assessment' ? 150 : 1500,
          purchaseType: selectedPlan,
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
          description: selectedPlan === 'assessment' ? "AI Program Assessment" : "AI Future Skills Program Enrollment",
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
              toast.success("Payment verified! Enrollment is confirmed.");
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
            color: "#0d9488"
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

  return (
    <PageLayout>
      <div className="container py-8 max-w-7xl">
        <Button variant="ghost" asChild className="mb-6 hover:bg-secondary/40">
          <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
        </Button>

        {/* Promo Header Card */}
        <div className="rounded-3xl border border-teal-500/10 overflow-hidden shadow-lg bg-card/60 backdrop-blur-md mb-8">
          <img 
            src="/ai-program-banner.png" 
            alt="AI Future Skills Program" 
            className="w-full h-auto block" 
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column: Course Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-1 px-3">Admissions Open</Badge>
              <Badge variant="outline" className="border-teal-500/30 text-teal-600 font-bold bg-teal-50 py-1 px-3">Grades 5-9 Eligibility</Badge>
              <Badge variant="secondary" className="font-bold py-1 px-3">100% Online</Badge>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
                <Sparkles className="h-7 w-7 text-teal-600 animate-pulse" />
                AI Future Skills Program
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Prepare your child for an AI-powered future. Our program blends creativity, critical thinking, ethics, and hands-on coding to introduce young minds to AI concepts step-by-step.
              </p>
            </div>

            {/* Course Features Quick Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: Clock, value: "1 Hour Daily", label: "Weekdays schedule" },
                { icon: Calendar, value: "21 June 2026", label: "Program starts" },
                { icon: BookOpen, value: "1 Month", label: "Full program length" },
                { icon: Award, value: "Verifiable Cert", label: "Completion certificate" }
              ].map((item, idx) => (
                <div key={idx} className="bg-secondary/20 border border-border/40 p-4 rounded-2xl text-center space-y-1 hover:bg-secondary/40 transition-colors">
                  <item.icon className="mx-auto h-5 w-5 text-teal-600 mb-1" />
                  <p className="font-bold text-foreground text-sm">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Detailed Syllabus Card */}
            <Card className="border border-border/40 shadow-md">
              <CardHeader className="bg-gradient-to-r from-teal-500/10 via-teal-500/5 to-transparent border-b">
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                  📖 Course Syllabus & Curriculum
                </CardTitle>
                <CardDescription>Explore what your child will build and learn throughout this program.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {[
                  {
                    title: "AI Fundamentals",
                    desc: "Understand what artificial intelligence is, the history of machine learning, how neural networks process information, and interactive gameplay examples."
                  },
                  {
                    title: "Prompt Engineering",
                    desc: "Master the art of communicating with Large Language Models (LLMs). Learn structuring inputs, logic instructions, variables, and utilizing models for text generation and image creation."
                  },
                  {
                    title: "AI Safety & Responsibility",
                    desc: "A crucial block on ethics, addressing algorithmic bias, safety guardrails, identifying disinformation, copyright fundamentals, and balanced digital hygiene."
                  },
                  {
                    title: "Hands-On Projects",
                    desc: "Practical labs where students build their own AI chatbots, create custom art portfolios using diffusion generators, and pitch an AI-powered solution for a real-world problem."
                  }
                ].map((syll, index) => (
                  <div key={index} className="flex gap-3 items-start border-b border-border/30 pb-4 last:border-0 last:pb-0">
                    <div className="h-7 w-7 rounded-full bg-teal-500/15 text-teal-700 font-extrabold flex items-center justify-center shrink-0 text-sm mt-0.5">
                      {index + 1}
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-foreground text-base">{syll.title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{syll.desc}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Checkout Pricing Card */}
          <div className="space-y-6">
            <Card className="border border-teal-500/20 shadow-lg bg-card/75 backdrop-blur-md sticky top-6">
              <CardHeader className="bg-gradient-to-r from-teal-500/15 to-teal-500/5 border-b pb-4">
                <CardTitle className="text-xl font-bold text-foreground">Enrollment Options</CardTitle>
                <CardDescription>Select a pricing option to proceed to secure checkout.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                
                {/* Plan Selection Buttons */}
                <div className="space-y-3">
                  {[
                    { id: "full_course", type: "Full Course Fees", price: 1500, label: "Get full access, daily classes & certificate" },
                    { id: "assessment", type: "Register for Assessment", price: 150, label: "Evaluate skills before starting" }
                  ].map((plan) => (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id as any)}
                      className={`flex justify-between items-center rounded-2xl p-4 transition-all duration-200 border cursor-pointer ${
                        selectedPlan === plan.id
                          ? "bg-teal-600 text-white border-teal-600 shadow-md scale-[1.01]"
                          : "bg-secondary/40 hover:bg-secondary/60 border-transparent hover:border-teal-500/20"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`h-4 w-4 mt-0.5 rounded-full border flex items-center justify-center ${selectedPlan === plan.id ? "border-white" : "border-muted-foreground"}`}>
                          {selectedPlan === plan.id && <div className="h-2 w-2 rounded-full bg-white" />}
                        </div>
                        <div className="space-y-0.5 pr-2">
                          <span className="font-bold text-sm block">{plan.type}</span>
                          <span className={`text-xs leading-tight block ${selectedPlan === plan.id ? "text-white/80" : "text-muted-foreground"}`}>{plan.label}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-extrabold text-lg block">₹{plan.price}</span>
                        <span className={`text-[9px] uppercase font-bold tracking-wider block ${selectedPlan === plan.id ? "text-white/85" : "text-muted-foreground"}`}>one-time</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Login Alert Box if not authenticated */}
                {!user ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center space-y-3 animate-in fade-in duration-300">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                      You must be logged in as a student to buy courses or register for assessments.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button size="sm" variant="default" className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold" asChild>
                        <Link to={`/login?redirect=${encodeURIComponent(location.pathname)}`}>Log In</Link>
                      </Button>
                      <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-600 hover:bg-amber-500/5 text-xs font-bold" asChild>
                        <Link to={`/register/student?redirect=${encodeURIComponent(location.pathname)}`}>Sign Up</Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={handleCheckout}
                    disabled={loading}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-6 text-base rounded-2xl shadow-md hover:shadow-teal-500/15 hover:-translate-y-0.5 transition-all duration-300"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"></span>
                        Initiating Order...
                      </span>
                    ) : (
                      selectedPlan === 'assessment' 
                        ? "Register for Assessment - ₹150" 
                        : "Enroll in Course - ₹1500"
                    )}
                  </Button>
                )}

                {/* Corporate Address Footer */}
                <div className="border-t border-border/40 pt-4 space-y-2 text-[10px] text-muted-foreground text-center">
                  <p className="font-bold flex items-center justify-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
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
            <div className="bg-gradient-to-br from-teal-600 to-indigo-700 p-6 text-white relative">
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
              <p className="text-xs text-teal-200 font-semibold tracking-wider uppercase mb-1">Direct Platform Purchase</p>
              <h3 className="text-2xl font-bold tracking-tight">Cuvasol Course Checkout</h3>
              <div className="mt-4 flex items-baseline justify-between border-t border-white/10 pt-4">
                <span className="text-sm text-teal-100">Amount to Pay</span>
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
                  <span className="font-semibold text-teal-400">
                    {sandboxOrder.purchaseType === 'assessment' ? "Assessment Registration" : "Full Course Enrollment"}
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
                        ? "border-teal-500 text-teal-400" 
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
                        ? "border-teal-500 text-teal-400" 
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
                        ? "border-teal-500 text-teal-400" 
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
                      <div className="absolute -top-6 -right-6 w-24 h-24 bg-teal-500/10 rounded-full blur-xl pointer-events-none"></div>
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
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
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
                          className="p-3 border border-slate-800 bg-slate-950/40 rounded-lg text-center font-medium text-slate-300 hover:border-teal-500/50 cursor-pointer transition-colors"
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
                  className="w-full bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white rounded-xl py-5 font-bold text-sm tracking-wide shadow-lg border-0"
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
                      <div className="w-16 h-16 rounded-full border-4 border-teal-500/20 border-t-teal-500 animate-spin"></div>
                      <div className="absolute inset-2 w-12 h-12 rounded-full border-4 border-indigo-500/10 border-b-indigo-400 animate-spin [animation-direction:reverse]"></div>
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

export default AIFutureSkills;
