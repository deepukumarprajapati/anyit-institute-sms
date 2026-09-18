import { useState, useEffect, useRef, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Search, Paperclip, Check, CheckCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useChat, type ChatMessage, type ChatNotification } from "@/hooks/useChat";
import api from "@/lib/api";
import { toast } from "sonner";

interface Message {
  id: string;
  text: string;
  sender: "me" | "them";
  time: string;
  read: boolean;
}

interface Conversation {
  id: string;           // real conversationId once resolved; contactUserId before
  name: string;
  role: string;
  subtitle: string;     // e.g. "Parent of Mern", "Class 5-A", "Teacher"
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  messages: Message[];
  targetUserId: string; // always the contact's user _id
  targetRole: string;
}

function formatTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return dateStr;
  }
}

function roleLabel(role: string) {
  if (role === "schooladmin" || role === "school_admin") return "Admin";
  if (role === "teacher") return "Teacher";
  if (role === "student") return "Student";
  if (role === "parent") return "Parent";
  return role;
}

export default function CommunicationPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId]           = useState<string | null>(null);
  const [search, setSearch]               = useState("");
  const [newMessage, setNewMessage]       = useState("");
  const [loading, setLoading]             = useState(true);
  const [typingMap, setTypingMap]         = useState<Record<string, boolean>>({});
  const [unreadMap, setUnreadMap]         = useState<Record<string, number>>({});

  // Ref so socket callbacks always see the latest activeId
  const activeIdRef     = useRef<string | null>(null);
  const typingTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef  = useRef<HTMLDivElement>(null);

  // Keep ref in sync
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  const active   = conversations.find((c) => c.id === activeId) ?? null;
  const filtered = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  // Socket chat hook
  const { joinConversation, sendMessage, emitTyping, emitStopTyping, markRead } = useChat({
    onMessage: (msg: ChatMessage) => {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id !== msg.conversationId) return conv;
          const isMe = msg.sender === user?.id;

          // Own messages are handled by the send ack callback (optimistic → confirmed).
          // Only update the preview metadata here to avoid a duplicate bubble.
          if (isMe) {
            return { ...conv, lastMessage: msg.text, time: formatTime(msg.createdAt) };
          }

          // Deduplicate in case the event fires more than once
          if (conv.messages.some((m) => m.id === msg.id)) return conv;

          const newMsg: Message = {
            id: msg.id,
            text: msg.text,
            sender: "them",
            time: formatTime(msg.createdAt),
            read: msg.read,
          };
          return {
            ...conv,
            messages: [...conv.messages, newMsg],
            lastMessage: msg.text,
            time: formatTime(msg.createdAt),
            unread: activeIdRef.current !== conv.id ? (conv.unread || 0) + 1 : conv.unread,
          };
        })
      );
    },
    onTyping: ({ conversationId }) => {
      setTypingMap((prev) => ({ ...prev, [conversationId]: true }));
    },
    onStopTyping: ({ conversationId }) => {
      setTypingMap((prev) => ({ ...prev, [conversationId]: false }));
    },
    onRead: ({ conversationId }) => {
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? { ...conv, messages: conv.messages.map((m) => ({ ...m, read: true })) }
            : conv
        )
      );
    },
    onUserOnline: () => {},
    onUserOffline: () => {},
    onNotification: ({ conversationId, fromUserId, text, time }: ChatNotification) => {
      if (activeIdRef.current === conversationId) return;

      const preview = text || "";
      const previewTime = time ? formatTime(time) : "";

      // Try to update the conversation entry in the list:
      // - If listed by real conversationId → bump unread + update preview
      // - If listed by temp key → promote id to real conversationId + bump unread + update preview
      setConversations((prev) => {
        const byConvId = prev.findIndex((c) => c.id === conversationId);
        if (byConvId !== -1) {
          return prev.map((c, i) =>
            i === byConvId
              ? { ...c, unread: (c.unread || 0) + 1, lastMessage: preview || c.lastMessage, time: previewTime || c.time }
              : c
          );
        }
        if (fromUserId) {
          const byUserId = prev.findIndex(
            (c) => c.targetUserId === fromUserId && c.id === c.targetUserId
          );
          if (byUserId !== -1) {
            return prev.map((c, i) =>
              i === byUserId
                ? { ...c, id: conversationId, unread: (c.unread || 0) + 1, lastMessage: preview || c.lastMessage, time: previewTime || c.time }
                : c
            );
          }
        }
        return prev;
      });

      // Keep unreadMap in sync (used as fallback by getUnread)
      setUnreadMap((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] || 0) + 1,
      }));
    },
  });

  // Load contacts on mount
  useEffect(() => {
    api.get("/chat/contacts")
      .then((res) => {
        const contacts: any[] = res.data?.contacts || res.data?.data || res.data || [];
        const convs: Conversation[] = contacts.map((c: any) => ({
          // Use real conversationId if it exists, otherwise use contact's user _id as temp key
          id:           c.conversationId ? c.conversationId.toString() : (c._id || c.id)?.toString(),
          name:         c.name || c.contactName || "Unknown",
          role:         c.role || c.contactRole || "",
          subtitle:     c.subtitle || "",
          avatar:       c.avatar || "",
          lastMessage:  c.lastMessage || "",
          time:         c.time ? formatTime(c.time) : "",
          unread:       c.unread || 0,
          messages:     [],
          // Always store the contact's user _id for conversation creation
          targetUserId: (c._id || c.id)?.toString(),
          targetRole:   c.role || c.targetRole || "",
        }));
        setConversations(convs);
        if (convs.length > 0) setActiveId(convs[0].id);
      })
      .catch(() => toast.error("Failed to load contacts."))
      .finally(() => setLoading(false));

    // Load per-conversation unread counts
    api.get("/chat/unread")
      .then((res) => {
        const map: Record<string, number> = {};
        (res.data?.unread || []).forEach((u: any) => {
          if (u.conversationId) map[u.conversationId.toString()] = u.count;
        });
        setUnreadMap(map);
      })
      .catch(() => {});
  }, []);

  // Load messages when switching conversation
  useEffect(() => {
    if (!activeId) return;

    const conv = conversations.find((c) => c.id === activeId);
    if (!conv) return;

    const loadMessages = async (convId: string) => {
      try {
        const res = await api.get(`/chat/conversations/${convId}/messages`);
        const msgs: Message[] = (res.data?.messages || []).map((m: any) => ({
          id:     m._id || m.id,
          text:   m.text || m.content || "",
          sender: m.sender?.toString() === user?.id ? "me" : "them",
          time:   formatTime(m.createdAt),
          read:   m.read ?? true,
        }));
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, messages: msgs, unread: 0 } : c))
        );
        joinConversation(convId);
        markRead(convId);
        setUnreadMap((prev) => ({ ...prev, [convId]: 0 }));
      } catch (err: any) {
        console.error("[Chat] loadMessages failed:", err?.response?.data || err?.message);
      }
    };

    // If this contact already has a real server conversationId, load directly
    // A real MongoDB ObjectId is 24 hex chars; a user _id is also 24 hex, but
    // we know the difference: if targetUserId === id, it's a temp key (no conv yet)
    const isRealConvId = conv.id !== conv.targetUserId;

    if (isRealConvId) {
      loadMessages(conv.id);
      return;
    }

    // No conversation yet — create it first, then load messages
    api.post("/chat/conversations", {
      targetUserId: conv.targetUserId,
      targetRole:   conv.targetRole,
    })
      .then((res) => {
        const serverConvId =
          res.data?.conversationId?.toString() ||
          res.data?.conversation?._id?.toString() ||
          conv.id;

        if (serverConvId !== conv.id) {
          setConversations((prev) =>
            prev.map((c) => (c.id === conv.id ? { ...c, id: serverConvId } : c))
          );
          setActiveId(serverConvId);
        }
        return loadMessages(serverConvId);
      })
      .catch(() => loadMessages(conv.id));
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages]);

  const handleSend = useCallback(() => {
    if (!newMessage.trim() || !activeId) return;
    const text = newMessage.trim();
    setNewMessage("");

    // Optimistic bubble
    const optimistic: Message = {
      id:     `opt-${Date.now()}`,
      text,
      sender: "me",
      time:   formatTime(new Date().toISOString()),
      read:   false,
    };
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? { ...c, messages: [...c.messages, optimistic], lastMessage: text }
          : c
      )
    );

    // Send via socket; replace optimistic on ack
    sendMessage(activeId, text, (ack: any) => {
      if (ack?.success && ack.message) {
        const confirmed: Message = {
          id:     ack.message.id,
          text:   ack.message.text,
          sender: "me",
          time:   formatTime(ack.message.createdAt),
          read:   false,
        };
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== activeId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === optimistic.id ? confirmed : m
              ),
            };
          })
        );
      }
    });
  }, [newMessage, activeId, sendMessage]);

  const handleInputChange = (val: string) => {
    setNewMessage(val);
    if (!activeId) return;
    emitTyping(activeId);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => emitStopTyping(activeId), 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSelectConversation = (id: string) => {
    setActiveId(id);
    setUnreadMap((prev) => ({ ...prev, [id]: 0 }));
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c))
    );
  };

  const getUnread = (conv: Conversation) => unreadMap[conv.id] ?? conv.unread;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading">Communication</h1>
          <p className="text-sm text-muted-foreground mt-1">Chat with teachers, students, and admins.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-220px)] min-h-[500px]">
          {/* Conversation List */}
          <Card className="lg:col-span-1 flex flex-col overflow-hidden">
            <CardHeader className="pb-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
                      <div className="flex-1 space-y-1">
                        <div className="h-3 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
                  <MessageSquare className="h-10 w-10 mb-2 opacity-30" />
                  <p className="text-sm">No conversations yet.</p>
                </div>
              ) : (
                filtered.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border hover:bg-secondary/50 ${
                      activeId === conv.id ? "bg-secondary border-l-[3px] border-l-primary" : ""
                    }`}
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={conv.avatar} />
                      <AvatarFallback className="orange-icon-bg text-primary text-xs">
                        {conv.name.split(" ").map((w) => w[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground truncate">{conv.name}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{conv.time}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground truncate">
                          {conv.lastMessage || conv.subtitle || roleLabel(conv.role)}
                        </span>
                        {getUnread(conv) > 0 && (
                          <span className="shrink-0 h-5 w-5 rounded-full btn-gradient text-[10px] font-bold flex items-center justify-center text-white">
                            {getUnread(conv)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-2 flex flex-col overflow-hidden">
            {!active ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select a conversation to start messaging.</p>
                </div>
              </div>
            ) : (
              <>
                <CardHeader className="pb-3 border-b border-border shrink-0">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={active.avatar} />
                      <AvatarFallback className="orange-icon-bg text-primary text-xs">
                        {active.name.split(" ").map((w) => w[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-sm font-semibold">{active.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{active.subtitle || roleLabel(active.role)}</p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-auto p-4 space-y-3">
                  {active.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                          msg.sender === "me"
                            ? "btn-gradient text-white rounded-br-md"
                            : "bg-secondary text-foreground rounded-bl-md"
                        }`}
                      >
                        <p>{msg.text}</p>
                        <div
                          className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                            msg.sender === "me" ? "text-white/70" : "text-muted-foreground"
                          }`}
                        >
                          {msg.time}
                          {msg.sender === "me" &&
                            (msg.read
                              ? <CheckCheck className="h-3 w-3" />
                              : <Check className="h-3 w-3" />
                            )
                          }
                        </div>
                      </div>
                    </div>
                  ))}
                  {typingMap[activeId!] && (
                    <div className="flex justify-start">
                      <div className="bg-secondary text-muted-foreground rounded-2xl rounded-bl-md px-4 py-2.5 text-xs italic">
                        {active.name.split(" ")[0]} is typing…
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </CardContent>

                <div className="p-4 border-t border-border shrink-0">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Textarea
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="min-h-[40px] max-h-[80px] resize-none"
                      rows={1}
                    />
                    <Button
                      size="icon"
                      className="btn-gradient border-0 shrink-0"
                      onClick={handleSend}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
