"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

/** Envolve a Fullscreen API do navegador sobre um container específico —
    cobre a tela inteira (esconde sidebar/menu do AppShell sem precisar
    alterá-lo) e sincroniza o estado caso o usuário saia com Esc. */
export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const [ativo, setAtivo] = useState(false);

  useEffect(() => {
    function aoMudar() {
      setAtivo(document.fullscreenElement === ref.current);
    }
    document.addEventListener("fullscreenchange", aoMudar);
    return () => document.removeEventListener("fullscreenchange", aoMudar);
  }, [ref]);

  const entrar = useCallback(async () => {
    if (ref.current && !document.fullscreenElement) {
      await ref.current.requestFullscreen();
    }
  }, [ref]);

  const sair = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  }, []);

  const alternar = useCallback(() => {
    if (ativo) sair();
    else entrar();
  }, [ativo, entrar, sair]);

  return { ativo, alternar };
}
