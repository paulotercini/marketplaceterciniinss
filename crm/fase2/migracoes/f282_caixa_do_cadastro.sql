-- F282 · o cadastro em "Primeira letra maiúscula" (pedido do Paulo de 26.10.2026).
-- O dossiê (extensão), o PDF do CNIS (F29), o PAT e o To Do gravam nome, nome da mãe
-- e endereço em CAIXA ALTA. O gatilho converte na gravação, venha de onde vier, e só
-- o texto que está todo em maiúsculas: o que foi digitado à mão não muda.
-- Preposições e artigos ficam minúsculos (menos na primeira palavra); siglas, UF
-- depois de "/" ou " - " e algarismos romanos ficam maiúsculos. uf e rg_orgao não passam.

create or replace function caixa_do_cadastro(t text) returns text
language plpgsql immutable as $$
declare
  miudas text[] := array['de','da','do','das','dos','e','em','na','no','nas','nos','com'];
  siglas text[] := array['CEP','CPF','NIT','PIS','INSS','CNPJ','CTPS','RG','SSP','COHAB','CDHU','BNH','ME','EPP',
                         'II','III','IV','VI','VII','VIII','IX','XI','XII','XIII','XIV','XV','XX','XXI','XXII','XXIII'];
  ufs text[] := array['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI',
                      'RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
  w text; ant text := ''; r text[] := '{}'; i int := 0; uf text;
begin
  if t is null or t !~ '[A-Za-zÀ-ÿ]' or t <> upper(t) then return t; end if;
  foreach w in array regexp_split_to_array(btrim(regexp_replace(t, '\s+', ' ', 'g')), ' ') loop
    i := i + 1;
    if regexp_replace(w, '[[:punct:]]', '', 'g') = any(siglas)
       or (ant = '-' and regexp_replace(w, '[[:punct:]]', '', 'g') = any(ufs)) then
      null;                                            -- fica como veio
    elsif i > 1 and lower(w) = any(miudas) then
      w := lower(w);
    else
      w := initcap(lower(w));
      uf := substring(w from '/([A-Za-z]{2})[[:punct:]]*$');
      if upper(uf) = any(ufs) then w := regexp_replace(w, '/' || uf, '/' || upper(uf)); end if;
    end if;
    r := r || w; ant := w;
  end loop;
  return array_to_string(r, ' ');
end $$;

create or replace function clientes_caixa() returns trigger language plpgsql as $$
begin
  new.nome        := caixa_do_cadastro(new.nome);
  new.nome_mae    := caixa_do_cadastro(new.nome_mae);
  new.profissao   := caixa_do_cadastro(new.profissao);
  new.logradouro  := caixa_do_cadastro(new.logradouro);
  new.complemento := caixa_do_cadastro(new.complemento);
  new.bairro      := caixa_do_cadastro(new.bairro);
  new.cidade      := caixa_do_cadastro(new.cidade);
  new.endereco    := caixa_do_cadastro(new.endereco);
  new.uf          := upper(new.uf);
  return new;
end $$;

drop trigger if exists clientes_caixa on clientes;
create trigger clientes_caixa before insert or update of nome, nome_mae, profissao, logradouro, complemento, bairro, cidade, endereco, uf
  on clientes for each row execute function clientes_caixa();

-- os já gravados: o valor vai convertido, porque o a_sem_mudanca (suppress_redundant_updates_trigger,
-- que roda antes) descarta o "set x = x" sem chegar ao clientes_caixa
update clientes set nome = caixa_do_cadastro(nome), nome_mae = caixa_do_cadastro(nome_mae),
                    logradouro = caixa_do_cadastro(logradouro), complemento = caixa_do_cadastro(complemento),
                    bairro = caixa_do_cadastro(bairro), cidade = caixa_do_cadastro(cidade), endereco = caixa_do_cadastro(endereco)
 where (nome ~ '[A-Za-zÀ-ÿ]' and nome = upper(nome))
    or (nome_mae ~ '[A-Za-zÀ-ÿ]' and nome_mae = upper(nome_mae))
    or (logradouro ~ '[A-Za-zÀ-ÿ]' and logradouro = upper(logradouro))
    or (complemento ~ '[A-Za-zÀ-ÿ]' and complemento = upper(complemento))
    or (bairro ~ '[A-Za-zÀ-ÿ]' and bairro = upper(bairro))
    or (cidade ~ '[A-Za-zÀ-ÿ]' and cidade = upper(cidade))
    or (endereco ~ '[A-Za-zÀ-ÿ]' and endereco = upper(endereco));
