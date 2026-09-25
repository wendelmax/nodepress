import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const packageDirectory = path.resolve(process.argv[2] ?? '.');
const expectedVersion = process.argv[3];

async function assertExists(relativePath, description) {
  const target = path.join(packageDirectory, relativePath);
  try {
    await fs.access(target);
  } catch {
    throw new Error(`Invalid release package: missing ${description} at ${relativePath}`);
  }
}

const packageJson = JSON.parse(
  await fs.readFile(path.join(packageDirectory, 'package.json'), 'utf8'),
);
const versionFile = (await fs.readFile(path.join(packageDirectory, 'VERSION'), 'utf8')).trim();

if (expectedVersion && packageJson.version !== expectedVersion) {
  throw new Error(`Release package version ${packageJson.version} does not match ${expectedVersion}`);
}

if (packageJson.version !== versionFile) {
  throw new Error(`VERSION (${versionFile}) does not match package.json (${packageJson.version})`);
}

for (const [relativePath, description] of [
  ['server.js', 'standalone server'],
  ['.next/static', 'Next static assets'],
  ['package-lock.json', 'production lockfile'],
  ['prisma/schema.prisma', 'Prisma schema'],
  ['prisma/migrations', 'Prisma migrations'],
]) {
  await assertExists(relativePath, description);
}

const prismaCliCandidates = [
  'node_modules/.bin/prisma',
  'node_modules/.bin/prisma.cmd',
];
const hasPrismaCli = (await Promise.all(
  prismaCliCandidates.map(async (candidate) => {
    try {
      await fs.access(path.join(packageDirectory, candidate));
      return true;
    } catch {
      return false;
    }
  }),
)).some(Boolean);
if (!hasPrismaCli) {
  throw new Error('Invalid release package: Prisma CLI is not available for migrations');
}

process.stdout.write(`${JSON.stringify({ directory: packageDirectory, version: packageJson.version })}\n`);
