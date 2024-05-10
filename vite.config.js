// vite.config.js
import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
// import { PluginOption } from "vite";

export default defineConfig({
  build: {
    minify: "esbuild",
    target: "esnext",

    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, "src/lib/index.ts"),
      name: "NanoSignal",
      // the proper extensions will be added
      fileName: "index",
      formats: ["es", "umd", "cjs"],
    },
  },
  plugins: [
    customCodeStripper(),
    // dts({
    //   include: "./src/lib/",
    //   exclude: ["./dist", "src/**/*.test.ts"],
    // }),
  ],
});

/**
 * @returns {PluginOption}
 */
export function customCodeStripper() {
  return {
    name: "custom-code-stripper",
    enforce: "pre",
    transform(code, id) {
      if (id.endsWith(".ts") && !id.includes("node_modules")) {
        const modifiedCode = code.replace(
          /.*\/\* DEBUG START \*\/.*(\n|\r\n)?[\s\S]*?.*\/\* DEBUG END \*\/.*(\n|\r\n)?/g,
          "",
        );
        return {
          code: modifiedCode,
          map: null, // No source map output
        };
      }
      return null;
    },
  };
}
