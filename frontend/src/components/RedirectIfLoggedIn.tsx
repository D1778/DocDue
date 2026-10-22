'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

// The home page is public and is built once as plain HTML (fast, and search engines can read it).
// This tiny component renders nothing; it only sends people who are already logged in to their documents.
export function RedirectIfLoggedIn() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') router.replace('/documents');
  }, [status, router]);

  return null;
}