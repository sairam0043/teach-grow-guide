import { useEffect, useState } from "react";
import { Users, BookOpen, CreditCard, CheckCircle, XCircle, Clock, Shield, Star, DollarSign, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  const enrolledBookings = bookings.filter((b) => b.status === "enrolled");

  const totalPlatformRevenue = enrolledBookings.reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);

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
      <div className="container py-10 max-w-7xl">
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-foreground tracking-tight">Admin Dashboard</h1>
          <p className="text-lg text-muted-foreground mt-1">Manage platform operations, verify tutors, and track analytics.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          {[
            { icon: Clock, label: "Pending Approvals", value: adminStats?.pendingApprovals || pendingTutors.length, color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/30" },
            { icon: Users, label: "Active Tutors", value: adminStats?.activeTutors || approvedTutors.length, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
            { icon: BookOpen, label: "Total Bookings", value: adminStats?.totalBookings || bookings.length, color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/30" },
            { icon: DollarSign, label: "Total Revenue", value: `₹${totalPlatformRevenue}`, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
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

        <Tabs defaultValue="approvals" className="space-y-8">
          <TabsList className="bg-secondary/50 p-1 rounded-xl shadow-sm border mb-4 h-auto justify-start w-full overflow-x-auto whitespace-nowrap">
            <TabsTrigger value="approvals" className="rounded-lg px-6 py-2.5 shrink-0">Tutor Approvals {pendingTutors.length > 0 && <Badge variant="destructive" className="ml-2 rounded-full px-1.5 py-0.5 text-[10px]">{pendingTutors.length}</Badge>}</TabsTrigger>
            <TabsTrigger value="tutors" className="rounded-lg px-6 py-2.5 shrink-0">All Tutors</TabsTrigger>
            <TabsTrigger value="students" className="rounded-lg px-6 py-2.5 shrink-0">Students</TabsTrigger>
            <TabsTrigger value="bookings" className="rounded-lg px-6 py-2.5 shrink-0">Bookings</TabsTrigger>
            <TabsTrigger value="payments" className="rounded-lg px-6 py-2.5 shrink-0">Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="approvals">
            <Card className="shadow-md border-border/50">
              <CardHeader className="bg-secondary/20 border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2"><Shield className="h-5 w-5 text-orange-500" /> Pending Tutor Approvals</CardTitle>
                <CardDescription>Review and approve new tutor registrations.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {loading ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : pendingTutors.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-secondary/10 rounded-2xl border border-dashed mt-4">
                    <CheckCircle className="mx-auto mb-4 h-16 w-16 opacity-30 text-green-500" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">You're All Caught Up</h3>
                    <p>There are no pending tutor approvals at this time.</p>
                  </div>
                ) : (
                  <div className="rounded-xl border shadow-sm overflow-x-auto mt-4">
                    <Table>
                      <TableHeader className="bg-secondary/50 uppercase text-xs">
                        <TableRow>
                          <TableHead className="font-medium h-12">Name</TableHead>
                          <TableHead className="font-medium h-12">Email</TableHead>
                          <TableHead className="font-medium h-12">Category</TableHead>
                          <TableHead className="font-medium h-12">Subjects</TableHead>
                          <TableHead className="font-medium h-12">City</TableHead>
                          <TableHead className="font-medium h-12">Exp.</TableHead>
                          <TableHead className="font-medium h-12 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingTutors.map((tutor) => (
                          <TableRow key={tutor.id} className="hover:bg-secondary/10 transition-colors">
                            <TableCell className="font-semibold text-foreground">{tutor.name || "–"}</TableCell>
                            <TableCell>{tutor.email || "–"}</TableCell>
                            <TableCell><Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">{tutor.category}</Badge></TableCell>
                            <TableCell className="max-w-[150px] truncate" title={tutor.subjects?.join(", ")}>{tutor.subjects?.join(", ")}</TableCell>
                            <TableCell>{tutor.city || "–"}</TableCell>
                            <TableCell>{tutor.experience} yrs</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApproval(tutor.id, "approved")}>
                                  <CheckCircle className="mr-1 h-4 w-4" /> Approve
                                </Button>
                                <Button size="sm" variant="destructive" className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200" onClick={() => handleApproval(tutor.id, "rejected")}>
                                  <XCircle className="mr-1 h-4 w-4" /> Reject
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tutors">
            <Card className="shadow-md border-border/50">
              <CardHeader className="bg-secondary/20 border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2"><Users className="h-5 w-5 text-blue-500" /> All Approved Tutors</CardTitle>
                <CardDescription>Manage active tutors and their featured status.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {loading ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : approvedTutors.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-secondary/10 rounded-2xl border border-dashed mt-4">
                    <Users className="mx-auto mb-4 h-16 w-16 opacity-30 text-blue-500" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Active Tutors Found</h3>
                    <p>Approve pending tutors to see them here.</p>
                  </div>
                ) : (
                  <div className="rounded-xl border shadow-sm overflow-x-auto mt-4">
                    <Table>
                      <TableHeader className="bg-secondary/50 uppercase text-xs">
                        <TableRow>
                          <TableHead className="font-medium h-12">Name</TableHead>
                          <TableHead className="font-medium h-12">Category</TableHead>
                          <TableHead className="font-medium h-12">Subjects</TableHead>
                          <TableHead className="font-medium h-12">Status</TableHead>
                          <TableHead className="font-medium h-12 text-center">Featured</TableHead>
                          <TableHead className="font-medium h-12 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {approvedTutors.map((tutor) => (
                          <TableRow key={tutor.id} className="hover:bg-secondary/10 transition-colors">
                            <TableCell className="font-semibold text-foreground">{tutor.name || "–"}</TableCell>
                            <TableCell><Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">{tutor.category}</Badge></TableCell>
                            <TableCell className="max-w-[150px] truncate">{tutor.subjects?.join(", ")}</TableCell>
                            <TableCell><Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none">Active</Badge></TableCell>
                            <TableCell className="text-center">
                              {tutor.featured ? <Star className="h-5 w-5 fill-yellow-400 text-yellow-500 mx-auto" /> : <Star className="h-5 w-5 text-muted-foreground opacity-30 mx-auto" />}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant={tutor.featured ? "outline" : "default"} className={tutor.featured ? "border-yellow-500 text-yellow-600 hover:bg-yellow-50" : "shadow-sm"} onClick={() => toggleFeatured(tutor)}>
                                {tutor.featured ? "Remove Featured" : "Make Featured"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students">
            <Card className="shadow-md border-border/50">
              <CardHeader className="bg-secondary/20 border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2"><Users className="h-5 w-5 text-indigo-500" /> Registered Students</CardTitle>
                <CardDescription>View all students on the platform.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {loading ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : students.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-secondary/10 rounded-2xl border border-dashed mt-4">
                    <Users className="mx-auto mb-4 h-16 w-16 opacity-30 text-indigo-500" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Students Found</h3>
                    <p>No students have registered yet.</p>
                  </div>
                ) : (
                  <div className="rounded-xl border shadow-sm overflow-x-auto mt-4">
                    <Table>
                      <TableHeader className="bg-secondary/50 uppercase text-xs">
                        <TableRow>
                          <TableHead className="font-medium h-12">Student ID</TableHead>
                          <TableHead className="font-medium h-12">Full Name</TableHead>
                          <TableHead className="font-medium h-12">Email</TableHead>
                          <TableHead className="font-medium h-12">Contact</TableHead>
                          <TableHead className="font-medium h-12 text-right">Joined</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.map((student) => (
                          <TableRow key={student._id || student.id} className="hover:bg-secondary/10 transition-colors">
                            <TableCell className="font-mono text-xs text-muted-foreground">{String(student._id || student.id).slice(-8)}</TableCell>
                            <TableCell className="font-semibold text-foreground">{student.full_name || "–"}</TableCell>
                            <TableCell>{student.email || "–"}</TableCell>
                            <TableCell>{student.phone || "–"}</TableCell>
                            <TableCell className="text-right">{new Date(student.createdAt).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card className="shadow-md border-border/50">
              <CardHeader className="bg-secondary/20 border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2"><BookOpen className="h-5 w-5 text-purple-500" /> All Platform Bookings</CardTitle>
                <CardDescription>Track both demos and enrolled classes across all users.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {loading ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-secondary/10 rounded-2xl border border-dashed mt-4">
                    <BookOpen className="mx-auto mb-4 h-16 w-16 opacity-30 text-purple-500" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Bookings Yet</h3>
                    <p>There are no active bookings on the platform.</p>
                  </div>
                ) : (
                  <div className="rounded-xl border shadow-sm overflow-x-auto mt-4">
                    <Table>
                      <TableHeader className="bg-secondary/50 uppercase text-xs">
                        <TableRow>
                          <TableHead className="font-medium h-12">Booking ID</TableHead>
                          <TableHead className="font-medium h-12">Tutor Name</TableHead>
                          <TableHead className="font-medium h-12">Student Name</TableHead>
                          <TableHead className="font-medium h-12">Timing</TableHead>
                          <TableHead className="font-medium h-12">Status</TableHead>
                          <TableHead className="font-medium h-12 text-right">Created At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bookings.map((booking) => (
                          <TableRow key={booking._id} className="hover:bg-secondary/10 transition-colors">
                            <TableCell className="font-mono text-xs text-muted-foreground">{String(booking._id).slice(-8)}</TableCell>
                            <TableCell className="font-semibold text-foreground">{booking.tutorName || "Unknown"}</TableCell>
                            <TableCell>{booking.studentName || "Anonymous"}</TableCell>
                            <TableCell className="text-sm">{booking.timing}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`border-none ${
                                booking.status === 'enrolled' ? 'bg-indigo-100 text-indigo-700' :
                                booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                booking.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                'bg-secondary text-secondary-foreground'
                              }`}>
                                {booking.status.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">{new Date(booking.createdAt).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card className="shadow-md border-border/50">
              <CardHeader className="bg-secondary/20 border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2"><Activity className="h-5 w-5 text-emerald-500" /> Platform Payments</CardTitle>
                <CardDescription>Monitor successful transactions and platform revenue.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {loading ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : enrolledBookings.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-secondary/10 rounded-2xl border border-dashed mt-4">
                    <CreditCard className="mx-auto mb-4 h-16 w-16 opacity-30 text-emerald-500" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Payments Recorded</h3>
                    <p>There are no successful course enrollments yet.</p>
                  </div>
                ) : (
                  <div className="rounded-xl border shadow-sm overflow-x-auto mt-4">
                    <Table>
                      <TableHeader className="bg-secondary/50 uppercase text-xs">
                        <TableRow>
                          <TableHead className="font-medium h-12">Date</TableHead>
                          <TableHead className="font-medium h-12">Student</TableHead>
                          <TableHead className="font-medium h-12">Tutor</TableHead>
                          <TableHead className="font-medium h-12">Course Subject</TableHead>
                          <TableHead className="font-medium h-12">Plan</TableHead>
                          <TableHead className="font-medium h-12 text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {enrolledBookings.map((payment) => (
                          <TableRow key={payment._id} className="hover:bg-secondary/10 transition-colors">
                            <TableCell>{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell className="font-semibold text-foreground">{payment.studentName}</TableCell>
                            <TableCell>{payment.tutorName}</TableCell>
                            <TableCell>{payment.subject}</TableCell>
                            <TableCell><Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">{payment.planType}</Badge></TableCell>
                            <TableCell className="text-right font-bold text-emerald-600 text-lg">₹{payment.amountPaid}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default AdminDashboard;
