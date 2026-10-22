'use client';

import { usePathname } from 'next/navigation';
import { Backdrop } from './brand/Backdrop';
import type { BackdropVariant } from './brand/Backdrop';

// Picks the background theme for the page being shown inside the logged-in area.
function themeFor(pathname: string): BackdropVariant {
    if (pathname === '/documents/new') return 'upload';
    if (pathname.startsWith('/documents/')) return 'detail';
    if (pathname.startsWith('/team')) return 'team';
    if (pathname.startsWith('/profile')) return 'profile';
    return 'vault';
}

export function RouteBackdrop() {
    const pathname = usePathname() ?? '';
    return <Backdrop variant={themeFor(pathname)} fixed />;
}
