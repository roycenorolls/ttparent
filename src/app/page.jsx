'use client';
import AppHeader from '@/components/AppHeader';
import { useEffect, useState } from 'react';
import { getGreeting } from '@/lib/time';
import { api } from '@/lib/api';
import ChildSwitcher  from '@/components/ChildSwitcher';
import DayTimeline    from '@/components/DayTimeline';
import UpdatesFeed, { isPinnedReminder, ReminderList } from '@/components/UpdatesFeed';
import TeacherWhatsApp from '@/components/TeacherWhatsApp';
import HomeGreeting   from '@/components/HomeGreeting';

export default function HomePage() {
  const [parent,   setParent]   = useState(null);
  const [children, setChildren] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [child,    setChild]    = useState(null);
  const [status,   setStatus]   = useState(null);
  const [updates,  setUpdates]  = useState([]);
  const [error,    setError]    = useState(null);

  // Set after mount: the server's clock is UTC, so rendering it there would
  // mismatch the phone's local time and break hydration.
  const [greeting, setGreeting] = useState(null);

  // Load parent + children on mount
  useEffect(() => {
    setGreeting(getGreeting());

    api.membership()
      .then(data => {
        setParent(data.parent);
        setChildren(data.children || []);
        if (data.children?.length) setActiveId(data.children[0].id);
      })
      .catch(() => setError('Could not load profile.'));

    api.updates()
      .then(data => setUpdates(data.updates || []))
      .catch(() => {});
  }, []);

  // Load per-child data when active child changes
  useEffect(() => {
    if (!activeId) return;
    api.childProfile(activeId)
      .then(data => {
        setChild(data.child);
        setStatus(data.status);
      })
      .catch(() => {});
  }, [activeId]);

  // This child's posts (class-wide ones included), split into today and earlier.
  const mine    = updates.filter(u => !u.child_ids?.length || u.child_ids.includes(activeId));
  const today   = new Date().toDateString();
  const isToday = u => new Date(u.created_at).toDateString() === today;
  // Announcements are the first thing parents see, above the child's status.
  const reminders = mine.filter(isPinnedReminder);
  const rest      = mine.filter(u => !isPinnedReminder(u));
  const todays    = rest.filter(isToday);
  const earlier   = rest.filter(u => !isToday(u));

  if (error) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--tt-muted)' }}>{error}</div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 24 }}>
      <AppHeader title="Home" />

      {/* Greeting, with the child pills overlapping its bottom edge */}
      <div style={{ margin: '4px 16px 0' }}>
        {greeting && <HomeGreeting
          greeting={greeting}
          name={parent?.name && `${parent.title || 'Ms.'} ${parent.name.split(' ')[0]}`}
          hasSwitcher={children.length > 1}
        />}
        <ChildSwitcher children={children} activeId={activeId} onChange={setActiveId}
                       style={{ position: 'relative', zIndex: 2, marginTop: -26, padding: '0 4px 6px' }} />
      </div>

      <ReminderList updates={reminders} />
      <DayTimeline child={child} status={status} updates={todays} reminders={[]} />
      <UpdatesFeed updates={earlier} accentStart={todays.length} />
      {child?.teacher && <TeacherWhatsApp teacher={child.teacher} />}
    </div>
  );
}
