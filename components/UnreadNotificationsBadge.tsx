'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/lib/useUser';
import { listNotifications } from '@/lib/gmail-feature.api';

export default function UnreadNotificationsBadge() {
  const { uid } = useUser();
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    if (!uid) {
      setCount(0);
      return;
    }

    let mounted = true;

    const load = async () => {
      try {
        const data = await listNotifications(true);
        if (!mounted) return;
        setCount((data.notifications || []).length);
      } catch {
        if (!mounted) return;
        setCount(0);
      }
    };

    load();
    const timer = setInterval(load, 30000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [uid]);

  if (!uid || count <= 0) return null;

  return (
    <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-medium text-white">
      {count > 99 ? '99+' : count}
    </span>
  );
}
