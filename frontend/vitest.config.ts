import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // lets the tests use the same "@/lib/..." imports as the app ("@" means the src folder)
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/lib/**/*.test.ts'],
  },
});