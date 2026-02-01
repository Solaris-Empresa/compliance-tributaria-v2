import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/_core/hooks/useAuth";

export function useWebSocket() {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Conectar ao servidor WebSocket
    const socket = io(window.location.origin, {
      path: "/socket.io/",
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[WebSocket] Conectado ao servidor");
      setIsConnected(true);
      
      // Autenticar usuário
      socket.emit("authenticate", user.id);
    });

    socket.on("disconnect", () => {
      console.log("[WebSocket] Desconectado do servidor");
      setIsConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("[WebSocket] Erro de conexão:", error);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const subscribeToProject = (projectId: number) => {
    if (socketRef.current) {
      socketRef.current.emit("subscribe:project", projectId);
    }
  };

  const unsubscribeFromProject = (projectId: number) => {
    if (socketRef.current) {
      socketRef.current.emit("unsubscribe:project", projectId);
    }
  };

  const on = (event: string, callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  const off = (event: string, callback?: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  };

  return {
    isConnected,
    subscribeToProject,
    unsubscribeFromProject,
    on,
    off,
    socket: socketRef.current,
  };
}
