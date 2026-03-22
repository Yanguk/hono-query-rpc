export type {
	HeadersFactory,
	HonoQueryClient,
	HonoQueryFactoryOptions,
	MutationCallOptions,
	MutationNode,
	QueryCallOptions,
	QueryNode,
} from "./types";

import { createProxy } from "./proxy";
import type { HonoQueryClient, HonoQueryFactoryOptions } from "./types";

/**
 * Hono RPC 클라이언트를 TanStack Query options 기반 클라이언트로 감쌉니다.
 *
 * @param client  hc<AppType>(baseUrl) 로 생성한 Hono RPC 클라이언트
 * @param options 팩토리 공통 옵션 (기본 헤더 등)
 *
 * @example
 * // lib/api.ts
 * import { hc } from 'hono/client'
 * import { createHonoQuery } from 'hono-query-rpc'
 * import type { AppType } from '@/server'
 *
 * const client = hc<AppType>('/')
 *
 * export const api = createHonoQuery(client, {
 *   defaultHeaders: () => ({
 *     'Authorization': 'Bearer your-access-token',
 *     'Content-Type': 'application/json',
 *   }),
 *   autoIdempotency: true,
 * })
 *
 * // ── 컴포넌트 ──────────────────────────────────────────────────────────────
 *
 * // GET
 * const { data } = useQuery(api.users.$get.queryOptions({ query: { page: '1' } }))
 *
 * // POST
 * const create = useMutation(api.users.$post.mutationOptions({
 *   hono: {
 *      headers: {
 *        'Authorization': 'Bearer your-access-token',
 *        'Content-Type': 'application/json',
 *        'X-Request-Id': 'req-123456',
 *      },
 *   },
 *   onSuccess: () => queryClient.invalidateQueries({
 *     queryKey: api.users.$get.queryKey(),
 *   }),
 * }))
 * create.mutate({ json: { name: 'foo' } })
 *
 */
export function createHonoQuery<T extends object>(
	client: T,
	options?: HonoQueryFactoryOptions,
): HonoQueryClient<T> {
	return createProxy(() => client, [], options ?? {}) as HonoQueryClient<T>;
}
