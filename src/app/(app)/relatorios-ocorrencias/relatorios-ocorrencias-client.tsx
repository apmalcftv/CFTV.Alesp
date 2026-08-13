"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileDown, Plus, Printer, Search, Share2, Upload } from "lucide-react";
import { useRelatoriosOcorrencia } from "@/hooks/use-relatorios-ocorrencia";
import {
  exportarListaRelatoriosExcel,
  exportarResumoExecutivoExcel,
  gerarBlobResumoExecutivoExcel,
} from "@/services/exportar-relatorios-ocorrencia";
import { compartilharArquivo } from "@/services/compartilhamento";
import { useOrdenacao } from "@/hooks/use-ordenacao";
import { usePerfil } from "@/components/perfil-provider";
import { textosDoBranding, useTenant } from "@/components/tenant-branding";
import { hooksDepartamentos, hooksSolicitantes } from "@/hooks/use-cadastros-relatorios-ocorrencia";
import { hooksLocais } from "@/hooks/use-cadastros";
import { RELATORIO_STATUS_LABEL } from "@/types/relatorios-ocorrencia";
import { useMinhasPermissoes } from "@/hooks/use-permissoes";
import { PRIORIDADE_LABEL } from "@/types/domain";
import { BadgeStatusRelatorio } from "@/components/relatorios-ocorrencia/badge-status-relatorio";
import { BadgePrioridade } from "@/components/dashboard/badges";
import { BarraAcoesLote } from "@/components/relatorios-ocorrencia/barra-acoes-lote";
import { DialogoImportarRelatorios } from "@/components/relatorios-ocorrencia/dialogo-importar";
import { Ajuda } from "@/components/ui/ajuda";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CabecalhoOrdenavel } from "@/components/ui/cabecalho-ordenavel";

const fmtData = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });

const TODOS = "todos";

export function RelatoriosOcorrenciasClient() {
  const router = useRouter();
  const perfil = usePerfil();
  const tenant = useTenant();
  const { pode } = useMinhasPermissoes();
  const editavel = pode("cmal_relatorios", "criar");
  // Importar planilha cria relatórios em lote — mesma permissão de criar.
  const podeImportar = pode("cmal_relatorios", "criar");

  const { data: lista, isPending } = useRelatoriosOcorrencia();
  const { data: solicitantes } = hooksSolicitantes.useListar();
  const { data: departamentos } = hooksDepartamentos.useListar();
  const { data: locais } = hooksLocais.useListar();
  const { ordenacao, alternar: alternarOrdenacao, ordenar } = useOrdenacao();

  const [termo, setTermo] = useState("");
  const [status, setStatus] = useState<string>(TODOS);
  const [solicitanteId, setSolicitanteId] = useState<string>(TODOS);
  const [departamentoId, setDepartamentoId] = useState<string>(TODOS);
  const [localId, setLocalId] = useState<string>(TODOS);
  const [importarAberto, setImportarAberto] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  const filtrados = useMemo(() => {
    const alvo = termo.trim().toLowerCase();
    const filtrada = (lista ?? []).filter((r) => {
      if (status !== TODOS && r.status !== status) return false;
      if (solicitanteId !== TODOS && r.solicitante_id !== solicitanteId) return false;
      if (departamentoId !== TODOS && r.departamento_id !== departamentoId) return false;
      if (localId !== TODOS && r.local_id !== localId) return false;
      if (!alvo) return true;
      return (
        String(r.numero).includes(alvo) ||
        (r.numero_memorando ?? "").toLowerCase().includes(alvo) ||
        (r.solicitante?.nome ?? "").toLowerCase().includes(alvo) ||
        (r.departamento?.nome ?? "").toLowerCase().includes(alvo) ||
        (r.operador?.nome ?? "").toLowerCase().includes(alvo) ||
        (r.local?.nome ?? "").toLowerCase().includes(alvo) ||
        r.descricao_fato.toLowerCase().includes(alvo)
      );
    });
    return ordenar(filtrada, {
      numero: (r) => r.numero,
      solicitante: (r) => r.solicitante?.nome ?? "",
      departamento: (r) => r.departamento?.nome ?? "",
      local: (r) => r.local?.nome ?? "",
      operador: (r) => r.operador?.nome ?? "",
      status: (r) => r.status,
      prioridade: (r) => r.prioridade,
      data_solicitacao: (r) => r.data_solicitacao,
    });
  }, [lista, termo, status, solicitanteId, departamentoId, localId, ordenar]);

  const selecionadosObjs = useMemo(
    () => (lista ?? []).filter((r) => selecionados.has(r.id)),
    [lista, selecionados]
  );
  const todosSelecionados =
    filtrados.length > 0 && filtrados.every((r) => selecionados.has(r.id));
  const algumSelecionado = filtrados.some((r) => selecionados.has(r.id));

  function alternarSelecaoTodos() {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (todosSelecionados) {
        for (const r of filtrados) novo.delete(r.id);
      } else {
        for (const r of filtrados) novo.add(r.id);
      }
      return novo;
    });
  }

  function alternarSelecaoItem(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function limparSelecao() {
    setSelecionados(new Set());
  }

  async function exportarSelecaoExcel() {
    await exportarResumoExecutivoExcel(selecionadosObjs);
  }

  function exportarSelecaoPdf() {
    window.print();
  }

  async function compartilharSelecao() {
    const blob = await gerarBlobResumoExecutivoExcel(selecionadosObjs);
    await compartilharArquivo(
      blob,
      "resumo-relatorios-ocorrencias.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  }

  const textosBranding = textosDoBranding(tenant);
  const emitidoEm = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Relatórios de Ocorrências
          </h1>
          <p className="text-sm text-muted-foreground">
            Registro das ocorrências da Central de Monitoramento — indicadores no
            Dashboard e no Executivo CMAL
          </p>
        </div>
        <div className="flex gap-2">
          {podeImportar && (
            <Ajuda texto="Importar histórico de uma planilha Excel">
              <Button variant="outline" onClick={() => setImportarAberto(true)}>
                <Upload className="size-4" />
                Importar planilha
              </Button>
            </Ajuda>
          )}
          <Button
            variant="outline"
            onClick={() => exportarListaRelatoriosExcel(filtrados)}
            disabled={filtrados.length === 0}
          >
            <FileDown className="size-4" />
            Excel
          </Button>
          {editavel && (
            <Button onClick={() => router.push("/relatorios-ocorrencias/novo")}>
              <Plus className="size-4" />
              Novo relatório
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar..."
            className="pl-8"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os status</SelectItem>
            {Object.entries(RELATORIO_STATUS_LABEL).map(([v, r]) => (
              <SelectItem key={v} value={v}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={solicitanteId} onValueChange={setSolicitanteId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Solicitante" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os solicitantes</SelectItem>
            {(solicitantes ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={departamentoId} onValueChange={setDepartamentoId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os departamentos</SelectItem>
            {(departamentos ?? []).map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={localId} onValueChange={setLocalId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Local" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os locais</SelectItem>
            {(locais ?? []).map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <BarraAcoesLote
        quantidade={selecionados.size}
        onLimpar={limparSelecao}
        acoes={
          <>
            <Button size="sm" variant="outline" onClick={exportarSelecaoPdf}>
              <Printer className="size-4" />
              Exportar PDF
            </Button>
            <Button size="sm" variant="outline" onClick={exportarSelecaoExcel}>
              <FileDown className="size-4" />
              Exportar Excel
            </Button>
            <Button size="sm" variant="outline" onClick={compartilharSelecao}>
              <Share2 className="size-4" />
              Compartilhar
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isPending ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : filtrados.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              Nenhum relatório encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        aria-label="Selecionar todos os relatórios filtrados"
                        checked={
                          todosSelecionados ? true : algumSelecionado ? "indeterminate" : false
                        }
                        onCheckedChange={alternarSelecaoTodos}
                      />
                    </TableHead>
                    <TableHead>
                      <CabecalhoOrdenavel chave="numero" rotulo="Nº" ordenacao={ordenacao} onClick={alternarOrdenacao} />
                    </TableHead>
                    <TableHead>
                      <CabecalhoOrdenavel chave="solicitante" rotulo="Solicitante" ordenacao={ordenacao} onClick={alternarOrdenacao} />
                    </TableHead>
                    <TableHead>
                      <CabecalhoOrdenavel chave="departamento" rotulo="Departamento" ordenacao={ordenacao} onClick={alternarOrdenacao} />
                    </TableHead>
                    <TableHead>
                      <CabecalhoOrdenavel chave="local" rotulo="Local" ordenacao={ordenacao} onClick={alternarOrdenacao} />
                    </TableHead>
                    <TableHead>
                      <CabecalhoOrdenavel chave="operador" rotulo="Operador" ordenacao={ordenacao} onClick={alternarOrdenacao} />
                    </TableHead>
                    <TableHead>
                      <CabecalhoOrdenavel chave="status" rotulo="Status" ordenacao={ordenacao} onClick={alternarOrdenacao} />
                    </TableHead>
                    <TableHead>
                      <CabecalhoOrdenavel chave="prioridade" rotulo="Prioridade" ordenacao={ordenacao} onClick={alternarOrdenacao} />
                    </TableHead>
                    <TableHead>
                      <CabecalhoOrdenavel chave="data_solicitacao" rotulo="Solicitação" ordenacao={ordenacao} onClick={alternarOrdenacao} />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((r) => (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/relatorios-ocorrencias/${r.id}`)}
                    >
                      <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          aria-label={`Selecionar relatório ${r.numero}`}
                          checked={selecionados.has(r.id)}
                          onCheckedChange={() => alternarSelecaoItem(r.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">#{r.numero}</TableCell>
                      <TableCell>{r.solicitante?.nome ?? "—"}</TableCell>
                      <TableCell>{r.departamento?.nome ?? "—"}</TableCell>
                      <TableCell>{r.local?.nome ?? "—"}</TableCell>
                      <TableCell>{r.operador?.nome ?? "—"}</TableCell>
                      <TableCell>
                        <BadgeStatusRelatorio status={r.status} />
                      </TableCell>
                      <TableCell>
                        <BadgePrioridade prioridade={r.prioridade} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {fmtData.format(new Date(`${r.data_solicitacao}T00:00:00`))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {podeImportar && (
        <DialogoImportarRelatorios open={importarAberto} onOpenChange={setImportarAberto} />
      )}

      {/* Resumo Executivo — só as colunas da tabela, só os relatórios
          selecionados. Nunca o relatório completo (esse fica só dentro da
          tela de cada relatório). Ver #area-impressao em globals.css. */}
      <div id="area-impressao" className="hidden print:block">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {textosBranding.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- logo externo por tenant
              <img src={textosBranding.logoUrl} alt="" className="h-10 w-10 object-contain" />
            )}
            <div>
              <h1 className="text-lg font-semibold">Resumo dos Relatórios de Ocorrências</h1>
              <p className="text-xs text-muted-foreground">{textosBranding.nomeSistema}</p>
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>Emitido em {emitidoEm}</p>
            <p>Por {perfil.nome}</p>
          </div>
        </div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-1 text-left">Nº</th>
              <th className="py-1 text-left">Solicitante</th>
              <th className="py-1 text-left">Departamento</th>
              <th className="py-1 text-left">Local</th>
              <th className="py-1 text-left">Operador</th>
              <th className="py-1 text-left">Status</th>
              <th className="py-1 text-left">Prioridade</th>
              <th className="py-1 text-left">Solicitação</th>
            </tr>
          </thead>
          <tbody>
            {selecionadosObjs.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="py-1">#{r.numero}</td>
                <td className="py-1">{r.solicitante?.nome ?? "—"}</td>
                <td className="py-1">{r.departamento?.nome ?? "—"}</td>
                <td className="py-1">{r.local?.nome ?? "—"}</td>
                <td className="py-1">{r.operador?.nome ?? "—"}</td>
                <td className="py-1">{RELATORIO_STATUS_LABEL[r.status]}</td>
                <td className="py-1">{PRIORIDADE_LABEL[r.prioridade]}</td>
                <td className="py-1">
                  {fmtData.format(new Date(`${r.data_solicitacao}T00:00:00`))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
