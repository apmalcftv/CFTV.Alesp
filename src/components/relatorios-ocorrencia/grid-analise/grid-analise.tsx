"use client";

import { useMemo, useRef, useState, type ClipboardEvent as ReactClipboardEvent } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  DataGrid,
  SelectColumn,
  textEditor,
  type CellKeyDownArgs,
  type CellKeyboardEvent,
  type CellPasteArgs,
  type Column,
  type ColumnWidths,
  type DataGridHandle,
  type SortColumn,
} from "react-data-grid";
import { Copy, Loader2, Plus, Redo2, Search, Trash2, Undo2, Upload } from "lucide-react";
import type { CameraDash } from "@/services/dashboard";
import type { PerfilUsuario } from "@/types/domain";
import type { Marcador } from "@/types/relatorios-ocorrencia";
import { lerPlanilhaAnaliseModelo } from "@/services/importador-timeline";
import { criarEditorAutocomplete, criarEditorHora, EditorData } from "./editores-celula";
import {
  destaqueDaLinha,
  DESTAQUE_CLASSE,
  linhaDuplicada,
  linhaVazia,
  ordenarPorHorario,
  type LinhaGrid,
} from "./tipos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CHAVE_LARGURAS = "grid-analise-larguras-colunas";

function carregarLarguras(): ColumnWidths {
  try {
    const bruto = localStorage.getItem(CHAVE_LARGURAS);
    if (!bruto) return new Map();
    return new Map(Object.entries(JSON.parse(bruto) as Record<string, number>).map(
      ([chave, largura]) => [chave, { type: "resized", width: largura }]
    ));
  } catch {
    return new Map();
  }
}

function salvarLarguras(larguras: ColumnWidths) {
  try {
    const plano: Record<string, number> = {};
    larguras.forEach((valor, chave) => {
      if (valor.type === "resized") plano[chave] = valor.width;
    });
    localStorage.setItem(CHAVE_LARGURAS, JSON.stringify(plano));
  } catch {
    // localStorage indisponível — preferência de largura simplesmente não persiste
  }
}

import "react-data-grid/lib/styles.css";

const fmtDataCurta = (v: string) =>
  v ? new Date(`${v}T00:00:00`).toLocaleDateString("pt-BR") : "";

function serializarTsv(linhas: LinhaGrid[], colunas: (keyof LinhaGrid)[]): string {
  return linhas.map((l) => colunas.map((c) => String(l[c] ?? "")).join("\t")).join("\n");
}

export function GridAnalise({
  linhas,
  aplicarLinhas,
  desfazer,
  refazer,
  podeDesfazer,
  podeRefazer,
  dataAnalise,
  operadorId,
  operadorTexto,
  cameras,
  operadores,
  marcadores,
  aoCriarMarcador,
  editavel,
}: {
  linhas: LinhaGrid[];
  aplicarLinhas: (linhas: LinhaGrid[], registrarHistorico?: boolean) => void;
  desfazer: () => void;
  refazer: () => void;
  podeDesfazer: boolean;
  podeRefazer: boolean;
  dataAnalise: string;
  operadorId: string | null;
  operadorTexto: string;
  cameras: CameraDash[];
  /** Já vem filtrado por `listarOperadoresAnalise()` — o componente não
      reaplica regra de papel nenhuma, para não existir uma segunda versão
      da regra divergindo da do serviço. */
  operadores: PerfilUsuario[];
  marcadores: Marcador[];
  aoCriarMarcador: (nome: string) => Promise<{ id: string; texto: string } | undefined>;
  editavel: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const gridRef = useRef<DataGridHandle>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [busca, setBusca] = useState("");
  const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([]);
  const [selecionadas, setSelecionadas] = useState<ReadonlySet<string>>(new Set());
  const [importando, setImportando] = useState(false);
  const [larguras, setLarguras] = useState<ColumnWidths>(() => carregarLarguras());

  function aoRedimensionarColunas(novasLarguras: ColumnWidths) {
    setLarguras(novasLarguras);
    salvarLarguras(novasLarguras);
  }

  const numeroPorId = useMemo(() => {
    const mapa = new Map<string, number>();
    linhas.forEach((l, i) => mapa.set(l.id, i + 1));
    return mapa;
  }, [linhas]);

  const opcoesCamera = useMemo(
    () => cameras.map((c) => ({ id: c.id, texto: `Câmera ${c.numero}` })),
    [cameras]
  );
  const opcoesOperador = useMemo(
    () => operadores.map((p) => ({ id: p.id, texto: p.nome })),
    [operadores]
  );
  const opcoesMarcador = useMemo(
    () => marcadores.map((m) => ({ id: m.id, texto: m.nome })),
    [marcadores]
  );

  const EditorCamera = useMemo(
    () =>
      criarEditorAutocomplete({
        campoId: "cameraId",
        campoTexto: "cameraTexto",
        listar: () => opcoesCamera,
      }),
    [opcoesCamera]
  );
  const EditorOperador = useMemo(
    () =>
      criarEditorAutocomplete({
        campoId: "operadorId",
        campoTexto: "operadorTexto",
        listar: () => opcoesOperador,
      }),
    [opcoesOperador]
  );
  const EditorMarcador = useMemo(
    () =>
      criarEditorAutocomplete({
        campoId: "marcadorId",
        campoTexto: "marcadorTexto",
        listar: () => opcoesMarcador,
        criavel: true,
        aoCriar: aoCriarMarcador,
      }),
    [opcoesMarcador, aoCriarMarcador]
  );

  const ULTIMA_COLUNA = "marcadorTexto";

  const colunas = useMemo<readonly Column<LinhaGrid>[]>(
    () => [
      ...(editavel ? [SelectColumn] : []),
      {
        key: "numero",
        name: "Nº",
        width: 56,
        frozen: true,
        resizable: false,
        renderCell: ({ row }) => numeroPorId.get(row.id) ?? "",
      },
      {
        key: "horarioInicial",
        name: "Horário Inicial",
        width: 110,
        frozen: true,
        editable: editavel,
        renderEditCell: criarEditorHora("horarioInicial"),
      },
      {
        key: "horarioFinal",
        name: "Horário Final",
        width: 110,
        frozen: true,
        editable: editavel,
        renderEditCell: criarEditorHora("horarioFinal"),
      },
      {
        key: "data",
        name: "Data",
        width: 110,
        editable: editavel,
        renderEditCell: EditorData,
        renderCell: ({ row }) => fmtDataCurta(row.data),
      },
      {
        key: "cameraTexto",
        name: "Câmera",
        width: 130,
        editable: editavel,
        renderEditCell: EditorCamera,
      },
      {
        key: "localTexto",
        // Texto livre: a referência do lugar é escrita como faz sentido na
        // investigação, sem depender do catálogo `locais`.
        name: "Local",
        width: 150,
        editable: editavel,
        renderEditCell: textEditor,
      },
      {
        key: "descricao",
        name: "Descrição do Evento",
        minWidth: 400,
        editable: editavel,
        renderEditCell: textEditor,
      },
      {
        key: "operadorTexto",
        name: "Operador",
        width: 150,
        editable: editavel,
        renderEditCell: EditorOperador,
      },
      {
        key: ULTIMA_COLUNA,
        name: "Marcador",
        width: 130,
        editable: editavel,
        renderEditCell: EditorMarcador,
      },
      {
        key: "comentarioInterno",
        name: "Comentário interno",
        width: 180,
        editable: editavel,
        cellClass: "italic text-muted-foreground",
        renderEditCell: textEditor,
      },
    ],
    [editavel, numeroPorId, EditorCamera, EditorOperador, EditorMarcador]
  );

  const linhasFiltradas = useMemo(() => {
    const alvo = busca.trim().toLowerCase();
    if (!alvo) return linhas;
    return linhas.filter((l) =>
      [l.descricao, l.cameraTexto, l.localTexto, l.operadorTexto, l.marcadorTexto, l.comentarioInterno]
        .join(" ")
        .toLowerCase()
        .includes(alvo)
    );
  }, [linhas, busca]);

  function novaLinha() {
    aplicarLinhas([...linhas, linhaVazia(dataAnalise, operadorId, operadorTexto)]);
  }

  function excluirSelecionadas() {
    if (selecionadas.size === 0) return;
    aplicarLinhas(linhas.filter((l) => !selecionadas.has(l.id)));
    setSelecionadas(new Set());
  }

  function duplicarSelecionadas() {
    if (selecionadas.size === 0) return;
    const novas = linhas.filter((l) => selecionadas.has(l.id)).map(linhaDuplicada);
    aplicarLinhas([...linhas, ...novas]);
  }

  function copiarSelecionadas() {
    const alvo = linhas.filter((l) => selecionadas.has(l.id));
    if (alvo.length === 0) return;
    const tsv = serializarTsv(alvo, [
      "data",
      "horarioInicial",
      "horarioFinal",
      "cameraTexto",
      "localTexto",
      "descricao",
      "operadorTexto",
      "marcadorTexto",
      "comentarioInterno",
    ]);
    navigator.clipboard.writeText(tsv).then(() => toast.success(`${alvo.length} linha(s) copiada(s)`));
  }

  function ordenarPorHorarioAgora() {
    aplicarLinhas(ordenarPorHorario(linhas));
  }

  function aoTeclarCelula(
    args: CellKeyDownArgs<LinhaGrid>,
    event: CellKeyboardEvent
  ) {
    const ctrl = event.ctrlKey || event.metaKey;
    if (args.mode === "SELECT") {
      if (ctrl && event.key.toLowerCase() === "z") {
        event.preventDefault();
        desfazer();
        return;
      }
      if (ctrl && event.key.toLowerCase() === "y") {
        event.preventDefault();
        refazer();
        return;
      }
      if (ctrl && event.key.toLowerCase() === "c" && selecionadas.size > 0) {
        event.preventDefault();
        copiarSelecionadas();
        return;
      }
      if (ctrl && event.key.toLowerCase() === "d") {
        event.preventDefault();
        setSelecionadas(new Set([args.row.id]));
        duplicarSelecionadas();
        return;
      }
    }

    if (event.key === "Enter" && args.column.key === ULTIMA_COLUNA) {
      const naUltimaLinha = args.rowIdx === linhas.length - 1;
      if (naUltimaLinha) {
        event.preventDefault();
        if (args.mode === "EDIT") args.onClose(true, false);
        const nova = linhaVazia(dataAnalise, operadorId, operadorTexto);
        aplicarLinhas([...linhas, nova]);
        requestAnimationFrame(() => {
          gridRef.current?.selectCell({ rowIdx: linhas.length, idx: editavel ? 1 : 0 }, { enableEditor: true });
        });
      }
    }
  }

  function aoColar(
    args: CellPasteArgs<LinhaGrid>,
    event: ReactClipboardEvent<HTMLDivElement>
  ): LinhaGrid {
    const texto = event.clipboardData?.getData("text/plain") ?? "";
    const blocos = texto
      .replace(/\r/g, "")
      .split("\n")
      .filter((l: string, i: number, arr: string[]) => !(i === arr.length - 1 && l === ""));
    if (blocos.length === 0) return args.row;

    const colunasEdicao: (keyof LinhaGrid)[] = [
      "data",
      "horarioInicial",
      "horarioFinal",
      "cameraTexto",
      "localTexto",
      "descricao",
      "operadorTexto",
      "marcadorTexto",
      "comentarioInterno",
    ];
    const indiceColunaAlvo = colunasEdicao.indexOf(args.column.key as keyof LinhaGrid);
    if (indiceColunaAlvo === -1) return args.row;

    const indiceLinhaAlvo = linhas.findIndex((l) => l.id === args.row.id);
    if (indiceLinhaAlvo === -1) return args.row;

    const novasLinhas = [...linhas];
    blocos.forEach((linhaTexto: string, offset: number) => {
      const celulas = linhaTexto.split("\t");
      const idx = indiceLinhaAlvo + offset;
      while (idx >= novasLinhas.length) {
        novasLinhas.push(linhaVazia(dataAnalise, operadorId, operadorTexto));
      }
      const alvo = { ...novasLinhas[idx] };
      celulas.forEach((valor: string, j: number) => {
        const campo = colunasEdicao[indiceColunaAlvo + j];
        if (!campo) return;
        // colunas de vínculo (câmera/local/operador/marcador) só aceitam texto
        // — sem um id resolvido, o valor fica só como rótulo até o operador
        // reabrir a célula e escolher/criar a opção correspondente.
        (alvo as unknown as Record<string, string>)[campo] = valor;
      });
      novasLinhas[idx] = alvo;
    });

    aplicarLinhas(novasLinhas);
    toast.success(`${blocos.length} linha(s) colada(s)`);
    return args.row;
  }

  async function importarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    setImportando(true);
    try {
      const resultado = await lerPlanilhaAnaliseModelo(arquivo, cameras, operadorId, operadorTexto);
      if (resultado.linhas.length > 0) {
        aplicarLinhas([...linhas, ...resultado.linhas]);
      }
      resultado.avisos.forEach((a) => toast.warning(a));
      if (resultado.linhas.length > 0) {
        toast.success(`${resultado.linhas.length} linha(s) importada(s) da planilha`);
      }
    } catch (err) {
      toast.error("Não foi possível importar a planilha", { description: (err as Error).message });
    } finally {
      setImportando(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b bg-card px-2 py-1.5">
        {editavel && (
          <>
            <Button size="sm" variant="outline" onClick={novaLinha}>
              <Plus className="size-4" />
              Linha
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={duplicarSelecionadas}
              disabled={selecionadas.size === 0}
            >
              Duplicar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={copiarSelecionadas}
              disabled={selecionadas.size === 0}
            >
              <Copy className="size-4" />
              Copiar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={excluirSelecionadas}
              disabled={selecionadas.size === 0}
            >
              <Trash2 className="size-4" />
              Excluir
            </Button>
            <Button size="sm" variant="outline" onClick={desfazer} disabled={!podeDesfazer}>
              <Undo2 className="size-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={refazer} disabled={!podeRefazer}>
              <Redo2 className="size-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={ordenarPorHorarioAgora}>
              Ordenar por horário
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => importInputRef.current?.click()}
              disabled={importando}
            >
              {importando ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Importar planilha
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={importarArquivo}
            />
          </>
        )}
        <div className="relative ml-auto w-56">
          <Search className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar na análise..."
            className="h-8 pl-7 text-sm"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <DataGrid
          ref={gridRef}
          className={resolvedTheme === "dark" ? "rdg-dark h-full" : "rdg-light h-full"}
          columns={colunas}
          rows={linhasFiltradas}
          onRowsChange={(novas) => aplicarLinhas(novas as LinhaGrid[])}
          rowKeyGetter={(row) => row.id}
          selectedRows={selecionadas}
          onSelectedRowsChange={setSelecionadas}
          sortColumns={sortColumns}
          onSortColumnsChange={setSortColumns}
          columnWidths={larguras}
          onColumnWidthsChange={aoRedimensionarColunas}
          rowClass={(row) => {
            const destaque = destaqueDaLinha(row);
            return destaque ? DESTAQUE_CLASSE[destaque] : undefined;
          }}
          onCellKeyDown={editavel ? aoTeclarCelula : undefined}
          onCellPaste={editavel ? aoColar : undefined}
        />
      </div>
    </div>
  );
}
