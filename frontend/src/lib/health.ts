// The backend's health address, worked out from the API address:
// "https://docdue-api.onrender.com/api/v1" becomes "https://docdue-api.onrender.com/health".
// Returns an empty string when the API address is not a valid web address.
export function healthUrl(apiUrl: string): string {
    try {
        return new URL('/health', apiUrl).href;
    } catch {
        return '';
    }
}