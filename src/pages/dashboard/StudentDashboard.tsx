import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Calendar, BookOpen, CreditCard, User, Search, Clock, Save, History, PlayCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PageLayout from "@/components/layout/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useSelector, useDispatch } from "react-redux";
import { fetchStudentStats } from "@/redux/slices/dashboardSlice";
import { RootState, AppDispatch } from "@/redux/store";
import API_URL from "@/config/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const StudentDashboard = () => {
  const { user } = useAuth();
  const initialName = String(user?.user_metadata?.full_name || user?.full_name || "Student");
  
  const dispatch = useDispatch<AppDispatch>();
  const { studentStats, loading: statsLoading } = useSelector((state: RootState) => state.dashboard);

  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  // Profile Form States
  const [profileName, setProfileName] = useState(initialName);
  const [profilePhone, setProfilePhone] = useState(user?.phone || "");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Rating States
  const [ratingBookingId, setRatingBookingId] = useState<string | null>(null);
  const [ratingTutorId, setRatingTutorId] = useState<string | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false);

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchStudentStats(user.id));
      axios.get(`${API_URL}/dashboard/student/${user.id}/bookings`)
        .then(res => setBookings(res.data))
        .catch(err => console.error(err))
        .finally(() => setLoadingBookings(false));
    }
  }, [dispatch, user?.id]);

  const handleBookingAction = async (bookingId: string, status: string) => {
    try {
      await axios.put(`${API_URL}/tutors/booking/${bookingId}/status`, { status });
      toast.success(`Booking ${status} successfully.`);
      setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status } : b));
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update booking");
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setIsUpdatingProfile(true);
    try {
      await axios.put(`${API_URL}/auth/profile/${user.id}`, { full_name: profileName, phone: profilePhone });
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const submitRating = async () => {
    if (!ratingBookingId || !ratingTutorId || ratingValue === 0) {
      toast.error("Please select a star rating");
      return;
    }
    setIsSubmittingRating(true);
    try {
      await axios.post(`${API_URL}/tutors/${ratingTutorId}/rate`, {
        bookingId: ratingBookingId,
        rating: ratingValue,
        reviewText,
        studentName: profileName
      });
      toast.success("Rating submitted successfully!");
      setBookings(prev => prev.map(b => b._id === ratingBookingId ? { ...b, isRated: true } : b));
      setIsRatingDialogOpen(false);
      setRatingValue(0);
      setReviewText("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit rating");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const enrolledClasses = bookings.filter(b => b.status === 'enrolled');
  const paymentHistory = bookings.filter(b => b.status === 'enrolled' && b.amountPaid);

  return (
    <PageLayout>
      <div className="container py-10 max-w-7xl">
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-foreground tracking-tight">Welcome, {profileName}!</h1>
            <p className="text-lg text-muted-foreground mt-1">Manage your learning journey, classes, and payments.</p>
          </div>
          <Button asChild size="lg" className="shadow-md rounded-full px-8">
            <Link to="/tutors"><Search className="mr-2 h-4 w-4" /> Find a New Tutor</Link>
          </Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          {[
            { icon: Calendar, label: "Upcoming Classes", value: studentStats?.upcomingClasses || 0, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
            { icon: Clock, label: "Demo Bookings", value: studentStats?.completedSessions || 0, color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/30" },
            { icon: BookOpen, label: "Enrolled Courses", value: studentStats?.enrolledCourses || 0, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30" },
            { icon: CreditCard, label: "Total Spent", value: `₹${paymentHistory.reduce((acc, curr) => acc + (curr.amountPaid || 0), 0)}`, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
          ].map((stat, idx) => (
            <Card key={stat.label} className="border-none shadow-md hover:shadow-lg transition-all duration-300">
              <CardContent className="flex items-center gap-5 p-6">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${stat.bg}`}>
                  <stat.icon className={`h-7 w-7 ${stat.color}`} />
                </div>
                <div>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16 mb-1" />
                  ) : (
                    <p className="text-3xl font-bold text-foreground tracking-tight">
                      {String(stat.value)}
                    </p>
                  )}
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="upcoming" className="space-y-8">
          <TabsList className="bg-secondary/50 p-1 rounded-xl shadow-sm border mb-4 w-full overflow-x-auto whitespace-nowrap justify-start h-auto">
            <TabsTrigger value="upcoming" className="rounded-lg px-6 py-2.5 shrink-0">My Classes</TabsTrigger>
            <TabsTrigger value="demos" className="rounded-lg px-6 py-2.5 shrink-0">Demo Tracker</TabsTrigger>
            <TabsTrigger value="payments" className="rounded-lg px-6 py-2.5 shrink-0">Payment Ledger</TabsTrigger>
            <TabsTrigger value="profile" className="rounded-lg px-6 py-2.5 shrink-0">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            <Card className="shadow-md border-border/50">
              <CardHeader className="bg-secondary/20 border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2"><PlayCircle className="h-5 w-5 text-primary" /> Active Enrolled Classes</CardTitle>
                <CardDescription>Your current ongoing classes with tutors.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {loadingBookings ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-20 w-full rounded-xl" />
                    <Skeleton className="h-20 w-full rounded-xl" />
                  </div>
                ) : enrolledClasses.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-secondary/10 rounded-2xl border border-dashed mt-4">
                    <Calendar className="mx-auto mb-4 h-16 w-16 opacity-30 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Active Classes</h3>
                    <p className="max-w-sm mx-auto">You aren't enrolled in any paid classes right now. Find a tutor and book a demo to get started!</p>
                    <Button asChild className="mt-6 rounded-full px-8"><Link to="/tutors">Browse Tutors</Link></Button>
                  </div>
                ) : (
                  <div className="grid gap-4 mt-4 sm:grid-cols-2">
                    {enrolledClasses.map((cls: any) => (
                      <div key={cls._id} className="flex flex-col bg-card hover:bg-secondary/10 transition-colors p-5 rounded-xl border shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                           <div>
                             <h4 className="font-bold text-lg text-foreground">{cls.subject}</h4>
                             <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><User className="h-3 w-3"/> Tutor: {cls.tutorName}</p>
                           </div>
                           <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none px-3 py-1">{cls.planType}</Badge>
                        </div>
                        <div className="mt-auto pt-4 border-t flex justify-between items-center">
                           <span className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4"/> {cls.timing}</span>
                           <div className="flex gap-2">
                             {!cls.isRated && (
                               <Button size="sm" variant="secondary" className="text-yellow-600 bg-yellow-50 hover:bg-yellow-100" onClick={() => {
                                 setRatingBookingId(cls._id);
                                 setRatingTutorId(cls.tutorId);
                                 setIsRatingDialogOpen(true);
                               }}>
                                 <Star className="h-4 w-4 mr-1" fill="currentColor"/> Rate
                               </Button>
                             )}
                             <Button variant="outline" size="sm" asChild>
                               <Link to={`/tutors/${cls.tutorId}`}>View Tutor</Link>
                             </Button>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="demos">
            <Card className="shadow-md border-border/50">
              <CardHeader className="bg-secondary/20 border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2"><Clock className="h-5 w-5 text-indigo-500" /> Demo Bookings Tracker</CardTitle>
                <CardDescription>Track the status of your free demo sessions.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {loadingBookings ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-20 w-full rounded-xl" />
                  </div>
                ) : bookings.filter(b => b.status !== 'enrolled').length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-secondary/10 rounded-2xl border border-dashed mt-4">
                    <Clock className="mx-auto mb-4 h-16 w-16 opacity-30 text-indigo-500" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Demos Booked</h3>
                    <p>You haven't booked any demo sessions yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4 mt-4">
                    {bookings.filter(b => b.status !== 'enrolled').map((booking: any) => (
                      <div key={booking._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card p-5 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
                        <div className="mb-4 sm:mb-0">
                          <p className="font-bold text-lg text-foreground flex items-center gap-2">
                             <User className="h-5 w-5 text-primary"/> {booking.tutorName}
                          </p>
                          {booking.subject && <p className="text-sm font-medium text-primary mt-1 px-2 py-0.5 bg-primary/10 rounded-md inline-block">{booking.subject}</p>}
                          <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2"><Calendar className="h-4 w-4"/> {booking.timing}</p>
                        </div>
                        <div className="flex flex-col items-start sm:items-end gap-3 w-full sm:w-auto">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-medium">STATUS:</span>
                            <Badge variant="outline" className={`px-3 py-1 border-none ${
                               booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                               booking.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                               'bg-red-100 text-red-700'
                             }`}>
                               {booking.status.toUpperCase()}
                             </Badge>
                          </div>
                          
                          <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                            {booking.status === 'confirmed' && (
                               <Button size="sm" variant="outline" className="w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={() => handleBookingAction(booking._id, 'cancelled')}>Cancel Demo</Button>
                            )}
                            {booking.status === 'completed' && (
                                <>
                                  {!booking.isRated && (
                                     <Button size="sm" variant="secondary" className="w-full sm:w-auto text-yellow-600 bg-yellow-50 hover:bg-yellow-100" onClick={() => {
                                       setRatingBookingId(booking._id);
                                       setRatingTutorId(booking.tutorId);
                                       setIsRatingDialogOpen(true);
                                     }}>
                                       <Star className="h-4 w-4 mr-1" fill="currentColor"/> Rate
                                     </Button>
                                  )}
                                  <Button asChild size="sm" className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md">
                                    <Link to={`/tutors/${booking.tutorId}`}>Enroll & Pay</Link>
                                  </Button>
                                </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card className="shadow-md border-border/50">
              <CardHeader className="bg-secondary/20 border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2"><History className="h-5 w-5 text-emerald-500" /> Payment Ledger</CardTitle>
                <CardDescription>A record of all your enrolled class payments.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {loadingBookings ? (
                   <div className="py-4"><Skeleton className="h-32 w-full rounded-xl" /></div>
                ) : paymentHistory.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-secondary/10 rounded-2xl border border-dashed mt-4">
                    <CreditCard className="mx-auto mb-4 h-16 w-16 opacity-30 text-emerald-500" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Payments Found</h3>
                    <p>Your payment history is currently empty.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto mt-4 rounded-xl border">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground bg-secondary/50 uppercase border-b">
                        <tr>
                          <th className="px-6 py-4 font-medium">Date</th>
                          <th className="px-6 py-4 font-medium">Tutor / Subject</th>
                          <th className="px-6 py-4 font-medium">Plan Type</th>
                          <th className="px-6 py-4 font-medium text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentHistory.map((payment: any) => (
                          <tr key={payment._id} className="bg-card border-b last:border-0 hover:bg-secondary/20 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground">
                              {new Date(payment.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-foreground">{payment.tutorName}</div>
                              <div className="text-muted-foreground text-xs">{payment.subject}</div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant="secondary" className="bg-primary/10 text-primary">{payment.planType}</Badge>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-emerald-600">
                              ₹{payment.amountPaid}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card className="shadow-md border-border/50 max-w-2xl">
              <CardHeader className="bg-secondary/20 border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2"><User className="h-5 w-5 text-blue-500" /> Profile Settings</CardTitle>
                <CardDescription>Update your personal information.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-semibold">Full Name</Label>
                    <Input id="name" value={profileName} onChange={(e) => setProfileName(e.target.value)} className="bg-secondary/20 border-border/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold">Email Address <span className="text-xs font-normal text-muted-foreground">(Cannot be changed)</span></Label>
                    <Input id="email" value={String(user?.email || "")} disabled className="bg-secondary/50 opacity-70" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-semibold">Phone Number</Label>
                    <Input id="phone" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} placeholder="+1 234 567 890" className="bg-secondary/20 border-border/50" />
                  </div>
                  <Button type="submit" disabled={isUpdatingProfile} className="w-full sm:w-auto shadow-md rounded-full px-8">
                    {isUpdatingProfile ? "Saving..." : <><Save className="mr-2 h-4 w-4"/> Save Changes</>}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Rating Dialog */}
      <Dialog open={isRatingDialogOpen} onOpenChange={setIsRatingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rate Your Tutor</DialogTitle>
            <DialogDescription>
              How was your class? Please leave a rating and optional review.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center space-y-4 py-4">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatingValue(star)}
                  className={`p-1 transition-all ${ratingValue >= star ? 'text-yellow-500 scale-110' : 'text-muted-foreground/30 hover:text-yellow-200'}`}
                >
                  <Star className="h-8 w-8" fill={ratingValue >= star ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
            <div className="w-full">
              <Label htmlFor="review" className="text-xs text-muted-foreground mb-2 block">Written Review (Optional)</Label>
              <Textarea
                id="review"
                placeholder="Share your experience..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="resize-none bg-secondary/10"
                rows={3}
              />
            </div>
            <Button onClick={submitRating} disabled={isSubmittingRating} className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold">
              {isSubmittingRating ? "Submitting..." : "Submit Rating"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default StudentDashboard;
