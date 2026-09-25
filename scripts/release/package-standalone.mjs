import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const projectRoot = process.cwd();
const outputDirectory = path.resolve(projectRoot, process.argv[2] ?? 'dist/package');
const packageJsonPath = path.join(projectRoot, 'package.json');
const packageLockPath = path.join(projectRoot, 'package-lock.json');
const standaloneDirectory = path.join(projectRoot, '.next/standalone');
const staticDirectory = path.join(projectRoot, '.next/static');
const publicDirectory = path.join(projectRoot, 'public');
const prismaDirectory = path.join(projectRoot, 'prisma');
const dereferenceSymlinks = process.platform === 'win32';

async function assertExists(target, description) {
  try {
    await fs.access(target);
  } catch {
    throw new Error(`Cannot create release package: missing ${description} at ${target}`);
  }
}

async function copyInto(source, destination) {
  await fs.cp(source, destination, {
    dereference: dereferenceSymlinks,
    recursive: true,
    force: true,
  });
}

const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
await assertExists(path.join(standaloneDirectory, 'server.js'), 'Next standalone server');
await assertExists(staticDirectory, 'Next static assets');
await assertExists(packageLockPath, 'package lockfile');
await assertExists(prismaDirectory, 'Prisma schema and migrations');

await fs.rm(outputDirectory, { recursive: true, force: true });
await fs.mkdir(outputDirectory, { recursive: true });

await copyInto(standaloneDirectory, outputDirectory);
await fs.mkdir(path.join(outputDirectory, '.next'), { recursive: true });
await copyInto(staticDirectory, path.join(outputDirectory, '.next/static'));
await copyInto(packageJsonPath, path.join(outputDirectory, 'package.json'));
await copyInto(packageLockPath, path.join(outputDirectory, 'package-lock.json'));
await copyInto(prismaDirectory, path.join(outputDirectory, 'prisma'));

try {
  await fs.access(publicDirectory);
  await copyInto(publicDirectory, path.join(outputDirectory, 'public'));
} catch {
  // The application does not require a public directory for every release.
}

await fs.writeFile(
  path.join(outputDirectory, 'VERSION'),
  `${packageJson.version}\n`,
  'utf8',
);

process.stdout.write(`${JSON.stringify({ directory: outputDirectory, version: packageJson.version })}\n`);
