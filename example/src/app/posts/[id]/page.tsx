"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HTTPError } from "hono-query-rpc";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/client";

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  // --- hono-query-rpc: queryOptions with param ---
  const { data, isLoading, error } = useQuery(
    api.posts[":id"].$get.queryOptions({ param: { id } }),
  );

  // --- hono-query-rpc: mutationOptions ---
  const deleteMutation = useMutation(
    api.posts[":id"].$delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: api.posts.$get.queryKey(),
        });
        router.push("/");
      },
    }),
  );

  if (isLoading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="h-8 w-1/3 animate-pulse rounded bg-gray-200 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-gray-200" style={{ width: `${90 - i * 5}%` }} />
          ))}
        </div>
      </main>
    );
  }

  if (error) {
    const is404 = error instanceof HTTPError && error.status === 404;
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link href="/" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          ← All posts
        </Link>
        <div className="rounded-xl bg-red-50 p-8 text-center">
          <p className="text-lg font-medium text-red-700">
            {is404 ? "Post not found" : "Failed to load post"}
          </p>
          <p className="mt-1 text-sm text-red-500">
            {is404
              ? "This post may have been deleted."
              : "Please try again later."}
          </p>
        </div>
      </main>
    );
  }

  if (!data || !("post" in data)) return null;
  const post = data.post;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        ← All posts
      </Link>

      <article>
        <header className="mb-8">
          <h1 className="text-3xl font-bold leading-tight text-gray-900">
            {post.title}
          </h1>
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
            <span className="font-medium text-gray-700">{post.author}</span>
            <span>·</span>
            <time dateTime={post.createdAt}>
              {new Date(post.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          </div>
        </header>

        {/* Code snippet callout */}
        <div className="mb-8 rounded-xl bg-gray-900 px-5 py-4 text-xs leading-relaxed">
          <p className="mb-2 text-gray-400">{"// This page uses hono-query-rpc"}</p>
          <p>
            <span className="text-blue-400">useQuery</span>
            <span className="text-gray-300">(</span>
            <span className="text-green-400">api.posts[&quot;:id&quot;].$get</span>
            <span className="text-gray-300">.</span>
            <span className="text-yellow-400">queryOptions</span>
            <span className="text-gray-300">{"({ param: { id } })"}</span>
            <span className="text-gray-300">)</span>
          </p>
        </div>

        <div className="prose prose-gray max-w-none">
          {post.content.split("\n\n").map((paragraph: string) => {
            if (paragraph.startsWith("```")) {
              const code = paragraph.replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
              return (
                <pre
                  key={paragraph.slice(0, 32)}
                  className="my-4 overflow-x-auto rounded-xl bg-gray-900 px-5 py-4 text-xs text-gray-200 leading-relaxed"
                >
                  <code>{code}</code>
                </pre>
              );
            }
            if (paragraph.startsWith("**") && paragraph.endsWith("**")) {
              return (
                <p key={paragraph.slice(0, 32)} className="mt-6 mb-2 font-semibold text-gray-900">
                  {paragraph.slice(2, -2)}
                </p>
              );
            }
            return (
              <p key={paragraph.slice(0, 32)} className="mt-4 text-gray-700 leading-relaxed">
                {paragraph}
              </p>
            );
          })}
        </div>
      </article>

      <div className="mt-12 flex items-center justify-between border-t border-gray-200 pt-6">
        <Link
          href="/"
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          ← Back to all posts
        </Link>
        <button
          type="button"
          onClick={() => deleteMutation.mutate({ param: { id } })}
          disabled={deleteMutation.isPending}
          className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <title>Delete post</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          {deleteMutation.isPending ? "Deleting..." : "Delete post"}
        </button>
      </div>
    </main>
  );
}
