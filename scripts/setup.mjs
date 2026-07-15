import { spawn } from "node:child_process";
import process from "node:process";

const minimumMajor = 18;
const currentMajor = Number.parseInt(process.versions.node.split(".")[0], 10);

if (currentMajor < minimumMajor) {
  console.error(`需要 Node.js ${minimumMajor} 或更高版本，当前版本是 ${process.versions.node}。`);
  console.error("请先从 https://nodejs.org/ 安装长期支持版，然后重新运行本安装器。");
  process.exit(1);
}

console.log(`Node.js ${process.versions.node} 检查通过。`);
console.log("正在安装并锁定 Two of Us 的共享依赖……");

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const child = spawn(npmCommand, ["install", "--no-audit", "--no-fund"], {
  cwd: new URL("..", import.meta.url),
  stdio: "inherit",
});

child.once("error", (error) => {
  console.error(`无法运行 npm：${error.message}`);
  process.exit(1);
});

child.once("exit", (code, signal) => {
  if (signal) {
    console.error(`安装被信号 ${signal} 中断。`);
    process.exit(1);
  }

  if (code !== 0) {
    console.error(`依赖安装失败，npm 退出码：${code}。`);
    process.exit(code ?? 1);
  }

  console.log("共享依赖安装完成。现在可以双击 start.command 或 start.bat。");
});
