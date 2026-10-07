import type { Bindings } from "./app";

const USER_TABLES = ["user_checks", "user_wishlist", "user_wishlist_version", "feedback"];

// 321_auth 탈퇴 큐 소비(Cron Trigger): 이 앱이 아직 확인하지 않은 탈퇴자의 행을 지우고 ack 한다.
// 지우기나 ack 가 실패하면 throw — ack 안 된 건은 다음 주기에 다시 내려온다.
export async function syncDeletions(env: Bindings): Promise<number> {
  if (!env.AUTH_ORIGIN || !env.AUTH_CLIENT_ID || !env.AUTH_CLIENT_SECRET) return 0;
  const headers = { "x-app-secret": env.AUTH_CLIENT_SECRET };
  const url = new URL("/deletions", env.AUTH_ORIGIN);
  url.searchParams.set("client_id", env.AUTH_CLIENT_ID);
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error(`321_auth deletions failed: ${res.status}`);
  const { deletions } = await res.json<{ deletions: { userId: string }[] }>();
  for (const { userId } of deletions) {
    await env.DB.batch(USER_TABLES.map((table) => env.DB.prepare(`DELETE FROM ${table} WHERE user_id = ?`).bind(userId)));
    const ack = new URL(`/deletions/${encodeURIComponent(userId)}/ack`, env.AUTH_ORIGIN);
    ack.searchParams.set("client_id", env.AUTH_CLIENT_ID);
    const acked = await fetch(ack.toString(), { method: "POST", headers });
    if (!acked.ok) throw new Error(`321_auth deletion ack failed: ${acked.status}`);
  }
  return deletions.length;
}
