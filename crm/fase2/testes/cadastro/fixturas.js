// Dados FICTÍCIOS para a fumaça da F9.2. Nenhum dado real de cliente.
const EU = "11111111-1111-1111-1111-111111111111";
const AUTH = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const CLI_CHEIO = "c0000000-0000-0000-0000-000000000001";
const CLI_VAZIO = "c0000000-0000-0000-0000-000000000002";
const CASO1 = "k0000000-0000-0000-0000-000000000001".replace(/^k/, "b");

const hoje = new Date().toISOString().slice(0, 10);

const FIX = {
  colaboradores: [
    { id: EU, auth_id: AUTH, nome: "Paulo Tercini", inicial: "P", cor: "#2564cf",
      papel: "admin", ativo: true, atende_zap: true, cargo: "advogado", setor: null },
  ],
  clientes: [
    { id: CLI_CHEIO, nome: "Aurélia Ficta de Souza", cpf: "12345678909", dn: "14031962",
      telefone: "(16) 99999-0001",
      telefones: [{ numero: "(16) 99999-0001", obs: "principal", zap: true },
                  { numero: "(16) 3242-0000", obs: "recado da filha", zap: false }],
      endereco: null, logradouro: null, numero: null, complemento: null, bairro: null,
      cidade: null, uf: null, cep: null,
      rg: "12.345.678-9", rg_orgao: "SSP/SP", estado_civil: "casado",
      profissao: "costureira", sexo: "F", nome_mae: null, pis_nit: null,
      campos: {}, criado_em: "2026-01-10T12:00:00Z" },
    { id: CLI_VAZIO, nome: "Belmiro Inventado Nogueira", cpf: null, dn: null,
      telefone: null, telefones: [], endereco: null,
      rg: null, rg_orgao: null, estado_civil: null, profissao: null, sexo: null,
      nome_mae: null, pis_nit: null, campos: {}, criado_em: "2026-08-01T12:00:00Z" },
  ],
  casos: [
    { id: CASO1, cliente_id: CLI_CHEIO, titulo: "Aposentadoria por idade rural",
      beneficio: "Aposentadoria por idade rural", especie: "B41", fase: "inss",
      origem_lista: "🌻 INSS", protocolos: ["1234567890"], processos: [], crps_nups: [],
      marcadores: [], arquivados: {}, ronda: {}, importante: false, urgente: false,
      dcb_prorrogacao_pedida: false, renda_acima_minimo: false,
      criado_em: "2026-02-01T12:00:00Z", prazo: null, revisado_em: hoje },
  ],
  atribuicoes: [{ caso_id: CASO1, colaborador_id: EU }],
  credenciais: [
    { id: "d0000000-0000-0000-0000-000000000001", cliente_id: CLI_CHEIO,
      tipo: "meu_inss", criado_em: "2026-02-01T12:00:00Z" },
  ],
  documentos_beneficio: [
    { id: "e0000000-0000-0000-0000-000000000001", beneficio: "Aposentadoria por idade rural",
      itens: "RG\nCPF\nComprovante de endereço", extras: "Notas de produtor", observacoes: "" },
  ],
  modelos_documento: [
    { id: "f0000000-0000-0000-0000-000000000001", titulo: "Procuração",
      categoria: "geral", conteudo: "Eu, {nome}, CPF {cpf}, residente em {endereco}…" },
  ],
  config_app: [{ chave: "todo_sync_em", valor: new Date().toISOString(), atualizado: new Date().toISOString() }],
};

const VAZIAS = ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes",
  "mencoes", "leads", "checklist_modelo", "frases_prontas", "lembrar_motivos", "rotinas",
  "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario",
  "andamento_tarefas", "lembretes", "vinculos", "anexos", "conversas", "coletas",
  "modelos_mensagem", "andamentos_lidos", "credencial_vis"];

const SESSAO = {
  access_token: "token-ficticio", refresh_token: "refresh-ficticio",
  expires_in: 3600, token_type: "bearer", user: { id: AUTH, email: "teste@exemplo.invalido" },
};

module.exports = { FIX, VAZIAS, SESSAO, EU, CLI_CHEIO, CLI_VAZIO, CASO1 };
