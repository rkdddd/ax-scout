// Design Ref: DESIGN §2.4 — 원문 링크 정규화. 같은 공고가 주소만 조금 달라 두 번 저장되지 않게 한다.
// 웹앱(링크로 등록)과 수집 스크립트가 같이 쓰므로 다른 파일을 가져오지 않는다.

// 주소에 붙는 추적용 값. 공고 내용과 상관없으므로 지운다.
const TRACKING_PARAMS = new Set([
  "fbclid", "gclid", "igshid", "mc_cid", "mc_eid", "ncid", "ref", "ref_src", "si", "yclid", "_ga",
]);

// 구글 알림이 전달하는 주소(https://www.google.com/url?...&url=진짜주소)에서 진짜 주소를 꺼낸다.
function unwrapGoogleRedirect(url: URL): URL {
  const isGoogle = /(^|\.)google\.[a-z.]+$/i.test(url.hostname);
  if (isGoogle && url.pathname === "/url") {
    const target = url.searchParams.get("url") ?? url.searchParams.get("q");
    if (target) {
      try {
        return new URL(target);
      } catch {
        return url;
      }
    }
  }
  return url;
}

// 정규화한 주소를 돌려준다. http(s) 주소가 아니거나 읽을 수 없으면 null.
export function normalizeLink(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  url = unwrapGoogleRedirect(url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname) return null;

  url.protocol = "https:"; // http와 https는 같은 공고로 본다
  url.hash = "";
  url.username = "";
  url.password = "";
  if (url.port === "443" || url.port === "80") url.port = "";

  // 추적용 값(utm_*, fbclid 등)을 지우고, 나머지는 이름순으로 정렬해 순서가 달라도 같은 주소가 되게 한다.
  const kept: [string, string][] = [];
  for (const [key, value] of url.searchParams) {
    if (key.toLowerCase().startsWith("utm_") || TRACKING_PARAMS.has(key.toLowerCase())) continue;
    kept.push([key, value]);
  }
  kept.sort(([a], [b]) => a.localeCompare(b));
  url.search = "";
  for (const [key, value] of kept) url.searchParams.append(key, value);

  // 끝의 "/"는 지운다 (루트 "/"는 그대로 둔다).
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "") || "/";

  return url.toString();
}
