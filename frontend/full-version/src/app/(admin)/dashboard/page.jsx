'use client';

// @next
import { useRouter } from 'next/navigation';

import { useEffect } from 'react';

/***************************  DASHBOARD  ***************************/

export default function Dashboard() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/analytics');
  }, [router]);

  return null;
}
