import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, User, Mail, Phone, Lock, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";
import axios from "axios";
import API_URL from "@/config/api";

interface ConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ConsultationModal({ isOpen, onClose }: ConsultationModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [slot1, setSlot1] = useState("");
  const [slot2, setSlot2] = useState("");
  const [slot3, setSlot3] = useState("");
  const [notes, setNotes] = useState("");

  // Autofill user details when user changes or modal opens
  useEffect(() => {
    if (user) {
      setName(user.full_name || user.user_metadata?.full_name || "");
      setEmail(user.email || "");
      setPhone(user.phone || user.user_metadata?.phone || "");
    }
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !phone) {
      toast.error("Please fill in your name, email, and phone number.");
      return;
    }

    if (!slot1 || !slot2 || !slot3) {
      toast.error("Please select all 3 preferred date & time slots.");
      return;
    }

    setLoading(true);

    const formattedMessage = `
===============================================
FREE CONSULTATION REQUEST
===============================================

STUDENT DETAILS:
Name: ${name}
Email: ${email}
Phone Number: ${phone}

PREFERRED CONTACT SLOTS:
- Slot 1: ${slot1}
- Slot 2: ${slot2}
- Slot 3: ${slot3}

ADDITIONAL NOTES / TOPICS:
${notes.trim() ? notes.trim() : "None provided"}
===============================================
    `.trim();

    try {
      await axios.post(`${API_URL}/auth/contact`, {
        name,
        email,
        subject: `Free Consultation Request - ${name}`,
        message: formattedMessage,
      });

      toast.success("Consultation request submitted! Our team will contact you in one of your selected time slots.");
      onClose();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || "Failed to submit request. Please try again.";
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl">
        {!user ? (
          /* Unauthenticated State Prompt */
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Lock className="h-8 w-8" />
            </div>
            <DialogHeader className="text-center sm:text-center">
              <DialogTitle className="text-2xl font-bold text-foreground">
                Registration Required
              </DialogTitle>
              <DialogDescription className="mt-2 text-base text-muted-foreground">
                To schedule a free 20-minute consultation with our academic advisor, please log in or register a student account first.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="w-full sm:w-auto font-semibold"
                onClick={() => {
                  onClose();
                  navigate("/register/student");
                }}
              >
                Register as Student
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto font-semibold"
                onClick={() => {
                  onClose();
                  navigate("/login");
                }}
              >
                Log In
              </Button>
            </div>
          </div>
        ) : (
          /* Authenticated Form State */
          <div>
            <DialogHeader className="mb-4">
              <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                Schedule a Free Consultation
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Please confirm your contact details and select 3 convenient date & time slots when our academic advisor can contact you.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Personal Info Group */}
              <div className="space-y-3 rounded-xl bg-secondary/30 p-4 border border-border/50">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Contact Information
                </h4>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="consult-name" className="text-xs font-medium text-foreground">
                      Full Name *
                    </Label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="consult-name"
                        type="text"
                        placeholder="Your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-9 text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="consult-phone" className="text-xs font-medium text-foreground">
                      Phone Number *
                    </Label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="consult-phone"
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="pl-9 text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="consult-email" className="text-xs font-medium text-foreground">
                    Email Address *
                  </Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="consult-email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 text-sm"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Available Slots Group */}
              <div className="space-y-3 rounded-xl bg-secondary/30 p-4 border border-border/50">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    3 Preferred Contact Slots (Date & Time) *
                  </h4>
                  <Clock className="h-4 w-4 text-primary" />
                </div>

                <div className="space-y-2">
                  <div>
                    <Label htmlFor="slot-1" className="text-xs text-muted-foreground">
                      Slot 1 (1st Preference) *
                    </Label>
                    <Input
                      id="slot-1"
                      type="datetime-local"
                      value={slot1}
                      onChange={(e) => setSlot1(e.target.value)}
                      className="mt-1 text-sm"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="slot-2" className="text-xs text-muted-foreground">
                      Slot 2 (2nd Preference) *
                    </Label>
                    <Input
                      id="slot-2"
                      type="datetime-local"
                      value={slot2}
                      onChange={(e) => setSlot2(e.target.value)}
                      className="mt-1 text-sm"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="slot-3" className="text-xs text-muted-foreground">
                      Slot 3 (3rd Preference) *
                    </Label>
                    <Input
                      id="slot-3"
                      type="datetime-local"
                      value={slot3}
                      onChange={(e) => setSlot3(e.target.value)}
                      className="mt-1 text-sm"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="consult-notes" className="text-xs font-medium text-foreground">
                  Goals or Subjects You'd Like to Discuss (Optional)
                </Label>
                <Textarea
                  id="consult-notes"
                  placeholder="e.g. Looking for Class 10 Math & Physics tutor, available evenings..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="mt-1 text-sm resize-none"
                />
              </div>

              <DialogFooter className="pt-2 sm:justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="font-semibold">
                  {loading ? "Submitting..." : "Submit Consultation Request"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
