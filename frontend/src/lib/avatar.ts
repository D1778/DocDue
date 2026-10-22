// Turns a photo the user picked into a small square JPEG (as a data URL) in the browser,
// so only a few kilobytes ever travel to the server.

export const AVATAR_SIZE = 256;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PICK_MB = 8;

/** A message when the file cannot be used as a picture, otherwise null. */
export function validateAvatarFile(file: File): string | null {
    if (!ACCEPTED.includes(file.type)) return 'Please choose a JPEG, PNG or WebP picture.';
    if (file.size > MAX_PICK_MB * 1024 * 1024) return `Please choose a picture under ${MAX_PICK_MB} MB.`;
    return null;
}

/** Crops the middle square of the picture, shrinks it to 256 x 256 and returns it as a JPEG data URL. */
export async function fileToAvatar(file: File): Promise<string> {
    const bitmap = await createImageBitmap(file);
    try {
        const side = Math.min(bitmap.width, bitmap.height);
        const canvas = document.createElement('canvas');
        canvas.width = AVATAR_SIZE;
        canvas.height = AVATAR_SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Your browser cannot prepare this picture.');
        ctx.fillStyle = '#fff'; // PNGs with see-through areas become white, not black
        ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
        ctx.drawImage(
            bitmap,
            (bitmap.width - side) / 2,
            (bitmap.height - side) / 2,
            side,
            side,
            0,
            0,
            AVATAR_SIZE,
            AVATAR_SIZE,
        );
        return canvas.toDataURL('image/jpeg', 0.85);
    } finally {
        bitmap.close();
    }
}
