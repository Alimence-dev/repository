import { useEffect, useRef, useState } from 'react';
import { listNotifications, markNotificationRead } from '../services/notificationsService';
import { connectSocket } from '../services/socket';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    listNotifications()
      .then(setNotifications)
      .catch(() => {});

    const socket = connectSocket();
    if (!socket) return undefined;

    function handleNotification(notification) {
      setNotifications((prev) => [{ ...notification, is_read: false }, ...prev]);
    }

    socket.on('notification', handleNotification);
    return () => socket.off('notification', handleNotification);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function handleMarkRead(id) {
    await markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n)));
  }

  return (
    <div className="relative inline-block shrink-0" ref={containerRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex items-center gap-1.5 text-sm border border-slate-300 rounded-md px-3 py-1.5 text-slate-700 hover:bg-slate-50 whitespace-nowrap"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[1.15rem] h-[1.15rem] px-1 rounded-full bg-red-600 text-white text-[11px] leading-none">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white border border-slate-200 rounded-lg shadow-lg z-30 max-h-96 overflow-y-auto">
          <div className="px-4 py-2 border-b border-slate-100 text-sm font-semibold text-slate-900">Notifications</div>
          {notifications.length === 0 && <p className="p-4 text-sm text-slate-400">No notifications.</p>}
          {notifications.map((n) => (
            <div
              key={n.notification_id}
              onClick={() => !n.is_read && handleMarkRead(n.notification_id)}
              className={`px-4 py-3 border-b border-slate-100 text-sm cursor-pointer hover:bg-slate-50 ${
                n.is_read ? 'text-slate-400' : 'text-slate-800 font-medium'
              }`}
            >
              {n.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
