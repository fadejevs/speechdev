'use client';

// @next
import { useRouter } from 'next/navigation';

import { useEffect } from 'react';

/***************************  SETTING  ***************************/

export default function Setting() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/setting/profile');
  }, [router]);

  return null;
}
