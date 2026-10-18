import { sql } from './db';
import localChangelog from '../data/entinygram-changelog.json';

/** One release card; the shape is produced by entinyGram's scripts/release-notes.ts (`site`). */
export interface SiteNotes {
	headline: string;
	highlights: { icon: string; title: string; text: string }[];
	fixes: string[];
}

export interface ChangelogEntry {
	version: string;
	published_at: string;
	prerelease: boolean;
	url: string;
	en: SiteNotes;
	uk: SiteNotes;
	/** Full release notes as markdown, same text as the GitHub release. */
	md: { en: string; uk: string };
	build?: string;
}

let ready: Promise<unknown> | null = null;

function ensureTable() {
	ready ??= sql`CREATE TABLE IF NOT EXISTS entinygram_changelog (
		version      TEXT PRIMARY KEY,
		published_at TEXT NOT NULL,
		prerelease   INTEGER NOT NULL DEFAULT 0,
		url          TEXT NOT NULL DEFAULT '',
		notes        TEXT NOT NULL
	)`.then(() => sql`CREATE INDEX IF NOT EXISTS idx_entinygram_changelog_date ON entinygram_changelog (published_at DESC)`);
	return ready;
}

const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

/** Anything from the network is clamped; the page renders these as plain text only. */
export function cleanNotes(v: unknown): SiteNotes {
	const o = (v && typeof v === 'object' ? v : {}) as Record<string, any>;
	return {
		headline: str(o.headline, 140),
		highlights: (Array.isArray(o.highlights) ? o.highlights : []).slice(0, 8).map((h: any) => ({
			icon: str(h?.icon, 8),
			title: str(h?.title, 48),
			text: str(h?.text, 200),
		})).filter((h) => h.title && h.text),
		fixes: (Array.isArray(o.fixes) ? o.fixes : []).slice(0, 12).map((f) => str(f, 100)).filter(Boolean),
	};
}

const cleanMd = (v: unknown) => String(v ?? '').split(String.fromCharCode(13)).join('').trim().slice(0, 20000);

const GITHUB_CHANGELOG_URL =
	'https://raw.githubusercontent.com/entaytion/entinyGram/main/assets/changelog.json';

let githubChangelogCache: { data: ChangelogEntry[]; timestamp: number } | null = null;
const CHANGELOG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function parseChangelogJson(jsonObj: Record<string, any>): ChangelogEntry[] {
	const entries: ChangelogEntry[] = [];
	for (const [key, val] of Object.entries(jsonObj)) {
		if (!val || typeof val !== 'object') continue;
		const match = key.match(/(?:entinyGram\s+)?([0-9.]+)(?:-([a-f0-9]+|\w+))?(?:\s*\((\d+)\))?/i);
		const ver = match ? match[1] : key;
		const build = match?.[2] || '';
		const dateCode = match?.[3] || (match?.[2] && /^\d{8,}/.test(match[2]) ? match[2] : '');

		let publishedAt = new Date().toISOString();
		if (dateCode && dateCode.length >= 8) {
			const y = dateCode.slice(0, 4);
			const m = dateCode.slice(4, 6);
			const d = dateCode.slice(6, 8);
			publishedAt = new Date(`${y}-${m}-${d}T12:00:00Z`).toISOString();
		}

		const mdEn = String(val.en ?? '').trim();
		const mdUk = String(val.ua ?? val.uk ?? '').trim();

		entries.push({
			version: build && !/^\d+$/.test(build) ? `${ver}-${build}` : ver,
			build: build && !/^\d+$/.test(build) ? build : '',
			published_at: publishedAt,
			prerelease: false,
			url: 'https://github.com/entaytion/entinyGram/releases',
			en: cleanNotes({}),
			uk: cleanNotes({}),
			md: { en: mdEn, uk: mdUk },
		});
	}
	return entries;
}

export async function fetchRemoteChangelog(): Promise<ChangelogEntry[]> {
	const now = Date.now();
	if (githubChangelogCache && now - githubChangelogCache.timestamp < CHANGELOG_CACHE_TTL) {
		return githubChangelogCache.data;
	}

	try {
		const res = await fetch(GITHUB_CHANGELOG_URL, {
			headers: { Accept: 'application/json', 'User-Agent': 'entinyGram-site' },
			signal: AbortSignal.timeout(4000),
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const json = await res.json();
		const parsed = parseChangelogJson(json);
		if (parsed.length > 0) {
			githubChangelogCache = { data: parsed, timestamp: now };
			return parsed;
		}
	} catch (err) {
		console.warn('[changelog] failed to fetch remote assets/changelog.json:', err);
	}

	if (githubChangelogCache && githubChangelogCache.data.length > 0) {
		return githubChangelogCache.data;
	}

	return parseChangelogJson(localChangelog as Record<string, any>);
}

export async function listChangelog(limit = 30): Promise<ChangelogEntry[]> {
	const remoteEntries = await fetchRemoteChangelog();

	let dbEntries: ChangelogEntry[] = [];
	try {
		await ensureTable();
		const rows = await sql`SELECT version, published_at, prerelease, url, notes FROM entinygram_changelog ORDER BY published_at DESC LIMIT ${limit}`;
		dbEntries = rows.map((r) => {
			const notes = JSON.parse(String(r.notes));
			return {
				version: String(r.version),
				published_at: String(r.published_at),
				prerelease: Number(r.prerelease) === 1,
				url: String(r.url),
				en: cleanNotes(notes.en),
				uk: cleanNotes(notes.uk),
				md: { en: cleanMd(notes.md?.en), uk: cleanMd(notes.md?.uk) },
			};
		});
	} catch (err) {
		console.warn('[changelog] DB fetch failed, using remote/cached changelog:', err);
	}

	const result: ChangelogEntry[] = [];
	const remoteBases = new Set(
		remoteEntries.map((r) => r.version.match(/^(\d+(?:\.\d+)+)/)?.[1] ?? r.version)
	);

	for (const remote of remoteEntries) {
		const baseVer = remote.version.match(/^(\d+(?:\.\d+)+)/)?.[1] ?? remote.version;
		const matchedDb = dbEntries.find(
			(d) => d.version === remote.version || d.version.startsWith(baseVer)
		);
		if (matchedDb) {
			if (matchedDb.url && remote.url === 'https://github.com/entaytion/entinyGram/releases') {
				remote.url = matchedDb.url;
			}
			if (matchedDb.published_at) {
				remote.published_at = matchedDb.published_at;
			}
		}
		result.push(remote);
	}

	for (const db of dbEntries) {
		const baseVer = db.version.match(/^(\d+(?:\.\d+)+)/)?.[1] ?? db.version;
		if (remoteBases.has(baseVer)) continue;
		result.push(db);
	}

	result.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
	return result.slice(0, limit);
}

export async function upsertChangelog(e: { version: string; published_at?: string; prerelease?: boolean; url?: string; site: { en?: unknown; uk?: unknown }; md?: { en?: unknown; uk?: unknown } }) {
	await ensureTable();
	const version = str(e.version, 80);
	if (!version) throw new Error('version required');
	const notes = JSON.stringify({ en: cleanNotes(e.site?.en), uk: cleanNotes(e.site?.uk), md: { en: cleanMd(e.md?.en), uk: cleanMd(e.md?.uk) } });
	const date = e.published_at && !Number.isNaN(Date.parse(e.published_at)) ? new Date(e.published_at).toISOString() : new Date().toISOString();
	await sql`INSERT INTO entinygram_changelog (version, published_at, prerelease, url, notes)
		VALUES (${version}, ${date}, ${e.prerelease ? 1 : 0}, ${str(e.url, 300)}, ${notes})
		ON CONFLICT(version) DO UPDATE SET published_at = excluded.published_at, prerelease = excluded.prerelease, url = excluded.url, notes = excluded.notes`;
}

export interface NoteItem {
	name: string;
	text: string;
	html?: string;
}

export interface NoteSection {
	title: string;
	kind: 'new' | 'improve' | 'fix' | 'other';
	items: NoteItem[];
}

const escapeHtml = (value: string) =>
	value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function renderItemHtml(rawText: string): string {
	let escaped = escapeHtml(rawText);
	return escaped.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|tg:\/\/[^\s)]+)\)/g, (_match, label, url) => {
		const isTg = url.startsWith('tg://');
		const target = isTg ? '' : ' target="_blank" rel="noopener noreferrer"';
		return `<a href="${url}"${target}>${label}</a>`;
	});
}

const plain = (s: string) =>
	s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '').trim();

function kindOf(title: string): NoteSection['kind'] {
	if (/fix|bug|виправ/i.test(title)) return 'fix';
	if (/improv|polish|покращ|удоскон|rewrite|перепис|змін/i.test(title)) return 'improve';
	if (/new|feature|нов|функці|можлив|add|додан/i.test(title)) return 'new';
	return 'other';
}

function localizeSectionTitle(title: string, lang?: 'en' | 'uk'): string {
	const clean = plain(title).replace(/:$/, '').trim();
	if (lang !== 'uk') {
		if (/^rewrited$/i.test(clean)) return 'Rewritten';
		return clean;
	}
	if (/^add(ed)?$/i.test(clean)) return 'Нові можливості';
	if (/^rewrite(d)?$/i.test(clean)) return 'Покращення та зміни';
	if (/^fix(ed)?$/i.test(clean)) return 'Виправлення';
	if (/^new features?$/i.test(clean)) return 'Нові можливості';
	if (/^improvements?( & polish)?$/i.test(clean)) return 'Покращення';
	if (/^bug fixes?$/i.test(clean)) return 'Виправлення';
	return clean;
}

/** Turns the GitHub-style release markdown into sections of "Name: text" rows. */
export function parseNotes(md: string, lang?: 'en' | 'uk'): NoteSection[] {
	const sections: NoteSection[] = [];
	let cur: NoteSection | null = null;
	for (const raw of md.split('\n')) {
		const line = raw.trim();
		if (!line || /^\*{0,2}full changelog/i.test(line)) continue;
		const h = line.match(/^#{1,4}\s+(.*)$/);
		if (h) {
			cur = { title: localizeSectionTitle(h[1], lang), kind: kindOf(h[1]), items: [] };
			sections.push(cur);
			continue;
		}
		const li = line.match(/^[-*•]\s*(.*)$/);
		if (!li) continue;
		if (!cur) {
			cur = { title: '', kind: 'other', items: [] };
			sections.push(cur);
		}
		const rawItemText = li[1].trim();
		const text = plain(rawItemText);
		const html = renderItemHtml(rawItemText);
		const m = text.match(/^([^:]{2,34}):\s+(.+)$/);
		if (m && m[1].split(/\s+/).length <= 4) {
			cur.items.push({ name: m[1], text: m[2], html: renderItemHtml(m[2]) });
		} else {
			cur.items.push({ name: '', text, html });
		}
	}
	return sections.filter((s) => s.items.length);
}

/** Old entries have no markdown; rebuild sections from the short card. */
export function sectionsFromCard(card: SiteNotes, labels: { news: string; fixes: string }): NoteSection[] {
	const out: NoteSection[] = [];
	if (card.highlights.length) out.push({ title: labels.news, kind: 'new', items: card.highlights.map((h) => ({ name: h.title, text: h.text })) });
	if (card.fixes.length) out.push({ title: labels.fixes, kind: 'fix', items: card.fixes.map((f) => ({ name: '', text: f })) });
	return out;
}

export async function deleteChangelog(version: string) {
	await ensureTable();
	await sql`DELETE FROM entinygram_changelog WHERE version = ${str(version, 80)}`;
}
