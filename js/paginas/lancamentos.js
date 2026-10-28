/* =========================================================
   Página 3 — Lançamentos (entradas e despesas)
   ========================================================= */
'use strict';

const PaginaLancamentos = {
  filtros: { periodo: 'este-mes', inicio: '', fim: '', tipo: 'todos', status: 'todos', busca: '' },

  render(el) {
    const f = this.filtros;
    el.innerHTML = `
      ${UI.cabecalho({
        titulo: 'Lançamentos',
        descricao: 'Aqui você registra tudo que entra e sai do caixa.'
      })}

      <div class="linha-flex botoes-novo anim" style="--i:1;margin-bottom:22px">
        <button class="btn btn-primario btn-lg" data-novo="entrada">${icone('entrada')} + Entrada (a receber)</button>
        <button class="btn btn-perigo btn-lg" data-novo="despesa">${icone('despesa')} + Despesa</button>
      </div>

      <section class="cartao anim" style="--i:2;margin-bottom:18px">
        <div class="filtros" style="margin-bottom:0">
          <div class="campo campo-largo">
            <span class="rotulo">Período</span>
            <div class="pilulas no-cartao" id="lan-periodo">
              ${[['este-mes', 'Este mês'], ['mes-passado', 'Mês passado'], ['personalizado', 'Personalizado']].map(([v, t]) =>
                `<button class="pilula ${f.periodo === v ? 'ativa' : ''}" data-periodo="${v}">${t}</button>`).join('')}
            </div>
          </div>
          <div class="periodo-personalizado" id="lan-datas" ${f.periodo === 'personalizado' ? '' : 'hidden'}>
            <div class="campo"><label for="lan-ini">De</label><input class="entrada" id="lan-ini" data-mascara="data" inputmode="numeric" placeholder="dd/mm/aaaa" value="${f.inicio ? Fmt.data(f.inicio) : ''}"></div>
            <div class="campo"><label for="lan-fim">Até</label><input class="entrada" id="lan-fim" data-mascara="data" inputmode="numeric" placeholder="dd/mm/aaaa" value="${f.fim ? Fmt.data(f.fim) : ''}"></div>
          </div>
          <div class="campo">
            <label for="lan-tipo">Tipo</label>
            <select class="entrada" id="lan-tipo">${UI.opcoes([['todos', 'Todos'], ['entrada', 'Entradas'], ['despesa', 'Despesas']], f.tipo)}</select>
          </div>
          <div class="campo">
            <label for="lan-status">Situação</label>
            <select class="entrada" id="lan-status">${UI.opcoes([['todos', 'Todas'], ['pago', 'Pago / Recebido'], ['pendente', 'Pendente'], ['atrasado', 'Atrasado']], f.status)}</select>
          </div>
          <label class="busca campo campo-largo">
            <span class="rotulo">Buscar</span>
            <span style="position:relative;display:block">${icone('busca')}<input class="entrada" id="lan-busca" placeholder="Descrição, cliente ou categoria" value="${Util.esc(f.busca)}"></span>
          </label>
        </div>
      </section>

      <div class="totais anim" style="--i:3" id="lan-totais"></div>

      <section class="cartao anim" style="--i:4">
        <div class="cartao-titulo">
          <div><h2 id="lan-titulo">Lançamentos</h2><p class="sub" id="lan-sub"></p></div>
          <div class="linha-flex">
            <button class="btn btn-ghost btn-sm" data-exportar="excel">${icone('excel', 'ico-sm')} Baixar em Excel</button>
            <button class="btn btn-ghost btn-sm" data-exportar="pdf">${icone('pdf', 'ico-sm')} Baixar em PDF</button>
          </div>
        </div>
        <div id="lan-tabela"></div>
      </section>`;

    Mascara.aplicar(el);
    el.querySelectorAll('[data-novo]').forEach(b => b.addEventListener('click', () => this.abrirFormulario({ tipo: b.dataset.novo })));

    el.querySelectorAll('[data-periodo]').forEach(b => b.addEventListener('click', () => {
      f.periodo = b.dataset.periodo;
      el.querySelectorAll('[data-periodo]').forEach(x => x.classList.toggle('ativa', x === b));
      el.querySelector('#lan-datas').hidden = f.periodo !== 'personalizado';
      if (f.periodo === 'personalizado' && !f.inicio) {
        const p = Calc.periodoPronto('este-mes');
        f.inicio = p.inicio; f.fim = p.fim;
        el.querySelector('#lan-ini').value = Fmt.data(p.inicio);
        el.querySelector('#lan-fim').value = Fmt.data(p.fim);
      }
      this.renderTabela();
    }));
    ['#lan-ini', '#lan-fim'].forEach(sel => el.querySelector(sel).addEventListener('input', e => {
      const d = Datas.deBR(e.target.value);
      if (!d) return;
      f[sel === '#lan-ini' ? 'inicio' : 'fim'] = d;
      this.renderTabela();
    }));
    el.querySelector('#lan-tipo').addEventListener('change', e => { f.tipo = e.target.value; this.renderTabela(); });
    el.querySelector('#lan-status').addEventListener('change', e => { f.status = e.target.value; this.renderTabela(); });
    el.querySelector('#lan-busca').addEventListener('input', Util.debounce(e => { f.busca = e.target.value; this.renderTabela(); }, 150));
    el.querySelector('[data-exportar="excel"]').addEventListener('click', () => this.exportarExcel());
    el.querySelector('[data-exportar="pdf"]').addEventListener('click', () => this.exportarPDF());

    this.renderTabela();
  },

  /** Aplica os filtros e devolve a lista + período. */
  filtrar() {
    const f = this.filtros;
    let periodo = f.periodo === 'personalizado'
      ? { inicio: f.inicio, fim: f.fim, rotulo: `${Fmt.data(f.inicio)} a ${Fmt.data(f.fim)}` }
      : Calc.periodoPronto(f.periodo);
    if (periodo.inicio > periodo.fim) periodo = { ...periodo, inicio: periodo.fim, fim: periodo.inicio };
    const clientes = DB.listar('clientes');
    const termo = Util.normalizar(f.busca);
    const lista = Calc.noPeriodo(DB.listar('lancamentos'), periodo.inicio, periodo.fim)
      .filter(l => f.tipo === 'todos' || l.tipo === f.tipo)
      .filter(l => f.status === 'todos' || (f.status === 'pendente' ? l.status === 'pendente' : Calc.status(l) === f.status))
      .filter(l => {
        if (!termo) return true;
        const cli = clientes.find(c => c.id === l.clienteId)?.nome || '';
        return Util.normalizar(`${l.descricao} ${l.categoria} ${cli}`).includes(termo);
      })
      .sort((a, b) => b.data.localeCompare(a.data) || (b.criadoEm || '').localeCompare(a.criadoEm || ''));
    return { lista, periodo, clientes };
  },

  totais(lista) {
    const entradas = lista.filter(l => l.tipo === 'entrada' && l.status === 'pago');
    const despesas = lista.filter(l => l.tipo === 'despesa' && l.status === 'pago');
    const pendentes = lista.filter(l => l.status !== 'pago');
    return {
      entradas: Util.soma(entradas, l => l.valor),
      despesas: Util.soma(despesas, l => l.valor),
      saldo: Util.soma(entradas, l => l.valor) - Util.soma(despesas, l => l.valor),
      aReceber: Util.soma(pendentes.filter(l => l.tipo === 'entrada'), l => l.valor),
      aPagar: Util.soma(pendentes.filter(l => l.tipo === 'despesa'), l => l.valor)
    };
  },

  renderTabela() {
    const caixa = document.getElementById('lan-tabela');
    if (!caixa) return;
    const { lista, periodo, clientes } = this.filtrar();
    const t = this.totais(lista);

    document.getElementById('lan-totais').innerHTML = `
      <div class="total-box verde"><span>Entradas recebidas</span><strong class="positivo">${Fmt.moeda(t.entradas)}</strong></div>
      <div class="total-box vermelho"><span>Despesas pagas</span><strong class="negativo">${Fmt.moeda(t.despesas)}</strong></div>
      <div class="total-box escuro"><span>Saldo ${UI.ajuda('Saldo = entradas recebidas menos despesas pagas, considerando os filtros escolhidos.')}</span><strong class="${t.saldo < 0 ? 'negativo' : ''}">${Fmt.moeda(t.saldo)}</strong></div>
      <div class="total-box amarelo"><span>Pendente ${UI.ajuda('Valores que ainda não foram pagos ou recebidos neste filtro.')}</span><strong>${Fmt.moeda(t.aReceber + t.aPagar)}</strong></div>`;
    document.getElementById('lan-titulo').textContent = `${lista.length} ${lista.length === 1 ? 'lançamento' : 'lançamentos'}`;
    document.getElementById('lan-sub').textContent = periodo.rotulo;

    if (!lista.length) {
      const nenhumNoSistema = !DB.listar('lancamentos').length;
      caixa.innerHTML = nenhumNoSistema
        ? UI.vazio({ iconeNome: 'lancamentos', titulo: 'Você ainda não tem lançamentos', texto: 'Clique em "+ Entrada" quando receber dinheiro ou em "+ Despesa" quando pagar algo.' })
        : UI.vazio({ iconeNome: 'busca', titulo: 'Nada encontrado com esses filtros', texto: 'Tente mudar o período, o tipo ou a situação acima.' });
      return;
    }

    caixa.innerHTML = `
      <div class="tabela-wrap">
        <table class="tabela responsiva">
          <thead><tr><th>Data</th><th>Descrição</th><th>Cliente</th><th>Forma</th><th>Situação</th><th class="direita">Valor</th><th class="direita">Ações</th></tr></thead>
          <tbody>${lista.map(l => {
            const cli = clientes.find(c => c.id === l.clienteId);
            const st = Calc.status(l);
            const entrada = l.tipo === 'entrada';
            return `
              <tr>
                <td data-rotulo="Data" class="num">${Fmt.data(l.data)}</td>
                <td data-rotulo="Descrição"><div><div class="principal">${Util.esc(l.descricao)}</div><div class="secundario">${Util.esc(l.categoria || '')}</div></div></td>
                <td data-rotulo="Cliente">${cli ? `<a href="#/cliente/${cli.id}">${Util.esc(cli.nome)}</a>` : '<span class="apagado">—</span>'}</td>
                <td data-rotulo="Forma">${Util.esc(l.formaPagamento || '—')}</td>
                <td data-rotulo="Situação">${UI.etiqueta(st, l.tipo)}</td>
                <td data-rotulo="Valor" class="direita num forte ${entrada ? 'positivo' : 'negativo'}">${entrada ? '+' : '−'} ${Fmt.moeda(l.valor)}</td>
                <td class="sem-rotulo">
                  <div class="acoes-celula">
                    ${l.status !== 'pago' ? `<button class="btn btn-primario btn-sm" data-pagar="${l.id}">${icone('check', 'ico-sm')} ${entrada ? 'Recebi' : 'Paguei'}</button>` : ''}
                    <button class="btn btn-ghost btn-sm" data-editar="${l.id}">${icone('editar', 'ico-sm')} Editar</button>
                    <button class="btn btn-texto btn-sm" data-excluir="${l.id}" aria-label="Excluir lançamento">${icone('lixeira', 'ico-sm')} Excluir</button>
                  </div>
                </td>
              </tr>`;
          }).join('')}</tbody>
        </table>
      </div>`;

    caixa.querySelectorAll('[data-pagar]').forEach(b => b.addEventListener('click', () => this.marcarPago(b.dataset.pagar)));
    caixa.querySelectorAll('[data-editar]').forEach(b => b.addEventListener('click', () => this.abrirFormulario({ id: b.dataset.editar })));
    caixa.querySelectorAll('[data-excluir]').forEach(b => b.addEventListener('click', () => this.excluir(b.dataset.excluir)));
  },

  /* ---------------- Ações ---------------- */

  /** Marca como pago/recebido com 1 clique. */
  marcarPago(id) {
    const l = DB.atualizar('lancamentos', id, { status: 'pago', pagoEm: Datas.hoje() });
    UI.toast(l.tipo === 'entrada' ? 'Marcado como recebido ✓' : 'Marcado como pago ✓');
    App.recarregar();
  },

  async excluir(id) {
    const l = DB.obter('lancamentos', id);
    const ok = await UI.confirmar({
      titulo: 'Excluir lançamento?',
      mensagem: `<strong>${Util.esc(l.descricao)}</strong> (${Fmt.moeda(l.valor)}) será apagado. Essa ação não pode ser desfeita.`
    });
    if (!ok) return;
    DB.remover('lancamentos', id);
    UI.toast('Lançamento excluído');
    App.recarregar();
  },

  /** Formulário de entrada/despesa (novo ou edição). */
  abrirFormulario({ tipo = 'entrada', id, clienteId } = {}) {
    const ex = id ? DB.obter('lancamentos', id) : null;
    const cfg = DB.config();
    const st = {
      tipo: ex ? ex.tipo : tipo,
      status: ex ? ex.status : (tipo === 'entrada' ? 'pendente' : 'pago')
    };
    const clientes = DB.listar('clientes').sort((a, b) => a.nome.localeCompare(b.nome));
    const textos = {
      entrada: { titulo: 'Nova entrada', desc: 'Ex.: Pagamento da reforma da cozinha', pago: 'Já recebi', pendente: 'Ainda vou receber', data: 'Data do recebimento' },
      despesa: { titulo: 'Nova despesa', desc: 'Ex.: Conta de luz de outubro', pago: 'Já paguei', pendente: 'Ainda vou pagar', data: 'Data do pagamento' }
    };

    const m = UI.modal({
      titulo: ex ? 'Editar lançamento' : textos[st.tipo].titulo,
      subtitulo: 'Preencha os campos abaixo. Os marcados como opcionais podem ficar em branco.',
      cor: st.tipo === 'entrada' ? 'verde' : 'vermelho',
      conteudo: `
        <form id="form-lanc" novalidate>
          <div class="campo" style="margin-bottom:16px">
            <span class="rotulo">Tipo</span>
            <div class="opcoes" id="op-tipo">
              <button type="button" class="opcao" data-tipo="entrada"><span class="marcador"></span>${icone('entrada')} Entrada (dinheiro que entra)</button>
              <button type="button" class="opcao vermelha" data-tipo="despesa"><span class="marcador"></span>${icone('despesa')} Despesa (dinheiro que sai)</button>
            </div>
          </div>
          <div class="form-grade">
            <div class="campo inteiro">
              <label for="l-desc">Descrição</label>
              <input class="entrada" id="l-desc" maxlength="120" value="${Util.esc(ex?.descricao || '')}">
            </div>
            <div class="campo">
              <label for="l-valor">Valor</label>
              <div class="com-prefixo"><span class="prefixo">R$</span>
                <input class="entrada" id="l-valor" data-mascara="moeda" inputmode="numeric" placeholder="0,00" value="${ex ? Fmt.decimal(ex.valor) : ''}"></div>
            </div>
            <div class="campo">
              <label for="l-data" id="l-data-rotulo">Data</label>
              <div class="com-acao">
                <input class="entrada" id="l-data" data-mascara="data" inputmode="numeric" placeholder="dd/mm/aaaa" value="${Fmt.data(ex?.data || Datas.hoje())}">
                <button type="button" class="btn btn-ghost" id="l-hoje">Hoje</button>
              </div>
            </div>
            <div class="campo">
              <label for="l-cat">Categoria</label>
              <div class="com-acao">
                <select class="entrada" id="l-cat"></select>
                <button type="button" class="btn btn-ghost" id="l-nova-cat" title="Criar nova categoria">${icone('mais')} Nova</button>
              </div>
            </div>
            <div class="campo">
              <label for="l-cli">Cliente <span class="opcional">(opcional)</span></label>
              <select class="entrada" id="l-cli">${UI.opcoes(clientes.map(c => [c.id, c.nome]), ex ? ex.clienteId : clienteId, 'Nenhum cliente')}</select>
            </div>
            <div class="campo">
              <label for="l-forma">Forma de pagamento</label>
              <select class="entrada" id="l-forma">${UI.opcoes(cfg.formasPagamento, ex?.formaPagamento || 'Pix')}</select>
            </div>
            <div class="campo inteiro">
              <span class="rotulo">Situação</span>
              <div class="opcoes" id="op-status">
                <button type="button" class="opcao" data-status="pago"><span class="marcador"></span><span data-txt="pago"></span></button>
                <button type="button" class="opcao" data-status="pendente"><span class="marcador"></span><span data-txt="pendente"></span></button>
              </div>
            </div>
          </div>
        </form>`,
      rodape: `
        <button class="btn btn-ghost" data-fechar>${icone('fechar')} Cancelar</button>
        <button class="btn btn-primario" data-salvar>${icone('salvar')} Salvar</button>`
    });

    const $ = s => m.el.querySelector(s);
    UI.limparErroAoDigitar(m.corpo);

    const desenharCategorias = selecionada => {
      const lista = DB.config().categorias[st.tipo] || [];
      const atual = selecionada ?? $('#l-cat').value ?? '';
      const itens = atual && !lista.includes(atual) ? [...lista, atual] : lista;
      $('#l-cat').innerHTML = UI.opcoes(itens, atual || itens[0]);
    };

    // Atualiza textos e cores conforme o tipo escolhido
    const aplicarTipo = () => {
      const t = textos[st.tipo];
      m.el.querySelectorAll('#op-tipo .opcao').forEach(b => b.classList.toggle('ativa', b.dataset.tipo === st.tipo));
      m.el.querySelectorAll('#op-status .opcao').forEach(b => b.classList.toggle('ativa', b.dataset.status === st.status));
      $('[data-txt="pago"]').textContent = t.pago;
      $('[data-txt="pendente"]').textContent = t.pendente;
      $('#l-desc').placeholder = t.desc;
      $('#l-data-rotulo').textContent = st.status === 'pendente' ? (st.tipo === 'entrada' ? 'Data prevista para receber' : 'Data de vencimento') : t.data;
      if (!ex) $('#modal-titulo').textContent = t.titulo;
      const faixa = $('.faixa');
      faixa.className = 'faixa ' + (st.tipo === 'entrada' ? 'verde' : 'vermelho');
      const salvar = $('[data-salvar]');
      salvar.className = 'btn ' + (st.tipo === 'entrada' ? 'btn-primario' : 'btn-perigo');
    };

    m.el.querySelectorAll('#op-tipo .opcao').forEach(b => b.addEventListener('click', () => {
      if (st.tipo === b.dataset.tipo) return;
      st.tipo = b.dataset.tipo;
      desenharCategorias('');
      aplicarTipo();
    }));
    m.el.querySelectorAll('#op-status .opcao').forEach(b => b.addEventListener('click', () => { st.status = b.dataset.status; aplicarTipo(); }));
    $('#l-hoje').addEventListener('click', () => { $('#l-data').value = Fmt.data(Datas.hoje()); UI.limparErros($('#l-data').closest('.campo')); });
    $('#l-nova-cat').addEventListener('click', async () => {
      const nome = await UI.perguntarTexto({ titulo: 'Nova categoria', rotulo: `Nome da categoria de ${st.tipo === 'entrada' ? 'entrada' : 'despesa'}`, placeholder: st.tipo === 'entrada' ? 'Ex.: Consultoria' : 'Ex.: Manutenção do carro' });
      if (!nome) return;
      const cats = DB.config().categorias;
      if (!cats[st.tipo].some(c => Util.normalizar(c) === Util.normalizar(nome))) {
        cats[st.tipo].push(nome);
        DB.salvarConfig({ categorias: cats });
        UI.toast('Categoria criada ✓');
      }
      desenharCategorias(cats[st.tipo].find(c => Util.normalizar(c) === Util.normalizar(nome)));
    });

    desenharCategorias(ex?.categoria || '');
    aplicarTipo();

    const salvar = () => {
      UI.limparErros(m.corpo);
      const desc = $('#l-desc');
      const valor = $('#l-valor');
      const data = $('#l-data');
      let primeiroErro = null;
      const erro = (c, msg) => { UI.erroCampo(c, msg); primeiroErro = primeiroErro || c; };
      if (!desc.value.trim()) erro(desc, 'Informe uma descrição para o lançamento.');
      if (!(paraNumero(valor.value) > 0)) erro(valor, 'Informe o valor do lançamento.');
      if (!Datas.deBR(data.value)) erro(data, 'Informe uma data válida, por exemplo 05/11/2026.');
      if (primeiroErro) { primeiroErro.focus(); return; }

      const dataIso = Datas.deBR(data.value);
      DB.salvar('lancamentos', {
        ...(ex || {}),
        tipo: st.tipo,
        descricao: desc.value.trim(),
        valor: Util.arred(paraNumero(valor.value)),
        data: dataIso,
        categoria: $('#l-cat').value,
        clienteId: $('#l-cli').value || null,
        formaPagamento: $('#l-forma').value,
        status: st.status,
        pagoEm: st.status === 'pago' ? (ex?.status === 'pago' && ex.pagoEm ? ex.pagoEm : dataIso) : null
      });
      m.fechar();
      UI.toast('Lançamento salvo com sucesso ✓');
      App.recarregar();
    };
    $('[data-salvar]').addEventListener('click', salvar);
    $('#form-lanc').addEventListener('submit', e => { e.preventDefault(); salvar(); });
  },

  /* ---------------- Exportação ---------------- */

  exportarExcel() {
    const { lista, periodo } = this.filtrar();
    const t = this.totais(lista);
    Exportar.excel('lancamentos-' + Exportar.nomeArquivo(periodo.rotulo), [
      Exportar.abaResumo('Lançamentos', periodo.rotulo, [
        ['Entradas recebidas', t.entradas],
        ['Despesas pagas', t.despesas],
        ['Saldo', t.saldo],
        ['A receber (pendente)', t.aReceber],
        ['A pagar (pendente)', t.aPagar],
        ['Quantidade de lançamentos', lista.length, 'inteiro']
      ]),
      Exportar.abaLancamentos('Entradas', lista.filter(l => l.tipo === 'entrada')),
      Exportar.abaLancamentos('Despesas', lista.filter(l => l.tipo === 'despesa'))
    ]);
  },

  exportarPDF() {
    const { lista, periodo, clientes } = this.filtrar();
    const t = this.totais(lista);
    const nomeCli = id => clientes.find(c => c.id === id)?.nome || '-';
    const linhas = ls => ls.map(l => [Fmt.data(l.data), l.descricao, l.categoria || '-', nomeCli(l.clienteId),
      ({ pago: l.tipo === 'entrada' ? 'Recebido' : 'Pago', pendente: 'Pendente', atrasado: 'Atrasado' })[Calc.status(l)], Fmt.moeda(l.valor)]);
    const cab = ['Data', 'Descrição', 'Categoria', 'Cliente', 'Situação', 'Valor'];
    const entradas = lista.filter(l => l.tipo === 'entrada');
    const despesas = lista.filter(l => l.tipo === 'despesa');
    Exportar.pdfRelatorio({
      titulo: 'Lançamentos',
      periodo: periodo.rotulo,
      arquivo: 'lancamentos-' + Exportar.nomeArquivo(periodo.rotulo),
      indicadores: [
        { rotulo: 'Entradas recebidas', valor: Fmt.moeda(t.entradas) },
        { rotulo: 'Despesas pagas', valor: Fmt.moeda(t.despesas) },
        { rotulo: 'Saldo', valor: Fmt.moeda(t.saldo), ruim: t.saldo < 0 },
        { rotulo: 'A receber (pendente)', valor: Fmt.moeda(t.aReceber) },
        { rotulo: 'A pagar (pendente)', valor: Fmt.moeda(t.aPagar) },
        { rotulo: 'Lançamentos', valor: String(lista.length) }
      ],
      tabelas: [
        { titulo: 'Entradas', cabecalho: cab, linhas: linhas(entradas), direita: [5], rodape: entradas.length ? ['', 'Total', '', '', '', Fmt.moeda(Util.soma(entradas, l => l.valor))] : null },
        { titulo: 'Despesas', cabecalho: cab, linhas: linhas(despesas), direita: [5], rodape: despesas.length ? ['', 'Total', '', '', '', Fmt.moeda(Util.soma(despesas, l => l.valor))] : null }
      ]
    });
  }
};
