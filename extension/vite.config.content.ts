import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/content/content.ts'),
      name: 'SpideyAgentContentScript',
      formats: ['iife'],
      fileName: () => 'content.js'
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    }
  },
  plugins: [
    {
      name: 'remove-import-meta-for-content-script',
      renderChunk(code) {
        return code.replaceAll(
          'import.meta.url',
          '(typeof chrome !== "undefined" && chrome.runtime?.getURL ? chrome.runtime.getURL("") : window.location.href)'
        );
      }
    }
  ]
});
