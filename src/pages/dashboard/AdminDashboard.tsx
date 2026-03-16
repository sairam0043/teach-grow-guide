import { useEffect, useState } from "react";
import { Users, BookOpen, CreditCard, CheckCircle, XCircle, Clock, Shield, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PageLayout from "@/components/layout/PageLayout";
import { toast } from "sonner";
import { useSelector, useDispatch } from "react-redux";
import { fetchAdminStats } from "@/redux/slices/dashboardSlice";
import { RootState, AppDispatch } from "@/redux/store";
import axios from "axios";
import API_URL from "@/config/api";

const AdminDashboard = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { adminStats, loading: statsLoading } = useSelector((state: RootState) => state.dashboard);
  const [tutors, setTutors] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTutors = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/tutors`);
      setTutors(res.data);
      // Fetch students separately via a dedicated new endpoint or auth filtering route
      const studentRes = await axios.get(`${API_URL}/dashboard/admin/students`);
      setStudents(studentRes.data);
      // Fetch bookings separately
      const bookingsRes = await axios.get(`${API_URL}/dashboard/admin/bookings`);
      setBookings(bookingsRes.data);
    } catch (err) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTutors();
    dispatch(fetchAdminStats());
  }, [dispatch]);

  const pendingTutors = tutors.filter((t) => t.status === "pending");
  const approvedTutors = tutors.filter((t) => t.status === "approved");

  const handleApproval = async (tutorId: string, status: "approved" | "rejected") => {
    try {
      await axios.put(`${API_URL}/tutors/${tutorId}/admin`, { status });
      toast.success(`Tutor ${status} successfully!`);
      fetchTutors();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const toggleFeatured = async (tutor: any) => {
    try {
      await axios.put(`${API_URL}/tutors/${tutor.id}/admin`, { featured: !tutor.featured });
      toast.success(tutor.featured ? "Removed from featured" : "Added to featured");
      fetchTutors();
    } catch (err) {
      toast.error("Failed to update featured status");
    }
  };

  return (
    <PageLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage the Cuvasol Tutor platform</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {[
            { icon: Clock, label: "Pending Approvals", value: adminStats?.pendingApprovals || 0 },
            { icon: Users, label: "Active Tutors", value: adminStats?.activeTutors || 0 },
            { icon: BookOpen, label: "Total Bookings", value: adminStats?.totalBookings || 0 },
            { icon: CreditCard, label: "Total Revenue", value: `₹${adminStats?.totalRevenue || 0}` },
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
                      {stat.value}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="approvals" className="space-y-6">
          <TabsList>
            <TabsTrigger value="approvals">Tutor Approvals</TabsTrigger>
            <TabsTrigger value="tutors">All Tutors</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
          </TabsList>

          <TabsContent value="approvals">
            <Card>
              <CardHeader><CardTitle>Pending Tutor Approvals</CardTitle></CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : pendingTutors.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <CheckCircle className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p>No pending approvals</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Subjects</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Experience</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingTutors.map((tutor) => (
                        <TableRow key={tutor.id}>
                          <TableCell className="font-medium">{tutor.name || "–"}</TableCell>
                          <TableCell>{tutor.email || "–"}</TableCell>
                          <TableCell><Badge variant="secondary">{tutor.category}</Badge></TableCell>
                          <TableCell>{tutor.subjects?.join(", ")}</TableCell>
                          <TableCell>{tutor.city || "–"}</TableCell>
                          <TableCell>{tutor.experience} yrs</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleApproval(tutor.id, "approved")}>
                                <CheckCircle className="mr-1 h-4 w-4" /> Approve
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleApproval(tutor.id, "rejected")}>
                                <XCircle className="mr-1 h-4 w-4" /> Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tutors">
            <Card>
              <CardHeader><CardTitle>All Tutors</CardTitle></CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : approvedTutors.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Users className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p>No active tutors found.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Subjects</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Featured</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedTutors.map((tutor) => (
                        <TableRow key={tutor.id}>
                          <TableCell className="font-medium">{tutor.name || "–"}</TableCell>
                          <TableCell><Badge variant="secondary">{tutor.category}</Badge></TableCell>
                          <TableCell>{tutor.subjects?.join(", ")}</TableCell>
                          <TableCell><Badge variant="outline" className="text-green-600 border-green-600">Active</Badge></TableCell>
                          <TableCell>
                            {tutor.featured ? <Star className="h-5 w-5 fill-yellow-400 text-yellow-500" /> : <Star className="h-5 w-5 text-muted-foreground opacity-50" />}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant={tutor.featured ? "destructive" : "default"} onClick={() => toggleFeatured(tutor)}>
                              {tutor.featured ? "Remove Featured" : "Set Featured"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students">
            <Card>
              <CardHeader><CardTitle>All Enrolled Students</CardTitle></CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : students.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Users className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p>No students found.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>System ID</TableHead>
                        <TableHead>Full Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow key={student._id || student.id}>
                          <TableCell className="font-mono text-xs">{student._id || student.id}</TableCell>
                          <TableCell className="font-medium">{student.full_name || "–"}</TableCell>
                          <TableCell>{student.email || "–"}</TableCell>
                          <TableCell>{student.phone || "–"}</TableCell>
                          <TableCell>{new Date(student.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card>
              <CardHeader><CardTitle>All Platform Bookings</CardTitle></CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <BookOpen className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p>No bookings found on the platform yet.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Booking ID</TableHead>
                        <TableHead>Tutor Name</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Timing</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings.map((booking) => (
                        <TableRow key={booking._id}>
                          <TableCell className="font-mono text-xs">{String(booking._id).slice(-6)}</TableCell>
                          <TableCell className="font-medium">{booking.tutorName || "Unknown"}</TableCell>
                          <TableCell>{booking.studentName || "Anonymous"}</TableCell>
                          <TableCell>{booking.timing}</TableCell>
                          <TableCell>
                            <Badge variant={booking.status === 'confirmed' ? "default" : "destructive"} className={booking.status === 'confirmed' ? 'bg-green-600' : ''}>
                              {booking.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(booking.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader><CardTitle>Payment Monitoring</CardTitle></CardHeader>
              <CardContent>
                <div className="py-12 text-center text-muted-foreground">
                  <CreditCard className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>Payment monitoring coming in the next phase.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing">
            <Card>
              <CardHeader><CardTitle>Pricing Configuration</CardTitle></CardHeader>
              <CardContent>
                <div className="py-12 text-center text-muted-foreground">
                  <Shield className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>Pricing tier management coming in the next phase.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default AdminDashboard;
