import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Clock, CheckCircle, AlertTriangle, BookOpen, Sparkles, Award, ArrowLeft, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageLayout from "@/components/layout/PageLayout";
import { toast } from "@/components/ui/sonner";
import axios from "axios";
import API_URL from "@/config/api";

const QUESTIONS = [
  {
    id: "q1",
    question: "What does 'AI' stand for?",
    options: [
      "Apple Intelligence",
      "Artificial Intelligence",
      "Automated Information",
      "Algorithmic Integration"
    ]
  },
  {
    id: "q2",
    question: "What is prompt engineering?",
    options: [
      "Designing computer hardware",
      "Writing instructions to guide an AI's response",
      "Repairing electric motors",
      "Creating neural networks"
    ]
  },
  {
    id: "q3",
    question: "If an AI gives an answer that looks correct but is completely made up, what is this called?",
    options: [
      "Hallucination",
      "Dream state",
      "Logic error",
      "Glitch"
    ]
  },
  {
    id: "q4",
    question: "Which of the following is a key practice of AI safety and ethics?",
    options: [
      "Sharing your private passwords with AI chatbots",
      "Reviewing AI output for bias, truthfulness, and safety",
      "Using AI to write essays and claiming them as your own original work",
      "Letting AI make critical decisions without human oversight"
    ]
  }
];

const AIAssessment = () => {
  const { paymentId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"valid" | "attempted" | "expired" | "error">("valid");
  const [studentDetails, setStudentDetails] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [score, setScore] = useState<number | null>(null);

  // Load assessment status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/payments/assessment/${paymentId}`);
        const data = res.data;
        setStatus(data.status);
        setStudentDetails(data);
        if (data.status === "valid") {
          setRemainingMs(data.remainingMs);
        } else if (data.status === "attempted") {
          setScore(data.score);
        }
      } catch (err: any) {
        console.error(err);
        setStatus("error");
        toast.error(err.response?.data?.message || "Failed to load assessment.");
      } finally {
        setLoading(false);
      }
    };
    if (paymentId) {
      fetchStatus();
    }
  }, [paymentId]);

  // Countdown timer logic
  useEffect(() => {
    if (status !== "valid" || remainingMs <= 0) return;

    const interval = setInterval(() => {
      setRemainingMs((prev) => {
        if (prev <= 1000) {
          clearInterval(interval);
          setStatus("expired");
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, remainingMs]);

  const handleSelectOption = (questionId: string, option: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: option
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate that all questions are answered
    const unanswered = QUESTIONS.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      toast.warning(`Please answer all questions before submitting. (${unanswered.length} remaining)`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await axios.post(`${API_URL}/payments/assessment/${paymentId}/submit`, {
        answers
      });
      toast.success("Assessment submitted and graded successfully!");
      setScore(res.data.score);
      setStatus("attempted");
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to submit assessment.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="container py-20 flex flex-col items-center justify-center min-h-[50vh]">
          <div className="h-10 w-10 rounded-full border-4 border-teal-600 border-t-transparent animate-spin mb-4"></div>
          <p className="text-muted-foreground text-sm font-semibold">Loading assessment credentials...</p>
        </div>
      </PageLayout>
    );
  }

  if (status === "error") {
    return (
      <PageLayout>
        <div className="container py-12 max-w-md mx-auto">
          <Card className="border-rose-500/20 shadow-xl text-center p-8 bg-card/60 backdrop-blur-md">
            <ShieldAlert className="mx-auto h-16 w-16 text-rose-500 mb-4 animate-bounce" />
            <h3 className="text-2xl font-extrabold text-foreground tracking-tight">Invalid Link</h3>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              We couldn't verify this assessment reference. Make sure the link matches the email invitation exactly.
            </p>
            <Button className="mt-6 w-full" asChild>
              <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Go to Home</Link>
            </Button>
          </Card>
        </div>
      </PageLayout>
    );
  }

  if (status === "expired") {
    return (
      <PageLayout>
        <div className="container py-12 max-w-md mx-auto">
          <Card className="border-amber-500/20 shadow-xl text-center p-8 bg-card/60 backdrop-blur-md">
            <AlertTriangle className="mx-auto h-16 w-16 text-amber-500 mb-4 animate-pulse" />
            <h3 className="text-2xl font-extrabold text-foreground tracking-tight">Link Expired</h3>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              Hello, <strong>{studentDetails?.studentName}</strong>. This assessment registration link expired. The link was only valid for 24 hours after registration.
            </p>
            <div className="bg-amber-500/5 text-amber-800 dark:text-amber-300 p-4 border border-amber-500/10 rounded-xl text-xs mt-4">
              Please contact <a href="mailto:support@cuvasol.com" className="font-bold underline">support@cuvasol.com</a> for assistance or a link extension.
            </div>
            <Button className="mt-6 w-full bg-amber-600 hover:bg-amber-700 text-white font-bold" asChild>
              <Link to="/dashboard/student">Go to Student Dashboard</Link>
            </Button>
          </Card>
        </div>
      </PageLayout>
    );
  }

  if (status === "attempted") {
    return (
      <PageLayout>
        <div className="container py-12 max-w-lg mx-auto">
          <Card className="border-teal-500/20 shadow-xl text-center p-8 bg-card/60 backdrop-blur-md">
            <Award className="mx-auto h-16 w-16 text-teal-600 mb-4 animate-bounce" />
            <h3 className="text-3xl font-extrabold text-foreground tracking-tight">Assessment Submitted</h3>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              Well done, <strong>{studentDetails?.studentName}</strong>! You have completed the AI Future Skills Assessment.
            </p>

            <div className="my-6 p-6 bg-gradient-to-r from-teal-500/10 to-teal-500/5 border border-teal-500/20 rounded-2xl">
              <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground block">Your Scored Grade</span>
              <span className="text-4xl font-extrabold text-teal-600 mt-2 block">{score}/100</span>
              <span className="text-xs text-muted-foreground mt-2 block">
                {score && score >= 75 
                  ? "Excellent job! You demonstrated deep comprehension of AI concepts." 
                  : score && score >= 50 
                    ? "Great attempt! You passed the core concept test." 
                    : "Submission saved. Admissions team will review your application shortly."}
              </span>
            </div>

            <p className="text-xs text-muted-foreground leading-normal mb-6">
              Our admissions team will review your score and update your shortlisting status shortly. You will receive an email once shortlisting is complete.
            </p>

            <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-5 rounded-xl" asChild>
              <Link to="/dashboard/student">Go to Dashboard</Link>
            </Button>
          </Card>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container py-8 max-w-3xl">
        {/* Course Assessment Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="space-y-1">
            <Badge className="bg-teal-600 text-white py-1 px-3">Admissions Open</Badge>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-teal-600" />
              AI Future Skills Assessment
            </h1>
            <p className="text-sm text-muted-foreground">
              Candidate: <strong className="text-foreground">{studentDetails?.studentName}</strong> ({studentDetails?.studentEmail})
            </p>
          </div>

          {/* Time Remaining Bar */}
          <div className="flex items-center gap-2.5 bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 rounded-xl shrink-0">
            <Clock className="h-5 w-5 text-rose-600 animate-pulse" />
            <div>
              <span className="text-[10px] text-rose-500 uppercase font-extrabold block leading-tight">Link Expiry Timer</span>
              <span className="font-mono text-sm font-bold text-rose-600">{formatTime(remainingMs)}</span>
            </div>
          </div>
        </div>

        {/* Informative Note */}
        <div className="bg-secondary/30 border border-border/40 p-4 rounded-2xl flex items-start gap-3 mb-6">
          <BookOpen className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <strong>Assessment Rules:</strong> This assessment comprises 4 questions evaluating basic conceptual knowledge of artificial intelligence, prompt instructions, and digital ethics. Once submitted, your score will be stored in the database. You have <strong>one attempt</strong> only. Ensure your internet connection is stable before submitting.
          </div>
        </div>

        {/* Questions form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {QUESTIONS.map((q, idx) => (
            <Card key={q.id} className="border border-border/40 shadow-sm">
              <CardHeader className="bg-secondary/10 pb-4 border-b">
                <CardTitle className="text-base font-bold text-foreground flex items-start gap-2.5 leading-snug">
                  <span className="h-6 w-6 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-400 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  {q.question}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3.5">
                {q.options.map((opt, oIdx) => {
                  const isSelected = answers[q.id] === opt;
                  return (
                    <label
                      key={oIdx}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer hover:bg-secondary/20 hover:border-teal-500/20 transition-all ${
                        isSelected 
                          ? "border-teal-500 bg-teal-500/5 text-teal-700 dark:text-teal-300 font-medium" 
                          : "border-border/40 bg-card text-muted-foreground"
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={opt}
                        checked={isSelected}
                        onChange={() => handleSelectOption(q.id, opt)}
                        className="mt-0.5 accent-teal-600 focus:ring-teal-500 h-4 w-4"
                      />
                      <span className="text-sm leading-snug">{opt}</span>
                    </label>
                  );
                })}
              </CardContent>
            </Card>
          ))}

          {/* Action button */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-6 text-base rounded-2xl shadow-md transition-all duration-300"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"></span>
                  Grading & Submitting...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-5 w-5" /> Submit Assessment
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
};

export default AIAssessment;
