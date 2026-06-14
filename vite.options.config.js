import { defineConfig } from 'vite'

export default defineConfig({
    build: {
        outDir: 'dist',
        emptyOutDir: false,

        rollupOptions: {
            input: './src/alpine-options.js',

            output: {
                entryFileNames: 'options.js'
            }
        }
    }
})