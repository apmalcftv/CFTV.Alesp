import { createClient } from "@/lib/supabase/client";

const MENSAGENS_CONSTRAINT: Record<string, string> = {
  cameras_tenant_ip_unico: "Este IP já está cadastrado em outra câmera",
  cameras_tenant_numero_unico: "Já existe uma câmera com esse número",
};

function traduzErro(error: { message: string; code?: string }): Error {
  for (const [constraint, mensagem] of Object.entries(MENSAGENS_CONSTRAINT)) {
    if (error.message.includes(constraint)) return new Error(mensagem);
  }
  if (error.code === "23505") return new Error("Já existe um registro com esses dados");
  return new Error(error.message);
}

/**
 * Fábrica de CRUD para os cadastros de apoio (prédios, locais, fabricantes,
 * modelos, NVRs, empresas, técnicos, tipos de defeito): todas seguem o mesmo
 * formato de tabela simples com RLS por tenant (tenant_id preenchido por
 * trigger — nunca é enviado pelo cliente).
 */
export function criarCrud<T extends { id: string }>(
  tabela: string,
  colunas = "*",
  ordenarPor = "nome"
) {
  return {
    async listar(): Promise<T[]> {
      const supabase = createClient();
      const { data, error } = await supabase
        .from(tabela)
        .select(colunas)
        .order(ordenarPor);
      if (error) throw error;
      return (data ?? []) as unknown as T[];
    },

    async criar(valores: Partial<T>): Promise<T> {
      const supabase = createClient();
      const { data, error } = await supabase
        .from(tabela)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- sem Database gerado; ver dashboard.ts
        .insert(valores as any)
        .select(colunas)
        .single();
      if (error) throw traduzErro(error);
      return data as unknown as T;
    },

    async atualizar(id: string, valores: Partial<T>): Promise<T> {
      const supabase = createClient();
      const { data, error } = await supabase
        .from(tabela)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- sem Database gerado; ver dashboard.ts
        .update(valores as any)
        .eq("id", id)
        .select(colunas)
        .single();
      if (error) throw traduzErro(error);
      return data as unknown as T;
    },

    async excluir(id: string): Promise<void> {
      const supabase = createClient();
      const { error } = await supabase.from(tabela).delete().eq("id", id);
      if (error) throw error;
    },

    async atualizarVarios(ids: string[], valores: Partial<T>): Promise<void> {
      const supabase = createClient();
      const { error } = await supabase
        .from(tabela)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- sem Database gerado; ver dashboard.ts
        .update(valores as any)
        .in("id", ids);
      if (error) throw traduzErro(error);
    },

    async excluirVarios(ids: string[]): Promise<void> {
      const supabase = createClient();
      const { error } = await supabase.from(tabela).delete().in("id", ids);
      if (error) throw error;
    },
  };
}
