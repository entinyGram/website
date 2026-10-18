import { marked } from "marked";

export type DocLang = "en" | "uk";

export interface DocMeta {
  slug: string;
  group: string;
  icon: string;
  title: Record<DocLang, string>;
  summary: Record<DocLang, string>;
}

export interface DocGroup {
  id: string;
  title: Record<DocLang, string>;
}

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export const docGroups: DocGroup[] = [
  { id: "start", title: { en: "Getting started", uk: "Початок" } },
  { id: "core", title: { en: "Core concepts", uk: "Основи" } },
  { id: "unsafe", title: { en: "Low level", uk: "Низький рівень" } },
  { id: "entiny", title: { en: "entinyGram SDK", uk: "entinyGram SDK" } },
  { id: "ship", title: { en: "Publishing", uk: "Публікація" } },
  { id: "reference", title: { en: "Reference", uk: "Довідник" } },
];

export const docs: DocMeta[] = [
  { slug: "introduction", group: "start", icon: "tabler:puzzle", title: { en: "Introduction", uk: "Вступ" }, summary: { en: "What a plugin is, how it runs, and where entinyGram fits in.", uk: "Що таке плагін, як він працює і де тут entinyGram." } },
  { slug: "quick-start", group: "start", icon: "tabler:rocket", title: { en: "Quick start", uk: "Швидкий старт" }, summary: { en: "Create a project, write a plugin, push it to your phone.", uk: "Створити проєкт, написати плагін і запустити на телефоні." } },
  { slug: "project", group: "start", icon: "tabler:folder-code", title: { en: "Project and manifest", uk: "Проєкт і маніфест" }, summary: { en: "inu.config.ts, every manifest field, the header, builds and the CLI.", uk: "inu.config.ts, усі поля маніфесту, заголовок, збірка та CLI." } },
  { slug: "engine", group: "core", icon: "tabler:cpu", title: { en: "The engine", uk: "Рушій" }, summary: { en: "QuickJS, threads, lifecycle, errors, limits and the web globals.", uk: "QuickJS, потоки, життєвий цикл, помилки, ліміти та веб-глобали." } },
  { slug: "grants", group: "core", icon: "tabler:shield-lock", title: { en: "Grants", uk: "Дозволи (grants)" }, summary: { en: "Every permission, its scopes, tiers and how checks fail.", uk: "Кожен дозвіл, його області, рівні та як працюють перевірки." } },
  { slug: "ui", group: "core", icon: "tabler:layout-list", title: { en: "UI", uk: "Інтерфейс" }, summary: { en: "Settings pages, rows, icons, menus, actions and dialogs.", uk: "Сторінки налаштувань, рядки, іконки, меню, дії та діалоги." } },
  { slug: "telegram", group: "core", icon: "tabler:brand-telegram", title: { en: "Telegram API", uk: "Telegram API" }, summary: { en: "Accounts, reading and sending, TL objects, raw RPC, events.", uk: "Акаунти, читання й надсилання, TL-обʼєкти, raw RPC, події." } },
  { slug: "interception", group: "core", icon: "tabler:arrows-exchange", title: { en: "Interception", uk: "Перехоплення" }, summary: { en: "Rewrite or drop RPCs, updates and outgoing messages.", uk: "Змінювати або відкидати RPC, апдейти та вихідні повідомлення." } },
  { slug: "io", group: "core", icon: "tabler:database", title: { en: "Network, files and storage", uk: "Мережа, файли та сховище" }, summary: { en: "fetch, blobs, the private directory, localStorage, timers.", uk: "fetch, blob-и, приватна тека, localStorage, таймери." } },
  { slug: "canvas", group: "core", icon: "tabler:palette", title: { en: "Canvas", uk: "Canvas" }, summary: { en: "Draw images, stickers and video without leaving the plugin.", uk: "Малювати зображення, стікери та відео прямо з плагіна." } },
  { slug: "jvm", group: "unsafe", icon: "tabler:coffee", title: { en: "JVM reflection", uk: "JVM-рефлексія" }, summary: { en: "inu.jvm: classes, values, overloads, callbacks and defineClass.", uk: "inu.jvm: класи, значення, перевантаження, колбеки та defineClass." } },
  { slug: "xposed", group: "unsafe", icon: "tabler:plug-connected", title: { en: "Method hooks", uk: "Хуки методів" }, summary: { en: "Xposed-style hooks: phases, contexts, threads and filters.", uk: "Хуки у стилі Xposed: фази, контексти, потоки та фільтри." } },
  { slug: "routines", group: "unsafe", icon: "tabler:bolt", title: { en: "Routines", uk: "Routines" }, summary: { en: "A JS subset that runs in Java, for hot paths and privacy hooks.", uk: "Підмножина JS, що виконується в Java: для гарячих шляхів і приватності." } },
  { slug: "entiny-sdk", group: "entiny", icon: "tabler:antenna", title: { en: "entinyGram SDK", uk: "entinyGram SDK" }, summary: { en: "withEntiny, embedding into settings, slots, pickers and requirements.", uk: "withEntiny, вбудовування в налаштування, слоти, пікери та залежності." } },
  { slug: "marketplace", group: "entiny", icon: "tabler:building-store", title: { en: "The Marketplace", uk: "Маркетплейс" }, summary: { en: "Tabs, sources, channel catalogs, permissions and installing.", uk: "Вкладки, джерела, каталоги з каналів, дозволи та встановлення." } },
  { slug: "publishing", group: "ship", icon: "tabler:send", title: { en: "Publishing a plugin", uk: "Публікація плагіна" }, summary: { en: "Send it to the bot, the review, rules, updates and post format.", uk: "Надіслати боту, перевірка, правила, оновлення та формат поста." } },
  { slug: "best-practices", group: "ship", icon: "tabler:checklist", title: { en: "Best practices", uk: "Добрі практики" }, summary: { en: "Performance, safety, testing and fixing the usual problems.", uk: "Продуктивність, безпека, тестування та типові проблеми." } },
  { slug: "examples", group: "reference", icon: "tabler:code", title: { en: "Worked examples", uk: "Приклади" }, summary: { en: "Real plugins explained: patterns worth copying, with links to the source.", uk: "Справжні плагіни з поясненнями: корисні прийоми й посилання на код." } },
  { slug: "api-reference", group: "reference", icon: "tabler:list-search", title: { en: "API reference", uk: "Довідник API" }, summary: { en: "A map of every call, generated from the typings, with grants and links.", uk: "Карта всіх викликів із типів: дозволи й посилання." } },
  { slug: "source-map", group: "reference", icon: "tabler:git-fork", title: { en: "Source map", uk: "Карта коду" }, summary: { en: "Where the SDK, the CLI, the plugins and the host code live, and where to read them.", uk: "Де лежать SDK, CLI, плагіни та код хоста, і де їх читати." } },
];

const raw = import.meta.glob("/src/content/docs/*/*.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

export function findDoc(slug: string): DocMeta | undefined {
  return docs.find((doc) => doc.slug === slug);
}

export function getMarkdown(lang: DocLang, slug: string): string | undefined {
  return raw[`/src/content/docs/${lang}/${slug}.md`] ?? raw[`/src/content/docs/en/${slug}.md`];
}

export function neighbours(slug: string): { prev?: DocMeta; next?: DocMeta } {
  const index = docs.findIndex((doc) => doc.slug === slug);
  return { prev: docs[index - 1], next: docs[index + 1] };
}

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const KEYWORDS = new Set([
  "const", "let", "var", "function", "return", "if", "else", "for", "while", "of", "in", "new", "class", "extends", "import", "from",
  "export", "default", "async", "await", "try", "catch", "finally", "throw", "typeof", "instanceof", "interface", "type", "void",
  "break", "continue", "switch", "case", "this", "using", "as", "true", "false", "null", "undefined",
]);

function highlight(code: string, lang: string): string {
  const language = lang.toLowerCase();
  if (!["ts", "typescript", "js", "javascript", "json", "bash", "sh", "shell"].includes(language)) return escapeHtml(code);
  const shell = ["bash", "sh", "shell"].includes(language);
  const json = language === "json";
  const pattern = shell
    ? /(#[^\n]*)|("(?:\\.|[^"\\])*"|'[^']*')|(\b(?:cd|git|bun|pnpm|npm|inu|adb|echo|export|ls|mkdir)\b)|(\s--?[A-Za-z][\w-]*)/g
    : /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(\b\d[\d_.]*(?:e\d+)?\b)|(\b[A-Za-z_$][\w$]*\b)/g;
  let out = "";
  let last = 0;
  for (const match of code.matchAll(pattern)) {
    const index = match.index ?? 0;
    out += escapeHtml(code.slice(last, index));
    const token = match[0];
    let cls = "";
    if (match[1]) cls = "tok-c";
    else if (match[2]) cls = json && /^"[^"]*"\s*:/.test(code.slice(index, index + token.length + 2)) ? "tok-p" : "tok-s";
    else if (shell) cls = match[3] ? "tok-k" : "tok-f";
    else if (match[3]) cls = "tok-n";
    else if (match[4]) {
      if (KEYWORDS.has(token)) cls = "tok-k";
      else if (code[index + token.length] === "(") cls = "tok-f";
      else if (token === "inu") cls = "tok-i";
    }
    out += cls ? `<span class="${cls}">${escapeHtml(token)}</span>` : escapeHtml(token);
    last = index + token.length;
  }
  return out + escapeHtml(code.slice(last));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/g, "")
    .replace(/[`*_~]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

const CALLOUTS: Record<string, { label: Record<DocLang, string>; icon: string }> = {
  NOTE: { label: { en: "Note", uk: "Примітка" }, icon: "tabler:info-circle" },
  TIP: { label: { en: "Tip", uk: "Порада" }, icon: "tabler:bulb" },
  WARNING: { label: { en: "Warning", uk: "Увага" }, icon: "tabler:alert-triangle" },
  DANGER: { label: { en: "Danger", uk: "Небезпека" }, icon: "tabler:flame" },
  EXPERIMENTAL: { label: { en: "Experimental", uk: "Експериментальне" }, icon: "tabler:flask" },
};

export async function renderDoc(markdown: string, lang: DocLang): Promise<{ html: string; toc: TocItem[] }> {
  const toc: TocItem[] = [];
  const used = new Set<string>();
  const renderer = new marked.Renderer();

  renderer.heading = function ({ tokens, depth }) {
    const inline = this.parser.parseInline(tokens);
    const text = inline.replace(/<[^>]+>/g, "");
    let id = slugify(text) || `section-${toc.length + 1}`;
    for (let n = 2; used.has(id); n++) id = `${slugify(text)}-${n}`;
    used.add(id);
    if (depth === 2 || depth === 3) toc.push({ id, text, level: depth });
    return `<h${depth} id="${id}"><a class="doc-anchor" href="#${id}" aria-label="Link to this section">#</a>${inline}</h${depth}>`;
  };

  renderer.code = ({ text, lang: language }) => {
    const name = (language || "").split(/\s+/)[0];
    return `<div class="doc-code"><div class="doc-code-bar"><span>${escapeHtml(name || "text")}</span><button type="button" class="doc-copy" aria-label="Copy code">Copy</button></div><pre><code>${highlight(text, name)}</code></pre></div>`;
  };

  renderer.blockquote = function ({ tokens }) {
    const body = this.parser.parse(tokens);
    const hit = body.match(/^<p>\[!(NOTE|TIP|WARNING|DANGER|EXPERIMENTAL)\]\s*/);
    if (!hit) return `<blockquote>${body}</blockquote>`;
    const callout = CALLOUTS[hit[1]];
    const inner = body.replace(hit[0], "<p>");
    return `<aside class="doc-callout doc-${hit[1].toLowerCase()}"><div class="doc-callout-title"><span class="iconify" data-icon="${callout.icon}"></span>${callout.label[lang]}</div>${inner}</aside>`;
  };

  renderer.table = function ({ header, rows }) {
    const head = header.map((cell) => `<th>${this.parser.parseInline(cell.tokens)}</th>`).join("");
    const body = rows.map((row) => `<tr>${row.map((cell) => `<td>${this.parser.parseInline(cell.tokens)}</td>`).join("")}</tr>`).join("");
    return `<div class="doc-table"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  };

  renderer.link = function ({ href, title, tokens }) {
    const text = this.parser.parseInline(tokens);
    const external = /^https?:\/\//.test(href);
    const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : "";
    return `<a href="${escapeHtml(href)}"${title ? ` title="${escapeHtml(title)}"` : ""}${attrs}>${text}</a>`;
  };

  const html = await marked.parse(markdown, { gfm: true, breaks: false, async: false, renderer });
  return { html, toc };
}
