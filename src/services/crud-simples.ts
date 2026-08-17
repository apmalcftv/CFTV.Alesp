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

    // ATENÇÃO ao alterar os três métodos abaixo: eles pedem `.select("id")`
    // e conferem quantas linhas voltaram, e isso não é enfeite.
    //
    // A RLS **não gera erro** em UPDATE e DELETE — ela FILTRA as linhas.
    // Uma exclusão que o banco recusa volta com `error = null` e zero
    // linhas afetadas. Sem esta conferência, o cliente entende que deu
    // certo e mostra "registro excluído" para uma operação que o banco
    // bloqueou. (INSERT é diferente: o `WITH CHECK` estoura de verdade.)
    async excluir(id: string): Promise<void> {
      const supabase = createClient();
      const { data, error } = await supabase
        .from(tabela)
        .delete()
        .eq("id", id)
        .select("id");
      if (error) throw traduzErro(error);
      if (!data || data.length === 0) {
        throw new Error("Nada foi excluído: você não tem permissão para esta ação.");
      }
    },

    /** Devolve quantas linhas o banco realmente alterou — pode ser menos
        que `ids.length` se a RLS filtrar parte da seleção. */
    async atualizarVarios(ids: string[], valores: Partial<T>): Promise<number> {
      const supabase = createClient();
      const { data, error } = await supabase
        .from(tabela)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- sem Database gerado; ver dashboard.ts
        .update(valores as any)
        .in("id", ids)
        .select("id");
      if (error) throw traduzErro(error);
      if (!data || data.length === 0) {
        throw new Error("Nada foi alterado: você não tem permissão para esta ação.");
      }
      return data.length;
    },

    /** Devolve quantas linhas o banco realmente excluiu. */
    async excluirVarios(ids: string[]): Promise<number> {
      const supabase = createClient();
      const { data, error } = await supabase
        .from(tabela)
        .delete()
        .in("id", ids)
        .select("id");
      if (error) throw traduzErro(error);
      if (!data || data.length === 0) {
        throw new Error("Nada foi excluído: você não tem permissão para esta ação.");
      }
      return data.length;
    },
  };
}
