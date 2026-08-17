import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Sans_Condensed, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexCondensed = IBM_Plex_Sans_Condensed({
  variable: "--font-plex-condensed",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// Marca neutra do produto; o layout autenticado sobrescreve com o nome do tenant
const nomeProduto = process.env.NEXT_PUBLIC_PRODUCT_NAME ?? "Gestão de CFTV";

export const metadata: Metadata = {
  metadataBase: new URL("https://cftv-alesp.vercel.app"),
  title: {
    default: nomeProduto,
    template: `%s · ${nomeProduto}`,
  },
  description: "Dashboard de gerenciamento de sistemas de CFTV",
  applicationName: "CFTV Alesp",
  // O manifest em si é gerado por app/manifest.ts (convenção nativa do
  // Next.js, servido em /manifest.webmanifest) — o <link> é injetado
  // sozinho. Só os ícones precisam de referência explícita aqui, porque
  // são arquivos reais copiados sem reprocessar de Logos-CFTVAlesp/.
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

// Mesma cor de --sidebar-primary em globals.css (idêntica nos dois temas)
// — cor da barra de título/moldura quando o PWA roda em janela própria.
export const viewport: Viewport = {
  themeColor: "#f2650f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${plexSans.variable} ${plexCondensed.variable} ${plexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
          <PwaRegister />
        </Providers>
      </body>
    </html>
  );
}
