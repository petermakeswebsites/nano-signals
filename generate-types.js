import ts from "typescript";
import { promises as fs } from "fs";
import path from "path";

async function compileTypeScript(files, options) {
  const program = ts.createProgram(files, options);
  program.emit(); // This compiles the source and generates declaration files as per options
}

// Function to apply custom code stripping to a file content
async function applyTransformations(sourceFilePath) {
  const sourceText = await fs.readFile(sourceFilePath, "utf8");
  return sourceText.replace(
    /.*\/\* DEBUG START \*\/.*(\n|\r\n)?[\s\S]*?.*\/\* DEBUG END \*\/.*(\n|\r\n)?/g,
    "",
  );
}

// Main function to process each TypeScript file asynchronously
async function processFiles() {
  const files = ["./src/lib/index.ts"]; // Add more files as needed
  const transformedFiles = await Promise.all(
    files.map(async (file) => {
      const transformedSource = await applyTransformations(file);
      const transformedPath = path.resolve("./temp", path.basename(file));
      await fs.writeFile(transformedPath, transformedSource, "utf8");
      return transformedPath;
    }),
  );

  const options = {
    noEmitOnError: true,
    noImplicitAny: true,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    declaration: true,
    outDir: "dist/types",
  };

  compileTypeScript(transformedFiles, options);
}

processFiles();
