import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
    output: 'server',
    redirects: {
        '/entinygram': '/',
        '/entinyGram': '/',
        '/entinygram/:path*': '/:path*',
    },
    adapter: vercel({
        webAnalytics: {
            enabled: true,
        },
    }),
    vite: {
        plugins: [tailwindcss()],
    },
});
