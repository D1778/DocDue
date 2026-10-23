'use client';

import { useEffect } from 'react';
import { API_URL } from '@/lib/api';
import { healthUrl } from '@/lib/health';

// Free hosting puts the backend to sleep after 15 minutes without visitors, and waking it takes
// about a minute. This sends one tiny request as soon as any page opens, so by the time the
// visitor has typed an email address, the backend is already awake.
export function WarmUp() {
    useEffect(() => {
        const url = healthUrl(API_URL);
        if (!url) return;
        // no-cors: the answer is not needed, the request itself is what wakes the server
        fetch(url, { mode: 'no-cors', cache: 'no-store' }).catch(() => { });
    }, []);
    return null;
}