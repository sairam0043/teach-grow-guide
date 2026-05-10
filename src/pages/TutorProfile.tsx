import { useParams, Link } from "react-router-dom";
import { Star, MapPin, Monitor, Clock, ArrowLeft, Calendar as CalendarIcon, CheckCircle, CreditCard, ClockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, getDay, addMinutes, parse, startOfDay } from "date-fns";
import PageLayout from "@/components/layout/PageLayout";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import API_URL from "@/config/api";
import { resolveAssetUrl } from "@/lib/assetUrl";

const TutorProfile = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [tutor, setTutor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<{type: string, price: number} | null>(null);
  const [otherEmails, setOtherEmails] = useState<string[]>(['']);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [availableSlotsForDate, setAvailableSlotsForDate] = useState<string[]>([]);

  const isValidDate = (d: any) => d instanceof Date && !isNaN(d.getTime());

  useEffect(() => {
    if (isValidDate(date) && tutor?.availability && tutor.availability.length > 0) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = days[getDay(date as Date)];
      const dayAvail = tutor.availability.find((a: any) => a.day === dayName);
      
      if (dayAvail && dayAvail.startTime && dayAvail.endTime) {
        const slots: string[] = [];
        let current = parse(dayAvail.startTime, 'HH:mm', startOfDay(date as Date));
        const end = parse(dayAvail.endTime, 'HH:mm', startOfDay(date as Date));
        
        while (current < end) {
           slots.push(format(current, 'h:mm a'));
           current = addMinutes(current, 30);
        }
        setAvailableSlotsForDate(slots);
      } else {
        setAvailableSlotsForDate([]);
      }
    } else if (tutor?.availableTimings) {
      setAvailableSlotsForDate(tutor.availableTimings);
    } else {
      setAvailableSlotsForDate([]);
    }
  }, [date, tutor]);

  useEffect(() => {
    const fetchTutor = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/tutors/${id}`);
        setTutor(res.data);
        
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
    if (!date) {
      toast.error("Please select a date first");
      return;
    }
    if (!selectedSlot) {
      toast.error("Please select a demo slot first");
      return;
    }
    if (!selectedSubject) {
      toast.error("Please select a subject for the demo");
      return;
    }
    if (!user) {
      toast.error("Please log in to book a demo slot.");
      return;
    }

    const formattedTiming = `${format(date, 'PPP')} at ${selectedSlot}`;
    const existingBooking = existingBookings.find(b => b.timing === formattedTiming && b.status === "confirmed");
    if (existingBooking) {
      // Cancel booking
      try {
        await axios.put(`${API_URL}/tutors/booking/${existingBooking._id}/status`, { status: "cancelled" });
        toast.success("Booking cancelled successfully.");
        setExistingBookings(prev => prev.map(b => b._id === existingBooking._id ? { ...b, status: "cancelled" } : b));
        setSelectedSlot(null);
      } catch (err: any) {
         toast.error(err.response?.data?.message || "Failed to cancel booking");
      }
      return;
    }

    // Otherwise book
    try {
      const studentName = String(user?.user_metadata?.full_name || "Student");
      const formattedTiming = `${format(date, 'PPP')} at ${selectedSlot}`;
      
      const endpoint = selectedPlan ? `${API_URL}/tutors/${id}/book-class` : `${API_URL}/tutors/${id}/book`;
      
      const payload: any = {
        timing: formattedTiming,
        subject: selectedSubject,
        studentId: user.id,
        studentName
      };

      if (selectedPlan) {
        payload.planType = selectedPlan.type;
        payload.amountPaid = selectedPlan.price;
        payload.isDirectClass = true; // flag to tell backend this isn't a demo

        if (selectedPlan.type === '2 Students' || selectedPlan.type === '3–5 Students') {
          const validEmails = otherEmails.filter(e => e.trim() !== '');
          
          if (user?.email && validEmails.some(e => e.toLowerCase() === user.email.toLowerCase())) {
            toast.error("You cannot invite yourself. Please enter emails of other students.");
            return;
          }

          if (selectedPlan.type === '2 Students' && validEmails.length < 1) {
            toast.error("Please enter the email of the other student.");
            return;
          }
          if (selectedPlan.type === '3–5 Students' && validEmails.length < 2) {
            toast.error("Please enter at least 2 other student emails for this plan.");
            return;
          }
          payload.otherStudentsEmails = validEmails;
        }
      }

      const res = await axios.post(endpoint, payload);
      toast.success(selectedPlan ? "Class booked successfully!" : "Demo booked successfully! You'll receive a confirmation shortly.");
      setExistingBookings([...existingBookings, res.data.booking]);
      setSelectedSlot(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to book");
    }
  };

  const formattedSelectedTiming = isValidDate(date) && selectedSlot ? `${format(date as Date, 'PPP')} at ${selectedSlot}` : null;
  const selectedExisting = formattedSelectedTiming ? existingBookings.find(b => b.timing === formattedSelectedTiming && b.status === "confirmed") : undefined;
  
  const activeDemoBooking = existingBookings.find(b => b.status === "confirmed");
  const completedBooking = existingBookings.find(b => b.status === "completed");
  const enrolledBooking = existingBookings.find(b => b.status === "enrolled");
  const pendingBooking = existingBookings.find(b => b.status === "pending");
  
  const hasActiveBooking = !!activeDemoBooking;
  const activeBookingTiming = activeDemoBooking?.timing;

  const handlePaymentAndBook = async () => {
    // This is for complete enrollment (if we separate payment from booking). 
    // But since the user wants them to ALWAYS pick a date/time to book a class...
    // We will just use handleBookDemo (renaming it conceptually to handleSubmitBooking)
  };

  return (
    <PageLayout>
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
                className="h-40 w-40 rounded-xl object-cover shadow-card"
              />
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Badge className="bg-primary text-primary-foreground">{tutor.category}</Badge>
                  <Badge variant="secondary">{tutor.mode}</Badge>
                </div>
                <h1 className="mb-1 text-3xl font-bold text-foreground">{tutor.name}</h1>
                <p className="mb-2 text-muted-foreground">{tutor.qualification}</p>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-warning text-warning" />
                    <strong className="text-foreground">{tutor.rating || "5.0"}</strong> ({tutor.reviewCount || 1} reviews)
                  </span>
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
                    <Badge key={s} variant="secondary" className="px-3 py-1 text-sm">{s}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {((tutor?.availability && tutor.availability.length > 0) || (tutor?.availableTimings && tutor.availableTimings.length > 0)) && (
              <Card>
                <CardHeader><CardTitle>Availability Schedule</CardTitle></CardHeader>
                <CardContent>
                  {tutor.availability && tutor.availability.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {tutor.availability.map((avail: any) => (
                        <div key={avail.day} className="flex justify-between items-center p-3 border rounded-lg bg-secondary/20">
                          <span className="font-medium text-foreground">{avail.day}</span>
                          <span className="text-sm text-muted-foreground">
                            {format(parse(avail.startTime, 'HH:mm', new Date()), 'h:mm a')} - {format(parse(avail.endTime, 'HH:mm', new Date()), 'h:mm a')}
                          </span>
                        </div>
                      ))}
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
                  <span>Pricing</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {[
                    { type: '1-on-1 (Premium)', price: tutor.hourlyRate },
                    { type: '2 Students', price: Math.round(tutor.hourlyRate * 0.75) },
                    { type: '3–5 Students', price: Math.round(tutor.hourlyRate * 0.55) }
                  ].map(plan => (
                    <div 
                      key={plan.type}
                      onClick={() => !enrolledBooking ? setSelectedPlan(plan) : null}
                      className={`flex justify-between rounded-md p-4 transition-all duration-200 border ${
                        selectedPlan?.type === plan.type
                          ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]"
                          : !enrolledBooking
                          ? "bg-secondary hover:bg-secondary/80 cursor-pointer border-transparent hover:border-primary/30"
                          : "bg-secondary border-transparent opacity-80"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                         {!enrolledBooking && (
                           <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${selectedPlan?.type === plan.type ? "border-primary-foreground" : "border-muted-foreground"}`}>
                             {selectedPlan?.type === plan.type && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
                           </div>
                         )}
                         <span className={selectedPlan?.type === plan.type ? "text-primary-foreground/90 font-medium" : "text-muted-foreground"}>
                           {plan.type}
                         </span>
                      </div>
                      <span className={`font-bold text-lg ${selectedPlan?.type === plan.type ? "text-primary-foreground" : "text-foreground"}`}>
                        ₹{plan.price}<span className="text-xs font-normal opacity-70">/hr</span>
                       </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking sidebar */}
          <div>
            <Card className="sticky top-20">
              {pendingBooking ? (
                <>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-500">
                      <ClockIcon className="h-5 w-5" /> Pending Approvals
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 text-center">
                      <p className="font-medium text-amber-800 dark:text-amber-300 mb-2">Waiting for group members to approve.</p>
                      <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
                        Email invitations have been sent to the other students. The class will be officially booked once everyone approves.
                      </p>
                      <p className="text-sm text-amber-600/80 dark:text-amber-400/80 mt-2 font-medium">
                        Timing: {pendingBooking.timing}
                      </p>
                    </div>
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
                        Plan: {enrolledBooking.planType} (₹{enrolledBooking.amountPaid}/hr)
                      </p>
                      <p className="text-sm text-green-600/80 dark:text-green-400/80 mt-1">
                        Timing: {enrolledBooking.timing}
                      </p>
                    </div>
                    <Button asChild className="w-full" variant="outline">
                      <Link to="/dashboard/student">Go to Dashboard</Link>
                    </Button>
                  </CardContent>
                </>
              ) : (
                <>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                       {(selectedPlan || completedBooking || hasActiveBooking) ? (
                         <><CreditCard className="h-5 w-5 text-primary" /> Book a Class</>
                       ) : (
                         <><CalendarIcon className="h-5 w-5 text-primary" /> Book a Demo Class</>
                       )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(completedBooking || hasActiveBooking) && !selectedPlan && !selectedExisting && (
                       <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 text-center">
                         <p className="text-sm font-medium text-foreground mb-1">
                           {completedBooking ? "Demo Completed!" : "Demo Already Booked!"}
                         </p>
                         <p className="text-xs text-muted-foreground">Select a pricing plan from the left to enroll in classes.</p>
                       </div>
                    )}
                    
                    <p className="text-sm text-muted-foreground">
                      {(selectedPlan || completedBooking || hasActiveBooking)
                        ? (selectedPlan ? `Select a date and an available slot to book a ${selectedPlan.type} class.` : "Select a pricing plan and slot to book.") 
                        : "Select a date and an available slot to try a free demo class."}
                    </p>

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

                    {tutor.subjects && tutor.subjects.length > 0 && (
                      <div className="space-y-2">
                        <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={hasActiveBooking && !selectedPlan && !completedBooking}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {tutor.subjects.map((s: string) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto pr-2">
                      {availableSlotsForDate && availableSlotsForDate.length > 0 ? (
                        availableSlotsForDate.map((timing: string, i: number) => {
                          const timingString = isValidDate(date) ? `${format(date as Date, 'PPP')} at ${timing}` : timing;
                          // A slot is booked if there's an active booking for it (confirmed or enrolled)
                          const isBooked = existingBookings.some((b: any) => b.timing === timingString && (b.status === "confirmed" || b.status === "enrolled"));
                          
                          // If they are just booking a demo, we disable other slots if they have a confirmed demo.
                          // But if they are booking a CLASS (selectedPlan), they can book any slot.
                          const isSlotDisabled = (!selectedPlan && hasActiveBooking && timingString !== activeBookingTiming);

                          return (
                          <button
                            key={i}
                            onClick={() => setSelectedSlot(timing)}
                            disabled={isSlotDisabled}
                            className={`w-full flex justify-between items-center rounded-lg border p-3 text-left text-sm transition-colors ${
                              selectedSlot === timing
                                ? "border-primary bg-primary/5 text-foreground"
                                : "hover:border-primary/50 text-muted-foreground"
                            } ${isSlotDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            <div className="font-medium text-foreground">{timing}</div>
                            <div className="flex items-center">
                               {isBooked && (
                                   <Badge variant="secondary" className="mr-2 text-xs text-green-600 bg-green-100">Booked</Badge>
                               )}
                               {selectedSlot === timing && (
                                 <CheckCircle className="h-4 w-4 text-primary" />
                               )}
                            </div>
                          </button>
                        )})
                      ) : (
                        <div className="text-sm text-muted-foreground p-3 border rounded text-center bg-secondary/30">
                          No availability for {isValidDate(date) ? format(date as Date, 'MMM do') : 'this date'}. <br/> Select a highlighted date from the calendar.
                        </div>
                      )}
                    </div>
                    
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
                       disabled={(!availableSlotsForDate || availableSlotsForDate.length === 0) 
                         || (!selectedPlan && hasActiveBooking && !selectedExisting)
                         || (completedBooking && !selectedPlan)}
                    >
                      {selectedExisting 
                         ? "Cancel Booking" 
                         : ((selectedPlan || completedBooking || hasActiveBooking) ? (selectedPlan ? `Book Class & Pay ₹${selectedPlan.price}` : "Select a Plan to Book") : "Book Demo Session")}
                    </Button>
                    
                    {!selectedExisting && (
                      <p className="text-center text-xs text-muted-foreground">
                        {(selectedPlan || completedBooking || hasActiveBooking) ? (selectedPlan ? `Total: ₹${selectedPlan.price}/hr` : "") : "Free • No commitment required"}
                      </p>
                    )}
                  </CardContent>
                </>
              )}
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default TutorProfile;
