/* =========================================================
   graficos.js — Gráficos (usa a biblioteca Chart.js).
   Cores: verde-azulado = entradas/lucro, vermelho suave = despesas.
   Para categorias usamos uma paleta fixa testada para daltonismo.
   ========================================================= */
'use strict';

const Graficos = {
  ativos: [],
  CORES: {
    entrada: '#14B8A6',
    entradaFraca: 'rgba(20, 184, 166, .38)',
    despesa: '#E5534B',
    despesaFraca: 'rgba(229, 83, 75, .34)',
    grade: '#EEF0F3',
    texto: '#646B76'
  },
  // Paleta categórica (ordem fixa, nunca repetida em ciclo)
  CATEGORIAS: ['#2A78D6', '#EB6834', '#1BAF7A', '#EDA100', '#E87BA4', '#008300', '#6250D6', '#9AA0AA'],

  disponivel() {
    return typeof window.Chart !== 'undefined';
  },

  /** Ajustes visuais padrão para todos os gráficos. */
  configurar() {
    if (!this.disponivel()) return;
    const d = Chart.defaults;
    d.font.family = getComputedStyle(document.body).fontFamily;
    d.font.size = 14;
    d.color = this.CORES.texto;
    d.animation.duration = 700;
    d.maintainAspectRatio = false;
    d.plugins.legend.display = false;
    Object.assign(d.plugins.tooltip, {
      backgroundColor: '#14171C',
      padding: 12,
      cornerRadius: 10,
      titleFont: { weight: '700', size: 14 },
      bodyFont: { size: 14 },
      boxPadding: 6,
      usePointStyle: true
    });
  },

  /** Destrói os gráficos da página anterior (evita vazamento de memória). */
  limpar() {
    this.ativos.forEach(g => g.destroy());
    this.ativos = [];
  },

  _criar(canvas, config) {
    if (!this.disponivel()) {
      canvas.parentElement.innerHTML = '<div class="grafico-erro">Não foi possível carregar o gráfico. Verifique sua conexão com a internet.</div>';
      return null;
    }
    const g = new Chart(canvas, config);
    this.ativos.push(g);
    return g;
  },

  _eixoMoeda() {
    return {
      beginAtZero: true,
      border: { display: false },
      grid: { color: this.CORES.grade },
      ticks: { callback: v => Fmt.moedaCurta(v), maxTicksLimit: 6, padding: 8 }
    };
  },

  _tooltipMoeda() {
    return { callbacks: { label: c => ` ${c.dataset.label}: ${Fmt.moeda(c.parsed.y ?? c.parsed)}` } };
  },

  /** Barras: entradas x despesas por mês. O mês "destaque" aparece com cor cheia. */
  barrasEntradasDespesas(canvas, meses, serie, mesDestaque) {
    const destaque = (forte, fraca) => meses.map(m => (!mesDestaque || m === mesDestaque) ? forte : fraca);
    return this._criar(canvas, {
      type: 'bar',
      data: {
        labels: meses.map(m => Fmt.mesCurto(m)),
        datasets: [
          { label: 'Entradas', data: serie.entradas, backgroundColor: destaque(this.CORES.entrada, this.CORES.entradaFraca), hoverBackgroundColor: this.CORES.entrada },
          { label: 'Despesas', data: serie.despesas, backgroundColor: destaque(this.CORES.despesa, this.CORES.despesaFraca), hoverBackgroundColor: this.CORES.despesa }
        ].map(ds => ({ ...ds, borderRadius: 6, borderSkipped: 'start', maxBarThickness: 30, categoryPercentage: 0.62, barPercentage: 0.88 }))
      },
      options: {
        interaction: { mode: 'index', intersect: false },
        scales: { x: { grid: { display: false }, border: { display: false } }, y: this._eixoMoeda() },
        plugins: { tooltip: this._tooltipMoeda() }
      }
    });
  },

  /** Linha: evolução do lucro mês a mês. */
  linhaLucro(canvas, meses, valores) {
    return this._criar(canvas, {
      type: 'line',
      data: {
        labels: meses.map(m => Fmt.mesCurto(m)),
        datasets: [{
          label: 'Lucro',
          data: valores,
          borderColor: this.CORES.entrada,
          backgroundColor: 'rgba(20, 184, 166, .10)',
          fill: true,
          cubicInterpolationMode: 'monotone',
          borderWidth: 2.5,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: '#fff',
          pointBorderColor: valores.map(v => v < 0 ? this.CORES.despesa : this.CORES.entrada),
          pointBorderWidth: 2.5
        }]
      },
      options: {
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { grid: { display: false }, border: { display: false } },
          y: { ...this._eixoMoeda(), beginAtZero: false, grid: { color: c => c.tick.value === 0 ? '#C5CAD2' : this.CORES.grade } }
        },
        plugins: { tooltip: this._tooltipMoeda() }
      }
    });
  },

  /** Rosca: despesas por categoria. Retorna as cores usadas (para a legenda). */
  rosca(canvas, rotulos, valores) {
    const cores = rotulos.map((_, i) => this.CATEGORIAS[Math.min(i, this.CATEGORIAS.length - 1)]);
    const total = Util.soma(valores);
    this._criar(canvas, {
      type: 'doughnut',
      data: { labels: rotulos, datasets: [{ data: valores, backgroundColor: cores, borderColor: '#fff', borderWidth: 2, hoverOffset: 6 }] },
      options: {
        cutout: '66%',
        plugins: {
          tooltip: { callbacks: { label: c => ` ${c.label}: ${Fmt.moeda(c.parsed)} (${Fmt.pct(total ? c.parsed / total * 100 : 0)})` } }
        }
      },
      plugins: [{
        id: 'textoCentro',
        afterDraw(g) {
          const { ctx, chartArea: a } = g;
          const x = (a.left + a.right) / 2;
          const y = (a.top + a.bottom) / 2;
          ctx.save();
          ctx.textAlign = 'center';
          ctx.fillStyle = '#646B76';
          ctx.font = `600 13px ${Chart.defaults.font.family}`;
          ctx.fillText('Total', x, y - 10);
          ctx.fillStyle = '#14171C';
          ctx.font = `800 16px ${Chart.defaults.font.family}`;
          ctx.fillText(Fmt.moedaCurta(total), x, y + 12);
          ctx.restore();
        }
      }]
    });
    return cores;
  },

  /** Barras deitadas: top clientes. */
  barrasHorizontais(canvas, rotulos, valores) {
    return this._criar(canvas, {
      type: 'bar',
      data: {
        labels: rotulos,
        datasets: [{ label: 'Faturado', data: valores, backgroundColor: this.CORES.entrada, borderRadius: 6, borderSkipped: 'start', maxBarThickness: 26 }]
      },
      options: {
        indexAxis: 'y',
        scales: {
          x: { ...this._eixoMoeda(), ticks: { callback: v => Fmt.moedaCurta(v), maxTicksLimit: 5 } },
          y: { grid: { display: false }, border: { display: false }, ticks: { color: '#14171C', font: { weight: '600' }, callback(v) { const t = this.getLabelForValue(v); return t.length > 22 ? t.slice(0, 21) + '…' : t; } } }
        },
        plugins: { tooltip: { callbacks: { label: c => ` ${Fmt.moeda(c.parsed.x)}` } } }
      }
    });
  }
};
