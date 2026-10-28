/* =========================================================
   calculos.js — Regras de negócio e cálculos financeiros.
   Mantido separado das telas para facilitar testes e mudanças.

   Conceitos usados (iguais às dicas "?" das telas):
   - Faturamento: entradas já RECEBIDAS no período.
   - Despesas: despesas já PAGAS no período.
   - Lucro líquido: faturamento - despesas.
   - A receber: entradas ainda PENDENTES.
   - Em atraso: pendentes cuja data já passou.
   ========================================================= */
'use strict';

const Calc = {
  /** 'pago' | 'pendente' | 'atrasado' (atrasado = pendente com data vencida). */
  status(l) {
    if (l.status === 'pago') return 'pago';
    return l.data < Datas.hoje() ? 'atrasado' : 'pendente';
  },

  noPeriodo(lista, inicio, fim, campo = 'data') {
    return lista.filter(x => x[campo] && x[campo].slice(0, 10) >= inicio && x[campo].slice(0, 10) <= fim);
  },

  /** Subtotal, desconto e total de um orçamento. */
  totalOrcamento(o) {
    const subtotal = Util.arred(Util.soma(o.itens || [], i => (Number(i.quantidade) || 0) * (Number(i.valorUnitario) || 0)));
    let desconto = Number(o.descontoValor) || 0;
    if (o.descontoTipo === 'percentual') desconto = subtotal * Math.min(desconto, 100) / 100;
    desconto = Util.arred(Math.min(desconto, subtotal));
    return { subtotal, desconto, total: Util.arred(subtotal - desconto) };
  },

  /** Período imediatamente anterior, do mesmo tamanho (ou mesmos meses, se forem meses cheios). */
  periodoAnterior(inicio, fim) {
    const mesesCheios = inicio.endsWith('-01') && fim === Datas.fimMes(Datas.mes(fim));
    if (mesesCheios) {
      const n = Datas.mesesEntre(inicio, fim).length;
      const ini = Datas.addMeses(Datas.mes(inicio), -n);
      return { inicio: Datas.inicioMes(ini), fim: Datas.fimMes(Datas.addMeses(Datas.mes(fim), -n)) };
    }
    const dias = Datas.diasEntre(inicio, fim) + 1;
    return { inicio: Datas.addDias(inicio, -dias), fim: Datas.addDias(inicio, -1) };
  },

  /** Todos os indicadores de um período. */
  indicadores(inicio, fim) {
    const lancs = this.noPeriodo(DB.listar('lancamentos'), inicio, fim);
    const entradasPagas = lancs.filter(l => l.tipo === 'entrada' && l.status === 'pago');
    const despesasPagas = lancs.filter(l => l.tipo === 'despesa' && l.status === 'pago');
    const pendentes = lancs.filter(l => l.tipo === 'entrada' && l.status !== 'pago');
    const atrasados = pendentes.filter(l => this.status(l) === 'atrasado');

    const faturamento = Util.soma(entradasPagas, l => l.valor);
    const despesas = Util.soma(despesasPagas, l => l.valor);
    const lucro = faturamento - despesas;

    const orcs = this.noPeriodo(DB.listar('orcamentos'), inicio, fim);
    const decididos = orcs.filter(o => o.status !== 'rascunho');
    const aprovados = orcs.filter(o => o.status === 'aprovado');

    return {
      faturamento,
      despesas,
      lucro,
      margem: faturamento > 0 ? (lucro / faturamento) * 100 : 0,
      aReceber: Util.soma(pendentes, l => l.valor),
      emAtraso: Util.soma(atrasados, l => l.valor),
      ticketMedio: entradasPagas.length ? faturamento / entradasPagas.length : 0,
      qtdOrcamentos: orcs.length,
      qtdAprovados: aprovados.length,
      taxaAprovacao: decididos.length ? (aprovados.length / decididos.length) * 100 : 0
    };
  },

  /** Total a receber (todas as entradas pendentes, de qualquer data). */
  aReceberGeral() {
    const pend = DB.listar('lancamentos').filter(l => l.tipo === 'entrada' && l.status !== 'pago');
    return {
      total: Util.soma(pend, l => l.valor),
      atrasado: Util.soma(pend.filter(l => this.status(l) === 'atrasado'), l => l.valor),
      qtd: pend.length
    };
  },

  /** Entradas e despesas pagas, mês a mês. */
  serieMensal(meses) {
    const lancs = DB.listar('lancamentos').filter(l => l.status === 'pago');
    const entradas = meses.map(() => 0);
    const despesas = meses.map(() => 0);
    lancs.forEach(l => {
      const i = meses.indexOf(Datas.mes(l.data));
      if (i < 0) return;
      if (l.tipo === 'entrada') entradas[i] += l.valor;
      else despesas[i] += l.valor;
    });
    return {
      entradas: entradas.map(Util.arred),
      despesas: despesas.map(Util.arred),
      lucro: entradas.map((e, i) => Util.arred(e - despesas[i]))
    };
  },

  /** Despesas pagas agrupadas por categoria (maior para menor). */
  despesasPorCategoria(inicio, fim) {
    const mapa = {};
    this.noPeriodo(DB.listar('lancamentos'), inicio, fim)
      .filter(l => l.tipo === 'despesa' && l.status === 'pago')
      .forEach(l => { mapa[l.categoria || 'Outros'] = (mapa[l.categoria || 'Outros'] || 0) + l.valor; });
    return Object.entries(mapa).map(([categoria, valor]) => ({ categoria, valor })).sort((a, b) => b.valor - a.valor);
  },

  /** Clientes que mais pagaram no período. */
  topClientes(inicio, fim, limite = 5) {
    const mapa = {};
    this.noPeriodo(DB.listar('lancamentos'), inicio, fim)
      .filter(l => l.tipo === 'entrada' && l.status === 'pago' && l.clienteId)
      .forEach(l => { mapa[l.clienteId] = (mapa[l.clienteId] || 0) + l.valor; });
    const clientes = DB.listar('clientes');
    return Object.entries(mapa)
      .map(([id, valor]) => ({ cliente: clientes.find(c => c.id === id), valor }))
      .filter(x => x.cliente)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, limite);
  },

  /** Resumo financeiro de um cliente. */
  resumoCliente(clienteId) {
    const lancs = DB.listar('lancamentos').filter(l => l.clienteId === clienteId && l.tipo === 'entrada');
    const pagos = lancs.filter(l => l.status === 'pago');
    const pendentes = lancs.filter(l => l.status !== 'pago');
    const ultimo = pagos.map(l => l.pagoEm || l.data).sort().pop() || null;
    return {
      totalPago: Util.soma(pagos, l => l.valor),
      emAberto: Util.soma(pendentes, l => l.valor),
      atrasado: Util.soma(pendentes.filter(l => this.status(l) === 'atrasado'), l => l.valor),
      ultimoPagamento: ultimo
    };
  },

  /** Variação percentual entre dois valores (null quando não dá para comparar). */
  variacao(atual, anterior) {
    if (!anterior) return atual ? null : 0;
    return ((atual - anterior) / Math.abs(anterior)) * 100;
  },

  /** Períodos prontos usados nos filtros. */
  periodoPronto(chave) {
    const hoje = Datas.hoje();
    const mes = Datas.mes(hoje);
    switch (chave) {
      case 'mes-passado': {
        const m = Datas.addMeses(mes, -1);
        return { inicio: Datas.inicioMes(m), fim: Datas.fimMes(m), rotulo: 'Mês passado (' + Fmt.mesLongo(m) + ')' };
      }
      case '3-meses':
        return { inicio: Datas.inicioMes(Datas.addMeses(mes, -2)), fim: Datas.fimMes(mes), rotulo: 'Últimos 3 meses' };
      case '6-meses':
        return { inicio: Datas.inicioMes(Datas.addMeses(mes, -5)), fim: Datas.fimMes(mes), rotulo: 'Últimos 6 meses' };
      case 'ano':
        return { inicio: hoje.slice(0, 4) + '-01-01', fim: hoje.slice(0, 4) + '-12-31', rotulo: 'Este ano (' + hoje.slice(0, 4) + ')' };
      case 'este-mes':
      default:
        return { inicio: Datas.inicioMes(mes), fim: Datas.fimMes(mes), rotulo: 'Este mês (' + Fmt.mesLongo(mes) + ')' };
    }
  }
};
