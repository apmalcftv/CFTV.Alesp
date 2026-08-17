import type { MetadataRoute } from "next";

// Servido automaticamente em /manifest.webmanifest pelo App Router — é a
// convenção nativa do Next.js para PWA (arquivo especial, sem precisar de
// rota manual). O <link rel="manifest"> é injetado sozinho em todas as
// páginas por causa deste arquivo existir na raiz de app/.
//
// Cores vindas literalmente de globals.css (--sidebar / --sidebar-primary),
// que já são a identidade visual fixa do app (login + barra lateral, iguais
// nos dois temas) — nenhuma cor nova foi inventada para o PWA.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CFTV Alesp",
    short_name: "CFTV Alesp",
    description: "Dashboard de gerenciamento de sistemas de CFTV",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "landscape",
    lang: "pt-BR",
    background_color: "#0a0a0a",
    theme_color: "#f2650f",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
