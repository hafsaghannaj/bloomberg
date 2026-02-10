'use client';

import { useEffect } from 'react';
import { useTerminalStore } from '@/store/terminal';
import { X, Bell, Info, CheckCircle } from 'lucide-react';

export default function NotificationToast() {
  const { notifications, removeNotification } = useTerminalStore();

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (notifications.length === 0) return;
    const latest = notifications[0];
    const timer = setTimeout(() => removeNotification(latest.id), 5000);
    return () => clearTimeout(timer);
  }, [notifications, removeNotification]);

  if (notifications.length === 0) return null;

  const icons = {
    alert: <Bell size={14} className="text-bloomberg-amber" />,
    info: <Info size={14} className="text-bloomberg-blue" />,
    success: <CheckCircle size={14} className="text-bloomberg-green" />,
  };

  const borders = {
    alert: 'border-bloomberg-amber',
    info: 'border-bloomberg-blue',
    success: 'border-bloomberg-green',
  };

  return (
    <div className="fixed top-12 right-3 z-50 flex flex-col gap-2 max-w-xs">
      {notifications.slice(0, 3).map((notif, i) => (
        <div
          key={notif.id}
          className={`toast-enter bg-bloomberg-bg-panel border ${borders[notif.type]} rounded px-3 py-2 flex items-start gap-2 shadow-lg`}
          style={{ animationDelay: `${i * 100}ms` }}
        >
          {icons[notif.type]}
          <span className="text-bloomberg-text-secondary text-xs flex-1 leading-tight">
            {notif.message}
          </span>
          <button
            onClick={() => removeNotification(notif.id)}
            className="text-bloomberg-text-muted hover:text-bloomberg-orange shrink-0"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
