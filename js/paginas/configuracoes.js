/* =========================================================
   Configurações — dados da empresa, logo, categorias,
   backup/restauração e dados de exemplo.
   ========================================================= */
'use strict';

const PaginaConfiguracoes = {
  render(el) {
    const cfg = DB.config();
    const emp = cfg.empresa;
    const temExemplos = DB.temExemplos();

    el.innerHTML = `
      ${UI.cabecalho({ titulo: 'Configurações', descricao: 'Seus dados, os dados da empresa (que aparecem nos PDFs) e a segurança das suas informações.' })}

      <div class="grade grade-2 config-grade">
        <section class="cartao config-secao anim" style="--i:1">
          <h2>Empresa e usuário</h2>
          <p class="sub">Esses dados aparecem no topo dos orçamentos e relatórios em PDF.</p>
          <form id="form-empresa" class="form-grade" novalidate>
            <div class="campo inteiro">
              <span class="rotulo">Logo da empresa <span class="opcional">(opcional)</span></span>
              <div class="linha-flex">
                <div class="logo-preview" id="logo-preview">${emp.logo ? `<img src="${emp.logo}" alt="Logo atual">` : icone('imagem', 'ico-lg')}</div>
                <div class="linha-flex">
                  <label class="btn btn-ghost">${icone('enviarArquivo')} Escolher imagem<input type="file" id="logo-arquivo" accept="image/*" hidden></label>
                  <button type="button" class="btn btn-texto" id="logo-remover" ${emp.logo ? '' : 'hidden'}>${icone('lixeira')} Remover</button>
                </div>
              </div>
            </div>
            <div class="campo"><label for="cfg-usuario">Seu nome ${UI.ajuda('Usado na saudação da tela inicial: "Olá, [nome]!"')}</label>
              <input class="entrada" id="cfg-usuario" maxlength="40" placeholder="Ex.: Flávio" value="${Util.esc(cfg.usuario)}"></div>
            <div class="campo"><label for="cfg-nome">Nome da empresa</label>
              <input class="entrada" id="cfg-nome" maxlength="80" placeholder="Ex.: Silva Reformas" value="${Util.esc(emp.nome)}"></div>
            <div class="campo"><label for="cfg-doc">CNPJ ou CPF <span class="opcional">(opcional)</span></label>
              <input class="entrada" id="cfg-doc" data-mascara="documento" inputmode="numeric" placeholder="00.000.000/0000-00" value="${Util.esc(emp.documento)}"></div>
            <div class="campo"><label for="cfg-tel">Telefone / WhatsApp <span class="opcional">(opcional)</span></label>
              <input class="entrada" id="cfg-tel" data-mascara="telefone" inputmode="tel" placeholder="(11) 98765-4321" value="${Util.esc(emp.telefone)}"></div>
            <div class="campo inteiro"><label for="cfg-email">E-mail <span class="opcional">(opcional)</span></label>
              <input class="entrada" id="cfg-email" type="email" placeholder="contato@suaempresa.com.br" value="${Util.esc(emp.email)}"></div>
            <div class="campo inteiro"><label for="cfg-end">Endereço <span class="opcional">(opcional)</span></label>
              <input class="entrada" id="cfg-end" maxlength="200" placeholder="Rua, número - bairro, cidade/UF" value="${Util.esc(emp.endereco)}"></div>
            <div class="inteiro"><button class="btn btn-primario" type="submit">${icone('salvar')} Salvar dados</button></div>
          </form>
        </section>

        <div style="display:flex;flex-direction:column;gap:20px;min-width:0">
          <section class="cartao config-secao anim" style="--i:2">
            <h2>Backup (cópia de segurança)</h2>
            <p class="sub">Seus dados ficam salvos <strong>neste navegador</strong>. Faça um backup de vez em quando e guarde o arquivo no computador, pen drive ou e-mail.</p>
            <div class="linha-flex">
              <button class="btn btn-escuro" id="btn-backup">${icone('baixar')} Fazer backup</button>
              <label class="btn btn-ghost">${icone('enviarArquivo')} Restaurar backup<input type="file" id="arquivo-backup" accept=".json,application/json" hidden></label>
            </div>
          </section>

          <section class="cartao config-secao anim" style="--i:3">
            <h2>Dados de exemplo</h2>
            <p class="sub">${temExemplos
              ? 'O sistema está com dados de demonstração. Apague quando quiser começar a usar de verdade. Seus próprios registros não serão apagados.'
              : 'Quer ver como o sistema fica com dados preenchidos? Carregue os exemplos. Você pode apagá-los depois.'}</p>
            ${temExemplos
              ? `<button class="btn btn-ghost" id="btn-limpar-ex">${icone('lixeira')} Limpar dados de exemplo</button>`
              : `<button class="btn btn-ghost" id="btn-carregar-ex">${icone('banco')} Carregar dados de exemplo</button>`}
          </section>

          <section class="cartao config-secao anim" style="--i:4">
            <h2>Apagar tudo</h2>
            <p class="sub">Remove todos os clientes, orçamentos e lançamentos. Os dados da empresa são mantidos. Faça um backup antes!</p>
            <button class="btn btn-perigo" id="btn-apagar">${icone('lixeira')} Apagar todos os dados</button>
          </section>
        </div>
      </div>

      <section class="cartao config-secao anim secao" style="--i:5">
        <h2>Categorias</h2>
        <p class="sub">As opções que aparecem no campo "Categoria" dos lançamentos. Lançamentos antigos não são alterados ao remover uma categoria.</p>
        <div class="grade grade-2">
          ${['entrada', 'despesa'].map(tipo => `
            <div>
              <div class="linha-flex entre" style="margin-bottom:12px">
                <strong>${tipo === 'entrada' ? 'Categorias de entrada' : 'Categorias de despesa'}</strong>
                <button class="btn btn-ghost btn-sm" data-add-cat="${tipo}">${icone('mais', 'ico-sm')} Adicionar</button>
              </div>
              <div class="tags">${cfg.categorias[tipo].map((c, i) => `
                <span class="tag">${Util.esc(c)}<button type="button" data-rem-cat="${tipo}" data-i="${i}" aria-label="Remover categoria ${Util.esc(c)}" title="Remover">${icone('fechar', 'ico-sm')}</button></span>`).join('')}
              </div>
            </div>`).join('')}
        </div>
      </section>`;

    Mascara.aplicar(el);
    UI.limparErroAoDigitar(el);
    const $ = s => el.querySelector(s);

    // Logo
    $('#logo-arquivo').addEventListener('change', e => this.carregarLogo(e.target.files[0]));
    $('#logo-remover').addEventListener('click', () => {
      DB.salvarConfig({ empresa: { ...DB.config().empresa, logo: '' } });
      UI.toast('Logo removida');
      App.atualizarMarca();
      App.recarregar();
    });

    // Dados da empresa
    $('#form-empresa').addEventListener('submit', e => {
      e.preventDefault();
      UI.limparErros(el);
      let erro = false;
      if (!$('#cfg-nome').value.trim()) { UI.erroCampo($('#cfg-nome'), 'Informe o nome da empresa.'); erro = true; }
      if ($('#cfg-email').value && !Validar.email($('#cfg-email').value)) { UI.erroCampo($('#cfg-email'), 'Esse e-mail parece incompleto. Ex.: nome@empresa.com'); erro = true; }
      if ($('#cfg-doc').value && !Validar.documento($('#cfg-doc').value)) { UI.erroCampo($('#cfg-doc'), 'CPF tem 11 números e CNPJ tem 14.'); erro = true; }
      if (erro) return;
      DB.salvarConfig({
        usuario: $('#cfg-usuario').value.trim(),
        empresa: {
          ...DB.config().empresa,
          nome: $('#cfg-nome').value.trim(),
          documento: $('#cfg-doc').value,
          telefone: $('#cfg-tel').value,
          email: $('#cfg-email').value.trim(),
          endereco: $('#cfg-end').value.trim()
        }
      });
      App.atualizarMarca();
      UI.toast('Dados salvos com sucesso ✓');
    });

    // Backup
    $('#btn-backup').addEventListener('click', () => {
      Util.baixarArquivo(`backup-gestao-${Datas.hoje()}.json`, DB.exportarBackup(), 'application/json');
      UI.toast('Backup baixado ✓ Guarde o arquivo em um lugar seguro.');
    });
    $('#arquivo-backup').addEventListener('change', async e => {
      const arquivo = e.target.files[0];
      e.target.value = '';
      if (!arquivo) return;
      const ok = await UI.confirmar({
        titulo: 'Restaurar backup?',
        mensagem: `Os dados atuais serão <strong>substituídos</strong> pelos do arquivo <strong>${Util.esc(arquivo.name)}</strong>.`,
        textoSim: 'Sim, restaurar', iconeNome: 'enviarArquivo'
      });
      if (!ok) return;
      try {
        DB.importarBackup(await arquivo.text());
        App.atualizarMarca();
        UI.toast('Backup restaurado com sucesso ✓');
        App.recarregar();
      } catch (erro) {
        UI.toast(erro.message, 'erro');
      }
    });

    // Exemplos
    $('#btn-limpar-ex')?.addEventListener('click', () => this.limparExemplos());
    $('#btn-carregar-ex')?.addEventListener('click', () => {
      DB.carregarExemplos();
      UI.toast('Dados de exemplo carregados ✓');
      App.recarregar();
    });

    // Apagar tudo
    $('#btn-apagar').addEventListener('click', async () => {
      const ok = await UI.confirmar({
        titulo: 'Apagar todos os dados?',
        mensagem: 'Todos os <strong>clientes, orçamentos e lançamentos</strong> serão apagados para sempre. Se ainda não fez backup, cancele e clique em "Fazer backup" primeiro.',
        textoSim: 'Sim, apagar tudo'
      });
      if (!ok) return;
      DB.apagarTudo();
      UI.toast('Todos os dados foram apagados');
      App.recarregar();
    });

    // Categorias
    el.querySelectorAll('[data-add-cat]').forEach(b => b.addEventListener('click', async () => {
      const tipo = b.dataset.addCat;
      const nome = await UI.perguntarTexto({ titulo: 'Nova categoria', rotulo: `Nome da categoria de ${tipo}`, placeholder: tipo === 'entrada' ? 'Ex.: Consultoria' : 'Ex.: Marketing' });
      if (!nome) return;
      const cats = DB.config().categorias;
      if (cats[tipo].some(c => Util.normalizar(c) === Util.normalizar(nome))) { UI.toast('Essa categoria já existe.', 'erro'); return; }
      cats[tipo].push(nome);
      DB.salvarConfig({ categorias: cats });
      UI.toast('Categoria adicionada ✓');
      App.recarregar();
    }));
    el.querySelectorAll('[data-rem-cat]').forEach(b => b.addEventListener('click', async () => {
      const tipo = b.dataset.remCat;
      const cats = DB.config().categorias;
      const nome = cats[tipo][b.dataset.i];
      if (cats[tipo].length <= 1) { UI.toast('Mantenha pelo menos uma categoria.', 'erro'); return; }
      const ok = await UI.confirmar({ titulo: 'Remover categoria?', mensagem: `A categoria <strong>${Util.esc(nome)}</strong> deixará de aparecer na lista. Lançamentos antigos continuam com ela.`, textoSim: 'Sim, remover' });
      if (!ok) return;
      cats[tipo].splice(b.dataset.i, 1);
      DB.salvarConfig({ categorias: cats });
      UI.toast('Categoria removida');
      App.recarregar();
    }));
  },

  /** Lê a imagem, ajusta para um quadrado de 256px e salva como logo. */
  carregarLogo(arquivo) {
    if (!arquivo) return;
    if (!arquivo.type.startsWith('image/')) { UI.toast('Escolha um arquivo de imagem (PNG ou JPG).', 'erro'); return; }
    if (arquivo.size > 5 * 1024 * 1024) { UI.toast('A imagem é muito grande. Use uma de até 5 MB.', 'erro'); return; }
    const leitor = new FileReader();
    leitor.onload = () => {
      const img = new Image();
      img.onload = () => {
        const tam = 256;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = tam;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, tam, tam);
        const escala = Math.min(tam / img.width, tam / img.height);
        const w = img.width * escala;
        const h = img.height * escala;
        ctx.drawImage(img, (tam - w) / 2, (tam - h) / 2, w, h);
        DB.salvarConfig({ empresa: { ...DB.config().empresa, logo: canvas.toDataURL('image/png') } });
        UI.toast('Logo salva ✓ Ela já aparece nos PDFs.');
        App.atualizarMarca();
        App.recarregar();
      };
      img.onerror = () => UI.toast('Não foi possível abrir essa imagem.', 'erro');
      img.src = leitor.result;
    };
    leitor.readAsDataURL(arquivo);
  },

  async limparExemplos() {
    const ok = await UI.confirmar({
      titulo: 'Limpar dados de exemplo?',
      mensagem: 'Os clientes, orçamentos e lançamentos de demonstração serão apagados. <strong>Os registros que você criou continuam salvos.</strong>',
      textoSim: 'Sim, limpar exemplos'
    });
    if (!ok) return;
    DB.limparExemplos();
    UI.toast('Dados de exemplo removidos ✓ Agora é com você!');
    App.recarregar();
  }
};
