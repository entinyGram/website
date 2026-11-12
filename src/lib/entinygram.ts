import { renderSafeMarkdown } from "./safe-markdown";

export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
  content_type: string;
}

export interface EntinyRelease {
  tag_name: string;
  name: string | null;
  published_at: string;
  html_url: string;
  body: string | null;
  prerelease: boolean;
  assets: ReleaseAsset[];
}

// In-memory caches to avoid hitting GitHub API on every SSR request
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

let releasesCache: CacheEntry<EntinyRelease[]> | null = null;

const RELEASES_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function getEntinyReleases(): Promise<EntinyRelease[]> {
  const now = Date.now();
  if (releasesCache && now - releasesCache.timestamp < RELEASES_CACHE_TTL) {
    return releasesCache.data;
  }

  try {
    const response = await fetch(
      "https://api.github.com/repos/entaytion/entinyGram/releases?per_page=15",
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "entinyGram-site",
        },
        signal: AbortSignal.timeout(4000),
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub releases API error: ${response.status}`);
    }

    const rawReleases = (await response.json()) as any[];
    const parsed: EntinyRelease[] = await Promise.all(
      rawReleases.map(async (r) => {
        const assets: ReleaseAsset[] = (r.assets || []).map((a: any) => ({
          name: a.name || "",
          browser_download_url: a.browser_download_url || "",
          size: a.size || 0,
          content_type: a.content_type || "",
        }));

        let bodyHtml: string | null = null;
        if (r.body && typeof r.body === "string" && r.body.trim()) {
          try {
            bodyHtml = await renderSafeMarkdown(r.body);
          } catch {
            bodyHtml = null;
          }
        }

        return {
          tag_name: r.tag_name || "",
          name: r.name || r.tag_name || "",
          published_at: r.published_at || new Date().toISOString(),
          html_url:
            r.html_url ||
            `https://github.com/entaytion/entinyGram/releases/tag/${r.tag_name}`,
          body: bodyHtml,
          prerelease: Boolean(r.prerelease),
          assets,
        };
      })
    );

    releasesCache = { data: parsed, timestamp: now };
    return parsed;
  } catch (error) {
    console.error("[entinygram] failed to fetch releases:", error);
    // Graceful fallback to stale cache if available
    if (releasesCache && releasesCache.data.length > 0) {
      return releasesCache.data;
    }
    return [];
  }
}

export async function getLatestEntinyRelease(): Promise<EntinyRelease | null> {
  const releases = await getEntinyReleases();
  return releases.find((r) => !r.prerelease) || releases[0] || null;
}
