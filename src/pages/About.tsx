import { Users, Award, Heart, Target } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";

const values = [
  { icon: Heart, title: "Student First", description: "Every decision we make starts with what's best for our students and their learning outcomes." },
  { icon: Award, title: "Quality Tutors", description: "We carefully vet every tutor to ensure our students receive world-class education." },
  { icon: Target, title: "Personalized Learning", description: "One-size-fits-all doesn't work. We match students with tutors who fit their unique needs." },
  { icon: Users, title: "Community", description: "We're building a community of lifelong learners and passionate educators." },
];

const About = () => (
  <PageLayout>
    <section className="bg-primary py-16">
      <div className="container text-center">
        <h1 className="mb-4 text-4xl font-bold text-primary-foreground">About TutorHub</h1>
        <p className="mx-auto max-w-2xl text-lg text-primary-foreground/80">
          We're on a mission to make quality education accessible to every student by connecting them with expert tutors.
        </p>
      </div>
    </section>

    <section className="py-16">
      <div className="container">
        <div className="mx-auto max-w-3xl space-y-6 text-muted-foreground leading-relaxed">
          <p>
            TutorHub was founded with a simple belief: every student deserves access to great teachers. We connect students with vetted, experienced tutors across academics and extracurricular activities.
          </p>
          <p>
            Our platform makes it easy to discover tutors, book demo classes, and schedule weekly learning sessions — all with transparent pricing and secure payments.
          </p>
        </div>
      </div>
    </section>

    <section className="bg-secondary/50 py-16">
      <div className="container">
        <h2 className="mb-10 text-center text-3xl font-bold text-foreground">Our Values</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <div key={v.title} className="rounded-xl border bg-card p-6 text-center shadow-card">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <v.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-card-foreground">{v.title}</h3>
              <p className="text-sm text-muted-foreground">{v.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  </PageLayout>
);

export default About;
