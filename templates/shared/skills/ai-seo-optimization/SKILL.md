---
name: ai-seo-optimization
description: Optimize websites for Google's generative AI features and browser agents. Use when asked to "optimize for AI search", "AI overview", "agent-friendly audit", "E-E-A-T assessment", "AI SEO", "generative search optimization", or "audit accessibility for agents".
---

# AI SEO Optimization Skill

Comprehensive guide for optimizing Next.js sites for Google's generative AI features (AI Overviews, AI Mode) and emerging browser agent interactions.

> **Source**: [Google AI Optimization Guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) (May 2026)
> **Companion**: [Build Agent-Friendly Websites](https://web.dev/articles/ai-agent-site-ux) (April 2026)

---

## Core Principle

**AI Search optimization IS SEO.** There is no separate "AEO" or "GEO" discipline. Google's AI features use the same Search index, the same ranking signals, and the same content quality assessments. If your page is well-optimized for Search, it's well-optimized for AI features.

---

## 1. How Google's AI Features Discover Content

Google's generative AI features use **Retrieval-Augmented Generation (RAG)**:

1. User query triggers **query fan-out** (multiple sub-queries)
2. Each sub-query retrieves pages from the **existing Search index**
3. AI synthesizes answers from retrieved content
4. Citations link back to source pages

**Requirements for inclusion:**
- Page MUST be indexed (verify in Search Console)
- Page MUST allow snippets (no `nosnippet` meta directive)
- Content MUST be server-rendered (not client-only JavaScript)
- Content MUST be accessible to Googlebot (no login walls for indexed content)

---

## 2. Agent-Friendly UX Audit Checklist

Browser agents (Google's Mariner, OpenAI's Operator, etc.) interact with sites through three channels:

1. **Screenshots** — Vision model identifies elements visually
2. **HTML/DOM** — Understands nesting, hierarchy, relationships
3. **Accessibility tree** — Roles, names, states of interactive elements

### Semantic HTML

- [ ] All clickable elements use `<button>` or `<a href>` (NEVER `<div onClick>` or `<span onClick>`)
- [ ] All form inputs have associated `<label htmlFor="id">` (not just placeholder text)
- [ ] Heading hierarchy is logical (`h1` > `h2` > `h3`, no skips)
- [ ] Lists use `<ul>`/`<ol>`/`<li>` (not styled divs)
- [ ] Tables use `<table>` with `<th>` headers for tabular data
- [ ] Navigation uses `<nav>` with proper `aria-label`
- [ ] Main content wrapped in `<main>`
- [ ] Sections use `<section>` or `<article>` with headings

### Accessibility Tree

- [ ] All interactive elements have accessible names (visible text, `aria-label`, or `aria-labelledby`)
- [ ] ARIA roles used ONLY when semantic HTML isn't available
- [ ] Skip-to-content link is first focusable element
- [ ] Focus order matches visual order (`tabindex` not misused)
- [ ] Modal dialogs use `<dialog>` or proper `role="dialog"` with focus trapping
- [ ] Dynamic content changes announced via `aria-live` regions

### Visual Stability

- [ ] No layout shifts after load (CLS < 0.1)
- [ ] Interactive elements have stable positions (no jumping during scroll)
- [ ] No transparent overlays blocking clickable elements (ghost overlays)
- [ ] All actionable elements meet minimum target size of 24×24 CSS px (WCAG 2.2 SC 2.5.8)
- [ ] Images have explicit `width` and `height` (prevent layout shift)

### CSS Signals for Agents

- [ ] `cursor: pointer` on all clickable elements (strong actionability signal)
- [ ] Focus indicators visible on keyboard navigation (`:focus-visible` styles)
- [ ] Interactive states are distinct (`:hover`, `:active`, `:focus`)
- [ ] Disabled elements have `pointer-events: none` and `opacity` reduction
- [ ] No `display: none` on elements that should be accessible to screen readers

### Form Accessibility (Critical for Agent Interactions)

- [ ] Every `<input>` has an associated `<label>` with `htmlFor`
- [ ] Required fields marked with `aria-required="true"` or `required` attribute
- [ ] Error messages linked with `aria-describedby`
- [ ] Form groups use `<fieldset>` with `<legend>`
- [ ] Submit buttons have clear text (not just icons)
- [ ] Autocomplete attributes set for common fields (`name`, `email`, `tel`, `address-*`)

---

## 3. E-E-A-T Assessment (Critical for YMYL Sites)

For sites dealing with health, finance, safety, or life decisions (Your Money or Your Life), E-E-A-T signals are critical for AI citation.

### Experience

- [ ] Content demonstrates first-hand knowledge (not aggregated summaries)
- [ ] Real user reviews and testimonials with attribution
- [ ] Case studies or examples from actual experience
- [ ] Visual evidence (photos, videos) of real experiences

### Expertise

- [ ] Author credentials displayed clearly (degrees, certifications, years of experience)
- [ ] Author pages exist with `Person` schema and `knowsAbout` properties
- [ ] Content reviewed by subject matter experts (editorial review notice)
- [ ] Specialized terminology used correctly with explanations for lay readers

### Authoritativeness

- [ ] About page with team credentials, methodology, and mission
- [ ] Clear data source disclosures ("Where our data comes from")
- [ ] "How we rate" or methodology explanation pages
- [ ] Institutional authority signals (partnerships, certifications, media mentions)
- [ ] Consistent NAP (Name, Address, Phone) across web presence

### Trustworthiness

- [ ] Contact information easily findable (not buried in footer only)
- [ ] Privacy policy and terms of service accessible from all pages
- [ ] Transparent pricing when applicable (no hidden fees)
- [ ] Content is accurate and up-to-date (publish/update dates visible)
- [ ] Corrections policy or update log for changed information
- [ ] HTTPS enforced, security headers properly configured

---

## 4. Non-Commodity Content Criteria

Google's AI features prefer content that provides unique value. Assess content against these criteria:

### Non-Commodity Content (Google Favors)

- **Unique data analysis** from proprietary sources (not publicly available datasets)
- **First-hand experiences** and detailed reviews with specific details
- **Expert-led insights** that go beyond commonly available information
- **Original research** with methodology and reproducible findings
- **Interactive tools** and calculators with unique logic
- **Comparison data** that requires effort to compile (pricing, availability)
- **Local knowledge** that can't be found without physical presence

### Commodity Content (Avoid or Upgrade)

- ❌ "X Tips for [topic]" without unique insights (generic listicles)
- ❌ Summaries of information freely available elsewhere
- ❌ Generic advice easily produced by any AI model
- ❌ Content created primarily for keyword targeting
- ❌ Thin pages with minimal original value
- ❌ Automatically generated content without expert review

### Content Upgrade Strategy

For existing commodity content, improve by adding:
1. **Unique data points** from proprietary sources
2. **Expert commentary** with attribution
3. **Real examples** with specifics (names, dates, outcomes)
4. **Interactive elements** (calculators, comparison tools)
5. **Original media** (photographs, diagrams, video)

---

## 5. Technical SEO for AI Discovery

### Indexing & Crawlability

- [ ] All key pages indexed (verify in Google Search Console)
- [ ] No accidental `noindex` directives on important pages
- [ ] No `nosnippet` or `data-nosnippet` blocking content extraction
- [ ] `robots.txt` doesn't block critical resources
- [ ] Crawl budget optimized (no low-value pages wasting crawl resources)
- [ ] XML sitemap includes all valuable pages (updated automatically)

### Server-Side Rendering

- [ ] Critical content renders on server (not client-only JavaScript)
- [ ] Dynamic content accessible without user interaction
- [ ] No infinite scroll hiding content from crawlers
- [ ] Metadata generated server-side (`generateMetadata` in Next.js)

### URL & Content Structure

- [ ] Canonical tags correctly set (prevent duplicate content confusion)
- [ ] Internal linking connects related content (topic clusters)
- [ ] Breadcrumb navigation with schema markup
- [ ] Clean URL structure reflecting content hierarchy
- [ ] Pagination handled with view-all option or clear next/previous links (note: `rel="next"`/`rel="prev"` is no longer used as a Google indexing signal)

### Performance & Page Experience

- [ ] Core Web Vitals in "Good" range (LCP < 2.5s, INP < 200ms, CLS < 0.1)
- [ ] HTTPS enforced with valid certificate
- [ ] No intrusive interstitials blocking content
- [ ] Mobile-friendly (responsive design)
- [ ] Font loading doesn't cause layout shift (`display: swap`)

---

## 6. Structured Data Patterns

Structured data helps Google understand content relationships. While NOT required for AI features, it improves overall search presence.

### LocalBusiness (Community/Location Pages)

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Community Name",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Main St",
    "addressLocality": "City",
    "addressRegion": "FL",
    "postalCode": "33101"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": 25.76, "longitude": -80.19 },
  "telephone": "+1-555-0100",
  "priceRange": "$$-$$$",
  "openingHours": "Mo-Su 00:00-24:00",
  "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.5", "reviewCount": "28" },
  "sameAs": ["https://g.page/community", "https://facebook.com/community"]
}
```

### Person (Author/Expert Pages)

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Author Name",
  "jobTitle": "Senior Care Advisor",
  "knowsAbout": ["Assisted Living", "Memory Care", "VA Benefits"],
  "sameAs": ["https://linkedin.com/in/author"],
  "worksFor": { "@type": "Organization", "name": "Company Name" }
}
```

### Article (Blog/Resource Posts)

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Article Title",
  "author": { "@type": "Person", "name": "Author", "url": "/about/authors/slug" },
  "datePublished": "2026-01-15",
  "dateModified": "2026-05-01",
  "publisher": { "@type": "Organization", "name": "Site Name" }
}
```

### FAQPage (FAQ Sections)

```json
{
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is the cost of assisted living?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The average cost varies by state..."
      }
    }
  ]
}
```

---

## 7. What NOT to Do (Mythbusting)

These are explicitly confirmed as **unnecessary or harmful** by Google:

| ❌ Don't Do This | Why |
|------------------|-----|
| Create `llms.txt` files | Google doesn't treat them specially |
| "Chunk" content into tiny pieces | Google handles multi-topic pages fine |
| Rewrite content "for AI" (AEO/GEO) | AI understands synonyms and natural language |
| Seek inauthentic brand mentions | Spam systems detect and penalize this |
| Overfocus on structured data alone | Helpful but NOT required for AI features |
| Create separate pages for query variations | Violates scaled content abuse policy |
| Add special "AI-readable" Markdown files | Standard HTML is the input format |
| Use hidden text for AI consumption | Cloaking violation |
| Stuff keywords "for LLM training" | Spam — same old rules apply |
| Disallow AI crawlers (GPTBot, etc.) | Google uses Googlebot only — blocking others has no effect on Google AI |

---

## 8. Implementation Priorities

### Quick Wins (< 1 day each)

1. Add `cursor: pointer` CSS for all interactive elements
2. Add skip-to-content link to root layout
3. Verify no `nosnippet` directives on key pages
4. Check all forms have proper `<label>` associations
5. Verify heading hierarchy on top landing pages

### Medium Effort (1-3 days each)

1. Semantic HTML audit of all components (replace `<div onClick>`)
2. Author/expert page creation with Person schema
3. "About Our Data" / methodology page
4. Image alt text quality audit and improvement
5. Internal linking optimization

### High Effort (1+ week each)

1. Non-commodity content strategy and execution
2. Interactive tools (calculators, comparison widgets)
3. Comprehensive accessibility audit and remediation
4. E-E-A-T content enrichment across all page types
5. Video/media content creation

---

## 9. Audit Workflow

When asked to audit a site for AI optimization, follow this order:

1. **Technical baseline** — Verify indexing, SSR, canonical tags, Core Web Vitals
2. **Agent-friendly audit** — Run through Section 2 checklist on key templates
3. **E-E-A-T assessment** — Evaluate Section 3 for YMYL compliance
4. **Content quality** — Assess top pages against Section 4 criteria
5. **Structured data** — Validate existing schema, identify gaps
6. **Recommendations** — Prioritize by impact/effort ratio

---

## 10. Monitoring & Measurement

| Metric | Tool | What to Track |
|--------|------|---------------|
| AI Overview appearances | Google Search Console → Search Appearance | Citation frequency |
| Organic CTR from AI features | GSC filtered by AI appearance type | Click-through trends |
| Core Web Vitals | PageSpeed Insights / CrUX | All "Good" status |
| Structured data validity | Rich Results Test | 0 errors, 0 warnings |
| Accessibility score | Lighthouse CI | 95+ target |
| Index coverage | GSC → Indexing | No regressions |

---

## References

- [Google AI Optimization Guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Build Agent-Friendly Websites](https://web.dev/articles/ai-agent-site-ux)
- [Creating Helpful, Reliable, People-First Content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google Search Quality Rater Guidelines](https://services.google.com/fh/files/misc/hsw-sqrg.pdf)
- [Universal Commerce Protocol (UCP)](https://ucp.dev/latest/)
