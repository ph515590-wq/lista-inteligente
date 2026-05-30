const CACHE = 'gastei-v2';
 
// Arquivos que precisam funcionar offline
const ARQUIVOS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;1,400&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap'
];
 
// Instalação — salva tudo no cache
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      // Tenta cachear cada arquivo individualmente
      // Se um falhar (ex: ícone não existe ainda), não quebra o resto
      return Promise.allSettled(
        ARQUIVOS.map(url => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});
 
// Ativação — limpa caches antigos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});
 
// Fetch — cache first, fallback para rede
self.addEventListener('fetch', e => {
  // Ignora requisições que não são GET
  if (e.request.method !== 'GET') return;
 
  // Ignora extensões do Chrome e URLs internas
  if (e.request.url.startsWith('chrome-extension://')) return;
 
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) {
        // Retorna do cache e atualiza em background (stale-while-revalidate)
        const atualizar = fetch(e.request)
          .then(res => {
            if (res && res.status === 200 && res.type !== 'opaque') {
              caches.open(CACHE).then(c => c.put(e.request, res.clone()));
            }
            return res;
          })
          .catch(() => {});
        return cached;
      }
 
      // Não está no cache — busca na rede e salva
      return fetch(e.request)
        .then(res => {
          if (!res || res.status !== 200 || res.type === 'opaque') return res;
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copia));
          return res;
        })
        .catch(() => {
          // Fallback: se for navegação, retorna index.html do cache
          if (e.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
    })
  );
});
