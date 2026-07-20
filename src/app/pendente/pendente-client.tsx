"use client";

import { useRouter } from "next/navigation";
import { Clock, LogOut, ShieldX, UserX } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { StatusUsuario } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const CONTEUDO: Record<
  Exclude<StatusUsuario, "aprovado">,
  { icone: typeof Clock; titulo: string; texto: string }
> = {
  pendente: {
    icone: Clock,
    titulo: "Cadastro pendente de aprovação",
    texto:
      "Seu cadastro foi recebido e está aguardando a aprovação de um administrador. Assim que for aprovado, você poderá acessar o sistema normalmente.",
  },
  rejeitado: {
    icone: UserX,
    titulo: "Cadastro não aprovado",
    texto: "Seu cadastro não foi aprovado. Fale com um administrador do CFTC para mais informações.",
  },
  bloqueado: {
    icone: ShieldX,
    titulo: "Acesso bloqueado",
    texto: "Seu acesso foi bloqueado por um administrador. Fale com o CFTC para mais informações.",
  },
  excluido: {
    icone: ShieldX,
    titulo: "Conta desativada",
    texto: "Esta conta foi desativada. Fale com um administrador do CFTC para mais informações.",
  },
};

export function PendenteClient({ status }: { status: Exclude<StatusUsuario, "aprovado"> }) {
  const router = useRouter();
  const { icone: Icone, titulo, texto } = CONTEUDO[status];

  async function sair() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-warning/10 text-warning">
            <Icone className="size-7" />
          </div>
          <div>
            <h1 className="font-heading text-lg font-semibold">{titulo}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{texto}</p>
          </div>
          <Button variant="outline" onClick={sair} className="mt-2">
            <LogOut className="size-4" />
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
