"use client";

import { useMemo } from "react";
import type { Camera } from "@/types/domain";
import {
  COLUNAS_CAMERA_EXPORT,
  linhasCamerasExport,
  resumoCameras,
  type CatalogosCamera,
} from "@/services/exportar-cameras";

/** Regras de página válidas só enquanto este bloco está montado (ou seja,
    enquanto há seleção na tela de Câmeras). Paisagem porque o inventário
    tem 12 colunas; `table-header-group` repete o cabeçalho em toda página
    e `break-inside: avoid` impede linha cortada ao meio. */
const CSS_IMPRESSAO = `
@media print {
  @page { size: A4 landscape; margin: 10mm; }
  #area-impressao thead { display: table-header-group; }
  #area-impressao tfoot { display: table-footer-group; }
  #area-impressao tr { break-inside: avoid; }
  #area-impressao .cabecalho-relatorio { break-after: avoid; }
}
`;

const fmtDataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Bloco impresso do inventário de câmeras — invisível na tela
    (`hidden print:block`) e revelado pelo `@media print` global via
    `#area-impressao`. Mesmo padrão do Resumo Executivo dos Relatórios de
    Ocorrências: nada de biblioteca de PDF, é o print do navegador. */
export function AreaImpressaoCameras({
  cameras,
  catalogos,
  nomeSistema,
  logoUrl,
  rodape,
  usuario,
}: {
  /** Já chega filtrada e ordenada igual à tabela, e só com as selecionadas */
  cameras: Camera[];
  catalogos: CatalogosCamera;
  nomeSistema: string;
  logoUrl: string | null;
  rodape: string | null;
  usuario: string;
}) {
  const linhas = useMemo(
    () => linhasCamerasExport(cameras, catalogos),
    [cameras, catalogos]
  );
  const resumo = useMemo(() => resumoCameras(cameras), [cameras]);
  const emitidoEm = fmtDataHora.format(new Date());

  return (
    <div id="area-impressao" className="hidden text-black print:block">
      <style>{CSS_IMPRESSAO}</style>

      <div className="cabecalho-relatorio mb-3 flex items-start justify-between gap-4 border-b pb-2">
        <div className="flex items-center gap-3">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- logo externo por tenant
            <img src={logoUrl} alt="" className="h-10 w-10 object-contain" />
          )}
          <div>
            <h1 className="text-base font-semibold">Inventário de Câmeras</h1>
            <p className="text-[10px] opacity-70">{nomeSistema}</p>
          </div>
        </div>
        <div className="text-right text-[10px] opacity-70">
          <p>Emitido em {emitidoEm}</p>
          <p>Por {usuario}</p>
          <p>{resumo.total} câmera(s) exportada(s)</p>
        </div>
      </div>

      {/* Resumo executivo — serve o documento como relatório gerencial, não
          só como listagem, evitando que o gestor tenha de contar linhas. */}
      <div className="cabecalho-relatorio mb-3">
        <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-70">
          Resumo executivo
        </h2>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px]">
          <span>
            <span className="font-semibold">{resumo.total}</span> total
          </span>
          {resumo.porStatus.map((s) => (
            <span key={s.status}>
              <span className="font-semibold">{s.quantidade}</span> {s.rotulo.toLowerCase()}
            </span>
          ))}
        </div>
      </div>

      <table className="w-full border-collapse text-[9px]">
        <thead>
          <tr className="border-y">
            {COLUNAS_CAMERA_EXPORT.map((coluna) => (
              <th key={coluna} className="px-1 py-1 text-left font-semibold">
                {coluna}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, i) => (
            <tr key={`${linha["Nº"]}-${i}`} className="border-b">
              {COLUNAS_CAMERA_EXPORT.map((coluna) => (
                <td key={coluna} className="px-1 py-0.5 align-top">
                  {linha[coluna] === "" ? "—" : linha[coluna]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 border-t pt-1 text-[9px] opacity-70">
        <p>
          {rodape ?? nomeSistema} · {resumo.total} câmera(s) · Emitido em {emitidoEm} por{" "}
          {usuario}
        </p>
      </div>
    </div>
  );
}
