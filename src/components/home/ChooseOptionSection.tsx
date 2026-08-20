import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Video, CalendarCheck, MessageSquare } from "lucide-react";
import ConsultationModal from "./ConsultationModal";

export default function ChooseOptionSection() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const options = [
    {
      id: "consultation",
      icon: Video,
      title: "Schedule a Consultation",
      tag: "Free",
      description:
        "Book a free 20-minute consultation with our academic advisor. There's no commitment required - just an opportunity to discuss your goals, explore your options, and receive personalized guidance to help you plan your next steps.",
      buttonText: "Schedule a Free Consultation",
      onClick: () => setIsModalOpen(true),
    },
    {
      id: "demo",
      icon: CalendarCheck,
      title: "Book a Trial Lesson",
      tag: "$59",
      description:
        "Experience a full 60-minute lesson with one of our expert tutors and see how effective learning can be. There's no obligation to continue afterwards - and if you're not completely satisfied, we'll refund you in full.",
      buttonText: "Book a Trial Lesson",
      href: "/tutors",
    },
    {
      id: "contact",
      icon: MessageSquare,
      title: "Contact Us",
      tag: "Free",
      description:
        "Have questions about our platform, tutoring, or anything else? Our team is just a message away. Contact us to get quick answers, share your goals, or schedule a session that fits your needs. We will reply within a couple of hours maximum.",
      buttonText: "Contact Us",
      href: "/contact",
    },
  ];

  return (
    <section className="py-20 bg-background border-t border-border/40">
      <div className="container max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 text-center"
        >
          <h2 className="text-3xl font-bold text-foreground md:text-4xl tracking-tight">
            Choose the most suitable option for you
          </h2>
        </motion.div>

        <div className="grid gap-10 md:grid-cols-3">
          {options.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col justify-between"
            >
              <div>
                {/* Icon box matching layout in screenshot */}
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background shadow-xs text-foreground">
                  <item.icon className="h-6 w-6 stroke-[1.75]" />
                </div>

                {/* Title */}
                <h3 className="mb-4 text-lg font-bold text-foreground">
                  {item.title} - <span className="font-semibold text-foreground/90">{item.tag}</span>
                </h3>

                {/* Description */}
                <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>

              {/* Button Action */}
              <div>
                {item.onClick ? (
                  <button
                    onClick={item.onClick}
                    className="inline-flex items-center justify-center rounded-full bg-black hover:bg-neutral-800 text-white font-medium text-sm px-6 py-2.5 transition-colors duration-200 shadow-xs cursor-pointer"
                  >
                    {item.buttonText}
                  </button>
                ) : (
                  <Link
                    to={item.href || "#"}
                    className="inline-flex items-center justify-center rounded-full bg-black hover:bg-neutral-800 text-white font-medium text-sm px-6 py-2.5 transition-colors duration-200 shadow-xs"
                  >
                    {item.buttonText}
                  </Link>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Free Consultation Modal */}
      <ConsultationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </section>
  );
}
