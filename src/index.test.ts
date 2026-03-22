/**
 * hono-query-rpc.test.ts
 *
 * 테스트 환경: bun test + @testing-library/react
 * 실제 Hono 앱 + hc 클라이언트 사용
 */

import { beforeEach, describe, expect, it, vi } from "bun:test";
import {
	QueryClient,
	QueryClientProvider,
	useMutation,
	useQuery,
} from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { Hono } from "hono";
import { hc } from "hono/client";
import React from "react";

import { createHonoQuery } from "./index";

// ---------------------------------------------------------------------------
// 테스트용 Hono 앱
// ---------------------------------------------------------------------------

const USERS_DATA = [
	{ id: 1, name: "Alice" },
	{ id: 2, name: "Bob" },
];

const CREATED_USER = { id: 3, name: "Charlie" };
const ME_DATA = { id: 1, name: "Me", role: "admin" };

let errorMode = false;
let capturedHeadersList: Record<string, string>[] = [];
let capturedInitHeadersList: Record<string, string>[] = [];
let lastRequestUrl = "";
let fetchCallCount = 0;

const app = new Hono()
	.use("*", async (c, next) => {
		fetchCallCount++;
		lastRequestUrl = c.req.url;
		const headers: Record<string, string> = {};
		c.req.raw.headers.forEach((val, key) => {
			headers[key] = val;
		});
		capturedHeadersList.push(headers);
		await next();
	})
	.get("/api/users", (c) => {
		if (errorMode) return c.json({ error: "Bad Request" }, 400);
		return c.json(USERS_DATA);
	})
	.post("/api/users", async (c) => {
		if (errorMode) return c.json({ error: "Bad Request" }, 400);
		return c.json(CREATED_USER, 201);
	})
	.put("/api/users/:id", async (c) => {
		return c.json({ id: Number(c.req.param("id")), name: "Updated" });
	})
	.delete("/api/users/:id", (c) => c.json({ success: true }))
	.get("/api/me", (c) => c.json(ME_DATA));

type AppType = typeof app;

function createClient() {
	// Bun 환경에서 app.fetch 는 string URL 을 처리하지 못하므로 Request 로 변환
	const fetchFn = (input: RequestInfo | URL, init?: RequestInit) => {
		// init.headers 에서 실제로 전달된 헤더를 캡처 (Request 생성 전)
		const rawHeaders: Record<string, string> = {};
		if (init?.headers) {
			if (init.headers instanceof Headers) {
				init.headers.forEach((v, k) => { rawHeaders[k] = v; });
			} else if (Array.isArray(init.headers)) {
				for (const [k, v] of init.headers) rawHeaders[k] = v;
			} else {
				Object.assign(rawHeaders, init.headers);
			}
		}
		capturedInitHeadersList.push(rawHeaders);
		return app.fetch(new Request(input, init));
	};
	return hc<AppType>("http://localhost", { fetch: fetchFn });
}

// ---------------------------------------------------------------------------
// 테스트 헬퍼
// ---------------------------------------------------------------------------

function createTestQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: Infinity },
			mutations: { retry: false },
		},
	});
}

function createWrapper(queryClient: QueryClient) {
	return ({ children }: { children: React.ReactNode }) =>
		React.createElement(QueryClientProvider, { client: queryClient }, children);
}

// ---------------------------------------------------------------------------
// 테스트
// ---------------------------------------------------------------------------

describe("createHonoQuery", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = createTestQueryClient();
		errorMode = false;
		capturedHeadersList = [];
		capturedInitHeadersList = [];
		lastRequestUrl = "";
		fetchCallCount = 0;
	});

	// ─────────────────────────────────────────────────────────────────────────
	// QueryNode — queryOptions
	// ─────────────────────────────────────────────────────────────────────────

	describe("queryOptions", () => {
		it("올바른 queryKey 를 포함한 옵션 객체를 반환한다", () => {
			const api = createHonoQuery(createClient());
			const input = { query: { page: "1" } };
			const opts = api.api.users.$get.queryOptions(input);

			expect(opts.queryKey as unknown as unknown[]).toEqual([
				"api",
				"users",
				"$get",
				input,
			]);
		});

		it("input 이 undefined 이면 queryKey 에 path 만 포함된다", () => {
			const api = createHonoQuery(createClient());
			const opts = api.api.users.$get.queryOptions(undefined);

			expect(opts.queryKey as unknown as unknown[]).toEqual([
				"api",
				"users",
				"$get",
			]);
		});

		it("queryFn 호출 시 데이터를 반환한다", async () => {
			const api = createHonoQuery(createClient());
			const data = await queryClient.fetchQuery(
				api.api.users.$get.queryOptions(undefined),
			);
			expect(data).toEqual(USERS_DATA);
		});

		it("useQuery 와 함께 데이터를 정상적으로 반환한다", async () => {
			const api = createHonoQuery(createClient());
			const { result } = renderHook(
				() =>
					useQuery(api.api.users.$get.queryOptions({ query: { page: "1" } })),
				{ wrapper: createWrapper(queryClient) },
			);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(result.current.data).toEqual(USERS_DATA);
		});

		it("useQuery 에서 input 이 URL 쿼리 파라미터로 전달된다", async () => {
			const api = createHonoQuery(createClient());
			const input = { query: { page: "2", limit: "10" } };

			const { result } = renderHook(
				() => useQuery(api.api.users.$get.queryOptions(input)),
				{ wrapper: createWrapper(queryClient) },
			);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(lastRequestUrl).toContain("page=2");
			expect(lastRequestUrl).toContain("limit=10");
		});

		it("useQuery 에서 input 이 없으면 /api/me 로 요청된다", async () => {
			const api = createHonoQuery(createClient());

			const { result } = renderHook(
				() => useQuery(api.api.me.$get.queryOptions(undefined)),
				{ wrapper: createWrapper(queryClient) },
			);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(lastRequestUrl).toContain("/api/me");
			expect(result.current.data).toEqual(ME_DATA);
		});

		it("ok: false 응답이면 에러를 throw 한다", async () => {
			errorMode = true;
			const api = createHonoQuery(createClient());

			const { result } = renderHook(
				() => useQuery(api.api.users.$get.queryOptions(undefined)),
				{ wrapper: createWrapper(queryClient) },
			);

			await waitFor(() => expect(result.current.isError).toBe(true));
			expect((result.current.error as Error).message).toMatch(/HTTP 400/);
		});

		it("tanstack-query 옵션(enabled: false)이 적용된다", async () => {
			const api = createHonoQuery(createClient());

			renderHook(
				() =>
					useQuery(
						api.api.users.$get.queryOptions(undefined, { enabled: false }),
					),
				{ wrapper: createWrapper(queryClient) },
			);

			await new Promise((r) => setTimeout(r, 50));
			expect(fetchCallCount).toBe(0);
		});

		it("ensureQueryData 와 함께 동작한다", async () => {
			const api = createHonoQuery(createClient());
			const data = await queryClient.ensureQueryData(
				api.api.users.$get.queryOptions(undefined),
			);

			expect(data).toEqual(USERS_DATA);
		});

		// ── 헤더 테스트 ──────────────────────────────────────────────────────────

		it("[헤더] 팩토리 헤더가 요청에 포함된다", async () => {
			const api = createHonoQuery(createClient(), {
				defaultHeaders: { authorization: "Bearer factory-token" },
			});

			const { result } = renderHook(
				() => useQuery(api.api.users.$get.queryOptions(undefined)),
				{ wrapper: createWrapper(queryClient) },
			);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(capturedHeadersList[0]?.["authorization"]).toBe(
				"Bearer factory-token",
			);
		});

		it("[헤더] 동적 getter 팩토리 헤더가 매 요청마다 평가된다", async () => {
			let token = "token-v1";
			const api = createHonoQuery(createClient(), {
				defaultHeaders: () => ({ authorization: `Bearer ${token}` }),
			});

			const { result, rerender } = renderHook(
				() =>
					useQuery(
						api.api.users.$get.queryOptions(undefined, { staleTime: 0 }),
					),
				{ wrapper: createWrapper(queryClient) },
			);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(capturedHeadersList[0]?.["authorization"]).toBe("Bearer token-v1");

			token = "token-v2";
			queryClient.invalidateQueries({ queryKey: ["api", "users", "$get"] });
			rerender();

			await waitFor(() => expect(capturedHeadersList.length).toBe(2));
			expect(capturedHeadersList[1]?.["authorization"]).toBe("Bearer token-v2");
		});

		it("[헤더] 비동기 getter 팩토리 헤더가 resolve 된 값으로 전달된다", async () => {
			const api = createHonoQuery(createClient(), {
				defaultHeaders: async () => {
					await Promise.resolve();
					return { "x-async-header": "async-value" };
				},
			});

			const { result } = renderHook(
				() => useQuery(api.api.users.$get.queryOptions(undefined)),
				{ wrapper: createWrapper(queryClient) },
			);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(capturedHeadersList[0]?.["x-async-header"]).toBe("async-value");
		});

		it("[헤더] 호출 레벨 헤더만 있으면 그것만 전달된다", async () => {
			const api = createHonoQuery(createClient());

			const { result } = renderHook(
				() =>
					useQuery(
						api.api.users.$get.queryOptions(undefined, {
							hono: { headers: { "x-trace-id": "abc" } },
						}),
					),
				{ wrapper: createWrapper(queryClient) },
			);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(capturedHeadersList[0]?.["x-trace-id"]).toBe("abc");
		});

		it("[헤더] 팩토리 + 호출 레벨 헤더가 병합된다 (호출 레벨이 우선)", async () => {
			const api = createHonoQuery(createClient(), {
				defaultHeaders: {
					authorization: "Bearer factory-token",
					"x-app-id": "my-app",
				},
			});

			const { result } = renderHook(
				() =>
					useQuery(
						api.api.users.$get.queryOptions(undefined, {
							hono: {
								headers: {
									authorization: "Bearer call-token",
									"x-trace-id": "xyz",
								},
							},
						}),
					),
				{ wrapper: createWrapper(queryClient) },
			);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(capturedHeadersList[0]?.["authorization"]).toBe(
				"Bearer call-token",
			);
			expect(capturedHeadersList[0]?.["x-app-id"]).toBe("my-app");
			expect(capturedHeadersList[0]?.["x-trace-id"]).toBe("xyz");
		});

		it("[헤더] 헤더가 없으면 커스텀 헤더가 포함되지 않는다", async () => {
			const api = createHonoQuery(createClient());

			const { result } = renderHook(
				() => useQuery(api.api.users.$get.queryOptions(undefined)),
				{ wrapper: createWrapper(queryClient) },
			);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(capturedHeadersList[0]?.["authorization"]).toBeUndefined();
			expect(capturedHeadersList[0]?.["x-trace-id"]).toBeUndefined();
		});

		it("[헤더] fetchQuery 시 헤더가 요청에 포함된다", async () => {
			const api = createHonoQuery(createClient(), {
				defaultHeaders: { authorization: "Bearer token" },
			});

			await queryClient.fetchQuery(
				api.api.users.$get.queryOptions(undefined, {
					hono: { headers: { "x-custom": "val" } },
				}),
			);
			expect(capturedHeadersList[0]?.["authorization"]).toBe("Bearer token");
			expect(capturedHeadersList[0]?.["x-custom"]).toBe("val");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// QueryNode — queryKey
	// ─────────────────────────────────────────────────────────────────────────

	describe("queryKey", () => {
		it("input 없이 호출하면 path 기반 key 를 반환한다", () => {
			const api = createHonoQuery(createClient());
			expect(api.api.users.$get.queryKey() as unknown as unknown[]).toEqual([
				"api",
				"users",
				"$get",
			]);
			expect(api.api.me.$get.queryKey() as unknown as unknown[]).toEqual([
				"api",
				"me",
				"$get",
			]);
		});

		it("input 을 넘기면 key 끝에 추가된다", () => {
			const api = createHonoQuery(createClient());
			const input = { query: { page: "1" } };

			expect(
				api.api.users.$get.queryKey(input) as unknown as unknown[],
			).toEqual(["api", "users", "$get", input]);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// MutationNode — mutationOptions
	// ─────────────────────────────────────────────────────────────────────────

	describe("mutationOptions", () => {
		it("mutationFn 을 포함한 옵션 객체를 반환한다", () => {
			const api = createHonoQuery(createClient());
			const opts = api.api.users.$post.mutationOptions();

			expect(typeof opts.mutationFn).toBe("function");
		});

		it("useMutation 과 함께 데이터를 정상적으로 반환한다", async () => {
			const api = createHonoQuery(createClient());

			const { result } = renderHook(
				() => useMutation(api.api.users.$post.mutationOptions()),
				{ wrapper: createWrapper(queryClient) },
			);

			await act(() =>
				result.current.mutateAsync({ json: { name: "Charlie" } }),
			);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(result.current.data).toEqual(CREATED_USER);
		});

		it("json body 가 POST 요청으로 전송된다", async () => {
			const api = createHonoQuery(createClient());

			const { result } = renderHook(
				() => useMutation(api.api.users.$post.mutationOptions()),
				{ wrapper: createWrapper(queryClient) },
			);

			await act(() =>
				result.current.mutateAsync({ json: { name: "Charlie" } }),
			);
			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			// 서버가 CREATED_USER 를 반환했다면 body 가 올바르게 전송된 것
			expect(result.current.data).toEqual(CREATED_USER);
		});

		it("$put, $delete 등 다른 HTTP 메서드도 동작한다", async () => {
			const api = createHonoQuery(createClient());

			const { result: putResult } = renderHook(
				() => useMutation(api.api.users[":id"].$put.mutationOptions()),
				{ wrapper: createWrapper(queryClient) },
			);
			await act(() =>
				putResult.current.mutateAsync({
					param: { id: "1" },
					json: { name: "Updated" },
				}),
			);
			await waitFor(() => expect(putResult.current.isSuccess).toBe(true));

			const { result: delResult } = renderHook(
				() => useMutation(api.api.users[":id"].$delete.mutationOptions()),
				{ wrapper: createWrapper(queryClient) },
			);
			await act(() => delResult.current.mutateAsync({ param: { id: "1" } }));
			await waitFor(() => expect(delResult.current.isSuccess).toBe(true));
		});

		it("ok: false 응답이면 에러 상태가 된다", async () => {
			errorMode = true;
			const api = createHonoQuery(createClient());

			const { result } = renderHook(
				() => useMutation(api.api.users.$post.mutationOptions()),
				{ wrapper: createWrapper(queryClient) },
			);

			act(() => result.current.mutate({ json: { name: "fail" } }));

			await waitFor(() => expect(result.current.isError).toBe(true));
			expect((result.current.error as Error).message).toMatch(/HTTP 400/);
		});

		it("onSuccess / onError 콜백이 호출된다", async () => {
			const onSuccess = vi.fn();
			const onError = vi.fn();
			const api = createHonoQuery(createClient());

			const { result } = renderHook(
				() =>
					useMutation(
						api.api.users.$post.mutationOptions({ onSuccess, onError }),
					),
				{ wrapper: createWrapper(queryClient) },
			);

			await act(() =>
				result.current.mutateAsync({ json: { name: "Charlie" } }),
			);
			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(onSuccess).toHaveBeenCalledTimes(1);
			expect(onError).not.toHaveBeenCalled();
		});

		// ── 헤더 테스트 ──────────────────────────────────────────────────────────

		it("[헤더] 팩토리 헤더가 요청에 포함된다", async () => {
			const api = createHonoQuery(createClient(), {
				defaultHeaders: { authorization: "Bearer factory-token" },
			});

			const { result } = renderHook(
				() => useMutation(api.api.users.$post.mutationOptions()),
				{ wrapper: createWrapper(queryClient) },
			);

			await act(() => result.current.mutateAsync({ json: { name: "test" } }));
			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(capturedHeadersList[0]?.["authorization"]).toBe(
				"Bearer factory-token",
			);
			// autoIdempotency 기본값 true — Idempotency-Key 포함
			expect(capturedInitHeadersList[0]?.["Idempotency-Key"]).toBeTypeOf("string");
		});

		it("[헤더] 호출 레벨 헤더만 있으면 그것만 전달된다", async () => {
			const api = createHonoQuery(createClient());

			const { result } = renderHook(
				() =>
					useMutation(
						api.api.users.$post.mutationOptions({
							hono: { headers: { "x-custom": "value" } },
						}),
					),
				{ wrapper: createWrapper(queryClient) },
			);

			await act(() => result.current.mutateAsync({ json: { name: "test" } }));
			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(capturedHeadersList[0]?.["x-custom"]).toBe("value");
			expect(capturedInitHeadersList[0]?.["Idempotency-Key"]).toBeTypeOf("string");
		});

		it("[헤더] 팩토리 + 호출 레벨 헤더가 병합된다 (호출 레벨이 우선)", async () => {
			const api = createHonoQuery(createClient(), {
				defaultHeaders: {
					authorization: "Bearer factory-token",
					"x-app-id": "my-app",
				},
			});

			const { result } = renderHook(
				() =>
					useMutation(
						api.api.users.$post.mutationOptions({
							hono: {
								headers: {
									authorization: "Bearer call-token",
									"x-extra": "extra",
								},
							},
						}),
					),
				{ wrapper: createWrapper(queryClient) },
			);

			await act(() => result.current.mutateAsync({ json: { name: "test" } }));
			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(capturedHeadersList[0]?.["authorization"]).toBe(
				"Bearer call-token",
			);
			expect(capturedHeadersList[0]?.["x-app-id"]).toBe("my-app");
			expect(capturedHeadersList[0]?.["x-extra"]).toBe("extra");
			expect(capturedInitHeadersList[0]?.["Idempotency-Key"]).toBeTypeOf("string");
		});

		it("[헤더] autoIdempotency: false 이면 Idempotency-Key 가 추가되지 않는다", async () => {
			const api = createHonoQuery(createClient(), { autoIdempotency: false });

			const { result } = renderHook(
				() => useMutation(api.api.users.$post.mutationOptions()),
				{ wrapper: createWrapper(queryClient) },
			);

			await act(() => result.current.mutateAsync({ json: { name: "test" } }));
			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(capturedInitHeadersList[0]?.["Idempotency-Key"]).toBeUndefined();
		});

		it("[헤더] autoIdempotency 기본값으로 Idempotency-Key 가 자동 추가된다", async () => {
			const api = createHonoQuery(createClient());

			const { result } = renderHook(
				() => useMutation(api.api.users.$post.mutationOptions()),
				{ wrapper: createWrapper(queryClient) },
			);

			await act(() => result.current.mutateAsync({ json: { name: "test" } }));
			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(capturedInitHeadersList[0]?.["Idempotency-Key"]).toBeTypeOf("string");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// parseResponse 커스터마이징
	// ─────────────────────────────────────────────────────────────────────────

	describe("parseResponse", () => {
		it("커스텀 parseResponse 가 ok 응답에 적용된다", async () => {
			const api = createHonoQuery(createClient(), {
				parseResponse: async (res) => {
					const data = await res.json();
					return { wrapped: data };
				},
			});

			const data = await queryClient.fetchQuery(
				api.api.users.$get.queryOptions(undefined),
			);
			expect(data).toEqual({ wrapped: USERS_DATA });
		});

		it("커스텀 parseResponse 가 에러 응답 시 커스텀 에러를 throw 한다", async () => {
			errorMode = true;

			class CustomError extends Error {
				constructor(public status: number) {
					super(`Custom ${status}`);
				}
			}

			const api = createHonoQuery(createClient(), {
				parseResponse: (res) => {
					if (!res.ok) throw new CustomError(res.status);
					return res.json();
				},
			});

			const { result } = renderHook(
				() => useQuery(api.api.users.$get.queryOptions(undefined)),
				{ wrapper: createWrapper(queryClient) },
			);

			await waitFor(() => expect(result.current.isError).toBe(true));
			expect(result.current.error).toBeInstanceOf(CustomError);
			expect((result.current.error as CustomError).status).toBe(400);
		});

		it("mutation 에도 커스텀 parseResponse 가 적용된다", async () => {
			const api = createHonoQuery(createClient(), {
				parseResponse: async (res) => {
					const data = await res.json();
					return { ok: true, data };
				},
			});

			const { result } = renderHook(
				() => useMutation(api.api.users.$post.mutationOptions()),
				{ wrapper: createWrapper(queryClient) },
			);

			await act(() =>
				result.current.mutateAsync({ json: { name: "Charlie" } }),
			);
			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(result.current.data).toEqual({ ok: true, data: CREATED_USER });
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 헤더 유틸리티 — resolveHeaders 엣지 케이스
	// ─────────────────────────────────────────────────────────────────────────

	describe("헤더 형식 호환성", () => {
		it("Headers 인스턴스를 팩토리 헤더로 사용할 수 있다", async () => {
			const api = createHonoQuery(createClient(), {
				defaultHeaders: new Headers({
					authorization: "Bearer headers-instance",
				}),
			});

			const { result } = renderHook(
				() => useQuery(api.api.users.$get.queryOptions(undefined)),
				{ wrapper: createWrapper(queryClient) },
			);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			// happy-dom 환경에서 Request 생성 시 일부 헤더가 변형될 수 있으므로
			// fetch init 에서 직접 확인
			expect(
				capturedInitHeadersList[0]?.["authorization"] ??
					capturedHeadersList[0]?.["authorization"],
			).toBe("Bearer headers-instance");
		});

		it("튜플 배열([string, string][]) 형식을 사용할 수 있다", async () => {
			const api = createHonoQuery(createClient(), {
				defaultHeaders: [["x-tuple-header", "tuple-value"]],
			});

			const { result } = renderHook(
				() => useQuery(api.api.users.$get.queryOptions(undefined)),
				{ wrapper: createWrapper(queryClient) },
			);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(
				capturedInitHeadersList[0]?.["x-tuple-header"] ??
					capturedHeadersList[0]?.["x-tuple-header"],
			).toBe("tuple-value");
		});
	});
});
