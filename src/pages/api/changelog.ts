import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { deleteChangelog, listChangelog, upsertChangelog } from '../../lib/changelog';

export const prerender = false;

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra },
	});

export const GET: APIRoute = async () => {
	try {
		return json(await listChangelog(), 200, {
			'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
			'Access-Control-Allow-Origin': '*',
		});
	} catch (err) {
		console.error('[changelog] list failed', err);
		return json({ error: 'unavailable' }, 503, { 'Cache-Control': 'no-store' });
	}
};

function authorized(request: Request) {
	const expected = import.meta.env.CHANGELOG_TOKEN || process.env.CHANGELOG_TOKEN;
	const given = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
	const a = Buffer.from(given);
	const b = Buffer.from(expected ?? '');
	return !!expected && a.length === b.length && crypto.timingSafeEqual(a, b);
}

export const DELETE: APIRoute = async ({ request, url }) => {
	if (!authorized(request)) return json({ error: 'forbidden' }, 403);
	const version = url.searchParams.get('version');
	if (!version) return json({ error: 'version required' }, 400);
	await deleteChangelog(version);
	return json({ ok: true });
};

/** Release CI publishes the website card here; guarded by a shared bearer token. */
export const POST: APIRoute = async ({ request }) => {
	if (!authorized(request)) return json({ error: 'forbidden' }, 403);

	let body: any;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'bad json' }, 400);
	}
	try {
		await upsertChangelog(body);
		return json({ ok: true });
	} catch (err) {
		return json({ error: String((err as Error).message) }, 400);
	}
};
