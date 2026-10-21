// Quick checks done in the browser BEFORE sending a form, so mistakes show up instantly.
// The backend checks everything again (never trust the browser), so these only improve the experience.

/** Same rules as the backend: 8 to 72 bytes, at least one letter and one number. */
export function passwordProblem(password: string): string | null {
    if (password.length < 8) return 'Use at least 8 characters.';
    if (new TextEncoder().encode(password).length > 72) return 'Use at most 72 characters.';
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        return 'Include at least one letter and one number.';
    }
    return null;
}

export function emailLooksValid(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}