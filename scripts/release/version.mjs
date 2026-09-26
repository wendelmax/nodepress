import { pathToFileURL } from 'node:url';

const RELEASE_PREFIXES = Object.freeze({
  major: new Set(['breaking', 'major']),
  minor: new Set(['feat', 'feature', 'minor']),
  patch: new Set(['bugfix', 'chore', 'ci', 'docs', 'fix', 'patch', 'perf', 'refactor', 'test']),
});

export function resolveReleaseType(branchName) {
  const prefix = String(branchName ?? '')
    .trim()
    .toLowerCase()
    .split(/[\/_:-]/, 1)[0];

  for (const [releaseType, prefixes] of Object.entries(RELEASE_PREFIXES)) {
    if (prefixes.has(prefix)) {
      return releaseType;
    }
  }

  return 'patch';
}

export function bumpVersion(version, releaseType) {
  const match = String(version).trim().match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  if (!match) {
    throw new Error(`Unsupported semantic version: ${version}`);
  }

  const numbers = match.slice(1, 4).map(Number);
  if (!['major', 'minor', 'patch'].includes(releaseType)) {
    throw new Error(`Unsupported release type: ${releaseType}`);
  }

  if (releaseType === 'major') {
    numbers[0] += 1;
    numbers[1] = 0;
    numbers[2] = 0;
  } else if (releaseType === 'minor') {
    numbers[1] += 1;
    numbers[2] = 0;
  } else {
    numbers[2] += 1;
  }

  return numbers.join('.');
}

function readOption(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const branchName = readOption('--branch');
  const currentVersion = readOption('--current');

  if (!branchName || !currentVersion) {
    throw new Error('Usage: node scripts/release/version.mjs --branch <branch> --current <version>');
  }

  const releaseType = resolveReleaseType(branchName);
  process.stdout.write(`${JSON.stringify({ releaseType, version: bumpVersion(currentVersion, releaseType) })}\n`);
}
