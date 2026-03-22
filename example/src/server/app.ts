import { Hono } from "hono";

export type Post = {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
};

// In-memory storage (resets on server restart — use a real DB in production)
const posts: Post[] = [
  {
    id: "1",
    title: "Getting Started with Hono RPC",
    content: `Hono is a fast, lightweight web framework for the Edge. One of its killer features is the RPC client — a fully type-safe way to call your API from the frontend.

With Hono RPC, you define your routes on the server and get a typed client for free. No code generation, no schema files. Just TypeScript.

\`\`\`ts
const app = new Hono()
  .get("/posts", (c) => c.json({ posts }))

const client = hc<typeof app>("/")
const res = await client.posts.$get()
\`\`\`

Combine this with hono-query-rpc and you get TanStack Query integration with zero boilerplate.`,
    author: "Alice Kim",
    createdAt: "2025-12-01T10:00:00.000Z",
  },
  {
    id: "2",
    title: "TanStack Query: Beyond useQuery",
    content: `Most developers start with \`useQuery\` and \`useMutation\`, but TanStack Query has much more to offer.

**Query Keys** are the backbone of the cache. Structuring them well lets you do precise invalidations:

\`\`\`ts
// Invalidate all post queries
queryClient.invalidateQueries({ queryKey: ["posts"] })

// Invalidate a specific post
queryClient.invalidateQueries({ queryKey: ["posts", id] })
\`\`\`

With hono-query-rpc, your query keys are automatically derived from your API structure, so you never have to manage them manually again.`,
    author: "Bob Park",
    createdAt: "2025-12-10T10:00:00.000Z",
  },
  {
    id: "3",
    title: "Why hono-query-rpc?",
    content: `tRPC is great, but if you're already using Hono, switching to tRPC means rewriting your entire API layer.

hono-query-rpc takes a different approach: it wraps your existing Hono RPC client with TanStack Query primitives. You keep your Hono routes exactly as they are and get \`queryOptions\` and \`mutationOptions\` for free.

\`\`\`ts
const api = createHonoQuery(hc<AppType>("/"))

// In your component:
useQuery(api.posts.$get.queryOptions())
useMutation(api.posts.$post.mutationOptions())
\`\`\`

That's it. Type-safe, cache-aware, zero boilerplate.`,
    author: "Charlie Lee",
    createdAt: "2025-12-20T10:00:00.000Z",
  },
];

const postsRoute = new Hono()
  .get("/", (c) => c.json({ posts }))
  .get("/:id", (c) => {
    const post = posts.find((p) => p.id === c.req.param("id"));
    if (!post) return c.json({ error: "Post not found" }, 404);
    return c.json({ post });
  })
  .post("/", async (c) => {
    const body = await c.req.json<{
      title: string;
      content: string;
      author: string;
    }>();
    const post: Post = {
      id: crypto.randomUUID(),
      title: body.title,
      content: body.content,
      author: body.author,
      createdAt: new Date().toISOString(),
    };
    posts.push(post);
    return c.json({ post }, 201);
  })
  .delete("/:id", (c) => {
    const idx = posts.findIndex((p) => p.id === c.req.param("id"));
    if (idx === -1) return c.json({ error: "Post not found" }, 404);
    const [deleted] = posts.splice(idx, 1);
    return c.json({ post: deleted });
  });

const app = new Hono().basePath("/api").route("/posts", postsRoute);

export type AppType = typeof app;
export { app };
