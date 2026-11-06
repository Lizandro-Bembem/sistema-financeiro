const CACHE = 'financeiro-v3';
const ARQUIVOS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './fundo.jpg'];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE).then((c) => Promise.allSettled(ARQUIVOS.map((a) => c.add(a))))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    );
    self.clients.claim();
});

// O Chrome exige um "fetch handler" para liberar o botão "Instalar app"
self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;
    e.respondWith(
        fetch(e.request)
            .then((res) => {
                const copia = res.clone();
                caches.open(CACHE).then((c) => c.put(e.request, copia));
                return res;
            })
            .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
    );
});