"use client";

import { useEffect, useRef, useState } from "react";
import type { RenderEditCellProps } from "react-data-grid";
import type { LinhaGrid } from "./tipos";

/** Editor de horário (HH:mm) — Enter/Tab commitam e seguem a navegação
    padrão do grid; Escape descarta. */
export function criarEditorHora(campo: "horarioInicial" | "horarioFinal") {
  return function EditorHora({ row, onRowChange, onClose }: RenderEditCellProps<LinhaGrid>) {
    return (
      <input
        autoFocus
        type="time"
        className="h-full w-full border-none bg-transparent px-2 outline-none"
        value={row[campo]}
        onChange={(e) => onRowChange({ ...row, [campo]: e.target.value })}
        onBlur={() => onClose(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose(false);
        }}
      />
    );
  };
}

/** Editor de texto simples (data) — o `textEditor` padrão do react-data-grid
    serve bem para Descrição, mas Data precisa de um `<input type="date">`. */
export function EditorData({ row, onRowChange, onClose }: RenderEditCellProps<LinhaGrid>) {
  return (
    <input
      autoFocus
      type="date"
      className="h-full w-full border-none bg-transparent px-2 outline-none"
      value={row.data}
      onChange={(e) => onRowChange({ ...row, data: e.target.value })}
      onBlur={() => onClose(true)}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose(false);
      }}
    />
  );
}

export interface OpcaoAutocomplete {
  id: string;
  texto: string;
}

/** Editor genérico de autocomplete para Câmera/Local/Operador/Marcador.
    Type-ahead com navegação por seta; Enter/Tab confirmam o item
    destacado. Quando `criavel`, texto sem correspondência cria um
    registro novo no catálogo ao confirmar; quando não, a edição é
    descartada (evita gravar texto livre não vinculado a um id real). */
export function criarEditorAutocomplete<
  CampoId extends keyof LinhaGrid,
  CampoTexto extends keyof LinhaGrid,
>(opcoes: {
  campoId: CampoId;
  campoTexto: CampoTexto;
  listar: () => OpcaoAutocomplete[];
  criavel?: boolean;
  aoCriar?: (nome: string) => Promise<OpcaoAutocomplete | undefined>;
}) {
  return function EditorAutocomplete({ row, onRowChange, onClose }: RenderEditCellProps<LinhaGrid>) {
    const [busca, setBusca] = useState(String(row[opcoes.campoTexto] ?? ""));
    const [indice, setIndice] = useState(0);
    const [criando, setCriando] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, []);

    const todas = opcoes.listar();
    const filtradas = todas
      .filter((o) => o.texto.toLowerCase().includes(busca.trim().toLowerCase()))
      .slice(0, 8);
    const existeExata = todas.some(
      (o) => o.texto.toLowerCase() === busca.trim().toLowerCase()
    );

    function confirmarOpcao(opcao: OpcaoAutocomplete) {
      onRowChange(
        { ...row, [opcoes.campoId]: opcao.id, [opcoes.campoTexto]: opcao.texto } as LinhaGrid,
        true
      );
    }

    async function confirmar() {
      const escolhida = filtradas[indice];
      if (escolhida) {
        confirmarOpcao(escolhida);
        return;
      }
      if (opcoes.criavel && opcoes.aoCriar && busca.trim() && !existeExata) {
        setCriando(true);
        const nova = await opcoes.aoCriar(busca.trim());
        setCriando(false);
        if (nova) {
          confirmarOpcao(nova);
          return;
        }
      }
      onClose(false);
    }

    return (
      <div className="relative h-full w-full">
        <input
          ref={inputRef}
          className="h-full w-full border-none bg-transparent px-2 outline-none"
          value={busca}
          disabled={criando}
          onChange={(e) => {
            setBusca(e.target.value);
            setIndice(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              e.stopPropagation();
              setIndice((i) => Math.min(i + 1, filtradas.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              e.stopPropagation();
              setIndice((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" || e.key === "Tab") {
              confirmar();
            } else if (e.key === "Escape") {
              onClose(false);
            }
          }}
        />
        {(filtradas.length > 0 || (opcoes.criavel && busca.trim() && !existeExata)) && (
          <ul className="absolute top-full left-0 z-50 max-h-48 w-56 overflow-auto rounded-md border bg-popover text-sm shadow-md">
            {filtradas.map((o, i) => (
              <li
                key={o.id}
                className={`cursor-pointer px-2 py-1 ${i === indice ? "bg-accent" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  confirmarOpcao(o);
                }}
              >
                {o.texto}
              </li>
            ))}
            {opcoes.criavel && busca.trim() && !existeExata && (
              <li
                className="cursor-pointer border-t px-2 py-1 text-muted-foreground"
                onMouseDown={(e) => {
                  e.preventDefault();
                  confirmar();
                }}
              >
                {criando ? "Criando…" : `Criar "${busca.trim()}"`}
              </li>
            )}
          </ul>
        )}
      </div>
    );
  };
}
