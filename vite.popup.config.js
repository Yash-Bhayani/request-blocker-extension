import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
    build: {
        outDir: 'dist',
        emptyOutDir: false, // Prevents deleting options files
        rollupOptions: {
            input: {
                popup: resolve(__dirname, 'popup.html')
            }
        }
    }
})