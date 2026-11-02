// Design Ref: DESIGN §2.4 — 공고 자동 수집 (기관 RSS · 검색 알림 RSS).
// 실행: npm run collect:local (내 컴퓨터, .env 사용) / npm run collect (GitHub Actions, 환경변수 사용)
//       npm run collect:local -- --dry-run  → 저장하지 않고 무엇이 모일지만 보여준다
// 원칙: 수집이 실패해도 기존 공고를 지우지 않는다. 이미 있는 공고는 덮어쓰지 않고 확인 시각만 갱신한다
//       (사람이 직접 등록하거나 숨긴 공고를 자동 수집이 바꾸지 않도록).
import { createClient } from "@supabase/supabase-js";
import { fetchFeed, type FeedItem } from "./feed";
import { classifyTitle } from "./keywords";
import { loadSources, type Source } from "./sources";

type SourceResult = { read: number; accepted: number; added: number; error?: string };
type Accepted = { item: FeedItem; source: Source };

const CHUNK = 100;

// 오류 문구에 주소(검색 알림 주소에는 개인 토큰이 있다)가 섞여 기록되지 않게 가린다.
function redact(message: string) {
  return message.replace(/https?:\/\/\S+/g, "[주소]").slice(0, 200);
}

function chunks<T>(list: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < list.length; i += size) result.push(list.slice(i, i + size));
  return result;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!dryRun && (!url || !key)) {
    console.error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.");
    process.exit(1);
  }
  const supabase = !dryRun && url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;

  const startedAt = new Date();
  const sources = loadSources(process.env);
  console.log(`수집 시작${dryRun ? " (저장하지 않는 시험 실행)" : ""}: 원천 ${sources.length}곳`);

  const results: Record<string, SourceResult> = {};
  const accepted = new Map<string, Accepted>(); // 정규화한 링크 → 공고 (같은 공고는 먼저 찾은 원천을 따른다)

  for (const source of sources) {
    const result: SourceResult = { read: 0, accepted: 0, added: 0 };
    results[source.name] = result;
    try {
      const items = await fetchFeed(source);
      result.read = items.length;
      for (const item of items) {
        if (!classifyTitle(item.title).accepted) continue;
        result.accepted += 1;
        if (!accepted.has(item.url)) accepted.set(item.url, { item, source });
      }
    } catch (error) {
      result.error = redact(error instanceof Error ? error.message : String(error));
      console.error(`  ✗ ${source.name}: ${result.error}`);
    }
  }

  // 저장: 이미 있는 공고는 확인 시각만 갱신하고, 새 공고만 추가한다.
  const now = new Date().toISOString();
  const urls = [...accepted.keys()];
  if (supabase && urls.length > 0) {
    const existing = new Set<string>();
    for (const part of chunks(urls, CHUNK)) {
      const { data, error } = await supabase.from("notices").select("source_url").in("source_url", part);
      if (error) throw new Error(`기존 공고 조회 실패 (${error.code})`);
      for (const row of data ?? []) existing.add(row.source_url as string);
    }

    const fresh = urls.filter((link) => !existing.has(link));
    for (const part of chunks(fresh, CHUNK)) {
      const rows = part.map((link) => {
        const { item, source } = accepted.get(link)!;
        return {
          source_url: link,
          organization: item.organization,
          title: item.title,
          origin: source.origin,
          source_name: source.name,
          collected_at: now,
        };
      });
      const { error } = await supabase.from("notices").upsert(rows, { onConflict: "source_url", ignoreDuplicates: true });
      if (error) throw new Error(`공고 저장 실패 (${error.code})`);
      for (const link of part) results[accepted.get(link)!.source.name].added += 1;
    }

    for (const part of chunks([...existing], CHUNK)) {
      const { error } = await supabase.from("notices").update({ collected_at: now }).in("source_url", part);
      if (error) throw new Error(`확인 시각 갱신 실패 (${error.code})`);
    }
  }

  // 결과 요약 (주소·키는 찍지 않는다)
  for (const [name, r] of Object.entries(results)) {
    console.log(`  ${r.error ? "✗" : "✓"} ${name}: 읽음 ${r.read}건 · 조건 통과 ${r.accepted}건 · 새로 저장 ${r.added}건`);
  }
  if (dryRun) {
    for (const { item, source } of accepted.values()) console.log(`  [시험] ${source.name} · ${item.title}`);
  }

  const failed = Object.values(results).filter((r) => r.error).length;
  const status = failed === 0 ? "성공" : failed === sources.length ? "실패" : "일부 실패";
  const errorSummary = Object.entries(results)
    .filter(([, r]) => r.error)
    .map(([name, r]) => `${name}: ${r.error}`)
    .join(" / ");

  // 수집 기록 (화면의 "마지막 수집 시각과 결과"가 이걸 쓴다). 실패한 날도 기록해야 앱에서 알 수 있다.
  if (supabase) {
    const { error } = await supabase.from("collection_runs").insert({
      started_at: startedAt.toISOString(),
      finished_at: new Date().toISOString(),
      status,
      source_counts: results,
      error_summary: errorSummary || null,
    });
    if (error) console.error(`수집 기록 저장 실패 (${error.code})`);
  }

  console.log(`수집 끝: ${status}${errorSummary ? ` (${failed}곳 실패)` : ""}`);
  if (status === "실패") process.exit(1);
}

main().catch((error) => {
  console.error("수집 중단:", redact(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
