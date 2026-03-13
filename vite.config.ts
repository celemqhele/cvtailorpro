
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react', 'motion', 'recharts'],
          pdf: ['pdfjs-dist', 'html-docx-js-typescript', 'mammoth'],
          supabase: ['@supabase/supabase-js']
        }
      }
    }
  }
});
