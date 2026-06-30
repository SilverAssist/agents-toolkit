---
applyTo: "**/*.tsx"
---
# SEO & AI Optimization Patterns

These rules ensure components are optimized for Google's generative AI features (AI Overviews, AI
Mode) and browser-agent interactions: agent-friendly HTML, a clean accessibility tree, semantic
structure, and E-E-A-T signals. Pairs with the `ai-seo-optimization` skill and the `audit-ai-seo`
prompt.

---

## Semantic HTML (CRITICAL)

### Interactive Elements

**NEVER use `<div>` or `<span>` with click handlers. Use proper semantic elements.**

```tsx
// ✅ CORRECT: Semantic button
<button onClick={handleClick} type="button">
  Click me
</button>

// ✅ CORRECT: Navigation link
<Link href="/page">Go to page</Link>

// ❌ WRONG: Non-semantic clickable div
<div onClick={handleClick} className="cursor-pointer">
  Click me
</div>

// ❌ WRONG: Span with role hack
<span role="button" onClick={handleClick}>
  Click me
</span>
```

### Form Inputs

**Every input MUST have an associated label. Placeholder is NOT a substitute.**

```tsx
// ✅ CORRECT: Label with htmlFor
<label htmlFor="email">Email address</label>
<input id="email" name="email" type="email" required aria-required="true" />

// ✅ CORRECT: Wrapped label (implicit association)
<label>
  Email address
  <input name="email" type="email" required />
</label>

// ❌ WRONG: Placeholder only (invisible to accessibility tree)
<input placeholder="Enter your email" type="email" />

// ❌ WRONG: aria-label without visible label (poor for agents)
<input aria-label="Email" type="email" />
```

### Heading Hierarchy

**Headings must follow logical order. Never skip levels.**

```tsx
// ✅ CORRECT: Proper hierarchy
<h1>Page Title</h1>
<section>
  <h2>Section Title</h2>
  <h3>Subsection</h3>
</section>

// ❌ WRONG: Skipping h2
<h1>Page Title</h1>
<h3>Subsection</h3>

// ❌ WRONG: Using heading for styling only
<h4 className="text-sm font-bold">Small bold text</h4>  // Use <p> with classes instead
```

### Lists

```tsx
// ✅ CORRECT: Semantic list
<ul>
  {items.map(item => <li key={item.id}>{item.name}</li>)}
</ul>

// ❌ WRONG: Div-based list
<div className="flex flex-col gap-2">
  {items.map(item => <div key={item.id}>{item.name}</div>)}
</div>
```

---

## Accessibility for AI Agents

### Skip-to-Content Link

The root layout MUST include a skip-to-content link as the first focusable element:

```tsx
<body>
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground"
  >
    Skip to main content
  </a>
  {/* Header/Navigation */}
  <main id="main-content">
    {children}
  </main>
</body>
```

### Accessible Names

All interactive elements MUST have an accessible name:

```tsx
// ✅ CORRECT: Button with text content (name from content)
<button>Submit form</button>

// ✅ CORRECT: Icon button with aria-label
<button aria-label="Close dialog">
  <XIcon className="h-4 w-4" />
</button>

// ❌ WRONG: Icon button without accessible name
<button>
  <XIcon className="h-4 w-4" />
</button>
```

### Image Alt Text

```tsx
// ✅ CORRECT: Descriptive alt text
<Image alt="Two-story brick building with a landscaped courtyard entrance" src={src} />

// ✅ CORRECT: Decorative image (empty alt)
<Image alt="" src={decorativeBg} aria-hidden="true" />

// ❌ WRONG: Generic alt text
<Image alt="photo" src={src} />
<Image alt="image 1" src={src} />

// ❌ WRONG: Missing alt
<Image src={src} />
```

---

## Metadata & SEO

### generateMetadata Pattern

Every page with dynamic content MUST implement `generateMetadata`:

```tsx
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getData(slug);
  if (!data) return {};

  return {
    title: data.title,
    description: data.description,
    openGraph: {
      title: data.title,
      description: data.description,
      images: data.image ? [{ url: data.image }] : undefined,
    },
    alternates: {
      canonical: getCanonicalUrl(slug),
    },
  };
}
```

### No Snippet Blocking

**NEVER add `nosnippet` to content pages.** This prevents AI feature inclusion:

```tsx
// ❌ WRONG: Blocks AI features
export const metadata = {
  robots: { index: true, follow: true, nosnippet: true },
};

// ✅ CORRECT: Allow snippets (default behavior)
export const metadata = {
  robots: { index: true, follow: true },
};
```

---

## Structured Data (JSON-LD)

### Implementation Pattern

Use a dedicated JSON-LD component in layout components:

```tsx
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```

### Required Schema by Page Type

| Page Type | Required Schema |
|-----------|----------------|
| Homepage | `Organization`, `WebSite` with `SearchAction` |
| Local business / Location | `LocalBusiness` with address, geo, rating |
| Blog Post | `Article` with author (`Person`), dates |
| Author Page | `Person` with credentials, `knowsAbout` |
| FAQ Section | `FAQPage` with Q&A pairs |
| All Pages | `BreadcrumbList` |

---

## Layout Stability (CLS Prevention)

```tsx
// ✅ CORRECT: Explicit dimensions prevent layout shift
<Image src={src} alt="..." width={800} height={600} />

// ✅ CORRECT: Aspect ratio container
<div className="aspect-video relative">
  <Image src={src} alt="..." fill className="object-cover" />
</div>

// ❌ WRONG: No dimensions (causes layout shift)
<img src={src} alt="..." />
```

---

## Server-Side Rendering

**Critical content MUST render on the server.** Client Components should only wrap interactive UI, not content:

```tsx
// ✅ CORRECT: Content in Server Component
export default async function DetailPage({ params }: Props) {
  const item = await getItem(params.slug);
  return (
    <main id="main-content">
      <h1>{item.name}</h1>
      <p>{item.description}</p>
      <ContactForm itemId={item.id} /> {/* Client Component for form only */}
    </main>
  );
}

// ❌ WRONG: Entire page as Client Component
"use client";
export default function DetailPage() {
  const [item, setItem] = useState(null);
  useEffect(() => { fetchItem().then(setItem); }, []);
  // Content invisible to crawlers until JS executes
}
```
