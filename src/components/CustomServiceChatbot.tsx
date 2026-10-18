import { useState, useRef, useEffect } from "react";
import axios from "axios";
import {
  MessageCircle,
  X,
  Minus,
  Send,
  Bot,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Loader2,
  AlertCircle
} from "lucide-react";
import API_URL from "@/config/api";

type Category = "Student" | "Tutor";

type ChatMessage = {
  id: number;
  sender: "bot" | "user";
  text: string;
};

type Step = "category" | "name" | "email" | "message" | "done";

export default function CustomServiceChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>("category");
  const [category, setCategory] = useState<Category | "">("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, step, isOpen, sending]);

  // Focus input when step changes to text entry
  useEffect(() => {
    if (isOpen && (step === "name" || step === "email" || step === "message")) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [step, isOpen]);

  const addMessage = (sender: ChatMessage["sender"], text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), sender, text },
    ]);
  };

  const openChat = () => {
    setIsOpen(true);
    if (messages.length === 0) {
      setMessages([
        {
          id: Date.now(),
          sender: "bot",
          text: "Hello! 👋 Welcome to Cuvasol Tutor.\nLooking for a tailored tutoring arrangement or customized support? Please let us know who you are to get started:",
        },
      ]);
    }
  };

  const handleReset = () => {
    setStep("category");
    setCategory("");
    setName("");
    setEmail("");
    setMessage("");
    setInput("");
    setErrorMessage(null);
    setMessages([
      {
        id: Date.now(),
        sender: "bot",
        text: "Hello! 👋 How can we help you with custom services today?",
      },
    ]);
  };

  const selectCategory = (value: Category) => {
    setCategory(value);
    setErrorMessage(null);
    addMessage("user", `I am a ${value}`);
    addMessage("bot", "Great! May I know your full name?");
    setInput("");
    setStep("name");
  };

  const submitCustomService = async (msgText: string) => {
    setSending(true);
    setErrorMessage(null);

    try {
      await axios.post(`${API_URL}/custom-service`, {
        category,
        name,
        email,
        message: msgText,
      });

      addMessage(
        "bot",
        "Thank you! 🎉 Your custom service request has been submitted successfully.\n\nOur team will review your requirements and reach out to you via email shortly."
      );
      setStep("done");
    } catch (error: any) {
      console.error("Custom service request failed:", error);
      const serverMsg =
        error.response?.data?.message ||
        "Sorry, we could not submit your request due to a network or server issue. Please try again.";
      setErrorMessage(serverMsg);
      addMessage(
        "bot",
        `⚠️ ${serverMsg}\n\nYou can click 'Retry' or edit your message below.`
      );
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    const value = input.trim();
    if (!value || sending || step === "done") return;

    if (step === "name") {
      if (value.length < 2) {
        addMessage("bot", "Please enter a valid full name (at least 2 characters).");
        return;
      }

      setName(value);
      addMessage("user", value);
      setInput("");
      addMessage("bot", `Thank you, ${value}! Please enter your email address:`);
      setStep("email");
      return;
    }

    if (step === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        addMessage("bot", "Please enter a valid email address (e.g. name@example.com).");
        return;
      }

      setEmail(value);
      addMessage("user", value);
      setInput("");
      addMessage(
        "bot",
        "Got it! Please tell us about the custom service you need:"
      );
      setStep("message");
      return;
    }

    if (step === "message") {
      if (value.length < 5) {
        addMessage("bot", "Please provide a little more detail (at least 5 characters).");
        return;
      }

      setMessage(value);
      addMessage("user", value);
      setInput("");
      await submitCustomService(value);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[9999] font-sans">
      {isOpen && (
        <div className="mb-3 flex h-[min(580px,80vh)] w-[min(380px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl transition-all duration-200">
          {/* Header */}
          <div className="flex items-center gap-3 bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 p-4 text-white shadow-sm">
            <div className="rounded-full bg-white/20 p-2 text-white backdrop-blur-xs">
              <Bot size={22} className="text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm leading-tight truncate">
                Cuvasol Assistant
              </h3>
              <p className="text-[11px] text-blue-100 flex items-center gap-1.5 mt-0.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                Custom Service Support
              </p>
            </div>

            <button
              type="button"
              onClick={handleReset}
              title="Restart conversation"
              aria-label="Restart conversation"
              className="rounded-lg p-1.5 text-white/80 hover:text-white hover:bg-white/10 transition"
            >
              <RotateCcw size={16} />
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Minimize chatbot"
              className="rounded-lg p-1.5 text-white/80 hover:text-white hover:bg-white/10 transition"
            >
              <Minus size={18} />
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close chatbot"
              className="rounded-lg p-1.5 text-white/80 hover:text-white hover:bg-white/10 transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Body */}
          <div
            className="flex-1 space-y-3 overflow-y-auto bg-gray-50/70 dark:bg-gray-950/40 p-4"
            aria-live="polite"
          >
            {messages.map((item) => (
              <div
                key={item.id}
                className={`flex ${
                  item.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                    item.sender === "user"
                      ? "bg-blue-600 text-white rounded-tr-none"
                      : "border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-none"
                  }`}
                >
                  {item.text}
                </div>
              </div>
            ))}

            {/* Category selection chips */}
            {step === "category" && messages.length > 0 && (
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => selectCategory("Student")}
                  className="flex items-center justify-between rounded-xl border border-blue-200 dark:border-blue-900/40 bg-white dark:bg-gray-800 p-3 text-left text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition shadow-2xs"
                >
                  <span>🎓 I am a Student / Parent</span>
                  <span className="text-blue-600 dark:text-blue-400 text-xs font-semibold">Select →</span>
                </button>
                <button
                  type="button"
                  onClick={() => selectCategory("Tutor")}
                  className="flex items-center justify-between rounded-xl border border-blue-200 dark:border-blue-900/40 bg-white dark:bg-gray-800 p-3 text-left text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition shadow-2xs"
                >
                  <span>👩‍🏫 I am a Tutor</span>
                  <span className="text-blue-600 dark:text-blue-400 text-xs font-semibold">Select →</span>
                </button>
              </div>
            )}

            {/* Sending indicator */}
            {sending && (
              <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 p-2.5 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <Loader2 size={14} className="animate-spin" />
                <span>Submitting your request to our team...</span>
              </div>
            )}

            {/* Error retry option */}
            {errorMessage && !sending && step === "message" && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => message && submitCustomService(message)}
                  className="text-xs px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition"
                >
                  Retry Submission
                </button>
              </div>
            )}

            {/* Completion card */}
            {step === "done" && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl text-center space-y-2 mt-2">
                <CheckCircle2 size={32} className="mx-auto text-emerald-600 dark:text-emerald-400" />
                <h4 className="font-semibold text-xs text-emerald-900 dark:text-emerald-200">
                  Request Received
                </h4>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  We have logged your custom service request. An advisor will contact you within 24 hours.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 font-medium transition shadow-xs"
                  >
                    <RotateCcw size={12} />
                    Submit Another Request
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          {step !== "category" && step !== "done" && (
            <form
              className="flex items-center gap-2 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSend();
              }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={
                  step === "name"
                    ? "Enter your full name..."
                    : step === "email"
                    ? "Enter your email address..."
                    : "Describe the custom service you need..."
                }
                type={step === "email" ? "email" : "text"}
                disabled={sending}
                className="min-w-0 flex-1 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-xs sm:text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900 transition"
              />

              <button
                type="submit"
                disabled={sending || !input.trim()}
                aria-label="Send message"
                className="rounded-full bg-blue-600 hover:bg-blue-700 p-2.5 text-white disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0"
              >
                <Send size={16} />
              </button>
            </form>
          )}
        </div>
      )}

      {/* Floating Launcher Button */}
      <button
        type="button"
        onClick={isOpen ? () => setIsOpen(false) : openChat}
        aria-label={isOpen ? "Close chatbot" : "Open Cuvasol Assistant"}
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-blue-500/25 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        {isOpen ? <X size={26} /> : <MessageCircle size={26} />}
      </button>
    </div>
  );
}
