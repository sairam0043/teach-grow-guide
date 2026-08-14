import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import PageLayout from "@/components/layout/PageLayout";
import { ShieldCheck, FileText, CheckCircle2, DollarSign, UserCheck, AlertCircle, Lock, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Terms = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <PageLayout>
      <Helmet>
        <title>Terms & Conditions | Cuvasol Tutor</title>
        <meta
          name="description"
          content="Official Terms & Conditions for Cuvasol Tutor. Read guidelines for students, tutors, 30% platform commission, monthly payouts, booking, and user policies."
        />
        <meta property="og:title" content="Terms & Conditions | Cuvasol Tutor" />
        <meta
          property="og:description"
          content="Review official terms of service, tutor commission guidelines, payment schedules, and user responsibilities for Cuvasol Tutor."
        />
        <meta property="og:url" content="https://tutor.cuvasol.com/terms" />
      </Helmet>

      {/* Header Banner */}
      <section className="bg-gradient-to-br from-primary via-indigo-900 to-slate-900 py-16 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="container relative z-10 text-center max-w-4xl">
          <Badge variant="outline" className="mb-4 px-4 py-1 border-white/30 text-white bg-white/10 backdrop-blur-md text-xs tracking-wider uppercase">
            Official Legal Agreement
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            Terms & Conditions
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Please read these terms carefully before registering or using the Cuvasol Tutor platform. Continued use indicates full acceptance of these terms.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 text-xs text-indigo-200 bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Effective Date: July 2026</span>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 bg-slate-50/50 dark:bg-slate-950/50">
        <div className="container max-w-5xl">
          <div className="grid gap-10">

            {/* Introduction Card */}
            <Card className="shadow-md border-border/60 bg-card">
              <CardContent className="p-8 space-y-4">
                <div className="flex items-center gap-3 text-primary font-bold text-lg">
                  <FileText className="h-6 w-6 text-indigo-600" />
                  <h2>Welcome to Cuvasol Tutor</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed text-base">
                  Welcome to Cuvasol Tutor. By registering, accessing, or using our platform, you agree to comply with and be bound by these Terms & Conditions. Please read them thoroughly before creating an account or booking any educational sessions.
                </p>
              </CardContent>
            </Card>

            {/* Section 1: General Terms */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2 border-b pb-3 border-border">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 text-sm font-extrabold">1</span>
                General Terms & Conditions
              </h2>
              <div className="grid gap-3 text-muted-foreground text-sm leading-relaxed pl-2">
                {[
                  "Users must provide accurate, complete, and verifiable registration information at all times.",
                  "Users are solely responsible for maintaining the confidentiality and security of their login credentials.",
                  "The platform reserves the right to suspend, restrict, or terminate accounts that violate these Terms or engage in unauthorized activity.",
                  "All users must comply with all applicable local, national, and international laws while using our services.",
                  "The platform may update or modify these Terms at any time. Continued use of the platform indicates acceptance of the updated Terms.",
                  "Users must not misuse the platform, attempt unauthorized access, reverse engineer system components, or interfere with system operations.",
                  "Cuvasol Tutor acts as an educational facilitator connecting students and qualified tutors, and is not responsible for personal disputes arising between users outside platform boundaries."
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 bg-card p-3.5 rounded-xl border border-border/50">
                    <CheckCircle2 className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2: Student Terms */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2 border-b pb-3 border-border">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700 text-sm font-extrabold">2</span>
                Student Terms & Conditions
              </h2>
              <div className="space-y-6">
                
                {/* Account Registration */}
                <div className="bg-card p-6 rounded-2xl border border-border/60 shadow-sm space-y-3">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-sky-600" /> Account Registration & Details
                  </h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                    <li>Students must register using accurate personal information and select their current Class / Grade and Board.</li>
                    <li>Students are responsible for updating their contact details and phone number in their profile.</li>
                    <li>One student may maintain only one active account unless explicitly approved by the platform.</li>
                  </ul>
                </div>

                {/* Booking & Payments */}
                <div className="bg-card p-6 rounded-2xl border border-border/60 shadow-sm space-y-3">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-emerald-600" /> Booking, Payments & Refunds
                  </h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                    <li>Students must pay the required session fees through secure platform channels before accessing paid tutoring sessions.</li>
                    <li>Payment confirmation is required before regular classes commence.</li>
                    <li>Refunds will be evaluated and processed strictly according to the platform’s official Refund Policy.</li>
                    <li>Any additional platform charges or taxes, if applicable, will be clearly communicated prior to payment.</li>
                  </ul>
                </div>

                {/* Attendance & Conduct */}
                <div className="bg-card p-6 rounded-2xl border border-border/60 shadow-sm space-y-3">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-indigo-600" /> Attendance, Conduct & Rescheduling
                  </h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                    <li>Students should join scheduled classes on time. Arriving significantly late may result in lost session time without compensation.</li>
                    <li>Missed classes without prior 24-hour notice may not be eligible for rescheduling.</li>
                    <li>Students must maintain respectful communication. Harassment, abusive language, discrimination, or inappropriate behavior will result in immediate ban.</li>
                    <li>Recording live sessions without tutor consent or sharing copyrighted material is strictly prohibited.</li>
                    <li>Tutors provide academic guidance but will not complete academic assignments or homework on behalf of students.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Section 3: Tutor Terms (Highlighting 30% Commission & Monthly Payouts) */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2 border-b pb-3 border-border">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 text-sm font-extrabold">3</span>
                Tutor Terms & Conditions
              </h2>

              {/* Highlighted Commission Callout */}
              <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white p-6 rounded-2xl border border-emerald-500/30 shadow-lg space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Platform Commission & Monthly Payout Policy</h3>
                    <p className="text-xs text-emerald-200">Mandatory financial clause for all registered tutors</p>
                  </div>
                </div>
                <div className="grid gap-3 text-sm leading-relaxed text-slate-200">
                  <div className="flex items-start gap-3 bg-white/10 p-4 rounded-xl border border-white/10">
                    <Badge className="bg-emerald-500 text-slate-950 font-bold shrink-0 mt-0.5">30% Commission</Badge>
                    <span>
                      <strong>Platform Service Fee:</strong> Cuvasol Tutor charges a <strong>30% platform service fee (commission)</strong> on all payments collected from students for bookings, courses, and tutoring sessions conducted via the platform.
                    </span>
                  </div>
                  <div className="flex items-start gap-3 bg-white/10 p-4 rounded-xl border border-white/10">
                    <Badge className="bg-indigo-400 text-slate-950 font-bold shrink-0 mt-0.5">End of Month</Badge>
                    <span>
                      <strong>Monthly Net Payout Schedule:</strong> Tutors will receive their remaining <strong>70% net payout earnings</strong> at the <strong>end of each calendar month</strong> for all completed sessions, transferred directly to their registered bank account or payout method.
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-card p-6 rounded-2xl border border-border/60 shadow-sm space-y-3">
                  <h3 className="text-lg font-semibold text-foreground">Eligibility & Tutor Responsibilities</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                    <li>Tutors must provide authentic educational qualifications, experience credentials, and identity verification documents.</li>
                    <li>Tutors must conduct professional, ethical, and well-prepared classes, joining sessions punctually.</li>
                    <li>Tutors must accurately specify the Boards (CBSE, ICSE, State Board, IB, IGCSE) and Classes/Grades they are qualified to teach.</li>
                    <li>Tutors retain ownership of their original teaching materials, but must not use copyrighted third-party content without permission.</li>
                    <li>Tutors must not solicit students to conduct classes outside the platform or circumvent platform payment systems. Violation results in permanent account termination.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Section 4: Intellectual Property & Prohibited Activities */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2 border-b pb-3 border-border">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 text-sm font-extrabold">4</span>
                Prohibited Activities & Account Suspension
              </h2>
              <div className="bg-card p-6 rounded-2xl border border-border/60 shadow-sm space-y-4">
                <p className="text-sm text-muted-foreground font-medium">Users are strictly prohibited from engaging in any of the following activities:</p>
                <div className="grid sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
                  {[
                    "Creating fake or duplicate accounts",
                    "Misrepresenting educational qualifications or credentials",
                    "Uploading malware, viruses, or malicious scripts",
                    "Engaging in fraudulent payment activities or chargebacks",
                    "Soliciting off-platform payments or private sessions",
                    "Impersonating another person or organization",
                    "Attempting to hack or disrupt platform servers",
                    "Sharing offensive, illegal, or harassing content"
                  ].map((act, i) => (
                    <div key={i} className="flex items-center gap-2 bg-secondary/10 p-3 rounded-lg border border-border/40">
                      <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 5: Limitation of Liability & Contact */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2 border-b pb-3 border-border">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700 text-sm font-extrabold">5</span>
                Limitation of Liability & Contact Info
              </h2>
              <div className="bg-card p-6 rounded-2xl border border-border/60 shadow-sm space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>
                  Cuvasol Tutor is not liable for internet connectivity failures, hardware issues, or third-party service disruptions. We do not guarantee specific examination scores or academic performance outcomes, as learning success depends on individual student dedication.
                </p>
                <p>
                  These Terms shall be governed by applicable laws. For any questions or official inquiries regarding these Terms & Conditions, please contact us:
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-foreground">
                  <span className="flex items-center gap-1.5 bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/20">
                    ✉️ support@cuvasol.com
                  </span>
                  <span className="flex items-center gap-1.5 bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/20">
                    🌐 https://tutor.cuvasol.com
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Terms;
