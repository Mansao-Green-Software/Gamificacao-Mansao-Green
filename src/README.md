# 📘 Documentação — Gamificação Mansão Green

## Visão Geral

O **Gamificação Mansão Green** é uma plataforma interna de engajamento e produtividade baseada em gamificação. Colaboradores acumulam pontos ao concluir missões, e podem trocar esses pontos por recompensas na Green Shop.

---

## 🧑‍💼 Perfis de Usuário

| Papel        | Descrição                                                                 |
|--------------|---------------------------------------------------------------------------|
| **Admin**    | Acesso total. Gerencia colaboradores, missões, pontos e recompensas.      |
| **Gerente**  | Gerencia pontos e aprova missões dos colaboradores do seu setor.          |
| **Supervisor** | Similar ao Gerente, com configuração de participação no ranking de setor. |
| **Colaborador** | Visualiza missões, solicita pontuação e resgata recompensas na loja.   |

---

## 📄 Páginas

### 🏠 Dashboard
Página inicial da plataforma.

- Exibe pontuação total do colaborador, ranking no setor e setor atual.
- Mostra **Top 5 Setores** e **Top 5 Colaboradores (MG)** globais.
- Aba **"Meus Pontos"**: histórico detalhado de todas as transações do usuário com ganhos, descontos e saldo atual.
- Exibe o **Banner do Prêmio Trimestral** (configurável pelo admin).

---

### 🏆 Ranking Geral
Visualização de rankings de performance.

- **Ranking de Setores**: utiliza a regra do **Score Bayesiano** para garantir equilíbrio matemático e justiça entre times grandes e pequenos.
  - O cálculo pondera a média local do setor contra a média global de toda a empresa.
  - **Fórmula:** `Score = (v * R + m * C) / (v + m)`
    - `v`: Número de membros pontuando no setor.
    - `R`: Média real bruta de pontos do setor (`Total do Setor` ÷ `v`).
    - `m`: Peso de confiança (calculado como tamanho médio dos setores).
    - `C`: Média global de pontos por colaborador na empresa inteira.
- **Ranking por Setor**: lista individual de pontuação dos colaboradores dentro de um setor selecionado.
- Filtros de período: **Mensal**, **Trimestral (Abr–Jun)** e **Anual**.
- Supervisores com `include_in_sector_ranking = false` aparecem no setor virtual **"Supervisor"**.

---

### 🎯 Missões
Central de tarefas e solicitações de pontuação.

**Aba: Missões**
- Lista todas as missões disponíveis para o setor do colaborador, agrupadas por categoria.
- Colaboradores podem **solicitar pontuação** ao concluir uma missão, com justificativa e anexos opcionais.
- Gerentes podem **criar** e **remover** missões.

**Aba: Minhas Solicitações**
- Exibe todas as solicitações do colaborador com status (Pendente, Aprovado, Rejeitado).

**Aba: Solicitações** *(visível para gerentes/supervisores)*
- Lista solicitações pendentes do setor para **aprovação** ou **rejeição**.
- Exibe justificativas e imagens anexadas pelos colaboradores.
- Ao aprovar, uma transação de pontos é criada automaticamente.

**Categorias de Missão:**
- 🚀 Performance & Resultados
- 📋 Disciplina & Organização
- 💚 Cultura & Atitude Green
- ⭐ Bônus de Pontuação
- 🔴 Punições (Perda de Pontos)
- 🎯 Participação em Ações

---

### 🛒 Green Shop
Loja de recompensas onde colaboradores trocam pontos por prêmios.

- Exibe saldo de pontos disponíveis, ganhos e gastos.
- Filtro por categoria: Experiência, Produto, Benefício, Vale-presente, Outros.
- Colaboradores podem **resgatar prêmios** (confirmação antes do débito de pontos).
- Aba **"Meus Resgates"**: histórico de resgates com status (Pendente, Aprovado, Entregue, Cancelado).
- Aba **"Gerenciar"** *(admin/gerente)*: atualiza status dos resgates de todos os colaboradores.
- Admin pode **criar**, **editar** e **remover** prêmios, incluindo foto, estoque e custo em pontos.

---

### ⚡ Sistema de Pontuação
Tabela de referência com todas as tarefas e seus valores em pontos.

- Organizada por setor e agrupada por categoria.
- Barra de busca para localizar tarefas rapidamente.
- Admin/gerentes podem **criar**, **editar** e **excluir** tarefas diretamente nesta página.
- Exibe estatísticas: total de tarefas, soma de pontos e maior recompensa do setor.

---

### ⭐ Gerenciar Pontos *(admin/gerente/supervisor)*
Painel para adição manual de pontos.

- Selecione um colaborador e atribua pontos manualmente ou vinculados a uma missão específica.
- **Aba Histórico**: lista pontuações atribuídas pelo gerente no seu setor.
- **Aba Histórico Geral** *(admin)*: visualização global com filtro por setor e opção de exclusão de transações.

---

### 👥 Colaboradores *(admin)*
Gerenciamento completo de perfis de colaboradores.

- Criar, editar e excluir perfis.
- Vincular perfil a um usuário da plataforma.
- Definir setor principal, setores extras, função e participação no ranking.
- Upload de foto de perfil.

---

## 🗃️ Entidades (Banco de Dados)

| Entidade           | Descrição                                                        |
|--------------------|------------------------------------------------------------------|
| `EmployeeProfile`  | Perfil do colaborador (setor, função, foto, etc.)               |
| `Mission`          | Missões disponíveis com pontuação e categoria                   |
| `MissionRequest`   | Solicitações de pontuação feitas pelos colaboradores            |
| `PointTransaction` | Histórico de todas as transações de pontos                      |
| `Reward`           | Prêmios disponíveis na Green Shop                               |
| `RewardRedemption` | Resgates realizados pelos colaboradores                         |
| `QuarterlyPrize`   | Prêmio trimestral exibido no banner do Dashboard                |

---

## 🎨 Temas

A plataforma suporta dois temas visuais:

- 🌑 **Escuro** (padrão): fundo em tons de cinza escuro com acentos verdes.
- ☀️ **Claro**: fundo branco/azul claro com textos escuros de alto contraste.

O tema é alternado pela barra lateral e salvo automaticamente no navegador.

---

## 🔐 Regras de Acesso por Página

| Página             | Admin | Gerente | Supervisor | Colaborador |
|--------------------|-------|---------|------------|-------------|
| Dashboard          | ✅    | ✅      | ✅         | ✅          |
| Ranking Geral      | ✅    | ✅      | ✅         | ✅ (só seu setor) |
| Missões            | ✅    | ✅      | ✅         | ✅          |
| Green Shop         | ✅    | ✅      | ✅         | ✅          |
| Sistema Pontuação  | ✅    | ✅      | ✅         | ✅ (somente leitura) |
| Gerenciar Pontos   | ✅    | ✅      | ✅         | ❌          |
| Colaboradores      | ✅    | ❌      | ❌         | ❌          |

---

## 📦 Stack Tecnológica

- **Frontend**: React 18 + Vite + Tailwind CSS
- **UI Components**: shadcn/ui + Radix UI
- **Backend / Banco de Dados**: Base44 (BaaS)
- **Autenticação**: Base44 Auth
- **Upload de Arquivos**: Base44 Integrations Core

---

*Documentação gerada em 01/04/2026.*