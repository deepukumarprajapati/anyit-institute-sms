import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

export interface ChatMessage {
  id: string;
  conversationId: string;
  sender: string;
  senderName: string;
  senderRole: string;
  text: string;
  read: boolean;
  createdAt: string;
}

export interface ChatNotification {
  conversationId: string;
  fromUserId?: string;
  from?: string;
  fromRole?: string;
  text?: string;
  time?: string;
}

interface UseChatOptions {
  onMessage: (msg: ChatMessage) => void;
  onTyping: (data: { conversationId: string; userId: string; name: string }) => void;
  onStopTyping: (data: { conversationId: string; userId: string }) => void;
  onRead: (data: { conversationId: string; readBy: string }) => void;
  onUserOnline: (data: { userId: string }) => void;
  onUserOffline: (data: { userId: string }) => void;
  onNotification: (data: ChatNotification) => void;
}

export function useChat(options: UseChatOptions) {
  const socketRef = useRef<Socket | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const token = localStorage.getItem("eduflow_token");
    if (!token) return;

    const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL;
    const configuredApiUrl = import.meta.env.VITE_API_URL;
    const socketUrl = configuredSocketUrl ||
      (configuredApiUrl && configuredApiUrl.startsWith("http")
        ? configuredApiUrl.replace(/\/api\/?$/, "")
        : "http://localhost:5000");
    const socket = io(socketUrl, {
      auth: { token },
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("chat:message",   (msg: ChatMessage)       => optionsRef.current.onMessage(msg));
    socket.on("chat:typing",    (data: any)               => optionsRef.current.onTyping(data));
    socket.on("chat:stopTyping",(data: any)               => optionsRef.current.onStopTyping(data));
    socket.on("chat:read",      (data: any)               => optionsRef.current.onRead(data));
    socket.on("user:online",    (data: any)               => optionsRef.current.onUserOnline(data));
    socket.on("user:offline",   (data: any)               => optionsRef.current.onUserOffline(data));
    socket.on("chat:notification",(data: ChatNotification)=> optionsRef.current.onNotification(data));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const joinConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit("chat:join", { conversationId });
  }, []);

  const sendMessage = useCallback(
    (conversationId: string, text: string, ack?: (msg: any) => void) => {
      socketRef.current?.emit("chat:send", { conversationId, text }, ack);
    },
    []
  );

  const emitTyping = useCallback((conversationId: string) => {
    socketRef.current?.emit("chat:typing", { conversationId });
  }, []);

  const emitStopTyping = useCallback((conversationId: string) => {
    socketRef.current?.emit("chat:stopTyping", { conversationId });
  }, []);

  const markRead = useCallback((conversationId: string) => {
    socketRef.current?.emit("chat:markRead", { conversationId });
  }, []);

  return { joinConversation, sendMessage, emitTyping, emitStopTyping, markRead };
}
