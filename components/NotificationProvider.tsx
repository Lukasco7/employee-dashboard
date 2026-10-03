'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import AppNotification, {
  type NotificationType,
} from '@/components/AppNotification';

interface NotificationOptions {
  type: NotificationType;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface NotificationContextValue {
  notify: (options: NotificationOptions) => void;
  success: (
    message: string,
    title?: string
  ) => void;
  error: (
    message: string,
    title?: string
  ) => void;
  warning: (
    message: string,
    title?: string
  ) => void;
  info: (
    message: string,
    title?: string
  ) => void;
  clearNotification: () => void;
}

interface ActiveNotification
  extends NotificationOptions {
  id: number;
}

const NotificationContext =
  createContext<NotificationContextValue | null>(
    null
  );

export function NotificationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    notification,
    setNotification,
  ] = useState<ActiveNotification | null>(
    null
  );

  const clearNotification =
    useCallback(() => {
      setNotification(null);
    }, []);

  const notify = useCallback(
    (options: NotificationOptions) => {
      setNotification({
        ...options,
        id: Date.now(),
      });
    },
    []
  );

  const success = useCallback(
    (
      message: string,
      title = 'Success'
    ) => {
      notify({
        type: 'success',
        title,
        message,
      });
    },
    [notify]
  );

  const error = useCallback(
    (
      message: string,
      title = 'Something went wrong'
    ) => {
      notify({
        type: 'error',
        title,
        message,
      });
    },
    [notify]
  );

  const warning = useCallback(
    (
      message: string,
      title = 'Warning'
    ) => {
      notify({
        type: 'warning',
        title,
        message,
      });
    },
    [notify]
  );

  const info = useCallback(
    (
      message: string,
      title = 'Information'
    ) => {
      notify({
        type: 'info',
        title,
        message,
      });
    },
    [notify]
  );

  const value = useMemo(
    () => ({
      notify,
      success,
      error,
      warning,
      info,
      clearNotification,
    }),
    [
      notify,
      success,
      error,
      warning,
      info,
      clearNotification,
    ]
  );

  return (
    <NotificationContext.Provider
      value={value}
    >
      {children}

      {notification && (
        <AppNotification
          key={notification.id}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          actionLabel={
            notification.actionLabel
          }
          onAction={
            notification.onAction
          }
          onClose={
            clearNotification
          }
        />
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context =
    useContext(NotificationContext);

  if (!context) {
    throw new Error(
      'useNotification must be used inside NotificationProvider'
    );
  }

  return context;
}