import { useState } from "react";
import { Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import PageLayout from "@/components/layout/PageLayout";
import { toast } from "@/components/ui/sonner";
import axios from "axios";
import API_URL from "@/config/api";

const Contact = () => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const target = e.target as HTMLFormElement;
    const name = (target.elements.namedItem("name") as HTMLInputElement).value;
    const email = (target.elements.namedItem("email") as HTMLInputElement).value;
    const subject = (target.elements.namedItem("subject") as HTMLInputElement).value;
    const message = (target.elements.namedItem("message") as HTMLTextAreaElement).value;

    try {
      await axios.post(`${API_URL}/auth/contact`, { name, email, subject, message });
      toast.success("Message sent! We'll get back to you soon.");
      target.reset();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || "Failed to send message. Please try again.";
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <section className="bg-primary py-16">
        <div className="container text-center">
          <h1 className="mb-4 text-4xl font-bold text-primary-foreground">Contact Us</h1>
          <p className="text-lg text-primary-foreground/80">Have a question? We'd love to hear from you.</p>
        </div>
      </section>

      <section className="py-16">
        <div className="container">
          <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2">
            <div>
              <h2 className="mb-6 text-2xl font-bold text-foreground">Get in Touch</h2>
              <div className="mb-6">
                <h3 className="font-bold text-lg text-foreground mb-1">Cuvasol Technologies Private Limited</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3 text-muted-foreground">
                  <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>
                    HD-169, We Work, 78 Old Madras Road,<br />
                    Salarpuria Magnificia, Tin Factory,<br />
                    Mahadevapura, Bangalore 560016,<br />
                    Karnataka, IN
                  </span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Phone className="h-5 w-5 text-primary" />
                  <span>Phone: +91 95385 17963</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Mail className="h-5 w-5 text-primary" />
                  <span>Email: support@cuvasol.com</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" required maxLength={100} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required maxLength={255} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" name="subject" required maxLength={200} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" name="message" rows={5} required maxLength={1000} />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Contact;
