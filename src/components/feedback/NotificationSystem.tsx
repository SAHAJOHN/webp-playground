"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import styled from "styled-components";
import {
  X,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader,
} from "lucide-react";

type NotificationType = "success" | "error" | "warning" | "info" | "loading";

type NotificationDataType = {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  actions?: NotificationActionType[];
  progress?: number;
};

type NotificationActionType = {
  label: string;
  action: () => void;
  style?: "primary" | "secondary";
};

type NotificationContextType = {
  notifications: NotificationDataType[];
  addNotification: (notification: Omit<NotificationDataType, "id">) => string;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  updateNotification: (
    id: string,
    updates: Partial<NotificationDataType>
  ) => void;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

const NotificationSystemStyled = styled.div`
  .notification-container {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-width: 400px;
    width: 100%;
  }

  .notification {
    background: white;
    border-radius: 0.75rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    border: 1px solid #e5e7eb;
    overflow: hidden;
    animation: slideIn 0.3s ease-out;
    position: relative;
  }

  .notification.success {
    border-left: 4px solid #10b981;
  }

  .notification.error {
    border-left: 4px solid #ef4444;
  }

  .notification.warning {
    border-left: 4px solid #f59e0b;
  }

  .notification.info {
    border-left: 4px solid #3b82f6;
  }

  .notification.loading {
    border-left: 4px solid #6b7280;
  }

  .notification-content {
    padding: 1rem;
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .notification-icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    margin-top: 0.125rem;
  }

  .notification-icon.success {
    color: #10b981;
  }

  .notification-icon.error {
    color: #ef4444;
  }

  .notification-icon.warning {
    color: #f59e0b;
  }

  .notification-icon.info {
    color: #3b82f6;
  }

  .notification-icon.loading {
    color: #6b7280;
    animation: spin 1s linear infinite;
  }

  .notification-body {
    flex: 1;
    min-width: 0;
  }

  .notification-title {
    font-weight: 600;
    font-size: 0.875rem;
    color: #111827;
    margin-bottom: 0.25rem;
    line-height: 1.25;
  }

  .notification-message {
    font-size: 0.875rem;
    color: #6b7280;
    line-height: 1.4;
    margin-bottom: 0.75rem;
  }

  .notification-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  .notification-action {
    padding: 0.375rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
  }

  .notification-action.primary {
    background: #3b82f6;
    color: white;
  }

  .notification-action.primary:hover {
    background: #2563eb;
  }

  .notification-action.secondary {
    background: #f3f4f6;
    color: #374151;
  }

  .notification-action.secondary:hover {
    background: #e5e7eb;
  }

  .notification-close {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    background: none;
    border: none;
    cursor: pointer;
    color: #9ca3af;
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: color 0.2s ease;
  }

  .notification-close:hover {
    color: #6b7280;
  }

  .notification-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: #f3f4f6;
  }

  .notification-progress-bar {
    height: 100%;
    background: #3b82f6;
    transition: width 0.3s ease;
  }

  .notification-progress-bar.success {
    background: #10b981;
  }

  .notification-progress-bar.error {
    background: #ef4444;
  }

  .notification-progress-bar.warning {
    background: #f59e0b;
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .notification.removing {
    animation: slideOut 0.3s ease-in forwards;
  }

  @media (max-width: 640px) {
    .notification-container {
      top: 0.5rem;
      right: 0.5rem;
      left: 0.5rem;
      max-width: none;
    }

    .notification-content {
      padding: 0.75rem;
    }

    .notification-actions {
      flex-direction: column;
    }

    .notification-action {
      width: 100%;
      text-align: center;
    }
  }
`;

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<NotificationDataType[]>(
    []
  );

  const addNotification = useCallback(
    (notification: Omit<NotificationDataType, "id">): string => {
      const id = `notification-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const newNotification: NotificationDataType = {
        ...notification,
        id,
        duration:
          notification.duration ??
          (notification.type === "error" ? 8000 : 5000),
      };

      setNotifications((prev) => [...prev, newNotification]);

      // Auto-remove notification after duration (unless persistent)
      if (!newNotification.persistent && newNotification.duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, newNotification.duration);
      }

      return id;
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => {
      const notification = prev.find((n) => n.id === id);
      if (!notification) return prev;

      // Add removing class for animation
      const updatedNotifications = prev.map((n) =>
        n.id === id ? { ...n, removing: true } : n
      );

      // Remove after animation completes
      setTimeout(() => {
        setNotifications((current) => current.filter((n) => n.id !== id));
      }, 300);

      return updatedNotifications;
    });
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const updateNotification = useCallback(
    (id: string, updates: Partial<NotificationDataType>) => {
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id
            ? { ...notification, ...updates }
            : notification
        )
      );
    },
    []
  );

  const contextValue: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    updateNotification,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <NotificationSystemStyled>
        <div className="notification-container">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onClose={() => removeNotification(notification.id)}
            />
          ))}
        </div>
      </NotificationSystemStyled>
    </NotificationContext.Provider>
  );
};

type NotificationItemPropsType = {
  notification: NotificationDataType & { removing?: boolean };
  onClose: () => void;
};

const NotificationItem: React.FC<NotificationItemPropsType> = ({
  notification,
  onClose,
}) => {
  const getIcon = () => {
    switch (notification.type) {
      case "success":
        return <CheckCircle className="notification-icon success" />;
      case "error":
        return <AlertCircle className="notification-icon error" />;
      case "warning":
        return <AlertTriangle className="notification-icon warning" />;
      case "info":
        return <Info className="notification-icon info" />;
      case "loading":
        return <Loader className="notification-icon loading" />;
      default:
        return <Info className="notification-icon info" />;
    }
  };

  return (
    <div
      className={`notification ${notification.type} ${
        notification.removing ? "removing" : ""
      }`}
    >
      <div className="notification-content">
        {getIcon()}
        <div className="notification-body">
          <div className="notification-title">{notification.title}</div>
          {notification.message && (
            <div className="notification-message">{notification.message}</div>
          )}
          {notification.actions && notification.actions.length > 0 && (
            <div className="notification-actions">
              {notification.actions.map((action, index) => (
                <button
                  key={index}
                  type="button"
                  className={`notification-action ${
                    action.style || "secondary"
                  }`}
                  onClick={action.action}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {!notification.persistent && (
          <button
            type="button"
            className="notification-close"
            onClick={onClose}
            aria-label="Close notification"
          >
            <X size={16} />
          </button>
        )}
      </div>
      {typeof notification.progress === "number" && (
        <div className="notification-progress">
          <div
            className={`notification-progress-bar ${notification.type}`}
            style={{
              width: `${Math.max(0, Math.min(100, notification.progress))}%`,
            }}
          />
        </div>
      )}
    </div>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};

// Convenience hooks for different notification types
export const useNotificationHelpers = () => {
  const { addNotification, updateNotification, removeNotification } =
    useNotifications();

  const showSuccess = useCallback(
    (
      title: string,
      message?: string,
      options?: Partial<NotificationDataType>
    ) => addNotification({ type: "success", title, message, ...options }),
    [addNotification]
  );

  const showError = useCallback(
    (
      title: string,
      message?: string,
      options?: Partial<NotificationDataType>
    ) => addNotification({ type: "error", title, message, ...options }),
    [addNotification]
  );

  const showWarning = useCallback(
    (
      title: string,
      message?: string,
      options?: Partial<NotificationDataType>
    ) => addNotification({ type: "warning", title, message, ...options }),
    [addNotification]
  );

  const showInfo = useCallback(
    (
      title: string,
      message?: string,
      options?: Partial<NotificationDataType>
    ) => addNotification({ type: "info", title, message, ...options }),
    [addNotification]
  );

  const showLoading = useCallback(
    (
      title: string,
      message?: string,
      options?: Partial<NotificationDataType>
    ) =>
      addNotification({
        type: "loading",
        title,
        message,
        persistent: true,
        ...options,
      }),
    [addNotification]
  );

  const showProgress = useCallback(
    (title: string, progress: number, message?: string) => {
      const id = addNotification({
        type: "loading",
        title,
        message,
        progress,
        persistent: true,
      });
      return {
        update: (newProgress: number, newMessage?: string) =>
          updateNotification(id, {
            progress: newProgress,
            message: newMessage,
          }),
        complete: (successTitle?: string, successMessage?: string) => {
          removeNotification(id);
          if (successTitle) {
            showSuccess(successTitle, successMessage);
          }
        },
        error: (errorTitle?: string, errorMessage?: string) => {
          removeNotification(id);
          if (errorTitle) {
            showError(errorTitle, errorMessage);
          }
        },
      };
    },
    [
      addNotification,
      updateNotification,
      removeNotification,
      showSuccess,
      showError,
    ]
  );

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    showProgress,
  };
};

export default NotificationProvider;
