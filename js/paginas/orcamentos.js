/* =========================================================
   Página 2 — Orçamentos
   Lista, assistente de criação em 3 passos, visualização,
   aprovação (com geração de lançamento) e PDF.
   ========================================================= */
'use strict';

const PaginaOrcamentos = {
  filtro: 'todos',
  busca: '',

  STATUS: [['todos', 'Todos'], ['rascunho', 'Rascunho'], ['enviado', 'Enviado'], ['aprovado', 'Aprovado'], ['recusado', 'Recusado']],

  render(el) {
    el.innerHTML = `
      ${UI.cabecalho({
        titulo: 'Orçamentos',
        descricao: 'Monte orçamentos em poucos passos, baixe em PDF e acompanhe quais foram aprovados.',
        acoes: `<button class="btn btn-primario btn-lg" data-acao="criar">${icone('mais')} Criar orçamento</button>`
      })}
      <div class="filtros anim" style="--i:1">
        <div class="pilulas" id="orc-filtro"></div>
        <label class="busca">
          <span class="sr-only">Buscar orçamento</span>
          ${icone('busca')}
          <input class="entrada" id="orc-busca" placeholder="Buscar por cliente ou número" value="${Util.esc(this.busca)}">
        </label>
      </div>
      <div id="orc-lista"></div>`;

    el.querySelector('[data-acao="criar"]').addEventListener('click', () => this.abrirAssistente());
    el.querySelector('#orc-busca').addEventListener('input', Util.debounce(e => { this.busca = e.target.value; this.renderLista(); }, 150));
    this.renderLista();
  },

  renderLista() {
    const caixa = document.getElementById('orc-lista');
    if (!caixa) return;
    const clientes = DB.listar('clientes');
    const todos = DB.listar('orcamentos').sort((a, b) => b.numero - a.numero);
    const nomeCli = o => clientes.find(c => c.id === o.clienteId)?.nome || 'Sem cliente';

    // Pílulas de filtro com contagem
    const filtroEl = document.getElementById('orc-filtro');
    filtroEl.innerHTML = this.STATUS.map(([v, t]) => {
      const n = v === 'todos' ? todos.length : todos.filter(o => o.status === v).length;
      return `<button class="pilula ${this.filtro === v ? 'ativa' : ''}" data-filtro="${v}">${t} (${n})</button>`;
    }).join('');
    filtroEl.querySelectorAll('[data-filtro]').forEach(b => b.addEventListener('click', () => { this.filtro = b.dataset.filtro; this.renderLista(); }));

    const termo = Util.normalizar(this.busca);
    const lista = todos.filter(o =>
      (this.filtro === 'todos' || o.status === this.filtro) &&
      (!termo || Util.normalizar(nomeCli(o)).includes(termo) || Fmt.numeroOrcamento(o.numero).includes(termo))
    );

    if (!todos.length) {
      caixa.innerHTML = `<div class="cartao">${UI.vazio({
        iconeNome: 'orcamentos', titulo: 'Você ainda não tem orçamentos',
        texto: 'Clique em "+ Criar orçamento" para montar o primeiro. É rápido: escolha o cliente, adicione os itens e pronto!',
        botao: `<button class="btn btn-primario" data-acao="criar-vazio">${icone('mais')} Criar orçamento</button>`
      })}</div>`;
      caixa.querySelector('[data-acao="criar-vazio"]').addEventListener('click', () => this.abrirAssistente());
      return;
    }
    if (!lista.length) {
      caixa.innerHTML = `<div class="cartao">${UI.vazio({ iconeNome: 'busca', titulo: 'Nenhum orçamento encontrado', texto: 'Tente outro nome ou escolha "Todos" no filtro acima.' })}</div>`;
      return;
    }

    caixa.innerHTML = `<div class="orcamentos-lista">${lista.map((o, i) => {
      const { total } = Calc.totalOrcamento(o);
      const vencido = o.status === 'enviado' && o.validade < Datas.hoje();
      return `
        <article class="cartao orc-cartao anim" style="--i:${Math.min(i, 8)}">
          <div>
            <div class="linha-flex"><span class="numero">Nº ${Fmt.numeroOrcamento(o.numero)}</span>${UI.etiqueta(o.status)}</div>
            <h3>${Util.esc(nomeCli(o))}</h3>
            <div class="meta">
              <span>${icone('calendario', 'ico-sm')} ${Fmt.data(o.data)}</span>
              <span class="${vencido ? 'negativo forte' : ''}">${icone('relogio', 'ico-sm')} ${vencido ? 'Venceu em' : 'Válido até'} ${Fmt.data(o.validade)}</span>
              <span>${o.itens.length} ${o.itens.length === 1 ? 'item' : 'itens'}</span>
            </div>
          </div>
          <div>
            <span class="apagado">Total</span>
            <div class="valor">${Fmt.moeda(total)}</div>
          </div>
          <div class="botoes">
            <button class="btn btn-ghost btn-sm" data-ver="${o.id}">${icone('ver', 'ico-sm')} Ver</button>
            <button class="btn btn-ghost btn-sm" data-editar="${o.id}">${icone('editar', 'ico-sm')} Editar</button>
            <button class="btn btn-ghost btn-sm" data-pdf="${o.id}">${icone('pdf', 'ico-sm')} Baixar PDF</button>
            <button class="btn btn-ghost btn-sm" data-duplicar="${o.id}">${icone('duplicar', 'ico-sm')} Duplicar</button>
            ${o.status !== 'aprovado' ? `<button class="btn btn-primario btn-sm" data-aprovar="${o.id}">${icone('checkCirculo', 'ico-sm')} Aprovar</button>` : ''}
            <button class="btn btn-texto btn-sm" data-excluir="${o.id}" aria-label="Excluir orçamento">${icone('lixeira', 'ico-sm')} Excluir</button>
          </div>
        </article>`;
    }).join('')}</div>`;

    const ligar = (attr, fn) => caixa.querySelectorAll(`[data-${attr}]`).forEach(b => b.addEventListener('click', () => fn.call(this, b.dataset[attr])));
    ligar('ver', this.ver);
    ligar('editar', id => this.abrirAssistente({ id }));
    ligar('pdf', id => Exportar.pdfOrcamento(DB.obter('orcamentos', id)));
    ligar('duplicar', this.duplicar);
    ligar('aprovar', this.aprovar);
    ligar('excluir', this.excluir);
  },

  /* ---------------- Ações ---------------- */

  duplicar(id) {
    const o = DB.obter('orcamentos', id);
    const copia = {
      ...o, id: undefined, exemplo: undefined, numero: DB.proximoNumeroOrcamento(),
      status: 'rascunho', data: Datas.hoje(), validade: Datas.addDias(Datas.hoje(), 15), lancamentoId: null
    };
    const salvo = DB.salvar('orcamentos', copia);
    UI.toast(`Orçamento duplicado como Nº ${Fmt.numeroOrcamento(salvo.numero)} ✓`);
    App.recarregar();
  },

  async excluir(id) {
    const o = DB.obter('orcamentos', id);
    const ok = await UI.confirmar({
      titulo: 'Excluir orçamento?',
      mensagem: `O orçamento <strong>Nº ${Fmt.numeroOrcamento(o.numero)}</strong> será apagado. ${o.lancamentoId ? 'O lançamento a receber gerado por ele continuará salvo.' : ''} Essa ação não pode ser desfeita.`
    });
    if (!ok) return;
    DB.remover('orcamentos', id);
    UI.toast('Orçamento excluído');
    App.recarregar();
  },

  mudarStatus(id, status) {
    DB.atualizar('orcamentos', id, { status });
    UI.toast(status === 'enviado' ? 'Orçamento marcado como enviado ✓' : 'Orçamento marcado como recusado');
    App.recarregar();
  },

  /** Aprova e pergunta se deve gerar um lançamento a receber. */
  aprovar(id) {
    const o = DB.obter('orcamentos', id);
    const cli = o.clienteId ? DB.obter('clientes', o.clienteId) : null;
    const { total } = Calc.totalOrcamento(o);
    const jaTemLancamento = o.lancamentoId && DB.obter('lancamentos', o.lancamentoId);

    const m = UI.modal({
      titulo: 'Aprovar orçamento',
      tamanho: 'pequeno',
      conteudo: `
        <div class="confirmar-icone verde">${icone('checkCirculo')}</div>
        <p style="font-size:17px;margin-bottom:18px">O orçamento <strong>Nº ${Fmt.numeroOrcamento(o.numero)}</strong>${cli ? ` de <strong>${Util.esc(cli.nome)}</strong>` : ''}, no valor de <strong>${Fmt.moeda(total)}</strong>, será marcado como aprovado.</p>
        ${jaTemLancamento ? '<p class="apagado">Este orçamento já tem um lançamento a receber.</p>' : `
          <label class="caixa-marcar">
            <input type="checkbox" id="gerar-lanc" checked>
            <span>Gerar um lançamento "a receber" automaticamente<br><span class="apagado" style="font-weight:500">Assim você não esquece de cobrar. Ele aparece em Lançamentos como pendente.</span></span>
          </label>
          <div class="campo" id="campo-data-receber" style="margin-top:14px">
            <label for="data-receber">Quando você espera receber?</label>
            <input class="entrada" id="data-receber" data-mascara="data" inputmode="numeric" placeholder="dd/mm/aaaa" value="${Fmt.data(Datas.addDias(Datas.hoje(), 7))}">
          </div>`}`,
      rodape: `
        <button class="btn btn-ghost" data-fechar>${icone('fechar')} Cancelar</button>
        <button class="btn btn-primario" data-confirmar>${icone('check')} Aprovar orçamento</button>`
    });

    const caixa = m.el.querySelector('#gerar-lanc');
    caixa?.addEventListener('change', () => { m.el.querySelector('#campo-data-receber').style.display = caixa.checked ? '' : 'none'; });

    m.el.querySelector('[data-confirmar]').addEventListener('click', () => {
      const atual = { status: 'aprovado' };
      if (caixa && caixa.checked) {
        const campo = m.el.querySelector('#data-receber');
        const data = Datas.deBR(campo.value);
        if (!data) { UI.erroCampo(campo, 'Informe uma data válida, por exemplo 15/11/2026.'); return; }
        const lanc = DB.salvar('lancamentos', {
          tipo: 'entrada',
          descricao: `Orçamento Nº ${Fmt.numeroOrcamento(o.numero)}${cli ? ' - ' + cli.nome : ''}`,
          valor: total, data, categoria: 'Serviço', clienteId: o.clienteId || null,
          formaPagamento: 'Pix', status: 'pendente', orcamentoId: o.id
        });
        atual.lancamentoId = lanc.id;
      }
      DB.atualizar('orcamentos', o.id, atual);
      m.fechar();
      UI.toast(atual.lancamentoId ? 'Orçamento aprovado e lançamento a receber criado ✓' : 'Orçamento aprovado ✓');
      App.recarregar();
    });
  },

  /** Visualização do orçamento, com as principais ações. */
  ver(id) {
    const o = DB.obter('orcamentos', id);
    const m = UI.modal({
      titulo: `Orçamento Nº ${Fmt.numeroOrcamento(o.numero)}`,
      subtitulo: UI.etiqueta(o.status),
      tamanho: 'largo',
      conteudo: this.documentoHTML(o),
      rodape: `
        ${o.status === 'rascunho' ? `<button class="btn btn-ghost esquerda" data-status="enviado">${icone('enviar')} Marcar como enviado</button>` : ''}
        ${o.status === 'enviado' ? `<button class="btn btn-ghost esquerda" data-status="recusado">${icone('xCirculo')} Cliente recusou</button>` : ''}
        <button class="btn btn-ghost" data-editar>${icone('editar')} Editar</button>
        <button class="btn btn-escuro" data-pdf>${icone('pdf')} Baixar PDF</button>
        ${o.status !== 'aprovado' ? `<button class="btn btn-primario" data-aprovar>${icone('checkCirculo')} Aprovar</button>` : ''}`
    });
    m.el.querySelector('[data-editar]').addEventListener('click', () => { m.fechar(); this.abrirAssistente({ id }); });
    m.el.querySelector('[data-pdf]').addEventListener('click', () => Exportar.pdfOrcamento(DB.obter('orcamentos', id)));
    m.el.querySelector('[data-aprovar]')?.addEventListener('click', () => { m.fechar(); this.aprovar(id); });
    m.el.querySelector('[data-status]')?.addEventListener('click', e => { m.fechar(); this.mudarStatus(id, e.currentTarget.dataset.status); });
  },

  /** HTML de pré-visualização (parecido com o PDF). */
  documentoHTML(o) {
    const emp = DB.config().empresa;
    const cli = o.clienteId ? DB.obter('clientes', o.clienteId) : null;
    const { subtotal, desconto, total } = Calc.totalOrcamento(o);
    return `
      <div class="doc-orcamento">
        <div class="doc-topo">
          <div class="linha-flex">
            <span class="marca-logo">${emp.logo ? `<img src="${emp.logo}" alt="">` : Util.esc(Util.iniciais(emp.nome))}</span>
            <div>
              <strong>${Util.esc(emp.nome)}</strong>
              <div class="apagado">${Util.esc([emp.telefone, emp.email].filter(Boolean).join(' · ') || 'Complete os dados da empresa em Configurações')}</div>
            </div>
          </div>
          <div class="doc-num">
            <h3>ORÇAMENTO</h3>
            <span class="apagado">Nº ${Fmt.numeroOrcamento(o.numero || 0)}</span>
          </div>
        </div>
        <div class="bloco">
          <div>
            <span>Cliente</span>
            <strong>${Util.esc(cli ? cli.nome : 'Não informado')}</strong>
            ${cli ? `<div class="apagado">${Util.esc([cli.documento, cli.telefone].filter(Boolean).join(' · '))}</div>` : ''}
          </div>
          <div>
            <span>Emissão / Validade</span>
            <strong>${Fmt.data(o.data)} até ${Fmt.data(o.validade)}</strong>
          </div>
        </div>
        <div class="tabela-wrap">
          <table class="tabela">
            <thead><tr><th>Descrição</th><th class="direita">Qtd.</th><th class="direita">Valor unit.</th><th class="direita">Subtotal</th></tr></thead>
            <tbody>${o.itens.map(it => `
              <tr>
                <td>${Util.esc(it.descricao)}</td>
                <td class="direita num">${String(it.quantidade).replace('.', ',')}</td>
                <td class="direita num">${Fmt.moeda(it.valorUnitario)}</td>
                <td class="direita num forte">${Fmt.moeda(it.quantidade * it.valorUnitario)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="totais-doc">
          <div><span class="apagado">Subtotal</span><span class="num">${Fmt.moeda(subtotal)}</span></div>
          ${desconto > 0 ? `<div><span class="apagado">Desconto${o.descontoTipo === 'percentual' ? ` (${Fmt.pct(o.descontoValor, 0)})` : ''}</span><span class="num negativo">- ${Fmt.moeda(desconto)}</span></div>` : ''}
          <div class="final"><span>Total</span><span class="num">${Fmt.moeda(total)}</span></div>
        </div>
        ${o.observacoes ? `<div class="aviso info" style="margin:16px 0 0">${icone('nota')}<p style="white-space:pre-line">${Util.esc(o.observacoes)}</p></div>` : ''}
      </div>`;
  },

  /* ---------------- Assistente (criar / editar) ---------------- */

  abrirAssistente({ id, clienteId } = {}) {
    const existente = id ? DB.obter('orcamentos', id) : null;
    const hoje = Datas.hoje();
    const st = {
      passo: 1,
      clienteId: existente ? existente.clienteId : (clienteId || null),
      novoCliente: false,
      itens: existente ? existente.itens.map(i => ({ ...i })) : [{ descricao: '', quantidade: 1, valorUnitario: 0 }],
      descontoTipo: existente?.descontoTipo || 'valor',
      descontoValor: existente?.descontoValor || 0,
      validade: existente?.validade || Datas.addDias(hoje, 15),
      observacoes: existente?.observacoes || ''
    };

    const m = UI.modal({
      titulo: existente ? `Editar orçamento Nº ${Fmt.numeroOrcamento(existente.numero)}` : 'Criar orçamento',
      subtitulo: 'Siga os 3 passos. Você pode voltar a qualquer momento.',
      tamanho: 'largo',
      conteudo: '<div class="passos" id="passos"></div><div id="passo-conteudo"></div>',
      rodape: '<span></span>'
    });
    const corpo = m.corpo;
    const rodape = m.el.querySelector('.modal-rodape');
    UI.limparErroAoDigitar(corpo);

    const desenharPassos = () => {
      const nomes = ['Escolher cliente', 'Adicionar itens', 'Revisar'];
      corpo.querySelector('#passos').innerHTML = nomes.map((n, i) => {
        const p = i + 1;
        const classe = p < st.passo ? 'feito' : p === st.passo ? 'atual' : '';
        return `<div class="passo ${classe}"><span class="bolinha">${p < st.passo ? icone('check') : p}</span><span class="texto">${n}</span></div>`;
      }).join('');
    };

    const irPara = passo => {
      st.passo = passo;
      desenharPassos();
      const area = corpo.querySelector('#passo-conteudo');
      area.classList.remove('anim');
      void area.offsetWidth;
      area.classList.add('anim');
      if (passo === 1) passo1(area);
      if (passo === 2) passo2(area);
      if (passo === 3) passo3(area);
      corpo.scrollTop = 0;
    };

    /* ----- Passo 1: cliente ----- */
    const passo1 = area => {
      const clientes = DB.listar('clientes').sort((a, b) => a.nome.localeCompare(b.nome));
      if (!clientes.length) st.novoCliente = true;
      area.innerHTML = `
        <div class="campo">
          <label for="busca-cli">Para quem é este orçamento?</label>
          ${clientes.length ? `<div class="busca" style="max-width:none">${icone('busca')}<input class="entrada" id="busca-cli" placeholder="Digite o nome do cliente para buscar"></div>` : ''}
        </div>
        <div class="escolha-cliente" id="lista-cli" role="radiogroup" aria-label="Clientes"></div>
        <button class="btn btn-ghost" id="btn-novo-cli" style="margin-top:12px" ${st.novoCliente ? 'hidden' : ''}>${icone('novoCliente')} Cadastrar novo cliente</button>
        <div class="novo-cliente-box" id="box-novo-cli" ${st.novoCliente ? '' : 'hidden'}>
          <div class="linha-flex entre" style="margin-bottom:14px">
            <strong>Novo cliente</strong>
            ${clientes.length ? '<button class="btn btn-texto btn-sm" id="cancelar-novo-cli">Escolher da lista</button>' : ''}
          </div>
          <div class="form-grade">
            <div class="campo inteiro"><label for="nc-nome">Nome do cliente</label><input class="entrada" id="nc-nome" placeholder="Ex.: Maria da Silva ou Padaria Central"></div>
            <div class="campo"><label for="nc-tel">Telefone / WhatsApp <span class="opcional">(opcional)</span></label><input class="entrada" id="nc-tel" data-mascara="telefone" inputmode="tel" placeholder="(11) 98765-4321"></div>
            <div class="campo"><label for="nc-doc">CPF ou CNPJ <span class="opcional">(opcional)</span></label><input class="entrada" id="nc-doc" data-mascara="documento" inputmode="numeric" placeholder="000.000.000-00"></div>
          </div>
        </div>`;
      Mascara.aplicar(area);

      const desenharLista = (termo = '') => {
        const t = Util.normalizar(termo);
        const filtrados = clientes.filter(c => Util.normalizar(c.nome).includes(t));
        area.querySelector('#lista-cli').innerHTML = st.novoCliente ? '' : (filtrados.length ? filtrados.map(c => `
          <button type="button" class="opcao ${st.clienteId === c.id ? 'ativa' : ''}" data-cli="${c.id}" role="radio" aria-checked="${st.clienteId === c.id}">
            <span class="marcador"></span>
            <span class="avatar">${Util.esc(Util.iniciais(c.nome))}</span>
            <span class="info">${Util.esc(c.nome)}<span>${Util.esc(c.telefone || c.email || 'Sem telefone')}</span></span>
          </button>`).join('') : '<p class="apagado">Nenhum cliente com esse nome. Cadastre um novo abaixo.</p>');
        area.querySelectorAll('[data-cli]').forEach(b => b.addEventListener('click', () => {
          st.clienteId = b.dataset.cli;
          area.querySelectorAll('[data-cli]').forEach(x => { x.classList.toggle('ativa', x === b); x.setAttribute('aria-checked', x === b); });
          area.querySelector('.msg-erro')?.remove();
        }));
      };
      desenharLista();
      area.querySelector('#busca-cli')?.addEventListener('input', e => desenharLista(e.target.value));
      area.querySelector('#btn-novo-cli').addEventListener('click', () => { st.novoCliente = true; passo1(area); area.querySelector('#nc-nome').focus(); });
      area.querySelector('#cancelar-novo-cli')?.addEventListener('click', () => { st.novoCliente = false; passo1(area); });

      rodape.innerHTML = `
        <button class="btn btn-ghost esquerda" data-cancelar>${icone('fechar')} Cancelar</button>
        <button class="btn btn-primario" data-avancar>Continuar ${icone('direita')}</button>`;
      rodape.querySelector('[data-cancelar]').addEventListener('click', m.fechar);
      rodape.querySelector('[data-avancar]').addEventListener('click', () => {
        UI.limparErros(area);
        if (st.novoCliente) {
          const nome = area.querySelector('#nc-nome');
          const doc = area.querySelector('#nc-doc');
          const tel = area.querySelector('#nc-tel');
          let ok = true;
          if (!nome.value.trim()) { UI.erroCampo(nome, 'Informe o nome do cliente.'); ok = false; }
          if (tel.value && !Validar.telefone(tel.value)) { UI.erroCampo(tel, 'Telefone incompleto. Ex.: (11) 98765-4321'); ok = false; }
          if (doc.value && !Validar.documento(doc.value)) { UI.erroCampo(doc, 'CPF tem 11 números e CNPJ tem 14.'); ok = false; }
          if (!ok) return;
          const novo = DB.salvar('clientes', {
            nome: nome.value.trim(), telefone: tel.value, whatsapp: Util.digitos(tel.value).length === 11 ? tel.value : '',
            documento: doc.value, email: '', endereco: '', observacoes: ''
          });
          st.clienteId = novo.id;
          st.novoCliente = false;
          UI.toast('Cliente cadastrado com sucesso ✓');
        } else if (!st.clienteId) {
          const msg = document.createElement('div');
          msg.className = 'msg-erro';
          msg.innerHTML = `${icone('alerta')} Escolha um cliente da lista ou cadastre um novo para continuar.`;
          area.querySelector('#lista-cli').after(msg);
          return;
        }
        irPara(2);
      });
    };

    /* ----- Passo 2: itens, desconto, validade ----- */
    const passo2 = area => {
      area.innerHTML = `
        <div class="linha-flex entre" style="margin-bottom:12px">
          <div><strong style="font-size:18px">O que você vai oferecer?</strong><p class="apagado">O subtotal de cada item é calculado sozinho.</p></div>
        </div>
        <div class="itens" id="itens"></div>
        <button class="btn btn-ghost" id="add-item" style="margin-top:12px">${icone('mais')} Adicionar item</button>

        <div class="form-grade" style="margin-top:22px">
          <div class="campo">
            <label for="desc-valor">Desconto <span class="opcional">(opcional)</span></label>
            <div class="com-acao">
              <div class="pilulas no-cartao" id="desc-tipo" style="flex-shrink:0">
                <button type="button" class="pilula ${st.descontoTipo === 'valor' ? 'ativa' : ''}" data-tipo="valor">R$</button>
                <button type="button" class="pilula ${st.descontoTipo === 'percentual' ? 'ativa' : ''}" data-tipo="percentual">%</button>
              </div>
              <span id="desc-campo" style="flex:1"></span>
            </div>
          </div>
          <div class="campo">
            <label for="validade">Válido até ${UI.ajuda('Até essa data o preço do orçamento é garantido para o cliente.')}</label>
            <input class="entrada" id="validade" data-mascara="data" inputmode="numeric" placeholder="dd/mm/aaaa" value="${Fmt.data(st.validade)}">
          </div>
          <div class="campo inteiro">
            <label for="obs">Observações <span class="opcional">(opcional)</span></label>
            <textarea class="entrada" id="obs" placeholder="Ex.: Pagamento 50% na aprovação e 50% na entrega. Prazo de 10 dias úteis.">${Util.esc(st.observacoes)}</textarea>
          </div>
        </div>
        <div class="total-destaque" id="total-box"></div>`;
      Mascara.aplicar(area);

      const desenharDescontoCampo = () => {
        const pct = st.descontoTipo === 'percentual';
        area.querySelector('#desc-campo').innerHTML = `
          <div class="com-prefixo">
            <span class="prefixo">${pct ? '%' : 'R$'}</span>
            <input class="entrada" id="desc-valor" inputmode="decimal" data-mascara="${pct ? 'percentual' : 'moeda'}"
              placeholder="${pct ? 'Ex.: 10' : '0,00'}" value="${st.descontoValor ? (pct ? String(st.descontoValor).replace('.', ',') : Fmt.decimal(st.descontoValor)) : ''}">
          </div>`;
        Mascara.aplicar(area.querySelector('#desc-campo'));
        area.querySelector('#desc-valor').addEventListener('input', e => { st.descontoValor = paraNumero(e.target.value); atualizarTotal(); });
      };
      area.querySelectorAll('#desc-tipo [data-tipo]').forEach(b => b.addEventListener('click', () => {
        st.descontoTipo = b.dataset.tipo;
        st.descontoValor = 0;
        area.querySelectorAll('#desc-tipo [data-tipo]').forEach(x => x.classList.toggle('ativa', x === b));
        desenharDescontoCampo();
        atualizarTotal();
      }));

      const atualizarTotal = () => {
        const { subtotal, desconto, total } = Calc.totalOrcamento(st);
        area.querySelector('#total-box').innerHTML = `
          <div class="linhas"><span>Subtotal: <b>${Fmt.moeda(subtotal)}</b></span><span>Desconto: <b>${Fmt.moeda(desconto)}</b></span></div>
          <div class="valor"><small>TOTAL DO ORÇAMENTO</small>${Fmt.moeda(total)}</div>`;
        area.querySelectorAll('[data-sub]').forEach(s => {
          const it = st.itens[s.dataset.sub];
          s.textContent = Fmt.moeda((Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0));
        });
      };

      const desenharItens = () => {
        area.querySelector('#itens').innerHTML = st.itens.map((it, i) => `
          <div class="item-linha">
            <div class="campo campo-desc"><label for="it-desc-${i}">Item ${i + 1}</label>
              <input class="entrada" id="it-desc-${i}" data-i="${i}" data-campo="descricao" placeholder="Ex.: Pintura de parede (m²)" value="${Util.esc(it.descricao)}"></div>
            <div class="campo"><label for="it-qtd-${i}">Qtd.</label>
              <input class="entrada" id="it-qtd-${i}" data-i="${i}" data-campo="quantidade" data-mascara="quantidade" inputmode="decimal" placeholder="1" value="${it.quantidade ? String(it.quantidade).replace('.', ',') : ''}"></div>
            <div class="campo"><label for="it-val-${i}">Valor unitário</label>
              <div class="com-prefixo"><span class="prefixo">R$</span>
              <input class="entrada" id="it-val-${i}" data-i="${i}" data-campo="valorUnitario" data-mascara="moeda" inputmode="numeric" placeholder="0,00" value="${it.valorUnitario ? Fmt.decimal(it.valorUnitario) : ''}"></div></div>
            <div class="campo"><label>Subtotal</label><div class="subtotal" data-sub="${i}"></div></div>
            <button type="button" class="btn btn-remover" data-remover="${i}" aria-label="Remover item ${i + 1}" title="Remover item" ${st.itens.length === 1 ? 'disabled' : ''}>${icone('lixeira')}</button>
          </div>`).join('');
        Mascara.aplicar(area.querySelector('#itens'));
        area.querySelectorAll('#itens [data-campo]').forEach(inp => inp.addEventListener('input', () => {
          const it = st.itens[inp.dataset.i];
          it[inp.dataset.campo] = inp.dataset.campo === 'descricao' ? inp.value : paraNumero(inp.value);
          atualizarTotal();
        }));
        area.querySelectorAll('[data-remover]').forEach(b => b.addEventListener('click', () => {
          st.itens.splice(Number(b.dataset.remover), 1);
          desenharItens();
        }));
        atualizarTotal();
      };

      area.querySelector('#add-item').addEventListener('click', () => {
        st.itens.push({ descricao: '', quantidade: 1, valorUnitario: 0 });
        desenharItens();
        area.querySelector(`#it-desc-${st.itens.length - 1}`).focus();
      });
      area.querySelector('#obs').addEventListener('input', e => { st.observacoes = e.target.value; });
      area.querySelector('#validade').addEventListener('input', e => { const d = Datas.deBR(e.target.value); if (d) st.validade = d; });

      desenharDescontoCampo();
      desenharItens();

      rodape.innerHTML = `
        <button class="btn btn-ghost esquerda" data-voltar>${icone('voltar')} Voltar</button>
        <button class="btn btn-primario" data-avancar>Revisar orçamento ${icone('direita')}</button>`;
      rodape.querySelector('[data-voltar]').addEventListener('click', () => irPara(1));
      rodape.querySelector('[data-avancar]').addEventListener('click', () => {
        UI.limparErros(area);
        let primeiroErro = null;
        const erro = (campo, msg) => { UI.erroCampo(campo, msg); primeiroErro = primeiroErro || campo; };
        st.itens.forEach((it, i) => {
          if (!it.descricao.trim()) erro(area.querySelector(`#it-desc-${i}`), 'Descreva o item.');
          if (!(it.quantidade > 0)) erro(area.querySelector(`#it-qtd-${i}`), 'Informe a quantidade.');
          if (!(it.valorUnitario > 0)) erro(area.querySelector(`#it-val-${i}`), 'Informe o valor.');
        });
        const validade = area.querySelector('#validade');
        if (!Datas.deBR(validade.value)) erro(validade, 'Informe uma data válida, por exemplo 30/11/2026.');
        const { subtotal } = Calc.totalOrcamento(st);
        const descontoBruto = st.descontoTipo === 'percentual' ? subtotal * st.descontoValor / 100 : st.descontoValor;
        if (descontoBruto > subtotal) erro(area.querySelector('#desc-valor'), 'O desconto não pode ser maior que o subtotal.');
        if (primeiroErro) { primeiroErro.focus(); return; }
        st.validade = Datas.deBR(validade.value);
        irPara(3);
      });
    };

    /* ----- Passo 3: revisar e salvar ----- */
    const passo3 = area => {
      const previa = {
        ...(existente || {}),
        numero: existente ? existente.numero : DB.espiarNumeroOrcamento(),
        clienteId: st.clienteId,
        data: existente ? existente.data : hoje,
        validade: st.validade,
        itens: st.itens.map(i => ({ descricao: i.descricao.trim(), quantidade: Number(i.quantidade), valorUnitario: Util.arred(i.valorUnitario) })),
        descontoTipo: st.descontoTipo,
        descontoValor: st.descontoValor,
        observacoes: st.observacoes.trim()
      };
      area.innerHTML = `
        <p class="apagado" style="margin-bottom:14px">Confira se está tudo certo. É assim que o orçamento vai aparecer no PDF.</p>
        ${this.documentoHTML(previa)}`;

      const editandoAprovado = existente && existente.status !== 'rascunho';
      rodape.innerHTML = `
        <button class="btn btn-ghost esquerda" data-voltar>${icone('voltar')} Voltar</button>
        ${editandoAprovado
          ? `<button class="btn btn-primario" data-salvar="${existente.status}">${icone('salvar')} Salvar alterações</button>`
          : `<button class="btn btn-ghost" data-salvar="rascunho">${icone('salvar')} Salvar como rascunho</button>
             <button class="btn btn-primario" data-salvar="enviado">${icone('enviar')} Salvar e marcar como enviado</button>`}`;
      rodape.querySelector('[data-voltar]').addEventListener('click', () => irPara(2));
      rodape.querySelectorAll('[data-salvar]').forEach(b => b.addEventListener('click', () => {
        const registro = { ...previa, status: b.dataset.salvar };
        if (!existente) {
          registro.numero = DB.proximoNumeroOrcamento();
          registro.lancamentoId = null;
        }
        const salvo = DB.salvar('orcamentos', registro);
        m.fechar();
        UI.toast(`Orçamento Nº ${Fmt.numeroOrcamento(salvo.numero)} salvo com sucesso ✓`);
        App.recarregar();
        setTimeout(() => this.ver(salvo.id), 200);
      }));
    };

    irPara(st.clienteId && !existente ? 2 : 1);
  }
};
