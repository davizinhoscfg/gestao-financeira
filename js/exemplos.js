/* =========================================================
   exemplos.js — Dados de demonstração.
   Gera clientes, orçamentos e lançamentos dos últimos 6 meses,
   sempre relativos à data de hoje. Todo registro criado aqui
   recebe "exemplo: true", para poder ser apagado depois com
   o botão "Limpar dados de exemplo".
   ========================================================= */
'use strict';

const Exemplos = {
  /** Gerador de números aleatórios com semente (os dados saem sempre iguais). */
  _aleatorio(semente) {
    let a = semente;
    return () => {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  },

  gerar() {
    const rnd = this._aleatorio(20261027);
    const entre = (min, max) => min + rnd() * (max - min);
    const escolher = lista => lista[Math.floor(rnd() * lista.length)];
    const hoje = Datas.hoje();
    const mesAtual = Datas.mes(hoje);
    const diaHoje = Number(hoje.slice(8, 10));
    const agora = new Date().toISOString();

    /* ---- Clientes ---- */
    const baseClientes = [
      ['Ana Paula Ferreira', '12345678909', '11987654321', 'ana.ferreira@email.com', 'Rua das Flores, 120 - Centro, São Paulo/SP'],
      ['Construtora Horizonte Ltda', '12345678000190', '1133224455', 'contato@horizonte.com.br', 'Av. Brasil, 2500 - Jardim América, São Paulo/SP'],
      ['Carlos Eduardo Lima', '98765432100', '11991234567', 'carlos.lima@email.com', 'Rua Ipê Amarelo, 45 - Vila Nova, Osasco/SP'],
      ['Padaria Pão Dourado', '45678912000155', '11940028922', 'paodourado@email.com', 'Rua do Comércio, 88 - Centro, Barueri/SP'],
      ['Mariana Souza Costa', '32165498700', '11976543210', 'mari.costa@email.com', 'Alameda Santos, 900 - Ap. 52, São Paulo/SP'],
      ['Clínica Bem Estar', '78912345000122', '1135557788', 'adm@clinicabemestar.com.br', 'Rua Saúde, 300 - Sala 4, Santo André/SP'],
      ['Roberto Almeida', '15975345682', '11965437788', '', 'Rua das Palmeiras, 15 - Cotia/SP'],
      ['Escola Crescer', '65498732000144', '1136669900', 'secretaria@escolacrescer.com.br', 'Av. Educação, 1000 - Taboão da Serra/SP']
    ];
    const clientes = baseClientes.map(([nome, doc, tel, email, endereco], i) => ({
      id: 'ex-cli-' + (i + 1),
      nome,
      documento: Mascara.documento(doc),
      telefone: Mascara.telefone(tel),
      whatsapp: tel.length === 11 ? Mascara.telefone(tel) : '',
      email,
      endereco,
      observacoes: i === 1 ? 'Prefere receber orçamentos por e-mail. Pagamento em até 15 dias.' : '',
      criadoEm: agora,
      exemplo: true
    }));

    /* ---- Lançamentos (6 meses) ---- */
    const lancamentos = [];
    let seq = 0;
    const novo = (dados) => {
      const l = {
        id: 'ex-lan-' + (++seq),
        clienteId: null,
        formaPagamento: 'Pix',
        criadoEm: agora,
        exemplo: true,
        ...dados
      };
      l.valor = Util.arred(l.valor);
      if (l.status === 'pago') l.pagoEm = l.pagoEm || l.data;
      lancamentos.push(l);
      return l;
    };
    const statusPara = (data, atrasar = false) => {
      if (atrasar) return 'pendente';
      return data <= hoje ? 'pago' : 'pendente';
    };
    const dataNoMes = (ym, dia) => {
      const ultimo = Number(Datas.fimMes(ym).slice(8, 10));
      return `${ym}-${String(Math.min(dia, ultimo)).padStart(2, '0')}`;
    };

    const servicos = ['Reforma de cozinha', 'Pintura residencial', 'Instalação elétrica', 'Manutenção preventiva', 'Troca de piso', 'Projeto de iluminação', 'Reparo hidráulico', 'Venda de materiais'];

    for (let k = -5; k <= 0; k++) {
      const ym = Datas.addMeses(mesAtual, k);
      let faturamentoMes = 0;

      // Entradas: 5 a 8 serviços por mês, crescendo levemente ao longo do tempo
      const qtd = 5 + Math.floor(rnd() * 4);
      for (let j = 0; j < qtd; j++) {
        const dia = 2 + Math.floor(rnd() * 26);
        const data = dataNoMes(ym, dia);
        const cliente = escolher(clientes);
        const servico = escolher(servicos);
        const valor = entre(650, 3800) * (1 + (k + 5) * 0.04);
        const atrasar = (k === -1 && j === 0) || (k === 0 && j < 2 && data < hoje);
        const status = statusPara(data, atrasar);
        if (status === 'pago') faturamentoMes += valor;
        novo({
          tipo: 'entrada', descricao: `${servico} - ${cliente.nome.split(' ')[0]}`, valor, data,
          categoria: servico === 'Venda de materiais' ? 'Venda de produto' : 'Serviço',
          clienteId: cliente.id, formaPagamento: escolher(['Pix', 'Pix', 'Boleto', 'Transferência', 'Cartão de crédito', 'Dinheiro']),
          status
        });
      }

      // Despesas fixas e variáveis
      const fixas = [
        ['Aluguel do galpão', 2200, 5, 'Aluguel', 'Boleto'],
        ['Salários da equipe', 4800, 5, 'Salários', 'Transferência'],
        ['Conta de luz e água', entre(360, 540), 10, 'Energia e água', 'Boleto'],
        ['Internet e telefone', 189.9, 15, 'Internet e telefone', 'Cartão de crédito'],
        ['Compra de material', entre(600, 1700), 12, 'Material', 'Pix'],
        ['Compra de material', entre(400, 1200), 22, 'Material', 'Cartão de crédito'],
        ['Combustível e pedágio', entre(250, 460), 18, 'Transporte', 'Cartão de débito']
      ];
      fixas.forEach(([descricao, valor, dia, categoria, forma]) => {
        const data = dataNoMes(ym, dia);
        novo({ tipo: 'despesa', descricao, valor, data, categoria, formaPagamento: forma, status: statusPara(data) });
      });
      // Impostos (aprox. 6% do faturamento do mês anterior)
      const dataImposto = dataNoMes(ym, 20);
      novo({ tipo: 'despesa', descricao: 'Impostos (DAS)', valor: Math.max(380, faturamentoMes * 0.06), data: dataImposto, categoria: 'Impostos', formaPagamento: 'Boleto', status: statusPara(dataImposto) });
    }

    // Recebimentos futuros (próximos dias) para a lista "Próximos recebimentos"
    [3, 6, 11, 16, 24].forEach((dias, i) => {
      const cliente = clientes[(i * 3 + 1) % clientes.length];
      novo({
        tipo: 'entrada', descricao: `${servicos[i]} - parcela`, valor: entre(800, 3200),
        data: Datas.addDias(hoje, dias), categoria: 'Serviço', clienteId: cliente.id,
        formaPagamento: 'Boleto', status: 'pendente'
      });
    });

    /* ---- Orçamentos ---- */
    const catalogo = [
      ['Mão de obra (diária)', 280], ['Pintura de parede (m²)', 28], ['Instalação de ponto elétrico', 85],
      ['Troca de piso (m²)', 65], ['Visita técnica', 90], ['Material de acabamento', 320],
      ['Manutenção preventiva', 180], ['Revestimento cerâmico (m²)', 72]
    ];
    const statusOrc = ['aprovado', 'aprovado', 'enviado', 'aprovado', 'recusado', 'enviado', 'rascunho', 'aprovado', 'enviado', 'aprovado'];
    const orcamentos = statusOrc.map((status, i) => {
      const criado = Datas.addDias(hoje, -Math.floor(150 - i * 15 + rnd() * 6));
      const nItens = 2 + Math.floor(rnd() * 3);
      const itens = [];
      for (let j = 0; j < nItens; j++) {
        const [descricao, valorUnitario] = catalogo[(i + j * 3) % catalogo.length];
        const quantidade = valorUnitario < 100 ? 10 + Math.floor(rnd() * 40) : 1 + Math.floor(rnd() * 4);
        itens.push({ descricao, quantidade, valorUnitario });
      }
      const cliente = clientes[(i * 5) % clientes.length];
      return {
        id: 'ex-orc-' + (i + 1),
        numero: i + 1,
        clienteId: cliente.id,
        data: criado,
        validade: Datas.addDias(criado, 15),
        itens,
        descontoTipo: i % 3 === 0 ? 'percentual' : 'valor',
        descontoValor: i % 3 === 0 ? 5 : (i % 2 ? 50 : 0),
        observacoes: 'Pagamento: 50% na aprovação e 50% na entrega.\nPrazo de execução: 10 dias úteis.',
        status,
        lancamentoId: null,
        criadoEm: agora,
        exemplo: true
      };
    });

    // Orçamentos aprovados geram um lançamento a receber
    orcamentos.filter(o => o.status === 'aprovado').forEach(o => {
      const total = Calc.totalOrcamento(o).total;
      const data = Datas.addDias(o.data, 12);
      const cliente = clientes.find(c => c.id === o.clienteId);
      const l = novo({
        tipo: 'entrada', descricao: `Orçamento Nº ${Fmt.numeroOrcamento(o.numero)} - ${cliente.nome.split(' ')[0]}`,
        valor: total, data, categoria: 'Serviço', clienteId: o.clienteId, formaPagamento: 'Pix',
        status: data <= hoje ? 'pago' : 'pendente', orcamentoId: o.id
      });
      o.lancamentoId = l.id;
    });

    return { clientes, orcamentos, lancamentos, proximoNumeroOrcamento: orcamentos.length + 1 };
  }
};
