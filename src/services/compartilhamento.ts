// Compartilhamento de arquivos gerados no navegador (Excel/PDF). Usa a Web
// Share API quando disponível (comum em navegadores mobile); cai para
// download comum quando não há suporte. Não há envio por e-mail nem link
// seguro ainda — ver notas no docs/RELATORIOS_OCORRENCIAS.md sobre a
// integração futura mencionada no pedido original.

function baixarBlob(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}

export async function compartilharArquivo(
  blob: Blob,
  nomeArquivo: string,
  tipoMime: string
): Promise<void> {
  const arquivo = new File([blob], nomeArquivo, { type: tipoMime });
  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean;
    share?: (data: { files: File[]; title?: string }) => Promise<void>;
  };

  if (nav.canShare?.({ files: [arquivo] }) && nav.share) {
    try {
      await nav.share({ files: [arquivo], title: nomeArquivo });
      return;
    } catch {
      // usuário cancelou o compartilhamento — cai para download
    }
  }
  baixarBlob(blob, nomeArquivo);
}

/** Preparado para a integração futura mencionada no pedido — ainda não
    implementado (não há backend de envio de e-mail nem geração de link). */
export function enviarPorEmail(): Promise<void> {
  throw new Error("Envio por e-mail ainda não implementado");
}

export function gerarLinkSeguro(): Promise<string> {
  throw new Error("Geração de link seguro ainda não implementada");
}
