/* =========================================================
   exportar.js — Geração de arquivos Excel (SheetJS) e PDF (jsPDF).
   ========================================================= */
'use strict';

const Exportar = {
  FORMATO_MOEDA: '"R$" #,##0.00;[Red]-"R$" #,##0.00',
  FORMATO_DATA: 'dd/mm/yyyy',

  /** Verifica se as bibliotecas carregaram (precisam de internet na 1ª vez). */
  _checar(lib) {
    const ok = lib === 'excel' ? !!window.XLSX : !!(window.jspdf && window.jspdf.jsPDF);
    if (!ok) UI.toast('Não foi possível gerar o arquivo. Verifique sua conexão com a internet e tente de novo.', 'erro');
    return ok;
  },

  /** Nome de arquivo seguro: "Relatório Outubro" -> "relatorio-outubro" */
  nomeArquivo(texto) {
    return Util.normalizar(texto).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  },

  /* =================== EXCEL =================== */

  /**
   * Cria e baixa uma planilha.
   * abas: [{ nome, colunas: [{ titulo, tipo: 'texto'|'moeda'|'data'|'pct'|'inteiro', largura }], linhas: [[...]] }]
   * Uma célula também pode ser { v: valor, tipo: '...' } para ter tipo próprio.
   */
  excel(nomeArquivo, abas) {
    if (!this._checar('excel')) return;
    const wb = XLSX.utils.book_new();

    abas.forEach(aba => {
      const ws = XLSX.utils.aoa_to_sheet([aba.colunas.map(c => c.titulo)]);
      aba.linhas.forEach((linha, r) => {
        linha.forEach((valor, c) => {
          const tipo = (valor && typeof valor === 'object') ? valor.tipo : aba.colunas[c].tipo;
          const v = (valor && typeof valor === 'object') ? valor.v : valor;
          ws[XLSX.utils.encode_cell({ r: r + 1, c })] = this._celula(v, tipo);
        });
      });
      const ultimaLinha = Math.max(1, aba.linhas.length + 1);
      ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: ultimaLinha - 1, c: aba.colunas.length - 1 } });
      ws['!cols'] = aba.colunas.map(c => ({ wch: c.largura || 16 }));
      if (aba.linhas.length && aba.filtro !== false) ws['!autofilter'] = { ref: ws['!ref'] };
      XLSX.utils.book_append_sheet(wb, ws, aba.nome.slice(0, 31));
    });

    XLSX.writeFile(wb, nomeArquivo + '.xlsx');
    UI.toast('Planilha Excel baixada com sucesso ✓');
  },

  _celula(v, tipo) {
    if (v === null || v === undefined || v === '') return { t: 's', v: '' };
    switch (tipo) {
      case 'moeda': return { t: 'n', v: Util.arred(v), z: this.FORMATO_MOEDA };
      case 'pct': return { t: 'n', v: (Number(v) || 0) / 100, z: '0.0%' };
      case 'inteiro': return { t: 'n', v: Number(v) || 0, z: '0' };
      case 'numero': return { t: 'n', v: Number(v) || 0, z: '#,##0.00' };
      case 'data': {
        // Excel guarda datas como número de dias desde 30/12/1899
        const [a, m, d] = String(v).slice(0, 10).split('-').map(Number);
        const serial = (Date.UTC(a, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000;
        return { t: 'n', v: serial, z: this.FORMATO_DATA };
      }
      default: return { t: 's', v: String(v) };
    }
  },

  /** Colunas e linhas padronizadas para lançamentos. */
  abaLancamentos(nome, lancamentos) {
    const clientes = DB.listar('clientes');
    const nomeCliente = id => clientes.find(c => c.id === id)?.nome || '';
    const status = l => ({ pago: l.tipo === 'entrada' ? 'Recebido' : 'Pago', pendente: 'Pendente', atrasado: 'Atrasado' })[Calc.status(l)];
    return {
      nome,
      colunas: [
        { titulo: 'Data', tipo: 'data', largura: 12 },
        { titulo: 'Descrição', tipo: 'texto', largura: 38 },
        { titulo: 'Categoria', tipo: 'texto', largura: 20 },
        { titulo: 'Cliente', tipo: 'texto', largura: 28 },
        { titulo: 'Forma de pagamento', tipo: 'texto', largura: 20 },
        { titulo: 'Status', tipo: 'texto', largura: 12 },
        { titulo: 'Valor', tipo: 'moeda', largura: 16 }
      ],
      linhas: lancamentos.map(l => [l.data, l.descricao, l.categoria, nomeCliente(l.clienteId), l.formaPagamento, status(l), l.valor])
    };
  },

  abaClientes(clientes) {
    return {
      nome: 'Clientes',
      colunas: [
        { titulo: 'Nome', tipo: 'texto', largura: 32 },
        { titulo: 'CPF/CNPJ', tipo: 'texto', largura: 20 },
        { titulo: 'Telefone', tipo: 'texto', largura: 17 },
        { titulo: 'WhatsApp', tipo: 'texto', largura: 17 },
        { titulo: 'E-mail', tipo: 'texto', largura: 30 },
        { titulo: 'Endereço', tipo: 'texto', largura: 40 },
        { titulo: 'Total pago', tipo: 'moeda', largura: 16 },
        { titulo: 'Em aberto', tipo: 'moeda', largura: 16 },
        { titulo: 'Em atraso', tipo: 'moeda', largura: 16 },
        { titulo: 'Último pagamento', tipo: 'data', largura: 16 }
      ],
      linhas: clientes.map(c => {
        const r = Calc.resumoCliente(c.id);
        return [c.nome, c.documento, c.telefone, c.whatsapp, c.email, c.endereco, r.totalPago, r.emAberto, r.atrasado, r.ultimoPagamento];
      })
    };
  },

  /** Aba "Resumo": lista de [indicador, valor, tipo]. */
  abaResumo(titulo, periodo, itens) {
    return {
      nome: 'Resumo',
      filtro: false,
      colunas: [{ titulo: 'Indicador', tipo: 'texto', largura: 34 }, { titulo: 'Valor', tipo: 'texto', largura: 22 }],
      linhas: [
        ['Relatório', titulo],
        ['Empresa', DB.config().empresa.nome],
        ['Período', periodo],
        ['Gerado em', { v: Datas.hoje(), tipo: 'data' }],
        ['', ''],
        ...itens.map(([rotulo, valor, tipo]) => [rotulo, { v: valor, tipo: tipo || 'moeda' }])
      ]
    };
  },

  /* =================== PDF =================== */

  _novoPDF() {
    const { jsPDF } = window.jspdf;
    return new jsPDF({ unit: 'mm', format: 'a4' });
  },

  _cores: {
    tinta: [20, 23, 28], apagado: [100, 107, 118], destaque: [13, 148, 136], destaqueClaro: [227, 246, 243],
    vermelho: [180, 50, 42], suave: [244, 245, 247], linha: [226, 229, 234]
  },

  /** Cabeçalho com logo e dados da empresa. Retorna a altura (y) onde o conteúdo começa. */
  _cabecalho(doc, titulo, subtitulo) {
    const emp = DB.config().empresa;
    const W = doc.internal.pageSize.getWidth();
    const M = 14;
    const c = this._cores;

    if (emp.logo) {
      try { doc.addImage(emp.logo, 'PNG', M, 11, 22, 22); } catch (e) { console.warn('Logo inválida', e); }
    } else {
      doc.setFillColor(...c.destaque);
      doc.roundedRect(M, 11, 22, 22, 4, 4, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(Util.iniciais(emp.nome), M + 11, 24.5, { align: 'center' });
    }

    const x = M + 27;
    doc.setTextColor(...c.tinta);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(emp.nome || 'Minha Empresa', x, 17);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...c.apagado);
    const linhas = [
      emp.documento ? 'CNPJ/CPF: ' + emp.documento : '',
      [emp.telefone, emp.email].filter(Boolean).join('  |  '),
      emp.endereco
    ].filter(Boolean);
    linhas.forEach((t, i) => doc.text(doc.splitTextToSize(t, 95)[0], x, 22 + i * 4.2));

    doc.setTextColor(...c.tinta);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(titulo, W - M, 18, { align: 'right' });
    if (subtitulo) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...c.apagado);
      doc.text(subtitulo, W - M, 24, { align: 'right' });
    }

    doc.setDrawColor(...c.destaque);
    doc.setLineWidth(0.9);
    doc.line(M, 38, W - M, 38);
    return 46;
  },

  /** Rodapé com data de geração e número da página em todas as páginas. */
  _rodapes(doc, textoExtra = '') {
    const total = doc.getNumberOfPages();
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const agora = new Date();
    const gerado = `Gerado em ${Fmt.data(Datas.iso(agora))} às ${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setDrawColor(...this._cores.linha);
      doc.setLineWidth(0.3);
      doc.line(14, H - 14, W - 14, H - 14);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...this._cores.apagado);
      doc.text(textoExtra ? `${textoExtra}  |  ${gerado}` : gerado, 14, H - 9);
      doc.text(`Página ${i} de ${total}`, W - 14, H - 9, { align: 'right' });
    }
  },

  _garantirEspaco(doc, y, altura) {
    const H = doc.internal.pageSize.getHeight();
    if (y + altura > H - 20) {
      doc.addPage();
      return 18;
    }
    return y;
  },

  _tituloSecao(doc, texto, y) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(...this._cores.tinta);
    doc.text(texto, 14, y);
    return y + 4;
  },

  _tabela(doc, y, { cabecalho, linhas, direita = [], rodape }) {
    doc.autoTable({
      startY: y,
      head: [cabecalho],
      body: linhas.length ? linhas : [[{ content: 'Nenhum registro no período.', colSpan: cabecalho.length, styles: { halign: 'center', textColor: this._cores.apagado } }]],
      foot: rodape ? [rodape] : undefined,
      margin: { left: 14, right: 14, bottom: 20 },
      theme: 'plain',
      styles: { font: 'helvetica', fontSize: 8.6, cellPadding: { top: 2.4, bottom: 2.4, left: 2.6, right: 2.6 }, textColor: this._cores.tinta, lineColor: this._cores.linha, lineWidth: { bottom: 0.2 } },
      headStyles: { fillColor: this._cores.tinta, textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: this._cores.suave, fontStyle: 'bold', textColor: this._cores.tinta },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: Object.fromEntries(direita.map(i => [i, { halign: 'right' }])),
      didParseCell: d => { if (direita.includes(d.column.index) && d.section !== 'body') d.cell.styles.halign = 'right'; }
    });
    return doc.lastAutoTable.finalY + 10;
  },

  /**
   * PDF de relatório.
   * { titulo, periodo, indicadores: [{ rotulo, valor, detalhe, ruim }], graficos: [{ titulo, canvas }], tabelas: [{ titulo, cabecalho, linhas, direita, rodape }], arquivo }
   */
  pdfRelatorio({ titulo, periodo, indicadores = [], graficos = [], tabelas = [], arquivo }) {
    if (!this._checar('pdf')) return;
    const doc = this._novoPDF();
    const W = doc.internal.pageSize.getWidth();
    const c = this._cores;
    let y = this._cabecalho(doc, titulo, 'Período: ' + periodo);

    // Indicadores em grade de 3 colunas
    if (indicadores.length) {
      const cols = 3, gap = 4, largura = (W - 28 - gap * (cols - 1)) / cols, altura = 19;
      indicadores.forEach((k, i) => {
        const col = i % cols;
        if (col === 0 && i > 0) y += altura + gap;
        y = this._garantirEspaco(doc, y, altura);
        const x = 14 + col * (largura + gap);
        doc.setFillColor(...c.suave);
        doc.roundedRect(x, y, largura, altura, 2.5, 2.5, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...c.apagado);
        doc.text(k.rotulo, x + 4, y + 6);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12.5);
        doc.setTextColor(...(k.ruim ? c.vermelho : c.tinta));
        doc.text(k.valor, x + 4, y + 12.5);
        if (k.detalhe) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(...(k.detalheCor === 'bom' ? c.destaque : k.detalheCor === 'ruim' ? c.vermelho : c.apagado));
          doc.text(k.detalhe, x + 4, y + 16.5);
        }
      });
      y += altura + 10;
    }

    // Gráficos (2 por linha)
    const validos = graficos.filter(g => g.canvas && g.canvas.width);
    for (let i = 0; i < validos.length; i += 2) {
      const par = validos.slice(i, i + 2);
      const largura = (W - 28 - 6) / 2;
      const alturas = par.map(g => Math.min(62, largura * g.canvas.height / g.canvas.width));
      const altura = Math.max(...alturas) + 8;
      y = this._garantirEspaco(doc, y, altura);
      par.forEach((g, j) => {
        const x = 14 + j * (largura + 6);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...c.tinta);
        doc.text(g.titulo, x, y);
        const h = alturas[j];
        const w = Math.min(largura, h * g.canvas.width / g.canvas.height);
        try { doc.addImage(g.canvas.toDataURL('image/png', 1), 'PNG', x, y + 3, w, h); } catch (e) { console.warn(e); }
      });
      y += altura + 6;
    }

    // Tabelas
    tabelas.forEach(t => {
      y = this._garantirEspaco(doc, y, 30);
      y = this._tituloSecao(doc, t.titulo, y);
      y = this._tabela(doc, y, t);
    });

    this._rodapes(doc, DB.config().empresa.nome);
    doc.save((arquivo || this.nomeArquivo(titulo)) + '.pdf');
    UI.toast('PDF baixado com sucesso ✓');
  },

  /** PDF bonito do orçamento, pronto para enviar ao cliente. */
  pdfOrcamento(orc) {
    if (!this._checar('pdf')) return;
    const doc = this._novoPDF();
    const W = doc.internal.pageSize.getWidth();
    const M = 14;
    const c = this._cores;
    const cliente = orc.clienteId ? DB.obter('clientes', orc.clienteId) : null;
    const { subtotal, desconto, total } = Calc.totalOrcamento(orc);
    const numero = Fmt.numeroOrcamento(orc.numero);

    let y = this._cabecalho(doc, 'ORÇAMENTO', 'Nº ' + numero);

    // Blocos: cliente | dados do orçamento
    const meia = (W - 2 * M - 6) / 2;
    const bloco = (x, titulo, linhas) => {
      doc.setFillColor(...c.suave);
      doc.roundedRect(x, y, meia, 34, 2.5, 2.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...c.destaque);
      doc.text(titulo.toUpperCase(), x + 4, y + 6);
      linhas.forEach(([texto, forte], i) => {
        doc.setFont('helvetica', forte ? 'bold' : 'normal');
        doc.setFontSize(forte ? 11 : 8.8);
        doc.setTextColor(...(forte ? c.tinta : [69, 76, 87]));
        doc.text(doc.splitTextToSize(texto, meia - 8)[0], x + 4, y + 12.5 + i * 4.6);
      });
    };
    bloco(M, 'Cliente', cliente ? [
      [cliente.nome, true],
      [cliente.documento ? 'CPF/CNPJ: ' + cliente.documento : ''],
      [[cliente.telefone, cliente.email].filter(Boolean).join('  |  ')],
      [cliente.endereco || '']
    ].filter(l => l[0]) : [['Cliente não informado', true]]);
    bloco(M + meia + 6, 'Dados do orçamento', [
      ['Nº ' + numero, true],
      ['Data de emissão: ' + Fmt.data(orc.data)],
      ['Válido até: ' + Fmt.data(orc.validade)],
      ['Itens: ' + orc.itens.length]
    ]);
    y += 42;

    // Itens
    y = this._tabela(doc, y, {
      cabecalho: ['#', 'Descrição', 'Qtd.', 'Valor unitário', 'Subtotal'],
      linhas: orc.itens.map((it, i) => [
        String(i + 1).padStart(2, '0'), it.descricao,
        String(it.quantidade).replace('.', ','),
        Fmt.moeda(it.valorUnitario), Fmt.moeda(it.quantidade * it.valorUnitario)
      ]),
      direita: [2, 3, 4]
    }) - 4;

    // Totais
    y = this._garantirEspaco(doc, y, 40);
    const xT = W - M - 78;
    const linhaTotal = (rotulo, valor, cor) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...c.apagado);
      doc.text(rotulo, xT + 4, y);
      doc.setTextColor(...(cor || c.tinta));
      doc.text(valor, W - M - 4, y, { align: 'right' });
      y += 6;
    };
    linhaTotal('Subtotal', Fmt.moeda(subtotal));
    if (desconto > 0) {
      const rot = orc.descontoTipo === 'percentual' ? `Desconto (${Fmt.pct(orc.descontoValor, 0)})` : 'Desconto';
      linhaTotal(rot, '- ' + Fmt.moeda(desconto), c.vermelho);
    }
    doc.setFillColor(...c.tinta);
    doc.roundedRect(xT, y - 2, 78, 14, 2.5, 2.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL', xT + 4, y + 6.8);
    doc.setFontSize(14);
    doc.text(Fmt.moeda(total), W - M - 4, y + 7.2, { align: 'right' });
    y += 24;

    // Observações
    if (orc.observacoes) {
      const linhas = doc.splitTextToSize(orc.observacoes, W - 2 * M - 8);
      const altura = 12 + linhas.length * 4.4;
      y = this._garantirEspaco(doc, y, altura);
      doc.setFillColor(...c.destaqueClaro);
      doc.roundedRect(M, y, W - 2 * M, altura, 2.5, 2.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...c.destaque);
      doc.text('OBSERVAÇÕES', M + 4, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...c.tinta);
      doc.text(linhas, M + 4, y + 11.5);
      y += altura + 8;
    }

    // Assinaturas
    y = this._garantirEspaco(doc, y, 34);
    y += 18;
    const largAss = (W - 2 * M - 20) / 2;
    doc.setDrawColor(...c.apagado);
    doc.setLineWidth(0.3);
    doc.line(M, y, M + largAss, y);
    doc.line(W - M - largAss, y, W - M, y);
    doc.setFontSize(8.5);
    doc.setTextColor(...c.apagado);
    doc.setFont('helvetica', 'normal');
    doc.text(DB.config().empresa.nome || 'Empresa', M + largAss / 2, y + 5, { align: 'center' });
    doc.text(cliente ? cliente.nome : 'Cliente', W - M - largAss / 2, y + 5, { align: 'center' });

    this._rodapes(doc, `Orçamento válido até ${Fmt.data(orc.validade)}`);
    const nomeCli = cliente ? '-' + this.nomeArquivo(cliente.nome) : '';
    doc.save(`orcamento-${numero}${nomeCli}.pdf`);
    UI.toast('PDF do orçamento baixado ✓');
  }
};
