import { useEffect, useState, Fragment } from "react";
import { Users, BookOpen, CreditCard, CheckCircle, XCircle, Clock, Shield, Star, DollarSign, Activity, Trash2, ChevronDown, ChevronUp, Calendar, History, Percent, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PageLayout from "@/components/layout/PageLayout";
import { toast } from "@/components/ui/sonner";
import { useSelector, useDispatch } from "react-redux";
import { fetchAdminStats } from "@/redux/slices/dashboardSlice";
import { RootState, AppDispatch } from "@/redux/store";
import axios from "axios";
import API_URL from "@/config/api";
import { resolveAssetUrl } from "@/lib/assetUrl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const AdminDashboard = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { adminStats, loading: statsLoading } = useSelector((state: RootState) => state.dashboard);
  const [tutors, setTutors] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const [expandedTutorId, setExpandedTutorId] = useState<string | null>(null);
  const [selectedPayoutSubject, setSelectedPayoutSubject] = useState<Record<string, string>>({});
  const [coursePayments, setCoursePayments] = useState<any[]>([]);
  const [loadingCoursePayments, setLoadingCoursePayments] = useState(false);
  const [selectedTutorForDetail, setSelectedTutorForDetail] = useState<any | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const handleViewTutorDetail = (tutor: any) => {
    setSelectedTutorForDetail(tutor);
    setIsDetailDialogOpen(true);
  };

  const fetchPayouts = async () => {
    try {
      setLoadingPayouts(true);
      const res = await axios.get(`${API_URL}/dashboard/admin/payouts`);
      setPayouts(res.data);
    } catch (err) {
      toast.error("Failed to load payout calculations");
    } finally {
      setLoadingPayouts(false);
    }
  };

  const fetchCoursePayments = async () => {
    try {
      setLoadingCoursePayments(true);
      const res = await axios.get(`${API_URL}/dashboard/admin/course-payments`);
      setCoursePayments(res.data);
    } catch (err) {
      toast.error("Failed to load platform course payments");
    } finally {
      setLoadingCoursePayments(false);
    }
  };

  const fetchTutors = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/tutors`);
      setTutors(res.data);
      const studentRes = await axios.get(`${API_URL}/dashboard/admin/students`);
      setStudents(studentRes.data);
      const bookingsRes = await axios.get(`${API_URL}/dashboard/admin/bookings`);
      setBookings(bookingsRes.data);
      await fetchPayouts();
      await fetchCoursePayments();
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
  const enrolledBookings = bookings.filter((b) => (b.status === "enrolled" || b.status === "completed") && (b.amountPaid || 0) > 0);

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

  const handleDeleteTutor = async (tutorId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete tutor "${name}" and their associated user login account? This action cannot be undone.`)) {
      return;
    }
    try {
      await axios.delete(`${API_URL}/tutors/${tutorId}/admin`);
      toast.success(`Tutor "${name}" deleted successfully.`);
      fetchTutors();
    } catch (err) {
      toast.error("Failed to delete tutor account");
    }
  };

  const handleShortlist = async (coursePaymentId: string) => {
    try {
      toast.loading("Shortlisting student and sending email invitation...");
      const res = await axios.post(`${API_URL}/payments/shortlist-student`, { coursePaymentId });
      toast.dismiss();
      toast.success(res.data.message || "Student shortlisted successfully!");
      fetchCoursePayments();
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.response?.data?.message || "Failed to shortlist student");
    }
  };

  return (
    <PageLayout>
      <div className="container py-10 max-w-7xl">
        <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">Admin Dashboard</h1>
            <p className="text-base text-muted-foreground mt-1.5">Manage platform operations, verify tutor credentials, and track ledger analytics.</p>
          </div>
          <Button 
            onClick={fetchTutors} 
            disabled={loading} 
            variant="outline" 
            className="h-10 w-fit shrink-0 self-start md:self-center gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all duration-300 rounded-lg shadow-sm"
          >
            <Activity className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Platform Data
          </Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          {[
            { icon: Clock, label: "Pending Approvals", value: adminStats?.pendingApprovals || pendingTutors.length, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-900/20" },
            { icon: Users, label: "Active Tutors", value: adminStats?.activeTutors || approvedTutors.length, color: "text-sky-500", bg: "bg-sky-50 dark:bg-sky-950/20 border border-sky-200/40 dark:border-sky-900/20" },
            { icon: BookOpen, label: "Total Bookings", value: adminStats?.totalBookings || bookings.length, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950/20 border border-violet-200/40 dark:border-violet-900/20" },
            { icon: DollarSign, label: "Total Revenue", value: `₹${totalPlatformRevenue}`, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/40 dark:border-emerald-900/20" },
          ].map((stat) => (
            <Card key={stat.label} className="border border-border/50 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-card/60 backdrop-blur-md">
              <CardContent className="flex items-center gap-5 p-6">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${stat.bg}`}>
                  <stat.icon className={`h-7 w-7 ${stat.color}`} />
                </div>
                <div>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16 mb-1" />
                  ) : (
                    <p className="text-3xl font-extrabold text-foreground tracking-tight">
                      {String(stat.value)}
                    </p>
                  )}
                  <p className="text-sm font-medium text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="approvals" className="space-y-8">
          <TabsList className="bg-secondary/40 p-1 rounded-xl shadow-sm border mb-4 h-auto justify-start w-full overflow-x-auto whitespace-nowrap">
            <TabsTrigger value="approvals" className="rounded-lg px-6 py-2.5 shrink-0 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              Tutor Approvals 
              {pendingTutors.length > 0 && (
                <Badge variant="destructive" className="ml-2 rounded-full px-2 py-0.5 text-[10px] bg-rose-500 text-white font-extrabold border-none">
                  {pendingTutors.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tutors" className="rounded-lg px-6 py-2.5 shrink-0 data-[state=active]:bg-card data-[state=active]:shadow-sm">All Tutors</TabsTrigger>
            <TabsTrigger value="students" className="rounded-lg px-6 py-2.5 shrink-0 data-[state=active]:bg-card data-[state=active]:shadow-sm">Students</TabsTrigger>
            <TabsTrigger value="bookings" className="rounded-lg px-6 py-2.5 shrink-0 data-[state=active]:bg-card data-[state=active]:shadow-sm">Bookings</TabsTrigger>
            <TabsTrigger value="payments" className="rounded-lg px-6 py-2.5 shrink-0 data-[state=active]:bg-card data-[state=active]:shadow-sm">Payments</TabsTrigger>
            <TabsTrigger value="platform-courses" className="rounded-lg px-6 py-2.5 shrink-0 data-[state=active]:bg-card data-[state=active]:shadow-sm">Platform Courses</TabsTrigger>
            <TabsTrigger value="payouts" className="rounded-lg px-6 py-2.5 shrink-0 data-[state=active]:bg-card data-[state=active]:shadow-sm">Tutor Payouts</TabsTrigger>
          </TabsList>

          <TabsContent value="approvals">
            <Card className="shadow-lg border border-border/50 bg-card/60 backdrop-blur-md overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2 font-bold text-foreground">
                  <Shield className="h-5 w-5 text-amber-500" /> Pending Tutor Approvals
                </CardTitle>
                <CardDescription>Review credentials and approve applications of newly registered tutors.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {loading ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-12 w-full rounded-lg" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                  </div>
                ) : pendingTutors.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-secondary/5 rounded-2xl border border-dashed border-border/70 mt-4 max-w-lg mx-auto">
                    <CheckCircle className="mx-auto mb-4 h-16 w-16 opacity-30 text-emerald-500" />
                    <h3 className="text-lg font-bold text-foreground mb-1">You're All Caught Up</h3>
                    <p className="text-sm">There are no pending tutor approvals at this time.</p>
                  </div>
                ) : (
                  <div className="rounded-xl border shadow-sm overflow-hidden bg-card mt-4">
                    <Table>
                      <TableHeader className="bg-secondary/30 uppercase text-[10px] tracking-wider text-muted-foreground font-bold border-b border-border/40">
                        <TableRow>
                          <TableHead className="font-bold h-12">Tutor Profile</TableHead>
                          <TableHead className="font-bold h-12">Email</TableHead>
                          <TableHead className="font-bold h-12">Category</TableHead>
                          <TableHead className="font-bold h-12">Subjects</TableHead>
                          <TableHead className="font-bold h-12">Experience</TableHead>
                          <TableHead className="font-bold h-12">KYC Document</TableHead>
                          <TableHead className="font-bold h-12 text-right px-6">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingTutors.map((tutor) => (
                          <TableRow key={tutor.id} className="hover:bg-secondary/10 transition-colors border-b border-border/40">
                            <TableCell className="py-3 cursor-pointer hover:bg-secondary/20 transition-all rounded-l-lg" onClick={() => handleViewTutorDetail(tutor)} title="Click to view full tutor details">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full border border-primary/10 shadow-sm overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                                  {tutor.photo || tutor.avatar ? (
                                    <img 
                                      src={resolveAssetUrl(tutor.photo || tutor.avatar)} 
                                      alt={tutor.name} 
                                      className="h-full w-full object-cover" 
                                      onError={(e: any) => {
                                        e.target.onerror = null;
                                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.name || "T")}&background=random`;
                                      }}
                                    />
                                  ) : (
                                    <span className="font-bold text-sm text-primary uppercase">
                                      {(tutor.name || "T").charAt(0)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-foreground leading-tight text-sm">{tutor.name || "–"}</span>
                                  <span className="text-[11px] text-muted-foreground mt-0.5">{tutor.city || "Remote"}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium text-foreground text-sm">{tutor.email || "–"}</TableCell>
                            <TableCell><Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs font-semibold">{tutor.category}</Badge></TableCell>
                            <TableCell className="max-w-[160px] truncate text-sm" title={tutor.subjects?.join(", ")}>{tutor.subjects?.join(", ")}</TableCell>
                            <TableCell className="text-sm font-medium">{tutor.experience} yrs</TableCell>
                            <TableCell>
                              {tutor.verificationDocument ? (
                                <a 
                                  href={resolveAssetUrl(tutor.verificationDocument)} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:hover:bg-indigo-950/50 py-1.5 px-3 rounded-lg border border-indigo-100 dark:border-indigo-900/20 inline-flex items-center gap-1 transition-all"
                                >
                                  📄 View KYC Document
                                </a>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">No document</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right px-6 py-3">
                              <div className="flex justify-end gap-2.5">
                                <Button 
                                  size="sm" 
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-0.5 rounded-lg h-9 px-3" 
                                  onClick={() => handleApproval(tutor.id, "approved")}
                                >
                                  <CheckCircle className="mr-1.5 h-4 w-4" /> Approve
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/20 rounded-lg h-9 px-3 transition-all duration-200" 
                                  onClick={() => handleApproval(tutor.id, "rejected")}
                                >
                                  <XCircle className="mr-1.5 h-4 w-4" /> Reject
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 rounded-lg h-9 px-3 transition-all duration-200" 
                                  onClick={() => handleDeleteTutor(tutor.id, tutor.name)}
                                >
                                  <Trash2 className="mr-1.5 h-4 w-4" /> Delete
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
            <Card className="shadow-lg border border-border/50 bg-card/60 backdrop-blur-md overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2 font-bold text-foreground">
                  <Users className="h-5 w-5 text-blue-500" /> All Approved Tutors
                </CardTitle>
                <CardDescription>Manage active tutors and customize their homepage featured status.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {loading ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-12 w-full rounded-lg" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                  </div>
                ) : approvedTutors.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-secondary/5 rounded-2xl border border-dashed border-border/70 mt-4 max-w-lg mx-auto">
                    <Users className="mx-auto mb-4 h-16 w-16 opacity-30 text-blue-500" />
                    <h3 className="text-lg font-bold text-foreground mb-1">No Active Tutors Found</h3>
                    <p className="text-sm">Tutor profiles will appear here once approved.</p>
                  </div>
                ) : (
                  <div className="rounded-xl border shadow-sm overflow-hidden bg-card mt-4">
                    <Table>
                      <TableHeader className="bg-secondary/30 uppercase text-[10px] tracking-wider text-muted-foreground font-bold border-b border-border/40">
                        <TableRow>
                          <TableHead className="font-bold h-12">Tutor Profile</TableHead>
                          <TableHead className="font-bold h-12">Category</TableHead>
                          <TableHead className="font-bold h-12">Subjects</TableHead>
                          <TableHead className="font-bold h-12">Status</TableHead>
                          <TableHead className="font-bold h-12">KYC Document</TableHead>
                          <TableHead className="font-bold h-12 text-center">Featured</TableHead>
                          <TableHead className="font-bold h-12 text-right px-6">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {approvedTutors.map((tutor) => (
                          <TableRow key={tutor.id} className="hover:bg-secondary/10 transition-colors border-b border-border/40">
                            <TableCell className="py-3 cursor-pointer hover:bg-secondary/20 transition-all rounded-l-lg" onClick={() => handleViewTutorDetail(tutor)} title="Click to view full tutor details">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full border border-primary/10 shadow-sm overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                                  {tutor.photo || tutor.avatar ? (
                                    <img 
                                      src={resolveAssetUrl(tutor.photo || tutor.avatar)} 
                                      alt={tutor.name} 
                                      className="h-full w-full object-cover" 
                                      onError={(e: any) => {
                                        e.target.onerror = null;
                                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.name || "T")}&background=random`;
                                      }}
                                    />
                                  ) : (
                                    <span className="font-bold text-sm text-primary uppercase">
                                      {(tutor.name || "T").charAt(0)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-foreground leading-tight text-sm">{tutor.name || "–"}</span>
                                  <span className="text-[11px] text-muted-foreground mt-0.5">{tutor.city || "Remote"}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell><Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs font-semibold">{tutor.category}</Badge></TableCell>
                            <TableCell className="max-w-[160px] truncate text-sm">{tutor.subjects?.join(", ")}</TableCell>
                            <TableCell>
                              <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/30 text-xs font-semibold">Active</Badge>
                            </TableCell>
                            <TableCell>
                              {tutor.verificationDocument ? (
                                <a 
                                  href={resolveAssetUrl(tutor.verificationDocument)} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:hover:bg-indigo-950/50 py-1.5 px-3 rounded-lg border border-indigo-100 dark:border-indigo-900/20 inline-flex items-center gap-1 transition-all"
                                >
                                  📄 View KYC
                                </a>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">No document</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {tutor.featured ? (
                                <Star className="h-5 w-5 fill-amber-400 text-amber-500 mx-auto drop-shadow-sm filter animate-wiggle" />
                              ) : (
                                <Star className="h-5 w-5 text-muted-foreground opacity-30 mx-auto" />
                              )}
                            </TableCell>
                            <TableCell className="text-right px-6 py-3">
                              <div className="flex justify-end gap-2.5">
                                <Button 
                                  size="sm" 
                                  variant={tutor.featured ? "outline" : "default"} 
                                  className={`rounded-lg h-9 px-3 transition-all duration-300 hover:-translate-y-0.5 ${
                                    tutor.featured 
                                      ? "border-amber-500/50 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20" 
                                      : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-indigo-500/20"
                                  }`} 
                                  onClick={() => toggleFeatured(tutor)}
                                >
                                  {tutor.featured ? "Remove Featured" : "Make Featured"}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 rounded-lg h-9 px-3 transition-all duration-200" 
                                  onClick={() => handleDeleteTutor(tutor.id, tutor.name)}
                                >
                                  <Trash2 className="h-4 w-4" />
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

          <TabsContent value="platform-courses">
            <Card className="shadow-lg border border-border/50 bg-card/60 backdrop-blur-md overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-teal-500/10 via-teal-500/5 to-transparent border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2 font-bold text-foreground">
                  <Sparkles className="h-5 w-5 text-teal-600" /> Platform Direct Courses Ledger
                </CardTitle>
                <CardDescription>Monitor direct course payments and assessment registrations separate from tutor payouts.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                
                {/* Course stats block */}
                {(() => {
                  const completedPayments = coursePayments.filter(p => p.status === 'completed');
                  const totalCourseCollected = completedPayments.reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);
                  const assessmentsCount = completedPayments.filter(p => p.purchaseType === 'assessment').length;
                  const fullCourseCount = completedPayments.filter(p => p.purchaseType === 'full_course').length;

                  return (
                    <div className="grid gap-4 sm:grid-cols-3 bg-teal-500/5 p-4 rounded-xl border border-teal-500/10 mb-2">
                      <div className="text-center p-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Total Course Revenue</span>
                        <span className="text-2xl font-extrabold text-teal-600 mt-1 block">₹{totalCourseCollected}</span>
                      </div>
                      <div className="text-center p-2 border-x border-border/40">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Assessments Registered</span>
                        <span className="text-2xl font-extrabold text-foreground mt-1 block">{assessmentsCount}</span>
                      </div>
                      <div className="text-center p-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Full Course Enrollments</span>
                        <span className="text-2xl font-extrabold text-indigo-600 mt-1 block">{fullCourseCount}</span>
                      </div>
                    </div>
                  );
                })()}

                {loadingCoursePayments ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                ) : coursePayments.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-secondary/5 rounded-2xl border border-dashed border-border/70 mt-4 max-w-lg mx-auto">
                    <CreditCard className="mx-auto mb-4 h-16 w-16 opacity-30 text-teal-600" />
                    <h3 className="text-lg font-bold text-foreground mb-1">No Course Purchases Yet</h3>
                    <p className="text-sm">Direct platform course transactions will appear here once student checkouts are recorded.</p>
                  </div>
                ) : (
                  <div className="rounded-xl border shadow-sm overflow-hidden bg-card mt-4">
                    <Table>
                      <TableHeader className="bg-secondary/30 uppercase text-[10px] tracking-wider text-muted-foreground font-bold border-b border-border/40">
                        <TableRow>
                          <TableHead className="font-bold h-12">Date</TableHead>
                          <TableHead className="font-bold h-12">Student Name</TableHead>
                          <TableHead className="font-bold h-12">Email</TableHead>
                          <TableHead className="font-bold h-12">Purchase Type</TableHead>
                          <TableHead className="font-bold h-12">Payment Status</TableHead>
                          <TableHead className="font-bold h-12 text-right">Amount</TableHead>
                          <TableHead className="font-bold h-12 text-right px-6">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {coursePayments.map((payment) => (
                          <TableRow key={payment._id} className="hover:bg-secondary/10 transition-colors border-b border-border/40">
                            <TableCell className="text-sm">{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell className="font-semibold text-foreground text-sm">{payment.studentName}</TableCell>
                            <TableCell className="text-sm">{payment.studentEmail}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`font-bold ${
                                payment.purchaseType === 'full_course' 
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                  : 'bg-teal-50 border-teal-200 text-teal-700'
                              }`}>
                                {payment.purchaseType === 'full_course' ? 'Full Course' : 'Assessment'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={`font-bold border-none ${
                                payment.status === 'completed' 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : payment.status === 'failed'
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-secondary text-secondary-foreground'
                              }`}>
                                {payment.status.toUpperCase().replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-extrabold text-foreground text-sm">₹{payment.amountPaid}</TableCell>
                            <TableCell className="text-right px-6">
                              {payment.purchaseType === 'assessment' && payment.status === 'completed' && (
                                payment.shortlisted ? (
                                  <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold border-none text-xs px-2.5 py-1">
                                    Shortlisted
                                  </Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => handleShortlist(payment._id)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 rounded-lg"
                                  >
                                    Shortlist Student
                                  </Button>
                                )
                              )}
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

          <TabsContent value="payouts">
            <Card className="shadow-lg border border-border/50 bg-card/60 backdrop-blur-md overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2 font-bold text-foreground">
                  <CreditCard className="h-5 w-5 text-emerald-500" /> Tutor Payouts & Ledger Audit
                </CardTitle>
                <CardDescription>Track tutor hourly rate changes, completed sessions, and calculated payouts (gross vs net payouts minus 10% platform commission).</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {loadingPayouts ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-12 w-full rounded-lg" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                  </div>
                ) : payouts.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-secondary/5 rounded-2xl border border-dashed border-border/70 mt-4 max-w-lg mx-auto">
                    <CreditCard className="mx-auto mb-4 h-16 w-16 opacity-30 text-emerald-500" />
                    <h3 className="text-lg font-bold text-foreground mb-1">No Payout Data</h3>
                    <p className="text-sm">There are no tutor sessions recorded for payout calculations yet.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Overall Summary Row */}
                    <div className="grid gap-4 sm:grid-cols-3 bg-secondary/10 p-4 rounded-xl border border-border/40 mb-4">
                      <div className="text-center p-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Total Collected (Gross)</span>
                        <span className="text-2xl font-extrabold text-foreground mt-1 block">₹{payouts.reduce((acc, curr) => acc + curr.totalCollected, 0)}</span>
                      </div>
                      <div className="text-center p-2 border-x border-border/40">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Platform Commission (10%)</span>
                        <span className="text-2xl font-extrabold text-emerald-600 mt-1 block">₹{payouts.reduce((acc, curr) => acc + curr.totalCommission, 0)}</span>
                      </div>
                      <div className="text-center p-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Total Tutor Payouts (90%)</span>
                        <span className="text-2xl font-extrabold text-indigo-500 mt-1 block">₹{payouts.reduce((acc, curr) => acc + curr.totalPayout, 0)}</span>
                      </div>
                    </div>

                    <div className="rounded-xl border shadow-sm overflow-hidden bg-card mt-4">
                      <Table>
                        <TableHeader className="bg-secondary/30 uppercase text-[10px] tracking-wider text-muted-foreground font-bold border-b border-border/40">
                          <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead className="font-bold h-12">Tutor Profile</TableHead>
                            <TableHead className="font-bold h-12">Contact Info</TableHead>
                            <TableHead className="font-bold h-12 text-center">Completed Sessions</TableHead>
                            <TableHead className="font-bold h-12 text-right">Gross Collected</TableHead>
                            <TableHead className="font-bold h-12 text-right">Commission (10%)</TableHead>
                            <TableHead className="font-bold h-12 text-right">Net Payout (90%)</TableHead>
                            <TableHead className="font-bold h-12 text-right px-6">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payouts.map((tutorPayout) => {
                            const isExpanded = expandedTutorId === tutorPayout.tutorId;
                            return (
                              <Fragment key={tutorPayout.tutorId}>
                                <TableRow className="hover:bg-secondary/5 transition-colors border-b border-border/40">
                                  <TableCell className="text-center">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0"
                                      onClick={() => setExpandedTutorId(isExpanded ? null : tutorPayout.tutorId)}
                                    >
                                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </Button>
                                  </TableCell>
                                  <TableCell className="font-semibold text-foreground">{tutorPayout.tutorName}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    <div>{tutorPayout.email}</div>
                                    <div>{tutorPayout.phone}</div>
                                  </TableCell>
                                  <TableCell className="text-center font-bold text-sm">{tutorPayout.totalCompletedSessions}</TableCell>
                                  <TableCell className="text-right font-medium">₹{tutorPayout.totalCollected}</TableCell>
                                  <TableCell className="text-right font-medium text-emerald-600">₹{tutorPayout.totalCommission}</TableCell>
                                  <TableCell className="text-right font-bold text-indigo-500">₹{tutorPayout.totalPayout}</TableCell>
                                  <TableCell className="text-right px-6">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setExpandedTutorId(isExpanded ? null : tutorPayout.tutorId)}
                                      className="font-semibold h-8"
                                    >
                                      {isExpanded ? "Hide Logs" : "Audit Details"}
                                    </Button>
                                  </TableCell>
                                </TableRow>

                                {isExpanded && (
                                  <TableRow className="bg-secondary/10 hover:bg-secondary/10">
                                    <TableCell colSpan={8} className="p-6">
                                      <div className="space-y-6">
                                        <h4 className="font-extrabold text-sm uppercase tracking-wider text-muted-foreground border-b pb-2 flex items-center gap-1.5">
                                          <History className="h-4 w-4 text-primary" /> Pricing Period Payout Log & Class Timeline
                                        </h4>

                                        {(() => {
                                          const subjectsInPeriods = Array.from(new Set(tutorPayout.pricingPeriods.map((p: any) => p.subject).filter(Boolean)));
                                          const activeSubject = selectedPayoutSubject[tutorPayout.tutorId] || subjectsInPeriods[0] || "";
                                          const filteredPeriods = tutorPayout.pricingPeriods.filter((p: any) => p.subject === activeSubject);

                                          return (
                                            <>
                                              {subjectsInPeriods.length > 1 && (
                                                <div className="flex flex-wrap gap-2 mb-4 bg-background p-2 px-3 rounded-lg border border-border/45 w-fit items-center">
                                                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mr-1">Filter Subject:</span>
                                                  {subjectsInPeriods.map((sub: any) => (
                                                    <button
                                                      key={sub}
                                                      onClick={() => setSelectedPayoutSubject(prev => ({ ...prev, [tutorPayout.tutorId]: sub }))}
                                                      className={`px-3 py-1 text-xs font-bold rounded-full transition-all duration-200 border ${
                                                        activeSubject === sub 
                                                          ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                                                          : "bg-secondary text-muted-foreground hover:bg-secondary/80 border-transparent"
                                                      }`}
                                                    >
                                                      {sub}
                                                    </button>
                                                  ))}
                                                </div>
                                              )}

                                              {filteredPeriods.length === 0 ? (
                                                <p className="text-xs text-muted-foreground italic p-2 bg-background rounded-lg border border-dashed text-center">
                                                  No payout history recorded for this subject.
                                                </p>
                                              ) : (
                                                filteredPeriods.map((period: any, pIdx: number) => {
                                                  const fromDate = new Date(period.effectiveFrom).toLocaleDateString();
                                                  const toDate = period.effectiveTo ? new Date(period.effectiveTo).toLocaleDateString() : "Current Rate";
                                                  return (
                                                    <div key={pIdx} className="bg-card p-4 rounded-xl border shadow-sm space-y-3">
                                                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-2 border-border/40 gap-2">
                                                        <div className="flex items-center gap-2">
                                                          <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none font-bold">
                                                            Rate: ₹{period.rate}/hr
                                                          </Badge>
                                                          {period.subject && (
                                                            <Badge variant="outline" className="font-bold border-indigo-200 text-indigo-600 bg-indigo-50/50">
                                                              {period.subject}
                                                            </Badge>
                                                          )}
                                                          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                                                            <Calendar className="h-3.5 w-3.5" /> Effective Period: {fromDate} – {toDate}
                                                          </span>
                                                        </div>
                                                        <div className="flex gap-4 text-xs font-bold text-muted-foreground">
                                                          <span>Bookings: <strong className="text-foreground">{period.bookingsCount}</strong></span>
                                                          <span>Sessions Taught: <strong className="text-foreground">{period.completedSessions}</strong></span>
                                                          <span>Collected: <strong className="text-foreground">₹{period.totalCollected}</strong></span>
                                                          <span>Payout: <strong className="text-indigo-500">₹{period.tutorPayout}</strong></span>
                                                        </div>
                                                      </div>

                                                      {/* Period Bookings list */}
                                                      {period.bookings.length === 0 ? (
                                                        <p className="text-xs text-muted-foreground italic p-2">No bookings recorded during this pricing period.</p>
                                                      ) : (
                                                        <div className="overflow-x-auto rounded-lg border border-border/60">
                                                          <Table>
                                                            <TableHeader className="bg-secondary/30 uppercase text-[9px] font-bold text-muted-foreground">
                                                              <TableRow>
                                                                <TableHead className="font-bold h-10">Student</TableHead>
                                                                <TableHead className="font-bold h-10">Subject</TableHead>
                                                                <TableHead className="font-bold h-10">Plan Type</TableHead>
                                                                <TableHead className="font-bold h-10">Timing</TableHead>
                                                                <TableHead className="font-bold h-10 text-center">Sessions Taught</TableHead>
                                                                <TableHead className="font-bold h-10 text-right">Amt Collected</TableHead>
                                                                <TableHead className="font-bold h-10 text-right">Commission</TableHead>
                                                                <TableHead className="font-bold h-10 text-right">Tutor Payout</TableHead>
                                                              </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                              {period.bookings.map((booking: any) => (
                                                                <TableRow key={booking.bookingId} className="hover:bg-secondary/10 transition-colors">
                                                                  <TableCell className="font-medium text-xs py-2">{booking.studentName}</TableCell>
                                                                  <TableCell className="text-xs py-2">{booking.subject}</TableCell>
                                                                  <TableCell className="py-2">
                                                                    <Badge variant="outline" className="text-[10px] font-semibold py-0.5 px-2 bg-primary/5 text-primary border-primary/20">{booking.planType}</Badge>
                                                                  </TableCell>
                                                                  <TableCell className="text-[11px] text-muted-foreground py-2">{booking.timing}</TableCell>
                                                                  <TableCell className="text-center font-bold text-xs py-2">{booking.completedSessions} / {booking.totalSessions}</TableCell>
                                                                  <TableCell className="text-right text-xs py-2">₹{booking.amountPaid}</TableCell>
                                                                  <TableCell className="text-right text-xs text-emerald-600 py-2">₹{Math.round(booking.commission)}</TableCell>
                                                                  <TableCell className="text-right font-bold text-indigo-500 text-xs py-2">₹{Math.round(booking.netPayout)}</TableCell>
                                                                </TableRow>
                                                              ))}
                                                            </TableBody>
                                                          </Table>
                                                        </div>
                                                      )}
                                                    </div>
                                                  );
                                                })
                                              )}
                                            </>
                                          );
                                        })()}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </Fragment>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Tutor Details Modal */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" /> Tutor Credentials Profile
            </DialogTitle>
            <DialogDescription>
              Full details and verification documents for this tutor profile.
            </DialogDescription>
          </DialogHeader>

          {selectedTutorForDetail && (
            <div className="space-y-6 py-4">
              {/* Header profile info */}
              <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center p-4 rounded-xl bg-secondary/10 border border-border/40">
                <div className="h-20 w-20 rounded-full border-2 border-primary/20 shadow-md overflow-hidden bg-muted flex items-center justify-center shrink-0">
                  {selectedTutorForDetail.photo || selectedTutorForDetail.avatar ? (
                    <img 
                      src={resolveAssetUrl(selectedTutorForDetail.photo || selectedTutorForDetail.avatar)} 
                      alt={selectedTutorForDetail.name} 
                      className="h-full w-full object-cover" 
                      onError={(e: any) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedTutorForDetail.name || "T")}&background=random&size=200`;
                      }}
                    />
                  ) : (
                    <span className="font-bold text-3xl text-primary uppercase">
                      {(selectedTutorForDetail.name || "T").charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-foreground leading-tight">{selectedTutorForDetail.name}</h3>
                    <Badge variant={selectedTutorForDetail.status === "approved" ? "default" : "secondary"} className={selectedTutorForDetail.status === "approved" ? "bg-emerald-600 hover:bg-emerald-600 border-none" : ""}>
                      {selectedTutorForDetail.status ? selectedTutorForDetail.status.toUpperCase() : "PENDING"}
                    </Badge>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                      {selectedTutorForDetail.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedTutorForDetail.city || "Remote"}</p>
                  
                  {/* Reviews rating */}
                  <div className="flex items-center gap-1 text-sm pt-1">
                    <Star className="h-4 w-4 fill-warning text-warning" />
                    <span className="font-semibold text-foreground">{selectedTutorForDetail.rating ?? 0}</span>
                    <span className="text-muted-foreground">({selectedTutorForDetail.reviewCount ?? 0} reviews)</span>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-card p-4 rounded-xl border">
                <div>
                  <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Email Address</span>
                  <span className="text-sm font-semibold text-foreground mt-0.5 block">{selectedTutorForDetail.email || "No email provided"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Phone Number</span>
                  <span className="text-sm font-semibold text-foreground mt-0.5 block">{selectedTutorForDetail.phone || "No phone provided"}</span>
                </div>
              </div>

              {/* Professional Bio */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Professional Bio</h4>
                <div className="p-4 rounded-xl bg-secondary/5 border leading-relaxed text-sm text-muted-foreground min-h-[60px] whitespace-pre-wrap">
                  {selectedTutorForDetail.bio || "No professional bio written yet."}
                </div>
              </div>

              {/* Credentials & Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Highest Qualification</span>
                  <span className="text-sm font-semibold text-foreground bg-secondary/15 px-3 py-2 rounded-lg border border-border/30 block">
                    {selectedTutorForDetail.qualification || "Not specified"}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Teaching Experience</span>
                  <span className="text-sm font-semibold text-foreground bg-secondary/15 px-3 py-2 rounded-lg border border-border/30 block">
                    {selectedTutorForDetail.experience ? `${selectedTutorForDetail.experience} Years` : "Not specified"}
                  </span>
                </div>
              </div>

              {/* Subjects and Rates */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Subjects & Hourly Rates</h4>
                {selectedTutorForDetail.subjectRates && selectedTutorForDetail.subjectRates.length > 0 ? (
                  <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
                    <Table>
                      <TableHeader className="bg-secondary/40 text-[9px] uppercase tracking-wider font-bold">
                        <TableRow>
                          <TableHead className="font-bold h-9">Subject</TableHead>
                          <TableHead className="font-bold h-9 text-right px-4">Hourly Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedTutorForDetail.subjectRates.map((sr: any, idx: number) => (
                          <TableRow key={idx} className="hover:bg-secondary/5 border-b last:border-0 border-border/40">
                            <TableCell className="font-bold text-xs py-2">{sr.subject.replace(/\s*\((Academic|Extracurricular)\)/i, "")}</TableCell>
                            <TableCell className="text-right font-extrabold text-xs text-emerald-600 py-2 px-4">₹{sr.rate}/hr</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="p-3 bg-secondary/10 rounded-lg text-xs text-muted-foreground italic border border-dashed text-center">
                    Default rate applies: ₹{selectedTutorForDetail.hourlyRate || 500}/hr (No subject-specific rates set)
                  </div>
                )}
              </div>

              {/* KYC Document Section */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">KYC Verification Documents</h4>
                {selectedTutorForDetail.verificationDocument ? (
                  <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/20 dark:bg-indigo-950/10 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">📄</span>
                      <div>
                        <p className="text-xs font-bold text-foreground">Verification Credential Document</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Uploaded PDF/Image verification proof</p>
                      </div>
                    </div>
                    <a 
                      href={resolveAssetUrl(selectedTutorForDetail.verificationDocument)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 py-2 px-4 rounded-lg border border-indigo-200 dark:border-indigo-900/30 transition-colors"
                    >
                      Open Document
                    </a>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-secondary/5 border border-dashed text-center text-xs text-muted-foreground italic">
                    No KYC verification document has been uploaded yet.
                  </div>
                )}
              </div>

              {/* Quick Actions Footer inside Modal */}
              <div className="flex flex-wrap gap-2.5 justify-end pt-4 border-t border-border/40">
                {selectedTutorForDetail.status === "pending" ? (
                  <>
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold" 
                      onClick={() => {
                        handleApproval(selectedTutorForDetail.id, "approved");
                        setIsDetailDialogOpen(false);
                      }}
                    >
                      <CheckCircle className="mr-1.5 h-4 w-4" /> Approve Tutor
                    </Button>
                    <Button 
                      variant="outline"
                      className="text-rose-600 hover:bg-rose-50 border-rose-200 font-bold" 
                      onClick={() => {
                        handleApproval(selectedTutorForDetail.id, "rejected");
                        setIsDetailDialogOpen(false);
                      }}
                    >
                      <XCircle className="mr-1.5 h-4 w-4" /> Reject Tutor
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant={selectedTutorForDetail.featured ? "outline" : "default"} 
                    className={`font-bold ${
                      selectedTutorForDetail.featured 
                        ? "border-amber-500/50 text-amber-600 hover:bg-amber-50" 
                        : "bg-indigo-600 hover:bg-indigo-700 text-white"
                    }`}
                    onClick={() => {
                      toggleFeatured(selectedTutorForDetail);
                      // Update modal state instantly to reflect UI feature changes
                      setSelectedTutorForDetail((prev: any) => prev ? { ...prev, featured: !prev.featured } : null);
                    }}
                  >
                    <Star className={`mr-1.5 h-4 w-4 ${selectedTutorForDetail.featured ? "fill-amber-400 text-amber-500" : ""}`} />
                    {selectedTutorForDetail.featured ? "Remove Featured" : "Make Featured"}
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setIsDetailDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default AdminDashboard;
