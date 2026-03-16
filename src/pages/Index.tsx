import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, BookOpen, Calendar, CreditCard, Star, Users, Award, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PageLayout from "@/components/layout/PageLayout";
import TutorCard from "@/components/tutors/TutorCard";
import type { Tutor } from "@/data/mockTutors";
import { useAuth } from "@/contexts/AuthContext";
import API_URL from "@/config/api";

const steps = [
  { icon: Search, title: "Find Your Tutor", description: "Browse expert tutors by subject, category, or location." },
  { icon: Calendar, title: "Book a Demo", description: "Try a free demo class to see if the tutor is a great fit." },
  { icon: BookOpen, title: "Start Learning", description: "Schedule weekly classes and begin your learning journey." },
  { icon: CreditCard, title: "Pay Securely", description: "Simple, transparent pricing with secure online payments." },
];

const stats = [
  { icon: Users, value: "10,000+", label: "Active Students" },
  { icon: Award, value: "500+", label: "Expert Tutors" },
  { icon: Star, value: "4.8", label: "Average Rating" },
  { icon: BookOpen, value: "50+", label: "Subjects" },
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

  if (user) {
    if (role === 'admin') return <Navigate to="/dashboard/admin" replace />;
    if (role === 'tutor') return <Navigate to="/dashboard/tutor" replace />;
    if (role === 'student') return <Navigate to="/dashboard/student" replace />;
  }

  return (
    <PageLayout>
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
              <Button size="lg" variant="secondary" asChild>
                <Link to="/register/tutor">Become a Tutor</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b bg-card py-12">
        <div className="container">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <stat.icon className="mx-auto mb-2 h-6 w-6 text-primary" />
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
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
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
                <Link to="/register/tutor">Join as a Tutor</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Index;
