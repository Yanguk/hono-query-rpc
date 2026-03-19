/**
 * hono-query-rpc
 *
 * Hono RPC + TanStack Query 통합 유틸리티
 * TanStack Query의 queryOptions / mutationOptions 패턴으로 사용합니다.
 *
 * 사용 예시:
 *   import { hc } from 'hono/client'
 *   import { useQuery, useMutation } from '@tanstack/react-query'
 *   import type { AppType } from '@/server'
 *   import { createHonoQuery } from 'hono-query-rpc'
 *
 *   const client = hc<AppType>('/')
 *
 *   export const api = createHonoQuery(client, {
 *     headers: () => ({ authorization: `Bearer ${getToken()}` }),
 *   })
 *
 *   // 컴포넌트 내부
 *   const { data } = useQuery(api.users.$get.queryOptions({ query: { page: '1' } }))
 *   const mutation = useMutation(api.users.$post.mutationOptions({
 *     onSuccess: () => invalidate(),
 *   }))
 *
 *   // 라우터 loader (React 외부)
 *   await queryClient.prefetchQuery(
 *     api.users.$get.queryOptions({ query: { page: '1' } })
 *   )
 */

import {
  useQueryClient,
  queryOptions as tsQueryOptions,
  type UseQueryOptions,
  type UseMutationOptions,
  type QueryKey,
} from '@tanstack/react-query'

// ---------------------------------------------------------------------------
// 내부 타입 헬퍼
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any

type InferOutput<TFn extends AnyFn> =
  Awaited<ReturnType<TFn>> extends { json(): Promise<infer R> } ? R : never

type InferInput<TFn extends AnyFn> =
  Parameters<TFn>[0] extends undefined ? undefined : Parameters<TFn>[0]

type GetKeys      = '$get'
type MutationKeys = '$post' | '$put' | '$patch' | '$delete'

// ---------------------------------------------------------------------------
// 헤더 타입
// ---------------------------------------------------------------------------

/**
 * 정적 헤더 객체 또는 동적으로 반환하는 (async) getter 함수.
 *
 * @example
 * // 정적
 * headers: { 'x-api-key': 'secret' }
 *
 * // 동적 (zustand store, cookie 등)
 * headers: () => ({ authorization: `Bearer ${useAuthStore.getState().token}` })
 *
 * // 비동기 동적
 * headers: async () => ({ authorization: `Bearer ${await getToken()}` })
 */
export type HeadersFactory =
  | HeadersInit
  | (() => HeadersInit | Promise<HeadersInit>)

/** createHonoQuery 팩토리 옵션 */
export interface HonoQueryFactoryOptions {
  /** 모든 요청에 자동으로 병합되는 기본 헤더 */
  headers?: HeadersFactory
}

/** queryOptions 호출 레벨 옵션 */
export interface QueryCallOptions<TData>
  extends Omit<UseQueryOptions<TData>, 'queryKey' | 'queryFn'> {
  /** 이 호출에만 적용되는 추가 헤더 (팩토리 헤더에 병합됨) */
  headers?: HeadersInit
}

/** mutationOptions 호출 레벨 옵션 */
export interface MutationCallOptions<TData, TInput>
  extends Omit<UseMutationOptions<TData, Error, TInput>, 'mutationFn'> {
  /** 이 뮤테이션에만 적용되는 추가 헤더 (팩토리 헤더에 병합됨) */
  headers?: HeadersInit
}

// ---------------------------------------------------------------------------
// 퍼블릭 인터페이스 타입
// ---------------------------------------------------------------------------

export interface QueryNode<TFn extends AnyFn> {
  /**
   * queryOptions 팩토리 — useQuery / prefetch / ensureQueryData 와 함께 사용
   * @example
   * const { data } = useQuery(api.users.$get.queryOptions({ query: { page: '1' } }))
   *
   * // 라우터 loader
   * await queryClient.prefetchQuery(api.users.$get.queryOptions({ query: { page: '1' } }))
   *
   * // 헤더 추가
   * useQuery(api.users.$get.queryOptions(input, { headers: { 'x-trace-id': '123' } }))
   */
  queryOptions(
    input: InferInput<TFn>,
    options?: QueryCallOptions<InferOutput<TFn>>,
  ): ReturnType<typeof tsQueryOptions<InferOutput<TFn>>>

  /**
   * queryKey 반환 — 수동 invalidate 등에 사용
   * @example
   * queryClient.invalidateQueries({ queryKey: api.users.$get.queryKey() })
   */
  queryKey(input?: InferInput<TFn>): QueryKey

  /**
   * useInvalidate 훅 — 캐시 무효화 함수 반환
   * @example
   * const invalidate = api.users.$get.useInvalidate()
   * await invalidate()
   */
  useInvalidate(): (input?: InferInput<TFn>) => Promise<void>
}

export interface MutationNode<TFn extends AnyFn> {
  /**
   * mutationOptions 팩토리 — useMutation 과 함께 사용
   * @example
   * const mutation = useMutation(api.users.$post.mutationOptions({
   *   onSuccess: () => invalidate(),
   * }))
   * mutation.mutate({ json: { name: 'foo' } })
   *
   * // 헤더 추가
   * useMutation(api.users.$post.mutationOptions({
   *   headers: { 'x-custom': 'value' },
   * }))
   */
  mutationOptions(
    options?: MutationCallOptions<InferOutput<TFn>, InferInput<TFn>>,
  ): UseMutationOptions<InferOutput<TFn>, Error, InferInput<TFn>>
}

export type HonoQueryClient<T> = {
  [K in keyof T]: K extends GetKeys
    ? T[K] extends AnyFn
      ? QueryNode<T[K]>
      : never
    : K extends MutationKeys
    ? T[K] extends AnyFn
      ? MutationNode<T[K]>
      : never
    : HonoQueryClient<T[K]>
}

// ---------------------------------------------------------------------------
// 헤더 유틸리티
// ---------------------------------------------------------------------------

function headersToObject(h?: HeadersInit): Record<string, string> {
  if (!h) return {}
  if (h instanceof Headers) return Object.fromEntries(h.entries())
  if (Array.isArray(h)) return Object.fromEntries(h)
  return h as Record<string, string>
}

/**
 * 팩토리 기본 헤더 + 호출 레벨 헤더를 병합하여 반환합니다.
 * 우선순위: 팩토리 < 호출 레벨
 */
async function resolveHeaders(
  factory?: HeadersFactory,
  perCall?: HeadersInit,
): Promise<Record<string, string> | undefined> {
  const base   = typeof factory === 'function' ? await factory() : factory
  const merged = {
    ...headersToObject(base),
    ...headersToObject(perCall),
  }
  return Object.keys(merged).length > 0 ? merged : undefined
}

// ---------------------------------------------------------------------------
// 내부 구현
// ---------------------------------------------------------------------------

const TERMINAL_KEYS = new Set([
  'queryOptions',
  'queryKey',
  'useInvalidate',
  'mutationOptions',
])

async function callAndParse(
  fn: AnyFn,
  input: unknown,
  headers?: Record<string, string>,
): Promise<unknown> {
  // Hono RPC 두 번째 인자: ClientRequestOptions = { headers?, init? }
  const res = await fn(input, headers ? { headers } : undefined)
  if (!res.ok) {
    throw new Error(`[hono-query] HTTP ${res.status}: ${res.statusText}`)
  }
  return res.json()
}

function buildQueryKey(path: string[], input: unknown): QueryKey {
  return input !== undefined ? [...path, input] : path
}

function makeQueryNode(
  getClientFn: () => AnyFn,
  path: string[],
  factoryHeaders?: HeadersFactory,
): QueryNode<AnyFn> {
  return {
    queryOptions(input, options) {
      const { headers: perCallHeaders, ...restOptions } = options ?? {}
      return tsQueryOptions({
        queryKey: buildQueryKey(path, input),
        queryFn: async () => {
          const h = await resolveHeaders(factoryHeaders, perCallHeaders)
          return callAndParse(getClientFn(), input, h)
        },
        ...restOptions,
      } as UseQueryOptions)
    },

    queryKey(input) {
      return buildQueryKey(path, input)
    },

    useInvalidate() {
      const queryClient = useQueryClient()
      return async (input) => {
        await queryClient.invalidateQueries({ queryKey: buildQueryKey(path, input) })
      }
    },
  }
}

function makeMutationNode(
  getClientFn: () => AnyFn,
  factoryHeaders: HeadersFactory | undefined,
): MutationNode<AnyFn> {
  return {
    mutationOptions(options) {
      const { headers: perCallHeaders, ...restOptions } = options ?? {}
      return {
        mutationFn: async (input: unknown) => {
          const h = await resolveHeaders(factoryHeaders, perCallHeaders)
          return callAndParse(getClientFn(), input, h)
        },
        ...restOptions,
      } as UseMutationOptions
    },
  }
}

function createProxy(
  getNode: () => unknown,
  path: string[],
  factoryHeaders: HeadersFactory | undefined,
): unknown {
  return new Proxy(
    {},
    {
      get(_, key: string) {
        if (TERMINAL_KEYS.has(key)) {
          const httpMethodKey = path[path.length - 1]

          // getNode() 는 이미 $get / $post 함수 자체이므로 재인덱싱 불필요
          const getClientFn = getNode as () => AnyFn

          if (httpMethodKey === '$get') {
            const node = makeQueryNode(getClientFn, path, factoryHeaders)
            return node[key as keyof QueryNode<AnyFn>]
          } else {
            const node = makeMutationNode(getClientFn, factoryHeaders)
            return node[key as keyof MutationNode<AnyFn>]
          }
        }

        const nextPath    = [...path, key]
        const getNextNode = () => (getNode() as Record<string, unknown>)[key]
        return createProxy(getNextNode, nextPath, factoryHeaders)
      },
    },
  )
}

// ---------------------------------------------------------------------------
// 퍼블릭 API
// ---------------------------------------------------------------------------

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
 *   headers: () => ({
 *     authorization: `Bearer ${useAuthStore.getState().token}`,
 *   }),
 * })
 *
 * // ── 컴포넌트 ──────────────────────────────────────────────────────────────
 *
 * // GET
 * const { data } = useQuery(api.users.$get.queryOptions({ query: { page: '1' } }))
 *
 * // POST
 * const create = useMutation(api.users.$post.mutationOptions({
 *   onSuccess: () => queryClient.invalidateQueries({
 *     queryKey: api.users.$get.queryKey(),
 *   }),
 * }))
 * create.mutate({ json: { name: 'foo' } })
 *
 * // ── 라우터 loader (TanStack Router beforeLoad) ────────────────────────────
 *
 * const authGuard = async () => {
 *   await queryClient.ensureQueryData(
 *     api.me.$get.queryOptions(undefined, { headers: { 'x-ssr': 'true' } })
 *   )
 * }
 */
export function createHonoQuery<T extends object>(
  client: T,
  options?: HonoQueryFactoryOptions,
): HonoQueryClient<T> {
  return createProxy(() => client, [], options?.headers) as HonoQueryClient<T>
}
