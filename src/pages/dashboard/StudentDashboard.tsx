import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Calendar, BookOpen, CreditCard, User, Search, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import PageLayout from "@/components/layout/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useSelector, useDispatch } from "react-redux";
import { fetchStudentStats } from "@/redux/slices/dashboardSlice";
import { RootState, AppDispatch } from "@/redux/store";
import API_URL from "@/config/api";

const StudentDashboard = () => {
  const { user } = useAuth();
  const name = String(user?.user_metadata?.full_name || "Student");
  
  const dispatch = useDispatch<AppDispatch>();
  const { studentStats, loading: statsLoading } = useSelector((state: RootState) => state.dashboard);

  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

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
      setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status } : b));
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <PageLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Welcome, {name}!</h1>
          <p className="text-muted-foreground">Manage your classes, demos, and payments</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {[
            { icon: Calendar, label: "Upcoming Classes", value: studentStats?.upcomingClasses || 0 },
            { icon: Clock, label: "Demo Bookings", value: studentStats?.completedSessions || 0 }, // mapped
            { icon: BookOpen, label: "Enrolled Courses", value: studentStats?.enrolledCourses || 0 }, // mapped
            { icon: CreditCard, label: "Saved Tutors", value: studentStats?.savedTutors || 0 }, // mapped
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

        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming Classes</TabsTrigger>
            <TabsTrigger value="demos">Demo Bookings</TabsTrigger>
            <TabsTrigger value="payments">Payment History</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            <Card>
              <CardHeader><CardTitle>Upcoming Classes</CardTitle></CardHeader>
              <CardContent>
                <div className="py-12 text-center text-muted-foreground">
                  <Calendar className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>No upcoming classes yet.</p>
                  <Button asChild className="mt-4"><Link to="/tutors">Browse Tutors</Link></Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="demos">
            <Card>
              <CardHeader><CardTitle>My Demo Bookings</CardTitle></CardHeader>
              <CardContent>
                {loadingBookings ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Clock className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p>No demo bookings yet. Book a demo with a tutor to get started!</p>
                    <Button asChild className="mt-4"><Link to="/tutors">Find a Tutor</Link></Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking: any) => (
                      <div key={booking._id} className="flex justify-between items-center bg-secondary p-4 rounded-lg border">
                        <div>
                          <p className="font-semibold text-foreground">Tutor: {booking.tutorName}</p>
                          {booking.subject && <p className="text-sm text-primary mb-1">Subject: {booking.subject}</p>}
                          <p className="text-sm text-muted-foreground">Timing: {booking.timing}</p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <div>
                            <p className={`text-sm font-medium ${
                              booking.status === 'confirmed' ? 'text-green-600' :
                              booking.status === 'completed' ? 'text-blue-600' :
                              booking.status === 'enrolled' ? 'text-primary' :
                              'text-red-600'
                            }`}>
                              {booking.status.toUpperCase()}
                            </p>
                            <p className="text-xs text-muted-foreground">{new Date(booking.createdAt).toLocaleDateString()}</p>
                          </div>
                          {booking.status === 'confirmed' && (
                             <Button size="sm" variant="outline" className="text-red-500 border-red-500 hover:bg-red-50" onClick={() => handleBookingAction(booking._id, 'cancelled')}>Cancel</Button>
                          )}
                          {booking.status === 'completed' && (
                              <Button asChild size="sm" className="bg-gradient-to-r from-primary to-blue-600 shadow-md">
                                <Link to={`/tutors/${booking.tutorId}`}>Pay & Book Course</Link>
                              </Button>
                          )}
                          {booking.status === 'enrolled' && (
                            <p className="text-xs font-semibold text-primary">{booking.planType}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
              <CardContent>
                <div className="py-12 text-center text-muted-foreground">
                  <CreditCard className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>No payment records yet.</p>
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default StudentDashboard;
