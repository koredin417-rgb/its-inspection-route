// 점검 기록 공유 API — Netlify Functions + Netlify Blobs
//   GET  /api/records[?since=<etag>]       → { etag, records, resetAt } (바뀐 게 없으면 { etag, unchanged: true })
//   POST /api/records { actions: [...] }    → 기록 추가 후 { etag, records, resetAt }
//   POST /api/records { op: "reset", by }   → 현재 기록을 archive/<시각> 에 보관하고 새 회차 시작
// 팀 코드: Netlify 환경 변수 TEAM_CODE 를 설정하면 요청 헤더 x-team-code(encodeURIComponent)와 일치해야 함.
import { getStore } from "@netlify/blobs";
import { createHash, timingSafeEqual } from "node:crypto";

const DOC = "records";
const MAX_LOG = 100;     // 지점별 이력 보관 개수
const MAX_BATCH = 100;   // 한 번에 받는 기록 개수
const STATUS = new Set(["", "done", "bad"]);

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

function teamCode() {
  try {
    const v = globalThis.Netlify?.env?.get("TEAM_CODE");
    if (v != null) return v;
  } catch {}
  return process.env.TEAM_CODE || "";
}
const sha = (s) => createHash("sha256").update(String(s)).digest();
function authorized(req) {
  const code = teamCode();
  if (!code) return true;
  let got = req.headers.get("x-team-code") || "";
  try { got = decodeURIComponent(got); } catch {}
  return timingSafeEqual(sha(got.trim()), sha(code.trim()));
}

const str = (v, max) => (typeof v === "string" ? v.slice(0, max) : null);
// 클라이언트가 보낸 기록 1건 검증 (잘못된 건 null → 건너뜀)
function clean(a, now) {
  if (!a || typeof a !== "object") return null;
  const id = str(a.id, 40), key = str(a.key, 80), by = (str(a.by, 20) || "").trim();
  if (!id || !key || !by) return null;
  if (a.st != null && !STATUS.has(a.st)) return null;
  if (a.memo != null && typeof a.memo !== "string") return null;
  if (a.note != null && typeof a.note !== "string") return null;
  let at = Number(a.at);
  if (!Number.isFinite(at) || at <= 0 || at > now + 5 * 60e3) at = now; // 미래 시각은 서버 시각으로
  return {
    id, key, by, label: str(a.label, 40) || "", st: a.st ?? null, at,
    memo: a.memo == null ? null : a.memo.slice(0, 500), // 지점의 현재 이상 사유 (완료·취소 시 "")
    note: a.note == null ? null : a.note.slice(0, 500), // 이 기록 한 줄의 사유 (이상 사유 / 취소 사유)
  };
}

// 클라이언트(index.html)의 applyAction 과 같은 규칙:
// 같은 id는 한 번만, 상태·메모는 각각 '더 나중 시각'의 기록이 이김(오프라인으로 늦게 올라온 기록이 최신을 덮지 않음), 이력은 시각순.
function applyAction(recs, a) {
  const r = recs[a.key] || (recs[a.key] = { st: "", memo: "", by: "", at: 0, stAt: 0, memoAt: 0, log: [] });
  if (r.log.some((e) => e.id === a.id)) return false;
  if (a.st != null && a.at >= (r.stAt || 0)) { r.st = a.st; r.stAt = a.at; }
  if (a.memo != null && a.at >= (r.memoAt || 0)) { r.memo = a.memo; r.memoAt = a.at; }
  if (a.at >= (r.at || 0)) { r.at = a.at; r.by = a.by; }
  const e = { id: a.id, a: a.label, by: a.by, at: a.at };
  if (a.st != null) e.st = a.st;
  const note = a.note || a.memo || ""; // 로그 한 줄: "사용자 - 사유"
  if (note) e.note = note;
  r.log.push(e);
  r.log.sort((x, y) => x.at - y.at);
  if (r.log.length > MAX_LOG) r.log = r.log.slice(-MAX_LOG);
  return true;
}

const view = (etag, doc) => ({ etag: etag || null, records: doc.records || {}, resetAt: doc.resetAt || 0 });

export default async (req) => {
  if (!authorized(req)) return json({ error: "team-code" }, 401);
  const store = getStore({ name: "inspection", consistency: "strong" });

  if (req.method === "GET") {
    const since = new URL(req.url).searchParams.get("since") || undefined;
    const cur = await store.getWithMetadata(DOC, { type: "json", etag: since });
    if (!cur) return json(view(null, {}));
    if (since && cur.etag === since && cur.data == null) return json({ etag: cur.etag, unchanged: true });
    return json(view(cur.etag, cur.data || {}));
  }
  if (req.method !== "POST") return json({ error: "method" }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ error: "bad-json" }, 400); }
  const now = Date.now();
  const reset = body && body.op === "reset";
  const actions = reset ? [] : (Array.isArray(body?.actions) ? body.actions : []).slice(0, MAX_BATCH)
    .map((a) => clean(a, now)).filter(Boolean).sort((x, y) => x.at - y.at);

  // 동시에 여러 명이 저장해도 잃지 않도록: 읽은 버전(etag)이 그대로일 때만 쓰고, 아니면 다시 읽어서 재시도
  for (let attempt = 0; attempt < 8; attempt++) {
    const cur = await store.getWithMetadata(DOC, { type: "json" });
    let doc = (cur && cur.data) || { records: {}, resetAt: 0 };
    if (!doc.records) doc.records = {};
    if (reset) {
      const by = (str(body.by, 20) || "?").trim();
      if (Object.keys(doc.records).length) {
        await store.setJSON("archive/" + new Date(now).toISOString(), { ...doc, archivedAt: now, archivedBy: by });
      }
      doc = { records: {}, resetAt: now, resetBy: by };
    } else {
      // 초기화 이전 회차에 찍힌 기록은 반영하지 않음
      actions.forEach((a) => { if (a.at >= (doc.resetAt || 0)) applyAction(doc.records, a); });
    }
    doc.updatedAt = now;
    const w = cur
      ? await store.setJSON(DOC, doc, { onlyIfMatch: cur.etag })
      : await store.setJSON(DOC, doc, { onlyIfNew: true });
    if (w && w.modified) return json(view(w.etag, doc));
    await new Promise((r) => setTimeout(r, 30 * (attempt + 1) + Math.random() * 50));
  }
  return json({ error: "busy" }, 503);
};

export const config = { path: "/api/records" };
