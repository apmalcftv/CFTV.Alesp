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

function traduzErro(mensagem: string) {
  if (mensagem.includes("already registered")) {
    return "Este e-mail já possui conta. Use a tela de login.";
  }
  if (mensagem.toLowerCase().includes("password")) {
    return "A senha precisa ter pelo menos 6 caracteres.";
  }
  return mensagem;
}

export function CadastroForm({
  tenantSlug,
  dominioEmail,
}: {
  tenantSlug?: string;
  dominioEmail?: string | null;
}) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const linkLogin = tenantSlug ? `/login?t=${tenantSlug}` : "/login";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const nome = String(form.get("nome") ?? "").trim();
    const email = String(form.get("email") ?? "");
    const telefone = String(form.get("telefone") ?? "").trim();
    const empresa = String(form.get("empresa") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirmacao = String(form.get("confirmacao") ?? "");

    if (password !== confirmacao) {
      toast.error("As senhas não conferem", {
        description: "Digite a mesma senha nos dois campos.",
      });
      return;
    }

    setEnviando(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome, telefone, empresa } },
    });

    if (error) {
      setEnviando(false);
      toast.error("Não foi possível criar a conta", {
        description: traduzErro(error.message),
      });
      return;
    }

    if (data.session) {
      // Confirmação de e-mail desativada no projeto: já entra logado,
      // mas a conta nasce pendente — o layout redireciona pra /pendente.
      router.push("/pendente");
      router.refresh();
      return;
    }

    toast.success("Conta criada!", {
      description: "Confirme seu e-mail pelo link enviado e depois faça login.",
    });
    router.push(linkLogin);
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome completo</Label>
            <Input
              id="nome"
              name="nome"
              autoComplete="name"
              placeholder="Seu nome"
              required
            />
          </div>
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
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              name="telefone"
              type="tel"
              autoComplete="tel"
              placeholder="(11) 90000-0000"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="empresa">Empresa</Label>
            <Input
              id="empresa"
              name="empresa"
              autoComplete="organization"
              placeholder="Ex.: ALESP, Infogoogle..."
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmacao">Confirmar senha</Label>
            <PasswordInput
              id="confirmacao"
              name="confirmacao"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={enviando}>
            {enviando && <Loader2 className="size-4 animate-spin" />}
            Criar conta
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link
              href={linkLogin}
              className="font-medium text-secondary-foreground underline underline-offset-4 hover:text-foreground"
            >
              Entrar
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
