import { useEffect, useState } from "react";
import { Users, BookOpen, CreditCard, CheckCircle, XCircle, Clock, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PageLayout from "@/components/layout/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PendingTutor {
  id: string;
  user_id: string;
  category: string;
  subjects: string[];
  experience: number;
  city: string | null;
  teaching_mode: string;
  approval_status: string;
  created_at: string;
  profile?: { full_name: string; email: string };
}

const AdminDashboard = () => {
  const [pendingTutors, setPendingTutors] = useState<PendingTutor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPendingTutors = async () => {
    const { data: tutors } = await supabase
      .from("tutors")
      .select("*")
      .eq("approval_status", "pending");

    if (tutors) {
      // Fetch profiles for these tutors
      const userIds = tutors.map(t => t.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      const enriched = tutors.map(t => ({
        ...t,
        profile: profiles?.find(p => p.user_id === t.user_id),
      }));
      setPendingTutors(enriched);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPendingTutors();
  }, []);

  const handleApproval = async (tutorId: string, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from("tutors")
      .update({ approval_status: status })
      .eq("id", tutorId);

    if (error) {
      toast.error("Failed to update tutor status");
    } else {
      toast.success(`Tutor ${status === "approved" ? "approved" : "rejected"} successfully`);
      fetchPendingTutors();
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
            { icon: Clock, label: "Pending Approvals", value: String(pendingTutors.length) },
            { icon: Users, label: "Active Tutors", value: "–" },
            { icon: BookOpen, label: "Total Bookings", value: "–" },
            { icon: CreditCard, label: "Total Revenue", value: "–" },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
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
                  <p className="text-muted-foreground">Loading...</p>
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
                          <TableCell className="font-medium">{tutor.profile?.full_name || "–"}</TableCell>
                          <TableCell>{tutor.profile?.email || "–"}</TableCell>
                          <TableCell><Badge variant="secondary">{tutor.category}</Badge></TableCell>
                          <TableCell>{tutor.subjects.join(", ")}</TableCell>
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
                <div className="py-12 text-center text-muted-foreground">
                  <Users className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>Tutor management features coming in the next phase.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students">
            <Card>
              <CardHeader><CardTitle>Students</CardTitle></CardHeader>
              <CardContent>
                <div className="py-12 text-center text-muted-foreground">
                  <Users className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>Student management coming in the next phase.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card>
              <CardHeader><CardTitle>All Bookings</CardTitle></CardHeader>
              <CardContent>
                <div className="py-12 text-center text-muted-foreground">
                  <BookOpen className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>Booking overview coming in the next phase.</p>
                </div>
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
