import { useEffect, useState } from "react";
import axios from "axios";
import { Calendar, Users, Clock, DollarSign, Settings, BookOpen, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import PageLayout from "@/components/layout/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useSelector, useDispatch } from "react-redux";
import { fetchTutorStats, updateTutorTimings } from "@/redux/slices/dashboardSlice";
import { RootState, AppDispatch } from "@/redux/store";
import { toast } from "sonner";
import API_URL from "@/config/api";

const TutorDashboard = () => {
  const { user } = useAuth();
  const name = String(user?.user_metadata?.full_name || "Tutor");
  
  const dispatch = useDispatch<AppDispatch>();
  const { tutorStats, loading: statsLoading } = useSelector((state: RootState) => state.dashboard);
  
  const [tutorProfile, setTutorProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [newTiming, setNewTiming] = useState("");

  useEffect(() => {
    if (user?.id) {
      axios.get(`${API_URL}/tutors/user/${user.id}`)
        .then(res => {
          setTutorProfile(res.data);
          dispatch(fetchTutorStats(res.data.id)); // Database object ID natively fetched
          axios.get(`${API_URL}/dashboard/tutor/${res.data.id}/bookings`)
            .then(bRes => setBookings(bRes.data))
            .catch(err => console.error("Error fetching bookings", err))
            .finally(() => setLoadingBookings(false));
        })
        .catch(err => {
          console.error("Error fetching tutor profile", err);
          setLoadingBookings(false);
        })
        .finally(() => setLoading(false));
    }
  }, [user, dispatch]);

  const handleAddTiming = () => {
    if (!newTiming.trim() || !tutorProfile) return;
    const currentTimings = tutorStats?.availableTimings || [];
    dispatch(updateTutorTimings({ tutorId: tutorProfile.id, timings: [...currentTimings, newTiming] }))
      .unwrap()
      .then(() => {
        toast.success("Timing added");
        setNewTiming("");
      })
      .catch(() => toast.error("Failed to add timing"));
  };

  const handleRemoveTiming = (timingToRemove: string) => {
    if (!tutorProfile) return;
    const currentTimings = tutorStats?.availableTimings || [];
    dispatch(updateTutorTimings({ tutorId: tutorProfile.id, timings: currentTimings.filter(t => t !== timingToRemove) }))
      .unwrap()
      .then(() => toast.success("Timing removed"));
  };

  const handleBookingAction = async (bookingId: string, status: string) => {
    try {
      await axios.put(`${API_URL}/tutors/booking/${bookingId}/status`, { status });
      toast.success(`Booking ${status}.`);
      setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status } : b));
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Failed to ${status} booking`);
    }
  };

  return (
    <PageLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Tutor Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {name}</p>
        </div>

        {tutorProfile?.status === "pending" && (
          <Alert variant="destructive" className="mb-6 border-yellow-500 bg-yellow-500/10 text-yellow-600">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Account Pending Approval</AlertTitle>
            <AlertDescription>
              Your tutor profile is under review by our admin team. Once approved, you will be publicly listed on the platform and can accept demo bookings.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {[
            { icon: Clock, label: "Demo Requests", value: tutorStats?.demoRequests || 0 },
            { icon: Users, label: "Active Students", value: tutorStats?.activeStudents || 0 },
            { icon: Calendar, label: "Upcoming Classes", value: tutorStats?.upcomingClasses || 0 },
            { icon: DollarSign, label: "Total Earnings", value: `₹${tutorStats?.totalEarnings || 0}` },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16 mb-1" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">
                      {String(stat.value)}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="demos" className="space-y-6">
          <TabsList>
            <TabsTrigger value="demos">Demo Requests</TabsTrigger>
            <TabsTrigger value="schedule">Class Schedule</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="demos">
            <Card>
              <CardHeader><CardTitle>Requested Demo Bookings</CardTitle></CardHeader>
              <CardContent>
                {loadingBookings ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Clock className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p>No demo requests yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking: any) => (
                      <div key={booking._id} className="flex justify-between items-center bg-secondary p-4 rounded-lg border">
                        <div>
                          <p className="font-semibold text-foreground">Student: {booking.studentName}</p>
                          <p className="text-sm text-muted-foreground">Timing: {booking.timing}</p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <div>
                            <p className={`text-sm font-medium ${booking.status === 'confirmed' ? 'text-green-600' : 'text-red-600'}`}>
                              {booking.status.toUpperCase()}
                            </p>
                            <p className="text-xs text-muted-foreground">{new Date(booking.createdAt).toLocaleDateString()}</p>
                          </div>
                          {booking.status === 'confirmed' && (
                             <Button size="sm" variant="destructive" onClick={() => handleBookingAction(booking._id, 'rejected')}>Reject</Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            <Card>
              <CardHeader><CardTitle>Class Schedule</CardTitle></CardHeader>
              <CardContent>
                <div className="py-12 text-center text-muted-foreground">
                  <Calendar className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>No scheduled classes yet.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students">
            <Card>
              <CardHeader><CardTitle>Your Students</CardTitle></CardHeader>
              <CardContent>
                <div className="py-12 text-center text-muted-foreground">
                  <Users className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>No enrolled students yet.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="availability">
            <Card>
              <CardHeader>
                <CardTitle>Manage Availability</CardTitle>
                <p className="text-sm text-muted-foreground">Add your free sessions manually (e.g., Saturday 10:00 AM)</p>
              </CardHeader>
              <CardContent>
                <div className="mb-6 flex gap-2">
                  <Input 
                    value={newTiming} 
                    onChange={(e) => setNewTiming(e.target.value)} 
                    placeholder="E.g., Mon 5:00 PM - 6:00 PM" 
                  />
                  <Button onClick={handleAddTiming}>Add Slot</Button>
                </div>

                <div className="space-y-3">
                  {tutorStats?.availableTimings && tutorStats.availableTimings.length > 0 ? (
                    tutorStats.availableTimings.map((timing, i) => (
                      <div key={i} className="flex justify-between items-center bg-secondary/50 p-3 rounded border">
                        <span>{timing}</span>
                        <Button variant="destructive" size="sm" onClick={() => handleRemoveTiming(timing)}>Remove</Button>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-muted-foreground">
                      <Settings className="mx-auto mb-4 h-8 w-8 opacity-50" />
                      <p>You haven't set any free session blocks yet.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="earnings">
            <Card>
              <CardHeader><CardTitle>Earnings Overview</CardTitle></CardHeader>
              <CardContent>
                <div className="py-12 text-center text-muted-foreground">
                  <DollarSign className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>No earnings recorded yet.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader><CardTitle>Profile Settings</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4 max-w-md">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium text-foreground">{name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium text-foreground">{String(user?.email || "")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Approval Status</p>
                    {loading ? (
                      <Badge variant="secondary">Loading...</Badge>
                    ) : (
                      <Badge variant={tutorProfile?.status === 'approved' ? 'default' : 'secondary'} className={tutorProfile?.status === 'approved' ? 'bg-green-600' : ''}>
                        {tutorProfile?.status ? tutorProfile.status.charAt(0).toUpperCase() + tutorProfile.status.slice(1) : "Unknown"}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default TutorDashboard;
