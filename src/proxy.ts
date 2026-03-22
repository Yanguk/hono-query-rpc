import {
	queryOptions as tsQueryOptions,
	type UseMutationOptions,
	type UseQueryOptions,
} from "@tanstack/react-query";

import { resolveHeaders } from "./headers";
import { buildQueryKey } from "./queryKey";
import type {
	AnyFn,
	HonoQueryFactoryOptions,
	MutationNode,
	QueryNode,
} from "./types";

const TERMINAL_KEYS = new Set(["queryOptions", "queryKey", "mutationOptions"]);

async function callAndParse(
	fn: AnyFn,
	input: unknown,
	headers?: Record<string, string>,
): Promise<unknown> {
	// Hono RPC 두 번째 인자: ClientRequestOptions = { headers?, init? }
	const res = await fn(input, headers ? { headers } : undefined);
	if (!res.ok) {
		throw new Error(`[hono-query] HTTP ${res.status}: ${res.statusText}`);
	}
	return res.json();
}

function makeQueryNode(
	getClientFn: () => AnyFn,
	path: string[],
	defaultHonoOptions: HonoQueryFactoryOptions,
): QueryNode<AnyFn> {
	return {
		queryOptions(input, options) {
			const { hono: honoOptions = {}, ...restOptions } = options ?? {};

			return tsQueryOptions({
				queryKey: buildQueryKey(path, input),
				queryFn: async () => {
					const h = await resolveHeaders(
						defaultHonoOptions.defaultHeaders,
						honoOptions.headers,
					);

					return callAndParse(getClientFn(), input, h);
				},
				...restOptions,
			} as UseQueryOptions);
		},

		queryKey(input) {
			return buildQueryKey(path, input);
		},
	};
}

function makeMutationNode(
	getClientFn: () => AnyFn,
	defaultHonoOptions: HonoQueryFactoryOptions,
): MutationNode<AnyFn> {
	const idempotencyKey = crypto.randomUUID();

	return {
		mutationOptions: (options) => {
			const { hono: honoOptions = {}, ...restOptions } = options ?? {};

			return {
				mutationFn: async (input: unknown) => {
					const h = await resolveHeaders(
						defaultHonoOptions.defaultHeaders,
						defaultHonoOptions.autoIdempotency
							? {
									"Idempotency-Key": idempotencyKey,
								}
							: {},
						honoOptions.headers,
					);

					return callAndParse(getClientFn(), input, h);
				},
				...restOptions,
			} as UseMutationOptions;
		},
	};
}

export function createProxy(
	getNode: () => unknown,
	path: string[],
	options: HonoQueryFactoryOptions,
): unknown {
	return new Proxy(
		{},
		{
			get(_, key: string) {
				if (TERMINAL_KEYS.has(key)) {
					const httpMethodKey = path[path.length - 1];

					// getNode() 는 이미 $get / $post 함수 자체이므로 재인덱싱 불필요
					const getClientFn = getNode as () => AnyFn;

					if (httpMethodKey === "$get") {
						const node = makeQueryNode(getClientFn, path, options);
						return node[key as keyof QueryNode<AnyFn>];
					}

					const node = makeMutationNode(getClientFn, options);
					return node[key as keyof MutationNode<AnyFn>];
				}

				const nextPath = [...path, key];
				const getNextNode = () => (getNode() as Record<string, unknown>)[key];

				return createProxy(getNextNode, nextPath, options);
			},
		},
	);
}
