"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface OpcaoCombobox {
  valor: string;
  rotulo: string;
}

/** Select com busca que também permite criar um novo registro a partir do
    texto digitado (usado em Local, na Câmera, e Técnico, na Ocorrência). */
export function ComboboxCriavel({
  value,
  onChange,
  opcoes,
  placeholder = "Selecione",
  buscaPlaceholder = "Buscar...",
  aoCriar,
  rotuloCriar = (termo) => `Criar "${termo}"`,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  opcoes: OpcaoCombobox[];
  placeholder?: string;
  buscaPlaceholder?: string;
  /** Chamado ao confirmar a criação a partir do texto digitado; deve
      retornar o id do item criado (ou undefined se cancelou/falhou). */
  aoCriar?: (termo: string) => Promise<string | undefined>;
  rotuloCriar?: (termo: string) => string;
  disabled?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [criando, setCriando] = useState(false);

  const selecionado = opcoes.find((o) => o.valor === value);
  const buscaExata = opcoes.some(
    (o) => o.rotulo.toLowerCase() === busca.trim().toLowerCase()
  );

  async function criar() {
    if (!aoCriar || !busca.trim() || criando) return;
    setCriando(true);
    try {
      const novoId = await aoCriar(busca.trim());
      if (novoId) {
        onChange(novoId);
        setAberto(false);
        setBusca("");
      }
    } finally {
      setCriando(false);
    }
  }

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={aberto}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !selecionado && "text-muted-foreground")}>
            {selecionado?.rotulo ?? placeholder}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput
            placeholder={buscaPlaceholder}
            value={busca}
            onValueChange={setBusca}
          />
          <CommandList>
            <CommandEmpty>
              {aoCriar && busca.trim() ? (
                <button
                  type="button"
                  onClick={criar}
                  disabled={criando}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  {criando ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  {rotuloCriar(busca.trim())}
                </button>
              ) : (
                <span className="block px-3 py-2 text-sm text-muted-foreground">
                  Nada encontrado
                </span>
              )}
            </CommandEmpty>
            <CommandGroup>
              {opcoes.map((o) => (
                <CommandItem
                  key={o.valor}
                  value={o.rotulo}
                  onSelect={() => {
                    onChange(o.valor);
                    setAberto(false);
                    setBusca("");
                  }}
                >
                  <Check
                    className={cn(
                      "size-4",
                      o.valor === value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {o.rotulo}
                </CommandItem>
              ))}
              {aoCriar && busca.trim() && !buscaExata && opcoes.length > 0 && (
                <CommandItem value={`__criar__${busca}`} onSelect={criar} disabled={criando}>
                  {criando ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  {rotuloCriar(busca.trim())}
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
