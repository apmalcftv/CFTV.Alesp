import type { Metadata } from "next";
import { MarcaForm } from "./marca-form";

export const metadata: Metadata = { title: "Marca e identidade" };

export default function MarcaPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Marca e identidade
        </h1>
        <p className="text-sm text-muted-foreground">
          Personalize o nome, os textos e as cores do sistema para a sua
          organização. As mudanças valem para todos os usuários.
        </p>
      </div>
      <MarcaForm />
    </div>
  );
}
