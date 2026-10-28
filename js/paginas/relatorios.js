/* =========================================================
   Página 5 — Relatórios (indicadores e gráficos)
   ========================================================= */
'use strict';

const PaginaRelatorios = {
  periodo: 'este-mes',
  inicio: '',
  fim: '',
  graficos: {},

  PERIODOS: [['este-mes', 'Este mês'], ['mes-passado', 'Mês passado'], ['3-meses', 'Últimos 3 meses'], ['6-meses', 'Últimos 6 meses'], ['ano', 'Este ano'], ['personalizado', 'Personalizado']],

  /** Período escolhido + período anterior para comparação. */
  periodoAtual() {
    let p;
    if (this.periodo === 'personalizado' && this.inicio && this.fim) {
      const [ini, fim] = this.inicio <= this.fim ? [this.inicio, this.fim] : [this.fim, this.inicio];
      p = { inicio: ini, fim, rotulo: `${Fmt.data(ini)} a ${Fmt.data(fim)}` };
    } else {
      p = Calc.periodoPronto(this.periodo);
    }
    const ant = Calc.periodoAnterior(p.inicio, p.fim);
    return { ...p, anterior: { ...ant, rotulo: `${Fmt.data(ant.inicio)} a ${Fmt.data(ant.fim)}` } };
  },

  /** Meses exibidos nos gráficos (mínimo 6, sem meses futuros). */
  mesesGrafico(p) {
    const mesHoje = Datas.mes(Datas.hoje());
    let meses = Datas.mesesEntre(p.inicio, p.fim).filter(m => m <= mesHoje);
    if (!meses.length) meses = [Datas.mes(p.fim)];
    while (meses.length < 6) meses.unshift(Datas.addMeses(meses[0], -1));
    return meses.slice(-24);
  },

  render(el) {
    el.innerHTML = `
      ${UI.cabecalho({
        titulo: 'Relatórios',
        descricao: 'Os números da sua empresa calculados automaticamente. Escolha o período e compare com o anterior.',
        acoes: `
          <button class="btn btn-ghost" data-exportar="excel">${icone('excel')} Baixar em Excel</button>
          <button class="btn btn-escuro" data-exportar="pdf">${icone('pdf')} Baixar em PDF</button>`
      })}
      <div class="filtros anim" style="--i:1">
        <div class="pilulas" id="rel-periodo">
          ${this.PERIODOS.map(([v, t]) => `<button class="pilula ${this.periodo === v ? 'ativa' : ''}" data-periodo="${v}">${t}</button>`).join('')}
        </div>
        <div class="periodo-personalizado" id="rel-datas" ${this.periodo === 'personalizado' ? '' : 'hidden'}>
          <div class="campo"><label for="rel-ini">De</label><input class="entrada" id="rel-ini" data-mascara="data" inputmode="numeric" placeholder="dd/mm/aaaa" value="${this.inicio ? Fmt.data(this.inicio) : ''}"></div>
          <div class="campo"><label for="rel-fim">Até</label><input class="entrada" id="rel-fim" data-mascara="data" inputmode="numeric" placeholder="dd/mm/aaaa" value="${this.fim ? Fmt.data(this.fim) : ''}"></div>
        </div>
      </div>
      <div id="rel-conteudo"></div>`;

    Mascara.aplicar(el);
    el.querySelectorAll('[data-periodo]').forEach(b => b.addEventListener('click', () => {
      this.periodo = b.dataset.periodo;
      el.querySelectorAll('[data-periodo]').forEach(x => x.classList.toggle('ativa', x === b));
      el.querySelector('#rel-datas').hidden = this.periodo !== 'personalizado';
      if (this.periodo === 'personalizado' && !this.inicio) {
        const p = Calc.periodoPronto('3-meses');
        this.inicio = p.inicio; this.fim = Datas.hoje();
        el.querySelector('#rel-ini').value = Fmt.data(this.inicio);
        el.querySelector('#rel-fim').value = Fmt.data(this.fim);
      }
      this.renderConteudo(true);
    }));
    ['#rel-ini', '#rel-fim'].forEach(sel => el.querySelector(sel).addEventListener('input', e => {
      const d = Datas.deBR(e.target.value);
      if (!d) return;
      this[sel === '#rel-ini' ? 'inicio' : 'fim'] = d;
      this.renderConteudo(true);
    }));
    el.querySelector('[data-exportar="excel"]').addEventListener('click', () => this.exportarExcel());
    el.querySelector('[data-exportar="pdf"]').addEventListener('click', () => this.exportarPDF());

    this.renderConteudo(false);
  },

  /** Lista dos 9 indicadores com a comparação. */
  indicadores(p) {
    const a = Calc.indicadores(p.inicio, p.fim);
    const b = Calc.indicadores(p.anterior.inicio, p.anterior.fim);
    const varRel = (x, y) => Calc.variacao(x, y);
    const varPts = (x, y) => (x === 0 && y === 0) ? 0 : x - y;
    return [
      { chave: 'faturamento', rotulo: 'Faturamento bruto', valor: a.faturamento, anterior: b.faturamento, var: varRel(a.faturamento, b.faturamento), icone: 'subindo', cor: 'verde', escuro: true,
        ajuda: 'Tudo que você recebeu dos clientes no período, antes de descontar as despesas.' },
      { chave: 'despesas', rotulo: 'Total de despesas', valor: a.despesas, anterior: b.despesas, var: varRel(a.despesas, b.despesas), icone: 'descendo', cor: 'vermelho', inverso: true,
        ajuda: 'Tudo que você pagou no período: aluguel, material, salários, impostos...' },
      { chave: 'lucro', rotulo: 'Lucro líquido', valor: a.lucro, anterior: b.lucro, var: varRel(a.lucro, b.lucro), icone: 'moedas', cor: a.lucro >= 0 ? 'verde' : 'vermelho',
        ajuda: 'Lucro líquido = tudo que entrou menos tudo que saiu.' },
      { chave: 'margem', rotulo: 'Margem de lucro', valor: a.margem, anterior: b.margem, var: varPts(a.margem, b.margem), formato: 'pct', icone: 'percentual', cor: 'verde',
        ajuda: 'De cada R$ 100 que entraram, quantos reais sobraram de lucro. Ex.: 25% = sobraram R$ 25.' },
      { chave: 'aReceber', rotulo: 'Valores a receber', valor: a.aReceber, anterior: b.aReceber, var: varRel(a.aReceber, b.aReceber), icone: 'relogio', cor: 'amarelo', neutro: true,
        ajuda: 'Entradas pendentes com data dentro do período: dinheiro que ainda vai entrar.' },
      { chave: 'emAtraso', rotulo: 'Valores em atraso', valor: a.emAtraso, anterior: b.emAtraso, var: varRel(a.emAtraso, b.emAtraso), icone: 'alerta', cor: 'vermelho', inverso: true,
        ajuda: 'Entradas pendentes cuja data já passou. Vale a pena cobrar esses clientes!' },
      { chave: 'ticket', rotulo: 'Ticket médio', valor: a.ticketMedio, anterior: b.ticketMedio, var: varRel(a.ticketMedio, b.ticketMedio), icone: 'recibo',
        ajuda: 'Valor médio de cada recebimento. É o faturamento dividido pelo número de recebimentos.' },
      { chave: 'orcamentos', rotulo: 'Orçamentos feitos', valor: a.qtdOrcamentos, anterior: b.qtdOrcamentos, var: varRel(a.qtdOrcamentos, b.qtdOrcamentos), formato: 'inteiro', icone: 'orcamentos',
        ajuda: 'Quantos orçamentos foram criados no período.', extra: `${a.qtdAprovados} aprovado(s)` },
      { chave: 'aprovacao', rotulo: 'Taxa de aprovação', valor: a.taxaAprovacao, anterior: b.taxaAprovacao, var: varPts(a.taxaAprovacao, b.taxaAprovacao), formato: 'pct', icone: 'checkCirculo', cor: 'verde',
        ajuda: 'De cada 10 orçamentos enviados, quantos o cliente aprovou. Ex.: 60% = 6 de cada 10. Rascunhos não contam.' }
    ];
  },

  renderConteudo(trocouPeriodo) {
    const caixa = document.getElementById('rel-conteudo');
    if (!caixa) return;
    Graficos.limpar();
    const p = this.periodoAtual();
    const ind = this.indicadores(p);
    const meses = this.mesesGrafico(p);
    const serie = Calc.serieMensal(meses);
    const cats = Calc.despesasPorCategoria(p.inicio, p.fim);
    const top = Calc.topClientes(p.inicio, p.fim);
    const mesHoje = Datas.mes(Datas.hoje());

    // Agrupa categorias pequenas em "Outras" (no máximo 7 fatias + Outras)
    let fatias = cats;
    if (cats.length > 8) {
      fatias = cats.slice(0, 7).concat([{ categoria: 'Outras', valor: Util.soma(cats.slice(7), c => c.valor) }]);
    }
    const totalCats = Util.soma(fatias, c => c.valor);

    caixa.innerHTML = `
      <p class="apagado anim" style="margin:-4px 0 16px">
        ${icone('calendario', 'ico-sm')} <strong>${Util.esc(p.rotulo)}</strong> · comparando com ${p.anterior.rotulo}
      </p>
      <div class="grade grade-3">
        ${ind.map((k, i) => UI.kpi({
          i, rotulo: k.rotulo, valor: k.valor, formato: k.formato || 'moeda', iconeNome: k.icone, cor: k.cor || '',
          escuro: k.escuro, ajuda: k.ajuda, variacao: k.var, inverso: k.inverso,
          rodape: `${k.extra ? k.extra + ' · ' : ''}antes: ${UI.formatar(k.anterior, k.formato || 'moeda')}`
        })).join('')}
      </div>

      <div class="grade grade-2 secao">
        <section class="cartao anim" style="--i:9">
          <div class="cartao-titulo">
            <div><h2>Entradas x Despesas por mês</h2><p class="sub">Valores pagos e recebidos</p></div>
            <div class="grafico-legenda">
              <span><i style="background:${Graficos.CORES.entrada}"></i>Entradas</span>
              <span><i style="background:${Graficos.CORES.despesa}"></i>Despesas</span>
            </div>
          </div>
          <div class="grafico"><canvas id="g-barras" role="img" aria-label="Entradas e despesas por mês"></canvas></div>
        </section>

        <section class="cartao anim" style="--i:10">
          <div class="cartao-titulo"><div><h2>Despesas por categoria</h2><p class="sub">Para onde foi o dinheiro no período</p></div></div>
          ${fatias.length ? `
            <div class="rosca-wrap">
              <div class="grafico"><canvas id="g-rosca" role="img" aria-label="Despesas por categoria"></canvas></div>
              <div class="legenda-lista" id="g-rosca-legenda"></div>
            </div>` : UI.vazio({ iconeNome: 'descendo', titulo: 'Nenhuma despesa paga', texto: 'Não há despesas pagas neste período.' })}
        </section>

        <section class="cartao anim" style="--i:11">
          <div class="cartao-titulo"><div><h2>Evolução do lucro</h2><p class="sub">Lucro de cada mês (entradas - despesas)</p></div></div>
          <div class="grafico"><canvas id="g-linha" role="img" aria-label="Evolução do lucro por mês"></canvas></div>
        </section>

        <section class="cartao anim" style="--i:12">
          <div class="cartao-titulo"><div><h2>Top 5 clientes</h2><p class="sub">Quem mais pagou no período</p></div></div>
          ${top.length
            ? `<div class="grafico"><canvas id="g-top" role="img" aria-label="Top 5 clientes por faturamento"></canvas></div>`
            : UI.vazio({ iconeNome: 'clientes', titulo: 'Sem recebimentos de clientes', texto: 'Ligue as entradas a um cliente para ver quem mais compra de você.' })}
        </section>
      </div>`;

    // Na primeira exibição a contagem é feita pelo App; aqui só ao trocar o período
    if (trocouPeriodo) UI.contar(caixa, true);

    this.graficos.barras = Graficos.barrasEntradasDespesas(caixa.querySelector('#g-barras'), meses, serie, meses.includes(mesHoje) ? mesHoje : meses[meses.length - 1]);
    this.graficos.linha = Graficos.linhaLucro(caixa.querySelector('#g-linha'), meses, serie.lucro);
    this.graficos.rosca = null;
    this.graficos.top = null;
    if (fatias.length) {
      const cores = Graficos.rosca(caixa.querySelector('#g-rosca'), fatias.map(c => c.categoria), fatias.map(c => Util.arred(c.valor)));
      this.graficos.rosca = Graficos.ativos[Graficos.ativos.length - 1];
      caixa.querySelector('#g-rosca-legenda').innerHTML = fatias.map((c, i) => `
        <div><i style="background:${cores[i]}"></i><span>${Util.esc(c.categoria)}</span><strong>${Fmt.pct(totalCats ? c.valor / totalCats * 100 : 0, 0)}</strong></div>`).join('');
    }
    if (top.length) {
      this.graficos.top = Graficos.barrasHorizontais(caixa.querySelector('#g-top'), top.map(t => t.cliente.nome), top.map(t => Util.arred(t.valor)));
    }
  },

  /* ---------------- Exportação ---------------- */

  exportarExcel() {
    const p = this.periodoAtual();
    const ind = this.indicadores(p);
    const lancs = Calc.noPeriodo(DB.listar('lancamentos'), p.inicio, p.fim).sort((a, b) => a.data.localeCompare(b.data));
    const clientes = DB.listar('clientes').sort((a, b) => a.nome.localeCompare(b.nome));
    const tipoCel = k => k.formato === 'pct' ? 'pct' : k.formato === 'inteiro' ? 'inteiro' : 'moeda';

    const resumo = {
      nome: 'Resumo',
      filtro: false,
      colunas: [
        { titulo: 'Indicador', tipo: 'texto', largura: 28 },
        { titulo: 'Período atual', tipo: 'texto', largura: 18 },
        { titulo: 'Período anterior', tipo: 'texto', largura: 18 },
        { titulo: 'Variação', tipo: 'texto', largura: 14 }
      ],
      linhas: [
        ['Empresa', DB.config().empresa.nome, '', ''],
        ['Período', p.rotulo, p.anterior.rotulo, ''],
        ['Gerado em', { v: Datas.hoje(), tipo: 'data' }, '', ''],
        ['', '', '', ''],
        ...ind.map(k => [
          k.rotulo,
          { v: k.valor, tipo: tipoCel(k) },
          { v: k.anterior, tipo: tipoCel(k) },
          k.var === null ? 'novo' : (k.formato === 'pct' ? `${k.var >= 0 ? '+' : ''}${Fmt.pct(k.var)} pts` : { v: k.var, tipo: 'pct' })
        ])
      ]
    };

    Exportar.excel('relatorio-' + Exportar.nomeArquivo(p.rotulo), [
      resumo,
      Exportar.abaLancamentos('Entradas', lancs.filter(l => l.tipo === 'entrada')),
      Exportar.abaLancamentos('Despesas', lancs.filter(l => l.tipo === 'despesa')),
      Exportar.abaClientes(clientes)
    ]);
  },

  exportarPDF() {
    const p = this.periodoAtual();
    const ind = this.indicadores(p);
    const top = Calc.topClientes(p.inicio, p.fim);
    const cats = Calc.despesasPorCategoria(p.inicio, p.fim);
    const totalCats = Util.soma(cats, c => c.valor);
    const lancs = Calc.noPeriodo(DB.listar('lancamentos'), p.inicio, p.fim).sort((a, b) => a.data.localeCompare(b.data));
    const clientes = DB.listar('clientes');
    const nomeCli = id => clientes.find(c => c.id === id)?.nome || '-';
    const linhasLanc = ls => ls.map(l => [Fmt.data(l.data), l.descricao, l.categoria || '-', nomeCli(l.clienteId),
      ({ pago: l.tipo === 'entrada' ? 'Recebido' : 'Pago', pendente: 'Pendente', atrasado: 'Atrasado' })[Calc.status(l)], Fmt.moeda(l.valor)]);
    const cab = ['Data', 'Descrição', 'Categoria', 'Cliente', 'Situação', 'Valor'];

    const detalhe = k => {
      if (k.var === null) return { detalhe: 'Sem dados no período anterior' };
      if (Math.abs(k.var) < 0.05) return { detalhe: 'Igual ao período anterior' };
      const subiu = k.var > 0;
      const bom = k.inverso ? !subiu : subiu;
      const txt = `${subiu ? '+' : '-'}${Fmt.pct(Math.abs(k.var))}${k.formato === 'pct' ? ' pts' : ''} vs. período anterior`;
      return { detalhe: txt, detalheCor: k.neutro ? '' : (bom ? 'bom' : 'ruim') };
    };

    Exportar.pdfRelatorio({
      titulo: 'Relatório financeiro',
      periodo: p.rotulo,
      arquivo: 'relatorio-' + Exportar.nomeArquivo(p.rotulo),
      indicadores: ind.map(k => ({
        rotulo: k.rotulo,
        valor: UI.formatar(k.valor, k.formato || 'moeda'),
        ruim: (k.chave === 'lucro' && k.valor < 0) || (k.chave === 'emAtraso' && k.valor > 0),
        ...detalhe(k)
      })),
      graficos: [
        { titulo: 'Entradas x Despesas por mês', canvas: this.graficos.barras?.canvas },
        { titulo: 'Despesas por categoria', canvas: this.graficos.rosca?.canvas },
        { titulo: 'Evolução do lucro', canvas: this.graficos.linha?.canvas },
        { titulo: 'Top 5 clientes', canvas: this.graficos.top?.canvas }
      ],
      tabelas: [
        { titulo: 'Top 5 clientes por faturamento', cabecalho: ['#', 'Cliente', 'Faturado'], linhas: top.map((t, i) => [String(i + 1), t.cliente.nome, Fmt.moeda(t.valor)]), direita: [2] },
        { titulo: 'Despesas por categoria', cabecalho: ['Categoria', '% do total', 'Valor'], linhas: cats.map(c => [c.categoria, Fmt.pct(totalCats ? c.valor / totalCats * 100 : 0), Fmt.moeda(c.valor)]), direita: [1, 2],
          rodape: cats.length ? ['Total', '100%', Fmt.moeda(totalCats)] : null },
        { titulo: 'Entradas do período', cabecalho: cab, linhas: linhasLanc(lancs.filter(l => l.tipo === 'entrada')), direita: [5] },
        { titulo: 'Despesas do período', cabecalho: cab, linhas: linhasLanc(lancs.filter(l => l.tipo === 'despesa')), direita: [5] }
      ]
    });
  }
};
