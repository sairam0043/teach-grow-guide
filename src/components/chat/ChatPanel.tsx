import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import API_URL from "@/config/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, User, MessageSquare, ExternalLink, ShieldAlert, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Link } from "react-router-dom";

interface ChatPanelProps {
  initialActiveUserId?: string; // Optional deep link to open a specific chat
}

const ChatPanel = ({ initialActiveUserId }: ChatPanelProps) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(true);
  
  const [activeChat, setActiveChat] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch Inbox Conversations
  const fetchInbox = async (showLoading = false) => {
    if (!user?.id) return;
    if (showLoading) setLoadingInbox(true);
    try {
      const res = await axios.get(`${API_URL}/messages/inbox/${user.id}`);
      setConversations(res.data);
      
      // If we have an initial active user, auto-select it from conversations
      if (initialActiveUserId && showLoading) {
        const found = res.data.find((c: any) => c.otherUser.id === initialActiveUserId);
        if (found) {
          setActiveChat(found);
        } else {
          // If not in inbox yet, fetch user details to initialize temporary active chat
          try {
            const userRes = await axios.get(`${API_URL}/tutors/${initialActiveUserId}`);
            if (userRes.data) {
              setActiveChat({
                otherUser: {
                  id: initialActiveUserId,
                  full_name: userRes.data.name,
                  email: userRes.data.email || "",
                  role: "tutor",
                  avatar: userRes.data.photo || "",
                  tutorProfileId: userRes.data.id
                },
                lastMessage: { text: "No messages yet", createdAt: new Date() },
                unreadCount: 0
              });
            }
          } catch (e) {
            console.error("Error setting initial active chat details", e);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load inbox", err);
    } finally {
      if (showLoading) setLoadingInbox(false);
    }
  };

  // 2. Fetch Messages with Active Contact
  const fetchMessages = async (contactId: string, silent = false) => {
    if (!user?.id || !contactId) return;
    if (!silent) setLoadingMessages(true);
    try {
      const res = await axios.get(`${API_URL}/messages/chat/${user.id}/${contactId}`);
      setMessages(res.data);
      
      // Reset unread count locally for this contact
      setConversations(prev =>
        prev.map(c => (c.otherUser.id === contactId ? { ...c, unreadCount: 0 } : c))
      );
    } catch (err) {
      console.error("Failed to load messages", err);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Trigger Inbox Fetch on load
  useEffect(() => {
    fetchInbox(true);
    
    // Refresh inbox list every 10 seconds silently
    const inboxInterval = setInterval(() => {
      fetchInbox(false);
    }, 10000);

    return () => clearInterval(inboxInterval);
  }, [user?.id, initialActiveUserId]);

  // Handle active conversation changes
  useEffect(() => {
    if (activeChat?.otherUser?.id) {
      fetchMessages(activeChat.otherUser.id);
      
      // Clear existing polling
      if (pollingRef.current) clearInterval(pollingRef.current);
      
      // Poll chat history every 4 seconds for real-time socket-like feeling
      pollingRef.current = setInterval(() => {
        fetchMessages(activeChat.otherUser.id, true);
      }, 4000);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [activeChat?.otherUser?.id]);

  // Scroll on message updates
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 3. Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user?.id || !activeChat?.otherUser?.id) return;
    
    const textToSend = inputText.trim();
    setInputText("");
    setIsSending(true);
    
    try {
      const res = await axios.post(`${API_URL}/messages`, {
        senderId: user.id,
        receiverId: activeChat.otherUser.id,
        text: textToSend
      });
      
      // Add message locally to speed up rendering
      setMessages(prev => [...prev, res.data]);
      
      // Silent refresh of inbox list to update timestamps/previews
      fetchInbox(false);
    } catch (err: any) {
      toast.error("Failed to send message.");
      setInputText(textToSend); // restore
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex bg-card border rounded-2xl overflow-hidden h-[600px] shadow-lg">
      
      {/* 1. Inbox sidebar (Active Threads) */}
      <div className={`w-full md:w-80 border-r flex flex-col ${activeChat ? "hidden md:flex" : "flex"}`}>
        <div className="p-4 border-b bg-secondary/15 flex items-center justify-between">
          <h3 className="font-bold text-base text-foreground flex items-center gap-1.5">
            <MessageSquare className="h-4.5 w-4.5 text-primary" /> Conversations
          </h3>
          {conversations.length > 0 && (
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary font-bold">
              {conversations.length} Active
            </Badge>
          )}
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border/40">
          {loadingInbox ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
              <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-2" />
              <p className="text-sm font-semibold text-foreground/80">No chats yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[180px]">
                {user?.role === "student" 
                  ? "Select a tutor from listings and click 'Message Tutor' to start chatting!"
                  : "Student chat inquiries will appear here once they contact you."
                }
              </p>
            </div>
          ) : (
            conversations.map((chat) => {
              const isActive = activeChat?.otherUser?.id === chat.otherUser.id;
              const hasUnread = chat.unreadCount > 0;
              const isTutor = chat.otherUser.role === "tutor";
              
              return (
                <div
                  key={chat.otherUser.id}
                  onClick={() => setActiveChat(chat)}
                  className={`p-4 flex gap-3 items-center cursor-pointer transition-colors hover:bg-secondary/10 relative ${
                    isActive ? "bg-primary/5 border-l-4 border-primary" : ""
                  }`}
                >
                  {/* User Avatar */}
                  <div className="h-10 w-10 rounded-full bg-slate-200 shadow-sm border border-slate-300/30 overflow-hidden shrink-0 flex items-center justify-center relative">
                    {chat.otherUser.avatar ? (
                      <img 
                        src={chat.otherUser.avatar.startsWith("http") ? chat.otherUser.avatar : `${API_URL}/uploads/${chat.otherUser.avatar}`}
                        alt={chat.otherUser.full_name} 
                        className="h-full w-full object-cover"
                        onError={(e: any) => {
                          e.target.onerror = null;
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.otherUser.full_name)}&background=random`;
                        }}
                      />
                    ) : (
                      <span className="font-bold text-sm text-slate-500 uppercase">
                        {chat.otherUser.full_name.charAt(0)}
                      </span>
                    )}
                    {/* Role indicator dot */}
                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-card ${
                      isTutor ? "bg-indigo-500" : "bg-sky-500"
                    }`} />
                  </div>

                  {/* Message Info preview */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className={`text-sm font-semibold truncate ${hasUnread ? "text-foreground" : "text-foreground/90"}`}>
                        {chat.otherUser.full_name}
                      </h4>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {format(new Date(chat.lastMessage.createdAt), "h:mm a")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={`text-xs truncate max-w-[150px] ${
                        hasUnread ? "font-bold text-foreground" : "text-muted-foreground"
                      }`}>
                        {chat.lastMessage.text}
                      </p>
                      {hasUnread && (
                        <span className="h-5 w-5 bg-rose-500 text-white font-extrabold text-[10px] flex items-center justify-center rounded-full shrink-0 animate-pulse">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Right Pane (Active chat box) */}
      <div className={`flex-1 flex flex-col bg-slate-950/5 ${activeChat ? "flex" : "hidden md:flex"}`}>
        {activeChat ? (
          <>
            {/* Header info */}
            <div className="p-4 border-b bg-card flex items-center justify-between shadow-sm shrink-0">
              <div className="flex items-center gap-3">
                {/* Back button (Mobile only) */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setActiveChat(null)}
                  className="md:hidden h-8 w-8 text-muted-foreground mr-1"
                >
                  <ArrowLeft className="h-4.5 w-4.5" />
                </Button>

                {/* Avatar */}
                <div className="h-10 w-10 rounded-full bg-slate-200 border overflow-hidden shrink-0 flex items-center justify-center">
                  {activeChat.otherUser.avatar ? (
                    <img 
                      src={activeChat.otherUser.avatar.startsWith("http") ? activeChat.otherUser.avatar : `${API_URL}/uploads/${activeChat.otherUser.avatar}`}
                      alt={activeChat.otherUser.full_name} 
                      className="h-full w-full object-cover"
                      onError={(e: any) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(activeChat.otherUser.full_name)}&background=random`;
                      }}
                    />
                  ) : (
                    <span className="font-bold text-sm text-slate-500 uppercase">
                      {activeChat.otherUser.full_name.charAt(0)}
                    </span>
                  )}
                </div>

                {/* Active contact Details */}
                <div>
                  <h4 className="font-bold text-sm text-foreground leading-tight">{activeChat.otherUser.full_name}</h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className={`text-[9px] uppercase px-1.5 py-0 border-none font-extrabold tracking-wider ${
                      activeChat.otherUser.role === "tutor" ? "bg-indigo-100 text-indigo-700" : "bg-sky-100 text-sky-700"
                    }`}>
                      {activeChat.otherUser.role}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">• online</span>
                  </div>
                </div>
              </div>

              {/* Tutor profile quick navigation */}
              {activeChat.otherUser.role === "tutor" && activeChat.otherUser.tutorProfileId && (
                <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-xs rounded-lg">
                  <Link to={`/tutors/${activeChat.otherUser.tutorProfileId}`}>
                    <ExternalLink className="h-3.5 w-3.5" /> View Profile
                  </Link>
                </Button>
              )}
            </div>

            {/* Message Bubble List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                <div className="space-y-4 py-8">
                  <Skeleton className="h-10 w-2/3 rounded-xl" />
                  <Skeleton className="h-10 w-1/3 rounded-xl ml-auto bg-primary/10" />
                  <Skeleton className="h-10 w-1/2 rounded-xl" />
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-slate-950/5 rounded-2xl border border-dashed m-2">
                  <ShieldAlert className="h-8 w-8 text-indigo-500/40 mb-2" />
                  <h5 className="font-bold text-sm text-foreground/80">Safety & Trust Guidelines</h5>
                  <p className="text-xs max-w-xs mt-1 leading-relaxed">
                    Welcome to the thread! For your protection, always keep scheduling and class payment checkouts verified directly inside the Cuvasol platform.
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isOwn = msg.sender._id.toString() === user?.id;
                  
                  return (
                    <div 
                      key={msg._id || idx} 
                      className={`flex flex-col max-w-[75%] ${isOwn ? "ml-auto items-end" : "items-start"}`}
                    >
                      {/* Message body */}
                      <div className={`p-3 rounded-2xl shadow-sm text-sm ${
                        isOwn 
                          ? "bg-primary text-primary-foreground rounded-br-none" 
                          : "bg-card border text-foreground rounded-bl-none"
                      }`}>
                        {msg.text}
                      </div>
                      {/* Timestamp */}
                      <span className="text-[9px] text-muted-foreground mt-1 px-1">
                        {format(new Date(msg.createdAt), "h:mm a")}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Send Bar */}
            <form onSubmit={handleSendMessage} className="p-3 border-t bg-card shrink-0 flex gap-2 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your message here..."
                disabled={isSending}
                className="flex-1 bg-secondary/20 border border-border/50 rounded-xl px-4 text-sm focus:outline-none focus:border-primary transition-colors text-foreground placeholder:text-muted-foreground"
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={isSending || !inputText.trim()}
                className="rounded-xl h-10 w-10 shadow-md transition-transform active:scale-95"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <div className="h-16 w-16 bg-primary/5 text-primary/30 rounded-2xl flex items-center justify-center mb-4 border border-primary/10">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Cuvasol Live Messaging</h3>
            <p className="text-sm max-w-sm mt-1 leading-relaxed">
              Connect directly with students and tutors. Select a conversation thread from the sidebar list to retrieve chat messages.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};

export default ChatPanel;
