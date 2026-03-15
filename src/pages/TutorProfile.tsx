import { useParams, Link } from "react-router-dom";
import { Star, MapPin, Monitor, Clock, ArrowLeft, Calendar, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import PageLayout from "@/components/layout/PageLayout";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const TutorProfile = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [tutor, setTutor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);

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
             setSelectedSlot(active.timing);
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
    if (!selectedSlot) {
      toast.error("Please select a demo slot first");
      return;
    }
    if (!user) {
      toast.error("Please log in to book a demo slot.");
      return;
    }

    const existingBooking = existingBookings.find(b => b.timing === selectedSlot && b.status === "confirmed");
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
      const res = await axios.post(`${API_URL}/tutors/${id}/book`, {
        timing: selectedSlot,
        studentId: user.id,
        studentName
      });
      toast.success("Demo booked successfully! You'll receive a confirmation shortly.");
      setExistingBookings([...existingBookings, res.data.booking]);
      setSelectedSlot(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to book demo");
    }
  };

  const selectedExisting = existingBookings.find(b => b.timing === selectedSlot && b.status === "confirmed");
  const hasActiveBooking = existingBookings.some(b => b.status === "confirmed");
  const activeBookingTiming = existingBookings.find(b => b.status === "confirmed")?.timing;

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
              <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between rounded-md bg-secondary p-3">
                    <span className="text-muted-foreground">1-on-1 (Premium)</span>
                    <span className="font-semibold text-foreground">₹{tutor.hourlyRate}/hr</span>
                  </div>
                  <div className="flex justify-between rounded-md bg-secondary p-3">
                    <span className="text-muted-foreground">2 Students</span>
                    <span className="font-semibold text-foreground">₹{Math.round(tutor.hourlyRate * 0.75)}/hr</span>
                  </div>
                  <div className="flex justify-between rounded-md bg-secondary p-3">
                    <span className="text-muted-foreground">3–5 Students</span>
                    <span className="font-semibold text-foreground">₹{Math.round(tutor.hourlyRate * 0.55)}/hr</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking sidebar */}
          <div>
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" /> Book a Demo Class
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">Select an available slot to try a free demo class.</p>
                <div className="space-y-2">
                  {tutor.availableTimings && tutor.availableTimings.length > 0 ? (
                    tutor.availableTimings.map((timing: string, i: number) => {
                      const isBooked = existingBookings.some((b: any) => b.timing === timing && b.status === "confirmed");
                      return (
                      <button
                        key={i}
                        onClick={() => setSelectedSlot(timing)}
                        disabled={hasActiveBooking && timing !== activeBookingTiming}
                        className={`w-full flex justify-between items-center rounded-lg border p-3 text-left text-sm transition-colors ${
                          selectedSlot === timing
                            ? "border-primary bg-primary/5 text-foreground"
                            : "hover:border-primary/50 text-muted-foreground"
                        } ${hasActiveBooking && timing !== activeBookingTiming ? "opacity-50 cursor-not-allowed" : ""}`}
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
                   disabled={(!tutor.availableTimings || tutor.availableTimings.length === 0) || (hasActiveBooking && !selectedExisting)}
                >
                  {selectedExisting ? "Cancel Demo Session" : "Book Demo Session"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">Free • No commitment required</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default TutorProfile;
