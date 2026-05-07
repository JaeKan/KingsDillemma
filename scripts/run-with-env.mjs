import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";

const separatorIndex = process.argv.indexOf("--");
const envFile = process.argv[2];

if (!envFile || separatorIndex < 0 || separatorIndex === process.argv.length - 1) {
  console.error("Usage: node scripts/run-with-env.mjs <env-file> -- <command> [...args]");
  process.exit(1);
}

loadEnvFile(envFile);

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

function loadEnvFile(path) {
  let contents;

  try {
    contents = readFileSync(path, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      console.warn(`Env file not found: ${path}`);
      return;
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
