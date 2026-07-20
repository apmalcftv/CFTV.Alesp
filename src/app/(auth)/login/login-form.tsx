"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";

export function LoginForm({
  tenantSlug,
  dominioEmail,
}: {
  tenantSlug?: string;
  dominioEmail?: string | null;
}) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const linkCadastro = tenantSlug ? `/cadastro?t=${tenantSlug}` : "/cadastro";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    setEnviando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setEnviando(false);
      toast.error("Não foi possível entrar", {
        description:
          error.message === "Invalid login credentials"
            ? "E-mail ou senha incorretos."
            : error.message,
      });
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder={
                dominioEmail ? `nome@${dominioEmail}` : "voce@exemplo.com"
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={enviando}>
            {enviando && <Loader2 className="size-4 animate-spin" />}
            Entrar
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Não tem conta?{" "}
            <Link
              href={linkCadastro}
              className="font-medium text-secondary-foreground underline underline-offset-4 hover:text-foreground"
            >
              Criar conta
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
