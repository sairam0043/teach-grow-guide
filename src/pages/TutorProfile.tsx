import { useParams, Link } from "react-router-dom";
import { Star, MapPin, Monitor, Clock, ArrowLeft, Calendar as CalendarIcon, CheckCircle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import PageLayout from "@/components/layout/PageLayout";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import API_URL from "@/config/api";

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
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

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
      }

      const res = await axios.post(endpoint, payload);
      toast.success(selectedPlan ? "Class booked successfully!" : "Demo booked successfully! You'll receive a confirmation shortly.");
      setExistingBookings([...existingBookings, res.data.booking]);
      setSelectedSlot(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to book");
    }
  };

  const isValidDate = (d: any) => d instanceof Date && !isNaN(d.getTime());
  const formattedSelectedTiming = isValidDate(date) && selectedSlot ? `${format(date as Date, 'PPP')} at ${selectedSlot}` : null;
  const selectedExisting = formattedSelectedTiming ? existingBookings.find(b => b.timing === formattedSelectedTiming && b.status === "confirmed") : undefined;
  
  const activeDemoBooking = existingBookings.find(b => b.status === "confirmed");
  const completedBooking = existingBookings.find(b => b.status === "completed");
  const enrolledBooking = existingBookings.find(b => b.status === "enrolled");
  
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
                src={tutor.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.name)}&background=random&size=400`}
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
              {enrolledBooking ? (
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
                    </div>
                    <Button asChild className="w-full" variant="outline">
                      <Link to="/dashboard">Go to Dashboard</Link>
                    </Button>
                  </CardContent>
                </>
              ) : (
                <>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                       {(selectedPlan || completedBooking) ? (
                         <><CreditCard className="h-5 w-5 text-primary" /> Book a Class</>
                       ) : (
                         <><CalendarIcon className="h-5 w-5 text-primary" /> Book a Demo Class</>
                       )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {completedBooking && !selectedPlan && (
                       <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 text-center">
                         <p className="text-sm font-medium text-foreground mb-1">Demo Completed!</p>
                         <p className="text-xs text-muted-foreground">Select a pricing plan from the left to enroll in classes.</p>
                       </div>
                    )}
                    
                    <p className="text-sm text-muted-foreground">
                      {(selectedPlan || completedBooking)
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
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
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
                    
                    <div className="space-y-2 mt-4">
                      {tutor.availableTimings && tutor.availableTimings.length > 0 ? (
                        tutor.availableTimings.map((timing: string, i: number) => {
                          const timingString = isValidDate(date) ? `${format(date as Date, 'PPP')} at ${timing}` : timing;
                          const isBooked = existingBookings.some((b: any) => b.timing === timingString && b.status === "confirmed");
                          
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
                        <div className="text-sm text-muted-foreground p-3 border rounded text-center">
                          No availability scheduled yet. <br/> Check back later!
                        </div>
                      )}
                    </div>
                    
                    <Button 
                       className="w-full" 
                       variant={selectedExisting ? "destructive" : "default"}
                       onClick={handleBookDemo} 
                       disabled={(!tutor.availableTimings || tutor.availableTimings.length === 0) 
                         || (!selectedPlan && hasActiveBooking && !selectedExisting)
                         || (completedBooking && !selectedPlan)}
                    >
                      {selectedExisting 
                         ? "Cancel Booking" 
                         : ((selectedPlan || completedBooking) ? (selectedPlan ? `Book Class & Pay ₹${selectedPlan.price}` : "Select a Plan to Book") : "Book Demo Session")}
                    </Button>
                    
                    {(!selectedPlan && hasActiveBooking && !selectedExisting && !completedBooking) && (
                      <p className="text-center text-sm text-yellow-600 font-medium">
                        You have already booked a demo session with this tutor.
                      </p>
                    )}
                    
                    {!selectedExisting && (
                      <p className="text-center text-xs text-muted-foreground">
                        {(selectedPlan || completedBooking) ? (selectedPlan ? `Total: ₹${selectedPlan.price}/hr` : "") : "Free • No commitment required"}
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
