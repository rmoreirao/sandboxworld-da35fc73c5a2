import { watch } from 'node:fs';
import { spawn } from 'node:child_process';
import { build } from './build.mjs';

let pending = Promise.resolve();
const watcher = watch(new URL('../src/frontend/', import.meta.url), { recursive: true }, () => {
  pending = pending.then(build).catch((error) => console.error('Frontend build failed:', error));
});
const server = spawn(process.execPath, ['--watch', 'src/backend/server.js'], {
  stdio: 'inherit',
  env: process.env,
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    watcher.close();
    server.kill(signal);
  });
}
server.on('exit', (code) => {
  watcher.close();
  process.exitCode = code ?? 0;
});
