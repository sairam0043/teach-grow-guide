import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, BookOpen, Calendar, CreditCard, Star, Users, Award, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PageLayout from "@/components/layout/PageLayout";
import TutorCard from "@/components/tutors/TutorCard";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import type { Tutor } from "@/data/mockTutors";
import { useAuth } from "@/contexts/AuthContext";
import API_URL from "@/config/api";

const steps = [
  { icon: Search, title: "Find Your Tutor", description: "Browse expert tutors by subject, category, or location." },
  { icon: Calendar, title: "Book a Demo", description: "Try a free demo class to see if the tutor is a great fit." },
  { icon: BookOpen, title: "Start Learning", description: "Schedule weekly classes and begin your learning journey." },
  { icon: CreditCard, title: "Pay Securely", description: "Simple, transparent pricing with secure online payments." },
];

const Index = () => {
  const { user, role } = useAuth();

  const { data: featuredTutors = [], isLoading } = useQuery<Tutor[]>({
    queryKey: ['tutors', 'featured'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/tutors?status=approved&featured=true`);
      return res.data;
    }
  });

  const { data: platformStats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['platform', 'stats'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/dashboard/admin`);
      return res.data;
    }
  });

  const stats = [
    { icon: Users, value: platformStats?.totalStudents || 0, label: "Active Students" },
    { icon: Award, value: platformStats?.activeTutors || 0, label: "Expert Tutors" },
    { icon: BookOpen, value: platformStats?.totalBookings || 0, label: "Classes Booked" },
    { icon: Star, value: platformStats?.averageRating || 0, label: "Average Rating" },
  ];



  return (
    <PageLayout>
      {/* Course Banner Advertisement */}
      <div className="w-full bg-secondary/30 border-b">
        <div className="container max-w-7xl px-4 py-3 sm:py-4">
          <Link 
            to="/ai-program" 
            className="block overflow-hidden rounded-2xl border border-teal-500/20 hover:border-teal-500/50 transition-all duration-300 shadow-sm hover:shadow-md hover:scale-[1.005]"
          >
            <img 
              src="/ai-program-banner.png" 
              alt="AI Future Skills Program" 
              className="w-full h-auto block" 
            />
          </Link>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden bg-primary py-20 lg:py-28">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-accent" />
          <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-accent" />
        </div>
        <div className="container relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mx-auto max-w-3xl text-center"
          >
            <h1 className="mb-6 text-4xl font-bold text-primary-foreground md:text-5xl lg:text-6xl">
              Find the Perfect Tutor with Cuvasol Tutor
            </h1>
            <p className="mb-8 text-lg text-primary-foreground/80 md:text-xl">
              Find expert tutors in academics, music, art, and more. Book a demo, schedule classes, and start your personalized learning journey today.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" variant="secondary" asChild>
                <Link to="/tutors">
                  Browse Tutors <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              {user ? (
                <Button size="lg" variant="secondary" asChild>
                  <Link to={role === "admin" ? "/dashboard/admin" : role === "tutor" ? "/dashboard/tutor" : "/dashboard/student"}>
                    Go to Dashboard
                  </Link>
                </Button>
              ) : (
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/register/tutor">Become a Tutor</Link>
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b bg-card py-12">
        <div className="container">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="text-center"
              >
                <stat.icon className="mx-auto mb-2 h-6 w-6 text-primary" />
                {isStatsLoading ? (
                  <Skeleton className="mx-auto h-8 w-16 mb-1" />
                ) : (
                  <div className="text-2xl font-bold text-foreground">{stat.value}{stat.label === "Average Rating" && ""}</div>
                )}
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="container">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">How It Works</h2>
            <p className="text-lg text-muted-foreground">Four simple steps to start learning</p>
          </motion.div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-xl border bg-card p-6 text-center shadow-card"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-card-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured tutors */}
      <section className="bg-secondary/50 py-20">
        <div className="container">
          <div className="mb-12 flex items-end justify-between">
            <div>
              <h2 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">Featured Tutors</h2>
              <p className="text-lg text-muted-foreground">Learn from our top-rated educators</p>
            </div>
            <Button variant="outline" asChild className="hidden md:flex">
              <Link to="/tutors">View All <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border bg-card p-4 shadow-card">
                  <Skeleton className="mb-4 h-48 w-full rounded-lg" />
                  <Skeleton className="mb-2 h-6 w-2/3" />
                  <Skeleton className="mb-4 h-4 w-1/3" />
                </div>
              ))
            ) : featuredTutors.length > 0 ? (
              featuredTutors.map((tutor) => (
                <TutorCard key={tutor.id} tutor={tutor} />
              ))
            ) : (
              <div className="col-span-1 sm:col-span-2 lg:col-span-3 text-center text-muted-foreground py-10">
                No featured tutors available yet.
              </div>
            )}
          </div>

          <div className="mt-8 text-center md:hidden">
            <Button variant="outline" asChild>
              <Link to="/tutors">View All Tutors <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-background">
        <div className="container max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">Frequently Asked Questions</h2>
            <p className="text-lg text-muted-foreground">Got questions? We've got answers.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <Accordion type="single" collapsible className="w-full space-y-4">
              <AccordionItem value="item-1" className="border rounded-xl px-6 bg-card shadow-sm hover:shadow-md transition-shadow">
                <AccordionTrigger className="text-lg font-semibold text-foreground hover:no-underline py-5">
                  How do I find a tutor?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-[15px] pb-5">
                  Use our Browse Tutors page to search by subject, class, location, and more. You can filter results to find tutors that match your specific requirements.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border rounded-xl px-6 bg-card shadow-sm hover:shadow-md transition-shadow">
                <AccordionTrigger className="text-lg font-semibold text-foreground hover:no-underline py-5">
                  How do I request a demo class?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-[15px] pb-5">
                  Once you find a tutor you're interested in, visit their profile page and fill out the demo class request form. The tutor will contact you to schedule a session.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="border rounded-xl px-6 bg-card shadow-sm hover:shadow-md transition-shadow">
                <AccordionTrigger className="text-lg font-semibold text-foreground hover:no-underline py-5">
                  How can I become a tutor?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-[15px] pb-5">
                  Visit our Become a Tutor page and fill out the application form. Our team will review your application and get back to you within 2-3 business days.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="border rounded-xl px-6 bg-card shadow-sm hover:shadow-md transition-shadow">
                <AccordionTrigger className="text-lg font-semibold text-foreground hover:no-underline py-5">
                  Are all tutors verified?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-[15px] pb-5">
                  Yes, every tutor on our platform undergoes a comprehensive verification process including background checks, credential validation, and quality assessment.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="border rounded-xl px-6 bg-card shadow-sm hover:shadow-md transition-shadow">
                <AccordionTrigger className="text-lg font-semibold text-foreground hover:no-underline py-5">
                  What are your operating hours?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-[15px] pb-5">
                  Our support team is available Monday to Saturday, 9:00 AM to 6:00 PM. We respond to all inquiries within 24 hours.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container">
          <div className="rounded-2xl bg-primary p-10 text-center md:p-16">
            <h2 className="mb-4 text-3xl font-bold text-primary-foreground md:text-4xl">Ready to Start Learning?</h2>
            <p className="mb-8 text-lg text-primary-foreground/80">Join thousands of students already learning with Cuvasol Tutor</p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" variant="secondary" asChild>
                <Link to="/register/student">Get Started Free</Link>
              </Button>








            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Index;
