import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Proxy (ex-middleware no Next.js 16): mantém a sessão do Supabase
// atualizada e protege as rotas da aplicação.
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Não remover: revalida o token e evita sessões penduradas
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // startsWith puro colidiria "/cadastro" (tela pública de auto-cadastro)
  // com "/cadastros" (seção administrativa) — exige a barra ou match exato.
  const rotaPublica = ["/login", "/cadastro"].some(
    (rota) =>
      request.nextUrl.pathname === rota ||
      request.nextUrl.pathname.startsWith(`${rota}/`)
  );

  if (!user && !rotaPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && rotaPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Tudo, exceto estáticos, imagens e os arquivos do PWA. O manifest e o
    // Service Worker precisam responder mesmo sem sessão — é assim que o
    // navegador decide se oferece "Instalar app" para quem ainda nem
    // logou. Sem esta exclusão os dois caíam na regra de "sem usuário e
    // rota não pública" e voltavam 307 para /login em vez do conteúdo.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
