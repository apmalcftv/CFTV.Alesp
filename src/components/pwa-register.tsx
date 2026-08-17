"use client";

import { useEffect } from "react";

/** Registra public/sw.js. Só em produção — em `next dev` o bundle troca a
    cada save, e um Service Worker cacheando `/_next/static/*` atrapalharia
    o hot reload. `navigator.serviceWorker` também não existe fora de HTTPS
    (localhost é exceção do próprio navegador, mas produção depende de TLS
    de qualquer forma — a Vercel já serve tudo em HTTPS). */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // instalação como PWA é um extra, não uma dependência do app — uma
      // falha aqui não deve virar erro visível para o usuário
    });
  }, []);

  return null;
}
