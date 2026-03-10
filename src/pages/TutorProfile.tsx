import { useParams, Link } from "react-router-dom";
import { Star, MapPin, Monitor, Clock, ArrowLeft, Calendar, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageLayout from "@/components/layout/PageLayout";
import { mockTutors } from "@/data/mockTutors";
import { useState } from "react";
import { toast } from "sonner";

const TutorProfile = () => {
  const { id } = useParams();
  const tutor = mockTutors.find((t) => t.id === id);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

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

  const handleBookDemo = () => {
    if (!selectedSlot) {
      toast.error("Please select a demo slot first");
      return;
    }
    toast.success("Demo booked successfully! You'll receive a confirmation shortly.");
    setSelectedSlot(null);
  };

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
                src={tutor.photo}
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
                    <strong className="text-foreground">{tutor.rating}</strong> ({tutor.reviewCount} reviews)
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
                  {tutor.subjects.map((s) => (
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
                  {tutor.demoSlots.filter((s) => s.available).map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot.id)}
                      className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                        selectedSlot === slot.id
                          ? "border-primary bg-primary/5 text-foreground"
                          : "hover:border-primary/50 text-muted-foreground"
                      }`}
                    >
                      <div className="font-medium text-foreground">{slot.date}</div>
                      <div>{slot.time}</div>
                      {selectedSlot === slot.id && (
                        <CheckCircle className="mt-1 h-4 w-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
                <Button className="w-full" onClick={handleBookDemo}>
                  Book Demo Session
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
