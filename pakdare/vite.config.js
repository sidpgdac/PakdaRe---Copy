import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// leaflet.heat and leaflet.markercluster use bare `L` as a global variable.
// In Vite's ES module output, bare `L` doesn't resolve to window.L.
// This plugin injects `import L from 'leaflet'` so `L` is a proper module binding.
const leafletPluginFix = {
  name: 'leaflet-plugin-global',
  transform(code, id) {
    if (id.includes('node_modules/leaflet.heat') || id.includes('node_modules/leaflet.markercluster')) {
      return { code: `import L from 'leaflet';\n${code}`, map: null };
    }
  },
};

const CHUNK_MAP = {
  'vendor-react':    id => ['react', 'react-dom', 'react/'].some(p => id.includes(`/node_modules/${p}`)),
  'vendor-supabase': id => id.includes('/node_modules/@supabase/'),
  'vendor-leaflet':  id => id.includes('/node_modules/leaflet') || id.includes('/node_modules/react-leaflet'),
  'vendor-charts':   id => id.includes('/node_modules/chart.js') || id.includes('/node_modules/react-chartjs-2'),
  'vendor-motion':   id => id.includes('/node_modules/framer-motion'),
  'vendor-geo':      id => id.includes('/node_modules/@turf/'),
  'vendor-pdf':      id => id.includes('/node_modules/jspdf'),
  'vendor-i18n':     id => id.includes('/node_modules/i18next') || id.includes('/node_modules/react-i18next'),
};

export default defineConfig({
  plugins: [react(), leafletPluginFix],
  css: {
    lightningcss: false,
  },
  optimizeDeps: {
    include: ['react-window'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          for (const [chunk, test] of Object.entries(CHUNK_MAP)) {
            if (test(id)) return chunk;
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
    minify: 'terser',
    cssMinify: false,
  },
});
