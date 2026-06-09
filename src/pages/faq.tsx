import PageLayout from "@/components/layout/PageLayout";
import { Card, CardContent } from "@/components/ui/card";

const FAQ = () => {
  return (
    <PageLayout>
      <section className="bg-gray-100 py-12 min-h-screen">
        <div className="container mx-auto px-4">
          <Card className="mx-auto max-w-4xl shadow-md">
            <CardContent className="p-6">
              <h2 className="mb-6 text-4xl font-bold">
                Frequently Asked Questions
              </h2>

              <div className="space-y-5 text-lg">
                <div>
                  <h3 className="font-bold">How do I find a tutor?</h3>
                  <p className="text-gray-700">
                    Use our Browse Tutors page to search by subject, class,
                    location, and more. You can filter results to find tutors
                    that match your specific requirements.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold">
                    How do I request a demo class?
                  </h3>
                  <p className="text-gray-700">
                    Once you find a tutor you're interested in, visit their
                    profile page and fill out the demo class request form.
                    The tutor will contact you to schedule a session.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold">
                    How can I become a tutor?
                  </h3>
                  <p className="text-gray-700">
                    Visit our Become a Tutor page and fill out the application
                    form. Our team will review your application and get back
                    to you within 2-3 business days.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold">
                    Are all tutors verified?
                  </h3>
                  <p className="text-gray-700">
                    Yes, every tutor on our platform undergoes a comprehensive
                    verification process including background checks,
                    credential validation, and quality assessment.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold">
                    What are your operating hours?
                  </h3>
                  <p className="text-gray-700">
                    Our support team is available Monday to Saturday,
                    9:00 AM to 6:00 PM. We respond to all inquiries within
                    24 hours.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </PageLayout>
  );
};

export default FAQ;