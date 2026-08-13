-- ============================================================
-- Coluna "Local" do Grid Investigativo (aba Análise) passa a ser de
-- livre preenchimento: o operador digita a referência do lugar como
-- ela faz sentido na investigação ("Subsolo", "Estacionamento A4",
-- "Próximo ao elevador") sem depender do catálogo `locais` e sem
-- criar cadastro novo por causa de um texto digitado.
--
-- Aditiva de propósito. `local_id` continua existindo e continua
-- válido: nada é convertido, migrado ou apagado. Os eventos já
-- gravados seguem apontando para `locais` e a leitura cai no join
-- quando `local_texto` está nulo (ver eventoParaLinha em
-- grid-analise/tipos.ts).
--
-- Nenhuma policy é criada ou alterada: `relatorio_timeline_eventos`
-- já tem RLS ativa e as policies existentes valem para a tabela
-- inteira, coluna nova incluída.
-- ============================================================

alter table relatorio_timeline_eventos
  add column if not exists local_texto text;
