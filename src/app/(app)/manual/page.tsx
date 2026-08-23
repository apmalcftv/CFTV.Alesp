import type { Metadata } from "next";
import { Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Manual do Sistema" };

// Servido de public/manual/ — passa pela mesma guarda de autenticação do
// proxy.ts que protege as demais rotas internas (a extensão .pdf não está
// na lista de exclusão do matcher, então o arquivo não é público).
const MANUAL_URL = "/manual/Manual-CFTV-Alesp.pdf";

export default function ManualPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Manual do Sistema
          </h1>
          <p className="text-sm text-muted-foreground">
            Manual de utilização do CFTV Alesp
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href={MANUAL_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              Abrir em nova aba
            </a>
          </Button>
          <Button asChild>
            <a href={MANUAL_URL} download="Manual-CFTV-Alesp.pdf">
              <Download className="size-4" />
              Baixar manual
            </a>
          </Button>
        </div>
      </div>

      <Card className="gap-0 p-0">
        <CardContent className="p-0">
          <iframe
            src={MANUAL_URL}
            title="Manual do Sistema — CFTV Alesp"
            className="h-[75vh] w-full rounded-xl"
          />
        </CardContent>
      </Card>
    </div>
  );
}
