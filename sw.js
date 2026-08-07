// 비비 영어 스타트 - 서비스 워커
// 앱을 한 번 방문하면 필요한 파일들을 저장해뒀다가,
// 인터넷이 안 되는 상황에서도 앱이 열리도록 도와줍니다.

const CACHE_NAME = 'bibby-start-v2';
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

// 요청이 올 때: 저장된 게 있으면 그걸 먼저 보여주고,
// 없으면 인터넷에서 받아옵니다 (네트워크 우선이 필요한 API 요청은 제외)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 외부 CDN(Tailwind, 폰트)이나 API 요청은 캐시하지 않고 그대로 네트워크로
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).then((response) => {
          // 정상 응답이면 캐시에도 저장해둠
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached)
      );
    })
  );
});
