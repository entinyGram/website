import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = () => {
	const site = (import.meta.env.PUBLIC_SITE_URL || 'https://entiny.tech').replace(/\/$/, '');
	const body = `User-agent: *
Allow: /
Disallow: /api

Sitemap: ${site}/sitemap.xml
`;
	return new Response(body, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
};
