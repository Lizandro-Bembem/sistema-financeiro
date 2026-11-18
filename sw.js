const PREFIXO = 'sistema-financeiro-';
const CACHE = PREFIXO + 'v17';
const LOCAIS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png', './fundo.jpg'];
const EXTERNOS = [
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js'
];
// Arquivos externos que nunca mudam (versão fixa no endereço): servidos direto do cache
const IMUTAVEIS = ['https://cdn.jsdelivr.net/', 'https://cdnjs.cloudflare.com/', 'https://fonts.gstatic.com/'];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE)
            .then((c) => Promise.allSettled([...LOCAIS, ...EXTERNOS].map((a) => c.add(new Request(a, { cache: 'reload' })))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIXO) && k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

function guardar(req, res) {
    // 206 (resposta parcial) e erros não podem/devem ir para o cache
    if (res && res.status !== 206 && (res.ok || res.type === 'opaque')) {
        const copia = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
    }
    return res;
}

self.addEventListener('fetch', (e) => {
    const req = e.request;
    if (req.method !== 'GET' || !req.url.startsWith('http')) return;

    // Bibliotecas e fontes com versão fixa: cache primeiro (mais rápido e funciona offline)
    if (IMUTAVEIS.some((p) => req.url.startsWith(p))) {
        e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => guardar(req, res))));
        return;
    }

    // Abrir o app (navegação): rede primeiro; offline usa a página salva, mesmo com ?parâmetros no endereço
    if (req.mode === 'navigate') {
        e.respondWith(
            fetch(req)
                .then((res) => guardar(req, res))
                .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
        );
        return;
    }

    // Demais arquivos: rede primeiro, cache se estiver offline
    e.respondWith(
        fetch(req)
            .then((res) => guardar(req, res))
            .catch(() => caches.match(req).then((r) => r || Response.error()))
    );
});

// Ao tocar na notificação de vencimento, abre (ou traz para frente) o aplicativo
self.addEventListener('notificationclick', (e) => {
    e.notification.close();
    e.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
            const aberto = lista.find((c) => c.url.startsWith(self.registration.scope));
            if (aberto) return aberto.focus();
            return self.clients.openWindow('./');
        })
    );
});
