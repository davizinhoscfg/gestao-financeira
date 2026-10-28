# Gestão Financeira — painel para pequenas empresas

Painel simples para controlar orçamentos, entradas, despesas e clientes.
Feito em HTML, CSS e JavaScript puro: **não precisa instalar nada**.

**Ver online:** https://davizinhoscfg.github.io/gestao-financeira/

## Como abrir

Dê dois cliques em `index.html` (abre no Chrome, Edge ou Firefox).
Na primeira vez, o sistema já vem com **dados de exemplo**. Para começar com
os seus dados, clique em **"Limpar dados de exemplo"** (na tela Início ou em Configurações).

> É preciso internet para carregar a fonte, os gráficos e a exportação Excel/PDF
> (as bibliotecas vêm de CDN). Os dados em si ficam salvos no próprio navegador.

## Onde ficam os dados

No `localStorage` do navegador (chave `gestaoFinanceira:v1`). Isso significa:

- Cada navegador/computador tem seus próprios dados.
- Limpar os dados de navegação apaga as informações.
- Use **Configurações → Fazer backup** com frequência (gera um arquivo `.json`)
  e **Restaurar backup** para recuperar ou levar para outro computador.

## Estrutura

```
index.html                 Estrutura da página e carregamento dos scripts
css/styles.css             Todo o visual (cores e tamanhos no topo, em :root)
js/utils.js                Formatação R$/datas, máscaras e validações
js/exemplos.js             Gerador dos dados de demonstração
js/storage.js              Camada de dados (localStorage)  <- trocar aqui por um banco
js/calculos.js             Regras financeiras (lucro, margem, atraso...)
js/ui.js                   Ícones, janelas, avisos, dicas "?" e contagem animada
js/graficos.js             Gráficos (Chart.js)
js/exportar.js             Excel (SheetJS) e PDF (jsPDF + autotable)
js/paginas/*.js            Um arquivo por tela
js/app.js                  Menu e navegação entre telas
```

## Trocar o armazenamento por um banco de dados

Todas as leituras e gravações passam pelo objeto `DB` em `js/storage.js`
(`listar`, `obter`, `salvar`, `atualizar`, `remover`, `config`, `salvarConfig`...).
Para usar uma API, Firebase ou Supabase, reescreva essas funções mantendo os
mesmos nomes e formatos. O formato de cada registro está descrito no topo do arquivo.

## Bibliotecas usadas

- [Chart.js 4.4.1](https://www.chartjs.org/) — gráficos
- [SheetJS 0.18.5](https://sheetjs.com/) — planilhas Excel
- [jsPDF 2.5.1](https://github.com/parallax/jsPDF) + [jspdf-autotable 3.8.2](https://github.com/simonbengtsson/jsPDF-AutoTable) — PDFs
- Fonte [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans)
