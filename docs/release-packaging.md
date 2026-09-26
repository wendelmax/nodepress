# Compiled release packages

Merged pull requests on `main` trigger `.github/workflows/release-package.yml`.
The workflow builds the application with Next.js standalone output and publishes
the resulting deployable package as a GitHub Release and Actions artifact.

The prefix of the merged pull request branch controls the semantic version bump:

| Branch prefix | Bump |
| --- | --- |
| `major/`, `breaking/` | major |
| `feat/`, `feature/`, `minor/` | minor |
| `fix/`, `bugfix/`, `patch/`, `chore/`, `ci/`, `docs/`, `perf/`, `refactor/`, `test/` | patch |
| any other prefix | patch |

The release package contains the standalone Next.js server, production runtime
dependencies, static assets, `public` assets when present, Prisma CLI and
migrations, `package.json`, `package-lock.json`, and a `VERSION` file. The
workflow validates that `prisma migrate deploy` is available before publishing.

Deployments should extract the package, run `npm run migrate:deploy`, and start
`node server.js`; they do not need to run a build or install dependencies.

The workflow updates `package.json` and `package-lock.json`, commits the version
to `main`, tags it, and publishes `.tar.gz`, `.zip`, and SHA-256 checksums. It
requires the repository's GitHub Actions token to be allowed to write contents
and push to `main`.
