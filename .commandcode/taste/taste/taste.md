# Taste
- Favors minimal, YAGNI-first changes: reuse existing helpers/components (e.g. `lib/`, `ui/` components) before writing new code, and prefer deleting dead code (unused imports) over leaving it. Confidence: 0.7
- Expects the agent to clean up loose ends while fixing — e.g. removing leftover dead imports after resolving a bug. Confidence: 0.6
- Does not want new dependencies or tooling installed without being asked (e.g. declined to add `@astrojs/check` unprompted, instead noted it as an optional suggestion). Confidence: 0.6
- Works on Astro projects using bun; expects changes to be verified by running the build (`bun run build`) and checking diagnostics. Confidence: 0.5
- Prefers the agent to study/explore the project thoroughly and build a mental model before starting a task, rather than diving straight in. Confidence: 0.55
- Prefers responses in Malay / Bahasa Melayu. Confidence: 0.5
- Expects new code to follow each repo's own established conventions rather than importing another project's style — e.g. the `hono-workers` backend is entirely English (filenames, identifiers, comments, error messages), while the Nubi/Astro app uses Malay. Confidence: 0.55
- Maintains a written backlog (IDEA.md / TODO.md) and directs work from it (e.g. asks to "proceed" on specific IDEA.md items). Confidence: 0.5
