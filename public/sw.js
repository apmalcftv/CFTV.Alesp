// Service Worker do CFTV Alesp — existe só para tornar o app instalável
// como PWA e dar uma resposta mais rápida ao shell estático (ícones,
// fontes, bundle JS/CSS versionado). Não é uma camada de cache genérica.
//
// Regra que guia todo o arquivo: nada relacionado a autenticação ou dado
// de negócio passa por aqui.
//   - navegações (documentos HTML) -> sempre rede, nunca cache. É a
//     página que decide login/redirect (proxy.ts do Next); cachear HTML
//     serviria uma versão desatualizada e, pior, poderia servir uma tela
//     autenticada para quem não devia ver.
//   - qualquer request cross-origin (a API do Supabase é outro domínio)
//     -> ignorado pelo Service Worker, nunca entra no cache.
//   - só ficam em cache os arquivos estáticos versionados pelo próprio
//     Next (/_next/static/*, que já tem hash no nome — cache seguro e
//     "para sempre") e os ícones/manifest do PWA.
//
// Versionar o nome do cache é o mecanismo de atualização: a cada deploy
// que troque este arquivo, o navegador detecta a mudança, uma nova versão
// instala em paralelo e o `activate` apaga o cache da versão anterior.
// Não force o reload da aba durante uma operação em andamento — a versão
// nova assume sozinha na próxima navegação.
const VERSAO_CACHE = "cftv-alesp-shell-v1";

const PRECACHE = ["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(VERSAO_CACHE).then((cache) => cache.addAll(PRECACHE))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(
          chaves
            .filter((chave) => chave !== VERSAO_CACHE)
            .map((chave) => caches.delete(chave))
        )
      )
      .then(() => self.clients.claim())
  );
});

function podeCachear(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Só GET, só mesma origem. Qualquer chamada à API do Supabase é outro
  // domínio e nem chega a entrar aqui — o navegador trata normalmente.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Documento HTML (navegação de página): sempre rede. Nunca serve versão
  // em cache de uma rota — é onde vive a checagem de sessão/redirect.
  if (request.mode === "navigate") return;

  if (!podeCachear(url)) return;

  event.respondWith(
    caches.match(request).then((emCache) => {
      if (emCache) return emCache;
      return fetch(request).then((resposta) => {
        if (resposta.ok) {
          const clone = resposta.clone();
          caches.open(VERSAO_CACHE).then((cache) => cache.put(request, clone));
        }
        return resposta;
      });
    })
  );
});
