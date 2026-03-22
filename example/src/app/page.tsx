"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HTTPError } from "hono-query-rpc";
import Link from "next/link";
import { useState } from "react";
import { CreatePostModal } from "@/components/CreatePostModal";
import { api } from "@/lib/client";
import type { Post } from "@/server/app";

function ErrorTester() {
  const [open, setOpen] = useState(false);
  const [badId, setBadId] = useState("");

  const notFoundQuery = useQuery({
    ...api.posts[":id"].$get.queryOptions({
      param: { id: "non-existent-id" },
    }),
    enabled: false,
    retry: false,
  });

  const deleteMutation = useMutation(
    api.posts[":id"].$delete.mutationOptions(),
  );

  const formatError = (err: Error) => {
    if (err instanceof HTTPError) {
      return `HTTPError ${err.status}: ${err.statusText}`;
    }
    return err.message;
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-8 w-full rounded-xl border border-dashed border-orange-300 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-600 hover:bg-orange-100 transition-colors"
      >
        ⚠ Error Testing Panel
      </button>
    );
  }

  return (
    <div className="mb-8 rounded-xl border border-orange-200 bg-orange-50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-orange-800 text-sm">
          Error Testing Panel
        </h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-orange-400 hover:text-orange-600"
        >
          닫기
        </button>
      </div>

      {/* Query error */}
      <div className="rounded-lg border border-orange-200 bg-white p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-700">
          Query Error — 없는 post 조회 (404)
        </p>
        <code className="block rounded bg-gray-50 px-2 py-1 text-xs text-gray-500">
          {
            'api.posts[":id"].$get.queryOptions({ param: { id: "non-existent-id" } })'
          }
        </code>
        <button
          type="button"
          onClick={() => notFoundQuery.refetch()}
          disabled={notFoundQuery.isFetching}
          className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {notFoundQuery.isFetching ? "Fetching…" : "Trigger Query Error"}
        </button>
        {notFoundQuery.error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            {formatError(notFoundQuery.error)}
          </p>
        )}
      </div>

      {/* Mutation error */}
      <div className="rounded-lg border border-orange-200 bg-white p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-700">
          Mutation Error — 없는 post 삭제
        </p>
        <code className="block rounded bg-gray-50 px-2 py-1 text-xs text-gray-500">
          {'api.posts[":id"].$delete.mutationOptions()'}
        </code>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Post ID (기본값: bad-id)"
            value={badId}
            onChange={(e) => setBadId(e.target.value)}
            className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-300"
          />
          <button
            type="button"
            onClick={() =>
              deleteMutation.mutate({ param: { id: badId || "bad-id" } })
            }
            disabled={deleteMutation.isPending}
            className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {deleteMutation.isPending ? "Deleting…" : "Trigger Mutation Error"}
          </button>
        </div>
        {deleteMutation.error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            {formatError(deleteMutation.error as Error)}
          </p>
        )}
      </div>
    </div>
  );
}

function PostCard({
  post,
  onDelete,
  isDeleting,
}: {
  post: Post;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const excerpt = post.content
    .slice(0, 160)
    .replace(/`{3}[\s\S]*?`{3}/g, "")
    .trim();

  return (
    <article className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Link href={`/posts/${post.id}`}>
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
              {post.title}
            </h2>
          </Link>
          <p className="mt-2 text-sm text-gray-500 line-clamp-3">
            {excerpt}...
          </p>
        </div>
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40 transition-colors"
          title="Delete post"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <title>Delete post</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
      <div className="mt-4 flex items-center gap-3 text-xs text-gray-400">
        <span className="font-medium text-gray-600">{post.author}</span>
        <span>·</span>
        <time dateTime={post.createdAt}>
          {new Date(post.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>
        <span className="ml-auto">
          <Link
            href={`/posts/${post.id}`}
            className="font-medium text-blue-600 hover:underline"
          >
            Read more →
          </Link>
        </span>
      </div>
    </article>
  );
}

export default function Home() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // --- hono-query-rpc: queryOptions ---
  const { data, isLoading, error } = useQuery(
    api.posts.$get.queryOptions({}),
  );

  // --- hono-query-rpc: mutationOptions + queryKey for invalidation ---
  const deleteMutation = useMutation(
    api.posts[":id"].$delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: api.posts.$get.queryKey(),
        });
        setDeletingId(null);
      },
    }),
  );

  const handleDelete = (id: string) => {
    setDeletingId(id);
    deleteMutation.mutate({ param: { id } });
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      {/* Hero */}
      <div className="mb-10 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Posts</h1>
          <p className="mt-1 text-gray-500">
            Built with{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs text-gray-700">
              hono-query-rpc
            </code>{" "}
            +{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs text-gray-700">
              TanStack Query
            </code>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          + New Post
        </button>
      </div>

      {/* Code snippet callout */}
      <div className="mb-8 rounded-xl bg-gray-900 px-5 py-4 text-xs leading-relaxed">
        <p className="mb-2 text-gray-400">
          {"// This page uses hono-query-rpc"}
        </p>
        <p>
          <span className="text-blue-400">useQuery</span>
          <span className="text-gray-300">(</span>
          <span className="text-green-400">api.posts.$get</span>
          <span className="text-gray-300">.</span>
          <span className="text-yellow-400">queryOptions</span>
          <span className="text-gray-300">())</span>
        </p>
        <p>
          <span className="text-blue-400">useMutation</span>
          <span className="text-gray-300">(</span>
          <span className="text-green-400">
            api.posts[&quot;:id&quot;].$delete
          </span>
          <span className="text-gray-300">.</span>
          <span className="text-yellow-400">mutationOptions</span>
          <span className="text-gray-300">())</span>
        </p>
      </div>

      <ErrorTester />

      {/* Post list */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-2xl bg-gray-200"
            />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
          Failed to load posts.
        </div>
      )}

      {data && (
        <div className="space-y-4">
          {data.posts.length === 0 ? (
            <p className="py-16 text-center text-gray-400">
              No posts yet. Create one!
            </p>
          ) : (
            data.posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onDelete={() => handleDelete(post.id)}
                isDeleting={deletingId === post.id}
              />
            ))
          )}
        </div>
      )}

      {showModal && (
        <CreatePostModal onCloseAction={() => setShowModal(false)} />
      )}
    </main>
  );
}
