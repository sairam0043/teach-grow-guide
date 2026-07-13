declare global {
  interface Window {
    Razorpay: any;
  }
}

import { useParams, Link, useNavigate } from "react-router-dom";
import { Star, MapPin, Monitor, Clock, ArrowLeft, Calendar as CalendarIcon, CheckCircle, CreditCard, ClockIcon, Check, AlertCircle, MessageSquare } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format, getDay, addMinutes, parse, startOfDay, addDays } from "date-fns";
import PageLayout from "@/components/layout/PageLayout";
import { useState, useEffect, useRef } from "react";
import { toast } from "@/components/ui/sonner";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import API_URL from "@/config/api";
import { resolveAssetUrl } from "@/lib/assetUrl";
import { 
  detectUserTimeZone, 
  COMMON_TIMEZONES, 
  convertTutorSlotsToStudentTime, 
  getUtcTimeForLocalTimeInTimeZone, 
  formatDateInTimeZone,
  formatBookingTime,
  getTimeZoneAbbreviation
} from "@/utils/timezone";

const TutorProfile = () => {
  const { id } = useParams();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [tutor, setTutor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [existingBookings, setExistingBookings] = useState<any[]>([]);

  const [studentTimezone, setStudentTimezone] = useState(
    user?.user_metadata?.timezone || user?.timezone || detectUserTimeZone()
  );

  useEffect(() => {
    if (user?.timezone) {
      setStudentTimezone(user.timezone);
    } else if (user?.user_metadata?.timezone) {
      setStudentTimezone(user.user_metadata.timezone);
    }
  }, [user]);

  // Cancellation Reason states
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelReasonType, setCancelReasonType] = useState<string>("");
  const [customCancelReason, setCustomCancelReason] = useState<string>("");
  const [isSubmittingCancellation, setIsSubmittingCancellation] = useState(false);

  const CANCELLATION_REASONS = [
    "Schedule Conflict / Time clash",
    "Found another tutor",
    "Personal emergency / Health reasons",
    "No longer need tutoring for this subject",
    "Other"
  ];

  const handleCancelSubmit = async () => {
    if (!cancellingBookingId) return;
    if (!cancelReasonType) {
      toast.error("Please select a reason for cancellation");
      return;
    }
    const finalReason = cancelReasonType === "Other" ? customCancelReason : cancelReasonType;
    if (cancelReasonType === "Other" && !customCancelReason.trim()) {
      toast.error("Please specify your reason");
      return;
    }
    
    setIsSubmittingCancellation(true);
    try {
      await axios.put(`${API_URL}/tutors/booking/${cancellingBookingId}/status`, { 
        status: 'cancelled',
        cancellationReason: finalReason
      });
      toast.success("Booking cancelled successfully.");
      setExistingBookings(prev => prev.map(b => b._id === cancellingBookingId ? { ...b, status: 'cancelled', cancellationReason: finalReason } : b));
      setSelectedSlot(null);
      setIsCancelDialogOpen(false);
      setCancellingBookingId(null);
      setCancelReasonType("");
      setCustomCancelReason("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to cancel booking");
    } finally {
      setIsSubmittingCancellation(false);
    }
  };
  const [selectedPlan, setSelectedPlan] = useState<{ type: string, price: number, isPack?: boolean, sessionsCount?: number } | null>(null);
  const [otherEmails, setOtherEmails] = useState<string[]>(['']);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [availableSlotsForDate, setAvailableSlotsForDate] = useState<string[]>([]);
  const bookingInProgressRef = useRef(false);

  const getSubjectRate = () => {
    if (!selectedSubject) return tutor?.hourlyRate || 500;
    const rateObj = tutor?.subjectRates?.find((sr: any) => sr.subject === selectedSubject);
    return rateObj ? rateObj.rate : (tutor?.hourlyRate || 500);
  };
  const subjectRate = getSubjectRate();

  // Pack booking scheduling states
  const [packStartDate, setPackStartDate] = useState<Date | undefined>(new Date());
  const [packSchedule, setPackSchedule] = useState<{ day: string, time: string }[]>([]);
  const [generatedPackSessions, setGeneratedPackSessions] = useState<{ date: string, time: string, status: string }[]>([]);

  // Sandbox mock payment gateway states
  const [sandboxOrder, setSandboxOrder] = useState<any>(null);
  const [isSandboxPaying, setIsSandboxPaying] = useState(false);
  const [sandboxPaymentSuccess, setSandboxPaymentSuccess] = useState(false);
  const [sandboxMethod, setSandboxMethod] = useState<"card" | "upi" | "netbanking">("card");

  useEffect(() => {
    if (selectedPlan?.isPack) {
      const slotsCount = selectedPlan.sessionsCount === 12 ? 3 : 2;
      setPackSchedule(Array.from({ length: slotsCount }).map(() => ({ day: '', time: '' })));
      setGeneratedPackSessions([]);
    } else {
      setPackSchedule([]);
      setGeneratedPackSessions([]);
    }
  }, [selectedPlan]);

  useEffect(() => {
    if (selectedPlan?.isPack && packStartDate && packSchedule.length > 0) {
      const allSelected = packSchedule.every(s => s.day !== '' && s.time !== '');
      const hasDuplicates = packSchedule.some((slot, i) =>
        packSchedule.some((otherSlot, j) => i !== j && slot.day === otherSlot.day && slot.time === otherSlot.time)
      );

      if (allSelected && !hasDuplicates) {
        const sessionsList: { date: string, time: string, status: string, utcDate?: string }[] = [];
        // Iterate through 28 days starting from packStartDate
        for (let i = 0; i < 28; i++) {
          const currentDate = addDays(packStartDate, i);
          
          // Get weekday name in studentTimezone
          const dayName = new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            timeZone: studentTimezone
          }).format(currentDate);

          // Find all selected days matching this weekday
          const matchedSlots = packSchedule.filter(s => s.day === dayName);
          matchedSlots.forEach(slot => {
            const timeDate = parse(slot.time, 'h:mm a', new Date());
            const shr = timeDate.getHours();
            const smin = timeDate.getMinutes();
            
            // Extract local parts of currentDate under studentTimezone
            const studentParts = {
              year: currentDate.getFullYear(),
              month: currentDate.getMonth(),
              day: currentDate.getDate()
            };
            
            const utcTimeMs = getUtcTimeForLocalTimeInTimeZone(
              studentParts.year,
              studentParts.month,
              studentParts.day,
              shr,
              smin,
              studentTimezone
            );
            
            const displayDateStr = formatDateInTimeZone(new Date(utcTimeMs), studentTimezone);
            const displayTimeStr = new Intl.DateTimeFormat('en-US', {
              timeZone: studentTimezone,
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }).format(new Date(utcTimeMs));

            sessionsList.push({
              date: displayDateStr,
              time: displayTimeStr,
              status: 'scheduled',
              utcDate: new Date(utcTimeMs).toISOString()
            });
          });
        }

        // Sort chronologically
        sessionsList.sort((a, b) => {
          const dateTimeA = new Date(a.utcDate!);
          const dateTimeB = new Date(b.utcDate!);
          return dateTimeA.getTime() - dateTimeB.getTime();
        });

        setGeneratedPackSessions(sessionsList);
      } else {
        setGeneratedPackSessions([]);
      }
    } else {
      setGeneratedPackSessions([]);
    }
  }, [packStartDate, packSchedule, selectedPlan, studentTimezone]);

  const getSlotsForWeekday = (dayName: string) => {
    if (!tutor?.availability) return [];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDayIdx = days.indexOf(dayName);
    
    let targetDate = new Date();
    for (let i = 0; i < 7; i++) {
      if (targetDate.getDay() === targetDayIdx) break;
      targetDate = addDays(targetDate, 1);
    }
    
    const slots = convertTutorSlotsToStudentTime(
      tutor.availability,
      tutor.timezone || 'Asia/Kolkata',
      targetDate,
      studentTimezone
    );
    
    return slots.map(s => s.studentDisplayTime);
  };

  const isValidDate = (d: any) => d instanceof Date && !isNaN(d.getTime());

  useEffect(() => {
    if (isValidDate(date) && tutor?.availability && tutor.availability.length > 0) {
      const slots = convertTutorSlotsToStudentTime(
        tutor.availability,
        tutor.timezone || 'Asia/Kolkata',
        date as Date,
        studentTimezone
      );
      
      const filteredSlots = slots.filter(slot => {
        const minTime = new Date(Date.now() + 3 * 60 * 60 * 1000);
        return slot.utcTimeMs >= minTime.getTime();
      });
      
      setAvailableSlotsForDate(filteredSlots);
    } else if (tutor?.availableTimings && isValidDate(date)) {
      // Legacy availabilities conversion using IST fallback
      const legacyAvailability = tutor.availableTimings.map((timeStr: string) => {
        const tutorWeekday = new Intl.DateTimeFormat('en-US', {
          weekday: 'long',
          timeZone: 'Asia/Kolkata'
        }).format(date as Date);
        
        let parsed = parse(timeStr, 'h:mm a', new Date());
        if (isNaN(parsed.getTime())) {
          parsed = parse(timeStr, 'HH:mm', new Date());
        }
        const time24 = format(parsed, 'HH:mm');
        const endParsed = addMinutes(parsed, 30);
        const endTime24 = format(endParsed, 'HH:mm');
        
        return {
          day: tutorWeekday,
          startTime: time24,
          endTime: endTime24
        };
      });
      
      const slots = convertTutorSlotsToStudentTime(
        legacyAvailability,
        'Asia/Kolkata',
        date as Date,
        studentTimezone
      );
      
      const filteredSlots = slots.filter(slot => {
        const minTime = new Date(Date.now() + 3 * 60 * 60 * 1000);
        return slot.utcTimeMs >= minTime.getTime();
      });
      
      setAvailableSlotsForDate(filteredSlots);
    } else {
      setAvailableSlotsForDate([]);
    }
  }, [date, tutor, studentTimezone]);

  useEffect(() => {
    const fetchTutor = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/tutors/${id}`);
        setTutor(res.data);

        // Restore pending booking selections from sessionStorage if present
        const rawPending = sessionStorage.getItem("pending_booking");
        if (rawPending) {
          try {
            const pending = JSON.parse(rawPending);
            if (pending.tutorId === id) {
              if (pending.date) setDate(new Date(pending.date));
              if (pending.subject) setSelectedSubject(pending.subject);
              if (pending.slot) setSelectedSlot(pending.slot);
              if (pending.plan) setSelectedPlan(pending.plan);

              sessionStorage.removeItem("pending_booking");
              toast.success("Restored your selected booking slot!");
            }
          } catch (e) {
            console.error("Error parsing pending booking:", e);
          }
        }

        if (user) {
          const bRes = await axios.get(`${API_URL}/tutors/${id}/bookings/student/${user.id}`);
          setExistingBookings(bRes.data);
          const active = bRes.data.find((b: any) => b.status === "confirmed");
          if (active) {
            // Handle splitting existing date and time if it follows our new format "PPP at time"
            // But usually it's better to just clear them on load, here let's just leave it null as it's complex to extract safely
            // Or set date/slot based on existing if we can parse it.
            const parts = active.timing.split(' at ');
            if (parts.length === 2) {
              setDate(new Date(parts[0]));
              setSelectedSlot(parts[1]);
            } else {
              setSelectedSlot(active.timing);
            }
            if (active.subject) {
              setSelectedSubject(active.subject);
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchTutor();
  }, [id]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  if (loading) {
    return (
      <PageLayout>
        <div className="container py-20 flex flex-col items-center">
          <Skeleton className="h-12 w-64 mb-4" />
          <Skeleton className="h-64 w-full max-w-2xl" />
        </div>
      </PageLayout>
    );
  }

  if (!tutor) {
    return (
      <PageLayout>
        <div className="container py-20 text-center">
          <h1 className="mb-4 text-2xl font-bold text-foreground">Tutor Not Found</h1>
          <Button asChild><Link to="/tutors">Browse Tutors</Link></Button>
        </div>
      </PageLayout>
    );
  }

  const handleBookDemo = async () => {
    if (isProcessingPayment || bookingInProgressRef.current) return;
    if (role === 'tutor') {
      toast.error("Tutors are not allowed to book classes.");
      return;
    }
    if (!selectedPlan) {
      toast.error("Select Pricing & Booking option");
      return;
    }

    if (selectedPlan.isPack) {
      if (!packStartDate) {
        toast.error("Please select a course starting date");
        return;
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (packStartDate < today) {
        toast.error("Course start date must be today or in the future");
        return;
      }
      const allSelected = packSchedule.every(s => s.day !== '' && s.time !== '');
      if (!allSelected) {
        toast.error("Please select recurring days and times for your package");
        return;
      }
      const hasDuplicates = packSchedule.some((slot, i) =>
        packSchedule.some((otherSlot, j) => i !== j && slot.day === otherSlot.day && slot.time === otherSlot.time)
      );
      if (hasDuplicates) {
        toast.error("Duplicate slots selected. Please ensure all schedule times are unique.");
        return;
      }
      if (!selectedSubject) {
        toast.error("Please select a subject first");
        return;
      }
    } else {
      if (!date) {
        toast.error("Please select a date first");
        return;
      }
      if (!selectedSlot) {
        toast.error("Please select a timing slot first");
        return;
      }
      if (!selectedSubject) {
        toast.error("Please select a subject first");
        return;
      }

      // Validate slot timing is at least 3 hours in the future
      const bookingDateTime = new Date(`${format(date!, 'yyyy-MM-dd')} ${selectedSlot}`);
      const minTime = new Date(Date.now() + 3 * 60 * 60 * 1000);
      if (bookingDateTime < minTime) {
        toast.error("You can only book sessions that are at least 3 hours in the future.");
        return;
      }
    }

    if (selectedPlan.type === 'Free Demo Class' && isDemoDisabledForSubject) {
      if (demoBookingForSubject?.status === 'pending') {
        toast.error(`You have already requested a demo session for ${selectedSubject}. Please wait for the tutor to accept or reject it.`);
      } else {
        toast.error(`A free demo for ${selectedSubject} is already booked or completed. Please select a premium pricing plan instead.`);
      }
      return;
    }

    if (!user) {
      toast.error(
        <div className="flex flex-col gap-2 w-full text-left">
          <span className="font-semibold text-sm text-foreground">
            Please log in to book a demo slot.
          </span>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => {
                toast.dismiss();
                sessionStorage.setItem("pending_booking", JSON.stringify({
                  tutorId: id,
                  date: date ? date.toISOString() : null,
                  subject: selectedSubject,
                  slot: selectedSlot,
                  plan: selectedPlan
                }));
                window.scrollTo(0, 0);
                navigate("/login");
              }}
              className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
            >
              Log In
            </button>
            <button
              onClick={() => {
                toast.dismiss();
                sessionStorage.setItem("pending_booking", JSON.stringify({
                  tutorId: id,
                  date: date ? date.toISOString() : null,
                  subject: selectedSubject,
                  slot: selectedSlot,
                  plan: selectedPlan
                }));
                window.scrollTo(0, 0);
                navigate("/register/student");
              }}
              className="bg-secondary text-secondary-foreground border text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-secondary/80 transition-colors shadow-sm"
            >
              Sign Up
            </button>
          </div>
        </div>,
        {
          duration: 10000,
        }
      );
      return;
    }

    const isPackBooking = selectedPlan.isPack;
    let utcTiming: string | undefined;
    if (!isPackBooking) {
      const slotObj = availableSlotsForDate.find(s => s.studentDisplayTime === selectedSlot);
      if (slotObj) {
        utcTiming = new Date(slotObj.utcTimeMs).toISOString();
      }
    }

    const formattedTiming = isPackBooking
      ? `Monthly Pack: ${selectedPlan.type} (${packSchedule.map(s => `${s.day}s at ${s.time}`).join(', ')}) [${format(packStartDate!, 'MMM d')} - ${format(addDays(packStartDate!, 27), 'MMM d')}]`
      : `${formatDateInTimeZone(date!, studentTimezone)} at ${selectedSlot}`;

    if (!isPackBooking) {
      const existingBooking = existingBookings.find(b => b.timing === formattedTiming && (b.status === "confirmed" || b.status === "pending"));
      if (existingBooking) {
        const isDemo = !existingBooking.planType || existingBooking.planType === 'Free Demo Class';
        if (isDemo) {
          setCancellingBookingId(existingBooking._id);
          setIsCancelDialogOpen(true);
          return;
        }

        // Cancel paid booking
        try {
          bookingInProgressRef.current = true;
          setIsProcessingPayment(true);
          await axios.put(`${API_URL}/tutors/booking/${existingBooking._id}/status`, { status: "cancelled" });
          toast.success("Booking cancelled successfully.");
          setExistingBookings(prev => prev.map(b => b._id === existingBooking._id ? { ...b, status: "cancelled" } : b));
          setSelectedSlot(null);
        } catch (err: any) {
          toast.error(err.response?.data?.message || "Failed to cancel booking");
        } finally {
          setIsProcessingPayment(false);
          bookingInProgressRef.current = false;
        }
        return;
      }
    }

    // Otherwise book
    bookingInProgressRef.current = true;
    setIsProcessingPayment(true);
    try {
      const studentName = String(user?.user_metadata?.full_name || "Student");
      const isDemoBooking = selectedPlan.type === 'Free Demo Class';

      const endpoint = isDemoBooking ? `${API_URL}/tutors/${id}/book` : `${API_URL}/tutors/${id}/book-class`;

      const payload: any = {
        timing: formattedTiming,
        subject: selectedSubject,
        studentId: user.id,
        studentName,
        utcTiming
      };

      if (!isDemoBooking) {
        payload.planType = selectedPlan.type;
        payload.amountPaid = selectedPlan.price;
        payload.isDirectClass = true; // flag to tell backend this isn't a demo

        if (isPackBooking) {
          payload.packDetails = {
            startDate: format(packStartDate!, 'yyyy-MM-dd'),
            endDate: format(addDays(packStartDate!, 27), 'yyyy-MM-dd'),
            daysPerWeek: packSchedule.length,
            schedule: packSchedule
          };
          payload.sessions = generatedPackSessions;
        }

        if (selectedPlan.type === '2 Students' || selectedPlan.type === '3–5 Students') {
          const validEmails = otherEmails.filter(e => e.trim() !== '');

          if (user?.email && validEmails.some(e => e.toLowerCase() === user.email.toLowerCase())) {
            toast.error("You cannot invite yourself. Please enter emails of other students.");
            setIsProcessingPayment(false);
            bookingInProgressRef.current = false;
            return;
          }

          if (selectedPlan.type === '2 Students' && validEmails.length < 1) {
            toast.error("Please enter the email of the other student.");
            setIsProcessingPayment(false);
            bookingInProgressRef.current = false;
            return;
          }
          if (selectedPlan.type === '3–5 Students' && validEmails.length < 2) {
            toast.error("Please enter at least 2 other student emails for this plan.");
            setIsProcessingPayment(false);
            bookingInProgressRef.current = false;
            return;
          }
          payload.otherStudentsEmails = validEmails;
        }
      }

      const res = await axios.post(endpoint, payload);
      const booking = res.data.booking;

      if (!isDemoBooking) {
        // Trigger Razorpay Order Creation on backend
        toast.info("Initiating payment gateway...");
        const orderRes = await axios.post(`${API_URL}/payments/create-order`, {
          bookingId: booking._id,
          amount: selectedPlan.price
        });

        const orderData = orderRes.data;

        if (orderData.isSandbox) {
          // Open custom Mock Sandbox Modal
          setSandboxOrder({
            orderId: orderData.orderId,
            bookingId: booking._id,
            amount: orderData.amount,
            keyId: orderData.keyId,
            tutorName: tutor.name,
            subject: selectedSubject,
            timing: formattedTiming,
            planType: selectedPlan.type,
            price: selectedPlan.price
          });
          setIsProcessingPayment(false);
          bookingInProgressRef.current = false;
        } else {
          // Open Official Razorpay Checkout Popups
          const options = {
            key: orderData.keyId,
            amount: orderData.amount,
            currency: orderData.currency,
            name: "Cuvasol Tutor",
            description: `Course Enrollment: ${selectedPlan.type} - ${selectedSubject}`,
            image: resolveAssetUrl(tutor.photo) || "https://ui-avatars.com/api/?name=Cuvasol",
            order_id: orderData.orderId,
            handler: async function (response: any) {
              try {
                toast.loading("Verifying transaction...");
                const verifyRes = await axios.post(`${API_URL}/payments/verify-payment`, {
                  bookingId: booking._id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  planType: selectedPlan.type,
                  amountPaid: selectedPlan.price
                });

                toast.dismiss();
                toast.success("Payment verified! You are officially enrolled.");
                setExistingBookings(prev => [...prev.filter(b => b._id !== booking._id), verifyRes.data.booking]);
                setSelectedSlot(null);
                setIsProcessingPayment(false);
                bookingInProgressRef.current = false;
                navigate("/dashboard/student");
              } catch (verifyErr: any) {
                toast.dismiss();
                toast.error(verifyErr.response?.data?.message || "Payment verification failed.");
                setIsProcessingPayment(false);
                bookingInProgressRef.current = false;
              }
            },
            prefill: {
              name: studentName,
              email: user.email,
              contact: user.phone || ""
            },
            theme: {
              color: "#3b82f6"
            },
            modal: {
              ondismiss: function () {
                setIsProcessingPayment(false);
                bookingInProgressRef.current = false;
                toast.warning("Payment checkout cancelled.");
              }
            }
          };

          const rzp = new window.Razorpay(options);
          rzp.open();
        }
      } else {
        // Free Demo Booking success
        toast.success("Demo booked successfully! You'll receive a confirmation shortly.");
        setExistingBookings([...existingBookings, booking]);
        setSelectedSlot(null);
        setIsProcessingPayment(false);
        bookingInProgressRef.current = false;
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to book");
      setIsProcessingPayment(false);
      bookingInProgressRef.current = false;
    }
  };

  const handleCompleteSandboxPayment = async () => {
    if (!sandboxOrder) return;
    setIsSandboxPaying(true);

    // Simulate payment authorization delay
    setTimeout(async () => {
      setSandboxPaymentSuccess(true);

      // Simulate success checkmark display delay
      setTimeout(async () => {
        try {
          const mockPaymentId = `pay_mock_${Math.random().toString(36).substring(2, 11)}`;
          const mockSignature = `sig_mock_${Math.random().toString(36).substring(2, 11)}`;

          toast.loading("Verifying sandbox transaction...");
          const verifyRes = await axios.post(`${API_URL}/payments/verify-payment`, {
            bookingId: sandboxOrder.bookingId,
            razorpay_payment_id: mockPaymentId,
            razorpay_order_id: sandboxOrder.orderId,
            razorpay_signature: mockSignature,
            planType: sandboxOrder.planType,
            amountPaid: sandboxOrder.price
          });

          toast.dismiss();
          toast.success("Payment verified! You are officially enrolled.");

          // Update local bookings
          setExistingBookings(prev => [
            ...prev.filter(b => b._id !== sandboxOrder.bookingId),
            verifyRes.data.booking
          ]);

          setSelectedSlot(null);
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
    setIsProcessingPayment(false);
    bookingInProgressRef.current = false;
    toast.warning("Payment checkout cancelled.");
  };

  const parseTimingStringToDate = (timingStr: string): Date | null => {
    try {
      const parts = timingStr.split(' at ');
      if (parts.length === 2) {
        // Clean ordinal suffixes from the date part (e.g. "May 20th, 2026" -> "May 20, 2026")
        const datePartCleaned = parts[0].replace(/(\d+)(st|nd|rd|th)/, '$1');
        const timePart = parts[1];
        const combined = `${datePartCleaned} ${timePart}`;
        const parsed = new Date(combined);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Error parsing timing string:", e);
    }
    return null;
  };

  const isBookingPast = (timingStr: string): boolean => {
    const parsed = parseTimingStringToDate(timingStr);
    if (parsed) {
      return parsed < new Date();
    }
    return false;
  };

  const formattedSelectedTiming = isValidDate(date) && selectedSlot ? `${format(date as Date, 'PPP')} at ${selectedSlot}` : null;
  const selectedExisting = formattedSelectedTiming ? existingBookings.find(b => b.timing === formattedSelectedTiming && (b.status === "confirmed" || b.status === "pending")) : undefined;

  const activeDemoBooking = selectedSubject ? existingBookings.find(b => b.subject === selectedSubject && b.status === "confirmed" && !isBookingPast(b.timing)) : undefined;
  const completedBooking = selectedSubject ? existingBookings.find(b => b.subject === selectedSubject && (b.status === "completed" || (b.status === "confirmed" && isBookingPast(b.timing)))) : undefined;
  const enrolledBooking = selectedSubject ? existingBookings.find(b => b.subject === selectedSubject && b.status === "enrolled" && !isBookingPast(b.timing)) : undefined;
  const pendingBooking = selectedSubject ? existingBookings.find(b => b.subject === selectedSubject && b.status === "pending" && !isBookingPast(b.timing)) : undefined;

  const demoBookingForSubject = selectedSubject ? existingBookings.find(b => 
    b.subject === selectedSubject && 
    ['pending', 'confirmed', 'completed', 'enrolled'].includes(b.status)
  ) : null;
  const isDemoDisabledForSubject = !!demoBookingForSubject;

  const hasActiveBooking = !!activeDemoBooking;
  const activeBookingTiming = activeDemoBooking?.timing;

  const handleMessageTutor = () => {
    if (!user) {
      toast.error("Please log in to message this tutor.");
      return;
    }

    const tutorUserId = tutor.userId?._id || tutor.userId?.id || tutor.userId;
    if (!tutorUserId) {
      toast.error("Tutor user ID not found.");
      return;
    }

    // Save session storage redirects for deep-linking
    sessionStorage.setItem("student_dashboard_tab", "messages");
    sessionStorage.setItem("active_chat_user_id", tutorUserId);

    toast.success(`Opening chat with ${tutor.name}...`);

    // Redirect to student dashboard messages tab
    setTimeout(() => {
      navigate("/dashboard/student");
    }, 800);
  };

  const isBookButtonDisabled = (() => {
    if (isProcessingPayment) return true;
    if (role === 'tutor') return true;
    if (selectedExisting) return false; // For cancellation
    if (!selectedPlan) return true;
    if (selectedPlan.type === 'Free Demo Class' && isDemoDisabledForSubject) return true;

    if (selectedPlan.isPack) {
      // Disabled if start date is missing
      if (!packStartDate) return true;
      // Disabled if any weekly schedule slot is not selected
      const allSelected = packSchedule.every(s => s.day && s.time);
      if (!allSelected) return true;
      // Disabled if there are duplicates
      const hasDuplicates = packSchedule.some((slot, i) =>
        packSchedule.some((otherSlot, j) => i !== j && slot.day === otherSlot.day && slot.time === otherSlot.time)
      );
      if (hasDuplicates) return true;
      // Disabled if subject is not selected
      if (!selectedSubject) return true;

      return false;
    } else {
      // Standard single booking
      if (!date) return true;
      if (!selectedSlot) return true;
      if (!selectedSubject) return true;
      if (!availableSlotsForDate || availableSlotsForDate.length === 0) return true;

      return false;
    }
  })();

  const tutorImageUrl = tutor ? (resolveAssetUrl(tutor.photo) || `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.name)}`) : "";
  const personSchema = tutor ? {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": tutor.name,
    "image": tutorImageUrl,
    "description": tutor.about || `Expert tutor specializing in ${tutor.subjects?.join(', ')}.`,
    "jobTitle": "Tutor",
    "knowsAbout": tutor.subjects || [],
    "address": {
      "@type": "PostalAddress",
      "addressLocality": tutor.city || "India"
    }
  } : null;

  return (
    <PageLayout>
      {tutor && (
        <Helmet>
          <title>{tutor.name} - Expert Tutor in {tutor.subjects?.join(', ')} | Cuvasol Tutor</title>
          <meta name="description" content={`Book online or offline classes with ${tutor.name}. Specializing in ${tutor.subjects?.join(', ')} with ${tutor.experience || 'years of'} experience.`} />
          <meta property="og:title" content={`${tutor.name} - ${tutor.subjects?.join(', ')} Tutor`} />
          <meta property="og:description" content={`Book lessons with ${tutor.name}. Specializing in ${tutor.subjects?.join(', ')}.`} />
          <meta property="og:image" content={tutorImageUrl} />
          <meta property="og:url" content={`https://tutor.cuvasol.com/tutors/${tutor.id}`} />
          {personSchema && (
            <script type="application/ld+json">
              {JSON.stringify(personSchema)}
            </script>
          )}
        </Helmet>
      )}
      <div className="container py-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/tutors"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Tutors</Link>
        </Button>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-col gap-6 sm:flex-row">
              <img
                src={
                  resolveAssetUrl(tutor.photo) ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.name)}&background=random&size=400`
                }
                alt={tutor.name}
                className="h-40 w-40 rounded-xl object-contain bg-secondary/30 shadow-card"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.name)}&background=random&size=400`;
                }}
              />
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Badge className="bg-primary text-primary-foreground">{tutor.category}</Badge>
                  <Badge variant="secondary">{tutor.mode}</Badge>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-3xl font-bold text-foreground capitalize">{tutor.name}</h1>
                  {tutor.isVerified && (
                    <CheckCircle className="h-6 w-6 fill-blue-500 text-white shrink-0" title="Verified Tutor" />
                  )}
                </div>
                <p className="mb-2 text-muted-foreground">{tutor.qualification}</p>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {tutor.rating > 0 && (
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-warning text-warning" />
                      <strong className="text-foreground">{tutor.rating}</strong> ({tutor.reviewCount ?? 0} reviews)
                    </span>
                  )}
                  <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{tutor.experience} years</span>
                  <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{tutor.city}</span>
                </div>
              </div>
            </div>

            <Card>
              <CardHeader><CardTitle>About</CardTitle></CardHeader>
              <CardContent><p className="text-muted-foreground leading-relaxed">{tutor.bio}</p></CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Subjects</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {tutor.subjects?.map((s: string) => (
                    <Badge key={s} variant="secondary" className="px-3 py-1 text-sm">
                      {s.replace(/\s*\((Academic|Extracurricular)\)/i, "")}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {(tutor.mode?.toLowerCase() === "offline" || tutor.mode?.toLowerCase() === "both") && tutor.address && (
              <Card className="overflow-hidden border-border/50 shadow-sm">
                <CardHeader className="bg-secondary/10 pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
                    <MapPin className="h-5 w-5 text-rose-500" /> Classroom Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-1">
                    <h4 className="font-bold text-foreground text-sm">Classroom Address</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {tutor.address}
                    </p>
                  </div>
                  
                  {/* Embedded Google Map iframe */}
                  <div className="relative w-full h-64 overflow-hidden rounded-xl border border-border bg-secondary/20 shadow-inner">
                    <iframe
                      title="Classroom Location Map"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(tutor.address + ", " + (tutor.city || ""))}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                    />
                  </div>

                  {tutor.googleMapsUrl && (
                    <Button asChild variant="outline" size="sm" className="w-full sm:w-auto gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all duration-300 rounded-xl">
                      <a href={tutor.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                        <MapPin className="h-4 w-4 text-rose-500" /> Open in Google Maps
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {((tutor?.availability && tutor.availability.length > 0) || (tutor?.availableTimings && tutor.availableTimings.length > 0)) && (
              <Card>
                <CardHeader>
                  <CardTitle>Availability Schedule</CardTitle>
                  <CardDescription>
                    All timings are shown in the tutor's local timezone: <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white dark:bg-amber-600 shadow-sm">{tutor.timezone ? getTimeZoneAbbreviation(tutor.timezone) : 'IST'}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {tutor.availability && tutor.availability.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                        const daySlots = tutor.availability.filter((a: any) => a.day === day);
                        if (daySlots.length === 0) return null;
                        return (
                          <div key={day} className="flex flex-col p-3 border rounded-lg bg-secondary/10">
                            <span className="font-bold text-foreground mb-1">{day}</span>
                            <div className="flex flex-wrap gap-2">
                              {daySlots.map((slot: any, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-[10px] bg-background/50 font-medium">
                                  {format(parse(slot.startTime, 'HH:mm', new Date()), 'h:mm a')} - {format(parse(slot.endTime, 'HH:mm', new Date()), 'h:mm a')}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {tutor.availableTimings.map((timing: string, i: number) => (
                        <Badge key={i} variant="secondary" className="px-3 py-1 text-sm">{timing}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Pricing & Booking Options</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Subject Selector Prompt */}
                <div className="mb-6 p-4 border rounded-xl bg-primary/5 space-y-2.5">
                  <label className="text-sm font-bold text-foreground block">
                    Choose the Subject you want to learn:
                  </label>
                  <Select
                    value={selectedSubject}
                    onValueChange={(val) => {
                      setSelectedSubject(val);
                      setSelectedPlan(null);
                      setSelectedSlot(null);
                    }}
                  >
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder="Select a subject to unlock plans & book..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tutor.subjects?.map((s: string) => (
                        <SelectItem key={s} value={s}>
                          {s.replace(/\s*\((Academic|Extracurricular)\)/i, "")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!selectedSubject ? (
                  <div className="text-center py-8 text-muted-foreground border border-dashed rounded-xl p-4 bg-secondary/15">
                    <p className="text-sm font-semibold">Please select a subject above to view rates and booking plans.</p>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm animate-in fade-in duration-300">
                    {[
                      { type: 'Free Demo Class', price: 0, isDemo: true },
                      { type: '1-on-1 (Premium)', price: subjectRate },
                      { type: '2 Students', price: Math.round(subjectRate * 0.75) },
                      { type: '3–5 Students', price: Math.round(subjectRate * 0.55) },
                      { type: '2 Days/Week (Monthly Pack)', price: Math.round(subjectRate * 8 * 0.85), isPack: true, sessionsCount: 8, subtitle: '8 Classes/mo • 15% Discount Applied' },
                      { type: '3 Days/Week (Monthly Pack)', price: Math.round(subjectRate * 12 * 0.80), isPack: true, sessionsCount: 12, subtitle: '12 Classes/mo • 20% Discount Applied' }
                    ].map(plan => {
                      const demoBooking = plan.isDemo && selectedSubject ? existingBookings.find(b => 
                        b.subject === selectedSubject && 
                        ['pending', 'confirmed', 'completed', 'enrolled'].includes(b.status)
                      ) : null;
                      const isDemoDisabled = !!demoBooking;
                      const isClickable = !enrolledBooking && !isDemoDisabled;
                      return (
                        <div
                          key={plan.type}
                          onClick={() => isClickable ? setSelectedPlan(plan) : null}
                          className={`flex justify-between items-center rounded-md p-4 transition-all duration-200 border ${selectedPlan?.type === plan.type
                            ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]"
                            : isClickable
                              ? "bg-secondary hover:bg-secondary/80 cursor-pointer border-transparent hover:border-primary/30"
                              : "bg-secondary border-transparent opacity-50 cursor-not-allowed"
                            }`}
                        >
                          <div className="flex items-start gap-2.5">
                            {isClickable && (
                              <div className={`h-4 w-4 mt-0.5 rounded-full border flex items-center justify-center ${selectedPlan?.type === plan.type ? "border-primary-foreground" : "border-muted-foreground"}`}>
                                {selectedPlan?.type === plan.type && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
                              </div>
                            )}
                            <div>
                              <span className={`font-semibold ${selectedPlan?.type === plan.type ? "text-primary-foreground" : "text-foreground"}`}>
                                {plan.type} {demoBooking && ` (${demoBooking.status === 'pending' ? 'Pending Approval' : 'Already Booked'})`}
                              </span>
                              {plan.subtitle && (
                                <p className={`text-xs mt-0.5 ${selectedPlan?.type === plan.type ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                                  {plan.subtitle}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`font-bold text-lg block ${selectedPlan?.type === plan.type ? "text-primary-foreground" : "text-foreground"}`}>
                              {plan.price === 0 ? "Free" : `₹${plan.price}`}
                            </span>
                            <span className={`text-[10px] uppercase font-bold tracking-wider ${selectedPlan?.type === plan.type ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
                              {plan.price === 0 ? "" : plan.isPack ? "/month" : "/hr"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {tutor.rating > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Student Reviews</span>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                      <span className="font-semibold">{tutor.rating}</span>
                      <span className="text-muted-foreground text-xs">({tutor.reviewCount ?? 0} reviews)</span>
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {tutor.reviews && tutor.reviews.length > 0 ? (
                    <div className="space-y-6">
                      {tutor.reviews.map((rev: any, idx: number) => (
                        <div key={idx} className="flex gap-4 border-b border-border/50 pb-6 last:border-0 last:pb-0">
                          <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                            {rev.studentName?.charAt(0).toUpperCase() || 'S'}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                              <span className="font-semibold text-foreground text-sm sm:text-base">{rev.studentName}</span>
                              <span className="text-xs text-muted-foreground">
                                {rev.date ? new Date(rev.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : ""}
                              </span>
                            </div>
                            <div className="flex gap-0.5 text-yellow-500 pb-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${i < (rev.rating || 0) ? "fill-current text-amber-500" : "text-muted-foreground/20"}`}
                                />
                              ))}
                            </div>
                            {rev.reviewText && (
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {rev.reviewText}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm italic">No written reviews yet. Book a session to be the first to leave feedback!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Booking sidebar */}
          <div>
            <Card className="sticky top-20">
              {role === 'tutor' ? (
                <>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-5 w-5" /> Booking Restricted
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20 text-center">
                      <p className="font-semibold text-destructive mb-2">Logged in as a Tutor</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Tutor accounts cannot book classes or request demo sessions from other tutors.
                        If you wish to book a class, please sign out and register or log in as a Student.
                      </p>
                    </div>
                  </CardContent>
                </>
              ) : pendingBooking ? (
                <>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-500">
                      <ClockIcon className="h-5 w-5" /> Pending Approvals
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 text-center">
                      <p className="font-medium text-amber-800 dark:text-amber-300 mb-2">Waiting for tutor to approve.</p>
                      <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
                        Email invitations have been sent to the tutor. The class will be officially booked once they approve. Check your mailbox for confirmation shortly
                      </p>
                      <p className="text-sm text-amber-600/80 dark:text-amber-400/80 mt-2 font-medium">
                        Timing: {pendingBooking.timing}
                      </p>
                    </div>
                    <Button 
                      variant="destructive"
                      className="w-full font-semibold"
                      onClick={() => {
                        setCancellingBookingId(pendingBooking._id);
                        setIsCancelDialogOpen(true);
                      }}
                    >
                      Cancel Demo Request
                    </Button>
                    {user?.id !== (tutor.userId?._id || tutor.userId?.id || tutor.userId) && (
                      <Button
                        variant="outline"
                        className="w-full gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all duration-300 rounded-xl"
                        onClick={handleMessageTutor}
                      >
                        <MessageSquare className="h-4 w-4" /> Message Tutor
                      </Button>
                    )}
                  </CardContent>
                </>
              ) : enrolledBooking ? (
                <>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" /> Enrolled Successfully
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 text-center">
                      <p className="font-medium text-green-800 dark:text-green-300 mb-2">You are officially enrolled in {tutor.name}'s classes!</p>
                      <p className="text-sm text-green-600/80 dark:text-green-400/80">
                        Plan: {enrolledBooking.planType} (₹{enrolledBooking.amountPaid}{enrolledBooking.planType.includes('Pack') ? '/month' : '/hr'})
                      </p>
                      <p className="text-sm text-green-600/80 dark:text-green-400/80 mt-1">
                        Timing: {enrolledBooking.timing}
                      </p>
                    </div>
                    <Button asChild className="w-full" variant="outline">
                      <Link to="/dashboard/student">Go to Dashboard</Link>
                    </Button>
                    {user?.id !== (tutor.userId?._id || tutor.userId?.id || tutor.userId) && (
                      <Button
                        variant="outline"
                        className="w-full gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all duration-300 rounded-xl"
                        onClick={handleMessageTutor}
                      >
                        <MessageSquare className="h-4 w-4" /> Message Tutor
                      </Button>
                    )}
                  </CardContent>
                </>
              ) : (
                <>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {selectedPlan?.type === 'Free Demo Class' ? (
                        <><CalendarIcon className="h-5 w-5 text-primary" /> Book a Demo Class</>
                      ) : selectedPlan ? (
                        <><CreditCard className="h-5 w-5 text-primary" /> Book a Class</>
                      ) : (
                        <><CalendarIcon className="h-5 w-5 text-primary" /> Select Pricing & Booking option</>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!selectedPlan && !selectedExisting && (
                      <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 text-center">
                        <p className="text-sm font-semibold text-foreground mb-1">
                          Booking Incomplete
                        </p>
                        <p className="text-xs text-muted-foreground">Please select an option from the Pricing & Booking list on the left first.</p>
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground">
                      {selectedPlan?.type === 'Free Demo Class'
                        ? "Select a date and an available slot to try a free demo class."
                        : selectedPlan
                          ? `Select a date and an available slot to book a ${selectedPlan.type} class.`
                          : "Please select an option from the Pricing & Booking list on the left to continue."}
                    </p>

                    {selectedPlan?.isPack ? (
                      <div className="space-y-4">
                        {/* Course start date selector */}
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Course Start Date</label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className={`w-full justify-start text-left font-normal ${!packStartDate && "text-muted-foreground"}`}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                {isValidDate(packStartDate) ? format(packStartDate as Date, "PPP") : <span>Pick a start date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={packStartDate}
                                onSelect={setPackStartDate}
                                initialFocus
                                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                              />
                            </PopoverContent>
                          </Popover>
                          {packStartDate && (
                            <p className="text-[11px] text-emerald-600 font-semibold px-1 mt-1">
                              ✓ Course Ends: {format(addDays(packStartDate, 27), "PPP")} (4 Weeks Package)
                            </p>
                          )}
                        </div>

                        {/* Recurrent scheduling slot pickers */}
                        <div className="space-y-3 p-3.5 border rounded-xl bg-secondary/15">
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground mb-2">Set Weekly Schedule</h4>
                          {packSchedule.map((sched, idx) => {
                            const availableDays = Array.from(new Set(tutor?.availability?.map((a: any) => a.day) || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']));
                            const daySlots = sched.day ? getSlotsForWeekday(sched.day) : [];

                            return (
                              <div key={idx} className="space-y-2 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                                <label className="text-xs font-bold text-muted-foreground">Class Slot #{idx + 1}</label>
                                <div className="grid grid-cols-2 gap-2">
                                  {/* Day Selector */}
                                  <Select
                                    value={sched.day}
                                    onValueChange={(val) => {
                                      const newSched = [...packSchedule];
                                      newSched[idx] = { day: val, time: '' }; // reset time on day change
                                      setPackSchedule(newSched);
                                    }}
                                  >
                                    <SelectTrigger className="bg-background">
                                      <SelectValue placeholder="Select Day" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableDays.map((dayName: any) => (
                                        <SelectItem key={dayName} value={dayName}>{dayName}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  {/* Time Selector */}
                                  <Select
                                    value={sched.time}
                                    onValueChange={(val) => {
                                      const newSched = [...packSchedule];
                                      newSched[idx].time = val;
                                      setPackSchedule(newSched);
                                    }}
                                    disabled={!sched.day}
                                  >
                                    <SelectTrigger className="bg-background">
                                      <SelectValue placeholder="Select Time" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {daySlots.map((timeString: string) => (
                                        <SelectItem key={timeString} value={timeString}>{timeString}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            );
                          })}
                          {packSchedule.some((slot, i) =>
                            slot.day && slot.time && packSchedule.some((otherSlot, j) => i !== j && slot.day === otherSlot.day && slot.time === otherSlot.time)
                          ) && (
                              <div className="text-[11px] font-semibold text-destructive mt-2 flex items-center gap-1.5 animate-pulse bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                <span>Duplicate slots selected. Please choose unique times.</span>
                              </div>
                            )}
                        </div>



                        {/* Instant Calendar Sessions Preview */}
                        {generatedPackSessions && generatedPackSessions.length > 0 ? (
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Calendar Preview ({generatedPackSessions.length} Sessions)</label>
                            <div className="border rounded-xl bg-card p-3 max-h-[180px] overflow-y-auto space-y-1.5 shadow-inner">
                              {generatedPackSessions.map((session, i) => (
                                <div key={i} className="flex justify-between items-center text-xs p-2 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors">
                                  <span className="font-semibold text-muted-foreground">Class #{i + 1}</span>
                                  <span className="font-bold text-foreground">{session.date} at {session.time}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] font-semibold text-center text-muted-foreground p-3 border border-dashed rounded-xl bg-secondary/5 mt-2">
                            Please select all days and time slots above to preview your monthly calendar schedule.
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Standard Single Booking Selector */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={`w-full justify-start text-left font-normal ${!date && "text-muted-foreground"}`}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {isValidDate(date) ? format(date as Date, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={date}
                              onSelect={setDate}
                              initialFocus
                              disabled={(d) => {
                                if (d < new Date(new Date().setHours(0, 0, 0, 0))) return true;
                                if (tutor?.availability && tutor.availability.length > 0) {
                                  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                                  const dayName = days[getDay(d)];
                                  return !tutor.availability.some((a: any) => a.day === dayName);
                                }
                                return false;
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                        <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto pr-2">
                          {availableSlotsForDate && availableSlotsForDate.length > 0 ? (
                            availableSlotsForDate.map((slot: any, i: number) => {
                              const timingString = isValidDate(date) ? `${formatDateInTimeZone(date as Date, studentTimezone)} at ${slot.studentDisplayTime}` : slot.studentDisplayTime;
                              const isBooked = existingBookings.some((b: any) => {
                                if (b.utcTiming) {
                                  return new Date(b.utcTiming).getTime() === slot.utcTimeMs && (b.status === "confirmed" || b.status === "enrolled");
                                }
                                return b.timing === timingString && (b.status === "confirmed" || b.status === "enrolled");
                              });
                              const isSlotDisabled = (!selectedPlan && hasActiveBooking && timingString !== activeBookingTiming);

                              return (
                                <button
                                  key={i}
                                  onClick={() => setSelectedSlot(slot.studentDisplayTime)}
                                  disabled={isSlotDisabled}
                                  className={`w-full flex justify-between items-center rounded-lg border p-3 text-left text-sm transition-colors ${selectedSlot === slot.studentDisplayTime
                                    ? "border-primary bg-primary/5 text-foreground"
                                    : "hover:border-primary/50 text-muted-foreground"
                                    } ${isSlotDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                                >
                                  <div className="font-medium text-foreground">
                                    {slot.studentDisplayTime}
                                    <span className="ml-1.5 text-xs font-normal text-muted-foreground italic">
                                      ({slot.tutorDisplayTime} {slot.tutorTimeZoneAbbr})
                                    </span>
                                  </div>
                                  <div className="flex items-center">
                                    {isBooked && (
                                      <Badge variant="secondary" className="mr-2 text-xs text-green-600 bg-green-100">Booked</Badge>
                                    )}
                                    {selectedSlot === slot.studentDisplayTime && (
                                      <CheckCircle className="h-4 w-4 text-primary" />
                                    )}
                                  </div>
                                </button>
                              )
                            })
                          ) : (
                            <div className="text-sm text-muted-foreground p-3 border rounded text-center bg-secondary/30">
                              No availability for {isValidDate(date) ? formatDateInTimeZone(date as Date, studentTimezone) : 'this date'}. <br /> Select a highlighted date from the calendar.
                            </div>
                          )}
                        </div>

                        <div className="mt-3 text-[11px] text-muted-foreground flex items-center justify-between bg-secondary/5 p-2 rounded-lg border">
                          <span>Times shown in: <strong>{studentTimezone}</strong></span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="text-primary hover:underline font-semibold ml-1">change</button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-3" align="end">
                              <div className="space-y-2">
                                <Label htmlFor="student-tz-override" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Override Timezone</Label>
                                <Select value={studentTimezone} onValueChange={setStudentTimezone}>
                                  <SelectTrigger id="student-tz-override" className="h-8 text-xs bg-background">
                                    <SelectValue placeholder="Select timezone" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[200px]">
                                    {COMMON_TIMEZONES.map((tz) => (
                                      <SelectItem key={tz} value={tz} className="text-xs">
                                        {tz}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </>
                    )}

                    {selectedPlan && (selectedPlan.type === '2 Students' || selectedPlan.type === '3–5 Students') && (
                      <div className="space-y-2 mt-4 p-3 border rounded-lg bg-secondary/10">
                        <label className="text-sm font-medium">Invite Other Students (Emails)</label>
                        {otherEmails.map((email, idx) => (
                          <div key={idx} className="flex gap-2">
                            <input
                              type="email"
                              value={email}
                              onChange={e => {
                                const newEmails = [...otherEmails];
                                newEmails[idx] = e.target.value;
                                setOtherEmails(newEmails);
                              }}
                              placeholder="student@example.com"
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            {idx === otherEmails.length - 1 && selectedPlan.type === '3–5 Students' && otherEmails.length < 4 && (
                              <Button type="button" variant="outline" size="sm" onClick={() => setOtherEmails([...otherEmails, ''])}>+</Button>
                            )}
                            {otherEmails.length > 1 && (
                              <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => {
                                const newEmails = otherEmails.filter((_, i) => i !== idx);
                                setOtherEmails(newEmails);
                              }}>✕</Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <Button
                      className="w-full mt-4"
                      variant={selectedExisting ? "destructive" : "default"}
                      onClick={handleBookDemo}
                      disabled={isBookButtonDisabled}
                    >
                      {isProcessingPayment ? (
                        <span className="flex items-center gap-2 justify-center">
                          <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"></span>
                          Processing...
                        </span>
                      ) : (
                        selectedExisting
                          ? "Cancel Booking"
                          : selectedPlan
                            ? (selectedPlan.type === 'Free Demo Class' ? "Book Free Demo Session" : `Book Class & Pay ₹${selectedPlan.price}`)
                            : "Select Pricing & Booking option"
                      )}
                    </Button>

                    {user?.id !== (tutor.userId?._id || tutor.userId?.id || tutor.userId) && (
                      <Button
                        variant="outline"
                        className="w-full mt-2 gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all duration-300 rounded-xl"
                        onClick={handleMessageTutor}
                      >
                        <MessageSquare className="h-4 w-4" /> Message Tutor
                      </Button>
                    )}

                    {!selectedExisting && (
                      <p className="text-center text-xs text-muted-foreground mt-2">
                        {selectedPlan
                          ? (selectedPlan.price === 0 ? "Free • No commitment required" : `Total: ₹${selectedPlan.price}${selectedPlan.isPack ? ' (Monthly Pack)' : '/hr'}`)
                          : "Select Pricing & Booking option"}
                      </p>
                    )}
                  </CardContent>
                </>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Sandbox Mock Checkout Overlay */}
      {sandboxOrder && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all duration-300">
          <div className="bg-slate-900 text-slate-100 rounded-3xl border border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] max-w-md w-full overflow-hidden flex flex-col transform transition-all duration-300 scale-100 relative max-h-[90vh]">

            {/* Header with gradient */}
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 text-white relative">
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 animate-pulse">
                  🧪 Sandbox Mode
                </Badge>
                <button
                  onClick={handleCancelSandboxPayment}
                  className="rounded-full p-1.5 bg-black/20 hover:bg-black/40 transition-colors text-white/80 hover:text-white"
                >
                  <span className="sr-only">Close</span>
                  ✕
                </button>
              </div>
              <p className="text-xs text-indigo-200 font-semibold tracking-wider uppercase mb-1">Secure Checkout</p>
              <h3 className="text-2xl font-bold tracking-tight">Cuvasol Payments</h3>
              <div className="mt-4 flex items-baseline justify-between border-t border-white/10 pt-4">
                <span className="text-sm text-indigo-100">Amount to Pay</span>
                <span className="text-3xl font-extrabold text-white">₹{sandboxOrder.price}</span>
              </div>
            </div>

            {/* Main content body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* Class summary card */}
              <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Tutor:</span>
                  <span className="font-semibold text-slate-200">{sandboxOrder.tutorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Course / Subject:</span>
                  <span className="font-semibold text-slate-200">{sandboxOrder.subject}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Class timing:</span>
                  <span className="font-semibold text-slate-200 text-right">{sandboxOrder.timing}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Plan Option:</span>
                  <span className="font-semibold text-indigo-400">{sandboxOrder.planType}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800/80 pt-2 text-[10px] text-slate-500">
                  <span>Order Reference:</span>
                  <span className="font-mono">{sandboxOrder.orderId}</span>
                </div>
              </div>

              {/* Payment Methods tabs */}
              <div className="space-y-4">
                <div className="flex border-b border-slate-800">
                  <button
                    onClick={() => setSandboxMethod("card")}
                    className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all ${sandboxMethod === "card"
                        ? "border-indigo-500 text-indigo-400"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                      }`}
                  >
                    <CreditCard className="inline-block h-4 w-4 mr-1.5 -mt-0.5" />
                    Card
                  </button>
                  <button
                    onClick={() => setSandboxMethod("upi")}
                    className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all ${sandboxMethod === "upi"
                        ? "border-indigo-500 text-indigo-400"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                      }`}
                  >
                    <span className="inline-block font-mono font-bold mr-1 bg-slate-800 text-slate-300 text-[10px] px-1 rounded">UPI</span>
                    UPI Pay
                  </button>
                  <button
                    onClick={() => setSandboxMethod("netbanking")}
                    className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all ${sandboxMethod === "netbanking"
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

                    {/* Visual Card representation */}
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
                          <p className="font-semibold text-slate-400">Sandbox Student</p>
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
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
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
                          className="p-2 border border-slate-800 bg-slate-950/40 rounded-lg text-center font-medium text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer hover:border-indigo-500/50 transition-colors"
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
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 font-mono text-center focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* Netbanking Fields */}
                {sandboxMethod === "netbanking" && (
                  <div className="space-y-3 text-xs">
                    <label className="block text-slate-400 font-medium">Select Your Bank</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { name: "State Bank of India", code: "SBI" },
                        { name: "HDFC Bank", code: "HDFC" },
                        { name: "ICICI Bank", code: "ICICI" },
                        { name: "Axis Bank", code: "AXIS" }
                      ].map((bank) => (
                        <div
                          key={bank.code}
                          className="p-3 border border-slate-800 bg-slate-950/40 rounded-lg text-left font-medium text-slate-300 hover:border-indigo-500/50 cursor-pointer transition-colors flex items-center justify-between"
                        >
                          <span className="truncate">{bank.name}</span>
                          <span className="text-[9px] bg-slate-800 text-slate-400 px-1 rounded uppercase font-bold">{bank.code}</span>
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
                  className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white rounded-xl py-5 font-bold text-sm tracking-wide shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border-0"
                >
                  <CheckCircle className="h-4 w-4" /> Authorize Mock Payment
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleCancelSandboxPayment}
                  className="w-full text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 rounded-xl py-5 text-xs font-semibold"
                >
                  Cancel and Refund
                </Button>
              </div>

              {/* Trust Badge footer */}
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
                      <div className="absolute inset-2 w-12 h-12 rounded-full border-4 border-blue-500/10 border-b-blue-400 animate-spin [animation-direction:reverse]"></div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white tracking-wide">Processing Sandbox Transaction</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                        Authorizing mock signatures and reserving class slots on Cuvasol servers...
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
                        Updating enrollment status and triggering notification mail...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cancellation Reason Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Demo Session</DialogTitle>
            <DialogDescription>
              Please let us and the tutor know why you are cancelling this demo class.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Select Reason</Label>
              <Select value={cancelReasonType} onValueChange={setCancelReasonType}>
                <SelectTrigger className="w-full bg-secondary/10">
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {CANCELLATION_REASONS.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {cancelReasonType === "Other" && (
              <div className="w-full space-y-2 animate-in fade-in duration-200">
                <Label htmlFor="customCancelReason" className="text-xs text-muted-foreground">Specify Reason</Label>
                <Textarea
                  id="customCancelReason"
                  placeholder="Tell the tutor why you are cancelling..."
                  value={customCancelReason}
                  onChange={(e) => setCustomCancelReason(e.target.value)}
                  className="resize-none bg-secondary/10"
                  rows={3}
                />
              </div>
            )}

            <div className="flex gap-3 justify-end mt-4">
              <Button variant="outline" onClick={() => {
                setIsCancelDialogOpen(false);
                setCancellingBookingId(null);
                setCancelReasonType("");
                setCustomCancelReason("");
              }}>
                Cancel
              </Button>
              <Button onClick={handleCancelSubmit} disabled={isSubmittingCancellation} className="bg-destructive hover:bg-destructive/90 text-white font-semibold">
                {isSubmittingCancellation ? "Submitting..." : "Confirm Cancellation"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default TutorProfile;
