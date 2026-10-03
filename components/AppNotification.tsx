'use client';

import { useEffect } from 'react';

export type NotificationType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info';

interface AppNotificationProps {
  type: NotificationType;
  title?: string;
  message: string;
  onClose: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

export default function AppNotification({
  type,
  title,
  message,
  onClose,
  actionLabel,
  onAction,
}: AppNotificationProps) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      onClose();
    }, type === 'error' ? 7000 : 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [onClose, type]);

  const styles = {
    success: {
      container:
        'border-green-200 bg-green-50 text-green-800',
      icon: '✓',
      iconStyle:
        'bg-green-600 text-white',
      defaultTitle: 'Success',
    },

    error: {
      container:
        'border-red-200 bg-red-50 text-red-800',
      icon: '!',
      iconStyle:
        'bg-red-600 text-white',
      defaultTitle: 'Something went wrong',
    },

    warning: {
      container:
        'border-yellow-200 bg-yellow-50 text-yellow-800',
      icon: '!',
      iconStyle:
        'bg-yellow-500 text-white',
      defaultTitle: 'Warning',
    },

    info: {
      container:
        'border-blue-200 bg-blue-50 text-blue-800',
      icon: 'i',
      iconStyle:
        'bg-blue-600 text-white',
      defaultTitle: 'Information',
    },
  }[type];

  const handleAction = () => {
    onAction?.();
    onClose();
  };

  return (
    <div
      className="fixed top-4 right-4 z-[9999] w-[calc(100%-2rem)] max-w-md"
      role="alert"
      aria-live="assertive"
    >
      <div
        className={`rounded-xl border shadow-lg p-4 ${styles.container}`}
      >
        <div className="flex items-start gap-3">

          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold ${styles.iconStyle}`}
            aria-hidden="true"
          >
            {styles.icon}
          </div>

          <div className="min-w-0 flex-1">

            <div className="flex items-start justify-between gap-3">

              <h3 className="font-semibold">
                {title || styles.defaultTitle}
              </h3>

              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-md p-1 text-current opacity-60 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current"
                aria-label="Close notification"
              >
                ×
              </button>

            </div>

            <p className="mt-1 text-sm leading-5">
              {message}
            </p>

            {actionLabel && onAction && (
              <button
                type="button"
                onClick={handleAction}
                className="mt-3 rounded-md bg-white/70 px-3 py-1.5 text-sm font-semibold hover:bg-white focus:outline-none focus:ring-2 focus:ring-current"
              >
                {actionLabel}
              </button>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}