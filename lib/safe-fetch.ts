// Design Ref: DESIGN §4.2 — 링크로 공고를 등록할 때 서버가 사용자가 넣은 주소의 페이지를 읽는다.
// 아무 주소나 읽게 두면 서버를 통해 내부망(localhost, 사내망, 클라우드 정보 주소)을 들여다볼 수 있으므로 다음을 지킨다.
//  - http(s)만 허용, 주소가 가리키는 IP가 공개 주소일 때만 연결 (연결하는 순간 다시 확인해서 속임수를 막는다)
//  - 리다이렉트는 3번까지, 매번 처음부터 다시 검사
//  - 전체 8초, 내려받는 크기 500KB 제한, HTML 페이지만 허용
import "server-only";
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";

export type SafeFetchErrorCode =
  | "bad-url" // 주소 모양이 잘못됨
  | "blocked" // 내부·사설 주소
  | "timeout"
  | "failed" // 연결 실패 등
  | "not-html"
  | "too-many-redirects"
  | "http-error";

export class SafeFetchError extends Error {
  constructor(
    public code: SafeFetchErrorCode,
    message: string,
  ) {
    super(message);
  }
}

const MAX_BYTES = 500 * 1024;
const MAX_REDIRECTS = 3;
const TOTAL_TIMEOUT_MS = 8000;

// IPv4가 인터넷에서 누구나 닿는 공개 주소인지 본다.
function isPublicIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b, c] = parts;
  if (a === 0 || a === 10 || a === 127) return false; // 0.0.0.0/8, 사설망, 루프백
  if (a === 100 && b >= 64 && b <= 127) return false; // 100.64.0.0/10 (통신사 공유 주소)
  if (a === 169 && b === 254) return false; // 링크 로컬 (클라우드 정보 주소 169.254.169.254 포함)
  if (a === 172 && b >= 16 && b <= 31) return false; // 사설망
  if (a === 192 && b === 0 && c === 0) return false; // 192.0.0.0/24
  if (a === 192 && b === 168) return false; // 사설망
  if (a === 198 && (b === 18 || b === 19)) return false; // 장비 시험용
  if (a >= 224) return false; // 멀티캐스트·예약
  return true;
}

// IPv6 주소를 8개 묶음 숫자로 펼친다. 읽을 수 없으면 null.
function expandIpv6(ip: string): number[] | null {
  let text = ip.toLowerCase().split("%")[0];
  const dotted = text.match(/(\d+\.\d+\.\d+\.\d+)$/); // 끝이 IPv4 모양이면 두 묶음으로 바꾼다
  if (dotted) {
    const v4 = dotted[1].split(".").map(Number);
    if (v4.length !== 4 || v4.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
    text = text.slice(0, -dotted[1].length) + ((v4[0] << 8) | v4[1]).toString(16) + ":" + ((v4[2] << 8) | v4[3]).toString(16);
  }
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? head.length !== 8 : missing < 0) return null;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...tail].map((g) => parseInt(g, 16));
  return groups.length === 8 && groups.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff) ? groups : null;
}

function isPublicIpv6(ip: string): boolean {
  const g = expandIpv6(ip);
  if (!g) return false;
  // IPv4를 담은 주소(::ffff:a.b.c.d)는 안에 든 IPv4 기준으로 판단한다.
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) {
    return isPublicIpv4(`${g[6] >> 8}.${g[6] & 255}.${g[7] >> 8}.${g[7] & 255}`);
  }
  if ((g[0] & 0xe000) !== 0x2000) return false; // 일반 공개 주소(2000::/3)만 허용 — 루프백, 사설(fc00::/7), 링크 로컬(fe80::/10) 등은 모두 여기서 걸린다
  if (g[0] === 0x2001 && (g[1] === 0 || g[1] === 0x0db8)) return false; // Teredo, 문서용
  if (g[0] === 0x2002) return false; // 6to4 (안에 IPv4가 들어 있어 우회에 쓰일 수 있다)
  return true;
}

// 공개 인터넷 주소인지 본다 (IPv4·IPv6 공용). 시험에서도 직접 쓰므로 내보낸다.
export function isPublicIp(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) return isPublicIpv4(ip);
  if (family === 6) return isPublicIpv6(ip);
  return false;
}

// 연결하는 순간에 도메인이 가리키는 IP를 다시 확인한다. 하나라도 공개 주소가 아니면 연결하지 않는다.
const safeLookup: typeof dns.lookup = ((hostname: string, options: dns.LookupOptions | number | ((...args: never[]) => void), callback?: unknown) => {
  const done = (typeof options === "function" ? options : callback) as (err: Error | null, address?: unknown, family?: number) => void;
  const opts = typeof options === "object" ? options : {};
  dns.lookup(hostname, { ...opts, all: true }, (err, addresses) => {
    if (err) return done(err);
    const list = addresses as dns.LookupAddress[];
    if (list.length === 0 || list.some((entry) => !isPublicIp(entry.address))) {
      return done(new SafeFetchError("blocked", "공개된 주소만 읽을 수 있어요."));
    }
    if (opts.all) return done(null, list);
    return done(null, list[0].address, list[0].family);
  });
}) as typeof dns.lookup;

type PageResponse = { finalUrl: string; body: Buffer; contentType: string };

// 주소 하나를 읽는다 (리다이렉트는 따라가지 않고 그대로 알려 준다).
function requestOnce(url: URL, signal: AbortSignal): Promise<{ status: number; location?: string; contentType: string; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const lib = url.protocol === "https:" ? https : http;
    const host = url.hostname.replace(/^\[|\]$/g, ""); // [::1] → ::1
    if (net.isIP(host) && !isPublicIp(host)) {
      return reject(new SafeFetchError("blocked", "공개된 주소만 읽을 수 있어요.")); // IP를 직접 적은 주소는 도메인 확인(lookup)을 거치지 않으므로 여기서 막는다
    }

    const request = lib.request(
      url,
      {
        method: "GET",
        lookup: safeLookup,
        signal,
        headers: {
          "User-Agent": "AXSCOUT/1.0 (internal contest tracker; reads page title only)",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "ko,en;q=0.8",
        },
      },
      (response) => {
        const status = response.statusCode ?? 0;
        const contentType = String(response.headers["content-type"] ?? "");
        if (status >= 300 && status < 400) {
          response.resume();
          return resolve({ status, location: response.headers.location, contentType, body: Buffer.alloc(0) });
        }
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          chunks.push(chunk);
          if (size >= MAX_BYTES) {
            response.destroy(); // 제목은 앞부분에 있으므로 여기까지만 읽는다
            resolve({ status, contentType, body: Buffer.concat(chunks).subarray(0, MAX_BYTES) });
          }
        });
        response.on("end", () => resolve({ status, contentType, body: Buffer.concat(chunks) }));
        response.on("error", (error) => {
          if (size >= MAX_BYTES) return; // 우리가 일부러 끊은 경우
          reject(error);
        });
      },
    );
    request.on("error", reject);
    request.end();
  });
}

// 공개 페이지를 안전하게 읽는다.
export async function readPage(rawUrl: string): Promise<PageResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TOTAL_TIMEOUT_MS);
  try {
    let current: URL;
    try {
      current = new URL(rawUrl);
    } catch {
      throw new SafeFetchError("bad-url", "주소를 읽을 수 없어요.");
    }

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (current.protocol !== "http:" && current.protocol !== "https:") {
        throw new SafeFetchError("bad-url", "http 또는 https 주소만 쓸 수 있어요.");
      }
      let result;
      try {
        result = await requestOnce(current, controller.signal);
      } catch (error) {
        if (error instanceof SafeFetchError) throw error;
        const cause = (error as { cause?: unknown })?.cause;
        if (cause instanceof SafeFetchError) throw cause;
        if (controller.signal.aborted) throw new SafeFetchError("timeout", "페이지를 읽는 데 시간이 너무 오래 걸려요.");
        throw new SafeFetchError("failed", "페이지에 연결하지 못했어요.");
      }

      if (result.status >= 300 && result.status < 400 && result.location) {
        try {
          current = new URL(result.location, current); // 다음 주소도 처음부터 다시 검사한다
        } catch {
          throw new SafeFetchError("bad-url", "이동할 주소를 읽을 수 없어요.");
        }
        continue;
      }
      if (result.status < 200 || result.status >= 300) {
        throw new SafeFetchError("http-error", `페이지가 응답하지 않아요 (${result.status}).`);
      }
      if (!/html|xml/i.test(result.contentType)) {
        throw new SafeFetchError("not-html", "웹 페이지가 아니에요.");
      }
      return { finalUrl: current.toString(), body: result.body, contentType: result.contentType };
    }
    throw new SafeFetchError("too-many-redirects", "주소가 너무 여러 번 다른 곳으로 이동해요.");
  } finally {
    clearTimeout(timer);
  }
}

// ── 제목 꺼내기 ─────────────────────────────────────────────

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decodeEntities(text: string) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (match, name: string) => ENTITIES[name.toLowerCase()] ?? match);
}

// 한국 사이트는 EUC-KR인 곳이 있어서, 응답 헤더나 meta 태그의 글자 인코딩을 따른다.
function decodeBody(body: Buffer, contentType: string) {
  const head = body.subarray(0, 4096).toString("latin1");
  const label =
    contentType.match(/charset=["']?([\w-]+)/i)?.[1] ??
    head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1] ??
    "utf-8";
  try {
    return new TextDecoder(label).decode(body);
  } catch {
    return new TextDecoder("utf-8").decode(body);
  }
}

function metaContent(html: string, key: string) {
  const tag = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, "i"))?.[0];
  return tag?.match(/content=["']([^"']*)["']/i)?.[1];
}

function clean(text: string | undefined, max: number) {
  const value = decodeEntities(text ?? "").replace(/\s+/g, " ").trim();
  return value ? value.slice(0, max) : undefined;
}

export type PageInfo = { title?: string; siteName?: string; finalUrl: string };

// 링크의 페이지를 읽어 제목과 사이트 이름을 꺼낸다. 못 꺼내면 해당 값은 비어 있다.
export async function fetchPageInfo(rawUrl: string): Promise<PageInfo> {
  const { finalUrl, body, contentType } = await readPage(rawUrl);
  const html = decodeBody(body, contentType);
  const title =
    clean(metaContent(html, "og:title"), 300) ?? clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1], 300);
  const siteName = clean(metaContent(html, "og:site_name"), 100);
  return { title, siteName, finalUrl };
}
