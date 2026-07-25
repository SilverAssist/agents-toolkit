---
name: nextjs-caching
description: Caching strategy for Next.js (App Router) frontends consuming the CCDS API and headless WordPress. Use when asked about caching, ISR, "revalidate", "stale data", "page not cached", "private / no-store header", POST requests not caching, CloudFront/CDN invalidation, `next: { revalidate, tags }`, or when a page unexpectedly renders dynamically.
---

# Next.js Caching Skill

Canonical caching strategy for Silver Assist Side Next.js (App Router) frontends. Use it when touching data
fetching, route segment configs, the asset/page proxy, image config, or the on-demand revalidate
route — and when diagnosing "why isn't this page cached / why is it serving stale".

> Companion: `caching.instructions.md` (the short, auto-applied rules). This skill is the deep
> reference and decision guide. If a project keeps a `docs/CACHING.md`, that is its project-specific
> extension (endpoints, CloudFront IDs, per-route tiers) and is never overwritten by the toolkit.

---

## Core principle

**Cache by intent (read vs. mutation), never by the HTTP method.** Some reads must use `POST` because
they take a body (e.g. CCDS `geo-search`). Their *data* still has to cache like a `GET` — send
`next: { revalidate, tags }`, never `no-store`. Mutations must never cache.

**But caching the data is not the same as making the page static.** A POST read caches its response
cross-request, yet Next.js still renders the *route* dynamically (`private, no-store`). The data-fetch
cache (layer 2) and the route's static/dynamic classification (layers 1/5) are **independent** — see
the two sections below. This is the WEB-1069 gotcha and the reason city/community pages needed an edge
override even though their fetches were already cached.

---

## The caching layers (independent)

Fixing one does **not** fix the others.

| # | Layer | Where | Purpose |
|---|-------|-------|---------|
| 1 | ISR / page cache | `export const revalidate` per route | Time-based regeneration of rendered pages |
| 2 | Data-fetch cache | `next: { revalidate, tags }` on each `fetch` | Cross-request caching of CCDS/WP responses |
| 3 | Request dedup | `React.cache()` around client fns | Collapse duplicate calls within one render |
| 4 | Asset proxy | `src/app/assets/[...path]/route.ts` | Long-lived `Cache-Control` on WP images/CSS/fonts |
| 5 | Edge / CDN | `src/proxy.ts` + CloudFront | `s-maxage` at the edge + on-demand invalidation |

**Layer 2 is the most commonly broken.** A page can be ISR-enabled (layer 1) yet still hit origin on
every request if its data fetches (layer 2) are not cached — and an uncached fetch also forces the
whole route into **dynamic rendering**, which emits `cache-control: private, no-cache, no-store`.

---

## POST reads: the data caches, but the route stays dynamic (the key gotcha)

Two independent facts, both true:

1. **The data fetch caches.** From `next/dist/server/lib/patch-fetch.js`: a `fetch` is uncacheable
   only when it has no `next`/`cache` options *and* the segment `revalidate` is `0`. So a POST **with**
   `next: { revalidate }` IS cached cross-request — the **request body is part of the cache key**
   (`generateCacheKey` hashes `init.body`), so different filter bodies cache independently. This is
   real and bounds origin/CCDS load; it is why the WordPress GraphQL POST caches fine.

2. **The route still renders dynamically.** Empirically (WEB-1069, Next 16), a page whose data comes
   from a POST read prerenders as `ƒ` (Dynamic) and serves `cache-control: private, no-store` — **even
   with** `next: { revalidate, tags }` on the fetch. Next treats the POST as request-time data for
   prerendering, so ISR (layer 1) never engages. GET reads do not have this problem — they ISR
   natively (`s-maxage`, `x-nextjs-cache: HIT`).

**Implication:** `next: { revalidate, tags }` on a POST read is **necessary** (data cache) but **not
sufficient** to make the page CDN-cacheable. You must additionally pick a rendering/edge strategy
(next section). `revalidate` + `tags` alone will NOT flip a POST-read page from `private, no-store` to
`public`.

## Making a POST-read page cacheable (rendering / edge layer)

Pick one (ordered by risk, lowest first):

1. **CDN edge override (current, lowest risk).** `src/proxy.ts` matches the city/community paths and
   sets `Cache-Control: public, s-maxage=2592000, stale-while-revalidate=2592000` — the **same**
   header the ISR pages emit (see `expireTime` under ISR tiers), so the CDN policy is uniform across
   static and dynamic routes. The origin stays dynamic; the CDN caches the deterministic-per-URL
   response. Per-repo regex, no build-time risk — this is what WEB-1069 shipped. **Requires:** a
   per-repo path regex in `src/proxy.ts` that matches exactly the routes you want cached **and**
   those routes must be **public and deterministic per URL** — no auth-, cookie-, or session-
   dependent output. A `public` edge cache serves one stored response to *every* visitor, so a
   personalized route matched here would leak one user's content to others. Never match
   authenticated or personalized paths.
2. **`export const dynamic = "force-static"` (interim).** Forces the POST read to `force-cache` and
   prerenders the route as real ISR (confirmed via `prerender-manifest.json`). Removed in WEB-1058
   because a CCDS failure at build time cached a **blank page**; safer now that reads throw on 5xx at
   runtime (a failed revalidation keeps the last good cache), but full prerender is sensitive to
   null/bad records. **Requires:** the page is fully null-safe (every field access guarded) AND the
   client throws on 5xx at runtime (so ISR keeps the previous version instead of caching an error).
3. **`cacheComponents: true` + `use cache` (strategic).** Wrap the POST read in `use cache` so its data
   lands in the static shell (PPR). Next-recommended long term; larger migration. **Requires:** a
   deliberate PPR migration for the whole route segment; do **not** mix ad hoc with route-segment
   `export const revalidate` (the two models conflict).

---

## Canonical API client (read vs. mutation)

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

Mark every write explicitly:

```ts
await fetchData({ endpoint: "community/submit-review", method: "POST", body, mutation: true });
```

WordPress GraphQL client (POST read — must carry `next`):

```ts
await fetch(WP_API_URL, {
  method: "POST",
  body: JSON.stringify({ query, variables }),
  next: { revalidate, ...(tags && { tags }) }, // a POST IS cacheable WITH next options
});
```

---

## ISR revalidate tiers

CCDS/WP data changes rarely and is refreshed on-demand via webhooks + tags, so the time-based default
is intentionally **long** (WEB-1069):

| Route / config | Value |
|----------------|-------|
| CCDS reads (client default) | `2592000` (30d) |
| WordPress GraphQL reads (`WP_CACHE_DURATIONS`) | `2592000` (30d) |
| Listing / detail / city / community / state / landing / WP catch-all | `2592000` (30d) |
| `next.config` `expireTime` (CDN stale window) | `5184000` (60d) → emits `s-maxage=2592000, stale-while-revalidate=2592000` |
| `next.config` image `minimumCacheTTL` | `31536000` (1y) — optimized images are content-hashed, never change |

- Every cacheable route exports `revalidate`. Do **not** add it to form/personalized routes.
- **`expireTime` sets the CDN stale window.** Next emits `s-maxage=<revalidate>,
  stale-while-revalidate=<expireTime − revalidate>` for ISR pages, so `expireTime` **must be ≥ the
  largest `revalidate`** or the stale window is invalid (the WEB-1069 bug: `expireTime: 86400` under a
  30d revalidate). Set it to `5184000` (60d) so a 30d page yields the same header the proxy sets on
  dynamic pages: `s-maxage=2592000, stale-while-revalidate=2592000`.
- The long default is safe because a missed webhook still self-heals within 30d; use `tags` for
  immediate surgical invalidation. Shorter tiers (24h/7d) are appropriate per-route when the data
  source updates more frequently than the 30d default — for example, sources that update daily or
  weekly. Sources that update less frequently than 30d should keep the default.
- Default to `export const revalidate` over `dynamic = "force-static"`: a failed ISR revalidation then
  preserves the last good cache instead of overwriting it with a broken page. Pair with a client that
  **throws on 5xx at runtime** (so ISR keeps the previous version) but returns an error during the
  build phase (so `generateStaticParams` can skip a bad entry without failing the build). `force-static`
  is still a valid POST-read option (see "Making a POST-read page cacheable") **once** the page is
  fully null-safe and the throw-on-5xx guard is in place.

---

## On-demand revalidation (dual invalidation)

`/api/revalidate` must invalidate **both** layers in one request, or the CDN serves stale until its
own TTL expires:

```ts
revalidatePath(path, "page");        // or "layout"
revalidateTag(tag);                  // granular per-state / per-city tags
if (invalidateCDN) await invalidateCloudFrontPaths([path]);
```

If `invalidateCloudFrontPaths` throws, log the error and surface it to the caller — do **not**
silently swallow it. The Next.js cache will be fresh but the CDN will serve stale until its TTL
expires; an operator must retry the CloudFront invalidation manually.

---

## Anti-patterns

- ❌ `next: method === "GET" ? {...} : { revalidate: 0 }` — leaves POST reads uncached (origin hit
  every render). Note: even a *correctly* cached POST read still renders the route dynamically — that
  needs an edge override, not just `next` options (see "Making a POST-read page cacheable").
- ❌ Bare `fetch(url, { method: "POST", body })` for a read — refetched from origin every render.
- ❌ `next: { tags }` with no `revalidate` — holds stale data or doesn't cache at runtime.
- ❌ Caching a mutation (`submit`, lead, `PUT`/`DELETE`/`PATCH`).
- ❌ Treating `React.cache()` as cross-request caching (it's request-scoped dedup only).
- ❌ `dynamic = "force-static"` on a page that is **not** fully null-safe or lacks throw-on-5xx — a bad
  CCDS record/response at build time caches a broken/blank page (the WEB-1058 regression). It is a
  valid option only once those guards exist.
- ❌ Mixing `cacheComponents: true` (`"use cache"`) with route-segment `export const revalidate` —
  that is a separate, deliberate migration; do not introduce it ad hoc.

---

## Diagnosing "page is not cached"

1. **Check the response header.** `cache-control: private, no-cache, no-store` ⇒ the route is rendering
   dynamically. Something opted it into dynamic rendering.
2. **Find the dynamic trigger.** Usually an uncached fetch (a POST read without `next`, or
   `revalidate: 0`), or a request-time API (`cookies()`, `headers()`, `searchParams`).
3. **Fix layer 2 first.** Give read fetches `next: { revalidate, tags }`; mark mutations `no-store`.
4. **Confirm the route exports `revalidate`.**
5. **Reconcile CDN vs. ISR TTLs.** If ISR is 24h but CDN `s-maxage` is shorter, an ISR revalidation
   should trigger a CloudFront invalidation for that path.

---

## Verification

```bash
# A POST-read page (e.g. a city) must be publicly cacheable:
curl -sI https://<host>/<care-type>/<state>/<city> | grep -i cache-control
# expect: cache-control: public, ...   (NOT private/no-store)
```

In the build output, `●` (or "Static"/"ISR") means prerendered; `ƒ` ("Dynamic") means it renders per
request. Which one to expect depends on the strategy chosen in "Making a POST-read page cacheable":
strategy **2** (`force-static`) prerenders fully, so it shows `●`; strategy **3** (`use cache` / PPR)
shows `●` only when the whole route is static — if dynamic holes remain it renders as a **partial
prerender** and Next marks it `◐` (partial), which is still correct output, so do not reject it.
Strategy **1** (CDN edge override) intentionally leaves the route as `ƒ` — the page is CDN-cached at
the edge even though Next classifies it as dynamic. Because the symbol alone is ambiguous across
strategies, verify with the `curl -sI … | grep -i cache-control` check above and defer to the
installed Next.js version's build-output legend rather than the symbol. `next.config`
`logging.fetches.fullUrl: true` shows per-fetch cache decisions in dev.
