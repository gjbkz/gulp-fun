# Maintenance policy

gulp-fun is maintained as a small compatibility and bug-fix utility. Keep the
public surface small and retain the dependency-free runtime.

## Accepted work

- Reproducible correctness bugs, including stream completion and error handling.
- Applicable security fixes.
- Compatibility fixes for supported Node.js releases and Gulp 5.
- Documentation and tests necessary to support these fixes.

Feature expansion and speculative optimization are outside the maintenance
scope. Support is best effort, without a response or release schedule.

## Dependencies and compatibility

Support starts at Node.js 22 for the next major release. CI tests Node.js 22, 24,
and 26. Update this matrix when Node.js support changes; do not claim support for
an untested version. Review dependencies when fixing an issue, addressing an
applicable advisory, or updating compatibility.

Renovate development-dependency update PRs and automerge are disabled to avoid
routine update traffic. This does not replace security review. There are no
required production dependencies. Gulp is a development dependency used to test
real Vinyl input and output; optional Vinyl types support TypeScript consumers.

## Validation and release

Validate with `npm ci`, `npm run lint`, `npm test`, and `npm pack --dry-run`.
Follow the shared [release and recovery procedure](https://github.com/nlibjs/actions#release-procedure).
Package-specific Trusted Publisher settings are in `.github/workflows/release.yml`.

The pending Node.js minimum and parallel error-policy changes require a major
release. package.json stages version 2.0.0; the changes remain unreleased until
the maintainer approves and publishes a release.

### Known development-only advisory

As of 2026-10-14, Gulp 5 transitively uses braces 3.0.3, affected by
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
There is no patched release. The integration tests use fixed, trusted glob
patterns and do not accept external patterns. This dependency is not shipped as
a runtime dependency of gulp-fun. Recheck when an upstream fix is available;
do not downgrade Gulp or force an incompatible override to silence the audit.

## Parallel processing

Keep unlimited concurrency as the compatibility default and recommend a finite
limit for substantial workloads. Do not retain completed handler promises.
Report the first failure promptly and preserve its Error object. Cancellation
of already-running application work remains the handler's responsibility.
