import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const sourceRoots = ["experiences", "shared", "scripts"];
const testFilePattern = /\.test\.(?:js|mjs)$/;

export async function collectProjectTestFiles(rootDir = projectRoot) {
  const rootPath = path.resolve(rootDir instanceof URL ? fileURLToPath(rootDir) : rootDir);
  const files = [];
  for (const sourceRoot of sourceRoots) {
    await collectFromDirectory(path.join(rootPath, sourceRoot), files);
  }
  return files.sort();
}

async function collectFromDirectory(directory, files) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectFromDirectory(entryPath, files);
    else if (entry.isFile() && testFilePattern.test(entry.name)) files.push(entryPath);
  }
}

async function run() {
  const files = await collectProjectTestFiles();
  if (files.length === 0) {
    console.error("没有在 experiences、shared 或 scripts 中找到项目测试。");
    process.exitCode = 1;
    return;
  }

  const child = spawn(process.execPath, ["--test", ...files], {
    cwd: projectRoot,
    stdio: "inherit",
  });
  child.once("error", (error) => {
    console.error(`无法启动测试：${error.message}`);
    process.exitCode = 1;
  });
  child.once("exit", (code, signal) => {
    if (signal) {
      console.error(`测试被信号 ${signal} 中断。`);
      process.exitCode = 1;
      return;
    }
    process.exitCode = code ?? 1;
  });
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) await run();

