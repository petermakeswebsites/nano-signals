// vite.config.js
import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'


export default defineConfig({
    build: {
        minify: false,
        target: 'modules',

        lib: {
            // Could also be a dictionary or array of multiple entry points
            entry: resolve(__dirname, 'src/lib/index.ts'),
            name: 'NanoSignal',
            // the proper extensions will be added
            fileName: 'index',
            formats: ["cjs", "es", "umd"]
        },
    },
    plugins: [dts({
        include: "./src/lib/",
    })]
})
