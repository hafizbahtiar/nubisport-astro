> **Ponytail ultra is mandatory** for every agent working in this repo (Claude, Codex, subagents).
> Claude Code gets it from `.claude/settings.json` (`PONYTAIL_DEFAULT_MODE=ultra` - the plugin's own
> setting, also injected into subagents). Other agents: load the ponytail skill at **ultra** before any
> change. Don't switch it to lite/full/off unless the owner asks in that session.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Working agreements

- Never commit, push, deploy, or run anything remote unless asked - leave changes in the working tree.
- Don't spawn subagents unless asked; do the work inline.
- Before saying done: run every `bun scripts/check-*.ts` and `bun run build`.
- `scripts/check-*.ts` must compile under this project's tsconfig: no `bun:test` and no untyped Bun APIs (`Bun.file`, `Bun.Glob`); use the existing `ok()`/`check()` assertion pattern and extensionless relative imports.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Project notes

Read `TODO.md` first - its "Penting" section holds the rules (brand generator, domain, roles via backend `requireAppRole`, never run anything remote).

@TODO.md

Plan engine (plan-5k, distance-plan, date, maf, plan-core in `src/lib`) is GENERATED from hono-workers `src/services/nubi-plan/engine/`; never edit here - change it there, run `bun scripts/sync-plan-engine.ts` there, and deploy both.
