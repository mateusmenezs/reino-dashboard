<!--
Documento gerado por um processo multi-agente:
- 4 agentes especialistas planejaram em paralelo (núcleo CS, arquitetura, automação, portal/UX)
- 1 agente sintetizador integrou tudo
- Time de 3 supervisores (Produto/CS, Técnico, Automação/Execução) pontuou de 0 a 10 por lente
- Loop de revisão até a menor nota entre os três chegar o mais perto possível de 9,5
Nota final (menor das três lentes): 9,1/10 — entregue por decisão do cliente, com refinamentos no Backlog ao final.
Progressão do mínimo por rodada: 8.8 → 9.2 → 9.1
-->

# Portal de CS — Controle de Mentorados (Reino Treinamentos)

> Plano único e executável do módulo de Customer Success para a Camila controlar a jornada dos mentorados sobre a stack atual (React/Vite/Vercel + Supabase + n8n + WhatsApp). Documento consolidado a partir dos blocos de Núcleo Conceitual, Arquitetura, Automação e Portal/UX.
>
> **Nota de padronização:** ao longo do documento os nomes de tabelas, colunas, enums, rotas e workflows são **canônicos** — se um bloco de origem usou um sinônimo (ex.: `mensagens_log` = `mensagens_enviadas`, `status_ciclo` = `estagio`), o nome oficial adotado aqui prevalece. O time deve seguir estes nomes na implementação.

---

## 1. Visão geral e objetivo

A Reino vende mentorias high-ticket com contratos de duração fixa (6/12 meses). Hoje a venda é cadastrada num CRM externo, mas **o acompanhamento do tempo de contrato e da jornada do mentorado é manual** — a Camila (CS) não tem uma visão única de "onde cada mentorado está", quem está em risco, ou quando um contrato está prestes a acabar. O resultado é dinheiro de renovação escapando por falta de aviso e uma gestão de carteira baseada em sensação, não em dado.

O sistema entrega um **portal exclusivo de CS** — um módulo novo, autenticado, dentro do app `reino-dashboard` atual — que dá à Camila uma **Lista**, um **Kanban por estágio da jornada**, uma **Ficha completa por mentorado** (contrato, timeline, health, tarefas) e uma visão de **Renovações**. O coração do sistema é a **automação de aviso 30 dias antes do fim do contrato via WhatsApp** (orquestrada por n8n com templates aprovados), que abre a conversa de renovação sozinha e move o card no Kanban. Em volta disso, o portal amplia a visão de gestão com **health score, risco de churn, NPS e marcos da jornada**.

**O loop de renovação fecha dentro do portal:** o aviso automático abre a conversa, a Camila conduz a negociação (com sub-status persistido), e **cadastra o novo contrato num formulário dedicado** — é esse cadastro que gera `valor_renovado_no_mês`, taxa de renovação e o estágio `renovado`. Sem esse formulário o loop não fecharia; ele é MVP.

O **Supabase é a fonte da verdade** do ciclo de vida; o React é só a interface; o **n8n é o motor de automação na borda**. Como o **import da carteira real acontece já na Fase 0**, o Supabase entra em produção com PII crítica (CPF, WhatsApp E.164, histórico) desde o go-live do MVP — por isso a integridade e disponibilidade do dado (art. 6 da LGPD) são tratadas como requisito de MVP, não de fase futura (ver seções 10, 11 e 12). Custo inicial de ~US$25/mês (Supabase Pro no go-live) ou ~US$0–5/mês só se o piloto rodar em Free **com a rotina de backup lógico documentada**.

---

## 2. Objetivos e métricas de sucesso (KPIs de CS)

**Objetivos de negócio**
- **Dor 1:** nenhum contrato acaba sem que o mentorado tenha sido avisado ~30 dias antes e uma conversa de renovação tenha sido aberta.
- **Dor 2:** substituir a gestão "por sensação" por uma visão de carteira mensurável (health, risco, renovação, NPS).

**Definição operacional de "conversa de renovação aberta"** (base de vários KPIs): considera-se aberta quando ocorre **o primeiro dos dois eventos** após o disparo do aviso D-30 — (a) **primeira interação registrada** com o mentorado depois do disparo, OU (b) **avanço do `status_renovacao` para `contatado`** (feito pela Camila ou automaticamente pelo webhook de resposta WA-05). Esse mesmo evento é o marco final do KPI "tempo médio de resposta ao aviso".

**KPIs mensuráveis (medidos direto no Supabase / painel do portal)**

| KPI | Definição | Meta inicial |
|---|---|---|
| **Taxa de renovação (90d)** | contratos com `status_renovacao='renovado'` ÷ contratos que entraram na janela nos últimos 90 dias | ≥ 60% |
| **Cobertura de aviso** | contratos que receberam `aviso_fim_contrato_30d` ÷ contratos elegíveis | 100% |
| **Valor em renovação (pipeline)** | soma de `valor_venda` de contratos ativos com `dias_para_fim ≤ 30` | acompanhar mensal |
| **Valor renovado no mês** | soma de `valor_venda` dos **novos** contratos criados no mês com `contrato_anterior` preenchido | acompanhar mensal |
| **Churn (30d)** | contratos que passaram para `churn` nos últimos 30 dias (nº e R$) | reduzir m/m |
| **Mentorados em risco** | `nivel_risco = 'vermelho'` | ≤ 15% da carteira |
| **Tempo médio de resposta ao aviso** | dias entre disparo D-30 e o evento "conversa aberta" (def. acima) | ≤ 3 dias |
| **Taxa de entrega/leitura WhatsApp** | `mensagens_enviadas.status` em `entregue`/`lida` ÷ enviadas | ≥ 90% entregue |
| **NPS médio da carteira** | média de `nps_ultimo` | ≥ 8 |
| **Cobertura de opt-in** | mentorados com consentimento `concedido` ÷ total ativo | 100% antes de disparo |

---

## 3. Escopo

**Dentro do escopo**
- Módulo de CS autenticado dentro do app atual (`/cs/*`), separado do dashboard público de funil de eventos.
- Cadastro/importação de mentorados e contratos (import CSV inicial do CRM).
- **Formulário "Novo contrato / Renovar"** na Ficha do mentorado (e acessível pela tela Renovações) para registrar um novo contrato/renovação — cria registro em `contratos` com `data_inicio`, `duracao_meses`, `valor_venda` e `contrato_anterior`, e ao salvar seta `estagio='renovado'`, `status_renovacao='renovado'` e o status do contrato anterior para `renovado`. **É o destino do CTA [Iniciar renovação] e o que alimenta os KPIs de renovação.**
- **Registro de contato de 1 clique** (log de interação de saída) ao usar o botão WhatsApp — para o health não ficar cego ao contato manual.
- Cálculo derivado de `data_fim` (coluna gerada), `% decorrido`, `dias_para_fim`, estágio e health score.
- **Sub-status de negociação de renovação** (`status_renovacao`) persistido, alimentando a tela Renovações.
- Telas: Dashboard, Lista, Kanban, Ficha do Mentorado, Renovações.
- Automação de ciclo de vida via n8n + WhatsApp (aviso D-30 é a âncora; onboarding, check-ins, NPS, reativação como incrementos), com **verificação de assinatura de webhook (HMAC no primeiro node) e cap diário de disparo**.
- Auth (Supabase), RLS por papel (admin/cs), base LGPD (opt-in de comunicação **e opt-in de marketing separado**, minimização, auditoria, **backup/PITR desde o go-live**).

**Fora do escopo (não fazer agora)**
- Chat de WhatsApp embutido no portal (usar `wa.me` e o próprio WhatsApp Business).
- Faturamento/cobrança dentro do portal.
- App mobile nativo (web responsivo resolve).
- Migração definitiva do CRM comercial para o Supabase (abandonar o CRM) — prematuro.
- Sincronização bidirecional em tempo real com o CRM (avaliar só na Fase 2).
- O módulo de FUNIL DE EVENTOS existente (`src/data/*.js`) permanece intacto e separado.

---

## 4. Modelo de dados

Fonte da verdade: Supabase (Postgres). Convenções: schema `public`, PK `uuid` (`gen_random_uuid()`), timestamps `timestamptz` com `created_at`/`updated_at` (trigger de `updated_at`), tabelas no plural, colunas em `snake_case`. **Regra de ouro:** `data_fim`, `% decorrido` e `dias_para_fim` são **calculados, nunca digitados** — é o que garante que o gatilho de 30 dias seja confiável. `data_fim` é uma **coluna gerada** (não digitável nem por app nem por trigger).

### 4.1 Enums

```sql
create type estagio_jornada as enum (
  'onboarding',    -- vendido/recém-começado (primeiros ~15 dias, até kickoff)
  'ativo',         -- acompanhamento normal
  'check_in',      -- bateu 50% do contrato
  'renovacao',     -- <=30 dias para o fim (janela)
  'renovado',      -- fechou novo contrato
  'offboarding',   -- terminou sem renovar, encerramento organizado
  'churn'          -- ciclo fechado, base de reativação
);
create type status_contrato    as enum ('ativo','encerrado','renovado','cancelado');
create type status_renovacao    as enum ('na_janela','contatado','em_negociacao','renovado','nao_renovou');
create type nivel_risco         as enum ('verde','amarelo','vermelho');
create type papel_usuario       as enum ('admin','cs');
create type tipo_interacao      as enum ('call','whatsapp','email','reuniao','nota','nps','marco');
create type status_tarefa       as enum ('aberta','em_andamento','concluida','cancelada');
create type status_mensagem     as enum ('agendada','enviada','entregue','lida','respondida','falha','cancelada');
create type status_consentimento as enum ('pendente','concedido','revogado');
create type finalidade_consent  as enum ('comunicacao_whatsapp','marketing_whatsapp','tratamento_dados');
```

> **`em_risco` não é estágio** — é o `nivel_risco='vermelho'`, um flag paralelo que pode ocorrer em qualquer estágio ativo. A coluna "Em risco" do Kanban é populada por esse flag, não por uma transição de jornada.
>
> **`status_renovacao` é o sub-status da negociação** — vive no contrato e alimenta as colunas da tela Renovações. É diferente do `estagio` (jornada macro): um contrato em `estagio='renovacao'` percorre `status_renovacao` `na_janela → contatado → em_negociacao → renovado | nao_renovou`.

### 4.2 Tabelas (schema resumido)

| Tabela | Papel | Colunas principais |
|---|---|---|
| **`usuarios`** | Perfil de acesso, espelha `auth.users` | `id` (=auth.users.id), `nome`, `email` unique, `papel` (admin/cs), `ativo` |
| **`mentorados`** | A pessoa (núcleo) | `id`, `nome`, `whatsapp` (E.164), `email`, `documento` (CPF opc.), `cidade`, `evento_origem`, `produto`, `responsavel_cs`→usuarios, `estagio` (estagio_jornada), `health_score` (0–100), `nivel_risco`, `nps_ultimo` (0–10), `crm_id` (unique, idempotência), `observacoes`, `ativo` |
| **`contratos`** | A venda / vigência (dispara o aviso) | `id`, `mentorado_id`→mentorados, `produto`, `valor_venda` numeric(12,2), `duracao_meses` int, `data_inicio` date, **`data_fim` date GENERATED**, `status` (status_contrato), `status_renovacao` (default `na_janela`), `motivo_nao_renovacao` text, `contrato_anterior`→contratos (encadeia renovações), `crm_id` (unique) |
| **`interacoes`** | Timeline (calls, notas, WhatsApp manual/saída, marcos, NPS) | `id`, `mentorado_id`, `autor_id`→usuarios (null=automação), `tipo` (tipo_interacao), `titulo`, `conteudo`, `nps_valor` (0–10), `data_evento` |
| **`tarefas`** | Follow-ups da CS | `id`, `mentorado_id`, `responsavel_id`→usuarios, `titulo`, `descricao`, `status` (status_tarefa), `prioridade` (1–3), `tipo` (ex: `kickoff`, `renovacao`, `opt_in`, `conciliacao`, `generica`), `vence_em`, `concluida_em`, `origem` (manual/automacao) |
| **`mensagens_enviadas`** | Registro de cada mensagem automática (auditoria + idempotência + timeline) | `id`, `mentorado_id`, `contrato_id` (nullable), `automacao_id`, `canal`, `template_nome`, `contrato_ref` **text** (chave de ciclo — ver 4.4), `ref_idempotencia` **text** (referência client-side p/ dedup no provedor — `biz_opaque_callback_data`, ver 4.4 e 8.1), `payload` jsonb, `status` (status_mensagem), `provider_msg_id`, `erro`, `agendada_para`, `enviada_em` |
| **`automacoes`** | Catálogo de réguas (liga/desliga sem mexer no n8n) | `id`, `chave` unique (ex: `aviso_fim_contrato_30d`), `nome`, `descricao`, `gatilho`, `template_nome`, `ativo` |
| **`eventos_automacao`** | Log de auditoria de tudo que a automação fez | `id`, `automacao_id`, `mentorado_id`, `contrato_id`, `tipo_evento` (agendou/enviou/falhou/webhook_status/reconciliou/checou_provedor), `detalhe` jsonb |
| **`consentimentos`** | LGPD / opt-in WhatsApp (obrigatório p/ disparo) | `id`, `mentorado_id`, `finalidade` (finalidade_consent), `status` (status_consentimento), `base_legal` (execucao_contrato/consentimento), `origem`, `concedido_em`, `revogado_em` |

### 4.3 Relações

```
usuarios (1) ──< (N) mentorados (responsavel_cs)
mentorados (1) ──< (N) contratos ──< (N) mensagens_enviadas
contratos (1) ──< (1) contratos (contrato_anterior — encadeia renovações)
mentorados (1) ──< (N) interacoes
mentorados (1) ──< (N) tarefas
mentorados (1) ──< (N) consentimentos
automacoes (1) ──< (N) mensagens_enviadas / eventos_automacao
```

### 4.4 Colunas geradas, índices e idempotência canônica

**`data_fim` como coluna gerada (não digitável), com cast explícito para `date`:**
```sql
-- make_interval é IMUTÁVEL, então funciona como generated column.
-- CAST EXPLÍCITO para ::date: não dependemos do cast implícito de assignment;
-- o resultado de (data_inicio + make_interval(...)) é timestamp e é convertido
-- deterministicamente para date aqui.
alter table contratos
  add column data_fim date
  generated always as ((data_inicio + make_interval(months => duracao_meses))::date) stored;
```

> **Convenção de fim-de-mês (documentada e testada em QA):** `make_interval(months => N)` herda a semântica de fim-de-mês do Postgres — `2025-01-31 + 1 mês = 2025-02-28`. Ou seja, para contratos **iniciados em fim de mês**, o dia exato de `data_fim` (e, por consequência, o dia do gatilho D-30) segue essa regra de saturação. Isso é **aceito e assumido** como convenção do sistema. O QA de cálculo de datas (seção 13) valida `data_fim` contra alguns contratos reais de fim de mês para confirmar que o comportamento bate com o esperado pela operação. Alternativa equivalente, caso se prefira a forma textual: `((data_inicio + (duracao_meses || ' months')::interval)::date)`.

**Índice-chave do cron de renovação:**
```sql
create index idx_contratos_fim_ativo on contratos(data_fim) where status = 'ativo';
```

**Idempotência canônica — UMA única chave, estável a edições de contrato e cobrindo mensagens sem contrato.**
O problema anterior era ter dois modelos concorrentes e, além disso, ancorar a chave de mensagens de contrato em `data_fim` (uma coluna **gerada** que muda se alguém corrige `data_inicio`/`duracao_meses`). Se `data_fim` mudasse, `contrato_ref` mudava, a chave deixava de reconhecer o aviso já enviado **para o mesmo contrato** e um segundo disparo do mesmo template era permitido. Corrigimos ancorando mensagens de contrato no **`contrato_id` (estável a edições)**:

```sql
-- contrato_ref (text) = âncora do ciclo, SEMPRE preenchida:
--   - mensagens LIGADAS A CONTRATO (D-60/D-30/D-15/D-7, kickoff, check-in de contrato):
--       contrato_ref = contrato_id::text
--       -> estável a edições de data_inicio/duracao_meses/data_fim;
--       -> a renovação continua re-avisável porque gera um NOVO contrato (novo id).
--   - mensagens de CICLO SEM CONTRATO (check-in periódico, NPS periódico):
--       contrato_ref = 'ciclo:' || (date_trunc('month', now() at time zone 'America/Sao_Paulo'))::date
--       -> nunca NULL.
create unique index uq_msg_idem
  on mensagens_enviadas (mentorado_id, template_nome, contrato_ref)
  where status in ('agendada','enviada','entregue','lida','respondida');
```

- É **parcial por status ativo**: uma mensagem `falha`/`cancelada` não bloqueia um reenvio legítimo, mas qualquer reserva ativa (inclusive `agendada`) trava a duplicata.
- Como `contrato_ref` nunca é NULL, **check-in periódico e NPS também ficam protegidos** — some a lacuna dos templates sem contrato.
- Como mensagens de contrato usam `contrato_id`, **corrigir uma data de contrato não reabre a porta ao duplo aviso**; a renovação (novo contrato, novo id) continua sendo avisável.
- O texto da "regra de ouro" (seção 8) e o SQL agora falam a **mesma** chave: `(mentorado_id, template_nome, contrato_ref)`.

**Coluna `ref_idempotencia` — dedup do lado do provedor (anti-duplo-envio na reconciliação):**
```sql
-- Gerada no cliente ANTES de chamar o provedor e gravada na linha 'agendada'.
-- Vai como biz_opaque_callback_data (Cloud API) / metadata (Z-API) no envio,
-- e volta ecoada nos webhooks de status, permitindo correlacionar e consultar
-- o status real de uma mensagem SEM reenviar às cegas (ver WA-09, seção 8.1).
-- Ex.: 'wa01:' || contrato_id || ':' || template_nome  (determinístico por ciclo).
```

**Demais índices:**
```sql
create unique index uq_mentorados_crm_id on mentorados(crm_id) where crm_id is not null;
create unique index uq_contratos_crm_id  on contratos(crm_id)  where crm_id is not null;
create index idx_contratos_status_renov on contratos(status_renovacao) where status = 'ativo';
create index idx_msg_ref_idem on mensagens_enviadas(ref_idempotencia) where ref_idempotencia is not null;
```

### 4.5 View de conveniência (alimenta Lista, Kanban, Renovações)

```sql
create view vw_mentorados_visao
with (security_invoker = on) as   -- OBRIGATÓRIO: sem isto a view roda como OWNER e IGNORA o RLS
select
  m.id, m.nome, m.whatsapp, m.estagio, m.health_score, m.nivel_risco,
  m.responsavel_cs, u.nome as cs_nome,
  c.id as contrato_ativo_id, c.produto, c.valor_venda,
  c.data_inicio, c.data_fim, c.status_renovacao,
  -- FUSO: usar America/Sao_Paulo (NÃO current_date, que é UTC no Supabase),
  -- para coerência com os filtros das automações e não divergir 1 dia perto da meia-noite.
  (c.data_fim - (now() at time zone 'America/Sao_Paulo')::date) as dias_para_fim,
  round( ((now() at time zone 'America/Sao_Paulo')::date - c.data_inicio)::numeric
       / nullif((c.data_fim - c.data_inicio),0) * 100 , 0) as pct_decorrido
from mentorados m
left join usuarios u on u.id = m.responsavel_cs
left join lateral (
  select * from contratos c2
  where c2.mentorado_id = m.id and c2.status = 'ativo'
  order by c2.data_fim desc limit 1
) c on true
where m.ativo = true;
```

> **Fuso coerente:** `dias_para_fim` e `pct_decorrido` usam `(now() at time zone 'America/Sao_Paulo')::date`, o **mesmo** critério dos crons (seção 8). Antes usavam `current_date` (UTC), o que perto da meia-noite mostrava Lista/Kanban com 1 dia de diferença do que o cron enxergava. Agora Lista, Kanban e automações concordam.
>
> **Atenção de segurança (LGPD):** views no Postgres rodam por padrão com os privilégios do **OWNER** (semântica *security definer*), o que **ignora o RLS** das tabelas base. É **falso** que "security_invoker seja o padrão". Sem `with (security_invoker = on)`, qualquer `cs` autenticado leria a **carteira inteira** pela view, furando o isolamento por `responsavel_cs` — vazamento de PII. Portanto: declarar `security_invoker = on` **explicitamente** (feito acima), rodar os **Advisors** (sinalizam views sem `security_invoker`) e incluir o **teste de QA de isolamento com um segundo usuário `cs` de teste** (ver 5. QA na seção 13 e 14) — não basta logar como a Camila, porque com uma única CS a regra "vê também `responsavel_cs IS NULL`" faz ela enxergar tudo e o teste passa **vaziamente**.

---

## 5. Jornada do mentorado, status e Kanban

A jornada tem **7 estágios**; o motor de transição é majoritariamente **temporal** (baseado em `data_inicio` e `% decorrido`), o que permite ao n8n fazer a maior parte das mudanças sozinho no cron diário. A Camila só arrasta cards em exceções e nos desfechos (Renovado / Churn).

| # | Estágio (`estagio`) | O que caracteriza | Gatilho de entrada |
|---|---|---|---|
| 1 | `onboarding` | Venda fechada, primeiros ~15 dias, boas-vindas e **kickoff** | Import do CRM / `data_inicio` chegou |
| 2 | `ativo` | Rotina normal de acompanhamento (~15%–45% do contrato) | **Onboarding concluído (kickoff feito)** — ver regra abaixo |
| 3 | `check_in` | Marco dos 50%: revisão de resultados, semeadura da renovação | `pct_decorrido ≥ 50` |
| 4 | `renovacao` | Faltam **≤ 30 dias** para `data_fim` — **gatilho da Dor 1** | `dias_para_fim ≤ 30` |
| 5 | `renovado` | Assinou novo contrato | **Formulário "Novo contrato / Renovar"** cria contrato com `contrato_anterior` apontando p/ este |
| 6 | `offboarding` | Terminou sem renovar, encerramento organizado | `data_fim` passou e não renovou |
| 7 | `churn` | Ciclo fechado; base de reativação | Offboarding concluído |

**Regra de saída do onboarding condicionada ao kickoff (evita "ativo fantasma"):**
A promoção `onboarding → ativo` **não é puramente temporal**. Aos ~15 dias, o cron verifica se a tarefa `tipo='kickoff'` do mentorado está `concluida`:
- **Kickoff concluído** → promove para `ativo`.
- **Kickoff NÃO concluído** → **mantém em `onboarding`**, marca `nivel_risco='amarelo'` e cria/prioriza a tarefa "Onboarding travado — kickoff pendente ({nome})". Nada de promover silenciosamente. Onboarding travado é um dos maiores preditores de churn precoce em high-ticket, e assim ele fica visível no Kanban.

**Flag paralelo — "Em risco":** `nivel_risco='vermelho'` em qualquer estágio 1–4 puxa o card para a coluna de risco até estabilizar (ver seção 6). **O card em risco preserva o contexto de origem:** exibe um badge com o **estágio de jornada subjacente** (ex.: `Risco • Renovação 12d`), e ao estabilizar é **devolvido automaticamente ao estágio calculado por tempo** (não por escolha manual), eliminando erro de reclassificação.

### Colunas exatas do Kanban (esquerda → direita)

Objetivo: a Camila abre e **em 5 segundos sabe onde agir hoje**. As colunas seguem a jornada, com as ações urgentes puxadas para a esquerda.

1. **🆕 Novos / Onboarding** — `estagio='onboarding'`
2. **🟢 Em andamento** — `estagio='ativo'`
3. **🔵 Check-in (metade)** — `estagio='check_in'`
4. **🟠 Renovação (30 dias)** — `estagio='renovacao'` ← **coluna mais importante do dia**
5. **🔴 Em risco / Resgate** — `nivel_risco='vermelho'` (overlay, qualquer fase ativa; card mostra badge do estágio subjacente)
6. **✅ Renovado** — `estagio='renovado'`
7. **⚫ Offboarding / Churn** — `estagio in ('offboarding','churn')`

**Regras de movimentação**
- 1→2→3→4 é **automático** (n8n, por % de tempo; 1→2 depende do kickoff) — a Camila não arrasta.
- Coluna **Em risco** é populada pelo health; **estabilizou → volta sozinho** ao estágio calculado por tempo (não depende de escolha manual).
- **Renovado** = desfecho a partir do **formulário "Novo contrato / Renovar"** (não é drag manual solto). **Churn** é desfecho manual (a Camila confirma) e abre modal pedindo o **motivo** (alimenta análise futura).
- Cada card mostra: nome, produto, **barra de % do contrato**, `dias_para_fim`, badge de health, nº de tarefas abertas e (na coluna Em risco) o **badge do estágio subjacente**.
- Mobile: Kanban vira abas roláveis por coluna, com botão "Mover para ▾" em vez de arrastar.

### "Onde o mentorado está" traduzido em dado

Três números combinados no card e no topo da Ficha:
- **Estágio atual** (rótulo da jornada).
- **% decorrido** = `(hoje − data_inicio) / (data_fim − data_inicio) × 100` → barra de progresso.
- **Próximo marco** + contagem regressiva (ex.: "Janela de renovação em 122 dias", "Contrato encerra em 8 dias").

> Ex.: **João Silva** · Mentoria 12m · **58% decorrido** ▓▓▓▓▓▓░░░░ · *Ativo* · Próximo marco: *Renovação em 122 dias* · 🟢

---

## 6. Health score e risco de churn

Modelo simples de **3 faixas** para um time pequeno interpretar sem treinamento. Roda no n8n 1x/dia, grava `health_score` (0–100) e `nivel_risco` em `mentorados`. Baseado em **4 sinais** que somam **pontos de risco**.

> **Pré-condição de confiabilidade — o "tempo sem contato" precisa enxergar o contato de saída.** O botão `wa.me` abre o WhatsApp externo e **não gera registro** de volta. Se só as respostas via webhook (WA-05) virassem interação, o sistema continuaria contando "X dias sem contato" mesmo depois de a Camila conversar — inflando risco, disparando alertas falsos e poluindo a Timeline. **Solução (MVP):** ao clicar em **[Abrir WhatsApp]/💬**, abre automaticamente um **mini-form "Registrar contato"** (`tipo=whatsapp`, `data_evento=hoje`, nota opcional) que grava uma `interacao` de saída; e há também um botão **"Registrei um contato"** de 1 clique no card e na Ficha. Sem esse log, o health e o "tempo sem contato" são inutilizáveis.

| Sinal | Pergunta | Pontos |
|---|---|---|
| **Tempo sem contato** | Dias desde a última `interacao` (**inclui o contato de saída logado**) | 0–14d: 0 · 15–29d: 1 · ≥30d: **2** |
| **Proximidade do fim** | Na janela de renovação sem conversa iniciada? | fora: 0 · ≤30d sem contato de renovação: **2** |
| **Engajamento** | Respondeu às últimas mensagens / compareceu às calls? | responde: 0 · silêncio parcial: 1 · sumiu/faltou: **2** |
| **NPS** | Última nota (`nps_ultimo`) | 9–10: 0 · 7–8: 1 · ≤6 ou sem NPS há muito: **2** |

**Classificação (soma → faixa e score de exibição):**
- **0–1 pts → 🟢 Saudável** (`verde`, score ~75–100) — rotina normal.
- **2–3 pts → 🟡 Atenção** (`amarelo`, score ~50–74) — toque proativo prioritário.
- **4+ pts → 🔴 Risco** (`vermelho`, score <50) — vai para a coluna "Em risco", ação imediata.

**Overrides (marca `vermelho` independentemente da soma):** (a) ≥30 dias sem nenhum contato, (b) NPS ≤ 6, (c) na janela de renovação sem resposta ao aviso, ou (d) **onboarding com kickoff pendente aos ~15 dias** (fica pelo menos amarelo; ver seção 5). São os sinais que mais preveem churn em high-ticket.

**Health explicável na Ficha:** mostrar os fatores que puxam para baixo (ex.: "contrato 83% · última interação há 21d · sem renovação iniciada"). Nada de caixa-preta — a CS precisa confiar e agir. Onboarding recém-entrado aparece como "—" (score ainda não confiável).

---

## 7. Arquitetura técnica

**Princípio:** Supabase = fonte da verdade do ciclo de vida · React/Vite/Vercel = interface · n8n = motor de automação na borda. Nada de infra pesada.

### 7.1 Front — módulo novo no MESMO app React/Vite

Reaproveita build, Tailwind v4, Recharts, deploy Vercel e o design existente. O funil de eventos (público) e o portal de CS (privado) convivem separados por rota.

Mudanças no `reino-dashboard`:
1. Adicionar deps: `react-router-dom` (hoje o `App.jsx` é single-page), `@supabase/supabase-js`, `@dnd-kit/core` (drag do Kanban).
2. Estrutura:
   ```
   src/
     data/ ...                 (funil atual, intacto)
     lib/supabase.js           (client com VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
     auth/AuthProvider.jsx     (sessão Supabase + papel do usuário)
     routes/
       PublicDashboard.jsx     (funil de eventos = App atual, público)
       cs/
         Login.jsx
         Layout.jsx            (guard: exige sessão)
         Dashboard.jsx         (KPIs + Fila de Ação)
         MentoradosLista.jsx
         Kanban.jsx            (colunas da seção 5)
         MentoradoDetalhe.jsx  (timeline, contrato, tarefas, mensagens, form Novo contrato)
         Renovacoes.jsx        (pipeline por status_renovacao + form Novo contrato)
         Gestao.jsx            (health, churn, NPS — só admin)
   ```
3. Rotas: `/` = funil (público); `/cs/*` = protegido (redireciona para `/cs/login` sem sessão).
4. Front usa **somente a anon/publishable key** — toda leitura/escrita passa por RLS. A `service_role` **nunca** vai para o front nem para o repo.
5. Vercel: manter o SPA rewrite do `vercel.json` para as rotas do router funcionarem em refresh.
6. Reaproveita helpers `brl`, `pct`, `num` de `src/data/format.js` e os tokens `--navy / --gold / --dark / --mid`, classes `.card`, `.badge`, `.tab-btn`, `table.reino`.

### 7.2 Auth e RLS (portal exclusivo de CS)

- **Supabase Auth**, provider **e-mail + senha**, sem signup público. Usuários criados por convite manual no painel (2 pessoas: Mateus=`admin`, Camila=`cs`).
- **Um único mecanismo de papel no MVP: `auth_papel()` `SECURITY DEFINER`.** Descartamos o custom access token hook (JWT) para o MVP — ter o hook **e** a função criava duas fontes de verdade do papel que podiam divergir, o hook ficava sem uso real (todas as policies usam `auth_papel()`) e exigia passos extras não triviais (habilitar o hook no painel e conceder a `supabase_auth_admin`). Fica **uma** fonte de verdade: a tabela `usuarios`, lida por `auth_papel()`. (Migrar as policies para ler um claim do JWT é uma otimização opcional da Fase 2; se um dia for feita, aí sim o hook é habilitado e concedido a `supabase_auth_admin`, e as policies passam a ler o claim.)

**Sincronização `usuarios` ⇄ `auth.users` (sem isto, `auth_papel()` retorna NULL e TUDO é negado):**
A linha em `usuarios` precisa existir e o `papel` precisa estar setado no momento em que o usuário é convidado. Adotamos a trigger:

```sql
-- cria a linha em usuarios automaticamente ao criar o auth.user,
-- lendo nome/papel do metadata do convite (default 'cs').
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into usuarios (id, email, nome, papel, ativo)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nome', new.email),
    coalesce((new.raw_app_meta_data->>'papel')::papel_usuario, 'cs'),
    true
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```

> No convite dos 2 usuários, setar `app_metadata.papel` (`admin` para o Mateus, `cs` para a Camila) — a trigger copia esse valor para `usuarios.papel`. (Não há mais hook JWT lendo esse metadata; ele serve só como semente do papel na tabela.)

```sql
create or replace function auth_papel() returns papel_usuario
language sql stable security definer set search_path = public as $$
  select papel from usuarios where id = auth.uid()
$$;
```

**Performance de RLS — envolver a função em subselect para cache via initplan:** nas policies, usar `(select auth_papel())` em vez de `auth_papel()` direto. Isso é o padrão recomendado pelo Supabase: o planner materializa o valor **uma vez por query** (initplan) em vez de reavaliar por linha, o que importa quando a Lista/Kanban varrem a carteira inteira.

**Regras por tabela (resumo):**
- `mentorados` / `contratos`: admin = tudo; cs = leitura/escrita dos seus (`responsavel_cs = auth.uid()`) e dos não atribuídos (`responsavel_cs is null`).
- `interacoes` / `tarefas` / `consentimentos`: cs enxerga/escreve registros **dos mentorados que ele vê** (via `EXISTS` — SQL abaixo); `autor_id`/`responsavel_id` forçados a `auth.uid()` no `with check`.
- `mensagens_enviadas` / `eventos_automacao`: **select** para admin e cs (transparência); **escrita só `service_role`** (quem escreve é o n8n / Edge Function).
- `automacoes`: config editável só por admin.
- `usuarios`: cada um lê o próprio; admin lê/edita todos.

**Exemplo (mentorados) — com `(select auth_papel())` e `with check` reforçado para o cs não entregar a carteira a terceiros:**
```sql
alter table mentorados enable row level security;
create policy mentorados_admin_all on mentorados for all to authenticated
  using ((select auth_papel())='admin') with check ((select auth_papel())='admin');
create policy mentorados_cs_select on mentorados for select to authenticated
  using ((select auth_papel())='cs' and (responsavel_cs = auth.uid() or responsavel_cs is null));
create policy mentorados_cs_update on mentorados for update to authenticated
  using ((select auth_papel())='cs' and (responsavel_cs = auth.uid() or responsavel_cs is null))
  -- impede reatribuir a carteira a outra pessoa: só pode manter em si ou deixar sem dono
  with check ((select auth_papel())='cs' and (responsavel_cs = auth.uid() or responsavel_cs is null));
```

**SQL das políticas "difíceis" (baseadas em EXISTS/JOIN a `mentorados`)** — o cs só vê registros de mentorados que ele vê (incluindo os não atribuídos):
```sql
-- INTERACOES
alter table interacoes enable row level security;
create policy interacoes_admin_all on interacoes for all to authenticated
  using ((select auth_papel())='admin') with check ((select auth_papel())='admin');
create policy interacoes_cs_select on interacoes for select to authenticated
  using (exists (select 1 from mentorados m
                 where m.id = interacoes.mentorado_id
                   and (m.responsavel_cs = auth.uid() or m.responsavel_cs is null)));
create policy interacoes_cs_insert on interacoes for insert to authenticated
  with check (autor_id = auth.uid()
              and exists (select 1 from mentorados m
                          where m.id = interacoes.mentorado_id
                            and (m.responsavel_cs = auth.uid() or m.responsavel_cs is null)));

-- TAREFAS (mesmo molde; responsavel_id forçado a auth.uid() no insert/update do cs)
alter table tarefas enable row level security;
create policy tarefas_admin_all on tarefas for all to authenticated
  using ((select auth_papel())='admin') with check ((select auth_papel())='admin');
create policy tarefas_cs_rw on tarefas for all to authenticated
  using (exists (select 1 from mentorados m
                 where m.id = tarefas.mentorado_id
                   and (m.responsavel_cs = auth.uid() or m.responsavel_cs is null)))
  with check (exists (select 1 from mentorados m
                      where m.id = tarefas.mentorado_id
                        and (m.responsavel_cs = auth.uid() or m.responsavel_cs is null)));

-- CONSENTIMENTOS (leitura/registro dos seus; revogação crítica via Edge Function/service_role)
alter table consentimentos enable row level security;
create policy consent_admin_all on consentimentos for all to authenticated
  using ((select auth_papel())='admin') with check ((select auth_papel())='admin');
create policy consent_cs_select on consentimentos for select to authenticated
  using (exists (select 1 from mentorados m
                 where m.id = consentimentos.mentorado_id
                   and (m.responsavel_cs = auth.uid() or m.responsavel_cs is null)));
create policy consent_cs_insert on consentimentos for insert to authenticated
  with check (exists (select 1 from mentorados m
                      where m.id = consentimentos.mentorado_id
                        and (m.responsavel_cs = auth.uid() or m.responsavel_cs is null)));
```

### 7.3 Fronteira front ⇄ n8n ⇄ Supabase

- **Ações sensíveis** (revogar consentimento, disparo manual de mensagem, reprocessar automação, receber status de entrega) passam por **Supabase Edge Functions** (Deno) que validam papel e escrevem com `service_role`. O front chama a Edge Function autenticado (JWT).
- O **n8n** fala com o Supabase por dois caminhos: (a) lê/escreve via `service_role` (cron, upsert de sync); (b) recebe **webhooks** do provedor WhatsApp (status de entrega/leitura → atualiza `mensagens_enviadas.status`; resposta do mentorado → vira `interacao`). **Todo webhook valida assinatura/segredo — recomputando o HMAC num primeiro node Code, timing-safe — antes de qualquer escrita** (ver 8.4 e 8.2/WA-05/WA-08).

### 7.4 Integração com o CRM atual — recomendação

| Opção | Como | Trade-off |
|---|---|---|
| **A — Import CSV único + Supabase como fonte da verdade** ✅ **RECOMENDADA** | Exporta CSV do CRM, mapeia para `mentorados`+`contratos`, importa 1x. **Daí em diante a venda e as renovações são cadastradas no portal** (import inicial + formulário "Novo contrato / Renovar"). | Exige disciplina de cadastrar num lugar; em troca elimina sync frágil e dá controle total do ciclo de vida (que o CRM não faz). |
| **B — Sync contínuo via n8n** | n8n roda a cada X horas / webhook do CRM: **upsert** por `crm_id` (`on conflict (crm_id) do update`). | Mantém o hábito atual, mas cria dependência da API/exportação do CRM e risco de conflito. Só vale se o CRM tiver API/webhook decente e a equipe recusar mudar o fluxo. |
| **C — Migração definitiva (Supabase vira CRM)** | Abandona o CRM. | Mudança operacional grande de uma vez. Prematuro agora. |

**Recomendação:** começar com **A**; o schema já está preparado para evoluir para **B** (colunas `crm_id` únicas em `mentorados` e `contratos`). **Não fazer C agora.** Aplicar **minimização**: dados comerciais sensíveis (histórico de negociação, comissão) **não** vão para o Supabase.

**Procedimento de import inicial (com backfill de aviso e cap de disparo — evita carteira sem aviso e evita enxurrada num número novo):**
1. Exportar CSV do CRM → mapear colunas → `mentorados` + `contratos` (upsert por `crm_id`).
2. Registrar `consentimentos` (comunicação e, quando houver, marketing) antes de qualquer disparo.
3. **Rodar a varredura de backfill** (seção 8.1) UMA vez logo após o import: contratos ativos com `data_fim` entre HOJE e HOJE+31 dias, **sem log de aviso**, são enfileirados com o template/tarefa correspondente ao `dias_para_fim` **atual** (D-30, ou já D-7 se restam poucos dias). Isso garante que contratos importados **já dentro da janela** (ex.: 20 dias restantes) não passem batido.
4. **Cap diário de disparo (obrigatório na virada de chave):** o backfill + a carga importada podem enfileirar dezenas de disparos de uma vez contra o **tier de mensageria inicial baixo** de um número novo. O disparo respeita o **cap `N` por execução do cron** (`LIMIT N` na query — seção 8.1); o excedente permanece elegível no dia seguinte (o índice único garante que não duplica quando reaparece na fila). **`N` inicial sugerido = 40/dia**, subindo em rampa de aquecimento (ex.: 40 → 80 → 150 → …) conforme a Meta eleva o tier do número. O procedimento de import documenta o `N` vigente e quem ajusta a rampa (Agente de Automação + DevOps).

### 7.5 Deploy e observabilidade

- **Front:** Vercel (mesmo projeto), env `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, preview deploys por branch.
- **Banco/Auth/Edge:** Supabase **plano Pro desde o go-live do MVP** (backups diários + PITR, sem pausa) — o import da carteira real (PII: CPF, WhatsApp E.164, histórico) acontece na Fase 0, então integridade/disponibilidade do dado pessoal (art. 6 LGPD) é requisito de MVP, não de fase futura. Migrações versionadas em `supabase/migrations` no repo (CLI). Rodar **Advisors** após criar o schema (pega RLS faltando, **views sem `security_invoker`** e índices). **Alternativa de custo mínimo só para o piloto** (se optar por rodar em Free antes do go-live): manter Free **com uma rotina de backup lógico agendada** — um workflow n8n que roda `pg_dump` diário e grava o dump em storage externo (Supabase Storage/S3 barato), com **RPO ≈ 24h e RTO documentado** (restaurar o último dump), aceito e assinado como risco temporário. No go-live com carteira real, subir para Pro.
- **Automação:** n8n Cloud (Starter) ou self-host em container barato (Railway/Fly/VPS). Para SQL, usar o **node Postgres (connection string)** ou uma **função RPC** — o "Supabase Execute Query" não é um node padrão para SQL arbitrário.
- **Observabilidade:** logs do Supabase (Postgres/Auth/Edge); histórico de execuções + Error Trigger no n8n; painel "Saúde da automação" (admin) lendo `mensagens_enviadas.status='falha'`, reservas `agendada` presas e `eventos_automacao`. **Alerta interno se o WA-01 não produzir ao menos uma execução bem-sucedida no dia.** UptimeRobot opcional no front.

---

## 8. Automações de ciclo de vida (n8n + WhatsApp)

**Padrão comum de todo disparo proativo (reserve-before-send):**
`cron diário → query (com NOT EXISTS por chave canônica + LIMIT N do cap) → IF opt-in válido → gerar ref_idempotencia → INSERT reserva 'agendada' (reivindica o slot no índice único; node com onError=continueErrorOutput) → template aprovado (com biz_opaque_callback_data=ref_idempotencia) → UPDATE 'enviada'/'falha' → ação CS/Kanban`. Muda só o filtro de data e o template.

> **Regra de ouro da idempotência (alinhada ao SQL de fato aplicado):** a chave canônica é `(mentorado_id, template_nome, contrato_ref)` — onde `contrato_ref` = **`contrato_id::text`** para mensagens de contrato (estável a edições) **ou** `'ciclo:'||data` para mensagens sem contrato (check-in/NPS periódicos) — sustentada pelo índice único parcial `uq_msg_idem`. Quando o mentorado renova, ganha um **novo contrato (novo id)** e o próximo ciclo pode ser avisado de novo sem conflito com o log antigo. Corrigir uma data do contrato **não** reabre a porta ao duplo aviso, porque a chave é o id, não a `data_fim`. Não há um segundo índice concorrente: `uq_msg_idem` é a única trava.

> **Datas sempre no fuso do cron:** os filtros de janela usam `(now() at time zone 'America/Sao_Paulo')::date`, **não** `CURRENT_DATE` (que no Postgres do Supabase roda em UTC). A view `vw_mentorados_visao` usa o mesmo critério, então Lista/Kanban e cron concordam.

### 8.1 AUTOMAÇÃO ÂNCORA — Aviso D-30 (Dor Central 1)

**Workflow `WA-01 Aviso D-30`.** Todo dia às 09:00 (America/Sao_Paulo) encontra contratos que terminam em ~30 dias e ainda não avisados, respeita o **cap diário**, **reserva o slot ANTES de enviar**, dispara o template, atualiza o status, abre tarefa e move o card.

**Ordem à prova de falha (reserve-before-send) — com tratamento de erro explícito do INSERT:**
```
[1] Schedule Trigger  cron 0 9 * * *  (America/Sao_Paulo)
[2] Postgres node (ou RPC)  → contratos vencendo em 29–31 dias, não avisados, LIMIT N (cap)
[3] IF retornou linhas? ──não──► FIM
[4] Split In Batches (1 por vez) + Wait 1–2s  (rate limit)
[5] IF consentimento comunicacao_whatsapp = 'concedido'?
        ──não──► cria tarefa CS "Pedir opt-in" ► próximo
[6] Set: ref_idempotencia = 'wa01:' || contrato_id || ':aviso_fim_contrato_30d'
[7] Postgres INSERT mensagens_enviadas
        (status='agendada', contrato_ref=contrato_id::text, ref_idempotencia=...)   ← RESERVA PRIMEIRO
        └─ NODE CONFIGURADO COM  onError = continueErrorOutput  (NÃO continueOnFail silencioso):
             ├ saída de ERRO (colisão em uq_msg_idem, unique_violation)
             │     ──► NÃO envia; encerra o item limpo (duplicata já tratada);
             │         opcional: eventos_automacao(tipo='reconciliou', detalhe='colisao_idem')
             └ saída de SUCESSO ──► segue para [8]
[8] HTTP Request → envia TEMPLATE aviso_fim_contrato_30d (HSM aprovado)
        payload inclui biz_opaque_callback_data = ref_idempotencia  (Cloud API)
[9] IF envio 200 OK?
      ├ sim ► UPDATE mensagens_enviadas SET status='enviada', provider_msg_id=...
      │       INSERT tarefas (titulo "Abrir conversa de renovação — {nome}", tipo='renovacao', origem=automacao)
      │       UPDATE contratos SET status_renovacao='na_janela'  (entra no pipeline de Renovações)
      │       UPDATE mentorados SET estagio='renovacao'
      └ não ► UPDATE mensagens_enviadas SET status='falha', erro=... + tarefa "enviar manual"
```
**Por que isto é à prova de falha:** (a) a **reserva `agendada` existe antes do envio**, então execuções concorrentes/retry do cron colidem no índice único e a **rota de erro do node encerra o item sem mandar um segundo WhatsApp** — o ponto crítico é o `onError=continueErrorOutput` (ou `continueOnFail` **com branch de erro explícito**): sem isso, um erro poderia derrubar o item de forma suja ou, pior, o fluxo poderia seguir enviando; (b) se o n8n cair entre reservar e enviar, a linha `agendada` **bloqueia o reenvio** no próximo cron; (c) o **job de reconciliação (WA-09)** trata as `agendada` presas **sem duplicar** (ver abaixo). O enum já tem `agendada` e o índice já inclui esse status — só invertemos a ordem dos passos.

Query central (idempotência estável por `contrato_id` + fuso correto + cap `N`):
```sql
SELECT m.id, m.nome, m.whatsapp, c.id as contrato_id, c.produto, c.data_fim
FROM contratos c JOIN mentorados m ON m.id = c.mentorado_id
WHERE c.status = 'ativo'
  AND m.estagio NOT IN ('churn','renovado')
  AND c.data_fim BETWEEN
        ((now() at time zone 'America/Sao_Paulo')::date + INTERVAL '29 day')
    AND ((now() at time zone 'America/Sao_Paulo')::date + INTERVAL '31 day')
  AND NOT EXISTS (
    SELECT 1 FROM mensagens_enviadas l
    WHERE l.mentorado_id = m.id
      AND l.template_nome = 'aviso_fim_contrato_30d'
      AND l.contrato_ref  = c.id::text                 -- ESTÁVEL A EDIÇÕES (era c.data_fim)
      AND l.status IN ('agendada','enviada','entregue','lida','respondida')
  )
ORDER BY c.data_fim ASC
LIMIT :cap;                                             -- cap diário de aquecimento (ex.: 40)
```

**Varredura de backfill / rede de segurança (idempotente por `contrato_id`, roda todo dia, também com cap):**
Além da janela estrita 29–31d, uma varredura diária pega **qualquer contrato ativo ainda sem aviso e dentro do prazo** — `data_fim` entre HOJE e HOJE+31 — e enfileira o template/tarefa apropriado ao `dias_para_fim` **atual** (D-30, ou D-7 se já estiver perto), respeitando o mesmo `LIMIT N`. Isso: (a) cobre contratos **importados já dentro da janela** (virada de chave); (b) recupera contratos que ficaram sem aviso se o n8n **ficou fora do ar por mais de 2 dias**; e (c) por ser idempotente (a reserva no índice único evita duplicar), pode rodar diariamente sem risco. Complementa — não substitui — a janela 29–31d.

- **Janela 29–31 dias** (não `= 30`): tolerância a um dia de cron falho; a varredura de backfill cobre falhas mais longas.
- **Cadência de reforço:** D-30 (aviso), **D-15 (reforço)**, D-7 (última chamada), **parando se o mentorado já respondeu ou a Camila já assumiu**. Cada nível é um `template_nome` distinto para não colidir na idempotência. A cadência está **completa** com os workflows WA-01 (D-30), **WA-01d (D-15)**, WA-01c (D-7) e o aquecimento WA-01b (D-60); ver 8.2. **Condição de parada como filtro SQL explícito** nos reforços (D-15 e D-7):

```sql
-- Reforços D-15 / D-7: NÃO disparam se o mentorado já interagiu depois do aviso
-- OU se a renovação já saiu de 'na_janela' (Camila assumiu / negociação / desfecho).
... AND c.status_renovacao = 'na_janela'
    AND NOT EXISTS (
      SELECT 1 FROM interacoes i
      WHERE i.mentorado_id = m.id
        AND i.data_evento > (
          SELECT max(me.enviada_em) FROM mensagens_enviadas me
          WHERE me.mentorado_id = m.id
            AND me.contrato_ref = c.id::text
            AND me.template_nome = 'aviso_fim_contrato_30d'
        )
    )
    AND NOT EXISTS (  -- idempotência do próprio reforço
      SELECT 1 FROM mensagens_enviadas l
      WHERE l.mentorado_id = m.id
        AND l.template_nome = :template_reforco   -- 'aviso_fim_contrato_15d' | '..._7d'
        AND l.contrato_ref  = c.id::text
        AND l.status IN ('agendada','enviada','entregue','lida','respondida')
    )
```
Sem esses dois filtros, D-15/D-7 poderiam disparar **depois** que o mentorado respondeu ou que a Camila já entrou na negociação — exatamente o que não pode acontecer.

### 8.2 Demais automações (mesmo molde reserve-before-send)

| Workflow | Gatilho / filtro | Ação |
|---|---|---|
| **WA-02 Onboarding D0** | `data_inicio = hoje` (fuso SP), sem log | template boas-vindas; `estagio='onboarding'`; tarefa `tipo='kickoff'` "Agendar kickoff" |
| **WA-02b Verifica kickoff** | `data_inicio = hoje-15`, `estagio='onboarding'` | se tarefa kickoff concluída → `estagio='ativo'`; senão **mantém onboarding**, `nivel_risco='amarelo'`, tarefa "Onboarding travado" |
| **WA-03 Check-in D+7** | `data_inicio = hoje-7` | template "como estão os primeiros passos?" |
| **WA-03b Check-in 50%** | `pct_decorrido ≥ 50` sem log do ciclo | tarefa "Reunião de meio de contrato"; `estagio='check_in'` |
| **WA-01b Aviso D-60** | `data_fim` em 59–61 dias | template "reta final começando"; **só cria tarefa** (aquece, não move p/ Renovação) |
| **WA-01d Aviso D-15** | `data_fim` em 14–16 dias, `status_renovacao='na_janela'`, **sem interação pós-aviso** (filtro 8.1) | template reforço; tarefa prioridade alta |
| **WA-01c Aviso D-7** | `data_fim` em 6–8 dias, não `renovado`, `status_renovacao='na_janela'`, **sem interação pós-aviso** (filtro 8.1) | template última semana; tarefa prioridade alta |
| **WA-04 NPS** | após `data_inicio + 90d` e/ou 15d antes do fim | template pergunta 0–10; resposta cai em webhook |
| **WA-05 Webhook respostas** | Webhook Trigger (**1º node Code valida HMAC → 401 se falhar; só então escreve**) | parse de resposta livre (ver 8.4): grava `nps_ultimo`/`interacao`; **se mentorado com `estagio='renovacao'` responde → avança `status_renovacao` `na_janela→contatado`, cria/prioriza tarefa alta "Responder renovação — {nome}" e dispara alerta interno imediato**; nota ≤6 → tarefa "detrator" + risco; opt-out (SAIR/PARAR/STOP/CANCELAR) → revoga opt-in; remetente desconhecido → tarefa `tipo='conciliacao'`, sem escrever nps |
| **WA-06 Reativação pós-churn** | `estagio='churn'` e `data_fim = hoje-30` | template Marketing "sentimos sua falta" (exige `marketing_whatsapp` concedido) |
| **WA-07 Alerta interno de risco** | cron 6h, `nivel_risco='vermelho'` sem alerta há 72h | **NÃO** manda WhatsApp ao cliente; alerta Camila (e-mail/Slack); card → coluna Em risco (badge do estágio subjacente) |
| **WA-08 Webhook status entrega** | Webhook Trigger (**1º node Code valida HMAC → 401 se falhar; só então escreve**) | `UPDATE mensagens_enviadas SET status=sent/delivered/read/failed WHERE provider_msg_id=... (ou por ref_idempotencia ecoada)`; `failed` → tarefa "revisar contato" |
| **WA-09 Reconciliação (anti-duplo-envio)** | cron a cada 30–60 min | para cada reserva `agendada` presa (sem `provider_msg_id` há > X min): **consulta o status real no provedor pela `ref_idempotencia`/`biz_opaque_callback_data` (ou aguarda janela de graça por webhook)**; só reenvia se **comprovadamente não saiu**; se saiu, apenas concilia `status`; alerta se WA-01 não teve execução OK no dia |
| **Sub-workflow `Enviar WhatsApp`** | — | isola o provedor (troca Z-API↔Cloud API num único lugar) |
| **Error Trigger global** | falha de workflow | notifica o time |

**Avanço automático do sub-status de renovação (WA-05):** quando chega uma resposta de um mentorado cujo contrato ativo está em `estagio='renovacao'` e `status_renovacao='na_janela'`, o webhook (após validar HMAC) grava a `interacao`, seta `status_renovacao='contatado'` (é um dos gatilhos de "conversa aberta") e **prioriza a resposta** (tarefa alta + alerta interno). Esse mesmo avanço para `contatado` é o que **desliga os reforços D-15/D-7** (filtro de parada em 8.1). Os avanços seguintes (`contatado → em_negociacao → renovado | nao_renovou`) são feitos pela Camila na tela Renovações; `renovado` é consequência do **formulário "Novo contrato / Renovar"**.

### 8.3 Templates de mensagem (copy pt-BR, tom Reino)

> **Regras Meta:** disparo proativo (fora da janela de 24h) exige **template HSM aprovado**. Variáveis `{{1}}`, `{{2}}`. **Categoria almejada: Utility** para contrato/onboarding/NPS (barato, aprova fácil); **Marketing** para reativação. Respostas do cliente abrem janela de 24h → texto livre.
>
> **Risco de reclassificação de T1 (importante):** a Meta tem reclassificado nudges de **renovação/upsell como Marketing**. Como T1 (`aviso_fim_contrato_30d`) é, na prática, uma abertura de renovação, tratamos isso como **risco de cronograma com dono definido** (Agente de Conteúdo/Automação) e nos preparamos para os dois cenários — ver 8.4.

- **T1 `aviso_fim_contrato_30d`** (mira Utility, **tom o mais transacional/neutro possível**): "Oi {{1}}, aqui é a Camila, da Reino. Sua {{2}} está chegando ao fim do período contratado (faltam ~30 dias). Preciso alinhar com você os próximos passos e o encerramento ou a continuidade. Podemos falar essa semana?"
- **T2 `aviso_fim_contrato_60d`** (Utility): panorama de resultado, 2 meses finais.
- **T2b `aviso_fim_contrato_15d`** (Utility): reforço — "Oi {{1}}, passando pra reforçar: sua {{2}} encerra em ~15 dias. Vamos alinhar a continuidade?" (só dispara pelo filtro de parada do 8.1).
- **T3 `aviso_fim_contrato_7d`** (Utility): conclui na próxima semana, garantir plano de continuidade.
- **T4 `boas_vindas_onboarding`** (Utility): "Bem-vindo(a) ao Reino, {{1}}! Sua jornada na {{2}} começou. Eu sou a Camila e vou te acompanhar. Nos próximos dias marco o kickoff."
- **T5 `checkin_periodico`** (Utility): "Oi {{1}}, como você está na {{2}}? O que avançou? Algo travado que eu possa ajudar a destravar?"
- **T6 `pesquisa_nps`** (Utility): "De 0 a 10, o quanto você recomendaria a Reino? Pode responder só com o número."
- **T7 `reativacao_pos_churn`** (Marketing): condição especial de retorno; incluir "responda SAIR para não receber mais".
- **T8 Alerta interno** (não é WhatsApp; e-mail/Slack): "⚠️ Mentorado em risco / resposta de renovação: {nome} (health {score}) · Fim: {data_fim} · sugestão: ligar em 48h · {link_portal}".

### 8.4 Realidades do WhatsApp (opt-in, janela 24h, reclassificação, assinatura de webhook, cap, parsing)

- **Janela de 24h / HSM:** todo disparo proativo exige template aprovado; respostas do cliente abrem janela para texto livre (a Camila assume).
- **Opt-in obrigatório (dois consentimentos separados):** (1) `comunicacao_whatsapp` — base legal `execucao_contrato` cobre avisos de contrato/onboarding/NPS; (2) **`marketing_whatsapp` — coletado separadamente já no onboarding**. Coletar o opt-in de marketing desde o início é o **plano B** caso a Meta reclassifique T1 como Marketing: sem ele, o disparo travaria. Sempre oferecer saída ("responda SAIR") em marketing.
- **Cenário de reclassificação de T1 (assumido explicitamente):** (a) escrever T1 no tom mais transacional/neutro (feito em 8.3); (b) ter o opt-in de marketing já coletado; (c) se cair em Marketing, considerar **custo maior por conversa** e os **limites de frequência por usuário** de templates de Marketing no planejamento de disparo da carga importada; (d) dono do risco: Agente de Conteúdo/Templates + Automação, acompanhando a categoria na aprovação.
- **Verificação de assinatura de webhook (obrigatória, no PRIMEIRO node):** WA-05 e WA-08 recebem webhooks que executam ações sensíveis (revogar opt-in via "SAIR", marcar detrator/risco, mudar status para "lido"). **O Webhook node do n8n NÃO valida HMAC nativamente** — por isso o **primeiro node do fluxo é um node Code** que recomputa a assinatura sobre o corpo bruto e a compara em **tempo constante (timing-safe)**: `X-Hub-Signature-256` = `HMAC-SHA256(app_secret, raw_body)` na Cloud API da Meta, ou o token/segredo do Z-API. Se não bater, **responde 401 e encerra** — **nenhum node de banco (INSERT/UPDATE) roda antes** dessa checagem. O segredo vem de **variável de ambiente do n8n**, nunca hardcoded. Exemplo de comparação: `crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(recebido))`.
- **Parsing de respostas de texto livre (WA-05) — regras explícitas:**
  - **NPS:** extrair o **primeiro inteiro de 0 a 10** por regex (ex.: `/\b(10|[0-9])\b/`), cobrindo "nota 9!!", "9/10", "daria um 8". Se **ambíguo/sem número** (ex.: "gostei muito"), **não** grava `nps_ultimo`; cria tarefa manual "Classificar NPS — {nome}".
  - **Opt-out:** conjunto de palavras-chave **case-insensitive, acento-insensitive**: `SAIR`, `PARAR`, `STOP`, `CANCELAR` (match por palavra). Ao casar → revoga `comunicacao_whatsapp`/`marketing_whatsapp` conforme o contexto e confirma a saída.
  - **Remetente desconhecido:** se o número não casa com nenhum `mentorados.whatsapp`, **não escreve nps nem interação de mentorado**; grava `eventos_automacao` (log) e cria tarefa `tipo='conciliacao'` "Remetente WhatsApp não identificado ({numero})".
- **Provedor — recomendação:** validar o MVP com **Z-API** se a burocracia da Meta atrasar o go-live, mas **planejar migração para WhatsApp Cloud API (Meta)** antes de escalar — o número é ativo crítico e um ban interromperia o relacionamento com todos os mentorados. O sub-workflow `Enviar WhatsApp` isola a troca.
- **Tier de mensageria inicial baixo + cap concreto:** número novo começa com **limite de mensagens baixo** e precisa "aquecer". O disparo é **capado por `LIMIT N` na query do cron** (seção 7.4 e 8.1), com o excedente reagendado para o dia seguinte (o índice único evita duplicar). `N` inicial ~40/dia, com **rampa de aquecimento** conforme a Meta eleva o tier. Isso é o que impede o backfill + carga importada de enfileirar dezenas de disparos de uma vez e causar falhas em massa ou flag — justamente na Dor 1.

---

## 9. Portal de CS / UX (telas)

Reaproveita 100% da stack visual (React 18 + Vite + Tailwind v4 + Recharts, tokens `--navy/--gold/--dark/--mid`, `.card`, `.badge`, `.tab-btn`, `table.reino`). Shell = header sticky navy com blur, `max-w-7xl mx-auto`, navegação por abas; badge 🔔 = nº de itens que exigem ação hoje (renovações na janela + **respostas de renovação a tratar** + tarefas vencidas + falhas de envio). Mobile: abas viram menu inferior fixo; nunca scroll horizontal no body.

### Telas

1. **Dashboard da carteira** (tela inicial) — 5 KPIs clicáveis (`Ativos`, `Em risco`, `Renovações do mês`, `Valor em renovação`, `Churn 30d`), cada um leva à Lista já filtrada. O coração é a **Fila de Ação de Hoje** (worklist ordenado por urgência: **respostas de renovação (alta)** → renovações a vencer → tarefas vencidas → onboardings travados → falhas de WhatsApp → confirmações), cada item com CTA direto. Gráficos Recharts: "contratos acabando" por faixa de dias, donut de saúde da carteira, timeline de renovações (90 dias).
2. **Lista de mentorados** — `table.reino` filtrável (Status de risco, Estágio, Janela ≤30/30-60/60-90d, CS) e ordenável (mais útil: "Restam ↑" e "Saúde ↑"); filtros persistem na URL. Coluna Contrato = mini barra de `% decorrido` colorida por urgência (verde <70%, âmbar 70-90%, vermelho >90%). Coluna Ação = **💬 (`wa.me`) que abre o WhatsApp E o mini-form "Registrar contato"** + [Abrir]. Exportar CSV. Mobile: cards empilhados.
3. **Kanban por estágio** — 7 colunas da seção 5, cards arrastáveis (`@dnd-kit`, grava `mentorados.estagio`). Onboarding→ativo (com kickoff) e Renovação entram automaticamente (n8n); drag manual só para exceções. Card em risco mostra **badge do estágio subjacente** e volta sozinho ao estabilizar. Mover para Churn abre modal de motivo. Mobile: abas roláveis + botão "Mover para ▾".
4. **Ficha do mentorado** (a mais importante depois do Dashboard) — coluna esquerda: **Venda & Contrato** com a **barra de tempo/% + dias restantes + CTA [Iniciar renovação]** e o **formulário "Novo contrato / Renovar"** (campos `data_inicio`, `duracao_meses` → `data_fim` calculada e mostrada, `valor_venda`, `produto`; ao salvar cria o novo contrato com `contrato_anterior` apontando para o atual, seta `estagio='renovado'`, `status_renovacao='renovado'`, e o contrato antigo → `status='renovado'`). **Health score explicável** (fatores). Coluna direita: **Tarefas** (checkbox), **Notas** (texto livre + autor/data), botão **"Registrei um contato"** (1 clique → `interacao`) e **Timeline unificada** misturando interações humanas (💬 📞), automações (⚙ com status entregue/lido/falhou) e marcos (🎯 onboarding, NPS). Botão **[Abrir WhatsApp]** fixo no topo (`wa.me/55...`) que **também abre o mini-form "Registrar contato"**.
5. **Renovações** — pipeline dedicado, **colunas dirigidas por `status_renovacao`**: `Na janela (na_janela)` → `Contatado (contatado)` → `Em negociação (em_negociacao)` → `Renovado (renovado)` → `Não renovou (nao_renovou)`. Arrastar um card **persiste `contratos.status_renovacao`** (os KPIs "Em negociação" etc. saem daí). Cada card mostra o **status do aviso automático** (fecha o loop n8n↔humano) e traz o botão **[Novo contrato / Renovar]** (mesmo formulário da Ficha) — mover para "Renovado" **exige** cadastrar o novo contrato. "Não renovou" captura `motivo_nao_renovacao` → análise de churn. KPIs: `Na janela`, `Em negociação`, `Renovadas no mês (R$)`, `Valor em risco`, `Taxa de renovação 90d`.

### MVP destacado (v1 — resolve as 2 dores)
1. Sync CRM → Supabase (import CSV inicial) **+ backfill de aviso pós-import + cap de disparo**.
2. Cálculo de `% decorrido` e `dias_para_fim` (derivado; `data_fim` é coluna gerada).
3. **Lista** filtrável/ordenável + barra de contrato + botão WhatsApp **com mini-form "Registrar contato"**.
4. **Dashboard enxuto:** 3 KPIs (Ativos, Renovações do mês, Em risco) + Fila de Ação de Hoje (com respostas de renovação no topo).
5. **Automação-âncora WA-01** (aviso D-30, reserve-before-send + tratamento de erro do INSERT + log + tarefa) — **Dor 1**.
6. **Ficha** com contrato, barra, WhatsApp, "Registrei um contato", notas, timeline do aviso **e o formulário "Novo contrato / Renovar"** (sem ele o loop de renovação não fecha).
7. **`status_renovacao`** persistido (mesmo que a tela Renovações completa venha na Fase 1, o campo e o avanço `na_janela→contatado` via WA-05 já existem no MVP).
8. **Auth** (Camila + admin, com trigger `handle_new_user`) + base LGPD (opt-in de comunicação **e de marketing** registrado, dados mínimos, **Supabase Pro/backup desde o go-live**).

**Acessibilidade:** status de saúde nunca só por cor (número + rótulo); foco visível; `aria-label` no botão WhatsApp; `<th scope>`; alternativa por teclado/menu ao drag do Kanban; usar `#e6c670`/`#4ecb86` para texto pequeno (contraste AA).

---

## 10. Roadmap por fases

| Fase | Entregáveis | Esforço grosseiro |
|---|---|---|
| **Fase 0 / MVP** — resolve as 2 dores | Schema Supabase (tabelas + enums + `data_fim` gerada com cast explícito + `status_renovacao` + view `with (security_invoker=on)` **em fuso SP** + RLS com SQL de EXISTS e `(select auth_papel())` + trigger `handle_new_user`) · **Supabase Pro (backups diários + PITR) no go-live** (ou Free só no piloto **com rotina pg_dump via n8n** documentada) · Auth e-mail/senha (2 usuários) · Import CSV do CRM **+ backfill de aviso + cap de disparo** · Front com router + AuthProvider · **Lista** + **Dashboard enxuto** + **Ficha com formulário "Novo contrato / Renovar" e "Registrei um contato"** · **Workflow WA-01 (D-30, reserve-before-send, onError no INSERT)** + WA-09 (reconciliação **com checagem no provedor por `ref_idempotencia`**) + templates T1/T4 · WA-05 mínimo (webhook resposta **com validação HMAC no 1º node** → avança `na_janela→contatado` + alerta; parsing/opt-out/remetente desconhecido) · idempotência `uq_msg_idem` por `contrato_id` · opt-in comunicação **e marketing** registrado | **~2–3 semanas** (1 dev + apoio p/ aprovação de templates Meta, em paralelo) |
| **Fase 1** — amplia a gestão (Dor 2 completa) | **Kanban** (7 colunas + `@dnd-kit`, transições automáticas, kickoff-gate, badge de estágio subjacente) · **Tela Renovações** completa (pipeline por `status_renovacao` + taxa + valor em risco) · **Health score** diário no n8n com fatores explicáveis · Tarefas completas + Fila robusta · Gráficos Recharts · Workflows WA-02/02b (onboarding+kickoff), WA-03 (check-ins), WA-01b/01d/01c (D-60/D-15/D-7 com filtro de parada), WA-07 (alerta risco), WA-08 (webhook status com HMAC) · Edge Functions de ação sensível | **~3–4 semanas** |
| **Fase 2** — inteligência e escala | **NPS automático** (WA-04 + WA-05) + análise de motivos de churn · Reativação pós-churn (WA-06) · Marcos/playbooks configuráveis · Migração para WhatsApp Cloud API (se veio de Z-API) · Avaliar sync contínuo B por `crm_id` · **Múltiplos CS + distribuição de carteira (aqui o isolamento de RLS passa a ser exercitado em produção)** · (opcional) migrar papel para claim JWT via hook · Relatórios executivos | **~3–5 semanas** (incremental sobre o mesmo molde) |

> Prioridade absoluta: **WA-01 (D-30)** vai primeiro — é a razão de existir do projeto — mas só fecha o loop **com o formulário "Novo contrato / Renovar"** no mesmo MVP. **Backups/PITR não esperam a Fase 2:** entram no go-live junto com a carteira real. Onboarding e NPS vêm logo depois para ampliar a visão de gestão.

---

## 11. Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| **Perda irrecuperável da carteira (PII) por falta de backup no Free** | Incidente LGPD (art. 6 — integridade/disponibilidade) + perda da base importada | **Supabase Pro (backups diários + PITR) no go-live do MVP**; se piloto em Free, **rotina pg_dump diária via n8n para storage externo**, com **RPO ≈ 24h / RTO documentado** e aceite formal do risco temporário |
| **Aprovação de templates na Meta demora / T1 reclassificado como Marketing** | Atrasa o go-live da Dor 1; muda custo e limites de frequência | Submeter T1/T4 na semana 1; **T1 em tom transacional** para mirar Utility; **opt-in de marketing separado desde o onboarding** (plano B); registrar plano B de custo/frequência; **dono do risco** (Conteúdo+Automação); Z-API no piloto |
| **Infra WhatsApp (Business Verification / WABA / número) é o gargalo mais longo** | Bloqueia toda a Dor 1 | **Passo 0 da semana 1 com dono:** iniciar Meta Business Verification + criar WABA + provisionar número em paralelo aos templates |
| **Número novo com tier baixo → enxurrada de disparos na virada de chave** | Falhas em massa / risco de flag/ban logo na Dor 1 | **Cap diário concreto: `LIMIT N` na query do cron** (N inicial ~40, rampa de aquecimento); excedente reagendado; índice único evita duplicar; documentado no import inicial |
| **Ban / queda do número WhatsApp** | Perde o canal com toda a carteira | Cloud API oficial para produção; opt-in rigoroso; templates aprovados; nunca marketing em Utility |
| **Aviso duplicado (race/retry)** | Mentorado recebe 2x | **Reserve-before-send** + **node INSERT com `onError=continueErrorOutput`**: colisão em `uq_msg_idem` cai na rota de erro que **encerra o item sem enviar** |
| **Duplo envio pela PRÓPRIA reconciliação (crash após provedor aceitar, antes de gravar provider_msg_id)** | WA-09 reenvia e o mentorado recebe 2x (Meta não deduplica) | **`ref_idempotencia` (biz_opaque_callback_data) gerada e gravada ANTES de enviar**; WA-09 **consulta o status real no provedor por essa referência (ou aguarda janela de graça via webhook) e só reenvia se comprovadamente não saiu** |
| **Aviso perdido (crash pós-reserva / n8n fora do ar dias)** | Contrato fica sem aviso | Linha `agendada` bloqueia reenvio; **WA-09 reconcilia**; janela 29–31d + **backfill diário idempotente** |
| **Idempotência ambígua / reaberta por edição de contrato** | Duplicata em check-in/NPS ou 2º aviso ao corrigir data | **Chave única canônica** `(mentorado_id, template_nome, contrato_ref)` com `contrato_ref = contrato_id::text` (estável a edições) para mensagens de contrato e `'ciclo:'||data` (nunca NULL) para as sem contrato; `uq_msg_idem` |
| **Reforço D-15/D-7 disparando depois que o cliente já respondeu** | Mensagem redundante / ruído após Camila assumir | **Filtro SQL de parada** nos reforços: `status_renovacao='na_janela'` **e** `NOT EXISTS interação pós-aviso`; D-15 tem workflow (WA-01d) e template (T2b) próprios |
| **View furando RLS (security definer)** | Vazamento da carteira inteira (PII/LGPD) | `create view ... with (security_invoker = on)` explícito; Advisors; **teste de QA com 2º usuário `cs` de teste** |
| **Teste de RLS passa vaziamente (1 só CS vê tudo por causa do `responsavel_cs IS NULL`)** | Vazamento de isolamento não detectado | QA de Fase 0 usa **segundo `cs` seed + mentorado atribuído a outra CS**; confirma que view e tabelas-filhas não retornam esse registro |
| **`usuarios` sem linha/papel → acesso negado a todos** | Portal inutilizável | Trigger `handle_new_user` + set de `app_metadata.papel` no convite |
| **Loop de renovação não fecha (sem onde cadastrar)** | Projeto não entrega o objetivo | **Formulário "Novo contrato / Renovar"** no MVP (Ficha + Renovações); alimenta estágio `renovado`, `status_renovacao` e KPIs |
| **Contato manual invisível ao health** | Alertas falsos, health sem confiança | Mini-form/"Registrei um contato" (1 clique) grava `interacao` de saída — no MVP |
| **Resposta de renovação só "registrada"** | Perde a janela quente | WA-05 obrigatoriamente cria tarefa alta + alerta interno + topo da Fila; avança `na_janela→contatado` |
| **Onboarding "ativo fantasma" sem kickoff** | Churn precoce invisível | Saída de onboarding condicionada ao kickoff; senão mantém em onboarding + amarelo + tarefa |
| **`data_fim` digitada errado** | Gatilho de 30 dias falha | `data_fim` como **coluna gerada** com cast explícito `::date`; convenção de fim-de-mês documentada e validada no QA |
| **Webhook público forjado** | Revoga consentimento / falseia métricas | **1º node Code recomputa HMAC (timing-safe) e rejeita 401 antes de qualquer escrita**; segredo em env do n8n |
| **Parsing frágil de resposta livre (NPS/opt-out)** | NPS errado, opt-out ignorado, nota gravada p/ remetente errado | Regex do primeiro inteiro 0–10 + fallback manual; keywords SAIR/PARAR/STOP/CANCELAR; remetente desconhecido → tarefa de conciliação sem gravar nps |
| **Fuso do cron vs. UTC (view divergindo do cron)** | Aviso/Lista escorregam um dia na fronteira | `(now() at time zone 'America/Sao_Paulo')::date` **nos filtros E na view**; node Postgres/RPC |
| **Dados desatualizados vs. CRM** | Camila age sobre dado errado | Opção A (fonte única no portal); se B, upsert idempotente por `crm_id`; disciplina documentada |
| **Vazamento de PII / service_role no bundle** | Incidente LGPD | `service_role` só em n8n/Edge; front só anon key; `.env` no `.gitignore`; RLS + `EXISTS` em todas as tabelas; Advisors |
| **Time pequeno sobrecarregado** | Escopo trava | MVP mínimo; resto é incremento sobre o mesmo molde |
| **LGPD — disparo sem base legal** | Multa / reclamação | `execucao_contrato` para avisos + opt-in explícito; marketing exige consentimento separado; opt-out "SAIR"; anonimização (art. 18) |
| **LGPD — retenção indefinida** | Guarda excessiva de PII | Anonimizar ~12 meses após churn sem base legal; logs ~24 meses |

---

## 12. Custos aproximados (mensal, ordem de grandeza)

| Item | Início (piloto) | Go-live MVP / operação | 
|---|---|---|
| **Vercel** | US$0 (Hobby) | US$0–20 (Pro se precisar) |
| **Supabase** | US$0 (Free) **apenas se rodar o piloto com `pg_dump` diário via n8n**; caso contrário já **US$25 (Pro)** | **US$25 (Pro: backups diários + PITR)** — obrigatório no go-live com carteira real (PII) |
| **n8n** | US$0 self-host ou ~US$5 container (Railway/VPS) | ~US$20–24 (n8n Cloud Starter) |
| **WhatsApp (Meta/Z-API)** | conversas de serviço têm cota grátis; utility por template = centavos/conversa; volume de dezenas/mês = custo marginal | **atenção:** se T1 cair em **Marketing**, custo por conversa é maior e há limites de frequência por usuário — considerar no orçamento |
| **Total realista** | **US$0–5/mês** (só piloto Free + backup lógico) | **~US$25–50/mês** |

Dentro da restrição de baixo custo. **A subida para Supabase Pro acontece no go-live do MVP** (não na Fase 2), porque é quando a carteira real com PII entra em produção e backups/PITR passam a ser requisito de conformidade e continuidade. O único cenário Free aceitável é um piloto controlado **com a rotina de backup lógico documentada e RPO/RTO assinados**.

---

## 13. Time de agentes de execução (um agente por tarefa importante)

Mapeamento de cada tarefa crítica da construção a um agente especialista responsável e seu entregável.

| Agente | Responsabilidade | Entregável |
|---|---|---|
| **Agente de Dados / Supabase** | Modelar o banco: enums (incl. `status_renovacao`, `finalidade_consent`), tabelas, **`data_fim` gerada com cast explícito `::date`**, `contrato_ref`/`ref_idempotencia`, view `vw_mentorados_visao` **`with (security_invoker=on)` e em fuso SP**, índice único canônico `uq_msg_idem` (por `contrato_id`), triggers de `updated_at` | Migrações SQL aplicadas; view alimentando Lista/Kanban/Renovações; Advisors sem alertas críticos (incl. view com security_invoker); QA de datas de fim-de-mês |
| **Agente de Backend / RLS & Auth** | Auth e-mail/senha, papéis, `auth_papel()` **envolto em `(select …)`**, **trigger `handle_new_user`**, políticas RLS por tabela **com SQL de EXISTS** e `with check` reforçado, Edge Functions de ação sensível. (Sem hook JWT no MVP.) | RLS ligada e testada; 2 usuários provisionados (linha em `usuarios` + `app_metadata.papel`); Edge Functions deployadas |
| **Agente de Automação n8n / WhatsApp** | Workflows WA-01…WA-09 (incl. **WA-01d D-15**) + sub-workflow `Enviar WhatsApp` + Error Trigger; **reserve-before-send com `onError` no INSERT**; **`ref_idempotencia` + reconciliação que consulta o provedor antes de reenviar**; **cap `LIMIT N`**; **validação HMAC no 1º node dos webhooks**; **parsing/opt-out/remetente desconhecido**; **filtro de parada dos reforços**; fuso SP; node Postgres/RPC | WA-01 (D-30) em produção sem duplicar/perder; WA-09 sem duplo envio; WA-05 avançando `status_renovacao`; catálogo `automacoes` semeado |
| **Agente de Integração / CRM** | Mapeamento CSV → `mentorados`/`contratos`; import inicial **+ procedimento de backfill de aviso + cap de disparo**; (Fase 2) upsert por `crm_id` | Carga inicial concluída; script/documento de importação com backfill e N vigente; plano de sync B |
| **Agente de Front / Portal** | Router, `AuthProvider`, `lib/supabase.js`, telas; **formulário "Novo contrato / Renovar"**, **mini-form "Registrar contato"/"Registrei um contato"**, pipeline por `status_renovacao`; `@dnd-kit`; Recharts | Módulo `/cs/*` funcional; MVP (Lista+Dashboard+Ficha **com formulário de renovação e log de contato**) na Fase 0 |
| **Agente de UX** | Wireframes, Fila de Ação (respostas de renovação no topo), barra de contrato, health explicável, badge de estágio subjacente, versões mobile, acessibilidade | Specs + componentes (`KpiCard`, `ContractBar`, `StatusBadge`, `KanbanCard`, `HealthScore`, `WhatsAppButton`, `NovoContratoForm`, `RegistrarContato`) |
| **Agente de Conteúdo / Templates** | Copy T1–T8 (incl. **T2b D-15**) no tom Reino; **T1 transacional para mirar Utility**; categorização; submissão à Meta; **dono do risco de reclassificação** | Templates aprovados; categoria acompanhada; textos de alerta interno |
| **Agente de QA** | Testar idempotência (não avisa 2x, incl. race/crash **e reconciliação**), backfill, cap, janela 29–31d, **filtro de parada D-15/D-7**, **RLS/isolamento com 2º `cs` seed (não vaziamente)**, kickoff-gate, loop de renovação ponta a ponta, **HMAC de webhook**, parsing NPS/opt-out, **datas de fim-de-mês**, mobile | Roteiro de testes + relatório de aceite por fase (inclui "2 CS: uma não vê o mentorado da outra, nem pela view") |
| **Agente de LGPD / Conformidade** | Bases legais por mensagem, **opt-in de comunicação e de marketing separados**, minimização, retenção/anonimização, trilha de auditoria, **política de backup/RPO/RTO** | Documento de conformidade; checklist de consentimento; rotina de anonimização validada; RPO/RTO assinados |
| **Agente de DevOps / Deploy** | Env vars Vercel/n8n (**segredo de webhook**), migrações versionadas, hosting do n8n, **infra WhatsApp (Business Verification/WABA/número) + rampa de tier**, **provisionar Supabase Pro no go-live (ou pg_dump agendado no piloto)**, observabilidade (logs, Error Trigger, painel de saúde, alerta de WA-01 sem execução OK) | Pipeline de deploy + monitoramento ativo; WABA/número provisionados; backups verificados |

---

## 14. Próximos passos imediatos (próxima semana)

0. **[Passo 0 — caminho crítico mais longo] Iniciar a infra do WhatsApp:** abrir **Meta Business Verification**, criar o **WABA** e **provisionar o número** (ou WABA do Z-API) — em paralelo a tudo abaixo, pois costuma levar dias a semanas e é dependência dura da Dor 1. Registrar que o **tier de mensageria inicial é baixo** e definir o **`N` inicial do cap (~40/dia)** e a rampa de aquecimento. *(Agente de DevOps + Automação)*
1. **Criar o projeto Supabase em plano Pro** (backups diários + PITR — a carteira real com PII entra já agora) e aplicar a primeira migração com enums (incl. `status_renovacao`), `usuarios`, `mentorados`, `contratos` (**`data_fim` gerada com cast `::date`**), `mensagens_enviadas` (`contrato_ref`/`ref_idempotencia`), `consentimentos` + view **`with (security_invoker=on)` em fuso SP** + índice único `uq_msg_idem` (por `contrato_id`). Rodar Advisors. *(Se optar por piloto em Free, configurar antes o `pg_dump` diário via n8n e assinar RPO/RTO.)* *(Agente de Dados + DevOps)*
2. **Provisionar os 2 usuários** (Mateus=admin, Camila=cs) com **trigger `handle_new_user`** + set de `app_metadata.papel` no convite; ligar RLS + `(select auth_papel())` + políticas com `EXISTS`. **Criar um 3º usuário `cs` de teste (seed) + um mentorado atribuído a ele e testar que cada CS só enxerga a própria carteira — inclusive pela view** (isolamento real, não vazio). *(Agente de Backend/RLS + QA)*
3. **Exportar o CSV do CRM** e mapear colunas → `mentorados`/`contratos`; fazer a carga inicial, **rodar a varredura de backfill de aviso respeitando o cap** e confirmar que `data_fim` (incl. contratos de fim de mês), `% decorrido` e `dias_para_fim` calculam certo. *(Agente de Integração)*
4. **Submeter os templates T1 (`aviso_fim_contrato_30d`, tom transacional) e T4 (`boas_vindas_onboarding`)** à Meta e **acompanhar a categoria** (Utility vs. Marketing); decidir provedor (Z-API piloto / Cloud API produção). *(Agente de Conteúdo + Automação)*
5. **Montar o workflow WA-01 (D-30)** no n8n no padrão **reserve-before-send** (gera `ref_idempotencia`, reserva `agendada` **com `onError=continueErrorOutput` no INSERT** antes de enviar), com opt-in, **cap `LIMIT N`**, **node Postgres/RPC** e fuso SP; montar **WA-09 (reconciliação que consulta o provedor pela `ref_idempotencia` antes de reenviar)** e o **WA-05 mínimo** (webhook de resposta **com validação HMAC no 1º node Code** → parsing NPS/opt-out/remetente desconhecido → avança `na_janela→contatado` + alerta). Testar com um contrato de teste vencendo em 30 dias, incluindo um cenário de crash simulado (não pode duplicar). *(Agente de Automação + QA)*
6. **Iniciar o front:** adicionar `react-router-dom` + `@supabase/supabase-js`, criar `lib/supabase.js`, `AuthProvider`, rota `/cs/login`, a **Lista** lendo `vw_mentorados_visao`, e o **formulário "Novo contrato / Renovar"** + botão **"Registrei um contato"** na Ficha. *(Agente de Front)*
7. **Registrar o opt-in** dos mentorados atuais em `consentimentos` — **comunicação E marketing (separados)** — com base legal + origem, antes de qualquer disparo real; e **assinar a política de backup/RPO/RTO**. *(Agente de LGPD)*

> Ao fim da semana o objetivo é ter o banco de pé **em Pro (com backup)** e com **RLS testada com 2 CS (isolamento real, inclusive na view)**, a carteira importada com backfill de aviso dentro do cap, a Lista lendo dados reais, o **formulário de renovação** e o **log de contato** funcionando, e o WA-01 (reserve-before-send, sem duplicar mesmo sob crash) pronto para disparar assim que os templates forem aprovados e a infra WhatsApp liberada — ou seja, a Dor 1 a poucos dias de ser resolvida, com o loop de renovação fechando de ponta a ponta e sem risco de perda de dados nem de duplo aviso.

---

## Apêndice · Backlog de melhorias (apontamentos dos supervisores)

> Estes são os refinamentos que o time supervisor levantou e que ainda **não** foram incorporados ao corpo do plano (nota parou em 9,1 por decisão de entregar já). Nenhum é bloqueador; são melhorias de robustez. Tratar como backlog priorizado antes/durante a execução.

**1. [🔴 Alta] Erro de custo/viabilidade: o plano precifica repetidamente 'Supabase Pro (backups diarios + PITR)' em US$25/mes. O plano Pro (US$25) inclui backups diarios com retencao de 7 dias, mas PITR e um ADD-ON pago a parte (a partir de ~US$100/mes). Precificar PITR em US$25 e factualmente incorreto e compromete a tabela de custos e a promessa de conformidade.**

› _Como resolver:_ Escolher um dos dois caminhos e reescrever secoes 7.5, 11 e 12: (a) manter apenas os backups diarios do Pro (US$25) e declarar RPO ate 24h — que JA atende a meta RPO≈24h do proprio plano — removendo toda mencao a PITR no MVP; ou (b) manter PITR e orcar o add-on explicitamente (~US$100+/mes), refazendo o 'Total realista'. Remover todas as ocorrencias de 'Pro (backups diarios + PITR) US$25'.

**2. [🔴 Alta] WA-09 promete uma capacidade que a WhatsApp Cloud API (Meta) nao oferece: nao existe endpoint para CONSULTAR o status de entrega de uma mensagem sob demanda por biz_opaque_callback_data (nem por message id). O status so chega via webhook. A frase 'consulta o status real no provedor pela ref_idempotencia' sustenta a garantia anti-duplo-envio sobre um recurso inexistente na Cloud API.**

› _Como resolver:_ Reescrever WA-09 para depender do webhook de status (WA-08) que ECOA biz_opaque_callback_data: reconciliar a linha 'agendada' presa casando por ref_idempotencia (setar provider_msg_id/status), com janela de graca; so reenviar se NENHUM webhook sent/delivered daquela ref chegou dentro da janela. Deixar a correlacao por ref_idempotencia como chave primaria de reconciliacao (independente de provider_msg_id) e registrar que Z-API pode ter GET de status por message-id, mas a Cloud API nao.

**3. [🔴 Alta] Falha de envio ambigua reabre a porta ao duplo aviso na automacao-ancora. No WA-01 o passo [9] faz 'IF envio 200 OK? nao -> status=falha'. Um timeout, 5xx ou ausencia de resposta e AMBIGUO: a Meta pode ter aceito a mensagem mesmo sem devolver 200. Como 'falha' NAO esta na lista de status ativos do indice/NOT EXISTS ('agendada','enviada','entregue','lida','respondida'), no cron seguinte o contrato reaparece elegivel e recebe um SEGUNDO WhatsApp real. Isso contradiz o proprio objetivo 'a prova de falha' justamente na Dor 1.**

› _Como resolver:_ Separar falha DEFINITIVA (4xx de rejeicao do provedor -> pode marcar 'falha' e permitir reenvio) de falha AMBIGUA (timeout/5xx/sem resposta -> NAO marcar 'falha'). Manter a linha como 'agendada' ou criar um status 'em_verificacao' que TAMBEM entre no indice uq_msg_idem e no NOT EXISTS, para que WA-09 reconcilie e nunca reenvie as cegas. Documentar essa ramificacao no diagrama do passo [9].

**4. [🟡 Média] Ponto cego de multiplos contratos ativos por mentorado. O 'estagio', 'health_score' e 'nivel_risco' vivem no MENTORADO (nao no contrato), e a view vw_mentorados_visao faz 'order by data_fim desc limit 1' - se um mentorado tiver dois contratos ativos (ex.: upsell para uma segunda mentoria/tier), a Lista, o Kanban e a Ficha mostram apenas o contrato que termina MAIS TARDE, escondendo justamente o que esta na janela de renovacao. Pior: a WA-01 faz JOIN direto em contratos e dispara o aviso para AMBOS, entao o mentorado recebe o WhatsApp mas a Camila nao ve esse contrato no card - inconsistencia que confunde e derruba a confianca na tela.**

› _Como resolver:_ Decidir e documentar explicitamente a regra: (a) se 1 contrato ativo por mentorado for premissa do negocio, adicionar um guard (constraint/checagem) que impeca 2 contratos 'ativo' simultaneos e trate upsell como novo contrato substituindo o anterior; OU (b) suportar N contratos ativos - a view emite uma linha por contrato ativo, o card do Kanban representa o contrato (nao so o mentorado) para o dias_para_fim/barra, e a Ficha lista todos os contratos ativos. No minimo, alinhar UI e automacao para nunca divergirem (o que dispara aviso tem que aparecer na tela).

**5. [🟡 Média] Falta um controle de 'pausar automacoes para ESTE mentorado' sob comando da CS. Hoje o catalogo 'automacoes' e liga/desliga GLOBAL, e a unica forma de silenciar as reguas de um mentorado especifico (ex.: cliente em situacao delicada, reclamacao, luto, negociacao sensivel que a Camila conduz pessoalmente) e revogar o opt-in inteiro - o que zera a base legal LGPD e nao e o que ela quer. O filtro de parada do 8.1 so cobre os reforcos D-15/D-7 apos interacao; nao impede o D-30 nem NPS/check-in de saírem para alguem que ela decidiu tratar na mao.**

› _Como resolver:_ Adicionar coluna mentorados.comunicacao_pausada (bool) + data/motivo, com toggle 'Pausar automacoes' na Ficha (respeitado por TODAS as queries WA-01..WA-06 via 'AND m.comunicacao_pausada = false'). E diferente de revogar consentimento: preserva a base legal, apenas suspende disparos automaticos enquanto a CS conduz manualmente. Registrar em eventos_automacao quando um item foi pulado por pausa.

**6. [🟡 Média] A 'Fila de Acao de Hoje' - o instrumento central da rotina da Camila - nao tem mecanica de baixa/dispensa/adiamento definida. Nao esta escrito quando cada tipo de item SAI da fila: uma 'resposta de renovacao a tratar' e considerada tratada quando? Ao registrar contato? Ao avancar status_renovacao? Um 'onboarding travado' some so quando o kickoff for concluido? Sem isso a fila ou vira ruido permanente (itens que nao saem) ou some de forma ambigua, e a CS perde a confianca no worklist.**

› _Como resolver:_ Definir, por tipo de item da fila, o evento de baixa e permitir 'adiar para amanha' (snooze) e 'concluir/dispensar' com registro: ex. resposta de renovacao -> baixa ao avancar status_renovacao ou registrar interacao; renovacao a vencer -> baixa ao criar novo contrato ou marcar nao_renovou; onboarding travado -> baixa ao concluir tarefa kickoff; falha de WhatsApp -> baixa ao reenviar/marcar contato manual. Documentar como regra na secao 9 (Dashboard) para o Agente de Front implementar sem ambiguidade.

**7. [🟡 Média] Nao ha empurrao proativo (digest) para a Camila - toda a operacao depende dela LEMBRAR de abrir o portal. Uma CS solo vive no WhatsApp Business, nao numa aba de dashboard; o badge de sino so aparece se ela ja estiver dentro. A WA-01 abre a conversa de renovacao e cria a tarefa 'abrir conversa de renovacao', mas se a Camila nao entrar no portal naquele dia, a janela quente esfria. A confiabilidade da Dor 1 do lado HUMANO fica sem rede de seguranca.**

› _Como resolver:_ Adicionar um workflow n8n de digest diario (ja ha n8n; custo zero): todo dia de manha, e-mail/Slack para a Camila com a Fila de Acao do dia (respostas de renovacao a tratar, contratos entrando na janela, tarefas vencidas, onboardings travados, falhas de envio) com deep-links para as fichas. Idealmente so envia se houver itens. Isso transforma o portal de 'ela precisa lembrar' em 'ela e avisada'.

**8. [🟡 Média] Renovacoes em negociacao podem esfriar em silencio. O status_renovacao percorre contatado -> em_negociacao -> renovado|nao_renovou, mas nao ha data de PROXIMA ACAO / follow-up ancorada ao contrato em negociacao. Um card parado em 'em_negociacao' nao gera nenhum lembrete; some da urgencia ate o contrato vencer. Para gestao de pipeline de renovacao (que e o coracao comercial do CS aqui), falta o 'quando falar de novo'.**

› _Como resolver:_ Ao avancar para 'contatado'/'em_negociacao', exigir/oferecer uma data de proximo follow-up (campo proxima_acao_em no contrato OU tarefa 'tipo=renovacao' com vence_em obrigatorio). Cards de renovacao com follow-up vencido sobem para a Fila de Acao e para o digest diario. Assim nenhuma negociacao aberta fica sem data de retorno.

**9. [🟡 Média] Mecanismo de provisionamento de papel impreciso: a UI 'Invite user' do painel Supabase NAO permite setar app_metadata — so a Admin/Management API (createUser/generateLink/update) faz isso. Como esta escrito ('setar app_metadata.papel no convite pelo painel'), handle_new_user cairia no default 'cs' e o admin (Mateus) ficaria sem privilegios ate correcao manual.**

› _Como resolver:_ Especificar o passo real: (a) provisionar via Admin API definindo app_metadata.papel, ou (b) para 2 usuarios, convidar pelo painel e rodar UPDATE usuarios SET papel='admin' WHERE email='mateus@...' apos o trigger criar a linha. Documentar esse passo em 7.2 e no item 2 dos proximos passos.

**10. [🟡 Média] Validacao HMAC dos webhooks (WA-05/WA-08) depende do corpo BRUTO exato. O node Webhook do n8n, por padrao, entrega JSON ja parseado; recomputar o X-Hub-Signature-256 sobre JSON re-serializado nao bate com a assinatura da Meta. O plano manda recomputar 'sobre o corpo bruto' mas nao instrui a habilitar o raw body no node.**

› _Como resolver:_ Adicionar em 7.3/8.4 o passo de configurar o node Webhook para expor o Raw/Binary Body (opcao 'Raw Body') e computar o HMAC sobre esse buffer bruto, nao sobre o objeto JSON re-serializado. Sem isso a checagem timing-safe rejeita webhooks legitimos ou passa a validar o conteudo errado.

**11. [🟡 Média] WA-09 e a secao 8.4/riscos afirmam que a reconciliacao 'consulta o status real no provedor pela ref_idempotencia/biz_opaque_callback_data'. Na Meta Cloud API isso nao existe: nao ha endpoint para consultar o status de uma mensagem ja enviada (nem por message id, nem por callback data) — o status so chega de forma assincrona via webhook. A afirmacao torna a estrategia de reconciliacao tecnicamente incorreta para o provedor recomendado em producao.**

› _Como resolver:_ Corrigir o texto: na Cloud API, WA-09 deve depender exclusivamente da 'janela de graca' aguardando o webhook de status (WA-08) que ecoa o biz_opaque_callback_data para correlacionar; so reenviar apos expirar a janela E confirmar via WA-08 que nenhum status chegou. Deixar claro que a consulta ativa de status por id so e viavel no Z-API, nao na Cloud API. Ajustar tambem a coluna WA-09 da secao 8.2 e a linha de risco correspondente.

**12. [🟡 Média] Estimativa otimista de execucao. O MVP (schema+RLS+trigger+view+import+backfill+WA-01+WA-05+WA-09+front com router/auth/Lista/Dashboard/Ficha/formulario de renovacao) e estimado em ~2-3 semanas com '1 dev + apoio', e o item 14 promete 'Dor 1 a poucos dias de ser resolvida'. Ao mesmo tempo o plano reconhece que Business Verification/WABA/numero e aprovacao de template Meta podem levar dias a semanas e sao dependencia dura. Ha tensao entre a promessa e o caminho critico real.**

› _Como resolver:_ Explicitar que o software pode ficar pronto em ~2-3 semanas, mas o GO-LIVE da Dor 1 fica bloqueado pelo caminho critico externo (verificacao Meta + aprovacao HSM), que nao esta sob controle do time. Reformular a frase de fechamento para 'Dor 1 pronta para disparar assim que a infra WhatsApp e os templates forem liberados pela Meta' e apresentar o cronograma como duas trilhas paralelas com marco de go-live condicionado a aprovacao externa.

**13. [⚪ Baixa] O template T1 diz 'aqui e a Camila, da Reino', mas sai de um numero WABA novo que o mentorado nao tem salvo como Camila - risco de desconfianca ('quem e esse numero?'), menor taxa de leitura/resposta e risco de report de spam logo na mensagem mais critica (a de renovacao).**

› _Como resolver:_ Configurar o perfil do WhatsApp Business (nome de exibicao 'Reino Treinamentos', foto, descricao) para dar identidade ao numero; considerar uma primeira mensagem de onboarding que apresente o numero oficial ('salve este contato, e por aqui que a Camila acompanha voce') para que o mentorado ja reconheca o remetente quando o aviso D-30 chegar. Registrar isso no procedimento de onboarding/opt-in.

**14. [⚪ Baixa] Conexao n8n -> Postgres do Supabase nao especificada. Conexoes diretas na porta 5432 podem ser limitadas/indisponiveis a partir do n8n Cloud (IPv4/pool), o que quebra os crons e o node Postgres em producao.**

› _Como resolver:_ Especificar uso do connection pooler do Supabase (transaction mode, porta 6543) ou session pooler para o node Postgres a partir do n8n, com SSL obrigatorio; ou padronizar em RPC via PostgREST. Documentar a string/porta no Agente de DevOps.

**15. [⚪ Baixa] Janela entre reserva e envio nao revalida opt-in/opt-out. A checagem de consentimento ocorre no passo [5] (antes do INSERT reserva) e o opt-out por 'SAIR' revoga consentimento a qualquer momento via WA-05. Se um opt-out chegar entre a reserva 'agendada' e o HTTP send (ou em reservas que ficaram presas e sao retomadas por WA-09 no dia seguinte), a mensagem proativa pode ser enviada apos a revogacao — violacao de opt-in.**

› _Como resolver:_ Adicionar uma revalidacao de consentimento imediatamente ANTES do HTTP send (passo [8]) e tambem no reenvio do WA-09: reconsultar consentimentos.status='concedido' para a finalidade; se revogado, marcar a reserva como 'cancelada' e nao enviar. Custo trivial e fecha a janela de conformidade.

