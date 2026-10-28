/* =========================================================
   storage.js — Camada de dados (armazenamento).

   Hoje os dados ficam no localStorage do navegador.
   TODA leitura e gravação do sistema passa por este objeto "DB".
   Para trocar por um banco de dados no futuro (API própria,
   Firebase, Supabase etc.), basta reescrever as funções abaixo
   mantendo os mesmos nomes, parâmetros e formatos de retorno.

   Coleções:
   - clientes:    { id, nome, documento, telefone, whatsapp, email, endereco, observacoes, criadoEm }
   - orcamentos:  { id, numero, clienteId, data, validade, itens:[{descricao, quantidade, valorUnitario}],
                    descontoTipo:'valor'|'percentual', descontoValor, observacoes,
                    status:'rascunho'|'enviado'|'aprovado'|'recusado', lancamentoId, criadoEm }
   - lancamentos: { id, tipo:'entrada'|'despesa', descricao, valor, data, categoria, clienteId,
                    formaPagamento, status:'pago'|'pendente', pagoEm, orcamentoId, criadoEm }
   ========================================================= */
'use strict';

const DB = (() => {
  const CHAVE = 'gestaoFinanceira:v1';
  const COLECOES = ['clientes', 'orcamentos', 'lancamentos'];
  let estado = null;

  function estadoPadrao() {
    return {
      versao: 1,
      config: {
        usuario: 'Flávio',
        empresa: {
          nome: 'Minha Empresa',
          documento: '',
          telefone: '',
          email: '',
          endereco: '',
          logo: '' // imagem em base64 (data URL)
        },
        categorias: {
          entrada: ['Serviço', 'Venda de produto', 'Outros'],
          despesa: ['Aluguel', 'Material', 'Salários', 'Energia e água', 'Internet e telefone', 'Impostos', 'Transporte', 'Outros']
        },
        formasPagamento: ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Boleto', 'Transferência']
      },
      clientes: [],
      orcamentos: [],
      lancamentos: [],
      proximoNumeroOrcamento: 1
    };
  }

  /** Garante que dados antigos/importados tenham todos os campos esperados. */
  function completar(obj) {
    const p = estadoPadrao();
    const cfg = obj.config || {};
    return {
      ...p,
      ...obj,
      config: {
        ...p.config,
        ...cfg,
        empresa: { ...p.config.empresa, ...(cfg.empresa || {}) },
        categorias: { ...p.config.categorias, ...(cfg.categorias || {}) }
      },
      clientes: Array.isArray(obj.clientes) ? obj.clientes : [],
      orcamentos: Array.isArray(obj.orcamentos) ? obj.orcamentos : [],
      lancamentos: Array.isArray(obj.lancamentos) ? obj.lancamentos : []
    };
  }

  function ler() {
    try {
      const texto = localStorage.getItem(CHAVE);
      return texto ? completar(JSON.parse(texto)) : null;
    } catch (erro) {
      console.warn('Não foi possível ler os dados salvos:', erro);
      return null;
    }
  }

  function gravar() {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(estado));
      return true;
    } catch (erro) {
      console.error(erro);
      if (window.UI) UI.toast('Não foi possível salvar. O espaço do navegador pode estar cheio.', 'erro');
      return false;
    }
  }

  const copia = obj => JSON.parse(JSON.stringify(obj));

  return {
    /** Carrega os dados. No primeiro acesso, já traz os dados de exemplo. */
    iniciar() {
      estado = ler();
      if (!estado) {
        estado = estadoPadrao();
        this.carregarExemplos();
      }
    },

    /* ----- Operações genéricas por coleção ----- */
    listar(colecao) {
      return copia(estado[colecao]);
    },

    obter(colecao, id) {
      const reg = estado[colecao].find(r => r.id === id);
      return reg ? copia(reg) : null;
    },

    /** Cria (sem id) ou atualiza (com id) um registro. Retorna o registro salvo. */
    salvar(colecao, registro) {
      const lista = estado[colecao];
      const reg = copia(registro);
      if (!reg.id) {
        reg.id = Util.uid();
        reg.criadoEm = new Date().toISOString();
        lista.push(reg);
      } else {
        const i = lista.findIndex(r => r.id === reg.id);
        if (i >= 0) lista[i] = { ...lista[i], ...reg, atualizadoEm: new Date().toISOString() };
        else lista.push(reg);
      }
      gravar();
      return copia(lista.find(r => r.id === reg.id));
    },

    /** Altera apenas alguns campos de um registro. */
    atualizar(colecao, id, campos) {
      const reg = estado[colecao].find(r => r.id === id);
      if (!reg) return null;
      Object.assign(reg, campos, { atualizadoEm: new Date().toISOString() });
      gravar();
      return copia(reg);
    },

    remover(colecao, id) {
      estado[colecao] = estado[colecao].filter(r => r.id !== id);
      gravar();
    },

    /** Ao excluir um cliente, o histórico continua salvo, apenas sem cliente vinculado. */
    removerCliente(id) {
      estado.clientes = estado.clientes.filter(c => c.id !== id);
      estado.orcamentos.forEach(o => { if (o.clienteId === id) o.clienteId = null; });
      estado.lancamentos.forEach(l => { if (l.clienteId === id) l.clienteId = null; });
      gravar();
    },

    /* ----- Configurações ----- */
    config() {
      return copia(estado.config);
    },

    salvarConfig(campos) {
      estado.config = { ...estado.config, ...campos };
      gravar();
      return this.config();
    },

    /** Mostra qual será o próximo número de orçamento, sem reservá-lo. */
    espiarNumeroOrcamento() {
      const maior = Math.max(0, ...estado.orcamentos.map(o => o.numero || 0));
      return Math.max(estado.proximoNumeroOrcamento || 1, maior + 1);
    },

    /** Reserva o próximo número de orçamento (0001, 0002...). */
    proximoNumeroOrcamento() {
      const n = this.espiarNumeroOrcamento();
      estado.proximoNumeroOrcamento = n + 1;
      gravar();
      return n;
    },

    /* ----- Dados de exemplo ----- */
    temExemplos() {
      return COLECOES.some(c => estado[c].some(r => r.exemplo));
    },

    carregarExemplos() {
      const ex = Exemplos.gerar();
      // Evita repetir números de orçamento já usados
      const base = Math.max(0, ...estado.orcamentos.map(o => o.numero || 0));
      ex.orcamentos.forEach(o => { o.numero += base; });
      ex.lancamentos.forEach(l => {
        if (l.orcamentoId) {
          const o = ex.orcamentos.find(x => x.id === l.orcamentoId);
          if (o) l.descricao = l.descricao.replace(/Nº \d+/, 'Nº ' + Fmt.numeroOrcamento(o.numero));
        }
      });
      // Remove exemplos antigos antes de recarregar
      COLECOES.forEach(c => { estado[c] = estado[c].filter(r => !r.exemplo).concat(ex[c]); });
      estado.proximoNumeroOrcamento = Math.max(estado.proximoNumeroOrcamento || 1, base + ex.proximoNumeroOrcamento);
      gravar();
    },

    limparExemplos() {
      const idsClientes = new Set(estado.clientes.filter(c => c.exemplo).map(c => c.id));
      COLECOES.forEach(c => { estado[c] = estado[c].filter(r => !r.exemplo); });
      // Registros do usuário que apontavam para clientes de exemplo ficam sem cliente
      estado.orcamentos.forEach(o => { if (idsClientes.has(o.clienteId)) o.clienteId = null; });
      estado.lancamentos.forEach(l => { if (idsClientes.has(l.clienteId)) l.clienteId = null; });
      if (!estado.orcamentos.length) estado.proximoNumeroOrcamento = 1;
      gravar();
    },

    /* ----- Backup ----- */
    exportarBackup() {
      return JSON.stringify({ ...estado, exportadoEm: new Date().toISOString(), app: 'gestao-financeira' }, null, 2);
    },

    /** Substitui todos os dados pelos do arquivo de backup. Lança erro se o arquivo for inválido. */
    importarBackup(texto) {
      let obj;
      try { obj = JSON.parse(texto); } catch (e) { throw new Error('O arquivo escolhido não é um backup válido.'); }
      if (!obj || typeof obj !== 'object' || !COLECOES.every(c => Array.isArray(obj[c]))) {
        throw new Error('O arquivo escolhido não parece ser um backup deste sistema.');
      }
      delete obj.exportadoEm;
      delete obj.app;
      estado = completar(obj);
      gravar();
    },

    apagarTudo() {
      const config = estado.config;
      estado = estadoPadrao();
      estado.config = { ...estado.config, usuario: config.usuario, empresa: config.empresa };
      gravar();
    }
  };
})();
