import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const mode = process.argv[2];
const allowedModes = new Set(['dev', 'build', 'start']);

if (!allowedModes.has(mode)) {
  console.error(`Expected one of: ${Array.from(allowedModes).join(', ')}`);
  process.exit(1);
}

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const frontendRoot = join(scriptDir, '..');
const devNextDir = join(frontendRoot, '.next-dev');
const buildNextDir = join(frontendRoot, '.next');
const nextCli = join(frontendRoot, 'node_modules', 'next', 'dist', 'bin', 'next');

function resetNextArtifacts(targetDir) {
  rmSync(targetDir, { recursive: true, force: true });
}

const env = {
  ...process.env,
  NEXT_DIST_DIR: mode === 'dev' ? '.next-dev' : '.next',
  ...(mode === 'dev'
    ? {
        WATCHPACK_POLLING: process.env.WATCHPACK_POLLING ?? 'true',
        CHOKIDAR_USEPOLLING: process.env.CHOKIDAR_USEPOLLING ?? 'true',
      }
    : {}),
};

const nextArgs = [mode];

if (mode === 'dev') {
  nextArgs.push('--webpack');
}

// Only wipe the dev cache when explicitly requested. Clearing on every start
// invalidates chunk URLs in open browser tabs and can race with a running dev
// server (ChunkLoadError / webpack PackFileCacheStrategy ENOENT).
if (mode === 'dev' && process.env.NEXT_DEV_CLEAN === '1') {
  resetNextArtifacts(devNextDir);
}

if (mode === 'build') {
  resetNextArtifacts(buildNextDir);
}

const child = spawn(process.execPath, [nextCli, ...nextArgs], {
  cwd: frontendRoot,
  env,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
