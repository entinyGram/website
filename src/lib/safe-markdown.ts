import { load } from "cheerio";
import { marked } from "marked";

const allowedTags = new Set(["h1", "h2", "h3", "h4", "h5", "p", "ul", "ol", "li", "a", "code", "pre", "blockquote", "strong", "em", "del", "hr", "br", "table", "thead", "tbody", "tr", "th", "td"]);
const removedTags = new Set(["script", "style", "iframe", "object", "embed", "svg", "math"]);

export function sanitizeRenderedHtml(html: string): string {
  const document = load(`<div id="markdown-root">${html}</div>`);
  const root = document("#markdown-root");
  for (const element of root.find("*").toArray().reverse()) {
    const node = document(element);
    const tag = element.tagName.toLowerCase();
    if (removedTags.has(tag)) { node.remove(); continue; }
    if (!allowedTags.has(tag)) { node.replaceWith(node.contents()); continue; }
    const href = tag === "a" ? node.attr("href") || "" : "";
    for (const attribute of Object.keys(element.attribs)) node.removeAttr(attribute);
    if (tag === "a") {
      try {
        const safeUrl = new URL(href, "https://github.com/entaytion/entinyGram/");
        if (safeUrl.protocol === "https:") node.attr({ href: safeUrl.href, target: "_blank", rel: "noopener noreferrer" });
      } catch { /* Leave link text without an unsafe destination. */ }
    }
  }
  return root.html() || "";
}

export async function renderSafeMarkdown(markdown: string): Promise<string> {
  const html = await marked.parse(markdown || "", { gfm: true, breaks: false, async: false });
  return sanitizeRenderedHtml(html);
}
