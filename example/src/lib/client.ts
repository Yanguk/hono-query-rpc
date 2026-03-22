import { hc } from "hono/client";
import { createHonoQuery } from "hono-query-rpc";
import type { AppType } from "@/server/app";

const honoClient = hc<AppType>("/");

export const api = createHonoQuery(honoClient.api);
