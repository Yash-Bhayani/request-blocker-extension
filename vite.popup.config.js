import { defineConfig } from 'vite'

export default defineConfig({
    build: {
        outDir: 'dist',
        emptyOutDir: false,

        rollupOptions: {
            input: './src/alpine-popup.js',

            output: {
                entryFileNames: 'popup.js'
            }
        }
    }
})