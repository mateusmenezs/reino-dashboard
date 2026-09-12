import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Build da versão AVULSA: um único HTML, sem divisão de chunks, para subir
 * em hospedagem estática sem etapa de build. O script inline-mentoria.mjs
 * costura CSS e JS dentro do HTML depois deste build.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-mentoria',
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100000000, // fontes/imagens viram data URI
    rollupOptions: {
      input: 'mentoria.html',
      output: { inlineDynamicImports: true, entryFileNames: 'app.js', assetFileNames: 'app.[ext]' },
    },
  },
})
