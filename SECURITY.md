# Security Policy

## Supported Versions

Formloom is under active development. Security fixes land in the latest release line only. Older lines are unsupported.

| Package | Supported versions |
|---------|--------------------|
| `@formloom/schema` | latest `0.x` |
| `@formloom/llm` | latest `0.x` |
| `@formloom/react` | latest `0.x` |
| `@formloom/zod` | latest `0.x` |

## Reporting a Vulnerability

**Please do not file a public GitHub issue for security reports.** Public disclosure before a fix ships puts every Formloom user at risk.

Instead:

1. Use GitHub's [private security advisories](https://github.com/formloom/formloom/security/advisories/new) to file a report. This creates a private thread between you and the maintainers.
2. If GitHub advisories are not an option, email `security@formloom.dev` with:
   - A description of the vulnerability
   - A proof-of-concept or reproduction steps
   - The package(s) and version(s) affected
   - Any mitigating circumstances

We aim to acknowledge reports within **72 hours** and to ship a fix or a public advisory within **14 days** for high-severity issues.

## What we consider a security issue

Formloom is a library that consumes untrusted LLM output and hands validated data to the host app. We treat the following as security issues:

- Ways for crafted LLM output to crash, hang, or exhaust resources in a host that uses the library as documented (for example, ReDoS in validation).
- Bypasses of the schema validator that let malformed `FormloomData` reach `onSubmit`.
- Bypasses of `fileMatchesAccept` or `safeRegexTest` that allow the mitigations to be defeated.
- Supply-chain concerns with our published tarballs or build pipeline.

The following are **not** security issues:

- An integrator wiring `onSubmit` to a privileged action without their own authorisation check. The library is a validation layer, not an authorisation layer.
- Bugs in user-written regex patterns that do not exhibit catastrophic backtracking.
- Rendering issues in the example apps, which are demos and not themselves supported.

## Scope

The security policy covers published tarballs of the four public `@formloom/*` packages. Examples and the `integration-tests` private package are out of scope.
