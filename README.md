# entinyGram Website (`entiny.tech`)

Official website, documentation, downloads, and changelog for **entinyGram** (custom-pilled patchset for Telegram Android).

## Stack

- **Framework**: [Astro 7](https://astro.build/) (SSR mode)
- **Deployment**: [Vercel](https://vercel.com/) via `@astrojs/vercel`
- **Styling**: Tailwind CSS v4 & custom tokens
- **Analytics**: [Vercel Web Analytics](https://vercel.com/analytics) via `@vercel/analytics`
- **Components**: Web Components (`@material/web`) & custom Astro layouts

## Project Structure

```
├── public/
│   ├── branding/        # Concept icons, squircle vectors, brand assets
│   ├── docs/            # Translations JSON dictionary
│   ├── js/              # Theme and client-side translation switchers
│   └── og/              # Social media OpenGraph preview banners
├── src/
│   ├── components/      # Header, Footer, and UI components
│   ├── content/docs/en/ # Plugin documentation markdown files
│   ├── data/            # Static changelog fallback data
│   ├── layouts/         # Layout.astro with metadata, analytics & theme handling
│   ├── lib/             # Utilities: changelog, docs, releases
│   ├── pages/           # Astro routes: /, /features, /docs, /downloads, /faq, /donate, /branding
│   └── styles/          # Design tokens and main CSS
└── vercel.json          # Vercel deployment headers and configuration
```

## Development

```bash
bun install
bun run dev
```

## Production Build

```bash
bun run build
bun run preview
```
