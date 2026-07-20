"use client";

import { useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface OpcaoSelectMultiplo {
  valor: string;
  rotulo: string;
}

/** Filtro de múltipla seleção (checkboxes) — array vazio representa "todos".
    Mesmo esqueleto do ComboboxCriavel, sem a parte de criar item novo. */
export function SelectMultiplo({
  value,
  onChange,
  opcoes,
  placeholder = "Todos",
  className,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  opcoes: OpcaoSelectMultiplo[];
  placeholder?: string;
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);

  function alternar(valor: string) {
    onChange(
      value.includes(valor)
        ? value.filter((v) => v !== valor)
        : [...value, valor]
    );
  }

  const rotulo =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? (opcoes.find((o) => o.valor === value[0])?.rotulo ?? placeholder)
        : `${value.length} selecionados`;

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={aberto}
          className={cn(
            "w-full min-w-0 justify-between font-normal sm:w-auto sm:min-w-36",
            className
          )}
        >
          <span className={cn("truncate", value.length === 0 && "text-muted-foreground")}>
            {rotulo}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {opcoes.map((o) => (
                <CommandItem
                  key={o.valor}
                  value={o.rotulo}
                  onSelect={() => alternar(o.valor)}
                  className="gap-2"
                >
                  <Checkbox checked={value.includes(o.valor)} />
                  {o.rotulo}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
