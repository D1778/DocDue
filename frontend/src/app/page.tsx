'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FullPageSpinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';

// The home page has nothing of its own: it sends visitors to the right place.
export default function HomePage() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') router.replace('/documents');
    if (status === 'anonymous') router.replace('/login');
  }, [status, router]);

  return <FullPageSpinner />;
  }
