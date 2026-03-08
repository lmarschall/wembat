import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Verhindert, dass Vitest die Dateien im dist-Ordner testet
    exclude: ['**/node_modules/**', '**/dist/**', '**/cypress/**', '**/.{idea,git,cache,output,temp}/**'],
    alias: {
      // Hier mappen wir die Aliase auf die tatsächlichen Pfade
      '#crypto': path.resolve(__dirname, './src/crypto/index.ts'), // Pfad prüfen!
      '#prisma': path.resolve(__dirname, './src/api/generated/prisma/client/index.d.ts'),
      '#redis': path.resolve(__dirname, './src/redis/index.ts'),
      '#api': path.resolve(__dirname, './src/api'),
    },
  },
});