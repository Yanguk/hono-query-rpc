# hono-query-rpc Blog Example

A minimal blog app demonstrating `hono-query-rpc` with Next.js 15 App Router.

## What it shows

| Feature | Where |
|---|---|
| `queryOptions()` | `app/page.tsx` — fetch all posts |
| `queryOptions({ param })` | `app/posts/[id]/page.tsx` — fetch single post |
| `mutationOptions()` | `components/CreatePostModal.tsx` — create post |
| `mutationOptions()` | `app/page.tsx` + `app/posts/[id]/page.tsx` — delete post |
| `queryKey()` invalidation | after create/delete mutations |
| `HTTPError` handling | 404 on post detail page |

## Getting started

```bash
# 1. Build the library first (from repo root)
cd ..
bun run build

# 2. Install example deps
cd example
bun install

# 3. Run
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

- **Next.js 15** — App Router, `[[...route]]` catch-all API
- **Hono** — API routes via `hono/vercel` adapter
- **TanStack Query v5** — data fetching & caching
- **hono-query-rpc** — bridge between Hono RPC client and TanStack Query
- **Tailwind CSS v4** — styling
