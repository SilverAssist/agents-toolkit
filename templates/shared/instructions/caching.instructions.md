---
applyTo: "**/next.config.*,**/src/proxy.ts,**/src/lib/**/*.ts,**/src/app/**/route.ts,**/src/app/**/page.tsx"
---
# Caching Standards (CRITICAL)

These rules are **mandatory** when touching data fetching, route segment configs, the asset/page
proxy, image config, or the on-demand revalidate route. Caching has several **independent layers**
(ISR page cache, data-fetch cache, request dedup, asset proxy, edge/CDN) — fixing one does not fix
the others.

> Apply to any Silver Side Next.js (App Router) frontend consuming the CCDS API and/or WordPress
> (headless GraphQL). If the project keeps a `docs/CACHING.md`, treat it as the extended reference.

## Hard rules

1. **Cache reads, not mutations — decide on intent, NEVER on the HTTP method.**
   Some reads must use `POST` because they take a body (e.g. CCDS `geo-search`). They still have to
   cache like a `GET`. Mutations (`submit-review`, lead submit, and any `PUT`/`DELETE`/`PATCH`) must
   stay uncached with `cache: "no-store"`. Expose a `mutation: true` flag on the client and mark every
   write with it.
   - ❌ **Never** gate caching on `method === "GET"` (e.g. `next: method === "GET" ? {...} : { revalidate: 0 }`).
     That leaves POST reads uncached and forces the whole route into dynamic rendering
     (`cache-control: private, no-store`).

2. **A `POST` read caches its DATA with `next` options — but the ROUTE still renders dynamically.**
   Next.js does not cache `POST` by default; any read `fetch` (GET or POST) to CCDS or the WP GraphQL
   endpoint must set `next: { revalidate, tags }` (the body is part of the cache key, so different
   filter bodies cache independently). **However** (WEB-1069, Next 16) a page whose data comes from a
   POST read still prerenders as `ƒ` (Dynamic) and serves `cache-control: private, no-store` even with
   those options — the data-fetch cache and the route's static/dynamic classification are independent.
   So `next: { revalidate, tags }` is **necessary but not sufficient** to make a POST-read page
   CDN-cacheable; you must also apply a rendering/edge strategy (rule 2b). GET reads ISR natively and
   need nothing extra.

2b. **Make a POST-read page cacheable at the rendering/edge layer.** Pick one (lowest risk first):
   - **CDN edge override (current/default):** `src/proxy.ts` matches city/community paths and sets
     `Cache-Control: public, s-maxage=2592000, stale-while-revalidate=2592000` — the same header ISR
     pages emit (see rule 7 `expireTime`), so the CDN policy is uniform. Origin stays dynamic; the CDN
     caches the deterministic-per-URL response. No build-time risk. This is what WEB-1069 shipped.
   - **`export const dynamic = "force-static"` (interim):** prerenders the route as real ISR, but a
     bad CCDS record/response at build time caches a blank page (the WEB-1058 regression) — use only
     when the page is fully null-safe and reads throw on 5xx at runtime. Validate per repo.
   - **`cacheComponents: true` + `use cache` (strategic):** PPR migration; do not mix ad hoc with
     route-segment `export const revalidate`.

3. **Always pair `tags` with a `revalidate` duration.** `next: { tags }` alone either holds stale data
   indefinitely or (Next 16 default) does not cache at runtime at all. Use a `CACHE_DURATIONS`-style
   default (e.g. 24h) so freshness survives a missed webhook.

4. **`React.cache()` is request dedup only.** It collapses duplicate calls within a single render. It
   does **not** cache across requests and is never a substitute for `next: { revalidate }`.

5. **Every cacheable route exports `revalidate`.** CCDS/WP data changes rarely and is refreshed
   on-demand (webhooks + tags), so the default is intentionally **long: `2592000` (30d)** for CCDS
   reads, `WP_CACHE_DURATIONS`, and page segments alike (WEB-1069). Shorter tiers (24h/7d) are fine
   per-route for volatile sources. Do **not** add `revalidate` to mutation/personalized routes (forms,
   thank-you, wizards). Default to `export const revalidate` over `dynamic = "force-static"` so a
   failed ISR revalidation preserves the last good cache instead of overwriting it with a broken page
   (force-static is still a valid POST-read option per rule 2b once null-safety + throw-on-5xx exist).

6. **On-demand revalidation dual-invalidates.** `/api/revalidate` must call `revalidateTag`/
   `revalidatePath` **and** the CDN invalidation (e.g. `invalidateCloudFrontPaths`) in the same
   request, otherwise the CDN keeps serving stale until its own TTL.

7. **`next.config` cache config.** `expireTime` sets the CDN stale window: Next emits
   `s-maxage=<revalidate>, stale-while-revalidate=<expireTime − revalidate>` for ISR pages, so
   `expireTime` **must be ≥ the largest page `revalidate`**. Set `expireTime: 5184000` (60d) so a 30d
   page yields `s-maxage=2592000, stale-while-revalidate=2592000` — the same header the proxy sets on
   dynamic pages (rule 2b). (WEB-1069 bug: `expireTime: 86400` under a 30d revalidate = invalid stale
   window.) Also set image `minimumCacheTTL: 31536000` (1y — optimized images are content-hashed and
   never change), `qualities`, and `formats: ["image/avif", "image/webp"]`. No malformed
   `remotePatterns` hostnames.

8. **Asset proxy TTLs** are type-keyed (image/css/font) at `365d + SWR 30d`.

## Canonical snippet — API client (read vs. mutation)

```ts
interface FetchOptions {
  endpoint: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: object | null;
  revalidateTag?: string;
  revalidate?: number;
  /** Writes are never cached. Reads (default) cache regardless of method. */
  mutation?: boolean;
}

export async function fetchData<T>({
  endpoint,
  method = "GET",
  body = null,
  revalidateTag,
  revalidate = 2592000, // 30d time-based fallback; pair with tags for surgical invalidation
  mutation = false,
}: FetchOptions): Promise<T | null> {
  const isMutation = mutation || method === "PUT" || method === "DELETE";

  const requestOptions: RequestInit = {
    method,
    // Reads (GET or POST) cache cross-request via `next`; mutations opt out.
    ...(isMutation
      ? { cache: "no-store" as RequestCache }
      : { next: { revalidate, tags: revalidateTag ? [revalidateTag] : [] } }),
  };

  if ((method === "POST" || method === "PUT") && body) {
    requestOptions.body = JSON.stringify(body);
  }
  // ...fetch + error handling...
}
```

## Canonical snippet — WordPress GraphQL client (cached POST)

```ts
export const WP_CACHE_DURATIONS = {
  pages: 2592000, posts: 2592000, menus: 2592000, staticPages: 2592000, default: 2592000, // 30d
} as const;

export async function fetchWPAPI<T>(
  query: string,
  { variables, revalidate = WP_CACHE_DURATIONS.default, tags }: {
    variables?: Record<string, unknown>; revalidate?: number; tags?: string[];
  } = {},
) {
  const res = await fetch(WP_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
    next: { revalidate, ...(tags && { tags }) }, // a POST IS cacheable WITH next options
  });
}
```

## Do NOT

- ❌ `next: method === "GET" ? {...} : { revalidate: 0 }` — leaves POST reads uncached.
- ❌ `fetch(API_URL, { method: "POST", body })` with no `next` options (bare, uncached POST read).
- ❌ `next: { tags }` with no `revalidate`.
- ❌ Adding `export const revalidate` to a form/mutation/personalized route.
- ❌ Treating `React.cache()` as cross-request caching.
- ❌ Caching a mutation (`submit-review`, lead submit, `PUT`/`DELETE`/`PATCH`).
- ❌ Mixing `cacheComponents: true` (`"use cache"`) with route-segment `export const revalidate` —
  that is a separate, deliberate migration; do not introduce it ad hoc.
