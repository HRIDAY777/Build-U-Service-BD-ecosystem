import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export function localFixture(script: string) {
  const target = new URL(process.env.E2E_URL || "http://127.0.0.1:3000");
  if (!["127.0.0.1", "localhost"].includes(target.hostname))
    throw new Error("Fixtures require local development servers.");
  const root = path.resolve(process.cwd(), "..");
  const env: NodeJS.ProcessEnv = { ...process.env, DJANGO_DEBUG: "true" };
  const config = path.join(root, ".env.docker.local");
  if (!env.DATABASE_URL && fs.existsSync(config)) {
    const values = Object.fromEntries(
      fs
        .readFileSync(config, "utf8")
        .split(/\r?\n/)
        .flatMap((line) => {
          const match = /^([A-Z_]+)=(.*)$/.exec(line);
          return match ? [[match[1], match[2]]] : [];
        }),
    );
    if (
      ![
        "POSTGRES_USER",
        "POSTGRES_PASSWORD",
        "POSTGRES_DB",
        "POSTGRES_PORT",
      ].every((key) => values[key])
    )
      throw new Error("Local PostgreSQL fixture configuration is incomplete.");
    if (!/^\d+$/.test(values.POSTGRES_PORT))
      throw new Error("Invalid local database port.");
    env.DATABASE_URL = `postgresql://${encodeURIComponent(values.POSTGRES_USER)}:${encodeURIComponent(values.POSTGRES_PASSWORD)}@127.0.0.1:${values.POSTGRES_PORT}/${encodeURIComponent(values.POSTGRES_DB)}`;
  }
  const python = path.join(
    root,
    ".venv",
    process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
  );
  return execFileSync(python, ["manage.py", "shell", "--command", script], {
    cwd: path.join(root, "backend"),
    encoding: "utf8",
    env,
  });
}
