// Markdown ringan untuk bubble AI: teks model tidak pernah masuk innerHTML. Hanya elemen
// yang dibina DOM ini; tiada link, image, HTML mentah atau atribut daripada model.
const INLINE = /\[([^\]]+)\]\((\/[^)\s]+)\)|(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`)/g;

function inline(el: HTMLElement, text: string) {
    let last = 0;
    for (const match of text.matchAll(INLINE)) {
        const token = match[0];
        const at = match.index ?? 0;
        if (at > last) el.append(document.createTextNode(text.slice(last, at)));
        const href = match[2];
        if (match[1] && href) {
            if (href.startsWith("/") && !href.startsWith("//")) {
                const a = document.createElement("a");
                a.href = href;
                a.textContent = match[1];
                el.append(a);
            } else {
                el.append(document.createTextNode(match[1]));
            }
        } else {
            const bold = token.startsWith("**") || token.startsWith("__");
            const code = token.startsWith("`");
            const wrap = bold ? 2 : 1;
            const node = document.createElement(bold ? "strong" : code ? "code" : "em");
            node.textContent = token.slice(wrap, -wrap);
            el.append(node);
        }
        last = at + token.length;
    }
    if (last < text.length) el.append(document.createTextNode(text.slice(last)));
}

/** Render satu bubble AI. Block: perenggan, heading ringkas, senarai, code fence. */
export function renderMarkdown(el: HTMLElement, text: string) {
    el.replaceChildren();
    const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);
    for (const raw of blocks) {
        const block = raw.trim();
        if (!block) continue;
        if (block.startsWith("```")) {
            const body = block.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "");
            const pre = document.createElement("pre");
            const code = document.createElement("code");
            code.textContent = body;
            pre.append(code);
            el.append(pre);
            continue;
        }
        if (/^###\s/.test(block)) {
            const h = document.createElement("h4");
            inline(h, block.replace(/^###\s+/, ""));
            el.append(h);
            continue;
        }
        if (/^##\s/.test(block)) {
            const h = document.createElement("h3");
            inline(h, block.replace(/^##\s+/, ""));
            el.append(h);
            continue;
        }
        const lines = block.split("\n");
        if (lines.every((line) => /^[-*]\s+/.test(line))) {
            const ul = document.createElement("ul");
            for (const line of lines) {
                const li = document.createElement("li");
                inline(li, line.replace(/^[-*]\s+/, ""));
                ul.append(li);
            }
            el.append(ul);
            continue;
        }
        if (lines.every((line) => /^\d+\.\s+/.test(line))) {
            const ol = document.createElement("ol");
            for (const line of lines) {
                const li = document.createElement("li");
                inline(li, line.replace(/^\d+\.\s+/, ""));
                ol.append(li);
            }
            el.append(ol);
            continue;
        }
        const p = document.createElement("p");
        lines.forEach((line, i) => {
            if (i) p.append(document.createElement("br"));
            inline(p, line);
        });
        el.append(p);
    }
}
