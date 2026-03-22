import type { HeadersFactory } from "./types";

function headersToObject(h?: HeadersInit): Record<string, string> {
	if (!h) return {};
	if (h instanceof Headers) return Object.fromEntries(h.entries());
	if (Array.isArray(h)) return Object.fromEntries(h);
	return h as Record<string, string>;
}

/**
 * 팩토리 기본 헤더 + 호출 레벨 헤더를 병합하여 반환합니다.
 * 우선순위: 팩토리 < 호출 레벨
 */
export async function resolveHeaders(
	factory?: HeadersFactory,
	extra?: HeadersInit,
	perCall?: HeadersInit,
): Promise<Record<string, string> | undefined> {
	const base = typeof factory === "function" ? await factory() : factory;

	const merged = {
		...headersToObject(base),
		...headersToObject(extra),
		...headersToObject(perCall),
	};

	return Object.keys(merged).length > 0 ? merged : undefined;
}
