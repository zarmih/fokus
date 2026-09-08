import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/fokus/' : '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('src/exercises/')) {
            const parts = id.split('src/exercises/')[1].split('/');
            if (parts.length > 1) {
              return `ex-${parts[0]}`; // Each exercise goes into its own chunk
            }
          }
        }
      }
    }
  }
}));
