import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const clientRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(clientRoot, '..');
const sharedRoot = join(repoRoot, 'packages', 'shared');

function run(cmd, cwd) {
  console.log(`\n>> ${cmd}\n   cwd: ${cwd}\n`);
  execSync(cmd, { cwd, stdio: 'inherit', env: process.env });
}

function resolveBin(name, ...roots) {
  for (const root of roots) {
    const bin = join(root, 'node_modules', '.bin', name);
    if (existsSync(bin)) return `"${bin}"`;
  }
  return name;
}

if (!existsSync(join(sharedRoot, 'package.json'))) {
  console.error(
    'packages/shared not found. Deploy the full monorepo and set Vercel install to run from the repo root (cd .. && npm install).',
  );
  process.exit(1);
}

// Build shared from the workspace root so hoisted devDependencies (typescript) are available.
if (existsSync(join(repoRoot, 'package.json'))) {
  run('npm run build -w @crystal-nexus/shared', repoRoot);
} else {
  run('npm run build', sharedRoot);
}

// Vite bundles the app; skip a separate tsc pass (legacy unused modules still typecheck but are not shipped).
const vite = resolveBin('vite', clientRoot, repoRoot);
run(`${vite} build`, clientRoot);
