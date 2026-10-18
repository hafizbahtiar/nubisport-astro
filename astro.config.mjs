// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
// `site` = the real public domain. Until it is set, canonical / og:url / og:image
// are left out (they need an absolute URL; a made-up domain breaks link previews).
export default defineConfig({
  site: "https://nubisport.hafizbahtiar.com",
  // Laman statik: muat page seterusnya bila tetikus/jari di atas pautan (aset statik - percuma,
  // tidak menyentuh Worker /api/*). Navigasi terasa serta-merta.
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
});
