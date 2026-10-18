import type { APIRoute } from 'astro';
import { docs } from '../lib/docs';

export const prerender = false;

export const GET: APIRoute = async () => {
	const site = (import.meta.env.PUBLIC_SITE_URL || 'https://entiny.tech').replace(/\/$/, '');

	const staticPaths = [
		'/',
		'/features',
		'/changelog',
		'/faq',
		'/docs',
		'/downloads',
		'/donate',
		'/branding',
		...docs.map((doc) => `/docs/${doc.slug}`),
	];

	const urls = staticPaths.map(
		(p) => `<url><loc>${site}${p}</loc><changefreq>weekly</changefreq></url>`,
	).join('');

	const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600',
		},
	});
};
