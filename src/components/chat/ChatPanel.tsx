import { useEffect, useState, useRef, Fragment } from "react";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import API_URL from "@/config/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Send, User, MessageSquare, ExternalLink, ShieldAlert, ArrowLeft, Shield, CheckCheck,
  Paperclip, FileText, File, Download, Eye, X, Loader2, Maximize2, Image as ImageIcon
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { format, isToday, isYesterday } from "date-fns";
import { Link } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface ChatPanelProps {
  initialActiveUserId?: string; // Optional deep link by user ID
  initialActiveUser?: {
    id: string;
    full_name?: string;
    name?: string;
    email?: string;
    role?: string;
    avatar?: string;
    photo?: string;
    tutorProfileId?: string | null;
  } | null;
}

const ChatPanel = ({ initialActiveUserId, initialActiveUser }: ChatPanelProps) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(true);
  
  const [activeChat, setActiveChat] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  
interface StagedAttachment {
  file: File;
  previewUrl: string;
  fileType: string;
}

  // File & Media Attachment State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stagedFiles, setStagedFiles] = useState<StagedAttachment[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const activeChatRef = useRef<any | null>(null);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  const getEffectiveUserId = () => {
    if (user?.id) return String(user.id);
    if ((user as any)?._id) return String((user as any)._id);
    try {
      const stored = localStorage.getItem('user_info');
      if (stored) {
        const parsed = JSON.parse(stored);
        return String(parsed.id || parsed._id || parsed.userId || "");
      }
    } catch (e) {}
    return "";
  };

  // 1. Fetch Messages with Active Contact
  const fetchMessages = async (contactId: string, silent = false) => {
    const currentId = getEffectiveUserId();
    if (!currentId || !contactId) return;
    if (document.hidden && silent) return; // skip if browser tab is backgrounded/inactive
    if (!silent) setLoadingMessages(true);
    try {
      const res = await axios.get(`${API_URL}/messages/chat/${currentId}/${contactId}`, {
        headers: { 'x-skip-network-alert': 'true' }
      });
      setMessages(res.data || []);
      
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

  // 2. Fetch Inbox Conversations
  const fetchInbox = async (showLoading = false) => {
    const currentId = getEffectiveUserId();
    if (!currentId) return;
    if (document.hidden && !showLoading) return; // skip if browser tab is backgrounded/inactive
    if (showLoading) setLoadingInbox(true);
    try {
      const res = await axios.get(`${API_URL}/messages/inbox/${currentId}`, {
        headers: { 'x-skip-network-alert': 'true' }
      });
      const incomingConversations: any[] = res.data || [];
      
      setConversations(prev => {
        const merged = [...incomingConversations];
        // Preserve currently selected contact if they don't have existing messages yet
        const currentActive = activeChatRef.current;
        if (currentActive?.otherUser?.id && !merged.some(c => c.otherUser.id === currentActive.otherUser.id)) {
          merged.unshift(currentActive);
        }
        return merged;
      });

      // Auto-select conversation if none is active
      if (!activeChatRef.current && incomingConversations.length > 0) {
        const unreadThread = incomingConversations.find(c => (c.unreadCount || 0) > 0);
        const threadToSelect = unreadThread || incomingConversations[0];
        if (threadToSelect) {
          setActiveChat(threadToSelect);
        }
      }
    } catch (err) {
      console.error("Failed to load inbox", err);
    } finally {
      if (showLoading) setLoadingInbox(false);
    }
  };

  // 3. Handle incoming initial active user / ID prop changes
  useEffect(() => {
    const targetUserId = initialActiveUser?.id || initialActiveUserId;
    if (!targetUserId) return;

    // Case A: Full user object provided directly
    if (initialActiveUser?.id) {
      const newChat = {
        otherUser: {
          id: initialActiveUser.id,
          full_name: initialActiveUser.full_name || initialActiveUser.name || "User",
          email: initialActiveUser.email || "",
          role: initialActiveUser.role || "tutor",
          avatar: initialActiveUser.avatar || initialActiveUser.photo || "",
          tutorProfileId: initialActiveUser.tutorProfileId || null
        },
        lastMessage: { text: "No messages yet", createdAt: new Date() },
        unreadCount: 0
      };

      setActiveChat(newChat);
      setConversations(prev => {
        const exists = prev.find(c => c.otherUser.id === targetUserId);
        if (exists) return prev;
        return [newChat, ...prev];
      });
      fetchMessages(targetUserId);
      return;
    }

    // Case B: Only user ID provided
    const initializeChatById = async () => {
      // Check local conversations first
      const found = conversations.find(c => c.otherUser.id === targetUserId);
      if (found) {
        setActiveChat(found);
        fetchMessages(targetUserId);
        return;
      }

      // Fetch user preview from backend
      try {
        let contactData: any = null;
        try {
          const userRes = await axios.get(`${API_URL}/messages/user/${targetUserId}`);
          if (userRes.data) contactData = userRes.data;
        } catch (e) {
          try {
            const tutorRes = await axios.get(`${API_URL}/tutors/user/${targetUserId}`);
            if (tutorRes.data) {
              contactData = {
                id: targetUserId,
                full_name: tutorRes.data?.name || "Tutor",
                email: tutorRes.data?.email || "",
                role: "tutor",
                avatar: tutorRes.data?.photo || tutorRes.data?.avatar || "",
                tutorProfileId: tutorRes.data?.id || null
              };
            }
          } catch (err2) {
            console.error("Error setting initial active chat details", err2);
          }
        }

        const newChat = {
          otherUser: {
            id: contactData?.id || targetUserId,
            full_name: contactData?.full_name || contactData?.name || "User",
            email: contactData?.email || "",
            role: contactData?.role || "tutor",
            avatar: contactData?.avatar || contactData?.photo || "",
            tutorProfileId: contactData?.tutorProfileId || null
          },
          lastMessage: { text: "No messages yet", createdAt: new Date() },
          unreadCount: 0
        };

        setActiveChat(newChat);
        setConversations(prev => {
          if (prev.some(c => c.otherUser.id === targetUserId)) return prev;
          return [newChat, ...prev];
        });
        fetchMessages(targetUserId);
      } catch (err) {
        console.error("Failed to initialize active chat by ID:", err);
      }
    };

    initializeChatById();
  }, [initialActiveUserId, initialActiveUser?.id]);

  // Scroll to bottom of message list container only (prevents parent page scroll)
  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  // Trigger Inbox Fetch on load
  useEffect(() => {
    fetchInbox(true);
    
    // Refresh inbox list every 10 seconds silently
    const inboxInterval = setInterval(() => {
      fetchInbox(false);
    }, 10000);

    return () => clearInterval(inboxInterval);
  }, [user?.id]);

  // Handle active conversation changes & polling
  useEffect(() => {
    if (activeChat?.otherUser?.id) {
      fetchMessages(activeChat.otherUser.id);
      
      // Clear existing polling
      if (pollingRef.current) clearInterval(pollingRef.current);
      
      // Poll chat history every 6 seconds for real-time socket-like feeling
      pollingRef.current = setInterval(() => {
        fetchMessages(activeChat.otherUser.id, true);
      }, 6000);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [activeChat?.otherUser?.id]);

  // Scroll on message updates
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Helper: Format file size in human-readable units
  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Helper: Detect file category from file object
  const getLocalFileType = (file: File) => {
    if (file.type?.startsWith('image/') || /\.(jpeg|jpg|png|webp|gif|svg|bmp)$/i.test(file.name || '')) {
      return 'image';
    }
    if (file.type === 'application/pdf' || (file.name || '').toLowerCase().endsWith('.pdf')) {
      return 'pdf';
    }
    if (/\.(doc|docx|odt|rtf|txt)$/i.test(file.name || '')) {
      return 'doc';
    }
    if (/\.(xls|xlsx|csv|ods)$/i.test(file.name || '')) {
      return 'spreadsheet';
    }
    if (/\.(ppt|pptx|odp)$/i.test(file.name || '')) {
      return 'presentation';
    }
    if (/\.(zip|rar|7z|tar|gz)$/i.test(file.name || '')) {
      return 'archive';
    }
    return 'file';
  };

  // Helper: Process newly selected or dropped files
  const handleFilesAdded = (incomingFiles: FileList | File[]) => {
    const newFiles = Array.from(incomingFiles || []);
    if (!newFiles || newFiles.length === 0) return;

    if (stagedFiles.length + newFiles.length > 5) {
      toast.error("You can attach a maximum of 5 files per message.");
      return;
    }

    const oversized = newFiles.filter(f => f.size > 15 * 1024 * 1024);
    if (oversized.length > 0) {
      toast.error(`"${oversized[0].name}" exceeds the 15MB file size limit.`);
      return;
    }

    const blockedExts = ['exe', 'bat', 'cmd', 'sh', 'vbs', 'msi', 'com', 'scr', 'ps1', 'jar', 'apk'];
    const invalidFiles = newFiles.filter(f => {
      const ext = (f.name || '').toLowerCase().split('.').pop() || '';
      return blockedExts.includes(ext);
    });
    if (invalidFiles.length > 0) {
      toast.error("Executable and script files are not permitted for security reasons.");
      return;
    }

    const newStaged: StagedAttachment[] = newFiles.map(f => ({
      file: f,
      previewUrl: f.type?.startsWith('image/') ? URL.createObjectURL(f) : '',
      fileType: getLocalFileType(f)
    }));

    setStagedFiles(prev => [...prev, ...newStaged]);
  };

  const removeStagedFile = (index: number) => {
    const item = stagedFiles[index];
    if (item?.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
    setStagedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearStagedFiles = () => {
    stagedFiles.forEach(item => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setStagedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesAdded(Array.from(e.target.files));
    }
  };

  const handleClipboardPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) pastedFiles.push(file);
      }
    }
    if (pastedFiles.length > 0) {
      handleFilesAdded(pastedFiles);
    }
  };

  // 4. Send Message (Text and/or Attachments)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentId = getEffectiveUserId();
    const hasText = inputText.trim().length > 0;
    const hasFiles = stagedFiles.length > 0;
    if ((!hasText && !hasFiles) || !currentId || !activeChat?.otherUser?.id) return;
    
    const textToSend = inputText.trim();
    const itemsToUpload = [...stagedFiles];
    setInputText("");
    clearStagedFiles();
    setIsSending(true);
    
    try {
      let uploadedAttachments: any[] = [];
      if (itemsToUpload.length > 0) {
        const formData = new FormData();
        itemsToUpload.forEach(item => formData.append('files', item.file));

        const uploadRes = await axios.post(`${API_URL}/upload/chat-attachment`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (uploadRes.data?.attachments) {
          uploadedAttachments = uploadRes.data.attachments;
        }
      }

      const res = await axios.post(`${API_URL}/messages`, {
        senderId: currentId,
        receiverId: activeChat.otherUser.id,
        text: textToSend,
        attachments: uploadedAttachments
      });
      
      // Add message locally to speed up rendering
      setMessages(prev => [...prev, res.data]);

      const previewText = textToSend || (uploadedAttachments.length > 0
        ? (uploadedAttachments[0].fileType === 'image' ? '📷 Photo' : `📄 ${uploadedAttachments[0].filename}`)
        : 'Attachment');

      // Update active chat last message preview
      setActiveChat((prev: any) => prev ? {
        ...prev,
        lastMessage: { text: previewText, createdAt: new Date(), senderId: currentId }
      } : prev);

      // Update in conversations list
      setConversations(prev => prev.map(c => 
        c.otherUser.id === activeChat.otherUser.id
          ? { ...c, lastMessage: { text: previewText, createdAt: new Date(), senderId: currentId } }
          : c
      ));
      
      // Silent refresh of inbox list to sync timestamps/previews
      fetchInbox(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send message.");
      setInputText(textToSend); // restore
      setStagedFiles(itemsToUpload); // restore files
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
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px] leading-relaxed">
                {user?.role === "student" 
                  ? "Select a tutor from listings and click 'Message Tutor' to start chatting!"
                  : "Direct inquiries from students and official messages from Cuvasol Admin Support will appear here."
                }
              </p>
            </div>
          ) : (
            conversations.map((chat) => {
              const isActive = activeChat?.otherUser?.id === chat.otherUser.id;
              const hasUnread = (chat.unreadCount || 0) > 0;
              const isAdmin = chat.otherUser.role === "admin";
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
                  <div className={`h-10 w-10 rounded-full shadow-sm border overflow-hidden shrink-0 flex items-center justify-center relative ${
                    isAdmin ? "bg-indigo-100 border-indigo-300 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-800" : "bg-slate-200 border-slate-300/30 text-slate-500"
                  }`}>
                    {isAdmin ? (
                      <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    ) : chat.otherUser.avatar ? (
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
                      <span className="font-bold text-sm uppercase">
                        {chat.otherUser.full_name?.charAt(0) || "U"}
                      </span>
                    )}
                    {/* Role indicator dot */}
                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-card ${
                      isAdmin ? "bg-indigo-600" : isTutor ? "bg-indigo-500" : "bg-sky-500"
                    }`} />
                  </div>

                  {/* Message Info preview */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <h4 className={`text-sm font-semibold truncate ${hasUnread ? "text-foreground font-bold" : "text-foreground/90"}`}>
                          {chat.otherUser.full_name}
                        </h4>
                        {isAdmin && (
                          <Badge variant="secondary" className="text-[9px] bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-extrabold px-1.5 py-0">
                            Admin
                          </Badge>
                        )}
                      </div>
                      {chat.lastMessage?.createdAt && (
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-1">
                          {format(new Date(chat.lastMessage.createdAt), "h:mm a")}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={`text-xs truncate max-w-[150px] ${
                        hasUnread ? "font-bold text-foreground" : "text-muted-foreground"
                      }`}>
                        {chat.lastMessage?.text || (chat.lastMessage?.attachments?.length ? '📎 Attachment' : 'No messages yet')}
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
                <div className={`h-10 w-10 rounded-full border overflow-hidden shrink-0 flex items-center justify-center ${
                  activeChat.otherUser.role === "admin" 
                    ? "bg-indigo-100 border-indigo-300 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-800" 
                    : "bg-slate-200 border-slate-300"
                }`}>
                  {activeChat.otherUser.role === "admin" ? (
                    <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  ) : activeChat.otherUser.avatar ? (
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
                      {activeChat.otherUser.full_name?.charAt(0) || "U"}
                    </span>
                  )}
                </div>

                {/* Active contact Details */}
                <div>
                  <h4 className="font-bold text-sm text-foreground leading-tight flex items-center gap-1.5">
                    {activeChat.otherUser.full_name}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {activeChat.otherUser.role === "admin" ? (
                      <Badge variant="outline" className="text-[9px] uppercase px-2 py-0.5 border-indigo-200 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-extrabold tracking-wider flex items-center gap-1">
                        <Shield className="h-3 w-3 text-indigo-600" /> Platform Admin Support
                      </Badge>
                    ) : (
                      <Badge variant="outline" className={`text-[9px] uppercase px-1.5 py-0 border-none font-extrabold tracking-wider ${
                        activeChat.otherUser.role === "tutor" ? "bg-indigo-100 text-indigo-700" : "bg-sky-100 text-sky-700"
                      }`}>
                        {activeChat.otherUser.role}
                      </Badge>
                    )}
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
            <div 
              ref={containerRef} 
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
              onDrop={(e) => { 
                e.preventDefault(); 
                setIsDragOver(false); 
                if (e.dataTransfer.files) handleFilesAdded(e.dataTransfer.files); 
              }}
              className="flex-1 overflow-y-auto p-4 space-y-4 relative"
            >
              {/* Drag over visual overlay */}
              {isDragOver && (
                <div className="absolute inset-2 z-30 bg-indigo-50/90 dark:bg-indigo-950/80 border-2 border-dashed border-indigo-500 rounded-2xl flex flex-col items-center justify-center pointer-events-none backdrop-blur-xs">
                  <div className="p-3 bg-indigo-100 dark:bg-indigo-900/60 rounded-full text-indigo-600 dark:text-indigo-400 mb-2 animate-bounce">
                    <Paperclip className="h-6 w-6" />
                  </div>
                  <p className="font-bold text-sm text-indigo-700 dark:text-indigo-300">Drop files here to attach</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Images, PDFs, documents up to 15MB</p>
                </div>
              )}

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
                (() => {
                  const formatSeparatorDate = (date: Date) => {
                    if (isToday(date)) return "Today";
                    if (isYesterday(date)) return "Yesterday";
                    return format(date, "MMMM d, yyyy");
                  };

                  return messages.map((msg, idx) => {
                    const currentId = getEffectiveUserId();
                    const senderIdStr = msg.sender?._id ? msg.sender._id.toString() : (typeof msg.sender === "string" ? msg.sender : msg.sender?.id || "");
                    const isOwn = senderIdStr === currentId;
                    const isAdminMsg = !isOwn && msg.sender?.role === "admin";
                    const currentDate = new Date(msg.createdAt || Date.now());
                    
                    // Determine if date separator is required
                    let showDateSeparator = false;
                    if (idx === 0) {
                      showDateSeparator = true;
                    } else {
                      const prevMsg = messages[idx - 1];
                      const prevDate = new Date(prevMsg.createdAt || Date.now());
                      if (currentDate.toDateString() !== prevDate.toDateString()) {
                        showDateSeparator = true;
                      }
                    }

                    return (
                      <Fragment key={msg._id || idx}>
                        {showDateSeparator && (
                          <div className="flex justify-center my-4 w-full select-none">
                            <span className="bg-secondary/60 text-muted-foreground text-[10px] font-bold px-3 py-1 rounded-full shadow-sm border border-border/20">
                              {formatSeparatorDate(currentDate)}
                            </span>
                          </div>
                        )}
                        <div 
                          className={`flex flex-col max-w-[75%] ${isOwn ? "ml-auto items-end" : "items-start"}`}
                        >
                          {isAdminMsg && (
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1 px-1">
                              <Shield className="h-3 w-3" /> Cuvasol Support Team
                            </span>
                          )}

                          {/* Message body */}
                          <div className={`p-3 rounded-2xl shadow-sm text-sm space-y-2.5 ${
                            isOwn 
                              ? "bg-primary text-primary-foreground rounded-br-none" 
                              : isAdminMsg
                              ? "bg-indigo-50 border border-indigo-200 text-indigo-950 dark:bg-indigo-950/40 dark:border-indigo-800/60 dark:text-indigo-100 rounded-bl-none font-medium"
                              : "bg-card border text-foreground rounded-bl-none"
                          }`}>
                            {/* Attachments if any */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="space-y-2">
                                {/* 1. Images Grid */}
                                {(() => {
                                  const images = msg.attachments.filter(a => a.fileType === 'image');
                                  if (images.length === 0) return null;
                                  return (
                                    <div className={`grid gap-1.5 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                                      {images.map((img, imgIdx) => (
                                        <div 
                                          key={img.fileId || imgIdx} 
                                          onClick={() => setLightboxImage(img.url)}
                                          className="group relative cursor-pointer overflow-hidden rounded-xl border border-black/10 dark:border-white/10 bg-black/5 aspect-square flex items-center justify-center max-h-56"
                                        >
                                          <img 
                                            src={img.url} 
                                            alt={img.filename} 
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            loading="lazy"
                                          />
                                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Maximize2 className="h-5 w-5 text-white drop-shadow-md" />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}

                                {/* 2. Non-image attachments (PDFs, docs, etc.) */}
                                {msg.attachments.filter(a => a.fileType !== 'image').map((file, fIdx) => (
                                  <div 
                                    key={file.fileId || fIdx}
                                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                                      isOwn 
                                        ? 'bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/15' 
                                        : 'bg-background/80 hover:bg-background border-border/70 text-foreground shadow-xs'
                                    }`}
                                  >
                                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                                      file.fileType === 'pdf' 
                                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' 
                                        : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                                    }`}>
                                      <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-semibold truncate leading-tight" title={file.filename}>
                                        {file.filename}
                                      </p>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[10px] opacity-75 uppercase font-medium">
                                          {file.fileType}
                                        </span>
                                        <span className="text-[10px] opacity-60">•</span>
                                        <span className="text-[10px] opacity-75">
                                          {formatFileSize(file.size)}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {file.fileType === 'pdf' && (
                                        <a 
                                          href={file.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          title="View PDF"
                                          className={`p-1.5 rounded-lg transition-colors ${
                                            isOwn 
                                              ? 'hover:bg-primary-foreground/20 text-primary-foreground' 
                                              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                          }`}
                                        >
                                          <Eye className="h-4 w-4" />
                                        </a>
                                      )}
                                      <a 
                                        href={file.url} 
                                        download={file.filename} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        title="Download file"
                                        className={`p-1.5 rounded-lg transition-colors ${
                                          isOwn 
                                            ? 'hover:bg-primary-foreground/20 text-primary-foreground' 
                                            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                        }`}
                                      >
                                        <Download className="h-4 w-4" />
                                      </a>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Message text */}
                            {msg.text && (
                              <div className="whitespace-pre-wrap break-words leading-relaxed">
                                {msg.text}
                              </div>
                            )}
                          </div>
                          {/* Timestamp */}
                          <span className="text-[9px] text-muted-foreground mt-1 px-1 flex items-center gap-1">
                            {format(currentDate, "h:mm a")}
                          </span>
                        </div>
                      </Fragment>
                    );
                  });
                })()
              )}
            </div>

            {/* Staged Attachments Preview Bar */}
            {stagedFiles.length > 0 && (
              <div className="p-3 border-t bg-muted/40 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5 text-indigo-500" />
                    Attachments ({stagedFiles.length})
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearStagedFiles}
                    className="h-6 text-[11px] text-muted-foreground hover:text-rose-500 px-2"
                  >
                    Clear all
                  </Button>
                </div>
                <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
                  {stagedFiles.map((staged, sIdx) => {
                    const fileName = staged.file?.name || "Attachment";
                    const fileSize = staged.file?.size || 0;
                    return (
                      <div 
                        key={sIdx} 
                        className="relative group shrink-0 flex items-center gap-2 p-1.5 pr-2.5 bg-card border rounded-xl shadow-xs max-w-[200px]"
                      >
                        {staged.previewUrl ? (
                          <img 
                            src={staged.previewUrl} 
                            alt={fileName} 
                            className="h-10 w-10 rounded-lg object-cover border" 
                          />
                        ) : (
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                            staged.fileType === 'pdf' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400'
                          }`}>
                            <FileText className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate" title={fileName}>
                            {fileName}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatFileSize(fileSize)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeStagedFile(sIdx)}
                          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-sm opacity-90 hover:opacity-100 hover:scale-110 transition-all"
                          title="Remove attachment"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Input Send Bar */}
            <form onSubmit={handleSendMessage} className="p-3 border-t bg-card shrink-0 flex items-center gap-2 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
              {/* Hidden file input */}
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
                className="hidden"
              />

              {/* Attachment button */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending}
                title="Attach files (images, PDFs, documents)"
                className="rounded-xl h-10 w-10 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 shrink-0 transition-colors"
              >
                <Paperclip className="h-4.5 w-4.5" />
              </Button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onPaste={handleClipboardPaste}
                placeholder={stagedFiles.length > 0 ? "Add a message (optional)..." : "Type your message or paste an image..."}
                disabled={isSending}
                className="flex-1 bg-secondary/20 border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors text-foreground placeholder:text-muted-foreground"
              />

              <Button 
                type="submit" 
                size="icon" 
                disabled={isSending || (!inputText.trim() && stagedFiles.length === 0)}
                className="rounded-xl h-10 w-10 shadow-md transition-transform active:scale-95 bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
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
              Connect directly with students and platform administrators. Select a conversation thread from the sidebar list to retrieve chat messages.
            </p>
          </div>
        )}
      </div>

      {/* Image Lightbox Modal */}
      <Dialog open={!!lightboxImage} onOpenChange={(open) => !open && setLightboxImage(null)}>
        <DialogContent className="max-w-4xl p-2 bg-black/90 border-black/50 text-white overflow-hidden sm:rounded-2xl">
          <div className="relative flex flex-col items-center justify-center p-2 min-h-[300px] max-h-[85vh]">
            {lightboxImage && (
              <>
                <img 
                  src={lightboxImage} 
                  alt="Enlarged view" 
                  className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg shadow-2xl" 
                />
                <div className="flex items-center gap-3 mt-3">
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1.5 text-xs rounded-lg"
                  >
                    <a href={lightboxImage} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" /> Open in New Tab
                    </a>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    variant="default"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs rounded-lg shadow-md"
                  >
                    <a href={lightboxImage} download="chat-image" target="_blank" rel="noopener noreferrer">
                      <Download className="h-3.5 w-3.5" /> Download
                    </a>
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatPanel;
