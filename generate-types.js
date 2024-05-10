import fs from "fs/promises";
import path from "path";
import os from "os";
import ts from "typescript";

// Function to recursively find all files in a directory
async function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = await fs.readdir(dirPath, { withFileTypes: true });
  for (let file of files) {
    if (file.isDirectory()) {
      arrayOfFiles = await getAllFiles(
        path.join(dirPath, file.name),
        arrayOfFiles,
      );
    } else {
      if (!file.name.endsWith(".test.ts")) {
        arrayOfFiles.push(path.join(dirPath, file.name));
      }
    }
  }
  return arrayOfFiles;
}

// Function to process a single file's contents
async function processFile(filePath, tempDir) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    const modifiedCode = data.replace(
      /.*\/\* DEBUG START \*\/.*(\n|\r\n)?[\s\S]*?.*\/\* DEBUG END \*\/.*(\n|\r\n)?/g,
      "",
    );
    const newPath = path.join(tempDir, path.relative(process.cwd(), filePath));
    await fs.mkdir(path.dirname(newPath), { recursive: true });
    await fs.writeFile(newPath, modifiedCode);
    console.log(`Processed and saved: ${newPath}`);
  } catch (err) {
    console.error(`Error processing ${filePath}: ${err}`);
  }
}

// TypeScript compilation
async function compileTypeScript(srcDir, distDir) {
  const configPath = ts.findConfigFile(
    "./",
    ts.sys.fileExists,
    "tsconfig.json",
  );
  if (!configPath) throw new Error("Could not find a valid 'tsconfig.json'.");

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsedCommandLine = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath),
  );

  // Override outDir to distDir and include only srcDir
  parsedCommandLine.options.outDir = distDir;
  parsedCommandLine.options.declaration = true;
  parsedCommandLine.options.emitDeclarationOnly = true;
  parsedCommandLine.fileNames = await getAllFiles(srcDir);

  const program = ts.createProgram(
    parsedCommandLine.fileNames,
    parsedCommandLine.options,
  );
  const emitResult = program.emit();

  const allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);

  allDiagnostics.forEach((diagnostic) => {
    if (diagnostic.file) {
      const { line, character } = ts.getLineAndCharacterOfPosition(
        diagnostic.file,
        diagnostic.start,
      );
      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        "\n",
      );
      console.log(
        `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`,
      );
    } else {
      console.log(
        ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
      );
    }
  });

  console.log("TypeScript compilation completed.");
}

// Main function to handle the operations
async function main() {
  const srcDir = path.join(process.cwd(), "src/lib");
  const tempDir = path.join(os.tmpdir(), "processed-files");
  const distDir = path.join(process.cwd(), "dist");

  // Ensure directories are clean and exist
  await fs.rm(tempDir, { recursive: true, force: true });
  await fs.mkdir(tempDir, { recursive: true });
  await fs.mkdir(distDir, { recursive: true, force: true });

  const allFiles = await getAllFiles(srcDir);
  for (const filePath of allFiles) {
    await processFile(filePath, tempDir);
  }
  console.log("All files have been processed.");

  await compileTypeScript(tempDir, distDir);
}

main().catch(console.error);
