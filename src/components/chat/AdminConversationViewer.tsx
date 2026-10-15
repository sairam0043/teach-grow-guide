import { useEffect, useState, useRef } from "react";
import axios from "axios";
import API_URL from "@/config/api";
import { resolveAssetUrl } from "@/lib/assetUrl";
import { 
  Shield, MessageSquare, Search, User, ExternalLink, Calendar, 
  FileText, Download, Eye, Clock, GraduationCap, CheckCircle2, 
  RefreshCw, Users, ShieldAlert, Sparkles, Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { format, isToday, isYesterday } from "date-fns";
import { Link } from "react-router-dom";

interface AdminConversation {
  id: string;
  user1: any;
  user2: any;
  tutor: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    phone?: string;
    city?: string;
    subjects?: string[];
    isVerified?: boolean;
  };
  student: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    phone?: string;
    student_class?: string;
  };
  lastMessage: {
    text: string;
    attachments: any[];
    createdAt: string;
    senderId: string;
  };
  messageCount: number;
}

const formatMessageTime = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    if (isToday(d)) return format(d, "h:mm a");
    if (isYesterday(d)) return `Yesterday ${format(d, "h:mm a")}`;
    return format(d, "MMM d, h:mm a");
  } catch {
    return "";
  }
};

const AdminConversationViewer = () => {
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<AdminConversation | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/messages/admin/all-conversations`);
      const list = Array.isArray(res.data) ? res.data : [];
      setConversations(list);
      if (list.length > 0 && !selectedConversation) {
        setSelectedConversation(list[0]);
      }
    } catch (err) {
      console.error("Failed to fetch admin conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    const fetchChatHistory = async () => {
      try {
        setLoadingChat(true);
        const res = await axios.get(
          `${API_URL}/messages/admin/chat/${selectedConversation.tutor.id}/${selectedConversation.student.id}`
        );
        setMessages(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error fetching chat history for admin:", err);
      } finally {
        setLoadingChat(false);
      }
    };

    fetchChatHistory();
  }, [selectedConversation]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const filteredConversations = conversations.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const tName = (c.tutor?.name || "").toLowerCase();
    const tEmail = (c.tutor?.email || "").toLowerCase();
    const sName = (c.student?.name || "").toLowerCase();
    const sEmail = (c.student?.email || "").toLowerCase();
    const lastTxt = (c.lastMessage?.text || "").toLowerCase();
    const subjects = (c.tutor?.subjects || []).join(" ").toLowerCase();
    return (
      tName.includes(q) ||
      tEmail.includes(q) ||
      sName.includes(q) ||
      sEmail.includes(q) ||
      lastTxt.includes(q) ||
      subjects.includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Security Audit Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-teal-500/10 border border-indigo-200/50 dark:border-indigo-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              Student & Tutor Safety & Security Audit Log
              <Badge variant="outline" className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200">
                Audited
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              For trust, safety, and dispute resolution, platform administrators can review messaging exchanges between students and tutors.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchConversations}
          disabled={loading}
          className="rounded-xl text-xs font-semibold gap-1.5 shrink-0 self-end sm:self-center border-border hover:bg-secondary"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Main Split Panel */}
      <div className="grid grid-cols-1 grid-rows-2 lg:grid-rows-1 lg:grid-cols-12 gap-6 h-[750px] min-h-[620px] max-h-[750px]">
        {/* Left: Conversations Directory */}
        <div className="lg:col-span-5 flex min-h-0 flex-col rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
          <div className="p-4 border-b bg-secondary/20 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-500" />
                Conversations ({conversations.length})
              </h4>
              <span className="text-xs text-muted-foreground font-medium">
                {filteredConversations.length} matching
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by student, tutor, or text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 rounded-xl bg-background text-xs"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-border/40">
            {loading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground p-6">
                <MessageSquare className="mx-auto mb-3 h-10 w-10 opacity-30 text-indigo-500" />
                <h5 className="font-semibold text-sm text-foreground mb-1">No Conversations Found</h5>
                <p className="text-xs">
                  {searchQuery ? `No chats match "${searchQuery}"` : "No student-tutor messages have been sent yet."}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedConversation?.id === conv.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full text-left p-3.5 transition-all flex flex-col gap-2 hover:bg-secondary/40 ${
                      isSelected ? "bg-indigo-50/70 dark:bg-indigo-950/30 border-l-4 border-indigo-600" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      {/* Tutor Info */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200/50 overflow-hidden">
                          {conv.tutor?.avatar ? (
                            <img src={resolveAssetUrl(conv.tutor.avatar)} alt="" className="h-full w-full object-cover" />
                          ) : (
                            (conv.tutor?.name || "T").charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="truncate">
                          <span className="font-bold text-xs text-foreground block truncate">
                            {conv.tutor?.name || "Tutor"}
                          </span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block">
                            Tutor {conv.tutor?.city ? `• ${conv.tutor.city}` : ""}
                          </span>
                        </div>
                      </div>

                      {/* Arrow / Exchange symbol */}
                      <span className="text-muted-foreground text-xs font-bold px-1 shrink-0">↔</span>

                      {/* Student Info */}
                      <div className="flex items-center gap-2 min-w-0 justify-end text-right">
                        <div className="truncate">
                          <span className="font-bold text-xs text-foreground block truncate">
                            {conv.student?.name || "Student"}
                          </span>
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium block">
                            {conv.student?.student_class || "Student"}
                          </span>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-200/50 overflow-hidden">
                          {conv.student?.avatar ? (
                            <img src={resolveAssetUrl(conv.student.avatar)} alt="" className="h-full w-full object-cover" />
                          ) : (
                            (conv.student?.name || "S").charAt(0).toUpperCase()
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Last message preview */}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/30">
                      <p className="truncate max-w-[220px] italic">
                        "{conv.lastMessage?.text || "Attachment"}"
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                          {conv.messageCount} msg{conv.messageCount > 1 ? "s" : ""}
                        </Badge>
                        <span className="text-[10px]">{formatMessageTime(conv.lastMessage?.createdAt)}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Full Chat Transcript */}
        <div className="lg:col-span-7 flex min-h-0 flex-col rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
          {selectedConversation ? (
            <>
              {/* Transcript Header */}
              <div className="p-4 border-b bg-secondary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2 overflow-hidden">
                    <div className="inline-block h-9 w-9 rounded-full ring-2 ring-background bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                      {(selectedConversation.tutor?.name || "T").charAt(0)}
                    </div>
                    <div className="inline-block h-9 w-9 rounded-full ring-2 ring-background bg-indigo-100 text-indigo-800 font-bold text-xs flex items-center justify-center">
                      {(selectedConversation.student?.name || "S").charAt(0)}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                      <span>{selectedConversation.tutor.name}</span>
                      <span className="text-muted-foreground font-normal">↔</span>
                      <span>{selectedConversation.student.name}</span>
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Tutor: {selectedConversation.tutor.email} • Student: {selectedConversation.student.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Badge variant="outline" className="text-[11px] bg-background">
                    {messages.length} Total Messages
                  </Badge>
                </div>
              </div>

              {/* Security Header Strip */}
              <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-200">
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                  Read-only audit mode — messages are captured in real-time
                </span>
                <span className="font-semibold text-[10px] uppercase tracking-wider">Audit Log</span>
              </div>

              {/* Chat Messages Body */}
              <div ref={chatContainerRef} className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4 bg-secondary/5">
                {loadingChat ? (
                  <div className="space-y-4 py-8">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                        <Skeleton className="h-14 w-64 rounded-2xl" />
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-20 text-center text-muted-foreground">
                    <p className="text-sm">No messages in this conversation thread.</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isTutor = msg.sender?.role === "tutor" || msg.sender?._id === selectedConversation.tutor.id;
                    const senderName = isTutor ? selectedConversation.tutor.name : selectedConversation.student.name;
                    const senderRole = isTutor ? "Tutor" : "Student";

                    return (
                      <div
                        key={msg._id || idx}
                        className={`flex flex-col ${isTutor ? "items-start" : "items-end"} gap-1`}
                      >
                        <div className="flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
                          <span className="font-bold text-foreground">{senderName}</span>
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1 py-0 h-4 border-none font-bold ${
                              isTutor
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                            }`}
                          >
                            {senderRole}
                          </Badge>
                          <span>•</span>
                          <span>{formatMessageTime(msg.createdAt)}</span>
                        </div>

                        <div
                          className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm text-sm ${
                            isTutor
                              ? "bg-emerald-500/10 border border-emerald-500/20 text-foreground rounded-tl-none"
                              : "bg-indigo-600 text-white rounded-tr-none"
                          }`}
                        >
                          {msg.text && (
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                          )}

                          {/* Attachments */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                              {msg.attachments.map((att: any, aIdx: number) => {
                                const isImg = att.fileType === "image";
                                return (
                                  <div
                                    key={aIdx}
                                    className={`p-2 rounded-xl flex items-center justify-between gap-3 text-xs ${
                                      isTutor
                                        ? "bg-card border border-border"
                                        : "bg-indigo-700/80 text-white border border-indigo-500/40"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      {isImg ? (
                                        <div
                                          onClick={() => setLightboxImage(resolveAssetUrl(att.url))}
                                          className="h-9 w-9 rounded-lg overflow-hidden shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                                        >
                                          <img
                                            src={resolveAssetUrl(att.url)}
                                            alt=""
                                            className="h-full w-full object-cover"
                                          />
                                        </div>
                                      ) : (
                                        <FileText className="h-5 w-5 shrink-0 opacity-80" />
                                      )}
                                      <span className="truncate font-medium">{att.filename}</span>
                                    </div>

                                    <a
                                      href={resolveAssetUrl(att.url)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      download={att.filename}
                                      className={`p-1.5 rounded-lg transition-colors ${
                                        isTutor
                                          ? "hover:bg-secondary text-primary"
                                          : "hover:bg-indigo-600 text-white"
                                      }`}
                                      title="Open attachment"
                                    >
                                      <Download className="h-4 w-4" />
                                    </a>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <MessageSquare className="h-16 w-16 mb-4 opacity-20 text-indigo-500" />
              <h4 className="font-bold text-base text-foreground mb-1">Select a Conversation</h4>
              <p className="text-xs max-w-sm">
                Choose any student-tutor thread from the left directory to inspect the conversation transcript.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Image Lightbox Dialog */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black/90 border-none shadow-2xl flex items-center justify-center">
          {lightboxImage && (
            <img src={lightboxImage} alt="Attachment" className="max-h-[80vh] w-auto rounded-lg object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminConversationViewer;
