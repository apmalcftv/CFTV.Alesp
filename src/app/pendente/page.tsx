import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { StatusUsuario } from "@/types/domain";
import { PendenteClient } from "./pendente-client";

export const metadata: Metadata = { title: "Cadastro pendente" };

export default async function PendentePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfis")
    .select("status")
    .eq("id", user.id)
    .single<{ status: StatusUsuario }>();

  if (perfil?.status === "aprovado") redirect("/dashboard");

  return <PendenteClient status={perfil?.status ?? "pendente"} />;
}
