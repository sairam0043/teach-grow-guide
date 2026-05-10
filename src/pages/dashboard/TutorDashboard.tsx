import { useEffect, useState } from "react";
import axios from "axios";
import { Calendar, Users, Clock, DollarSign, BookOpen, AlertCircle, Save, CheckCircle, PlusCircle, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import PageLayout from "@/components/layout/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useSelector, useDispatch } from "react-redux";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { fetchTutorStats, updateTutorAvailability } from "@/redux/slices/dashboardSlice";
import { RootState, AppDispatch } from "@/redux/store";
import { toast } from "sonner";
import API_URL from "@/config/api";
import { Textarea } from "@/components/ui/textarea";

const TutorDashboard = () => {
  const { user } = useAuth();
  const name = String(user?.user_metadata?.full_name || "Tutor");
  
  const dispatch = useDispatch<AppDispatch>();
  const { tutorStats, loading: statsLoading } = useSelector((state: RootState) => state.dashboard);
  
  const [tutorProfile, setTutorProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const [availability, setAvailability] = useState<{ day: string; selected: boolean; startTime: string; endTime: string }[]>(
    DAYS.map(day => ({ day, selected: false, startTime: '09:00', endTime: '17:00' }))
  );
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);

  // Profile Edit State
  const [profileData, setProfileData] = useState({
    bio: "",
    qualification: "",
    hourlyRate: "",
    subjects: "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (user?.id) {
      axios.get(`${API_URL}/tutors/user/${user.id}`)
        .then(res => {
          setTutorProfile(res.data);
          setProfileData({
            bio: res.data.bio || "",
            qualification: res.data.qualification || "",
            hourlyRate: res.data.hourlyRate || "",
            subjects: res.data.subjects?.join(", ") || "",
          });
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

  useEffect(() => {
    if (tutorStats?.availability && tutorStats.availability.length > 0) {
      setAvailability(prev => prev.map(p => {
        const found = tutorStats.availability?.find(a => a.day === p.day);
        if (found) {
          return { ...p, selected: true, startTime: found.startTime, endTime: found.endTime };
        }
        return p;
      }));
    }
  }, [tutorStats?.availability]);

  const handleSaveAvailability = () => {
    if (!tutorProfile) return;
    
    const selectedDays = availability.filter(a => a.selected);
    if (selectedDays.length === 0) {
      toast.error("Please select at least one available day.");
      return;
    }

    for (const day of selectedDays) {
      if (!day.startTime || !day.endTime) {
         toast.error(`Please set valid times for ${day.day}.`);
         return;
      }
      if (day.endTime <= day.startTime) {
         toast.error(`End time must be later than start time for ${day.day}.`);
         return;
      }
    }

    const payload = selectedDays.map(({ day, startTime, endTime }) => ({ day, startTime, endTime }));
    
    setIsSavingAvailability(true);
    dispatch(updateTutorAvailability({ tutorId: tutorProfile.id, availability: payload }))
      .unwrap()
      .then(() => toast.success("Availability saved successfully"))
      .catch(() => toast.error("Failed to save availability"))
      .finally(() => setIsSavingAvailability(false));
  };

  const handleBookingAction = async (bookingId: string, status: string) => {
    try {
      await axios.put(`${API_URL}/tutors/booking/${bookingId}/status`, { status });
      toast.success(`Booking marked as ${status}.`);
      setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status } : b));
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Failed to update booking`);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutorProfile?.id) return;
    setIsSavingProfile(true);
    try {
      const payload = {
        ...profileData,
        subjects: profileData.subjects.split(",").map(s => s.trim()).filter(Boolean),
        hourlyRate: Number(profileData.hourlyRate)
      };
      await axios.put(`${API_URL}/tutors/${tutorProfile.id}/profile`, payload);
      toast.success("Public profile updated successfully!");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const enrolledClasses = bookings.filter(b => b.status === 'enrolled');
  const demoRequests = bookings.filter(b => b.status !== 'enrolled');
  
  // Extract unique students
  const uniqueStudents = Array.from(new Map(enrolledClasses.map(cls => [cls.studentId, cls])).values());

  return (
    <PageLayout>
      <div className="container py-10 max-w-7xl">
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-foreground tracking-tight">Hello, {name}</h1>
          <p className="text-lg text-muted-foreground mt-1">Manage your teaching schedule, students, and profile.</p>
        </div>

        {tutorProfile?.status === "pending" && (
          <Alert variant="destructive" className="mb-8 border-yellow-500 bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 shadow-sm rounded-xl">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="font-bold text-lg">Account Pending Approval</AlertTitle>
            <AlertDescription className="mt-2 text-sm leading-relaxed">
              Your tutor profile is under review by our admin team. Once approved, you will be publicly listed on the platform and students will be able to book you.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          {[
            { icon: Clock, label: "Demo Requests", value: tutorStats?.demoRequests || 0, color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/30" },
            { icon: Users, label: "Active Students", value: uniqueStudents.length, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
            { icon: Calendar, label: "Upcoming Classes", value: enrolledClasses.length, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30" },
            { icon: DollarSign, label: "Total Earnings", value: `₹${enrolledClasses.reduce((acc, curr) => acc + (curr.amountPaid || 0), 0)}`, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
          ].map((stat) => (
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

        <Tabs defaultValue="demos" className="space-y-8">
          <TabsList className="bg-secondary/50 p-1 rounded-xl shadow-sm border mb-4 h-auto justify-start w-full overflow-x-auto whitespace-nowrap">
            <TabsTrigger value="demos" className="rounded-lg px-6 py-2.5 shrink-0">Demo Requests</TabsTrigger>
            <TabsTrigger value="schedule" className="rounded-lg px-6 py-2.5 shrink-0">Class Schedule</TabsTrigger>
            <TabsTrigger value="students" className="rounded-lg px-6 py-2.5 shrink-0">Students</TabsTrigger>
            <TabsTrigger value="availability" className="rounded-lg px-6 py-2.5 shrink-0">Availability</TabsTrigger>
            <TabsTrigger value="earnings" className="rounded-lg px-6 py-2.5 shrink-0">Earnings</TabsTrigger>
            <TabsTrigger value="profile" className="rounded-lg px-6 py-2.5 shrink-0">Profile Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="demos">
            <Card className="shadow-md border-border/50">
              <CardHeader className="bg-secondary/20 border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2"><Clock className="h-5 w-5 text-indigo-500" /> Requested Demo Bookings</CardTitle>
                <CardDescription>Manage incoming demo requests from new students.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {loadingBookings ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-20 w-full rounded-xl" />
                    <Skeleton className="h-20 w-full rounded-xl" />
                  </div>
                ) : demoRequests.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-secondary/10 rounded-2xl border border-dashed mt-4">
                    <Clock className="mx-auto mb-4 h-16 w-16 opacity-30 text-indigo-500" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Demo Requests</h3>
                    <p>You don't have any pending demo requests right now.</p>
                  </div>
                ) : (
                  <div className="space-y-4 mt-4">
                    {demoRequests.map((booking: any) => (
                      <div key={booking._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card p-5 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
                        <div className="mb-4 sm:mb-0">
                          <p className="font-bold text-lg text-foreground flex items-center gap-2">
                             <Users className="h-5 w-5 text-primary"/> Student: {booking.studentName}
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
                               <>
                                <Button size="sm" className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white shadow-sm" onClick={() => handleBookingAction(booking._id, 'completed')}>
                                  <Check className="mr-1 h-4 w-4"/> Mark Completed
                                </Button>
                                <Button size="sm" variant="outline" className="w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={() => handleBookingAction(booking._id, 'rejected')}>Reject</Button>
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

          <TabsContent value="schedule">
            <Card className="shadow-md border-border/50">
              <CardHeader className="bg-secondary/20 border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2"><Calendar className="h-5 w-5 text-green-500" /> Active Class Schedule</CardTitle>
                <CardDescription>Your ongoing paid classes.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {enrolledClasses.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-secondary/10 rounded-2xl border border-dashed mt-4">
                    <Calendar className="mx-auto mb-4 h-16 w-16 opacity-30 text-green-500" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Active Classes</h3>
                    <p>You don't have any enrolled classes right now.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 mt-4 sm:grid-cols-2">
                    {enrolledClasses.map((cls: any) => (
                      <div key={cls._id} className="flex flex-col bg-card hover:bg-secondary/10 transition-colors p-5 rounded-xl border shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                           <div>
                             <h4 className="font-bold text-lg text-foreground">{cls.subject}</h4>
                             <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><Users className="h-3 w-3"/> Student: {cls.studentName}</p>
                           </div>
                           <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none px-3 py-1">{cls.planType}</Badge>
                        </div>
                        <div className="mt-auto pt-4 border-t flex justify-between items-center">
                           <span className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4"/> {cls.timing}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students">
            <Card className="shadow-md border-border/50">
              <CardHeader className="bg-secondary/20 border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2"><Users className="h-5 w-5 text-blue-500" /> Enrolled Students</CardTitle>
                <CardDescription>A list of students currently taking your classes.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {uniqueStudents.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-secondary/10 rounded-2xl border border-dashed mt-4">
                    <Users className="mx-auto mb-4 h-16 w-16 opacity-30 text-blue-500" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Students Yet</h3>
                    <p>Complete demo sessions to convert leads into enrolled students.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 mt-4 sm:grid-cols-2 lg:grid-cols-3">
                    {uniqueStudents.map((cls: any) => (
                      <div key={cls.studentId} className="flex items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                          {cls.studentName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{cls.studentName}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Enrolled Subject: {cls.subject}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="availability">
            <Card className="shadow-md border-border/50">
              <CardHeader className="bg-secondary/20 border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2"><Calendar className="h-5 w-5 text-orange-500" /> Manage Availability</CardTitle>
                <CardDescription>Select the days you are available and set your working hours.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4 max-w-2xl mt-4">
                  {availability.map((dayObj, i) => (
                    <div key={dayObj.day} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border rounded-xl bg-card hover:bg-secondary/10 transition-colors shadow-sm">
                      <div className="flex items-center gap-3 min-w-[140px]">
                        <Checkbox 
                           id={`day-${dayObj.day}`} 
                           checked={dayObj.selected}
                           onCheckedChange={(checked) => {
                             const newAvail = [...availability];
                             newAvail[i].selected = checked === true;
                             setAvailability(newAvail);
                           }}
                           className="h-5 w-5"
                        />
                        <Label htmlFor={`day-${dayObj.day}`} className="font-medium cursor-pointer text-base">{dayObj.day}</Label>
                      </div>
                      
                      <div className={`flex flex-wrap items-center gap-4 transition-opacity ${dayObj.selected ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                        <div className="flex items-center gap-2 bg-secondary/30 p-1.5 rounded-lg border">
                          <Label className="text-xs text-muted-foreground w-8 text-center font-semibold">IN</Label>
                          <Input 
                            type="time" 
                            className="w-[120px] h-8 border-none bg-transparent shadow-none focus-visible:ring-0 px-2" 
                            value={dayObj.startTime}
                            onChange={(e) => {
                              const newAvail = [...availability];
                              newAvail[i].startTime = e.target.value;
                              setAvailability(newAvail);
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-2 bg-secondary/30 p-1.5 rounded-lg border">
                          <Label className="text-xs text-muted-foreground w-8 text-center font-semibold">OUT</Label>
                          <Input 
                            type="time" 
                            className="w-[120px] h-8 border-none bg-transparent shadow-none focus-visible:ring-0 px-2"
                            value={dayObj.endTime}
                            onChange={(e) => {
                              const newAvail = [...availability];
                              newAvail[i].endTime = e.target.value;
                              setAvailability(newAvail);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-6 flex justify-end">
                    <Button onClick={handleSaveAvailability} disabled={isSavingAvailability} className="shadow-md rounded-full px-8">
                      {isSavingAvailability ? 'Saving...' : <><Save className="mr-2 h-4 w-4"/> Save Availability</>}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="earnings">
            <Card className="shadow-md border-border/50">
              <CardHeader className="bg-secondary/20 border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2"><DollarSign className="h-5 w-5 text-emerald-500" /> Earnings Ledger</CardTitle>
                <CardDescription>A record of all your enrolled class payments.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {loadingBookings ? (
                   <div className="py-4"><Skeleton className="h-32 w-full rounded-xl" /></div>
                ) : enrolledClasses.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-secondary/10 rounded-2xl border border-dashed mt-4">
                    <DollarSign className="mx-auto mb-4 h-16 w-16 opacity-30 text-emerald-500" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Earnings Found</h3>
                    <p>You haven't earned anything yet. Teach a class to start earning!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto mt-4 rounded-xl border shadow-sm">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground bg-secondary/50 uppercase border-b">
                        <tr>
                          <th className="px-6 py-4 font-medium">Date Enrolled</th>
                          <th className="px-6 py-4 font-medium">Student / Subject</th>
                          <th className="px-6 py-4 font-medium text-right">Amount Earned</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrolledClasses.map((cls: any) => (
                          <tr key={cls._id} className="bg-card border-b last:border-0 hover:bg-secondary/20 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground">
                              {new Date(cls.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-foreground">{cls.studentName}</div>
                              <div className="text-muted-foreground text-xs">{cls.subject}</div>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-emerald-600 text-lg">
                              +₹{cls.amountPaid}
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
            <Card className="shadow-md border-border/50">
              <CardHeader className="bg-secondary/20 border-b pb-4">
                <CardTitle className="text-xl flex items-center gap-2"><AlertCircle className="h-5 w-5 text-blue-500" /> Public Profile Settings</CardTitle>
                <CardDescription>Customize how students see you on the platform.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid lg:grid-cols-3 gap-8">
                   <div className="lg:col-span-1 border rounded-xl p-5 bg-secondary/10 self-start shadow-sm">
                      <h4 className="font-semibold mb-4 text-foreground border-b pb-2">Account Overview</h4>
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Name</p>
                          <p className="font-medium text-foreground">{name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Email</p>
                          <p className="font-medium text-foreground">{String(user?.email || "")}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Approval Status</p>
                          {loading ? (
                            <Skeleton className="h-5 w-20 mt-1" />
                          ) : (
                            <Badge variant={tutorProfile?.status === 'approved' ? 'default' : 'secondary'} className={`mt-1 ${tutorProfile?.status === 'approved' ? 'bg-green-600' : ''}`}>
                              {tutorProfile?.status ? tutorProfile.status.charAt(0).toUpperCase() + tutorProfile.status.slice(1) : "Unknown"}
                            </Badge>
                          )}
                        </div>
                      </div>
                   </div>

                   <div className="lg:col-span-2">
                     <form onSubmit={handleProfileUpdate} className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="bio" className="text-sm font-semibold">Professional Bio</Label>
                          <textarea 
                            id="bio" 
                            rows={4}
                            value={profileData.bio} 
                            onChange={(e) => setProfileData({...profileData, bio: e.target.value})} 
                            placeholder="Tell students about yourself, your teaching style, and why they should choose you..."
                            className="flex min-h-[100px] w-full rounded-md border border-input bg-secondary/20 px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" 
                          />
                        </div>
                        <div className="grid sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="qualification" className="text-sm font-semibold">Highest Qualification</Label>
                            <Input id="qualification" value={profileData.qualification} onChange={(e) => setProfileData({...profileData, qualification: e.target.value})} placeholder="e.g. M.Sc. in Mathematics" className="bg-secondary/20 shadow-sm" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="hourlyRate" className="text-sm font-semibold">Hourly Rate (₹)</Label>
                            <Input id="hourlyRate" type="number" min="0" value={profileData.hourlyRate} onChange={(e) => setProfileData({...profileData, hourlyRate: e.target.value})} placeholder="e.g. 500" className="bg-secondary/20 shadow-sm" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="subjects" className="text-sm font-semibold">Subjects Taught (Comma Separated)</Label>
                          <Input id="subjects" value={profileData.subjects} onChange={(e) => setProfileData({...profileData, subjects: e.target.value})} placeholder="e.g. Algebra, Calculus, Physics" className="bg-secondary/20 shadow-sm" />
                        </div>
                        
                        <div className="pt-2">
                          <Button type="submit" disabled={isSavingProfile} className="w-full sm:w-auto shadow-md rounded-full px-8">
                            {isSavingProfile ? "Saving..." : <><Save className="mr-2 h-4 w-4"/> Update Public Profile</>}
                          </Button>
                        </div>
                     </form>
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
