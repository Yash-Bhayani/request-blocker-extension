import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
    build: {
        outDir: 'dist',
        emptyOutDir: false, // Prevents deleting popup files
        rollupOptions: {
            input: {
                options: resolve(__dirname, 'options.html')
            }
        }
    }
})