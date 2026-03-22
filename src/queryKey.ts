import type { QueryKey } from "@tanstack/react-query";

export function buildQueryKey(path: string[], input: unknown): QueryKey {
	return input !== undefined ? [...path, input] : path;
}
