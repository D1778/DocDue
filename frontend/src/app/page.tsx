import { Landing } from '@/components/landing/Landing';
import { RedirectIfLoggedIn } from '@/components/RedirectIfLoggedIn';

// No 'use client' here: this page is a server component, so it is sent as ready-made HTML.
export default function HomePage() {
  return (
    <>
      <RedirectIfLoggedIn />
      <Landing />
    </>
  );
}