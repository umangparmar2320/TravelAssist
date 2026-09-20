import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  RefreshCw,
  Send,
  Zap,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  Smartphone,
  Mail,
} from 'lucide-react';
import { TravelNotification } from '../types/unifiedContract';

interface NotificationsViewProps {
  userId?: string;
  onNavigateToTab?: (tab: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  userId = 'usr-corp-01',
  onNavigateToTab,
}) => {
  const [notifications, setNotifications] = useState<TravelNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<string>('ALL');

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.warn('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [userId]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${userId}/read/${id}`, { method: 'POST' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateLiveEvent = async () => {
    setSimulating(true);
    try {
      const res = await fetch('/api/realtime/simulate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip_id: 'trip-mb-goa-001',
          type: 'TRAIN_CANCELLED',
          description: 'Flash disruption: Route 12051 suspended. Multi-modal re-routing active.',
        }),
      });
      if (res.ok) {
        await fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  const filtered = notifications.filter((n) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'UNREAD') return !n.read;
    return n.type === filterType;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">CRITICAL</span>;
      case 'WARNING':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">WARNING</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">INFO</span>;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'TELEGRAM':
        return <span className="inline-flex items-center gap-1 text-[11px] text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-200"><MessageSquare className="w-3 h-3" /> Telegram Bot</span>;
      case 'SMS':
        return <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"><Smartphone className="w-3 h-3" /> SMS Gateway</span>;
      case 'EMAIL':
        return <span className="inline-flex items-center gap-1 text-[11px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-200"><Mail className="w-3 h-3" /> Corporate Email</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200"><Bell className="w-3 h-3" /> In-App Push</span>;
    }
  };

  return (
    <div id="notifications-view" className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
              Part D: Frontend & Real-Time Notifications
            </span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            Journey Notification Dispatch Center
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Multi-channel real-time notifications for automated disruption alerts, alternative flight bookings, and hotel updates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSimulateLiveEvent}
            disabled={simulating}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{simulating ? 'Simulating Event...' : 'Simulate In-Transit Event'}</span>
          </button>

          <button
            type="button"
            onClick={fetchNotifications}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-xl text-xs">
        {[
          { id: 'ALL', label: 'All Alerts' },
          { id: 'UNREAD', label: 'Unread Only' },
          { id: 'DISRUPTION_DETECTED', label: 'Disruptions' },
          { id: 'ALTERNATIVE_FOUND', label: 'Alternatives' },
          { id: 'AUTO_REBOOKED', label: 'Rebookings' },
          { id: 'HOTEL_UPDATED', label: 'Hotel Stays' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterType(tab.id)}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filterType === tab.id
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 flex items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
          <span>Fetching notification feed...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          <CheckCheck className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
          <h3 className="font-semibold text-slate-800 text-base">Inbox Clear</h3>
          <p className="text-xs text-slate-500 mt-1">No alerts match the selected filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`p-5 rounded-2xl border transition-all ${
                !item.read
                  ? 'bg-white border-blue-200/80 shadow-xs ring-1 ring-blue-100'
                  : 'bg-white/80 border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      item.type === 'DISRUPTION_DETECTED'
                        ? 'bg-rose-50 text-rose-600 border border-rose-200'
                        : item.type === 'AUTO_REBOOKED'
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        : item.type === 'HOTEL_UPDATED'
                        ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                        : 'bg-amber-50 text-amber-600 border border-amber-200'
                    }`}
                  >
                    {item.type === 'DISRUPTION_DETECTED' ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : item.type === 'AUTO_REBOOKED' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : item.type === 'HOTEL_UPDATED' ? (
                      <Building2 className="w-5 h-5" />
                    ) : (
                      <Bell className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-sm">{item.title}</h3>
                      {getUrgencyBadge(item.urgency)}
                      {getChannelIcon(item.channel)}
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{item.message}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!item.read && (
                    <button
                      type="button"
                      onClick={() => handleMarkAsRead(item.id)}
                      className="px-2.5 py-1 text-[11px] text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition"
                    >
                      Mark Read
                    </button>
                  )}
                  {onNavigateToTab && item.action_link && (
                    <button
                      type="button"
                      onClick={() => {
                        const tab = item.action_link?.includes('disrupt')
                          ? 'disruptions'
                          : item.action_link?.includes('hotel')
                          ? 'hotels'
                          : 'trips';
                        onNavigateToTab(tab);
                      }}
                      className="p-1.5 text-emerald-600 hover:text-emerald-800 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition"
                      title="Navigate to item"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
