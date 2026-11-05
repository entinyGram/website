import { load } from "cheerio";
import { marked } from "marked";

const allowedTags = new Set(["h1", "h2", "h3", "h4", "h5", "p", "ul", "ol", "li", "a", "code", "pre", "blockquote", "strong", "em", "del", "hr", "br", "table", "thead", "tbody", "tr", "th", "td", "span"]);
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
    const isIconSpan = tag === "span" && node.hasClass("iconify");
    const iconName = isIconSpan ? node.attr("data-icon") || "" : "";
    const spanClass = isIconSpan ? node.attr("class") || "" : "";
    for (const attribute of Object.keys(element.attribs)) node.removeAttr(attribute);
    if (tag === "a") {
      try {
        const safeUrl = new URL(href, "https://github.com/entaytion/entinyGram/");
        if (safeUrl.protocol === "https:") node.attr({ href: safeUrl.href, target: "_blank", rel: "noopener noreferrer" });
      } catch { /* Leave link text without an unsafe destination. */ }
    } else if (isIconSpan && iconName) {
      node.attr({ class: spanClass, "data-icon": iconName, "aria-hidden": "true" });
    }
  }
  return root.html() || "";
}

export async function renderSafeMarkdown(markdown: string): Promise<string> {
  const cleanMarkdown = (markdown || "")
    .replace(/📡/g, '<span class="iconify eg-patch-icon eg-patch-entiny" data-icon="tabler:antenna"></span>')
    .replace(/🐶/g, '<span class="iconify eg-patch-icon eg-patch-inu" data-icon="tabler:paw"></span>')
    .replace(/🗑️?/g, '<span class="iconify eg-patch-icon" data-icon="tabler:trash"></span>');
  const html = await marked.parse(cleanMarkdown, { gfm: true, breaks: false, async: false });
  return sanitizeRenderedHtml(html);
}
