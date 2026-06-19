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
    question: "What does the 'AI' in 'AI Future Skills' stand for?",
    options: [
      "Active Internet",
      "Artificial Intelligence",
      "Automated Information",
      "Advanced Integration"
    ]
  },
  {
    id: "q2",
    question: "Which of the following is an example of an AI-powered system that can write essays, answer questions, and write code?",
    options: [
      "A search engine like Google",
      "A chatbot like ChatGPT",
      "A media player like VLC",
      "A calculator"
    ]
  },
  {
    id: "q3",
    question: "How does a machine learning model learn to recognize a dog in an image?",
    options: [
      "By looking at thousands of labeled dog photos",
      "By searching the dictionary for the word 'dog'",
      "By painting a dog picture",
      "By asking a human for the answer every time"
    ]
  },
  {
    id: "q4",
    question: "What is 'prompt engineering' in the context of generative AI?",
    options: [
      "Repairing computer screens",
      "Writing clear instructions to guide an AI's response",
      "Designing computer microchips",
      "Programming video game graphics"
    ]
  },
  {
    id: "q5",
    question: "When an AI chatbot creates an answer that sounds very convincing but is completely made up and incorrect, this is called:",
    options: [
      "A dream state",
      "A data backup",
      "A hallucination",
      "A system reboot"
    ]
  },
  {
    id: "q6",
    question: "Why is data important for training Artificial Intelligence models?",
    options: [
      "AI models use data to find patterns and learn from examples",
      "Data is only used to make the computer run faster",
      "AI models do not need data to learn",
      "Data protects the computer from virus attacks"
    ]
  },
  {
    id: "q7",
    question: "What is an 'algorithm' in computer science?",
    options: [
      "A step-by-step set of instructions to solve a problem",
      "The physical keyboard of a laptop",
      "A type of internet connection speed",
      "A computer screen saver"
    ]
  },
  {
    id: "q8",
    question: "What is the main difference between a regular computer and an AI robot?",
    options: [
      "A robot can feel real emotions",
      "A robot has physical sensors and actuators to interact with the physical world",
      "A computer does not use electricity",
      "A robot does not use software"
    ]
  },
  {
    id: "q9",
    question: "What is a 'deepfake'?",
    options: [
      "A hard drive that holds lots of data",
      "An AI-generated fake video or image that looks extremely realistic",
      "A search engine for the deep web",
      "A type of secure password"
    ]
  },
  {
    id: "q10",
    question: "If an AI tool asks you to upload personal details like your home address or phone number to test its features, what is the best practice?",
    options: [
      "Provide the real details immediately",
      "Ask your friends for their details instead",
      "Do not share personal details and check with a parent or teacher",
      "Make up fake details and share them anyway"
    ]
  }
];

const THEORETICAL_QUESTIONS = [
  {
    id: "t1",
    question: "In your own words, explain how an AI model learns to complete a task (like identifying fruits or predicting weather) without being explicitly programmed for it."
  },
  {
    id: "t2",
    question: "Imagine you want an AI chatbot to help you write a science fiction story about a friendly robot. Write a good, detailed prompt that you would use to get the best result."
  },
  {
    id: "t3",
    question: "Why is it important to make sure that the data used to train AI models is fair and diverse? What could happen if the data is biased?"
  },
  {
    id: "t4",
    question: "Identify one way you or your family uses AI in daily life (e.g., streaming recommendations, map navigation, voice helpers) and explain how it makes tasks easier."
  },
  {
    id: "t5",
    question: "If you use an AI tool to write an assignment or project for school, why is it risky to copy and paste the answer directly without reading or editing it?"
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
    const unansweredMCQ = QUESTIONS.filter((q) => !answers[q.id]);
    const unansweredTheo = THEORETICAL_QUESTIONS.filter((t) => !answers[t.id] || answers[t.id].trim().length < 10);
    
    if (unansweredMCQ.length > 0 || unansweredTheo.length > 0) {
      toast.warning(
        `Please answer all questions. (${unansweredMCQ.length} MCQs and ${unansweredTheo.length} written questions remaining or too short)`
      );
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
            <strong>Assessment Rules:</strong> This assessment comprises 10 multiple-choice questions (Part A) and 5 written explanations (Part B) evaluating your understanding of AI, prompts, and technology ethics. Once submitted, your score will be stored. You have <strong>one attempt</strong> only. Ensure your internet connection is stable before submitting.
          </div>
        </div>

        {/* Questions form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Part A: MCQs */}
          <div className="space-y-6">
            <div className="border-b pb-2">
              <h2 className="text-xl font-bold text-teal-700 dark:text-teal-400 flex items-center gap-2">
                <CheckCircle className="h-5.5 w-5.5 text-teal-600" />
                Part A: Multiple Choice Questions (50 Points)
              </h2>
              <p className="text-xs text-muted-foreground mt-1">Select the correct answer for each of the following 10 questions. (5 points each)</p>
            </div>

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
          </div>

          {/* Part B: Theoretical Questions */}
          <div className="space-y-6 pt-6 border-t border-border/40">
            <div className="border-b pb-2">
              <h2 className="text-xl font-bold text-teal-700 dark:text-teal-400 flex items-center gap-2">
                <BookOpen className="h-5.5 w-5.5 text-teal-600" />
                Part B: Written Explanations (50 Points)
              </h2>
              <p className="text-xs text-muted-foreground mt-1">Provide short explanations in your own words. Answers are auto-evaluated and verified by an administrator. (10 points each)</p>
            </div>

            {THEORETICAL_QUESTIONS.map((t, idx) => (
              <Card key={t.id} className="border border-border/40 shadow-sm">
                <CardHeader className="bg-secondary/10 pb-4 border-b">
                  <CardTitle className="text-base font-bold text-foreground flex items-start gap-2.5 leading-snug">
                    <span className="h-6 w-6 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-400 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {QUESTIONS.length + idx + 1}
                    </span>
                    {t.question}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <textarea
                    rows={4}
                    placeholder="Type your answer here (minimum 10 characters)..."
                    value={answers[t.id] || ""}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [t.id]: e.target.value }))}
                    className="w-full rounded-xl border border-border/40 bg-card p-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all font-sans leading-relaxed"
                  />
                </CardContent>
              </Card>
            ))}
          </div>

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
