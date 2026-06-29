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

2. **A `POST` IS cacheable cross-request — but only with explicit `next` options.**
   Next.js does not cache `POST` by default. Any read `fetch` to CCDS or the WP GraphQL endpoint —
   GET or POST — must set `next: { revalidate, tags }`. The request body is part of the cache key, so
   different filter bodies cache independently.

3. **Always pair `tags` with a `revalidate` duration.** `next: { tags }` alone either holds stale data
   indefinitely or (Next 16 default) does not cache at runtime at all. Use a `CACHE_DURATIONS`-style
   default (e.g. 24h) so freshness survives a missed webhook.

4. **`React.cache()` is request dedup only.** It collapses duplicate calls within a single render. It
   does **not** cache across requests and is never a substitute for `next: { revalidate }`.

5. **Every cacheable route exports `revalidate`.** Suggested tiers: listing 24h–30d, detail/city 24h
   (`86400`), state/landing 7d (`604800`), WP catch-all 7d. Do **not** add `revalidate` to
   mutation/personalized routes (forms, thank-you, wizards). Prefer `export const revalidate` over
   `dynamic = "force-static"` so a failed ISR revalidation preserves the last good cache instead of
   overwriting it with a broken page.

6. **On-demand revalidation dual-invalidates.** `/api/revalidate` must call `revalidateTag`/
   `revalidatePath` **and** the CDN invalidation (e.g. `invalidateCloudFrontPaths`) in the same
   request, otherwise the CDN keeps serving stale until its own TTL.

7. **Image config** in `next.config`: set `minimumCacheTTL: 2592000` (30d), `qualities`, and
   `formats: ["image/avif", "image/webp"]`. No malformed `remotePatterns` hostnames.

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
  revalidate = 86400, // 24h time-based fallback; pair with tags for surgical invalidation
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
  pages: 86400, posts: 86400, menus: 86400, staticPages: 604800, default: 86400,
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
