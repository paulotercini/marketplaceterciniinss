-- ══════════════════════════════════════════════════════════════════════════
-- F9 · CADASTRO — os campos que os documentos do escritório exigem
-- ══════════════════════════════════════════════════════════════════════════
-- MOSTRAR ANTES DE RODAR (combinado com o Paulo). Só acrescenta colunas: não
-- apaga, não renomeia, não converte dado nenhum. Rodar duas vezes não faz mal
-- (`add column if not exists`).
--
-- POR QUE: os dez modelos .docx do escritório usam 12 marcadores. Sete deles
-- não existiam no cadastro — <RG>, <BAIRRO>, <CIDADE>, <ESTADO>, <CEP>,
-- <ESTADOCIVIL> e <PROFISSAO> — e sem eles nenhuma procuração, contrato ou
-- declaração sai pronta para assinatura.
--
-- ATENÇÃO AO ÍNDICE PARCIAL: não crie índice único com WHERE para servir de
-- alvo de upsert. O PostgREST monta `ON CONFLICT (coluna)` sem o predicado, e
-- o Postgres devolve 42P10 — foi o que travou as 2.621 parcelas por dias.

-- ── 1. Identidade civil ───────────────────────────────────────────────────
alter table clientes add column if not exists rg text;
-- órgão emissor separado: "12.345.678-9 SSP/SP" num campo só obriga a fatiar
-- string na hora de montar a peça, e fatiar string erra
alter table clientes add column if not exists rg_orgao text;
alter table clientes add column if not exists sexo text;          -- 'F' | 'M'
alter table clientes add column if not exists estado_civil text;  -- solteiro|casado|uniao|viuvo|divorciado
alter table clientes add column if not exists profissao text;
alter table clientes add column if not exists nome_mae text;      -- opcional
alter table clientes add column if not exists pis_nit text;       -- opcional

-- ── 2. Endereço estruturado ───────────────────────────────────────────────
-- A procuração precisa do endereço em pedaços: logradouro e número numa
-- linha, bairro, cidade, UF e CEP em campos próprios.
alter table clientes add column if not exists logradouro text;
alter table clientes add column if not exists numero text;
alter table clientes add column if not exists complemento text;
alter table clientes add column if not exists bairro text;
alter table clientes add column if not exists cidade text;
alter table clientes add column if not exists uf text;
alter table clientes add column if not exists cep text;

-- O QUE JÁ ESTÁ ESCRITO NÃO SE QUEBRA POR VÍRGULA. `clientes.endereco` é
-- texto livre e guarda coisas como "Rua X, 100 - fundos, Centro" e "sítio
-- estrada da Barra km 4". Um split automático acertaria a maioria e erraria
-- uma parte — e o erro iria parar dentro de uma procuração assinada. Por isso
-- o texto antigo é COPIADO para `endereco_legado` e a ficha mostra o aviso
-- "endereço em formato antigo, revisar" até alguém abrir e salvar
-- estruturado. `endereco` continua existindo e sendo usado enquanto isso.
alter table clientes add column if not exists endereco_legado text;
update clientes
   set endereco_legado = endereco
 where coalesce(endereco, '') <> ''
   and endereco_legado is null
   and coalesce(logradouro, '') = '';

-- ── 3. Telefones em lista ─────────────────────────────────────────────────
-- O cliente dá o dele, o do filho e o do trabalho. `telefone` continua sendo
-- o principal (é dele que o WhatsApp sai); a lista guarda o resto, cada item
-- {numero, obs, zap}.
alter table clientes add column if not exists telefones jsonb not null default '[]'::jsonb;
-- quem já tinha um telefone entra na lista com ele, marcado como WhatsApp
update clientes
   set telefones = jsonb_build_array(
         jsonb_build_object('numero', telefone, 'obs', 'principal', 'zap', true))
 where coalesce(telefone, '') <> ''
   and telefones = '[]'::jsonb;

-- ── 4. Quem indicou ───────────────────────────────────────────────────────
alter table clientes add column if not exists indicado_por text;


-- ── conferência desta migração ────────────────────────────────────────────
-- Roda junto e mostra o resultado: uma linha por coluna, ✅ ou ❌.
select case when exists(select 1 from information_schema.columns
                         where table_name='clientes' and column_name=c.nome)
            then '✅ ok' else '❌ FALTA' end as situacao,
       'clientes.' || c.nome as coluna
  from (values ('rg'),('rg_orgao'),('sexo'),('estado_civil'),('profissao'),
               ('nome_mae'),('pis_nit'),('logradouro'),('numero'),('complemento'),
               ('bairro'),('cidade'),('uf'),('cep'),('endereco_legado'),
               ('telefones'),('indicado_por')) as c(nome)
 order by 1, 2;
