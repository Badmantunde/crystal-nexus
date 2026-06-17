import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const clientRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const sharedRoot = join(clientRoot, '..', 'packages', 'shared');

function run(cmd, cwd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

if (!existsSync(join(sharedRoot, 'package.json'))) {
  console.error('packages/shared is missing — deploy the full monorepo, not client/ alone.');
  process.exit(1);
}

if (!existsSync(join(sharedRoot, 'node_modules'))) {
  run('npm install --no-audit --no-fund', sharedRoot);
}

run('npm run build', sharedRoot);
run('npx tsc', clientRoot);
run('npx vite build', clientRoot);
