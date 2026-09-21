'use client';
import AppHeader from '@/components/AppHeader';
import { useEffect, useState } from 'react';
import { getGreeting } from '@/lib/time';
import { api } from '@/lib/api';
import ChildSwitcher  from '@/components/ChildSwitcher';
import MembershipCard from '@/components/MembershipCard';
import CheckInCard    from '@/components/CheckInCard';
import HappeningNow   from '@/components/HappeningNow';
import UpdatesFeed    from '@/components/UpdatesFeed';
import TeacherWhatsApp from '@/components/TeacherWhatsApp';

export default function HomePage() {
  const [parent,   setParent]   = useState(null);
  const [children, setChildren] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [child,    setChild]    = useState(null);
  const [status,   setStatus]   = useState(null);
  const [slots,    setSlots]    = useState([]);
  const [updates,  setUpdates]  = useState([]);
  const [error,    setError]    = useState(null);

  const greeting = getGreeting();

  // Load parent + children on mount
  useEffect(() => {
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
    api.scheduleToday(activeId)
      .then(data => setSlots(data.slots || []))
      .catch(() => {});
  }, [activeId]);

  if (error) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--tt-muted)' }}>{error}</div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 24 }}>
      <AppHeader title="Home" />

      {/* Greeting */}
      <div style={{ padding: '4px 20px 0' }}>
        <div style={{
          margin: 0, fontFamily: 'var(--tt-font-heading)', fontSize: 24, fontWeight: 800,
          letterSpacing: '-0.02em', color: '#0F172A',
        }}>
          {greeting.text}
          {parent?.name && <>, <span style={{ color: 'var(--tt-cobalt)' }}>{parent.title || 'Ms.'} {parent.name.split(' ')[0]}</span></>}
        </div>
        <div style={{ fontSize: 14, color: '#64748B', fontWeight: 500, marginTop: 2 }}>{greeting.sub}</div>
      </div>

      <ChildSwitcher children={children} activeId={activeId} onChange={setActiveId} style={{ padding: '0 16px' }} />
      <MembershipCard parent={parent} children={children} />
      <CheckInCard child={child} status={status} />
      <HappeningNow slots={slots} />
      <UpdatesFeed updates={updates.filter(u => !u.child_ids?.length || u.child_ids.includes(activeId))} />
      {child?.teacher && <TeacherWhatsApp teacher={child.teacher} />}
    </div>
  );
}
