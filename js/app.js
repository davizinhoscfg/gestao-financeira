/* =========================================================
   app.js — Inicialização, menu e navegação entre páginas.
   As páginas são trocadas pelo endereço (#/inicio, #/clientes...),
   assim o botão "voltar" do navegador funciona normalmente.
   ========================================================= */
'use strict';

const App = {
  MENU: [
    { rota: 'inicio', nome: 'Início', icone: 'inicio' },
    { rota: 'orcamentos', nome: 'Orçamentos', icone: 'orcamentos' },
    { rota: 'lancamentos', nome: 'Lançamentos', icone: 'lancamentos' },
    { rota: 'clientes', nome: 'Clientes', icone: 'clientes' },
    { rota: 'relatorios', nome: 'Relatórios', icone: 'relatorios' }
  ],

  PAGINAS: {
    inicio: PaginaInicio,
    orcamentos: PaginaOrcamentos,
    lancamentos: PaginaLancamentos,
    clientes: PaginaClientes,
    cliente: PaginaCliente,
    relatorios: PaginaRelatorios,
    configuracoes: PaginaConfiguracoes
  },

  TITULOS: {
    inicio: 'Início', orcamentos: 'Orçamentos', lancamentos: 'Lançamentos', clientes: 'Clientes',
    cliente: 'Ficha do cliente', relatorios: 'Relatórios', configuracoes: 'Configurações'
  },

  iniciar() {
    DB.iniciar();
    Graficos.configurar();
    this.montarMenu();
    this.atualizarMarca();
    window.addEventListener('hashchange', () => this.renderizar(true));
    this.renderizar(true);
  },

  montarMenu() {
    const item = m => `<a href="#/${m.rota}" class="menu-item" data-rota="${m.rota}"><span class="menu-icone">${icone(m.icone)}</span><span>${m.nome}</span></a>`;
    document.getElementById('menu-lateral').innerHTML = this.MENU.map(item).join('');
    document.getElementById('menu-inferior').innerHTML = this.MENU.map(item).join('');
    document.querySelectorAll('[data-icone]').forEach(s => { s.outerHTML = icone(s.dataset.icone); });
  },

  /** Logo e nome da empresa no menu. */
  atualizarMarca() {
    const emp = DB.config().empresa;
    const html = `
      <span class="marca-logo">${emp.logo ? `<img src="${emp.logo}" alt="">` : Util.esc(Util.iniciais(emp.nome))}</span>
      <span style="min-width:0"><span class="marca-nome" style="display:block">${Util.esc(emp.nome)}</span><span class="marca-sub">Gestão financeira</span></span>`;
    document.getElementById('marca').innerHTML = html;
    document.getElementById('marca-mobile').innerHTML = html;
  },

  rota() {
    const [nome, param] = location.hash.replace(/^#\/?/, '').split('/');
    return { nome: this.PAGINAS[nome] ? nome : 'inicio', param: param ? decodeURIComponent(param) : null };
  },

  /** Desenha a página atual. animar=false ao atualizar depois de salvar algo. */
  renderizar(animar = true) {
    const { nome, param } = this.rota();
    const main = document.getElementById('conteudo');
    const rolagem = window.scrollY;
    Graficos.limpar();
    main.classList.toggle('sem-anim', !animar);
    main.innerHTML = '';
    try {
      this.PAGINAS[nome].render(main, param);
    } catch (erro) {
      console.error(erro);
      main.innerHTML = `<div class="cartao">${UI.vazio({ iconeNome: 'alerta', titulo: 'Algo deu errado', texto: 'Não foi possível abrir esta página. Tente recarregar o navegador (tecla F5).' })}</div>`;
    }
    UI.contar(main, animar);

    const ativa = nome === 'cliente' ? 'clientes' : nome;
    document.querySelectorAll('.menu-item').forEach(a => {
      const sim = a.dataset.rota === ativa;
      a.classList.toggle('ativo', sim);
      if (sim) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.title = `${this.TITULOS[nome]} · Gestão Financeira`;
    if (animar) window.scrollTo(0, 0);
    else window.scrollTo(0, rolagem);
  },

  /** Atualiza a página atual sem animação (após salvar/excluir). */
  recarregar() {
    this.renderizar(false);
  },

  ir(rota) {
    location.hash = '#/' + rota;
  }
};

document.addEventListener('DOMContentLoaded', () => App.iniciar());
