// 비비 영어 스타트 - 서비스 워커
// 앱을 한 번 방문하면 필요한 파일들을 저장해뒀다가,
// 인터넷이 안 되는 상황에서도 앱이 열리도록 도와줍니다.

const CACHE_NAME = 'bibby-start-v13';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './assets/bibby-hero.png',
  './assets/bibby-face.png'
];

// 설치 시: 기본 파일들을 미리 저장
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// 활성화 시: 예전 버전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// 요청이 올 때 전략:
// - 첫 화면(HTML 문서)을 열 때는 "네트워크를 먼저" 시도합니다.
//   (앱을 처음 여는 순간 오래되거나 비어있는 캐시 때문에 실패하는 것을 방지)
//   네트워크가 안 되는 상황(오프라인)에서만 저장된 캐시로 대체합니다.
// - 이미지/아이콘 등 나머지 파일은 캐시를 먼저 보여줘서 빠르게 뜨도록 합니다.
// - 어떤 경우에도 "빈 응답"을 돌려주지 않도록 해서 ERR_FAILED가 뜨지 않게 합니다.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 외부 CDN(Tailwind, 폰트)이나 API 요청은 캐시하지 않고 그대로 네트워크로
  if (url.origin !== self.location.origin) {
    return;
  }

  // ⭐ 중요: /api/ 로 시작하는 요청(로그인, 학습기록 저장, 문장 조회 등)은
  // 서비스워커가 절대 가로채지 않고 브라우저가 직접 처리하게 둡니다.
  // 캐시 시스템은 원래 GET 요청(정적 파일)을 위한 것이라, 로그인/기록저장 같은
  // POST 요청까지 캐시 로직을 거치면 요청이 중간에 유실되거나 오래된 응답이
  // 뒤섞일 수 있습니다. 실제로 학습 기록 일부가 누락된 원인이 이것이었습니다.
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  const isNavigation = event.request.mode === 'navigate' || event.request.destination === 'document';

  if (isNavigation) {
    // 네트워크 우선 전략
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          return cached || caches.match('./index.html');
        })
    );
    return;
  }

  // 캐시 우선 전략 (이미지, 아이콘, manifest 등)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      // 위에서 cached가 없어 undefined가 나올 수 있는 마지막 경우까지 대비해
      // 최종적으로 캐시된 index.html이라도 대체 응답으로 제공합니다.
    }).then((res) => res || caches.match('./index.html'))
  );
});
