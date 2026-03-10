import PageLayout from "@/components/layout/PageLayout";

const Terms = () => (
  <PageLayout>
    <section className="bg-primary py-16">
      <div className="container text-center">
        <h1 className="mb-4 text-4xl font-bold text-primary-foreground">Terms & Conditions</h1>
        <p className="text-lg text-primary-foreground/80">Last updated: March 2026</p>
      </div>
    </section>

    <section className="py-16">
      <div className="container">
        <div className="mx-auto max-w-3xl space-y-8 text-muted-foreground leading-relaxed">
          <div>
            <h2 className="mb-3 text-xl font-bold text-foreground">1. Acceptance of Terms</h2>
            <p>By accessing and using TutorHub, you agree to be bound by these terms and conditions. If you do not agree, please do not use the platform.</p>
          </div>
          <div>
            <h2 className="mb-3 text-xl font-bold text-foreground">2. User Accounts</h2>
            <p>Users must provide accurate information during registration. You are responsible for maintaining the security of your account credentials.</p>
          </div>
          <div>
            <h2 className="mb-3 text-xl font-bold text-foreground">3. Tutor Responsibilities</h2>
            <p>Tutors must provide accurate qualifications and maintain professional conduct. TutorHub reserves the right to suspend accounts that violate our guidelines.</p>
          </div>
          <div>
            <h2 className="mb-3 text-xl font-bold text-foreground">4. Booking & Payments</h2>
            <p>All payments are processed securely through Razorpay. Refund policies apply as per our refund guidelines. Students must book demo classes before enrolling in regular sessions.</p>
          </div>
          <div>
            <h2 className="mb-3 text-xl font-bold text-foreground">5. Cancellation Policy</h2>
            <p>Classes cancelled with less than 24 hours notice may be subject to a cancellation fee. Demo classes can be rescheduled free of charge.</p>
          </div>
          <div>
            <h2 className="mb-3 text-xl font-bold text-foreground">6. Privacy</h2>
            <p>We respect your privacy and handle personal data in accordance with applicable laws. Please refer to our Privacy Policy for details.</p>
          </div>
          <div>
            <h2 className="mb-3 text-xl font-bold text-foreground">7. Contact</h2>
            <p>For questions about these terms, please contact us at support@tutorhub.com.</p>
          </div>
        </div>
      </div>
    </section>
  </PageLayout>
);

export default Terms;
