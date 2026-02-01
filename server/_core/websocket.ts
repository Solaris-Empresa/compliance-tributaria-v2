import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import type { Socket } from "socket.io";

let io: SocketIOServer | null = null;

export function initializeWebSocket(httpServer: HttpServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    path: "/socket.io/",
  });

  io.on("connection", (socket: Socket) => {
    console.log(`[WebSocket] Cliente conectado: ${socket.id}`);

    // Autenticação: cliente envia userId ao conectar
    socket.on("authenticate", (userId: number) => {
      socket.data.userId = userId;
      socket.join(`user:${userId}`);
      console.log(`[WebSocket] Usuário ${userId} autenticado no socket ${socket.id}`);
    });

    // Cliente se inscreve em notificações de um projeto
    socket.on("subscribe:project", (projectId: number) => {
      socket.join(`project:${projectId}`);
      console.log(`[WebSocket] Socket ${socket.id} inscrito no projeto ${projectId}`);
    });

    // Cliente cancela inscrição de um projeto
    socket.on("unsubscribe:project", (projectId: number) => {
      socket.leave(`project:${projectId}`);
      console.log(`[WebSocket] Socket ${socket.id} desinscrito do projeto ${projectId}`);
    });

    socket.on("disconnect", () => {
      console.log(`[WebSocket] Cliente desconectado: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error("WebSocket não foi inicializado. Chame initializeWebSocket primeiro.");
  }
  return io;
}

// Funções auxiliares para emitir notificações

export function notifyUser(userId: number, event: string, data: any) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
  console.log(`[WebSocket] Notificação enviada para usuário ${userId}: ${event}`);
}

export function notifyProject(projectId: number, event: string, data: any) {
  if (!io) return;
  io.to(`project:${projectId}`).emit(event, data);
  console.log(`[WebSocket] Notificação enviada para projeto ${projectId}: ${event}`);
}

export function notifyAll(event: string, data: any) {
  if (!io) return;
  io.emit(event, data);
  console.log(`[WebSocket] Notificação broadcast: ${event}`);
}
