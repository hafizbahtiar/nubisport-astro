# Taste

## Coding style
- Favors minimal, YAGNI-first changes: reuse existing helpers/components (e.g. `lib/`, `ui/` components) before writing new code, and prefer deleting dead code (unused imports) over leaving it. Confidence: 0.7
- Expects the agent to clean up loose ends while fixing — e.g. removing leftover dead imports after resolving a bug. Confidence: 0.6

## Tooling & dependencies
- Does not want new dependencies or tooling installed without being asked (e.g. declined to add `@astrojs/check` unprompted, instead noted it as an optional suggestion). Confidence: 0.6

## Workflow
- Works on Astro projects using bun; expects changes to be verified by running the build (`bun run build`) and checking diagnostics. Confidence: 0.5

## Communication
- Prefers responses in Malay / Bahasa Melayu. Confidence: 0.5
