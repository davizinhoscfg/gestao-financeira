/* =========================================================
   ui.js — Componentes de interface reutilizáveis:
   ícones, avisos (toast), janelas (modal), confirmação,
   dicas "?", contagem animada de números, estados vazios.
   ========================================================= */
'use strict';

/* ---------- Ícones (SVG em linha) ---------- */
const ICONES = {
  inicio: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  orcamentos: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h5"/>',
  lancamentos: '<path d="M7 4 3 8l4 4"/><path d="M3 8h14"/><path d="m17 20 4-4-4-4"/><path d="M21 16H7"/>',
  clientes: '<circle cx="9" cy="8" r="4"/><path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1"/><path d="M16 3.5a4 4 0 0 1 0 8"/><path d="M22 21v-1a6 6 0 0 0-4-5.6"/>',
  relatorios: '<path d="M3 3v18h18"/><path d="M8 17v-6M13 17V7M18 17v-9"/>',
  ajustes: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  baixar: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
  enviarArquivo: '<path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 21h14"/>',
  excel: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 3v18"/>',
  pdf: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M9 15h6"/>',
  ver: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  editar: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  duplicar: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkCirculo: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  xCirculo: '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>',
  lixeira: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
  fechar: '<path d="M18 6 6 18M6 6l12 12"/>',
  busca: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  whatsapp: '<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z"/><path d="M9 9.5c.3 1.8 1.7 3.6 3.6 4.4l1.2-1 1.7.8"/>',
  telefone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  local: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  documento: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.5-1.5 1.7-2 3-2s2.5.5 3 2M15 10h3M15 13h3"/>',
  nota: '<path d="M4 4h16v12l-4 4H4z"/><path d="M16 20v-4h4M8 9h8M8 13h5"/>',
  setaCima: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  setaBaixo: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
  voltar: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  direita: '<path d="m9 18 6-6-6-6"/>',
  calendario: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  carteira: '<path d="M20 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/><path d="M3 7h17a1 1 0 0 1 1 1v4h-4a2 2 0 0 0 0 4h4"/>',
  subindo: '<path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
  descendo: '<path d="m3 7 6 6 4-4 8 8"/><path d="M14 17h7v-7"/>',
  moedas: '<circle cx="9" cy="9" r="6"/><path d="M18.1 10.4A6 6 0 1 1 10.4 18"/><path d="M9 6.5v5M7 9h4"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alerta: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  enviar: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  novoCliente: '<circle cx="9" cy="8" r="4"/><path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1"/><path d="M19 8v6M16 11h6"/>',
  salvar: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
  banco: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  imagem: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  etiqueta: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  entrada: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12l5 5 5-5"/>',
  despesa: '<circle cx="12" cy="12" r="9"/><path d="M12 17V7M7 12l5-5 5 5"/>',
  percentual: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  recibo: '<path d="M5 3v18l2.5-1.5L10 21l2-1.5 2 1.5 2.5-1.5L19 21V3l-2.5 1.5L14 3l-2 1.5L10 3 7.5 4.5z"/><path d="M9 9h6M9 13h6"/>',
  usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7v1"/>',
  empresa: '<path d="M3 21h18M5 21V7l7-4 7 4v14"/><path d="M9 21v-5h6v5M9 10h.01M15 10h.01M12 10h.01"/>',
  recarregar: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>'
};

function icone(nome, classe = '') {
  return `<svg class="ico ${classe}" viewBox="0 0 24 24" aria-hidden="true">${ICONES[nome] || ''}</svg>`;
}

/* ---------- Componentes ---------- */
const UI = {
  /** Aviso rápido no canto da tela. tipo: 'sucesso' | 'erro' */
  toast(mensagem, tipo = 'sucesso') {
    const area = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = 'toast ' + tipo;
    el.setAttribute('role', 'status');
    el.innerHTML = `<span class="ico-toast">${icone(tipo === 'erro' ? 'fechar' : 'check')}</span><span>${Util.esc(mensagem)}</span>`;
    area.appendChild(el);
    setTimeout(() => {
      el.classList.add('saindo');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }, tipo === 'erro' ? 4500 : 3000);
  },

  /**
   * Abre uma janela (modal).
   * opções: { titulo, subtitulo, conteudo (HTML), rodape (HTML), tamanho: 'largo'|'pequeno', cor: 'verde'|'vermelho' }
   * Retorna { el, corpo, fechar }.
   */
  modal({ titulo, subtitulo = '', conteudo = '', rodape = '', tamanho = '', cor = '', aoFechar } = {}) {
    const fundo = document.createElement('div');
    fundo.className = 'modal-fundo';
    fundo.innerHTML = `
      <div class="modal ${tamanho}" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
        <div class="modal-topo">
          ${cor ? `<span class="faixa ${cor}"></span>` : ''}
          <div class="titulos">
            <h2 id="modal-titulo">${titulo}</h2>
            ${subtitulo ? `<p>${subtitulo}</p>` : ''}
          </div>
          <button class="modal-fechar" type="button" data-fechar aria-label="Fechar">${icone('fechar')}</button>
        </div>
        <div class="modal-corpo">${conteudo}</div>
        ${rodape ? `<div class="modal-rodape">${rodape}</div>` : ''}
      </div>`;
    document.getElementById('modais').appendChild(fundo);
    document.body.style.overflow = 'hidden';
    const focoAnterior = document.activeElement;

    let fechado = false;
    const fechar = () => {
      if (fechado) return;
      fechado = true;
      document.removeEventListener('keydown', aoTeclar);
      fundo.classList.add('fechando');
      setTimeout(() => {
        fundo.remove();
        if (!document.querySelector('.modal-fundo')) document.body.style.overflow = '';
        if (focoAnterior && focoAnterior.focus) focoAnterior.focus({ preventScroll: true });
        if (aoFechar) aoFechar();
      }, 150);
    };
    const aoTeclar = e => {
      if (e.key === 'Escape' && fundo === document.querySelector('.modal-fundo:last-child')) fechar();
    };
    document.addEventListener('keydown', aoTeclar);
    fundo.addEventListener('mousedown', e => { if (e.target === fundo) fechar(); });
    fundo.querySelectorAll('[data-fechar]').forEach(b => b.addEventListener('click', fechar));

    const corpo = fundo.querySelector('.modal-corpo');
    Mascara.aplicar(fundo);
    setTimeout(() => {
      const primeiro = corpo.querySelector('input:not([type=hidden]):not([type=checkbox]), select, textarea');
      if (primeiro && window.innerWidth > 700) primeiro.focus();
    }, 60);
    return { el: fundo, corpo, fechar };
  },

  /** Pergunta de confirmação. Retorna Promise<boolean>. */
  confirmar({ titulo = 'Tem certeza?', mensagem = '', textoSim = 'Sim, excluir', textoNao = 'Cancelar', perigo = true, iconeNome } = {}) {
    return new Promise(resolver => {
      let resposta = false;
      const m = this.modal({
        titulo,
        tamanho: 'pequeno',
        conteudo: `
          <div class="confirmar-icone ${perigo ? '' : 'verde'}">${icone(iconeNome || (perigo ? 'lixeira' : 'checkCirculo'))}</div>
          <p style="font-size:17px">${mensagem}</p>`,
        rodape: `
          <button class="btn btn-ghost" data-fechar>${icone('fechar')} ${textoNao}</button>
          <button class="btn ${perigo ? 'btn-perigo' : 'btn-primario'}" data-sim>${icone(perigo ? 'lixeira' : 'check')} ${textoSim}</button>`,
        aoFechar: () => resolver(resposta)
      });
      m.el.querySelector('[data-sim]').addEventListener('click', () => { resposta = true; m.fechar(); });
      setTimeout(() => m.el.querySelector('[data-sim]').focus(), 60);
    });
  },

  /** Botão "?" com explicação. */
  ajuda(texto) {
    return `<button type="button" class="ajuda" data-dica="${Util.esc(texto)}" aria-label="O que é isso? ${Util.esc(texto)}">?</button>`;
  },

  /** Cabeçalho padrão das páginas (título grande + frase explicativa). */
  cabecalho({ titulo, descricao, acoes = '' }) {
    return `
      <div class="cabecalho anim">
        <div>
          <h1>${titulo}</h1>
          <p class="descricao">${descricao}</p>
        </div>
        ${acoes ? `<div class="acoes">${acoes}</div>` : ''}
      </div>`;
  },

  /** Cartão de indicador com contagem animada e variação. */
  kpi({ rotulo, valor, formato = 'moeda', ajuda, iconeNome, cor = '', variacao = null, inverso = false, rodape = '', escuro = false, i = 0 }) {
    const negativo = formato === 'moeda' && valor < 0;
    return `
      <div class="cartao kpi anim ${escuro ? 'escuro' : ''}" style="--i:${i}">
        <div class="kpi-topo">
          <span class="kpi-icone ${cor}">${icone(iconeNome)}</span>
          ${variacao !== undefined && variacao !== false ? this.variacao(variacao, inverso) : ''}
        </div>
        <div>
          <div class="kpi-rotulo">${rotulo} ${ajuda ? this.ajuda(ajuda) : ''}</div>
          <div class="kpi-valor ${negativo ? 'negativo' : ''}" data-contar="${valor}" data-formato="${formato}">${this.formatar(valor, formato)}</div>
        </div>
        ${rodape ? `<div class="kpi-rodape">${rodape}</div>` : ''}
      </div>`;
  },

  formatar(valor, formato) {
    if (formato === 'pct') return Fmt.pct(valor);
    if (formato === 'inteiro') return Fmt.inteiro(valor);
    return Fmt.moeda(valor);
  },

  /** Pílula de variação: seta + % (verde = bom, vermelho = ruim). */
  variacao(pct, inverso = false) {
    if (pct === null) return '<span class="variacao neutro" title="Sem dados no período anterior">novo</span>';
    if (Math.abs(pct) < 0.05) return '<span class="variacao neutro">0%</span>';
    const subiu = pct > 0;
    const bom = inverso ? !subiu : subiu;
    return `<span class="variacao ${bom ? 'bom' : 'ruim'}" title="Comparado ao período anterior">
      ${icone(subiu ? 'setaCima' : 'setaBaixo')}${Fmt.pct(Math.abs(pct))}</span>`;
  },

  /** Etiqueta colorida de status. */
  etiqueta(status, tipo) {
    const nomes = {
      pago: tipo === 'entrada' ? 'Recebido' : 'Pago',
      pendente: 'Pendente',
      atrasado: 'Atrasado',
      rascunho: 'Rascunho',
      enviado: 'Enviado',
      aprovado: 'Aprovado',
      recusado: 'Recusado'
    };
    return `<span class="etiqueta ${status}">${nomes[status] || status}</span>`;
  },

  /** Mensagem de "nada por aqui ainda", sempre com orientação. */
  vazio({ iconeNome = 'info', titulo, texto, botao = '' }) {
    return `
      <div class="vazio anim">
        <div class="vazio-icone">${icone(iconeNome)}</div>
        <h3>${titulo}</h3>
        <p>${texto}</p>
        ${botao}
      </div>`;
  },

  /** Faz os números "contarem" do zero até o valor final. */
  contar(raiz, animar = true) {
    raiz.querySelectorAll('[data-contar]').forEach(el => {
      const final = Number(el.dataset.contar) || 0;
      const formato = el.dataset.formato;
      if (!animar || !final) { el.textContent = this.formatar(final, formato); return; }
      const duracao = 800;
      const inicio = performance.now();
      const passo = agora => {
        const t = Math.min(1, (agora - inicio) / duracao);
        const suave = 1 - Math.pow(1 - t, 3);
        el.textContent = this.formatar(final * suave, formato);
        if (t < 1) requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    });
  },

  /* ----- Ajuda para formulários ----- */
  erroCampo(campo, mensagem) {
    const caixa = campo.closest('.campo');
    if (!caixa) return;
    caixa.classList.add('erro');
    let msg = caixa.querySelector('.msg-erro');
    if (!msg) {
      msg = document.createElement('div');
      msg.className = 'msg-erro';
      caixa.appendChild(msg);
    }
    msg.innerHTML = `${icone('alerta')} ${mensagem}`;
  },

  limparErros(raiz) {
    raiz.querySelectorAll('.campo.erro').forEach(c => c.classList.remove('erro'));
    raiz.querySelectorAll('.msg-erro').forEach(m => m.remove());
  },

  /** Limpa o erro de um campo assim que a pessoa começa a corrigir. */
  limparErroAoDigitar(raiz) {
    raiz.addEventListener('input', e => {
      const caixa = e.target.closest('.campo.erro');
      if (caixa) { caixa.classList.remove('erro'); caixa.querySelector('.msg-erro')?.remove(); }
    });
  },

  /** Lista de <option> para selects. */
  opcoes(lista, selecionado, vazio) {
    const ops = vazio ? [`<option value="">${vazio}</option>`] : [];
    lista.forEach(item => {
      const [valor, texto] = Array.isArray(item) ? item : [item, item];
      ops.push(`<option value="${Util.esc(valor)}" ${String(valor) === String(selecionado ?? '') ? 'selected' : ''}>${Util.esc(texto)}</option>`);
    });
    return ops.join('');
  },

  /** Pergunta um texto curto (ex.: nome de nova categoria). */
  perguntarTexto({ titulo, rotulo, placeholder = '', textoSim = 'Salvar' }) {
    return new Promise(resolver => {
      let valor = null;
      const m = this.modal({
        titulo, tamanho: 'pequeno',
        conteudo: `<div class="campo"><label for="pergunta-txt">${rotulo}</label>
          <input id="pergunta-txt" class="entrada" placeholder="${Util.esc(placeholder)}" maxlength="40"></div>`,
        rodape: `<button class="btn btn-ghost" data-fechar>${icone('fechar')} Cancelar</button>
          <button class="btn btn-primario" data-sim>${icone('check')} ${textoSim}</button>`,
        aoFechar: () => resolver(valor)
      });
      const campo = m.el.querySelector('#pergunta-txt');
      const ok = () => {
        if (!campo.value.trim()) { this.erroCampo(campo, 'Digite um nome.'); campo.focus(); return; }
        valor = campo.value.trim();
        m.fechar();
      };
      m.el.querySelector('[data-sim]').addEventListener('click', ok);
      campo.addEventListener('keydown', e => { if (e.key === 'Enter') ok(); });
      setTimeout(() => campo.focus(), 60);
    });
  }
};

/* ---------- Dicas "?" (aparecem ao passar o mouse ou tocar) ---------- */
(function configurarDicas() {
  let dica = null;
  let dono = null;
  const esconder = () => { dica?.remove(); dica = null; dono = null; };
  const mostrar = botao => {
    if (dono === botao) return;
    esconder();
    dono = botao;
    dica = document.createElement('div');
    dica.className = 'dica';
    dica.textContent = botao.dataset.dica;
    document.body.appendChild(dica);
    const r = botao.getBoundingClientRect();
    const d = dica.getBoundingClientRect();
    let left = r.left + r.width / 2 - d.width / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - d.width - 12));
    let top = r.bottom + 8;
    if (top + d.height > window.innerHeight - 12) top = r.top - d.height - 8;
    dica.style.left = left + 'px';
    dica.style.top = top + 'px';
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('.ajuda');
    if (b) { e.preventDefault(); e.stopPropagation(); mostrar(b); }
    else esconder();
  }, true);
  document.addEventListener('mouseover', e => { const b = e.target.closest('.ajuda'); if (b) mostrar(b); });
  document.addEventListener('mouseout', e => { if (e.target.closest('.ajuda') && !e.relatedTarget?.closest?.('.ajuda')) esconder(); });
  document.addEventListener('focusin', e => { const b = e.target.closest?.('.ajuda'); if (b) mostrar(b); });
  window.addEventListener('scroll', esconder, true);
})();
