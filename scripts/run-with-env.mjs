import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const separatorIndex = process.argv.indexOf("--");
const envFile = process.argv[2];

if (!envFile || separatorIndex < 0 || separatorIndex === process.argv.length - 1) {
  console.error("Usage: node scripts/run-with-env.mjs <env-file> -- <command> [...args]");
  process.exit(1);
}

const resolvedEnvPath = path.isAbsolute(envFile) ? envFile : path.join(repoRoot, envFile);
loadEnvFile(resolvedEnvPath);

const [command, ...args] = process.argv.slice(separatorIndex + 1);
const commandOptions = createCommandOptions(command, args);
const child = spawn(commandOptions.command, commandOptions.args, {
  env: process.env,
  shell: commandOptions.shell,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

function loadEnvFile(filePath) {
  let contents;

  try {
    contents = readFileSync(filePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      console.error(`[run-with-env] 환경 파일을 찾을 수 없습니다:\n  ${filePath}`);
      console.error(
        "[run-with-env] 프로젝트 루트에 `.env`를 두세요. 예: `.env.example`을 복사해 수정 (`package.json`은 기본으로 `.env`를 로드합니다).",
      );
      process.exit(1);
    }

    throw error;
  }

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");

    if (equalsIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimQuotes(trimmed.slice(equalsIndex + 1).trim());

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function trimQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function createCommandOptions(command, args) {
  const needsWindowsShell =
    process.platform === "win32" &&
    !/\.(?:exe)$/i.test(command) &&
    ["netlify", "npm", "npx", "tsx", "vite", "cmd", "powershell"].includes(command.toLowerCase());

  if (!needsWindowsShell) {
    return { command, args, shell: false };
  }

  return {
    command: [command, ...args].map(quoteWindowsShellArg).join(" "),
    args: [],
    shell: true,
  };
}

function quoteWindowsShellArg(value) {
  if (/^[A-Za-z0-9_./:=@-]+$/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '\\"')}"`;
}
