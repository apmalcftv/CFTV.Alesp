"use client";

import { FilterX } from "lucide-react";
import type { Catalogos, ItemCatalogo } from "@/services/dashboard";
import {
  FILTROS_INICIAIS,
  type FiltrosDashboard as Filtros,
  type Periodo,
} from "@/services/indicadores";
import { CAMERA_STATUS_LABEL, type CameraStatus } from "@/types/domain";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SelectMultiplo } from "@/components/ui/select-multiplo";

const PERIODOS: { valor: Periodo; rotulo: string }[] = [
  { valor: "7d", rotulo: "Últimos 7 dias" },
  { valor: "30d", rotulo: "Últimos 30 dias" },
  { valor: "90d", rotulo: "Últimos 90 dias" },
  { valor: "12m", rotulo: "Últimos 12 meses" },
  { valor: "tudo", rotulo: "Todo o histórico" },
];

const STATUS_FILTRO: CameraStatus[] = [
  "operante",
  "inoperante",
  "desligada",
  "em_manutencao",
];

function SelectCatalogo({
  rotulo,
  valor,
  itens,
  onChange,
  ajuda,
}: {
  rotulo: string;
  valor: string;
  itens: ItemCatalogo[];
  onChange: (v: string) => void;
  ajuda?: string;
}) {
  return (
    <Select value={valor} onValueChange={onChange}>
      <SelectTrigger
        size="sm"
        className="w-full min-w-0 sm:w-auto sm:min-w-36"
        aria-label={rotulo}
        title={ajuda}
      >
        <SelectValue placeholder={rotulo} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todos">{rotulo}: todos</SelectItem>
        {itens.map((item) => (
          <SelectItem key={item.id} value={item.id}>
            {item.nome}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Linha única de filtros globais — escopam todos os KPIs, gráficos,
    tabelas e rankings abaixo dela. */
export function FiltrosDashboard({
  filtros,
  catalogos,
  onChange,
  incluirDesligadaPermanentemente,
}: {
  filtros: Filtros;
  catalogos: Catalogos | undefined;
  onChange: (f: Filtros) => void;
  /** Só a tela de Relatórios habilita — câmeras desligada_permanentemente
      não devem aparecer como opção de filtro no Dashboard/Executivo. */
  incluirDesligadaPermanentemente?: boolean;
}) {
  const alterado = JSON.stringify(filtros) !== JSON.stringify(FILTROS_INICIAIS);
  const opcoesStatusCamera = (
    incluirDesligadaPermanentemente
      ? [...STATUS_FILTRO, "desligada_permanentemente" as const]
      : STATUS_FILTRO
  ).map((s) => ({ valor: s, rotulo: CAMERA_STATUS_LABEL[s] }));

  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
      <Select
        value={filtros.periodo}
        onValueChange={(v) => onChange({ ...filtros, periodo: v as Periodo })}
      >
        <SelectTrigger
          size="sm"
          className="w-full min-w-0 sm:w-auto sm:min-w-40"
          aria-label="Período"
          title="Recorte de tempo para os indicadores e gráficos abaixo"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIODOS.map((p) => (
            <SelectItem key={p.valor} value={p.valor}>
              {p.rotulo}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <SelectCatalogo
        rotulo="Prédio"
        valor={filtros.predioId}
        itens={catalogos?.predios ?? []}
        onChange={(v) => onChange({ ...filtros, predioId: v })}
        ajuda="Filtra por prédio do Complexo ALESP"
      />

      <SelectMultiplo
        value={filtros.statusCamera}
        onChange={(v) =>
          onChange({ ...filtros, statusCamera: v as CameraStatus[] })
        }
        opcoes={opcoesStatusCamera}
        placeholder="Status da câmera: todos"
        className="sm:min-w-44"
      />

      <SelectCatalogo
        rotulo="Empresa"
        valor={filtros.empresaId}
        itens={catalogos?.empresas ?? []}
        onChange={(v) => onChange({ ...filtros, empresaId: v })}
        ajuda="Filtra por empresa de manutenção responsável"
      />
      <SelectCatalogo
        rotulo="Fabricante"
        valor={filtros.fabricanteId}
        itens={catalogos?.fabricantes ?? []}
        onChange={(v) => onChange({ ...filtros, fabricanteId: v })}
        ajuda="Filtra câmeras pelo fabricante do equipamento"
      />
      <SelectCatalogo
        rotulo="Defeito"
        valor={filtros.tipoDefeitoId}
        itens={catalogos?.tiposDefeito ?? []}
        onChange={(v) => onChange({ ...filtros, tipoDefeitoId: v })}
        ajuda="Filtra ocorrências por tipo de defeito"
      />

      {alterado && (
        <Button
          variant="ghost"
          size="sm"
          className="col-span-2 text-muted-foreground sm:col-span-1"
          onClick={() => onChange(FILTROS_INICIAIS)}
        >
          <FilterX className="size-4" />
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
