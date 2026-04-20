# Contributing to Formloom

Thanks for considering a contribution. This doc covers the basics: how to set up the repo, how to propose a change, and what to include in a PR so we can ship releases cleanly.

## Development setup

Formloom is a [pnpm](https://pnpm.io/) + [Turborepo](https://turbo.build/repo) monorepo. You need Node 20 or 22.

```bash
# one-time
npm install -g pnpm

# install deps across every package
pnpm install

# build everything (topologically correct order via Turbo)
pnpm build

# run the full test suite
pnpm test

# typecheck + lint
pnpm typecheck
pnpm lint
```

Useful focused commands:

```bash
# test one package
pnpm --filter @formloom/schema test

# run a dev server for an example
pnpm --filter @formloom/example-basic-react dev
pnpm --filter @formloom/example-provider-free dev
```

## Project layout

```
packages/
  schema/              # Zero-dep types + validator + helpers
  llm/                 # Prompts, tool defs, parser, formatSubmission
  react/               # Headless React hook
  zod/                 # Zod + Standard Schema adapters
  integration-tests/   # Private: cross-package E2E
examples/
  basic-react/         # Private: offline renderer demo
  fullstack/           # Private: OpenAI round-trip chat app
  provider-free/       # Private: CI gate + three simulated integration paths
```

## Proposing a change

1. **Open an issue first** for anything beyond a typo fix. Shared context saves churn.
2. Fork and branch:
   ```bash
   git checkout -b feat/your-change     # or fix/... docs/... refactor/...
   ```
3. Make the change. Keep the diff focused on one concern.
4. **Tests required** for behavioural changes. New features get new tests; bug fixes get a regression test.
5. Run the full gauntlet locally before opening a PR:
   ```bash
   pnpm build && pnpm typecheck && pnpm lint && pnpm test
   ```
6. **Add a changeset** (see below) — this is how releases happen.
7. Open a PR against `main` and fill in the template.

## Adding a changeset

Every PR that affects published packages needs a changeset. Without one the release bot can't version or publish your work.

```bash
pnpm changeset
```

The CLI prompts you to:

1. Pick which packages this PR affects.
2. Pick the bump level per package:
   - **patch** — bug fixes, internal refactors, doc-only changes.
   - **minor** — new features, non-breaking API additions.
   - **major** — breaking changes. Spell out the migration path in the changeset body.
3. Describe the change for the CHANGELOG. Write it for users, not maintainers.

This creates a markdown file under `.changeset/`. Commit it with your code.

Docs-only, build-only, or internal-test-only changes don't need a changeset — skip the `pnpm changeset` step.

## Releasing (maintainers)

Releases are automated. When PRs with changesets land on `main`:

1. The release workflow opens a "Version Packages" PR that bumps versions and writes CHANGELOGs.
2. Reviewing that PR is the human checkpoint.
3. Merging that PR triggers npm publish (with provenance) and pushes git tags.

You do not run `pnpm publish` by hand.

## Coding standards

- **No `any`.** Use `unknown` and narrow. Type everything at public-API boundaries.
- **JSDoc on every exported symbol.** IDE hover is the docs.
- **Tests describe behaviour**, not implementation. `describe` the feature, `it` the invariant.
- **No dead code**, no commented-out blocks, no `// TODO` without a linked issue.
- **Zero-dep discipline for `@formloom/schema`.** New runtime deps need a compelling reason.
- **Runtime safety.** Remember the input is untrusted LLM output — if a caller can trigger a throw or hang, that's a bug.
- **Backwards compatibility.** Within a major version, schemas produced by any previous minor must still validate.

## Code review etiquette

- Small, focused PRs merge faster than big ones.
- If a review asks "why" and the answer is in the PR body, quote it back.
- Breaking changes need a written justification.
- Maintainers will not merge work without a changeset, tests, or a clean CI run.

## Security issues

Please **do not** file public issues for security vulnerabilities. See [SECURITY.md](SECURITY.md).

## License

By contributing you agree that your work will be released under the project's [MIT License](LICENSE).
