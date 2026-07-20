"use client";

import { createContext, useContext } from "react";
import type { Perfil } from "@/types/domain";

const PerfilContext = createContext<Perfil | null>(null);

export function usePerfil() {
  const perfil = useContext(PerfilContext);
  if (!perfil) {
    throw new Error("usePerfil deve ser usado dentro de <PerfilProvider>");
  }
  return perfil;
}

export function PerfilProvider({
  perfil,
  children,
}: {
  perfil: Perfil;
  children: React.ReactNode;
}) {
  return (
    <PerfilContext.Provider value={perfil}>{children}</PerfilContext.Provider>
  );
}
