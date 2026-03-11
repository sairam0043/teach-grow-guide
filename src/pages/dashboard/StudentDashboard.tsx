import { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, BookOpen, CreditCard, User, Search, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageLayout from "@/components/layout/PageLayout";
import { useAuth } from "@/contexts/AuthContext";

const StudentDashboard = () => {
  const { user } = useAuth();
  const name = user?.user_metadata?.full_name || "Student";

  return (
    <PageLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Welcome, {name}!</h1>
          <p className="text-muted-foreground">Manage your classes, demos, and payments</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {[
            { icon: Calendar, label: "Upcoming Classes", value: "0" },
            { icon: Clock, label: "Demo Bookings", value: "0" },
            { icon: BookOpen, label: "Total Classes", value: "0" },
            { icon: CreditCard, label: "Total Spent", value: "₹0" },
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
              <CardHeader><CardTitle>Demo Bookings</CardTitle></CardHeader>
              <CardContent>
                <div className="py-12 text-center text-muted-foreground">
                  <Clock className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>No demo bookings yet. Book a demo with a tutor to get started!</p>
                  <Button asChild className="mt-4"><Link to="/tutors">Find a Tutor</Link></Button>
                </div>
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
                    <p className="font-medium text-foreground">{user?.email}</p>
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
