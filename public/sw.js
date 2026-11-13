// 홈 화면 앱(PWA)용: 인터넷이 될 때는 항상 최신 파일을 받고(배포 즉시 반영),
// 안 될 때만 저장해 둔 화면을 보여 줌. 공유 기록 API(/api/)는 저장하지 않음(앱이 직접 기기에 보관).
const CACHE = "route-v2"; // 배포할 때 index.html 의 APP_VERSION 과 함께 숫자를 올리세요
const CORE = ["./", "manifest.webmanifest", "icon-192.png", "icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => hit || (req.mode === "navigate" ? caches.match("./") : Response.error()))
          .then((r) => r || Response.error())
      )
  );
});
