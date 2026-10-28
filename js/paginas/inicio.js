/* =========================================================
   Página 1 — Início (painel geral)
   ========================================================= */
'use strict';

const PaginaInicio = {
  render(el) {
    const cfg = DB.config();
    const hoje = Datas.hoje();
    const mes = Datas.mes(hoje);
    const atual = Calc.indicadores(Datas.inicioMes(mes), Datas.fimMes(mes));
    const anterior = Calc.indicadores(Datas.inicioMes(Datas.addMeses(mes, -1)), Datas.fimMes(Datas.addMeses(mes, -1)));
    const receber = Calc.aReceberGeral();
    const meses = Array.from({ length: 6 }, (_, i) => Datas.addMeses(mes, i - 5));
    const serie = Calc.serieMensal(meses);
    const dataLonga = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

    el.innerHTML = `
      ${DB.temExemplos() ? `
        <div class="aviso info anim">
          ${icone('info')}
          <p><strong>Você está vendo dados de exemplo.</strong> Explore à vontade! Quando quiser começar com seus dados reais, apague os exemplos.</p>
          <button class="btn btn-ghost btn-sm" data-acao="limpar-exemplos">${icone('lixeira', 'ico-sm')} Limpar dados de exemplo</button>
        </div>` : ''}

      <section class="saudacao anim">
        <div>
          <h1>Olá, ${Util.esc(cfg.usuario || 'tudo bem')}!</h1>
          <p>Veja como está sua empresa hoje.</p>
        </div>
        <span class="data-hoje">${icone('calendario', 'ico-sm')} ${dataLonga.charAt(0).toUpperCase() + dataLonga.slice(1)}</span>
      </section>

      <div class="grade grade-4 kpis">
        ${UI.kpi({ i: 1, rotulo: 'Faturamento do mês', valor: atual.faturamento, iconeNome: 'subindo', cor: 'verde', escuro: true,
          variacao: Calc.variacao(atual.faturamento, anterior.faturamento),
          ajuda: 'Faturamento = todo dinheiro que você já recebeu neste mês.', rodape: 'comparado ao mês passado' })}
        ${UI.kpi({ i: 2, rotulo: 'Despesas do mês', valor: atual.despesas, iconeNome: 'descendo', cor: 'vermelho', inverso: true,
          variacao: Calc.variacao(atual.despesas, anterior.despesas),
          ajuda: 'Despesas = tudo que você já pagou neste mês (aluguel, material, salários...).', rodape: 'comparado ao mês passado' })}
        ${UI.kpi({ i: 3, rotulo: 'Lucro líquido', valor: atual.lucro, iconeNome: 'moedas', cor: atual.lucro >= 0 ? 'verde' : 'vermelho',
          variacao: Calc.variacao(atual.lucro, anterior.lucro),
          ajuda: 'Lucro líquido = tudo que entrou menos tudo que saiu neste mês.', rodape: 'comparado ao mês passado' })}
        ${UI.kpi({ i: 4, rotulo: 'Valores a receber', valor: receber.total, iconeNome: 'relogio', cor: 'amarelo', variacao: false,
          ajuda: 'Dinheiro que seus clientes ainda vão te pagar (lançamentos de entrada pendentes).',
          rodape: receber.atrasado > 0 ? `<span class="negativo forte">${Fmt.moeda(receber.atrasado)} em atraso</span>` : `${receber.qtd} recebimento(s) pendente(s)` })}
      </div>

      <div class="grade grade-2-1 secao">
        <section class="cartao anim" style="--i:5">
          <div class="cartao-titulo">
            <div>
              <h2>Entradas x Saídas</h2>
              <p class="sub">Últimos 6 meses (somente valores já pagos/recebidos)</p>
            </div>
            <div class="grafico-legenda">
              <span><i style="background:${Graficos.CORES.entrada}"></i>Entradas</span>
              <span><i style="background:${Graficos.CORES.despesa}"></i>Saídas</span>
            </div>
          </div>
          <div class="grafico"><canvas id="graf-inicio" aria-label="Gráfico de entradas e saídas dos últimos 6 meses" role="img"></canvas></div>
        </section>

        <section class="cartao anim" style="--i:6">
          <div class="cartao-titulo">
            <div>
              <h2>Próximos recebimentos</h2>
              <p class="sub">Quem ainda vai te pagar</p>
            </div>
          </div>
          <div id="proximos"></div>
        </section>
      </div>

      <section class="secao anim" style="--i:7">
        <div class="atalhos">
          <button class="atalho verde" data-acao="novo-orcamento">
            <span class="atalho-icone">${icone('mais', 'ico-lg')}</span>
            <span>Novo orçamento<small>Monte e envie um orçamento</small></span>
          </button>
          <button class="atalho verde" data-acao="novo-lancamento">
            <span class="atalho-icone">${icone('mais', 'ico-lg')}</span>
            <span>Novo lançamento<small>Registre uma entrada ou despesa</small></span>
          </button>
          <button class="atalho verde" data-acao="novo-cliente">
            <span class="atalho-icone">${icone('mais', 'ico-lg')}</span>
            <span>Novo cliente<small>Cadastre quem compra de você</small></span>
          </button>
        </div>
      </section>`;

    this.renderProximos(el.querySelector('#proximos'));
    Graficos.barrasEntradasDespesas(el.querySelector('#graf-inicio'), meses, serie, mes);

    el.querySelector('[data-acao="novo-orcamento"]').addEventListener('click', () => PaginaOrcamentos.abrirAssistente());
    el.querySelector('[data-acao="novo-lancamento"]').addEventListener('click', () => PaginaLancamentos.abrirFormulario({ tipo: 'entrada' }));
    el.querySelector('[data-acao="novo-cliente"]').addEventListener('click', () => PaginaClientes.abrirFormulario());
    el.querySelector('[data-acao="limpar-exemplos"]')?.addEventListener('click', () => PaginaConfiguracoes.limparExemplos());
  },

  renderProximos(caixa) {
    const clientes = DB.listar('clientes');
    const pendentes = DB.listar('lancamentos')
      .filter(l => l.tipo === 'entrada' && l.status !== 'pago')
      .sort((a, b) => a.data.localeCompare(b.data))
      .slice(0, 5);

    if (!pendentes.length) {
      caixa.innerHTML = UI.vazio({
        iconeNome: 'checkCirculo', titulo: 'Nada para receber',
        texto: 'Quando você registrar uma entrada como "Pendente", ela aparece aqui.'
      });
      return;
    }

    caixa.innerHTML = `<div class="lista">${pendentes.map(l => {
      const cli = clientes.find(c => c.id === l.clienteId);
      const st = Calc.status(l);
      return `
        <div class="lista-item">
          <span class="avatar">${Util.esc(Util.iniciais(cli ? cli.nome : l.descricao))}</span>
          <div class="info">
            <strong>${Util.esc(cli ? cli.nome : l.descricao)}</strong>
            <span class="${st === 'atrasado' ? 'negativo forte' : ''}">${Fmt.data(l.data)} · ${st === 'atrasado' ? 'atrasado ' + Datas.relativo(l.data) : Datas.relativo(l.data)}</span>
          </div>
          <div style="text-align:right">
            <strong class="num">${Fmt.moeda(l.valor)}</strong><br>
            <button class="btn btn-texto btn-sm" data-receber="${l.id}" title="Marcar como recebido">${icone('check', 'ico-sm')} Recebi</button>
          </div>
        </div>`;
    }).join('')}</div>`;

    caixa.querySelectorAll('[data-receber]').forEach(b => b.addEventListener('click', () => PaginaLancamentos.marcarPago(b.dataset.receber)));
  }
};
