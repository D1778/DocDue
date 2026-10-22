import type { ReactNode } from 'react';
import { NavBar } from '@/components/NavBar';
import { RequireAuth } from '@/components/RequireAuth';
import { RouteBackdrop } from '@/components/RouteBackdrop';

// Every page inside the (protected) folder is wrapped by this layout:
// it checks the login, paints the page's background theme and shows the top bar.
// The folder name in brackets does NOT appear in the web address.
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <RouteBackdrop />
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </RequireAuth>
  );
}
