'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, List } from 'lucide-react';
import { getDaysUntil, getUrgencyColor } from '@/lib/dateUtils';

export default function CalendarPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  useEffect(() => {
    fetch('/api/calendar').then(r => r.json()).then(d => setEvents(d.events || []));
  }, []);

  const monthDays = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
  const startDow = getDay(monthDays[0]);

  const getEventsForDay = (day: Date) => events.filter(e => {
    try { return isSameDay(parseISO(e.date), day); } catch { return false; }
  });

  const getDotColor = (days: number) => {
    if (days <= 30) return 'bg-red-500';
    if (days <= 90) return 'bg-orange-500';
    if (days <= 180) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const sortedEvents = [...events]
    .filter(e => { try { return getDaysUntil(e.date) >= -30; } catch { return false; } })
    .sort((a, b) => getDaysUntil(a.date) - getDaysUntil(b.date));

  const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Critical Dates Calendar</h1>
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg p-1">
          <button
            onClick={() => setView('calendar')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${view === 'calendar' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <Calendar className="h-4 w-4" /> Calendar
          </button>
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${view === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <List className="h-4 w-4" /> List
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-6">
        {[
          { color: 'bg-red-500', label: 'Within 30 days' },
          { color: 'bg-orange-500', label: 'Within 90 days' },
          { color: 'bg-yellow-500', label: 'Within 6 months' },
          { color: 'bg-green-500', label: 'Safe' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-full ${color}`} />
            <span className="text-xs text-gray-400">{label}</span>
          </div>
        ))}
      </div>

      {view === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">{format(currentDate, 'MMMM yyyy')}</h2>
              <div className="flex gap-2">
                <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1))} className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg">Today</button>
                <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1))} className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-px bg-gray-800 rounded-lg overflow-hidden">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="bg-gray-900 py-2 text-center text-xs font-medium text-gray-500">{d}</div>
              ))}
              {Array.from({ length: startDow }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-gray-900/50 h-20" />
              ))}
              {monthDays.map(day => {
                const dayEvents = getEventsForDay(day);
                const isToday = isSameDay(day, new Date());
                const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`bg-gray-900 h-20 p-2 cursor-pointer hover:bg-gray-800 transition-colors ${isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                  >
                    <span className={`text-xs font-medium block mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>
                      {format(day, 'd')}
                    </span>
                    <div className="flex flex-wrap gap-0.5">
                      {dayEvents.slice(0, 3).map(e => (
                        <div key={e.id} className={`w-2 h-2 rounded-full ${getDotColor(getDaysUntil(e.date))}`} />
                      ))}
                      {dayEvents.length > 3 && <span className="text-[9px] text-gray-500">+{dayEvents.length - 3}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-base font-semibold text-white mb-4">
              {selectedDay ? format(selectedDay, 'MMMM d, yyyy') : 'Select a date'}
            </h2>
            {selectedEvents.length === 0 ? (
              <p className="text-gray-500 text-sm">{selectedDay ? 'No events on this date' : 'Click a date to see events'}</p>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map(e => {
                  const days = getDaysUntil(e.date);
                  const color = getUrgencyColor(days);
                  return (
                    <Link key={e.id} href={`/leases/${e.leaseId}`} className={`block p-3 rounded-lg border ${color} hover:opacity-80 transition-opacity`}>
                      <p className="text-sm font-medium">{e.label}</p>
                      <p className="text-xs opacity-75 mt-0.5">{e.propertyAddress || e.tenantName}</p>
                      <p className="text-xs opacity-60 mt-1">{days >= 0 ? `${days} days away` : `${Math.abs(days)} days overdue`}</p>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium uppercase">Event</th>
                <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium uppercase">Property</th>
                <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium uppercase">Days Away</th>
                <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium uppercase">Urgency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {sortedEvents.map(e => {
                const days = getDaysUntil(e.date);
                const color = getUrgencyColor(days);
                return (
                  <tr key={e.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-300">{format(parseISO(e.date), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3 text-sm text-white">{e.label}</td>
                    <td className="px-4 py-3">
                      <Link href={`/leases/${e.leaseId}`} className="text-sm text-blue-400 hover:text-blue-300">
                        {e.propertyAddress || e.tenantName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">{days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${color}`}>
                        {days <= 30 ? 'Critical' : days <= 90 ? 'Warning' : days <= 180 ? 'Caution' : 'Safe'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
