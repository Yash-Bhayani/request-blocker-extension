import { defineConfig } from 'vite'

export default defineConfig({
    build: {
        outDir: 'dist',
        emptyOutDir: false
    },

    plugins: [
        {
            name: 'multi-build',
            apply: 'build',
            async buildStart() {
                // nothing here (we rely on Vite multi entry via CLI OR separate configs)
            }
        }
    ]
})