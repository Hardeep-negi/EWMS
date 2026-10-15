const { spawn } = require("node:child_process");

const commands = [
  { name: "server", args: ["run", "dev", "--workspace", "server"] },
  { name: "client", args: ["run", "dev", "--workspace", "client"] }
];

for (const command of commands) {
  const child = spawn("pnpm", command.args,
  {
    shell: true,
    stdio: "inherit",
    env: { ...process.env, FORCE_COLOR: "1" }
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`${command.name} exited with code ${code}`);
    }
  });
}
