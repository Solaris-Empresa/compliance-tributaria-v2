import { useEffect, useState } from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import { Bell, X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";

interface Notification {
  id: string;
  type: "task_updated" | "task_comment" | "task_due_soon" | "task_overdue" | "info";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  projectId?: number;
  taskId?: number;
}

export default function RealtimeNotifications() {
  const { isConnected, on, off } = useWebSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Escutar eventos de notificação
    const handleTaskUpdated = (data: any) => {
      addNotification({
        type: "task_updated",
        title: "Tarefa Atualizada",
        message: data.message || "Uma tarefa foi atualizada",
        projectId: data.projectId,
        taskId: data.taskId,
      });
    };

    const handleTaskComment = (data: any) => {
      addNotification({
        type: "task_comment",
        title: "Novo Comentário",
        message: data.message || "Novo comentário em uma tarefa",
        projectId: data.projectId,
        taskId: data.taskId,
      });
    };

    const handleTaskDueSoon = (data: any) => {
      addNotification({
        type: "task_due_soon",
        title: "Prazo Próximo",
        message: data.message || "Uma tarefa está próxima do prazo",
        projectId: data.projectId,
        taskId: data.taskId,
      });
    };

    const handleTaskOverdue = (data: any) => {
      addNotification({
        type: "task_overdue",
        title: "Tarefa Atrasada",
        message: data.message || "Uma tarefa está atrasada",
        projectId: data.projectId,
        taskId: data.taskId,
      });
    };

    on("task:updated", handleTaskUpdated);
    on("task:comment", handleTaskComment);
    on("task:due_soon", handleTaskDueSoon);
    on("task:overdue", handleTaskOverdue);

    return () => {
      off("task:updated", handleTaskUpdated);
      off("task:comment", handleTaskComment);
      off("task:due_soon", handleTaskDueSoon);
      off("task:overdue", handleTaskOverdue);
    };
  }, [on, off]);

  useEffect(() => {
    const count = notifications.filter((n) => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);

  const addNotification = (data: Omit<Notification, "id" | "timestamp" | "read">) => {
    const notification: Notification = {
      ...data,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      read: false,
    };

    setNotifications((prev) => [notification, ...prev].slice(0, 50)); // Manter apenas 50 últimas
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "task_updated":
        return <CheckCircle2 className="w-5 h-5 text-blue-600" />;
      case "task_comment":
        return <Info className="w-5 h-5 text-green-600" />;
      case "task_due_soon":
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case "task_overdue":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="relative">
      {/* Botão de notificações */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        {isConnected && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      {/* Painel de notificações */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-h-[600px] overflow-hidden bg-white rounded-lg shadow-lg border z-50">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">Notificações</h3>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                  Marcar todas como lidas
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[500px]">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Nenhuma notificação</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                    !notification.read ? "bg-blue-50" : ""
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    {getIcon(notification.type)}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{notification.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {notification.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNotification(notification.id);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
