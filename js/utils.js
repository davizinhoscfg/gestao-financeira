/* =========================================================
   utils.js — Funções auxiliares usadas em todo o sistema:
   formatação (R$, datas), cálculos de datas, máscaras e validações.
   ========================================================= */
'use strict';

/* ---------- Utilidades gerais ---------- */
const Util = {
  /** Gera um identificador único simples. */
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  /** Protege textos digitados pelo usuário antes de colocá-los no HTML. */
  esc(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  },

  /** Soma uma lista (opcionalmente usando uma função para pegar o valor). */
  soma(lista, fn) {
    return lista.reduce((total, item) => total + (fn ? fn(item) : item), 0);
  },

  /** Arredonda para 2 casas (centavos). */
  arred(valor) {
    return Math.round((Number(valor) || 0) * 100) / 100;
  },

  /** "Ana Paula Ferreira" -> "AF" */
  iniciais(nome) {
    const partes = String(nome || '?').trim().split(/\s+/).filter(p => p.length > 2 || /^[A-ZÀ-Ú]/.test(p));
    if (!partes.length) return '?';
    const primeira = partes[0][0];
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
    return (primeira + ultima).toUpperCase();
  },

  /** Remove acentos e deixa minúsculo (para buscas). */
  normalizar(texto) {
    return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  },

  debounce(fn, ms = 200) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  },

  /** Faz o navegador baixar um arquivo gerado na hora. */
  baixarArquivo(nome, conteudo, tipo = 'application/octet-stream') {
    const blob = conteudo instanceof Blob ? conteudo : new Blob([conteudo], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  /** Somente os dígitos de um texto. */
  digitos(texto) {
    return String(texto || '').replace(/\D/g, '');
  }
};

/* ---------- Formatação (padrão brasileiro) ---------- */
const Fmt = {
  _moeda: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
  _decimal: new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  _meses: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],

  /** 1234.5 -> "R$ 1.234,50" */
  moeda(valor) {
    return this._moeda.format(Number(valor) || 0).replace(/ /g, ' ');
  },

  /** 1234.5 -> "1.234,50" (sem o R$) */
  decimal(valor) {
    return this._decimal.format(Number(valor) || 0);
  },

  /** Valor curto para eixos de gráfico: 12500 -> "R$ 12,5 mil" */
  moedaCurta(valor) {
    const v = Number(valor) || 0;
    if (Math.abs(v) >= 1000) {
      return 'R$ ' + (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil';
    }
    return 'R$ ' + v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  },

  inteiro(valor) {
    return Math.round(Number(valor) || 0).toLocaleString('pt-BR');
  },

  /** 12.345 -> "12,3%" */
  pct(valor, casas = 1) {
    return (Number(valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }) + '%';
  },

  /** "2026-10-27" -> "27/10/2026" */
  data(iso) {
    if (!iso) return '—';
    const [a, m, d] = String(iso).slice(0, 10).split('-');
    return `${d}/${m}/${a}`;
  },

  /** "2026-10" -> "out/26" */
  mesCurto(ym) {
    const [a, m] = ym.split('-').map(Number);
    return this._meses[m - 1].slice(0, 3) + '/' + String(a).slice(2);
  },

  /** "2026-10" -> "outubro de 2026" */
  mesLongo(ym) {
    const [a, m] = ym.split('-').map(Number);
    return `${this._meses[m - 1]} de ${a}`;
  },

  /** Número do orçamento com zeros: 7 -> "0007" */
  numeroOrcamento(n) {
    return String(n).padStart(4, '0');
  },

  telefone(t) {
    return t ? Mascara.telefone(t) : '';
  }
};

/* ---------- Datas (sempre no formato ISO "aaaa-mm-dd" internamente) ---------- */
const Datas = {
  /** Date -> "aaaa-mm-dd" usando o fuso local. */
  iso(d) {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  },
  hoje() {
    return this.iso(new Date());
  },
  paraDate(iso) {
    const [a, m, d] = iso.split('-').map(Number);
    return new Date(a, m - 1, d);
  },
  addDias(iso, n) {
    const d = this.paraDate(iso);
    d.setDate(d.getDate() + n);
    return this.iso(d);
  },
  /** "2026-10" + 2 -> "2026-12" */
  addMeses(ym, n) {
    const [a, m] = ym.split('-').map(Number);
    const d = new Date(a, m - 1 + n, 1);
    return this.iso(d).slice(0, 7);
  },
  mes(iso) {
    return iso.slice(0, 7);
  },
  inicioMes(ym) {
    return ym + '-01';
  },
  fimMes(ym) {
    const [a, m] = ym.split('-').map(Number);
    return this.iso(new Date(a, m, 0));
  },
  /** Lista de meses "aaaa-mm" entre duas datas (inclusive). */
  mesesEntre(inicioIso, fimIso) {
    const meses = [];
    let atual = this.mes(inicioIso);
    const fim = this.mes(fimIso);
    while (atual <= fim && meses.length < 240) {
      meses.push(atual);
      atual = this.addMeses(atual, 1);
    }
    return meses;
  },
  diasEntre(aIso, bIso) {
    return Math.round((this.paraDate(bIso) - this.paraDate(aIso)) / 86400000);
  },
  /** "27/10/2026" -> "2026-10-27" (ou null se a data for inválida) */
  deBR(texto) {
    const m = String(texto || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    const [, d, mes, a] = m.map(Number);
    const data = new Date(a, mes - 1, d);
    if (data.getFullYear() !== a || data.getMonth() !== mes - 1 || data.getDate() !== d) return null;
    return this.iso(data);
  },
  /** "Hoje", "Amanhã", "em 5 dias", "há 3 dias" */
  relativo(iso) {
    const dias = this.diasEntre(this.hoje(), iso);
    if (dias === 0) return 'Hoje';
    if (dias === 1) return 'Amanhã';
    if (dias === -1) return 'Ontem';
    if (dias > 1) return `em ${dias} dias`;
    return `há ${-dias} dias`;
  }
};

/* ---------- Máscaras automáticas de digitação ----------
   Para usar, basta colocar o atributo data-mascara no campo:
   data-mascara="moeda" | "telefone" | "documento" | "data" | "quantidade" | "percentual" */
const Mascara = {
  moeda(v) {
    const d = Util.digitos(v).replace(/^0+/, '').slice(0, 13);
    if (!d) return '';
    return Fmt.decimal(parseInt(d, 10) / 100);
  },
  telefone(v) {
    const d = Util.digitos(v).slice(0, 11);
    if (!d) return '';
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  },
  /** CPF (11 dígitos) ou CNPJ (14 dígitos), escolhido automaticamente. */
  documento(v) {
    const d = Util.digitos(v).slice(0, 14);
    if (d.length <= 11) {
      return d
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
    }
    return d
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  },
  data(v) {
    const d = Util.digitos(v).slice(0, 8);
    if (d.length <= 2) return d;
    if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
    return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
  },
  /** Números com até 2 casas decimais separados por vírgula: "1,5" */
  quantidade(v) {
    let t = String(v || '').replace(/\./g, ',').replace(/[^\d,]/g, '');
    const [inteiro, ...resto] = t.split(',');
    if (resto.length) t = inteiro + ',' + resto.join('').slice(0, 2);
    return t.slice(0, 9);
  },
  percentual(v) {
    const t = this.quantidade(v);
    const n = paraNumero(t);
    return n > 100 ? '100' : t;
  },

  /** Liga as máscaras em todos os campos com data-mascara dentro de "raiz". */
  aplicar(raiz) {
    raiz.querySelectorAll('[data-mascara]').forEach(campo => {
      if (campo.dataset.mascaraAtiva) return;
      campo.dataset.mascaraAtiva = '1';
      const fn = Mascara[campo.dataset.mascara];
      if (!fn) return;
      if (campo.value) campo.value = fn.call(Mascara, campo.value);
      campo.addEventListener('input', () => {
        campo.value = fn.call(Mascara, campo.value);
      });
    });
  }
};

/** Converte "1.234,56" (texto digitado) em 1234.56 (número). */
function paraNumero(texto) {
  if (typeof texto === 'number') return texto;
  const n = parseFloat(String(texto || '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/* ---------- Validações ---------- */
const Validar = {
  email(t) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(t || '').trim());
  },
  telefone(t) {
    const d = Util.digitos(t);
    return d.length === 10 || d.length === 11;
  },
  documento(t) {
    const d = Util.digitos(t);
    return d.length === 11 || d.length === 14;
  }
};
