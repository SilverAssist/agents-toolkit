---
name: nextjs-caching
description: Caching strategy for Next.js (App Router) frontends consuming the CCDS API and headless WordPress. Use when asked about caching, ISR, "revalidate", "stale data", "page not cached", "private / no-store header", POST requests not caching, CloudFront/CDN invalidation, `next: { revalidate, tags }`, a page unexpectedly renders dynamically, `notFound()` returning HTTP 200, a 404 or error page getting cached as if valid, or a data-fetching function collapsing errors into `null`.
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

0. **Native ISR via `generateStaticParams() { return [] }` (preferred when achievable).** A dynamic
   segment (`[state]`, `[city]`, `[community]`, …) needs *some* `generateStaticParams` export to be
   ISR-eligible at all — `export const revalidate` alone, with no `generateStaticParams` export,
   leaves the route fully dynamic (`ƒ`) regardless of what the fetches inside it cache (confirmed
   empirically across an 8-repo fleet audit, 2026-08: two repos had this exact gap — `revalidate` set,
   no `generateStaticParams`, still `ƒ`). Returning `[]` (not omitting the export) is the fix: it
   marks the segment as ISR-eligible with **zero pages pre-built at compile time** — `dynamicParams`
   defaults to `true`, so every real param renders on first request and is cached from then on per
   `revalidate`. This is not the same as strategy 2 (`force-static`) — no build-time fetch, no
   build-time null-safety requirement, build time doesn't change. Once every segment in the route
   (including parallel-route `@slot`s, if any — **every** slot needs its own
   `generateStaticParams() { return [] }` or the whole route silently reverts to dynamic) is
   ISR-eligible this way, Next's own per-status `Cache-Control` applies correctly — a real page caches,
   a confirmed `notFound()` caches (as a legitimate 404), and a thrown error does not — and **strategy
   1's CDN override becomes unnecessary and should be removed**, since it can't do that per-status
   distinction (see the warning below). Verify with `next build` route output (`●` not `ƒ`) and
   `curl -sI` on both a real and a confirmed-missing URL.
1. **CDN edge override (fallback, when native ISR isn't achievable).** `src/proxy.ts` matches the
   city/community paths and sets `Cache-Control: public, s-maxage=2592000,
   stale-while-revalidate=2592000` — the **same** header the ISR pages emit (see `expireTime` under
   ISR tiers), so the CDN policy is uniform across static and dynamic routes. The origin stays
   dynamic; the CDN caches the deterministic-per-URL response. Per-repo regex, no build-time risk —
   this is what WEB-1069 shipped. **Requires:** a per-repo path regex in `src/proxy.ts` that matches
   exactly the routes you want cached **and** those routes must be **public and deterministic per
   URL** — no auth-, cookie-, or session-dependent output. A `public` edge cache serves one stored
   response to *every* visitor, so a personalized route matched here would leak one user's content to
   others. Never match authenticated or personalized paths.

   > ⚠️ **This override is inherently status-blind.** It runs in middleware, before the downstream
   > page has rendered, so it has no visibility into the eventual response status — it sets the same
   > 30-day public cache on a `200`, a confirmed `notFound()` 404, **and** a transient upstream 5xx
   > alike. Confirmed live across a 2026-08 fleet audit: 5 of 8 sibling repos had this exact bug,
   > including one case where pointing the API at an unreachable host and reloading still returned the
   > override's `public, s-maxage=2592000` on the resulting 500 — a transient outage cached publicly
   > for 30 days. If a route matched by this override can ever throw (see the discriminated-union
   > section below), prefer strategy 0 once its prerequisites are met; don't leave the override in
   > place "because it already works" for the 200 case without checking what it does to the error case.
2. **`export const dynamic = "force-static"` (interim).** Forces the POST read to `force-cache` and
   prerenders the route as real ISR (confirmed via `prerender-manifest.json`). Removed in WEB-1058
   because a CCDS failure at build time cached a **blank page**; safer now that reads throw on 5xx at
   runtime (a failed revalidation keeps the last good cache), but full prerender is sensitive to
   null/bad records. **Requires:** the page is fully null-safe (every field access guarded); the read
   throws on failure **at build/prerender time too** (not only during runtime revalidation) so a failed
   read aborts generation instead of prerendering a cacheable blank/error page — the exact WEB-1058
   regression; AND the client throws on 5xx at runtime (so ISR keeps the previous version instead of
   caching an error). Re-validate this per repository before adopting the strategy.
3. **`cacheComponents: true` + `use cache` (strategic).** Wrap the POST read in `use cache` so its data
   lands in the static shell (PPR). Next-recommended long term; larger migration. **Requires:** a
   deliberate PPR migration for the whole route segment; do **not** mix ad hoc with route-segment
   `export const revalidate` (the two models conflict). Inside a `use cache` scope, `cacheLife()` can
   be called *after* inspecting the fetched result — e.g. a longer TTL for a confirmed-found record and
   a much shorter one for a confirmed-not-found one — something the static route-segment `revalidate`
   export can never express (it's one literal value for the whole segment, chosen before any fetch
   runs). Route-segment config can only approximate this by taking the *minimum* `revalidate` across
   every fetch/`unstable_cache` call in the segment when no static `export const revalidate` overrides
   it — a workable but non-obvious mechanism; `cacheLife()` is the direct way to do it once on Cache
   Components.

---

## The `notFound()` → HTTP 200 gotcha (ancestor `loading.tsx`)

A route can call `notFound()` correctly, render the right "not found" UI, and **still return HTTP
200** — silently breaking every caching assumption that depends on status code (crawlers index it as
a real page, the CDN/ISR layer caches it as a `200`, monitoring never sees the 404). Root cause,
confirmed live (family-nextjs, 2026-08, then reproduced in 5+ sibling repos): any ancestor
`loading.tsx` file automatically wraps its whole subtree in a React `<Suspense>` boundary — a plain
Next.js file-convention, not a bug in the file itself. If a route inside that subtree calls
`notFound()`, the response has **already begun streaming as `200`** by the time the check resolves,
and the status cannot change once streaming has started. Per Next's own docs: *"Because the check
runs inside the `<Suspense>` boundary, the response has already begun streaming as a `200`, and the
status can't change once streaming has started."*

**This is easy to miss** because the rendered UI is correct — only the HTTP status is wrong, and
nothing in local dev (`npm run dev`) surfaces it unless you specifically check the status header;
`npm run build && npm run start` does reproduce it.

**Fix:** find every `loading.tsx` that sits as an ancestor of any route calling `notFound()`, and
delete it or restructure the loading UI into a component-level `<Suspense>` that is *not* an ancestor
of that route. Don't do this reflexively — grep for `loading.tsx` first, then check whether anything
beneath it in the tree calls `notFound()`; a `loading.tsx` with no `notFound()`-calling descendant is
not part of this bug.

**Verify, don't assume:**

```bash
npm run build && npm run start
curl -sv https://localhost:3000/<a-confirmed-missing-path> 2>&1 | grep "^< HTTP"
# expect: HTTP/1.1 404 Not Found — not 200
```

Structural similarity to a previously-confirmed case (same file layout as another repo that had this
bug) is strong circumstantial evidence, but treat it as a hypothesis to verify with the curl check
above, not a settled fact — one fleet audit found a repo with the identical file structure that
turned out **not** to be affected once actually tested.

## Discriminated-union data fetching (don't collapse errors into `null`)

A data-fetching function that collapses distinct failure modes — confirmed-not-found vs.
incomplete/malformed data vs. a transient API error (5xx, timeout, unexpected response shape) — into
a single `null`/falsy return is a caching-correctness bug, not just a type-safety nitpick: if every
caller reacts to that `null` with `notFound()`, a transient upstream outage gets **cached as a
permanent 404** for the full `revalidate` window (up to 30d per the tiers above), and stays wrong
until the next on-demand invalidation or webhook.

**Fix:** return a discriminated union instead of `T | null`:

```ts
type LookupResult<T> =
  | { status: "found"; data: T }
  | { status: "not_found" }                              // confirmed absent — a real, cacheable 404
  | { status: "incomplete"; data: Partial<T>; missingFields: string[] }  // present but malformed
  | { status: "api_error"; code: number };                // transient — never cache as not-found
```

Callers branch via a shared resolver, not an inline `if`:

```ts
function resolveOrThrow(result: LookupResult<T>): T {
  switch (result.status) {
    case "found": return result.data;
    case "not_found": return notFound();                  // real 404, safe to cache
    case "incomplete": throw new IncompleteDataError(result.missingFields);
    case "api_error": throw new ApiError(result.code);
  }
}
```

The `throw` branches are the load-bearing part: Next.js does **not** cache a response when page
generation throws during ISR revalidation — it preserves the last good cached version instead of
overwriting it with the transient failure. This reuses an existing mechanism rather than building new
caching logic. Give `generateMetadata` the same branching (and call `notFound()` there too for the
`not_found` case specifically) — Next only uses the nearest `not-found` boundary's ancestor-layout
metadata once a segment's own page body calls `notFound()`, so metadata returned by `generateMetadata`
for that same status is silently discarded otherwise; mirroring the call keeps both paths consistent.

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
- ❌ A CDN/edge cache override (strategy 1) applied to a route that can also throw or call
  `notFound()` without checking `response.status` first — it caches the error the same as the 200.
- ❌ Collapsing "not found" / "malformed" / "upstream error" into one `null` return — see
  "Discriminated-union data fetching" above; a transient failure gets cached as a permanent 404.
- ❌ Assuming a `notFound()` call returns a real 404 without checking the response header — a
  correct-looking UI can still be serving `200`; see the `loading.tsx` gotcha above.

---

## Diagnosing "page is not cached"

1. **Check the response header.** `cache-control: private, no-cache, no-store` ⇒ the route is rendering
   dynamically. Something opted it into dynamic rendering.
2. **Find the dynamic trigger.** Usually an uncached fetch (a POST read without `next`, or
   `revalidate: 0`), or a request-time API (`cookies()`, `headers()`, `searchParams`).
3. **Fix layer 2 first.** Give read fetches `next: { revalidate, tags }`; mark mutations `no-store`.
4. **Confirm the route exports `revalidate`** *and* has some `generateStaticParams` (even `return []`)
   — without the latter, `revalidate` on a dynamic segment is silently a no-op (see strategy 0 above).
5. **Reconcile CDN vs. ISR TTLs.** If ISR is 24h but CDN `s-maxage` is shorter, an ISR revalidation
   should trigger a CloudFront invalidation for that path.

## Diagnosing "a 404/error page is cached as if it were valid"

1. **Check the status code, not just the cache header.** `curl -sv` a confirmed-missing URL and read
   the `HTTP/1.1 ___` line — a `200` there means the response is being cached as if it were real
   content, regardless of what the rendered UI shows. See the `loading.tsx` gotcha above.
2. **Check whether the data layer collapses errors.** If the fetching function returns `T | null`
   instead of a discriminated union, a transient failure and a real not-found are indistinguishable to
   every caller — see "Discriminated-union data fetching" above.
3. **Check whether a CDN/edge override is status-blind.** If `src/proxy.ts` (or equivalent) sets
   `Cache-Control` on a path pattern without first checking `response.status`, it caches every status
   that matches the pattern identically — see the warning under strategy 1 above.

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
