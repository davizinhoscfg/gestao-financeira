/* =========================================================
   Página 4 — Clientes (lista) e Ficha do cliente
   ========================================================= */
'use strict';

const PaginaClientes = {
  busca: '',

  render(el) {
    el.innerHTML = `
      ${UI.cabecalho({
        titulo: 'Clientes',
        descricao: 'Todas as pessoas e empresas que compram de você, com quanto já pagaram e quanto ainda devem.',
        acoes: `<button class="btn btn-primario btn-lg" data-acao="novo">${icone('novoCliente')} + Novo cliente</button>`
      })}
      <div class="filtros anim" style="--i:1">
        <label class="busca">
          <span class="sr-only">Buscar cliente</span>
          ${icone('busca')}
          <input class="entrada" id="cli-busca" placeholder="Buscar cliente pelo nome" value="${Util.esc(this.busca)}">
        </label>
        <div class="linha-flex" style="margin-left:auto">
          <button class="btn btn-ghost" data-exportar="excel">${icone('excel')} Baixar em Excel</button>
          <button class="btn btn-ghost" data-exportar="pdf">${icone('pdf')} Baixar em PDF</button>
        </div>
      </div>
      <div id="cli-lista"></div>`;

    el.querySelector('[data-acao="novo"]').addEventListener('click', () => this.abrirFormulario());
    el.querySelector('#cli-busca').addEventListener('input', Util.debounce(e => { this.busca = e.target.value; this.renderLista(); }, 150));
    el.querySelector('[data-exportar="excel"]').addEventListener('click', () => this.exportarExcel());
    el.querySelector('[data-exportar="pdf"]').addEventListener('click', () => this.exportarPDF());
    this.renderLista();
  },

  renderLista() {
    const caixa = document.getElementById('cli-lista');
    if (!caixa) return;
    const todos = DB.listar('clientes');
    const termo = Util.normalizar(this.busca);
    const lista = todos.filter(c => Util.normalizar(c.nome).includes(termo)).sort((a, b) => a.nome.localeCompare(b.nome));

    if (!todos.length) {
      caixa.innerHTML = `<div class="cartao">${UI.vazio({
        iconeNome: 'clientes', titulo: 'Você ainda não tem clientes',
        texto: 'Clique em "+ Novo cliente" para começar.',
        botao: `<button class="btn btn-primario" data-acao="novo-vazio">${icone('novoCliente')} + Novo cliente</button>`
      })}</div>`;
      caixa.querySelector('[data-acao="novo-vazio"]').addEventListener('click', () => this.abrirFormulario());
      return;
    }
    if (!lista.length) {
      caixa.innerHTML = `<div class="cartao">${UI.vazio({ iconeNome: 'busca', titulo: 'Nenhum cliente encontrado', texto: `Não achamos ninguém com "${Util.esc(this.busca)}". Confira o nome ou cadastre um novo cliente.` })}</div>`;
      return;
    }

    caixa.innerHTML = `<div class="clientes-grade">${lista.map((c, i) => {
      const r = Calc.resumoCliente(c.id);
      const temAtraso = r.atrasado > 0;
      return `
        <article class="cartao cliente-cartao anim" style="--i:${Math.min(i, 10)}" data-abrir="${c.id}" tabindex="0" role="link" aria-label="Abrir ficha de ${Util.esc(c.nome)}">
          <div class="topo">
            <span class="avatar">${Util.esc(Util.iniciais(c.nome))}</span>
            <div style="min-width:0">
              <h3>${Util.esc(c.nome)}</h3>
              <span class="apagado">${Util.esc(c.telefone || 'Sem telefone')}</span>
            </div>
          </div>
          <div class="valores">
            <div><span>Total pago</span><strong class="positivo">${Fmt.moeda(r.totalPago)}</strong></div>
            <div class="${temAtraso ? 'alerta' : ''}"><span>${temAtraso ? 'Em aberto (atrasado!)' : 'Em aberto'}</span><strong class="${temAtraso ? 'negativo' : ''}">${Fmt.moeda(r.emAberto)}</strong></div>
          </div>
          <div class="botoes">
            <button class="btn btn-escuro btn-sm" data-abrir-btn="${c.id}">${icone('ver', 'ico-sm')} Ver ficha</button>
            ${c.whatsapp || c.telefone ? `<a class="btn btn-whats btn-sm" href="${this.linkWhats(c)}" target="_blank" rel="noopener" data-whats>${icone('whatsapp', 'ico-sm')} WhatsApp</a>` : ''}
          </div>
        </article>`;
    }).join('')}</div>`;

    caixa.querySelectorAll('[data-abrir]').forEach(card => {
      const abrir = () => App.ir('cliente/' + card.dataset.abrir);
      card.addEventListener('click', e => { if (!e.target.closest('[data-whats]')) abrir(); });
      card.addEventListener('keydown', e => { if (e.key === 'Enter') abrir(); });
    });
  },

  /** Link para conversar no WhatsApp (adiciona o 55 do Brasil). */
  linkWhats(c) {
    let d = Util.digitos(c.whatsapp || c.telefone);
    if (d.length <= 11) d = '55' + d;
    const nome = c.nome.split(' ')[0];
    return `https://wa.me/${d}?text=${encodeURIComponent(`Olá, ${nome}! Tudo bem?`)}`;
  },

  /** Formulário de cliente (novo ou edição). */
  abrirFormulario({ id, aoSalvar } = {}) {
    const ex = id ? DB.obter('clientes', id) : null;
    const v = campo => Util.esc(ex?.[campo] || '');
    const m = UI.modal({
      titulo: ex ? 'Editar cliente' : 'Novo cliente',
      subtitulo: 'Só o nome é obrigatório. O resto você pode completar depois.',
      conteudo: `
        <form id="form-cli" class="form-grade" novalidate>
          <div class="campo inteiro"><label for="c-nome">Nome completo ou razão social</label>
            <input class="entrada" id="c-nome" maxlength="100" placeholder="Ex.: Maria da Silva ou Padaria Central Ltda" value="${v('nome')}"></div>
          <div class="campo"><label for="c-doc">CPF ou CNPJ <span class="opcional">(opcional)</span></label>
            <input class="entrada" id="c-doc" data-mascara="documento" inputmode="numeric" placeholder="000.000.000-00" value="${v('documento')}"></div>
          <div class="campo"><label for="c-email">E-mail <span class="opcional">(opcional)</span></label>
            <input class="entrada" id="c-email" type="email" inputmode="email" placeholder="Ex.: maria@email.com" value="${v('email')}"></div>
          <div class="campo"><label for="c-tel">Telefone <span class="opcional">(opcional)</span></label>
            <input class="entrada" id="c-tel" data-mascara="telefone" inputmode="tel" placeholder="(11) 3333-4444" value="${v('telefone')}"></div>
          <div class="campo"><label for="c-whats">WhatsApp <span class="opcional">(opcional)</span></label>
            <input class="entrada" id="c-whats" data-mascara="telefone" inputmode="tel" placeholder="(11) 98765-4321" value="${v('whatsapp')}">
            <button type="button" class="btn btn-texto btn-sm" id="c-copiar" style="margin-top:6px;padding-left:0">${icone('duplicar', 'ico-sm')} Usar o mesmo número do telefone</button></div>
          <div class="campo inteiro"><label for="c-end">Endereço <span class="opcional">(opcional)</span></label>
            <input class="entrada" id="c-end" maxlength="200" placeholder="Ex.: Rua das Flores, 120 - Centro, São Paulo/SP" value="${v('endereco')}"></div>
          <div class="campo inteiro"><label for="c-obs">Observações <span class="opcional">(opcional)</span></label>
            <textarea class="entrada" id="c-obs" placeholder="Ex.: Prefere ser atendido pela manhã.">${v('observacoes')}</textarea></div>
        </form>`,
      rodape: `
        <button class="btn btn-ghost" data-fechar>${icone('fechar')} Cancelar</button>
        <button class="btn btn-primario" data-salvar>${icone('salvar')} Salvar</button>`
    });
    const $ = s => m.el.querySelector(s);
    UI.limparErroAoDigitar(m.corpo);
    $('#c-copiar').addEventListener('click', () => { $('#c-whats').value = $('#c-tel').value; });

    const salvar = () => {
      UI.limparErros(m.corpo);
      let primeiroErro = null;
      const erro = (c, msg) => { UI.erroCampo(c, msg); primeiroErro = primeiroErro || c; };
      if (!$('#c-nome').value.trim()) erro($('#c-nome'), 'Informe o nome do cliente.');
      if ($('#c-doc').value && !Validar.documento($('#c-doc').value)) erro($('#c-doc'), 'CPF tem 11 números e CNPJ tem 14. Confira o que foi digitado.');
      if ($('#c-email').value && !Validar.email($('#c-email').value)) erro($('#c-email'), 'Esse e-mail parece incompleto. Ex.: nome@email.com');
      if ($('#c-tel').value && !Validar.telefone($('#c-tel').value)) erro($('#c-tel'), 'Telefone incompleto. Coloque o DDD, ex.: (11) 3333-4444');
      if ($('#c-whats').value && !Validar.telefone($('#c-whats').value)) erro($('#c-whats'), 'WhatsApp incompleto. Coloque o DDD, ex.: (11) 98765-4321');
      if (primeiroErro) { primeiroErro.focus(); return; }

      const salvo = DB.salvar('clientes', {
        ...(ex || {}),
        nome: $('#c-nome').value.trim(),
        documento: $('#c-doc').value,
        email: $('#c-email').value.trim(),
        telefone: $('#c-tel').value,
        whatsapp: $('#c-whats').value,
        endereco: $('#c-end').value.trim(),
        observacoes: $('#c-obs').value.trim()
      });
      m.fechar();
      UI.toast(ex ? 'Cliente atualizado com sucesso ✓' : 'Cliente cadastrado com sucesso ✓');
      if (aoSalvar) aoSalvar(salvo);
      else App.recarregar();
    };
    $('[data-salvar]').addEventListener('click', salvar);
    $('#form-cli').addEventListener('submit', e => { e.preventDefault(); salvar(); });
  },

  /* ---------------- Exportação ---------------- */

  exportarExcel() {
    const clientes = DB.listar('clientes').sort((a, b) => a.nome.localeCompare(b.nome));
    const resumos = clientes.map(c => Calc.resumoCliente(c.id));
    Exportar.excel('clientes-' + Datas.hoje(), [
      Exportar.abaResumo('Clientes', 'Todos os registros até ' + Fmt.data(Datas.hoje()), [
        ['Quantidade de clientes', clientes.length, 'inteiro'],
        ['Total já pago pelos clientes', Util.soma(resumos, r => r.totalPago)],
        ['Total em aberto', Util.soma(resumos, r => r.emAberto)],
        ['Total em atraso', Util.soma(resumos, r => r.atrasado)]
      ]),
      Exportar.abaClientes(clientes)
    ]);
  },

  exportarPDF() {
    const clientes = DB.listar('clientes').sort((a, b) => a.nome.localeCompare(b.nome));
    const resumos = clientes.map(c => ({ c, r: Calc.resumoCliente(c.id) }));
    Exportar.pdfRelatorio({
      titulo: 'Clientes',
      periodo: 'Até ' + Fmt.data(Datas.hoje()),
      arquivo: 'clientes-' + Datas.hoje(),
      indicadores: [
        { rotulo: 'Clientes cadastrados', valor: String(clientes.length) },
        { rotulo: 'Total já pago', valor: Fmt.moeda(Util.soma(resumos, x => x.r.totalPago)) },
        { rotulo: 'Total em aberto', valor: Fmt.moeda(Util.soma(resumos, x => x.r.emAberto)), detalhe: 'Em atraso: ' + Fmt.moeda(Util.soma(resumos, x => x.r.atrasado)), detalheCor: 'ruim' }
      ],
      tabelas: [{
        titulo: 'Lista de clientes',
        cabecalho: ['Nome', 'Telefone', 'E-mail', 'Total pago', 'Em aberto', 'Último pagamento'],
        linhas: resumos.map(({ c, r }) => [c.nome, c.whatsapp || c.telefone || '-', c.email || '-', Fmt.moeda(r.totalPago), Fmt.moeda(r.emAberto), r.ultimoPagamento ? Fmt.data(r.ultimoPagamento) : '-']),
        direita: [3, 4, 5]
      }]
    });
  }
};

/* ---------------- Ficha do cliente ---------------- */
const PaginaCliente = {
  render(el, id) {
    const c = DB.obter('clientes', id);
    if (!c) {
      el.innerHTML = `<a href="#/clientes" class="voltar">${icone('voltar', 'ico-sm')} Voltar para clientes</a>
        <div class="cartao">${UI.vazio({ iconeNome: 'alerta', titulo: 'Cliente não encontrado', texto: 'Ele pode ter sido excluído. Volte para a lista de clientes.' })}</div>`;
      return;
    }
    const r = Calc.resumoCliente(c.id);
    const orcs = DB.listar('orcamentos').filter(o => o.clienteId === c.id).sort((a, b) => b.data.localeCompare(a.data));
    const lancs = DB.listar('lancamentos').filter(l => l.clienteId === c.id).sort((a, b) => b.data.localeCompare(a.data));
    const dado = (ic, rotulo, valor) => valor ? `<div class="dado">${icone(ic)}<div><span>${rotulo}</span><strong>${Util.esc(valor)}</strong></div></div>` : '';

    el.innerHTML = `
      <a href="#/clientes" class="voltar anim">${icone('voltar', 'ico-sm')} Voltar para clientes</a>
      <div class="cabecalho anim">
        <div class="ficha-topo">
          <span class="avatar grande">${Util.esc(Util.iniciais(c.nome))}</span>
          <div class="nome">
            <h1>${Util.esc(c.nome)}</h1>
            <p class="descricao">Ficha do cliente: dados, orçamentos e pagamentos.</p>
          </div>
        </div>
        <div class="acoes">
          ${c.whatsapp || c.telefone ? `<a class="btn btn-whats" href="${PaginaClientes.linkWhats(c)}" target="_blank" rel="noopener">${icone('whatsapp')} Chamar no WhatsApp</a>` : ''}
          <button class="btn btn-ghost" data-acao="editar">${icone('editar')} Editar</button>
          <button class="btn btn-ghost" data-acao="excluir">${icone('lixeira')} Excluir</button>
        </div>
      </div>

      <div class="grade grade-3">
        ${UI.kpi({ i: 1, rotulo: 'Total faturado', valor: r.totalPago, iconeNome: 'carteira', cor: 'verde', variacao: false, ajuda: 'Tudo que este cliente já te pagou.' })}
        ${UI.kpi({ i: 2, rotulo: 'Total pendente', valor: r.emAberto, iconeNome: 'relogio', cor: r.atrasado ? 'vermelho' : 'amarelo', variacao: false,
          ajuda: 'Quanto este cliente ainda precisa te pagar.',
          rodape: r.atrasado ? `<span class="negativo forte">${Fmt.moeda(r.atrasado)} em atraso</span>` : 'Nada em atraso' })}
        <div class="cartao kpi anim" style="--i:3">
          <div class="kpi-topo"><span class="kpi-icone">${icone('calendario')}</span></div>
          <div><div class="kpi-rotulo">Último pagamento</div><div class="kpi-valor">${r.ultimoPagamento ? Fmt.data(r.ultimoPagamento) : '—'}</div></div>
          <div class="kpi-rodape">${r.ultimoPagamento ? Datas.relativo(r.ultimoPagamento) : 'Ainda não pagou nada'}</div>
        </div>
      </div>

      <div class="grade grade-1-2 secao">
        <section class="cartao anim" style="--i:4">
          <div class="cartao-titulo"><h2>Dados</h2></div>
          <div class="dados-lista">
            ${dado('documento', 'CPF / CNPJ', c.documento)}
            ${dado('telefone', 'Telefone', c.telefone)}
            ${dado('whatsapp', 'WhatsApp', c.whatsapp)}
            ${dado('email', 'E-mail', c.email)}
            ${dado('local', 'Endereço', c.endereco)}
            ${dado('nota', 'Observações', c.observacoes)}
            ${!c.documento && !c.telefone && !c.email && !c.endereco ? '<p class="apagado">Nenhum dado extra cadastrado. Clique em "Editar" para completar.</p>' : ''}
          </div>
        </section>

        <div style="display:flex;flex-direction:column;gap:20px;min-width:0">
          <section class="cartao anim" style="--i:5">
            <div class="cartao-titulo">
              <h2>Orçamentos</h2>
              <button class="btn btn-ghost btn-sm" data-acao="novo-orc">${icone('mais', 'ico-sm')} Novo orçamento</button>
            </div>
            ${orcs.length ? `
              <div class="tabela-wrap"><table class="tabela responsiva">
                <thead><tr><th>Nº</th><th>Data</th><th>Situação</th><th class="direita">Total</th><th></th></tr></thead>
                <tbody>${orcs.map(o => `
                  <tr class="clicavel" data-orc="${o.id}">
                    <td data-rotulo="Nº" class="forte">${Fmt.numeroOrcamento(o.numero)}</td>
                    <td data-rotulo="Data">${Fmt.data(o.data)}</td>
                    <td data-rotulo="Situação">${UI.etiqueta(o.status)}</td>
                    <td data-rotulo="Total" class="direita num forte">${Fmt.moeda(Calc.totalOrcamento(o).total)}</td>
                    <td class="sem-rotulo"><div class="acoes-celula"><button class="btn btn-ghost btn-sm">${icone('ver', 'ico-sm')} Ver</button></div></td>
                  </tr>`).join('')}</tbody>
              </table></div>`
              : UI.vazio({ iconeNome: 'orcamentos', titulo: 'Nenhum orçamento', texto: 'Clique em "+ Novo orçamento" para criar um para este cliente.' })}
          </section>

          <section class="cartao anim" style="--i:6">
            <div class="cartao-titulo">
              <h2>Lançamentos</h2>
              <button class="btn btn-ghost btn-sm" data-acao="novo-lanc">${icone('mais', 'ico-sm')} Nova entrada</button>
            </div>
            ${lancs.length ? `
              <div class="tabela-wrap"><table class="tabela responsiva">
                <thead><tr><th>Data</th><th>Descrição</th><th>Situação</th><th class="direita">Valor</th><th></th></tr></thead>
                <tbody>${lancs.map(l => `
                  <tr>
                    <td data-rotulo="Data" class="num">${Fmt.data(l.data)}</td>
                    <td data-rotulo="Descrição"><span class="principal">${Util.esc(l.descricao)}</span></td>
                    <td data-rotulo="Situação">${UI.etiqueta(Calc.status(l), l.tipo)}</td>
                    <td data-rotulo="Valor" class="direita num forte ${l.tipo === 'entrada' ? 'positivo' : 'negativo'}">${Fmt.moeda(l.valor)}</td>
                    <td class="sem-rotulo"><div class="acoes-celula">${l.status !== 'pago' ? `<button class="btn btn-primario btn-sm" data-pagar="${l.id}">${icone('check', 'ico-sm')} ${l.tipo === 'entrada' ? 'Recebi' : 'Paguei'}</button>` : ''}</div></td>
                  </tr>`).join('')}</tbody>
              </table></div>`
              : UI.vazio({ iconeNome: 'lancamentos', titulo: 'Nenhum lançamento', texto: 'Quando este cliente te pagar, registre uma entrada e ela aparece aqui.' })}
          </section>
        </div>
      </div>`;

    el.querySelector('[data-acao="editar"]').addEventListener('click', () => PaginaClientes.abrirFormulario({ id: c.id }));
    el.querySelector('[data-acao="excluir"]').addEventListener('click', async () => {
      const ok = await UI.confirmar({
        titulo: 'Excluir cliente?',
        mensagem: `<strong>${Util.esc(c.nome)}</strong> será excluído. Os orçamentos e lançamentos dele continuam salvos, mas ficam sem cliente vinculado.`
      });
      if (!ok) return;
      DB.removerCliente(c.id);
      UI.toast('Cliente excluído');
      App.ir('clientes');
    });
    el.querySelector('[data-acao="novo-orc"]').addEventListener('click', () => PaginaOrcamentos.abrirAssistente({ clienteId: c.id }));
    el.querySelector('[data-acao="novo-lanc"]').addEventListener('click', () => PaginaLancamentos.abrirFormulario({ tipo: 'entrada', clienteId: c.id }));
    el.querySelectorAll('[data-orc]').forEach(tr => tr.addEventListener('click', () => PaginaOrcamentos.ver(tr.dataset.orc)));
    el.querySelectorAll('[data-pagar]').forEach(b => b.addEventListener('click', () => PaginaLancamentos.marcarPago(b.dataset.pagar)));
  }
};
