// RSS/Atom 피드를 읽어 공고 후보(제목·링크·기관)로 바꾼다. 네트워크 없이 시험할 수 있게 "해석"과 "내려받기"를 나눴다.
import Parser from "rss-parser";
import { normalizeLink } from "../../lib/link-normalize";
import type { Source } from "./sources";

export type FeedItem = {
  title: string;
  url: string; // 정규화한 원문 링크
  organization: string; // 출처 기관명 (모르면 링크의 사이트 주소)
};

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

// 구글 알림 제목에는 <b>키워드</b> 같은 태그와 &amp; 같은 특수문자가 섞여 있다.
export function cleanTitle(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (match, name: string) => ENTITIES[name.toLowerCase()] ?? match)
    .replace(/\s+/g, " ")
    .trim();
}

// 이미 읽어 둔 피드(Parser 결과)에서 항목을 뽑는다. 제목이나 링크가 없거나 읽을 수 없는 항목은 건너뛴다.
export function toItems(
  feed: { items?: { title?: string; link?: string }[] },
  source: Source,
): FeedItem[] {
  const items: FeedItem[] = [];
  for (const entry of feed.items ?? []) {
    const title = entry.title ? cleanTitle(entry.title) : "";
    const url = entry.link ? normalizeLink(entry.link) : null;
    if (!title || !url) continue;
    items.push({ title, url, organization: source.organization ?? new URL(url).hostname });
  }
  return items;
}

const parser = new Parser({ timeout: 20_000, headers: { "User-Agent": "AXSCOUT/1.0 (internal contest tracker)" } });

// 피드 문자열을 해석한다 (시험용으로도 쓴다).
export async function parseFeedText(xml: string, source: Source): Promise<FeedItem[]> {
  return toItems(await parser.parseString(xml), source);
}

// 피드 주소에서 내려받아 해석한다.
export async function fetchFeed(source: Source): Promise<FeedItem[]> {
  return toItems(await parser.parseURL(source.url), source);
}
