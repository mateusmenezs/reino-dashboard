<!--
Documento gerado por um processo multi-agente:
- 4 agentes especialistas planejaram em paralelo (trilha por nível, cadência/playbooks, dados/sinais, portal/automação)
- 1 agente sintetizador integrou tudo
- Time de 3 supervisores (Sucesso-CS, Técnico-Dados, Execução-Escala) pontuou de 0 a 10 por lente, com dimensão dedicada à diferenciação pelos 4 níveis de entrada
- Loop de revisão (6 avaliações) até estabilizar
Nota final (menor das três lentes): 9,3/10 — entregue por decisão do cliente, com refinamentos no Backlog ao final.
Progressão do mínimo por rodada: 9.1 → 9 → 9.1 → 9.3 → 9.1 → 9.3
-->

# Módulo de Sucesso do Mentorado — Trilha por Nível (N1–N4)
### Extensão do Portal de Controle de Mentorados (/cs/*)

> Documento final e único. Integra os quatro blocos de especialistas (trilha por nível, cadência/playbooks, dados/diagnóstico/sinais, portal/automação) em um só plano executável por um time pequeno. **Estende** o portal de CS já aprovado; não duplica tabela, tela ou automação existente.
>
> **Versão revisada 5 (revisor)** — mantém tudo o que já estava bom (risco_churn por flag sem recalcular health, fórmula determinística da fila, Progress Score degradado no MVP, máquina de `iniciado_em`, marcos paralelos, estado `sem_nivel`, `planos_sucesso` seguro para ciclos, diagnóstico Q1–Q4, governança de vazão + teto, SLA + escalonamento, piso de faixa, venda válida vs. complacência, pulso de satisfação, re-fundação generalizada, watchdog do detector, venda parcelada com contratado vs. recebido) **e incorpora as correções obrigatórias desta rodada**:
> - **(§5.1 — alta) Detector corrigido no núcleo.** O sinal de tempo deixa de depender de `min`: a condição de progresso usa `r_ref` = **r da frente-espinha** (ou `max` sobre o conjunto ativo, **nunca `min`**), e o vermelho é **disjuntivo** — `dias_sem_progresso ≥ teto` dispara sozinho. Abrir/graduar frente nova **não** derruba o sinal nem mascara uma espinha travada.
> - **(§5.1/§3.4 — alta) `avancou=true` deixa de zerar o relógio sem prova.** Passa a exigir **evidência mínima** (nota obrigatória + evidência opcional) e entra na **auditoria amostral**; a taxa de `avancou=true` por CS é KPI de qualidade na sombra.
> - **(§5.1/§16 — alta) Comportamento sem evento de progresso no MVP definido.** Presença ativa e recorrente no **grupo do próprio nível** rebaixa vermelho→amarelo; enquanto a **cobertura de log** estiver abaixo do alvo, o detector opera em **modo conservador (só amarelo)**; alerta leve para "ativo sem QUALQUER progresso há N dias" separa "travado" de "não logado".
> - **(§7.7/§13 — alta) Receita em R$ escalável.** Modelo **enxuto**: captura só no **fechamento do marco monetário** + **1 snapshot mensal por mentorado** (não por parcela); piso de venda forte por `pct_min_recebido`. **Integração de pagamento** vira **fase datada** do roadmap (webhook do gateway → `receita_mentorado`/`venda_revertida`), não "ou integração".
> - **(§3.1/§5.1/§8.6 — media) Bloqueio EXTERNO de tráfego/verba** (`sem_verba`/`conta_ads`/`checkout_reprovado`/`plataforma_em_analise`) pausa a régua e credita tempo como o bloqueio interno, com **sinal próprio** e **playbook de destravamento dedicado**.
> - **(§2/§3.x/§3.5 — media) N4 "novo funil" com sub-trilha de CONSTRUÇÃO** (`mapear_funil_novo → montar_pagina_novo → primeira_venda_novo`), não a trilha de otimização.
> - **(§3.3/§3.4/§12 — media) Integridade de venda reforçada:** `fora_circulo` exige **evidência do comprador**; **graduações monetárias entram na amostra** de auditoria do Mateus.
> - **(§9.4/§10/§16 — media) Carga de julgamento da Camila governada:** **orçamento de tempo-por-mentorado** em regime + **mínimo de campos obrigatórios** (defaults, captura assíncrona por token, popovers opcionais); aceite da sombra confere o **steady-state**, não só os picos.
> - **(§3.7/§6 — media) `DEFERRABLE` removido** (índice único parcial não pode ser deferido); ordem **UPDATE→INSERT** fixada como única implementação + teste do trigger no estado intermediário.
> - **(§2.1/§2.2 — media) Latência de estabilidade** entra na viabilidade da meta (`dias_esperados_estabilidade` por marco monetário).
> - **(§9.6/§9.7/§12 — media) Backstop em modo degradado** enquanto CS-solo + gatilho de 2ª CS por **volume de SLA estourado** + KPI de estouros cujo único escalado é o fundador.
> - **(§13 — media) Sizing por agente/entregável** + 1a com **2 devs** OU escopo cortado ao mínimo verificável.
> - **(§3.3/§7.7/§11 — baixa) Celebração da venda desacoplada da graduação:** E3 dispara no fechamento provisório; a graduação de nível segue gated pela estabilidade.
> - **(§3.1/§8.1 — baixa) `fator_ritmo` revisado periodicamente** (transição de fase + lentos crônicos).
> - **(§7.2/§7.5 — baixa) Baseline de `QUEDA_PROGRESSO`** com janela `[hoje-9d, hoje-5d]` + snapshot diário leve.
> - **(§13/§16 — baixa) Adoção faseada da Camila** + teste de adoção no aceite do 1a.

---

## 1. Visão geral e objetivo

O portal de CS já aprovado resolve o **fim do contrato**: jornada em estágios (`onboarding → ativo → check_in → renovacao → renovado/offboarding/churn`), Kanban, health score de 3 faixas, tarefas, timeline e a automação âncora de aviso 30 dias antes do fim (renovação).

Este módulo resolve o **meio do contrato**: garantir que o mentorado **avance, tenha resultado de negócio mensurável (em R$ efetivamente recebido), se sinta acompanhado e não fique esquecido** durante a mentoria. Ele responde a três perguntas que o portal atual não responde: *"esse mentorado está AVANÇANDO ou está PARADO agora? Ele já teve resultado real — e de quanto (recebido, não só contratado)? E ele está SATISFEITO com o acompanhamento?"*.

**Objetivo em uma frase:** cada mentorado tem, a qualquer momento, **um nível atual (N1–N4)**, **uma meta de resultado do contrato estruturada** (§2.1), **um conjunto de marcos ativos dentro desse nível** e **um resultado financeiro recebido acumulado**; o trabalho da CS (Camila) é fazê-lo fechar o marco de saída → avançar → graduar de nível → **ter resultado de negócio recebido antes do fim do contrato**, mantendo-o **satisfeito** e **sem esfriar quando já venceu**; e o sistema vigia o tempo parado (com régua por nível ajustada ao ritmo real do mentorado, distinguindo quem está **travado** de quem está **impedido por bloqueio externo** e de quem simplesmente **não foi logado**), a percepção de valor (pulso de satisfação), a atualização da receita e a própria saúde do job de detecção, para acionar a CS **antes** de o mentorado sumir — com **garantia de processo** (SLA + escalonamento + watchdog independente + backstop de ausência) para que "ninguém esquecido" não dependa da disciplina diária de uma única pessoa, nem da sorte de um cron rodar, nem da agenda do fundador.

Princípios inegociáveis (permeiam todo o plano):
1. **O nível de entrada é o eixo de tudo.** O que é "ter resultado", os marcos, a cadência, a meta de contrato e o que conta como "travado" mudam por nível.
2. **Resultado é magnitude RECEBIDA, não binário nem contratado.** Para high-ticket parcelado, a narrativa de sucesso e de renovação é "você investiu X e faturou Y" — e Y precisa ser **dinheiro que compensou**, não uma venda parcelada que pode dar default na 2ª parcela. O módulo separa **contratado** de **recebido** e corre os KPIs pelo recebido, com **captura enxuta e escalável** (§7.7).
3. **Progresso não basta: valor percebido importa — e insatisfeito não é sumido.** O **pulso de satisfação** (§7.6) vê o que Progress e Health não veem, e a **Conversa de Valor** (§8.5) trata isso com diagnóstico, não com template de reconexão.
4. **Quem já venceu não pode esfriar.** O fluxo **meta batida** (§2.2) dá próximo marco e toque ao vencedor precoce.
5. **A automação puxa a fila; a Camila decide e toca; o sistema garante que nada fique parado sem dono — nem o detector, nem a auditoria do fundador, nem os vermelhos quando a CS está ausente.**
6. **Nada sobe de nível nem fecha marco crítico sem validação humana de 1 clique — e marcos de saída (não-monetários E uma amostra dos monetários) passam por auditoria amostral do Mateus, que nunca trava a graduação indefinidamente.**
7. **Roda por baixo do estágio `ativo`.** Não cria estágios novos na jornada.
8. **A fila é finita, governada e tem UMA porta de entrada diária.** Teto visível + gatilho de sobrecarga + critérios antecipados de corte (§9.7); a Fila de Hoje é o default da Camila (§10.c); a **carga de julgamento por mentorado** é orçada e minimizada (§9.4).
9. **Ninguém escapa da vigilância — inclusive quem não tem nível, o N4, o mentorado que avança mas reclama, o que já bateu a meta e o que está impedido por bloqueio externo.** Peso baixo de carteira significa **menos toque, nunca ausência de vigilância**.

O módulo introduz dois eixos de saúde novos, **ortogonais** ao health score de renovação: o **Progress Score** (avança agora?) e o **pulso de satisfação** (percebe valor?). É possível estar Health verde, Progress verde e **insatisfeito** — e é exatamente esse cruzamento que evita o mentorado esquecido *e* o silenciosamente perdido.

---

## 2. Os 4 níveis de entrada — "resultado", estado inicial, estado-alvo e meta de contrato

"Ter resultado" NÃO é a mesma coisa para todos. É **sair do estado inicial e chegar ao estado-alvo do próprio nível** — e, dos níveis com marco monetário em diante, **com valor em R$ recebido atribuído**. O resultado de um nível é sempre **a porta de entrada do nível seguinte**.

| Nível | Estado INICIAL (como chega) | Resultado = Estado-ALVO | Evidência objetiva |
|---|---|---|---|
| **N1 — Sem posicionamento** | Não sabe para quem fala, o que vende, nem por quê. | **Posicionamento definido**: nicho + público específico + promessa/oferta-base em uma frase. | **Documento de posicionamento anexado** (`evidencia_url`) + validação da CS + auditoria amostral do Mateus (§3.4). |
| **N2 — Tem posicionamento, sem produto** | Sabe para quem e a promessa, mas não tem produto estruturado nem preço. | **Produto criado e validado com venda paga válida**: oferta entregável, com preço, e **≥1 venda paga válida** (§3.3) com **`valor_recebido` alcançando o piso de venda forte**. | Estrutura do produto + preço + **comprovante de venda paga válida + evidência do comprador (§3.3)** + valor contratado e valor recebido. Carta de intenção/beta/venda de complacência/parcela única de venda parcelada = validação **fraca** (§3.3). |
| **N3 — Tem produto, sem funil vendendo** | Tem o que vender, mas nada no ar gerando venda previsível. | **Funil vendendo com 1ª tração**: funil ponta-a-ponta recebendo tráfego e gerando a 1ª venda pelo funil, com **valor recebido atribuído ao funil**. | Funil publicado (link ativo), tráfego chegando, ≥1 venda atribuída ao funil + valor recebido. |
| **N4 — Funil vendendo, quer escalar/novo** | Já vende pelo funil, quer **otimizar métricas** ou **abrir novo funil**. | **Performance melhorada OU novo funil validado**: métrica-chave melhora sustentada, **ou** 2º funil no ar com 1ª venda — com **receita recebida no período documentada**. | Antes/depois de métrica (via `metricas_funil` §6) **ou** novo funil com 1ª venda + **receita recebida do período** (`receita_mentorado`). |

**Regra de ouro:** quem tem o resultado de N1 é candidato a N2, e assim por diante. **N4 é cíclico** — reinicia com nova meta via **re-diagnóstico** (§3.5), escolhendo entre **trilha de otimização** e **sub-trilha de construção de novo funil** (§3.x).

> Fronteira N3↔N4 fixada: **"funil que já gera venda"**, não "funil que só recebe tráfego". Definição idêntica no diagnóstico (§4) e na graduação (§3).

### 2.1 Meta de resultado do contrato — estruturada, com folga E latência de estabilidade (correção 10)

A soma dos `dias_esperados` de uma trilha é **execução ideal**; na vida real, com folga, é maior — **e, nos marcos monetários de high-ticket parcelado, ainda maior**, porque a venda só vira **forte** depois de atingir o **piso de recebido** e passar a **janela de estabilidade** (30–90 dias). Ignorar isso produz selo sistematicamente otimista e pode tornar a meta de N1/6m inatingível. A meta é um **alvo referenciável**:

- `mentorados.meta_nivel_alvo` (enum `nivel_mentorado`) + `mentorados.meta_marco_alvo` (`chave` de `catalogo_marcos`) — derivados de `nivel_entrada × duracao_contrato`.
- `mentorados.meta_receita_alvo` (numeric, opcional, **em R$ recebido**) — meta de faturamento quando fizer sentido (N3/N4).
- `mentorados.meta_label` (text) — **só rótulo de exibição**.

**Cálculo de viabilidade (novo — inclui estabilidade):** o sistema calcula
```
horizonte_meta =
  Σ (dias_esperados_i × fator_ritmo)            -- execução, ajustada ao ritmo
  + Σ dias_esperados_estabilidade_m             -- por marco monetário m até a meta
  ) × folga (1,3)
```
onde `dias_esperados_estabilidade_m = janela_estabilidade_venda_dias(nivel) + tempo_esperado_ate_piso_recebido(nivel)` (config em `parametros_nivel`). O selo *"no ritmo / atrasado"* compara `horizonte_meta` a `dias_ate_fim` **sem conferência manual**. Assim o selo para de ser otimista e a régua abaixo é recalibrada com esse total.

**Régua defensável (N1/6m não pode ser inatingível — recalibrada com estabilidade):**

| Nível de entrada | Contrato 6 meses | Contrato 12 meses |
|---|---|---|
| **N1** | **Produto criado com 1ª venda paga válida em CURSO** (N2 concluído / N3 iniciado) — a **estabilidade da venda pode fechar após o fim do contrato** sem invalidar a meta; **não** se exige N3 | **Funil vendendo com 1ª venda** (graduar até N4 iniciado) |
| **N2** | **Funil vendendo com 1ª venda pelo funil** (graduar até N4 iniciado) | Funil vendendo + **1º ciclo de otimização N4** |
| **N3** | **Funil vendendo + escala/otimização iniciada** (N4) | Métrica melhorada sustentada **ou** 2º funil validado |
| **N4** | **1 ciclo N4 concluído** (ganho sustentado ou novo funil) | **≥2 ciclos N4** concluídos |

> **Tratamento de "já vende, mas ainda não atingiu o piso" (concluído provisório / `tipo_validacao=fraca`):** durante a espera da estabilidade o mentorado **não** é tratado como travado — o marco fica `concluido` provisório com tarefa leve "aguardando piso/estabilidade da venda parcelada", e o **KPI de progressão o conta como "resultado em curso"** (numerador provisório separado — §12), não como falha. A **celebração da venda dispara já no fechamento provisório** (§3.3/§7.7); só a **graduação formal de nível** aguarda o piso+estabilidade.

Uso da meta de contrato:
- **Calibra `dias_esperados` COM FOLGA, por ritmo real E por estabilidade**: no §16.2 a Camila confere `horizonte_meta` vs. `dias_ate_fim`; se não couber, ajusta prazos ou rebaixa a meta explicitamente **antes** de comunicá-la na 1ª call.
- **Conversa de expectativa no onboarding** e **liga progresso → renovação** de forma honesta.
- **Exibida** na ficha (§10.a) com o selo derivado + o **resultado financeiro recebido até agora** (§7.7).

### 2.2 Estado "meta batida com contrato em aberto" — o vencedor precoce não esfria (correção C)

O melhor caso — mentorado que entra N1 e chega a N4 no mês 3 de um contrato de 12m, ou N4 que fecha 1 ciclo e já bateu `meta_receita_alvo` — **é justamente o mais arriscado de perder**. O módulo trata isso como um estado explícito:

- **Gatilho automático:** quando o mentorado **atinge `meta_marco_alvo` OU `meta_receita_alvo` (por recebido) antes de `dias_ate_fim`**, o detector grava `mentorados.meta_atingida_em` e emite `META_ATINGIDA_CEDO` (severidade `media`, entra na Fila).
- **Ação da CS (1 clique, guiada):** dispara um **mini re-diagnóstico de stretch-goal** (reutiliza §3.5): setar **um novo ciclo N4 ou uma `meta_receita_alvo` maior** + registrar `objetivo_do_ciclo` do stretch, escolhendo `otimizar` ou `novo_funil` (§3.x).
- **Cadência de manutenção de valor:** entra em cadência mensal de **manutenção-de-valor** (piso N4, §5.5) — nunca cai para "sem toque".
- **Gancho de renovação antecipada:** `meta_atingida` liga à **conversa de renovação antecipada** (a régua de renovação lê `meta_atingida_em` + `receita_recebida_total`).

> **Vencedor precoce com venda ainda em estabilização:** o reconhecimento (celebração, §11 E3) já ocorreu no fechamento provisório; `META_ATINGIDA_CEDO` só é marcada quando o marco-alvo/receita-alvo **atinge o critério da meta** (que, para 6m/N1, admite venda em curso conforme §2.1). Não se nega reconhecimento por 90 dias.

`meta_atingida` **não** encerra o Plano de Sucesso; troca o objetivo por um stretch e mantém a vigilância. É reversível se o stretch for redefinido.

---

## 3. Trilha de marcos por nível + critério de graduação

Cada nível tem uma trilha **curta, ordenada e concreta**, com uma **espinha** (termina no `eh_marco_de_saida = true`) e **frentes paralelas** possíveis. Fechar o marco de saída = **graduação**.

Cada marco é uma linha em `marcos` (instância por mentorado), com `status ∈ {pendente, em_andamento, concluido, pulado, bloqueado}`, `nivel`, `ordem`, `iniciado_em`, `concluido_em`, `prazo_alvo`, `evidencia_url`, `ultimo_progresso_em`, `dias_bloqueado`, `motivo_bloqueio`, e — nos marcos monetários — `valor_contratado`, `valor_recebido`, `natureza_venda`, `evidencia_comprador`, `venda_compensada`, `venda_estavel_em`, `venda_revertida_em`. Os marcos-modelo vivem em `catalogo_marcos`.

### 3.0 Marcos paralelos
- **Mais de um marco pode estar `em_andamento`** dentro do mesmo nível; cada marco pode ter 1–3 `objetivos_ciclo` concorrentes.
- A espinha ordenada existe só para uma coisa: **qual marco gradua o nível**. Ela **não** serializa a execução, **mas é a referência do sinal de tempo** (§5.1: `r_ref` usa a espinha).
- **A detecção de "parado" olha a frente-espinha e o progresso REAL de origem-mentorado, não a média/mínimo do conjunto nem qualquer toque** (§5.1).

### 3.1 Máquina de estados de `iniciado_em` + fator de ritmo + crédito de tempo bloqueado (interno E externo) (correções D, 9, e nova correção de bloqueio externo)
1. **Nascimento do plano:** o 1º marco da espinha do `nivel_inicial` passa de `pendente → em_andamento`, `iniciado_em = now()`.
2. **Concluir o marco N da espinha:** o marco **N+1 da espinha** vira `em_andamento`, `iniciado_em = now()`. Frentes paralelas abrem manualmente (também gravando `iniciado_em = now()`).
3. **Graduação:** o 1º marco da nova trilha vira `em_andamento`, `iniciado_em = now()` **no momento da validação da CS**.
4. **`prazo_alvo = iniciado_em + (dias_esperados × mentorados.fator_ritmo)`.** Reabrir (`concluido → em_andamento`) reseta `iniciado_em`.
5. **Fator de ritmo por mentorado (correção D + revisão periódica, correção 6):** `mentorados.fator_ritmo` (numeric, default **1,0**) captura a disponibilidade semanal real do mentorado (assalariado com poucas horas → 1,3–1,6; dedicação integral → 1,0). É **definido pela Camila na 1ª call de arranque** e **revisado periodicamente**, não só via insatisfação:
   - **Gatilho de revisão em toda transição de fase** (retorno ao Arranque por graduação/re-fundação): micro-tarefa leve `revisar_fator_ritmo` na Fila (base 10).
   - **Gatilho para lentos crônicos:** **2 marcos seguidos concluídos fora do prazo ajustado** (ou 2 janelas amarelas seguidas) abrem a mesma micro-tarefa, para recalibrar a régua à banda real **sem depender de o mentorado reclamar**.
   Todo `prazo_alvo` e toda a régua de travado usam o **prazo ajustado por `fator_ritmo`**. `dias_esperados_ajustado_i = dias_esperados_i × fator_ritmo`.
6. **`ultimo_progresso_em`** é atualizado por **eventos de avanço real de origem-mentorado** (§5.1) — não por qualquer toque.
7. **Bloqueio INTERNO e desbloqueio (crédito de tempo):** ao entrar em `bloqueado` com `motivo_bloqueio='interno_cs'` (bola com a CS/terceiro), grava `bloqueado_em = now()`. Enquanto bloqueado, o tempo **não conta**. **No desbloqueio** (`bloqueado → em_andamento`), o sistema **credita o tempo parado**: `dias_bloqueado += (now() − bloqueado_em)` **e desloca `prazo_alvo += (now() − bloqueado_em)`**. O cálculo de `r_i` (§5.1) usa `(dias_no_marco − dias_bloqueado)`.
8. **Bloqueio EXTERNO de tráfego/verba (novo — correção de severidade média):** em N3 e no N4 novo-funil, a 1ª venda pelo funil depende de tráfego pago com dependências **fora do controle do mentorado** — que **não** é execução travada. Um marco pode entrar em `bloqueado` com `motivo_bloqueio ∈ {sem_verba, conta_ads, checkout_reprovado, plataforma_em_analise}`. Esse bloqueio **pausa a régua de travado e credita o tempo exatamente como o interno** (mesma mecânica de `dias_bloqueado`/deslocamento de `prazo_alvo`), mas:
   - Emite **sinal próprio `BLOQUEIO_EXTERNO`** (severidade `media`; `alta` se durar > 14 dias) — **não** `TRAVADO`.
   - Aciona o **playbook de destravamento dedicado (§8.6)**, não o playbook de intervenção N3 (que pressupõe execução parada, e "escala: ads avançado" não resolve verba zero nem conta banida).
   - Registra `bloqueio_externo_detalhe` (jsonb) para a CS acompanhar a dependência (liberar verba mínima, resolver conta, aprovar checkout/domínio).
   Documentado nos webhooks `marco.bloqueado`/`marco.desbloqueado` (com o `motivo_bloqueio`).

> `iniciado_em` mede *quando a frente abriu*; `ultimo_progresso_em` mede *quando o mentorado avançou de fato*; `dias_bloqueado` desconta *o tempo em que a bola estava com a CS/terceiro OU com uma plataforma externa*; `fator_ritmo` calibra *a régua à banda real do mentorado*.

### N1 — Definir posicionamento
| # | Marco (`chave`) | Entregável | "Feito" quando | `dias_esperados` |
|---|---|---|---|---|
| 1 | `mapear_mercado` | 5–10 dores reais do público + onde ele está | CS valida dores específicas e verificáveis | 7 |
| 2 | `definir_nicho` | Público-alvo específico (quem, momento) | Nicho atendível, não "todo mundo" | 10 |
| 3 | `oferta_base` **(saída)** | Promessa em 1 frase + oferta-base ponta a ponta | **Documento de posicionamento anexado** + CS valida → **GRADUA N1→N2** | 14 |

### N2 — Criar e validar o produto
| # | Marco (`chave`) | Entregável | "Feito" quando | `dias_esperados` |
|---|---|---|---|---|
| 1 | `desenhar_produto` | Estrutura/roteiro de entrega + MVP vendável | Dá para vender e entregar sem buraco grave | 10 |
| 2 | `precificar` | Preço definido com lógica (ticket, forma de pagamento) | Preço fechado e testável | 7 |
| 3 | `validar_produto` **(saída, monetário)** | **≥1 venda paga válida** + `valor_contratado`/`valor_recebido` + **evidência do comprador** | Alguém **fora do círculo pessoal (comprovado) pagou, compensou (piso de recebido) e não reembolsou** → **GRADUA N2→N3**. Complacência/intenção/beta/só-1ª-parcela = validação **fraca** (§3.3) | 21 |

### N3 — Subir funil / 1ª tração
| # | Marco (`chave`) | Entregável | "Feito" quando | `dias_esperados` |
|---|---|---|---|---|
| 1 | `mapear_funil` | Desenho do funil + ativo de captura | Existe onde capturar contato/interesse | 7 |
| 2 | `montar_pagina` | Página de oferta + checkout no ar + tráfego inicial | Recebe compra ponta a ponta e há visitantes reais | 14 |
| 3 | `primeira_venda` **(saída, monetário)** | 1ª venda atribuída ao funil + `valor_recebido` | Venda via funil (não boca a boca), no piso de recebido → **GRADUA N3→N4** | 21 |

> **N3 e bloqueio externo:** `montar_pagina`/`primeira_venda` são os marcos onde tráfego pago costuma emperrar por **verba zero, conta de anúncios em revisão/banida, pixel/checkout reprovado ou domínio em análise**. Nesses casos o marco vai para `bloqueado` com `motivo_bloqueio` externo (§3.1.8), **não** dispara `TRAVADO`, e cai no playbook §8.6.

### N4 — Otimizar / novo funil (cíclico) — **duas trilhas, escolhidas pelo `foco_n4` (correção B)**

O `foco_n4` do re-diagnóstico (§3.5) **escolhe a trilha**, não só o rótulo:

**N4-A — Otimização (`foco_n4='otimizar'`)**
| # | Marco (`chave`) | Entregável | "Feito" quando | `dias_esperados` |
|---|---|---|---|---|
| 1 | `baseline_metricas` | Números do funil em `metricas_funil` (CTR, conv. página/checkout, CPA, ROAS) | Existe **série** com os números atuais | 7 |
| 2 | `otimizar_gargalo` | 1 gargalo + 1 hipótese + 1 teste com leitura antes/depois (`metricas_funil`) | Teste concluído e medido | 21 |
| 3 | `escalar_ou_novo` **(saída de ciclo)** | Ganho sustentado | Resultado consolidado → **re-diagnóstico + reinicia ciclo N4** (§3.5) | 30 |

**N4-B — Construção de novo funil (`foco_n4='novo_funil'`)** — refaz o trabalho de N3 para o novo funil (não "medir baseline e otimizar gargalo")
| # | Marco (`chave`) | Entregável | "Feito" quando | `dias_esperados` |
|---|---|---|---|---|
| 1 | `mapear_funil_novo` | Desenho do novo funil + ativo de captura | Existe onde capturar contato/interesse | 7 |
| 2 | `montar_pagina_novo` | Página + checkout do novo funil no ar + tráfego inicial | Recebe compra ponta a ponta e há visitantes reais | 14 |
| 3 | `primeira_venda_novo` **(saída de ciclo, monetário)** | 1ª venda do NOVO funil + `valor_recebido` atribuído | Venda pelo novo funil, no piso de recebido → **re-diagnóstico + reinicia ciclo N4** (§3.5) | 21 |

> A sub-trilha N4-B é sujeita aos **mesmos bloqueios externos** de tráfego que N3 (§3.1.8) e à **mesma regra de venda válida/estabilidade** dos marcos monetários (§3.3). O `escalar_ou_novo` deixa de ser um marco "camaleão": cada foco tem sua espinha real.

### 3.2 Critério de graduação
| Transição | Gatilho | O que o sistema faz (transação única — §3.7) |
|---|---|---|
| **N1→N2** | `oferta_base` concluído + **documento anexado** + validado | Numa transação: fecha plano vigente e insere o novo (`nivel_do_ciclo='N2'`, `ciclo+1`); trigger sincroniza `nivel_atual`; instancia trilha N2 (**`desenhar_produto` só libera após gate leve de posicionamento — §3.6**); registra `nivel_historico` + evento `graduacao_nivel`; notifica Camila; dispara WhatsApp de reconhecimento. |
| **N2→N3** | `validar_produto` concluído com **validação forte (venda paga válida, §3.3)** + `valor_recebido ≥ piso` + estabilidade + validado | Idem, trilha N3, 1º marco `mapear_funil`. **Validação fraca não gradua** (mas a venda é celebrada no fechamento provisório). |
| **N3→N4** | `primeira_venda` concluído (forte) + `valor_recebido` + validado | Idem, trilha N4; **1º marco depende do `foco_n4`**: `baseline_metricas` (otimizar) ou `mapear_funil_novo` (novo funil). |
| **N4→N4'** | `escalar_ou_novo` **ou** `primeira_venda_novo` concluído + validado | Não gradua; **re-diagnóstico N4 (§3.5)** define a nova meta e o novo `foco_n4`; encerra ciclo, abre novo ciclo N4 (`ciclo+1`) com `objetivo_do_ciclo` preenchido. |

Princípios: **só a CS confirma** (1 clique, exige `evidencia_url`); **pode pular marco, não pular nível — e pular exige evidência** (§3.6); graduação é **comemorável** e **histórica** (`nivel_entrada` congelado, `nivel_atual` derivado do plano ativo).

### 3.3 Validação forte vs. fraca + venda paga VÁLIDA + venda PARCELADA + celebração desacoplada (correções A, 3, 5)

O negócio é **high-ticket majoritariamente parcelado** (ex.: 12x). Marcar "forte" apenas porque a entrada/1ª parcela compensou **gradua o mentorado cedo demais e contamina KPI norte e ROI**. Por isso a validação forte é redefinida para parcelado.

`validar_produto`/`primeira_venda`/`primeira_venda_novo` distinguem desfechos em `marcos.tipo_validacao ∈ {forte, fraca}`, com os campos: `valor_contratado`, `valor_recebido`, `natureza_venda`, `evidencia_comprador`, `venda_compensada`, `venda_estavel_em`, `venda_revertida_em`.

**Validação FORTE = ≥1 venda paga VÁLIDA**, e uma venda só é válida quando **as quatro condições valem**:
1. `natureza_venda = 'fora_circulo'` — comprador **fora do círculo pessoal** (não amigo/familiar/aluno cortesia). **A classificação `fora_circulo` é o ponto auditável (correção 3) e exige `evidencia_comprador` mínima:** contato do comprador **ou** nota/print da transação com **identificação do comprador**. Sem essa evidência, a CS não pode marcar `fora_circulo` — a existência do pagamento (objetiva) não substitui a verificação de **quem** comprou. A CS registra `fora_circulo`/`circulo_pessoal`/`desconhecida`.
2. `venda_compensada = true` — pagamento **efetivamente compensado** (não "prometeu pagar").
3. **Piso de recebido para venda parcelada:** a venda só conta como forte quando o **recebido** atinge o piso de `parametros_nivel.venda_forte_regra`, que aceita duas formas (config por nível), **priorizando a que não exige contagem manual de parcela** (correção 13):
   - **`pct_min_recebido`** (ex.: ≥ X% do `valor_contratado` recebido) — **forma preferida**, avaliável por snapshot mensal sem reconciliar parcela a parcela, OR
   - **`min_parcelas_compensadas`** (fallback, quando só há contagem de parcelas).
   Enquanto o recebido está abaixo do piso, o marco fica `concluido` provisório com `tipo_validacao='fraca'` e a tarefa leve "aguardando piso de recebido". **Venda à vista** é o caso trivial (`pct_min_recebido=100%` de imediato).
4. **Janela de estabilidade cobrindo reembolso/chargeback real:** `venda_estavel_em = data_venda + janela_estabilidade_venda_dias` (config para cobrir a janela real do meio de pagamento; ex.: 30–90 dias). Só vira `forte` quando passou a janela **sem reembolso/chargeback** e o piso foi atingido.

**Celebração desacoplada da graduação (correção 5):** negar reconhecimento por até 90 dias desmotiva. Por isso:
- **No fechamento provisório** (venda registrada como **paga/compensada**, mesmo antes do piso+estabilidade), o sistema **registra a conquista** e **dispara E3 de reconhecimento** ("venda registrada!") + marca `conquista_registrada_em`.
- A **graduação formal de nível** (e o KPI norte "forte") permanecem **gated pelo piso + estabilidade**.
O mentorado se sente visto imediatamente, sem comprometer a integridade do piso.

**Reversão posterior (`venda_revertida`):** default de parcela, chargeback ou reembolso **depois** grava `venda_revertida_em`, **reabre o `objetivo_ciclo`**, **estorna o `valor_recebido`** (e a linha de `receita_mentorado`), e emite `VENDA_REVERTIDA` (severidade `alta`) na Fila. Se a reversão ocorrer após graduação, a graduação **não** é desfeita retroativamente, mas o objetivo reabre e a receita é corrigida.

**Validação FRACA = carta de intenção / beta gratuito / "compraria" / venda de complacência (círculo pessoal ou sem `evidencia_comprador`) / venda parcelada abaixo do piso / venda reembolsada/revertida.** **Não gradua.** O marco fica `concluido` com `tipo_validacao='fraca'` e **abre automaticamente um novo `objetivo_ciclo`** ("converter em venda paga válida acima do piso"), mantendo o mentorado no nível.

### 3.4 Auditoria amostral do Mateus — inclui monetários e `avancou=true`, à prova de fundador ocupado (correções K, 3, 8)

A Camila valida marcos (1 clique) e é medida por avanço — o que permitiria inflar avanço em três pontos: (i) marcos de saída **não-monetários subjetivos** (ex.: N1 `oferta_base`); (ii) a **classificação `fora_circulo`** de uma venda (o pagamento é objetivo, **a classificação do comprador não é**); (iii) o flag **`avancou=true`** que zera o relógio de travado. A auditoria cobre os três — **config, batelada e nunca bloqueante**:

- **`oferta_base` exige `evidencia_url`**; marcos monetários exigem `evidencia_comprador` (§3.3).
- **Fila assíncrona batelada com teto rígido:** amostra semanal (20% ou no mín. 3) de **cada uma das três origens** entra na mini-fila `auditoria_marco`, com **teto `auditoria_teto_semanal` (default 4 itens/semana)** e **tempo-alvo `auditoria_tempo_alvo_min` (default 10 min)** — revisar em 1 clique (`ok`/`refazer`). A amostra é **estratificada**: marcos não-monetários de saída, **uma amostra das GRADUAÇÕES monetárias** (auditando a classificação `fora_circulo`, não a existência do pagamento — correção 3), e **uma amostra de calls com `avancou=true`** (correção 8). `refazer` reabre o marco/reverte o crédito de progresso e notifica a Camila.
- **`avancou=true` exige evidência mínima (correção 8):** ao logar um check-in de call com `avancou=true`, o popover exige **nota obrigatória** (o que o mentorado entregou/avançou) + **`evidencia_url` opcional**. Sem a nota, o `avancou` não é aceito. A **taxa de `avancou=true` por CS** é KPI de qualidade acompanhado na sombra (§12/§16) para detectar inflação.
- **Fallback quando a auditoria NÃO roda (`auditoria_modo_fallback`):** item na fila além de `auditoria_fallback_dias` (default 7) → a graduação **não trava**. `provisorio_etiqueta` (default): segue etiquetado **"validado provisório — auditoria pendente"** até revisão; `auto_aprova`: auto-aprovado com registro (`resultado='auto_ok'`, `revisado_por='sistema'`).
- **Sinal de fila acumulada:** fila acima do teto por > X dias → `AUDITORIA_ACUMULADA` (`baixa`), badge na Fila de Hoje (§10.c).

Assim a auditoria protege a qualidade **sem** virar gargalo dependente da agenda do fundador — e fecha a brecha de venda de amigo/`avancou` inflado.

### 3.5 Re-diagnóstico a cada ciclo N4 (escolhe a TRILHA) e stretch-goal (correção B)
No fechamento de cada ciclo N4 **e no gatilho de meta batida (§2.2)**, antes de instanciar a nova trilha/objetivo, a CS executa um **mini re-diagnóstico N4**:
1. Popover obrigatório "Novo ciclo N4 — qual o objetivo agora?": `objetivo_do_ciclo` + **`foco_n4 ∈ {otimizar, novo_funil}`** + métrica-alvo (para `otimizar`) **ou** funil-alvo (para `novo_funil`) + **meta de receita recebida do ciclo** (opcional).
2. **`foco_n4` escolhe a trilha (não só o rótulo):** `otimizar` → instancia **N4-A** (`baseline_metricas → otimizar_gargalo → escalar_ou_novo`); `novo_funil` → instancia **N4-B** (`mapear_funil_novo → montar_pagina_novo → primeira_venda_novo`).
3. Registra evento `rediagnostico_n4` (ou `stretch_goal` quando vindo de §2.2). Sem preenchimento, o ciclo **não** é instanciado (tarefa alta pendente).

### 3.6 Gate de qualidade + re-fundação generalizada (rebaixamento em qualquer nível)
**Para instanciar N3 ou N4 como `nivel_inicial`** (`nivel_inicial >= N3`): obrigatório registrar a **evidência mínima do marco de saída do nível anterior** como nota + `evidencia_url` no marco `pulado`, **e** revalidação do mentor/CS. Sem isso, não instancia N3+.

**Gate leve de posicionamento para N2** (entrada direta em N2 **ou** logo após graduar N1→N2): antes de liberar `desenhar_produto`, a **1ª call de Arranque N2** precisa **validar e registrar a evidência de posicionamento**, gravada como `evidencia_url`/nota no marco `oferta_base`. Enquanto não for feito, `desenhar_produto` fica `bloqueado` (interno) com tarefa alta `validar_posicionamento_n2`.

**Re-fundação / correção de rota — vale para QUALQUER nível (N2, N3, N4):** o caso clássico é o **N3/N4 cuja fundação (posicionamento/oferta) se revela fraca DURANTE a execução**. A CS pode **abrir um plano de nível inferior mantendo o histórico** (transação única — §3.7):
- Ação na ficha: **"Correção de rota — rebaixar fundação"** (nível-destino N1/N2).
- Encerra o plano vigente (`status='concluido'` com nota), abre plano do nível inferior, registra `nivel_historico` com `motivo='rebaixamento_fundacao'`.
- `nivel_entrada` **nunca** muda; só `nivel_atual` (derivado) recua. O KPI de progressão (§12) trata re-fundação como evento explícito, não churn.
- **Documentado no playbook "correção de rota" (§8.3).**
- **Toda re-fundação reseta a fase para Arranque e dispara a revisão de `fator_ritmo` (§3.1.5).**

### 3.7 Invariante único de nível + graduação transacional (correções J e 9)

> **`mentorados.nivel_atual` ≡ `(plano ativo do contrato).nivel_do_ciclo`.** É a única fonte de verdade, mantida por **trigger de sincronização** (`trg_sync_nivel_atual`) que dispara em INSERT/UPDATE de `planos_sucesso` e reescreve `nivel_atual` a partir do plano com `status='ativo'`. `marcos.nivel` é sempre igual ao `nivel_do_ciclo` do plano (validado no instanciamento).

**Graduação / re-fundação / reinício de ciclo são UMA transação** (`fn_transicao_nivel(...)`, chamada pelo webhook `marco.concluido`): fechar o plano antigo (`status='concluido'`) e inserir o novo (`status='ativo'`) ocorrem **no mesmo commit**.

**Ordem única suportada (correção 9 — `DEFERRABLE` removido):** como `ux_planos_sucesso_ativo` é um **índice único parcial** (não constraint), ele **não pode ser `DEFERRABLE` no Postgres**. A menção a "ou DEFERRABLE" é **removida**. A **única** implementação suportada é, dentro da mesma transação:
```
1) UPDATE planos_sucesso SET status='concluido' WHERE id = <plano_antigo>;   -- libera o parcial
2) INSERT planos_sucesso (... status='ativo' ...);                            -- ocupa o parcial
```
> **Nota de teste (obrigatória):** no passo (1) o contrato fica momentaneamente com **0 planos ativos** e o `trg_sync_nivel_atual` roda, deixando `nivel_atual` transitoriamente sem plano ativo; o passo (2), no **mesmo commit**, dispara o trigger de novo e **corrige `nivel_atual`** para `nivel_do_ciclo` do novo plano. Como tudo está numa transação, **nenhum observador externo vê o estado intermediário**. O QA (§14) verifica explicitamente que, ao final do commit, `nivel_atual` = novo `nivel_do_ciclo` e que **nunca há zero nem dois planos ativos visíveis fora da transação**. Se realmente se quiser adiar a checagem, a alternativa é trocar o índice parcial por uma **EXCLUDE constraint `DEFERRABLE`** — não adotada por padrão neste plano.

---

## 4. Diagnóstico de nível no onboarding

O onboarding ganha um **passo de diagnóstico** — mini-questionário que a Camila preenche na 1ª call (ou o mentorado responde por form/Edge Function). A primeira negativa define o nível — **determinística**.

| # | Pergunta | Chave `diagnostico_score` (jsonb) | Uso |
|---|---|---|---|
| Q1 | Você tem posicionamento/nicho/oferta-base definidos? | `tem_posicionamento` | Define nível |
| Q2 | Você já tem um produto/oferta criado (mesmo sem validar)? | `tem_produto` | Define nível |
| Q3 | **Seu funil já está gerando vendas hoje?** | `funil_vendendo` | Define nível |
| Q4 | *(só se Q3=sim)* Foco: **otimizar o funil atual** ou **abrir um novo funil**? | `foco_n4` ∈ `otimizar`/`novo` | **NÃO altera o nível**; **escolhe a trilha N4-A/N4-B** e semeia `objetivo_do_ciclo` inicial |

Além do nível, o passo **calcula e exibe a meta estruturada** (§2.1, já com latência de estabilidade) e a Camila **define `fator_ritmo`** na 1ª call de arranque (§3.1).

### `calc_nivel_entrada` — implementação à prova de exceção
```sql
create or replace function norm_bool(v text) returns boolean
language sql immutable as $$
  select case lower(trim(coalesce(v, '')))
    when 'sim' then true  when 's' then true  when '1' then true
    when 'true' then true when 't' then true  when 'yes' then true when 'on' then true
    when 'nao' then false  when 'não' then false when 'n' then false when '0' then false
    when 'false' then false when 'f' then false when 'no' then false when 'off' then false
    else null                      -- QUALQUER outro valor => NULL => rota sem_nivel
  end
$$;

create or replace function calc_nivel_entrada(d jsonb) returns nivel_mentorado
language plpgsql immutable as $$
declare
  pos boolean := norm_bool(d->>'tem_posicionamento');
  prod boolean := norm_bool(d->>'tem_produto');
  funil boolean := norm_bool(d->>'funil_vendendo');
begin
  if d is null or pos is null or prod is null or funil is null then
     return 'sem_nivel';
  end if;
  if pos is not true then       return 'N1';
  elsif prod is not true then   return 'N2';
  elsif funil is not true then  return 'N3';
  else                          return 'N4';
  end if;
end $$;
```
> `norm_bool` devolve `NULL` para qualquer coisa fora do dicionário; `NULL` segue a **mesma rota de `sem_nivel`**. A Edge Function/form **canoniza o `diagnostico_score` como boolean JSON no ponto de escrita**; `norm_bool` é a 2ª linha de defesa.

### 4.1 Estado `sem_nivel` — ninguém sem diagnóstico escapa
- Ao nascer o contrato ativo, `mentorados.nivel_atual` recebe **`sem_nivel`** por padrão.
- Cria tarefa alta `diagnosticar_nivel` e coloca o mentorado no **topo da Fila** (§7.4), sob **SLA de 24h** (§9.6).
- O detector diário **vê** o mentorado; se o SLA estourar, **escalona** (§9.6).

### 4.2 Fluxo de nascimento do Plano de Sucesso
1. Grava `diagnostico_score = d`, `nivel_entrada = calc_nivel_entrada(d)`, `nivel_diagnosticado_em`, `fator_ritmo` (default 1,0, revisado na call), meta estruturada (§2.1).
2. **Gate de qualidade** (§3.6): se `nivel_inicial >= N3`, exige evidência + revalidação; se `nivel_inicial = N2`, arma o gate leve de posicionamento.
3. Cria linha em `nivel_historico` (origem `onboarding`).
4. Cria 1 registro **ativo** em `planos_sucesso` (`ciclo=1`, `nivel_do_ciclo=nivel_inicial`, `status='ativo'`, `cadencia_dias`, `responsavel_cs`) — o trigger sincroniza `nivel_atual` (§3.7). **1 plano ativo por contrato** (§6).
5. **Instancia a trilha** (para N4, respeitando `foco_n4` → N4-A/N4-B); marcos anteriores = `pulado` com nota + evidência quando exigida. 1º marco da espinha vira `em_andamento` (§3.1), com `prazo_alvo` ajustado por `fator_ritmo`.
6. Preenche `objetivo_do_ciclo`, `proximo_passo`.
7. Cria a 1ª tarefa de acompanhamento, agenda a 1ª automação de check-in por nível **e agenda o 1º pulso de satisfação** (§7.6).
8. Registra evento `plano_sucesso_criado`.

`nivel_entrada` nunca muda. `nivel_atual` (derivado) dirige cadência, marcos e detecção.

---

## 5. Definição operacional de "travado / esquecido / perdido / insatisfeito / impedido"

| Termo | Sobre o quê | Pergunta | Dono |
|---|---|---|---|
| **Travado** | O MENTORADO parou de avançar (a frente-espinha não progride de verdade, com evidência de origem-mentorado) | "Ele empacou?" | Mentorado |
| **Impedido (bloqueio externo)** | Uma **dependência de plataforma/verba** fora do controle do mentorado paralisa a execução | "Ele está preso em verba/conta/checkout?" | CS + terceiro (plataforma) |
| **Esquecido** | A CS parou de tocar nesse mentorado | "Faz quanto ninguém fala com ele?" | CS (processo) |
| **Insatisfeito** | O mentorado **avança mas não percebe valor** | "Ele está feliz com o acompanhamento?" | CS (percepção de valor) |
| **Perdido** | Risco real de desistir/sumir de vez | "Ele está indo embora?" | Retenção |

Réguas por nível são **config editável** (`parametros_nivel` + `catalogo_marcos.dias_esperados`) e usam o **prazo ajustado por `fator_ritmo`** (§3.1).

### 5.1 TRAVADO — predicado corrigido: sinal de PROGRESSO separado do sinal de TEMPO (correções 7, 8, 12)

**Conjunto ativo:** `status = 'em_andamento'`. `pendente`/`concluido`/`pulado` não contam. `bloqueado` (interno **ou** externo) **não conta para o sinal de progresso** (tempo pausado + creditado no desbloqueio, §3.1) mas **gera seu próprio sinal** (`marco_bloqueado` interno `media`; `BLOQUEIO_EXTERNO` `media`/`alta`).

**Sinal de PROGRESSO no tempo — `r_ref`, NUNCA `min` (correção 7, alta):** o bug anterior era usar `r_min = min_i r_i`, que **abrir/graduar frente nova (r~0) derrubava**, silenciando o vermelho e mascarando uma espinha travada. Corrigido:
- Para cada marco ativo `i` (prazo ajustado por `fator_ritmo`): `dias_no_marco_i = current_date − iniciado_em_i − dias_bloqueado_i`; `r_i = dias_no_marco_i / (dias_esperados_i × fator_ritmo)`.
- **`r_ref` = `r` da frente-ESPINHA ativa** (o marco que gradua o nível). Se a espinha não estiver `em_andamento` (só frentes paralelas), `r_ref = max_i(r_i)` sobre o conjunto ativo. **Nunca `min`.**
- Consequência: abrir uma frente paralela nova (r~0) **não** reduz `r_ref`; uma espinha travada em `r=3,0` mantém `r_ref` alto mesmo com uma frente recente em r~0.

**Sinal de TEMPO — `dias_sem_progresso`, só origem-mentorado, com evidência:**
```
ultimo_progresso_em = max(
   progresso_checkins.criado_em  WHERE origem IN ('auto_relato','whatsapp')
                                    OR (origem='call' AND avancou = true AND nota IS NOT NULL),  -- exige evidência (correção 8)
   entregas.entregue_em          WHERE submetida_por = 'mentorado',
   marcos.status_mudou_em        WHERE evidencia_url IS NOT NULL
)
dias_sem_progresso = current_date − ultimo_progresso_em
```

**Predicado (relativo ao nível) — VERMELHO, verdadeiramente DISJUNTIVO no tempo (correção 7):**
```
vermelho :=
   ( r_ref ≥ fator_travado_vermelho(nivel) AND dias_sem_progresso ≥ dias_esperados_min(nivel) )
   OR
   ( dias_sem_progresso ≥ dias_sem_progresso_teto(nivel) )      -- domina SOZINHO, independe de r_ref
```
O 2º disjunto garante que, mesmo num cenário onde `r_ref` fosse baixo, **muito tempo sem progresso real dispara vermelho sozinho** — não há como uma frente nova "esconder" o alarme.

> **Exemplo (correção do texto do parágrafo antigo):** mentorado com espinha `precificar` parada há 24 dias (`r_ref=3,0`, `dias_sem_progresso=24`). A CS abre a frente paralela `desenhar_produto v2` (`iniciado_em=now`, `r=0`). Antes (`min`): `r_min` caía para 0 e o vermelho **sumia** — bug. Agora: `r_ref` continua = **r da espinha `precificar` (3,0)** e `dias_sem_progresso` continua 24 → **vermelho permanece**. Abrir frente nova **não zera o alarme**.

**Faixa amarela como predicado FECHADO:**
| Faixa | Predicado SQL fechado |
|---|---|
| **Atenção (amarelo)** | `( r_ref ≥ fator_travado_amarelo(nivel) AND r_ref < fator_travado_vermelho(nivel) )` **OR** `( dias_sem_progresso ≥ dias_esperados_min(nivel) * coef_amarelo_progresso(nivel) AND dias_sem_progresso < dias_esperados_min(nivel) )` |
| **Travado (vermelho — PISO, domina)** | predicado disjuntivo acima |

**Comportamento sem evento de progresso no MVP (correção 12, alta):** no MVP a fonte primária de `ultimo_progresso_em` é a **call com `avancou=true`** logada pela Camila — exatamente o que o plano diz que não se pode depender. Sem tratamento, um N1 engajado que vai a todo grupo mas sem 1:1 logado apareceria como TRAVADO em 7 dias, gerando fadiga de alerta. Três regras fecham isso:
- **(a) Presença em grupo do próprio nível é supressor parcial.** Presença **ativa e recorrente** no grupo do nível do mentorado (§8.2) **rebaixa vermelho → amarelo** mesmo sem 1:1 logado, por ser evidência observável de que o mentorado **não sumiu**. (Não zera o travado — só o rebaixa; continua na Fila como amarelo até avanço real.)
- **(b) Modo conservador enquanto a cobertura de log está baixa.** Enquanto `cobertura_log_call` (% de toques logados com `avancou` preenchido, medido na sombra e em regime) estiver **abaixo do alvo `cobertura_log_alvo`**, o detector **opera em modo conservador: só amarelo, nunca vermelho automático** — para não inundar a fila com falso-positivo estrutural. Atingir a cobertura-alvo é **pré-condição para ligar E2/E4/E5** (§16).
- **(c) Alerta "ativo sem QUALQUER progresso há N dias".** Quando um mentorado **ativo** fica sem **nenhum** evento de progresso de origem-mentorado por `dias_sem_progresso_alerta_log` dias, emite o sinal leve **`SEM_LOG_PROGRESSO`** (`baixa`) — que distingue **"travado de verdade"** de **"não logado"** e lembra a Camila de logar/colher progresso, em vez de escalar como vermelho.

**Regra de precedência:** o vermelho é **piso** e sempre domina, **exceto** o rebaixamento por presença em grupo (a) e o modo conservador (b). Abrir frente nova **não** silencia (`r_ref` usa espinha/max); um toque da CS **não** silencia (não entra em `ultimo_progresso_em`). Bloqueio externo **não vira** travado (§3.1.8). Só avanço real do mentorado limpa o travado.

**Explicitamente EXCLUÍDOS** de `ultimo_progresso_em`: `interacoes` (CS-side), `progresso_checkins` de `origem='cs_manual'`, calls sem `avancou=true` ou sem nota. Esses eventos **continuam valendo** na recência/sinal-de-vida do Progress Score (§7.1) e na régua de `esquecido` (§5.2).

**Réguas por nível — com `dias_esperados_min` e `dias_sem_progresso_teto` FIXADOS:**
| Nível | `fator_travado_amarelo` | `fator_travado_vermelho` | `coef_amarelo_progresso` | **`dias_esperados_min`** | **`dias_sem_progresso_teto`** | `dias_sumindo` | `cadencia_dias` |
|---|---|---|---|---|---|---|---|
| **N1** | 1,0 | 1,5 | 0,6 | **7** | **21** | 10 | 7 |
| **N2** | 1,1 | 1,6 | 0,6 | **7** | **21** | 12 | 7 |
| **N3** | 0,8 | 1,3 | 0,6 | **7** | **21** | 14 | 10 (7 se travado em tráfego) |
| **N4** | 1,2 | 2,0 | 0,6 | **10** | **30** | 21 | 30 (piso mensal — §5.5) |

Exemplo SQL do predicado vermelho (determinístico):
```sql
select v.mentorado_id
from v_dias_no_marco v
join parametros_nivel p on p.nivel = v.nivel
where (v.r_ref >= p.fator_travado_vermelho and v.dias_sem_progresso >= p.dias_esperados_min)
   or (v.dias_sem_progresso >= p.dias_sem_progresso_teto);
-- v.r_ref = r da frente-espinha (ou max sobre o ativo), NUNCA min
-- rebaixamento por presença em grupo e modo conservador aplicados na camada de faixa
```

### 5.2 ESQUECIDO — dias sem QUALQUER interação da CS
Independe de marco; olha a última atividade da CS (`interacoes`, `progresso_checkins` de origem CS, `presencas` — inclusive grupo N1/N2, §8.2 — `entregas`, resposta de WhatsApp). Ultrapassar `dias_sumindo` gera tarefa alta. **Culpa do processo.** Sob SLA e escalonamento (§9.6). *(Aqui os eventos CS-side contam.)*

### 5.3 PERDIDO — combinação de sinais + efeito no risco
Marca-se **perdido** quando ocorrer **qualquer**:
- `r_ref > 2 × fator_travado_vermelho(nivel)` **com `dias_sem_progresso` alto**, **OU**
- travado (vermelho) **E** sem resposta às 2 últimas tentativas de contato, **OU**
- 2 check-ins/calls agendados perdidos (no-show) seguidos, **OU**
- **`insatisfacao` sustentada** (§7.6) **não resolvida** após 1 ciclo de Conversa de Valor (§8.5), **OU**
- **`venda_revertida` (§3.3)** com o mentorado sem re-engajamento em N dias.

> Bloqueio externo **não** é insumo de perdido enquanto está corretamente classificado como `BLOQUEIO_EXTERNO` e a CS está atuando no destravamento (§8.6).

**Efeito único (flag separada):** perdido grava `mentorados.risco_churn = true` (+ `risco_churn_motivo`, `risco_churn_em`). Essa flag: **NÃO recalcula o health score**; é **lida** pela régua de renovação/retenção e pela UI como vermelho (override **só de priorização e exibição**); dispara tarefa crítica + topo da Fila + **SLA de 24–48h e escalonamento** (§9.6).

### 5.4 Como alimenta o health score existente
O health de 3 faixas continua com o **mesmo cálculo**. Só mudam: (1) a **estagnação por nível** entra como componente adicional de engajamento já previsto, **exibida lado a lado** com o Progress; (2) a flag `risco_churn` **força exibição/priorização vermelha** por override, sem tocar na fórmula.

### 5.5 Piso de vigilância do N4 (inclui vencedor precoce)
- **Check-in obrigatório mensal** (piso): sem interação em 30 dias, N4 (e mentorado em `meta_atingida`) entra na Fila como **esquecido** (`dias_sumindo=21`).
- **Sinal de OPORTUNIDADE / queda de métrica** (§7.2): via `metricas_funil` com **gate de confiabilidade**.
- **Série estagnada / receita desatualizada** (§7.2): métricas ou receita não atualizadas há X dias geram tarefa leve, não silêncio.

---

## 6. Modelo de dados novo (resumo em tabela)

Convenção: snake_case, `id uuid default gen_random_uuid()`, `created_at`/`updated_at`, **RLS ligado com políticas explícitas (§6.1)**. Tudo conecta por FK ao schema existente.

### Enums novos
`nivel_mentorado` (sem_nivel/N1/N2/N3/N4) · `status_marco` (pendente/em_andamento/concluido/pulado/bloqueado) · **`motivo_bloqueio` (nova) (interno_cs/sem_verba/conta_ads/checkout_reprovado/plataforma_em_analise)** · `status_plano` (ativo/pausado/concluido/cancelado) · `status_objetivo` (aberto/atingido/nao_atingido/revisado) · `origem_checkin` (auto_relato/call/cs_manual/whatsapp) · `faixa_progresso` (avancando/atencao/travado) · `tipo_validacao` (forte/fraca) · `natureza_venda` (fora_circulo/circulo_pessoal/desconhecida) · `foco_n4` (otimizar/novo_funil) · `metrica_funil` (ctr/conv_pagina/conv_checkout/cpa/roas) · `tipo_pulso` (progresso/satisfacao) · `tipo_insatisfacao` (expectativa/ritmo/acompanhamento/metodologia/resultado) · `tipo_sinal` (travado/sumindo/marco_atrasado/marco_bloqueado/**bloqueio_externo**/sem_checkin/**sem_log_progresso**/queda_progresso/pronto_subir_nivel/oportunidade/sem_nivel/insatisfacao/serie_estagnada/receita_desatualizada/meta_atingida_cedo/venda_revertida/pulso_sem_resposta/auditoria_acumulada/revisar_fator_ritmo/sla_estourado/job_parado) · `severidade_sinal` (baixa/media/alta) · `status_sinal` (aberto/em_tratativa/resolvido/ignorado/escalado) · `status_entrega` (pendente/entregue/revisada/atrasada).

### Tabelas novas
| Tabela | Papel | Ligações-chave |
|---|---|---|
| `catalogo_marcos` | Trilha-modelo por nível: `nivel, ordem, chave, titulo, dias_esperados, eh_marco_de_saida, eh_espinha, eh_monetario, **variante_n4 (nulo/otimizar/novo_funil)**`. | — |
| `planos_sucesso` | **1 ativo por contrato, N no histórico**: `contrato_id, ciclo int, nivel_do_ciclo, **foco_n4**, status, cadencia_dias, objetivo_do_ciclo, proximo_passo, prazo_alvo, responsavel_cs`. | `mentorado_id`, `contrato_id` |
| `marcos` | Instâncias: `nivel, ordem, chave, titulo, status, dias_esperados, eh_marco_de_saida, eh_espinha, eh_monetario, iniciado_em, ultimo_progresso_em, concluido_em, prazo_alvo, dias_bloqueado, bloqueado_em, **motivo_bloqueio**, **bloqueio_externo_detalhe jsonb**, concluido_no_prazo, tipo_validacao, valor_contratado numeric, valor_recebido numeric, natureza_venda, **evidencia_comprador text**, venda_compensada bool, venda_estavel_em date, venda_revertida_em timestamptz, **conquista_registrada_em timestamptz**, evidencia_url, nota, concluido_por, auditoria_status (nulo/provisorio/ok/auto_ok/refazer)`. | `plano_id`, `mentorado_id`, `catalogo_marco_id` |
| `objetivos_ciclo` | 1–3 metas curtas concorrentes por marco. | `plano_id`, `marco_id`, `tarefa_id` |
| `progresso_checkins` | Pulso estruturado: `tipo_pulso, origem, humor(1–5), avancou bool, **nota text (obrigatória quando avancou=true)**, nota_satisfacao int, comentario_satisfacao text, tipo_insatisfacao, bloqueio, resumo, respostas jsonb`. | `mentorado_id`, `marco_id`, `interacao_id` |
| `receita_mentorado` | Receita por período: `mentorado_id, plano_id, periodo (mês/ref date), valor_contratado numeric, valor_recebido numeric, origem (marco/snapshot_mensal/auto_relato/gateway/manual), marco_id nullable, observacao, revertida bool default false`. Alimenta KPI norte em R$ **recebido**. | `mentorado_id`, `plano_id`, `marco_id` |
| `metricas_funil` | Série N4: `mentorado_id, plano_id, data, metrica metrica_funil, valor numeric, origem`. | `mentorado_id`, `plano_id` |
| `progresso_score_hist` | Histórico do Progress Score: `score, faixa, componentes jsonb`. | `mentorado_id`, `plano_id` |
| `progresso_score_snapshot` **(novo — correção 11)** | Snapshot **diário leve** só para delta de 7 dias: `mentorado_id, data, score`. Retenção 14 dias. | `mentorado_id` |
| `satisfacao_hist` | Histórico do pulso: `nota, delta, humor_medio_janela, tipo_insatisfacao, origem`. | `mentorado_id`, `plano_id` |
| `parametros_nivel` | Réguas: `fator_travado_amarelo, fator_travado_vermelho, coef_amarelo_progresso, dias_esperados_min, **dias_sem_progresso_teto**, dias_sumindo, cadencia_dias, sla_horas_alta, sla_horas_media, cadencia_pulso_satisfacao_dias, janela_estabilidade_venda_dias, **dias_esperados_estabilidade**, venda_forte_regra jsonb {pct_min_recebido, min_parcelas_compensadas}, dias_receita_desatualizada, auditoria_teto_semanal, auditoria_fallback_dias, auditoria_modo_fallback, **cobertura_log_alvo, dias_sem_progresso_alerta_log**`. | PK = `nivel` |
| `sinais_mentorado` | Fila de ação: `tipo, severidade, status, nivel, detalhe jsonb, chave_dedupe (unique), tarefa_id, sla_venc_em, escalado_para, escalado_em, **escalado_so_fundador bool**`. | `mentorado_id`, `plano_id`, `marco_id` |
| `nivel_historico` | Auditoria de nível: `nivel_de, nivel_para, motivo (graduacao/rebaixamento_fundacao/onboarding), origem, registrado_por`. | `mentorado_id`, `registrado_por` |
| `presencas` | Presença em calls e grupos: `tipo (call/grupo), ocorreu_em, presente, origem, fonte_ref, grupo_nivel`. | `mentorado_id` |
| `entregas` | Entregáveis: `titulo, status, prazo, entregue_em, url, submetida_por (mentorado/cs)`. | `mentorado_id`, `marco_id` |
| `auditoria_marco` | Spot-check do Mateus: `marco_id, **origem_amostra (nao_monetario/graduacao_monetaria/call_avancou)**, resultado (ok/refazer/auto_ok), revisado_por, revisado_em`. | `marco_id`, `mentorado_id` |
| `recursos_cs` | Biblioteca por nível: `nivel, chave, titulo, tipo (template/checklist/script/one_pager/roteiro), url, playbook_ref`. | `nivel` |
| `job_health` | Heartbeat do detector: `job_nome, ultima_exec_ok_em, ultima_exec_status, detalhe jsonb`. | — |
| `cobertura_backstop` **(novo — correção 14)** | Registro de ausência/cobertura da CS: `cs_id, ausente_de, ausente_ate, backstop_responsavel, sub_runbook_ref, criado_por`. | `cs_id` |

### Constraint de ciclo em `planos_sucesso`
```sql
create unique index ux_planos_sucesso_ativo
  on planos_sucesso (contrato_id) where status = 'ativo';
alter table planos_sucesso
  add column ciclo int not null default 1,
  add column nivel_do_ciclo nivel_mentorado not null,
  add column foco_n4 foco_n4;
```
Regra: graduar/reiniciar ciclo/re-fundar fecha o plano vigente e insere o novo **na mesma transação, na ordem UPDATE→INSERT** (§3.7). Índice único parcial **não é `DEFERRABLE`**. **1-ativo-por-contrato, N-histórico.**

### Trigger de sincronização de nível
```sql
create or replace function fn_sync_nivel_atual() returns trigger
language plpgsql as $$
begin
  update mentorados m
     set nivel_atual = coalesce(p.nivel_do_ciclo, m.nivel_atual)  -- protege o passo intermediário (0 ativos)
    from (select contrato_id, nivel_do_ciclo from planos_sucesso
          where contrato_id = new.contrato_id and status = 'ativo' limit 1) p
   where m.id = (select mentorado_id from planos_sucesso where contrato_id = new.contrato_id limit 1);
  return new;
end $$;
create trigger trg_sync_nivel_atual
  after insert or update of status, nivel_do_ciclo on planos_sucesso
  for each row execute function fn_sync_nivel_atual();
```
> No passo UPDATE→(0 ativos)→INSERT (§3.7), o `coalesce` evita que o estado intermediário zere `nivel_atual`; o INSERT subsequente, no mesmo commit, grava o nível correto. QA verifica (§14).

### ALTER em tabelas existentes
- **`mentorados`** `+ nivel_entrada, nivel_atual default 'sem_nivel', nivel_diagnosticado_em, diagnostico_score jsonb, fator_ritmo numeric default 1.0, meta_nivel_alvo nivel_mentorado, meta_marco_alvo text, meta_receita_alvo numeric, meta_label text, meta_atingida_em timestamptz, progress_score numeric(5,2), progress_faixa faixa_progresso, progress_calculado_em, satisfacao_score numeric(4,2), satisfacao_faixa, satisfacao_calculada_em, receita_recebida_total numeric default 0, receita_atualizada_em timestamptz, pausado_ate date, risco_churn boolean default false, risco_churn_motivo text, risco_churn_em timestamptz`.

### Views e funções
- Views: `v_marco_atual`, `v_dias_no_marco` (**`r_ref` = r da espinha/max, `dias_sem_progresso` de origem-mentorado com evidência**), `v_travados`, `v_fila_acompanhamento` (fonte única do score de prioridade — §7.4), `v_fila_volume` (§9.4), `v_receita_mentorado` (receita **recebida** por mentorado/safra/nível — §12), `v_sla_estouros` (**inclui `escalado_so_fundador` — §12/§9.6**).
- Funções: `norm_bool`, `calc_nivel_entrada`, `calc_progress_score` (modo degradado MVP — §7.1), `calc_engajamento` (Fase 1), `calc_satisfacao` (§7.6), `calc_prioridade` (§7.4), `calc_sla_venc` (§9.6), `fn_transicao_nivel` (§3.7), `fn_sync_nivel_atual`, `calc_horizonte_meta` (**§2.1, inclui estabilidade**).

### 6.1 Políticas RLS explícitas (escalonamento precisa enxergar)
RLS **ligado com políticas nomeadas** em todas as tabelas. Shape padrão (via `usuario_atual()`):
- **Plano e filhos**: `responsavel_cs` do plano **OU** qualquer usuário em `sinais_mentorado.escalado_para` de sinal aberto/escalado daquele mentorado **OU** `cobertura_backstop.backstop_responsavel` ativo para a CS dona (correção 14) **OU** role `admin` (Mateus).
- **`sinais_mentorado`**: leitura `responsavel_cs` + `escalado_para` + backstop + admin; escrita de status pelo dono/escalado; criação só pelo detector (service role).
- **`auditoria_marco`**: leitura/escrita só admin.
- **`job_health`**: escrita service role; leitura admin.
- **Config** (`catalogo_marcos`, `parametros_nivel`, `recursos_cs`): leitura por qualquer CS; escrita só admin.

Exemplo (marcos):
```sql
create policy marcos_cs_e_escalado on marcos for all using (
  exists (select 1 from planos_sucesso p
          where p.id = marcos.plano_id and p.responsavel_cs = usuario_atual())
  or exists (select 1 from sinais_mentorado s
          where s.mentorado_id = marcos.mentorado_id
            and s.status in ('aberto','em_tratativa','escalado')
            and usuario_atual() = any(s.escalado_para))
  or exists (select 1 from cobertura_backstop c
          join planos_sucesso p2 on p2.id = marcos.plano_id
          where c.cs_id = p2.responsavel_cs and c.backstop_responsavel = usuario_atual()
            and current_date between c.ausente_de and c.ausente_ate)
  or tem_role('admin')
);
```
**QA obrigatório (§14):** após o SLA estourar e o sinal ser escalado, a 2ª CS/backstop lê/edita o mentee; antes, não.

### Como se liga ao existente (sem duplicar)
`planos_sucesso.contrato_id → contratos` · `objetivos_ciclo.tarefa_id → tarefas` · `progresso_checkins.interacao_id → interacoes` · a detecção grava em `tarefas`/`interacoes` e dispara via `automacoes`/`eventos_automacao`/`mensagens_enviadas` · todo envio checa `consentimentos` (LGPD).

---

## 7. Progress Score, satisfação, receita e detector

O **Health Score** mede risco de NÃO renovar. O **Progress Score** mede se o mentorado avança AGORA. O **pulso de satisfação** mede se ele percebe valor. A **receita recebida** mede o resultado em R$. Ortogonais.

### 7.1 Composição do Progress Score (0–100), 1x/dia — com piso de faixa

**Composição plena (a partir da Fase 1):**
| Componente | Peso | Cálculo (cortes relativos ao nível, prazo ajustado por `fator_ritmo`) |
|---|---|---|
| **Tempo no marco (parado agora)** | 40 | usa `r_ref` + `dias_sem_progresso` de origem-mentorado (§5.1). |
| **Ritmo recente de marcos** | 20 | % concluídos no prazo nos últimos 2 marcos / 60 dias. Sem marco recente: neutro 60. |
| **Recência (sinal de vida)** | 20 | Dias desde qualquer sinal de vida (inclui interações CS, WhatsApp, presença em grupo, check-ins). |
| **Engajamento** | 20 | `calc_engajamento` = 0,6·presença + 0,4·entregas (últimas 4 semanas). **Só Fase 1.** |

`progress_score = 0,40·tempo_marco + 0,20·ritmo + 0,20·recencia + 0,20·engajamento`

**Faixa por regra de PISO:** a faixa é o **pior caso** entre corte numérico e o predicado de travado da §5.1 (respeitando rebaixamento por grupo e modo conservador):
```
faixa = piso_travado se ( predicado vermelho §5.1 e NÃO suprimido por grupo/modo conservador )
        senão: ≥70 → avancando ; 40–69 → atencao ; <40 → travado
```

**Modo degradado do MVP** (sem `presencas`/`entregas`): remove Engajamento e renormaliza (×1,25) → Tempo 50 / Ritmo 25 / Recência 25. A regra de piso **vale igual**. `componentes jsonb` grava MVP vs pleno.

### 7.2 Detector diário (n8n 07:00 America/Sao_Paulo)
Sinais em `sinais_mentorado`, por nível:
- **TRAVADO** = predicado vermelho §5.1 (com `r_ref`, disjunção, supressão por grupo, modo conservador). `media`; `alta` se também perdido.
- **BLOQUEIO_EXTERNO (novo)** = marco `bloqueado` com `motivo_bloqueio` externo (§3.1.8). `media`; `alta` se > 14 dias. **Não** é `TRAVADO`.
- **SEM_LOG_PROGRESSO (novo — correção 12)** = mentorado ativo sem QUALQUER evento de progresso de origem-mentorado há `dias_sem_progresso_alerta_log` dias. `baixa`. Distingue "não logado" de "travado".
- **SUMINDO** = maior data entre fontes de vida > `dias_sumindo`. `media`; `alta` se > 2×. Resposta WhatsApp zera sem clique.
- **MARCO_BLOQUEADO (interno)** = marco `bloqueado` (`interno_cs`) há > 3 dias sem ação. `media`.
- **QUEDA_PROGRESSO (baseline corrigido — correção 11)** = queda de faixa **ou** ≥15 pts em 7 dias. **Baseline = `progresso_score_snapshot` do dia mais próximo dentro da janela `[hoje-9d, hoje-5d]`**; se não houver linha nessa janela, o **delta é marcado `indisponivel`** (não compara com linha arbitrária de `progresso_score_hist`, que só grava em mudança de faixa/≥3 pts). `media`/`alta`.
- **INSATISFACAO** = ver §7.6. Entra na fila mesmo com Progress verde. `media`; `alta` se nota crítica.
- **PULSO_SEM_RESPOSTA** = 2 pulsos sem retorno → tarefa "colher satisfação/progresso na call". `baixa`.
- **PRONTO_SUBIR_NIVEL** = marco de saída concluído (monetário com piso+estabilidade) aguardando validação. `media`.
- **OPORTUNIDADE (N4) — com gate de confiabilidade:** (a) marco de escala pronto → automático; (b) queda de métrica-chave → automático **somente com ≥2 pontos da MESMA `metrica` espaçados ≥5 dias**; fora disso, MANUAL. `media`.
- **SERIE_ESTAGNADA** = N4 com `metricas_funil` sem atualização há > X dias. `baixa`.
- **RECEITA_DESATUALIZADA** = marco monetário concluído cuja receita não é atualizada há > `dias_receita_desatualizada` → tarefa leve "atualizar receita no snapshot mensal / review de sexta". `baixa`.
- **META_ATINGIDA_CEDO** = meta batida antes do fim (§2.2). `media`.
- **VENDA_REVERTIDA** = default/chargeback/reembolso pós-registro (§3.3). `alta`.
- **AUDITORIA_ACUMULADA** = fila de auditoria acima do teto por X dias (§3.4). `baixa`.
- **REVISAR_FATOR_RITMO (novo — correção 6)** = transição de fase **ou** 2 marcos seguidos fora do prazo ajustado (§3.1.5). `baixa`.
- **SEM_NIVEL** = contrato ativo `sem_nivel` há > 2 dias. `alta`.
- **SLA_ESTOURADO** (§9.6) = sinal `alta` aberto além do `sla_venc_em` → escalona (marca `escalado_so_fundador` quando aplicável).

Fluxo:
```
[Schedule 07:00 BRT]
 → REGISTRA job_health (inicio) + TESTA credencial WhatsApp
 → grava progresso_score_snapshot (leve) + calc_progress_score + calc_satisfacao + snapshot mensal de receita (dia programado)
 → deteccao TRAVADO/BLOQUEIO_EXTERNO/SEM_LOG_PROGRESSO/SUMINDO/MARCO_BLOQUEADO/QUEDA_PROGRESSO/INSATISFACAO/
   PULSO_SEM_RESPOSTA/PRONTO_SUBIR_NIVEL/OPORTUNIDADE(auto)/SERIE_ESTAGNADA/RECEITA_DESATUALIZADA/
   META_ATINGIDA_CEDO/VENDA_REVERTIDA/AUDITORIA_ACUMULADA/REVISAR_FATOR_RITMO/SEM_NIVEL
 → aplica supressao por grupo + modo conservador (cobertura_log < alvo => trava vermelho)
 → varredura SLA: sinais 'alta' abertos c/ sla_venc_em < now → SLA_ESTOURADO + escalona (§9.6)
 → recalcula v_fila_acompanhamento + v_fila_volume
 → cria tarefas p/ sinais 'alta' + eventos_automacao → IF consentimento → nudge
 → resumo diário c/ vazão + cobertura_log + estouros só-fundador
 → REGISTRA job_health (ultima_exec_ok_em = now, status='ok')   -- heartbeat §11.a
```
Se qualquer etapa falhar, `job_health.ultima_exec_status='erro'` e o **watchdog independente** (§11.a) alerta o Mateus.

### 7.3 Anti falso-positivo
1. Dedupe semanal (`chave_dedupe` com semana ISO). 2. Filtro de estágio. 3. `pausado_ate` silencia. 4. Janela de ativação (< 7 dias não dispara travado). 5. Frente-espinha (`r_ref`) + `dias_sem_progresso` origem-mentorado + `fator_ritmo`. 6. Severidade escalonada. 7. Sinal resolvido silencia. 8. **Bloqueio externo não vira travado.** 9. **Supressão por presença em grupo + modo conservador enquanto cobertura de log baixa.** 10. OPORTUNIDADE auto só com delta confiável. 11. **Falso-positivo de travado + taxa `avancou=true` medidos na sombra** antes de ligar E2/E4/E5.

### 7.4 Score de prioridade (0–99) — fórmula determinística única
Ordena a Fila; vive na única view `v_fila_acompanhamento`.

| Camada | Condição | `base` |
|---|---|---|
| Perdido / churn / SLA estourado / job parado / venda revertida | `risco_churn` **ou** health vermelho **ou** `sem_nivel` **ou** `sla_estourado` **ou** `job_parado` **ou** `venda_revertida` | 90 |
| Renovação ≤30d | `dias_ate_fim ≤ 30` | 80 |
| Travado (vermelho) | predicado §5.1 | 65 |
| Insatisfeito | `insatisfacao` aberta | 60 |
| Meta atingida cedo | `META_ATINGIDA_CEDO` | 55 |
| Bloqueio externo | `BLOQUEIO_EXTERNO` aberto | 52 |
| Sumido | `dias_sem_vida > dias_sumindo(nivel)` | 50 |
| Marco vencendo ≤3d / bloqueado interno | `prazo_alvo − hoje ≤ 3` ou `marco_bloqueado` | 35 |
| Toque de ritmo do dia | cadência vence hoje | 20 |
| Revisão leve (receita/serie/pulso/auditoria/fator_ritmo/sem_log) | sinais `baixa` / marco a validar | 10 |

Intensidade `int = round(9 × clamp(excesso,0,1))`. `prioridade = min(99, base+int)`. **Desempate:** `progress_score` asc, `dias_sem_vida` desc.

### 7.5 Retenção de históricos
`progresso_score_hist`/`satisfacao_hist`: grava só quando `faixa` muda **ou** `score` varia ≥3 pts. Retenção diária 90 dias; depois agrega 1 ponto/semana. **`progresso_score_snapshot` (novo): grava TODO dia, retenção 14 dias, exclusivamente para o delta de 7 dias do `QUEDA_PROGRESSO` (correção 11).** Job semanal n8n.

### 7.6 Pulso periódico de satisfação — CSAT/NPS-lite + sinal `insatisfacao`
- **Pulso periódico por nível:** a cada `cadencia_pulso_satisfacao_dias` (default 30–45), mini-pulso (`tipo_pulso='satisfacao'`) via token: 1 NPS-lite + 1 comentário opcional. Grava `nota_satisfacao` + `comentario_satisfacao`; histórico em `satisfacao_hist`.
- **`calc_satisfacao`** deriva `satisfacao_score`/`satisfacao_faixa`.
- **Sinal `INSATISFACAO`** entra na fila mesmo com Progress/Health verdes; ao registrar, a CS classifica `tipo_insatisfacao` para direcionar a Conversa de Valor (§8.5).
- **Efeito:** tarefa **"conversa de valor"** (base 60). Sustentada e não resolvida após 1 ciclo → alimenta `perdido` (§5.3).
- **Não-resposta ≠ silêncio:** 2 pulsos sem retorno → `PULSO_SEM_RESPOSTA`.

### 7.7 Resultado financeiro RECEBIDO — modelo ENXUTO e escalável (correções A, M, 13)

"Ter resultado" só está **plenamente medido** com **número em R$ recebido**. Mas reconciliar parcela a parcela por 6–12 meses é o "trabalho manual infinito" que o plano proíbe. Modelo enxuto:

- **Duas capturas apenas (não por parcela):**
  1. **No fechamento do marco monetário:** validação **exige `valor_contratado` E `valor_recebido`** (o que compensou até ali). Captura garantida do piso do número em R$ mesmo que o acumulado mensal falhe.
  2. **Um único snapshot MENSAL por mentorado (não por parcela):** o detector, num dia programado do mês, cria/atualiza **uma** linha `receita_mentorado` (`origem='snapshot_mensal'`) com o recebido acumulado. O **piso de venda forte é avaliado por `pct_min_recebido`** (forma preferida) — % do contratado recebido, legível do snapshot — em vez de contagem manual de parcelas.
- **`mentorados.receita_recebida_total`** é o espelho somado do recebido; `receita_atualizada_em` marca a última atualização.
- **Caminho mínimo garantido:**
  1. Atualizar R$ recebido é **item fixo da review de sexta** (§9.2) — não depende de token do mentorado.
  2. **`RECEITA_DESATUALIZADA`** cutuca quem tem marco monetário e receita velha.
  3. `valor_recebido` no fechamento é **captura obrigatória**.
- **Integração de pagamento como FASE DATADA do roadmap (correção 13):** o webhook do gateway → `receita_mentorado` (`origem='gateway'`) / `venda_revertida` é o que **elimina** a atualização manual e torna o KPI norte em R$ sustentável em escala. Deixa de ser "ou integração" aspiracional e vira **Fase 1.5-Receita** com escopo e esforço estimados (§13). Enquanto não existir, o snapshot mensal + review de sexta cobrem, e a **governança de vazão (§9.4) contabiliza o custo/semana da atualização de receita por tamanho de carteira**.
- **`v_receita_mentorado`** agrega **R$ recebido por safra e por nível** — insumo do KPI norte (§12), **corrido pelo recebido, nunca pelo contratado**.
- **Reversão (§3.3):** `venda_revertida` estorna a linha (`revertida=true`) e recalcula o espelho.
- **Exibido na ficha (§10.a):** "resultado financeiro recebido até agora: R$ Y (contratado: R$ Z · investimento: R$ X · ROI Y/X)".

---

## 8. Cadência de acompanhamento e playbooks por nível

### 8.1 Fases
| Fase | O que é | Começa | Intensidade |
|---|---|---|---|
| **A. Arranque** | 2–4 semanas pós-onboarding ou pós-subida | Diagnóstico feito, 1º marco definido, `fator_ritmo` setado/revisado | Próxima, didática |
| **B. Cruzeiro** | Executando o marco atual | Após 1º marco entregue | Ritmo-base do nível |
| **C. Transição** | Fechando marco / subindo | Marco concluído | Pico curto + volta ao base |

Subir de nível (ou re-fundar, §3.6) reseta a fase para Arranque, **recalcula a cadência e dispara a revisão de `fator_ritmo` (§3.1.5).**

### 8.2 Cadência-mestra e grupos N1/N2 operacionalizados
Canais: WA async · Call vídeo 20–40 min · Async loom/checklist. **Grupos por nível (N1/N2) entram na Fase 1.**
- **Agenda fixa:** Grupo N1 **terça 19h**; Grupo N2 **quinta 19h** (config). 60–75 min.
- **Registro → `presencas`:** webhook Zoom/Meet grava `presencas (tipo='grupo', grupo_nivel, ...)`; fallback 1 clique.
- **Regra:** presença no grupo satisfaz o toque de cruzeiro da semana — zera `esquecido`, conta como sinal de vida (§7.1) e na régua de `SUMINDO`, **e rebaixa vermelho→amarelo no detector de travado quando é do próprio nível do mentorado (§5.1a)**.
- **1:1 fica para** arranque, transição, resgate, **conversa de valor (§8.5)**, **destravamento externo (§8.6)** e casos individuais.

| Nível | Arranque | Cruzeiro (base) | Transição | Piso de vigilância |
|---|---|---|---|---|
| **N1** | 2x/sem + grupo N1 (ter 19h) | Semanal (grupo N1 ou WA) | Call ao fechar posicionamento | — |
| **N2** | 2x/sem + grupo N2 (qui 19h) | Semanal (grupo N2 ou WA + 1 async) | Call ao validar 1ª venda paga válida | — |
| **N3** | Semanal + suporte async em setup | Semanal (WA orientado a métrica) | Call ao subir funil e registrar 1ª venda | — |
| **N4** | Call de plano (1x) + WA | Mensal (WA de números) | Call de revisão de sprint | Check-in mensal + oportunidade/serie/receita forçam fila (§5.5) |

### 8.3 Playbooks de intervenção (mentorado TRAVOU) — cada um nasce com recurso anexado
Estrutura fixa: **Sinal → Diagnóstico rápido → Passo a passo → Recurso reutilizável (`recursos_cs`) → Critério de saída → Quando escalar ao mentor.**
- **N1** (indecisão): reduzir escopo → filtro de 3 perguntas → 2 melhores → teste 48h → call 20 min. **Recurso: `filtro_de_nicho_n1`.** Saída: promessa em 1 frase + documento. Escala: 2 ciclos sem decisão.
- **N2** (perfeccionismo/medo do "não"): MVP vendável → one-pager → 5 compradores → reenquadrar "não" → precificar por resultado. **Recurso: `one_pager_oferta_n2`.** Saída: ≥1 venda paga válida acima do piso. Escala: produto complexo → trilha do mentor.
- **N3** (3a Setup travado / 3b No ar sem venda **por execução, não por bloqueio externo**): **Recurso: `checklist_setup_funil_n3`.** Saída: 1ª venda pelo funil. Escala: ads avançado. *(Se a causa for verba/conta/checkout, vai para §8.6, não aqui.)*
- **N4** (platô, `foco_n4='otimizar'`): 1 métrica-gargalo → 1 hipótese + 1 experimento → timebox → call de leitura. **Recurso: `template_leitura_metricas_n4`.** Saída: métrica melhorou sustentada.
- **N4 novo funil** (`foco_n4='novo_funil'`): reaproveita o playbook N3 (`checklist_setup_funil_n3`) sobre a sub-trilha N4-B. Saída: 1ª venda do novo funil.
- **Correção de rota (re-fundação, §3.6):** fundação fraca em N2/N3/N4 → diagnóstico da fundação → decisão de rebaixar → recomeço mantendo histórico. **Recurso: reaproveita `filtro_de_nicho_n1`/`one_pager_oferta_n2`.**

### 8.4 Playbook de RESGATE (esquecido/sumido) — só para quem SUMIU
Dispara por `SUMINDO`, health vermelho/`risco_churn`. Nunca começa com cobrança. **NÃO trata insatisfação-sem-sumiço (§8.5) nem bloqueio externo (§8.6).**
| Etapa | Timing | Canal | Conteúdo | Auto? |
|---|---|---|---|---|
| R1 | Dia 0 | WA template | Reconexão sem cobrança | Sim (E5 toque 1) |
| R2 | +3d | WA | Valor útil + pergunta sim/não | Sim (E5 toque 2) |
| R3 | +3d | Áudio pessoal | Áudio da Camila, nominal | Não |
| R4 | +4d | WA + agenda | Convite call 20 min "só destravar" | Semi |
| R5 | +5d | WA + ligação | Ligação; silêncio → `risco_churn` + retenção + avisa mentor | Humano + flag |

Responder em qualquer etapa → sai e cai no playbook de intervenção. **Máx. 1 ciclo/mês.** Após 2 toques automáticos sem resposta, **o bot para**.
> **Sumiço + insatisfação juntos:** resgate roda até religar (R1–R3); ao religar, migra para a Conversa de Valor (§8.5).

### 8.5 Playbook "CONVERSA DE VALOR" — dedicado à insatisfação (correção B)
1. **Sinal:** `INSATISFACAO` aberto (§7.6). **Insatisfeito-e-ativo entra AQUI direto**, não no resgate.
2. **Diagnóstico do TIPO** (`tipo_insatisfacao`): **expectativa / ritmo / acompanhamento / metodologia / resultado.**
3. **Ação por tipo** (recurso `roteiro_conversa_de_valor`, um roteiro por tipo):
   - *expectativa* → recontratar expectativa contra a meta estruturada (§2.1).
   - *ritmo* → revisar `fator_ritmo` (§3.1) e prazos; recalibrar a régua.
   - *acompanhamento* → ajustar cadência/canal; oferecer 1:1 ou grupo; registrar combinado.
   - *metodologia* → sessão de esclarecimento; persistindo, **escalar ao Mateus**.
   - *resultado* → puxar o caso de resultado recebido (§7.7); se aquém, revisar plano/marcos ou re-fundação (§3.6); **escalar ao Mateus** se estratégico.
4. **Critério de saída:** nota recupera (≥7 NPS-lite / humor ≥3) **e** combinado registrado; `INSATISFACAO` → `resolvido`.
5. **Quando escalar ao Mateus:** `metodologia`/`resultado` sem melhora em 1 ciclo, ou `insatisfacao` `alta` repetida. Sempre 1:1, nunca template automático.

### 8.6 Playbook "DESTRAVAMENTO EXTERNO" — dedicado a bloqueio de tráfego/verba (novo — correção de bloqueio externo)
O propósito de distinguir `BLOQUEIO_EXTERNO` de `TRAVADO` é **agir na dependência certa** — o playbook N3 ("escala: ads avançado") não resolve verba zero nem conta banida.
1. **Sinal:** `BLOQUEIO_EXTERNO` aberto com `motivo_bloqueio` (§3.1.8). A régua de travado já está pausada e o tempo creditado.
2. **Diagnóstico por motivo:**
   - **`sem_verba`** → definir e liberar **verba mínima de teste**; se inviável agora, replanejar marco/meta e registrar (não é travamento de execução).
   - **`conta_ads`** → conta em revisão/banida: abrir recurso na plataforma, providenciar BM/conta secundária, checar política violada.
   - **`checkout_reprovado`** → pixel/checkout/gateway reprovado: revisar integração, documento de conformidade, meio de pagamento alternativo.
   - **`plataforma_em_analise`** → domínio/página em análise: aguardar prazo da plataforma, preparar alternativa, acompanhar status.
3. **Recurso:** `checklist_destravamento_externo` em `recursos_cs`.
4. **Critério de saída:** dependência resolvida (verba liberada / conta ativa / checkout aprovado / domínio liberado) → marco volta a `em_andamento` com `prazo_alvo` deslocado (§3.1.8); sinal `resolvido`.
5. **Escalonamento:** > 14 dias sem resolução → severidade `alta` + escalonamento (§9.6); se depende de decisão de verba do próprio mentorado que não avança, considerar Conversa de Valor (tipo `resultado`) ou re-fundação.

> Diferença central: **§8.3 destrava EXECUÇÃO parada do mentorado; §8.6 destrava DEPENDÊNCIA de plataforma/verba; §8.4 reconecta quem SUMIU; §8.5 resolve quem está PRESENTE mas insatisfeito.**

---

## 9. Rotina da Camila, governança de vazão e garantia de processo

A CS trabalha por **fila priorizada e finita**, com **UMA porta de entrada diária** (§10.c) e **carga de julgamento orçada** (§9.4).

### 9.1 Fila priorizada do dia (ordem — reproduzida por §7.4)
1. **Vermelho / churn / SLA estourado / job parado / venda revertida**
2. **Renovação ≤30 dias**
3. **Travados em marco**
4. **Insatisfeitos** (Conversa de Valor, §8.5)
5. **Meta atingida cedo** (§2.2)
6. **Bloqueios externos** (Destravamento, §8.6)
7. **Sumidos** (resgate R1–R4)
8. **Marco vencendo ≤3d / bloqueado interno**
9. **Toques de ritmo do dia** (piso mensal N4, oportunidade)
10. **Revisões leves** (receita, série, pulso, auditoria, `revisar_fator_ritmo`, `sem_log_progresso`, celebrações)

### 9.2 Semana-tipo (a Fila de Hoje é o default — correções L e M)
| Dia | Foco |
|---|---|
| Todo dia (30 min manhã) | **Fila de Hoje:** limpar vermelhos/sem_nivel/SLA/sumidos/insatisfeitos/bloqueios externos, validar celebrações/nudges |
| Seg | Renovações da semana + agenda de calls |
| Ter | Calls 1:1 + grupo N1 (19h) |
| Qua | **Travados (aba dedicada):** playbooks N1–N4 + **Conversas de Valor** + **Destravamentos externos** |
| Qui | Calls 1:1 + grupo N2 (19h) |
| Sex | **Review de carteira (aba Carteira):** quem avançou/parou/sobe; celebrar marcos; **lançar/atualizar receita recebida (snapshot mensal / item obrigatório)** |

Regra de ouro: **primeiro os que podem cair, depois os que podem avançar.**
> **A Fila de Hoje é a única tela que a Camila abre por padrão** (§10.c). Ela só sai dela nos momentos fixos acima.

### 9.3 Humano vs. automático
| Automático (n8n + WA + Supabase) | Humano (Camila) |
|---|---|
| Nudges, lembretes, celebração (inclui celebração da venda no fechamento provisório), montagem/priorização da fila, resgate R1–R2, pulso de satisfação, registro de health/progress/satisfação/receita (snapshot mensal), alertas de silêncio/risco/insatisfação/bloqueio externo/meta batida/venda revertida, tarefa de diagnóstico, varredura de SLA + escalonamento, watchdog do job, resumo com vazão | Calls (arranque/transição/resgate/estratégica/**valor**/**destravamento** + grupos), diagnóstico do playbook, áudio pessoal (R3+), leitura de números N4, julgamento de "subiu?"/"re-fundar?"/"stretch?"/`foco_n4`, validação de marco, **registro de `valor_recebido`**, conversa difícil |

### 9.4 Governança de vazão, teto da fila e ORÇAMENTO DE JULGAMENTO (correções 4 e 13)
- **Alvo de vazão diária (calibrar na sombra):** ~10–14 toques humanos/dia = `vazao_alvo`.
- **Orçamento explícito de tempo-por-mentorado em regime (novo — correção 4):** define-se `minutos_julgamento_alvo` por mentorado/semana (ex.: teto-alvo a calibrar na sombra). O steady-state — não só os picos vermelhos — precisa **caber** nesse orçamento × carteira, senão o módulo falha a restrição central.
- **Mínimo de campos OBRIGATÓRIOS no fluxo diário (novo — correção 4):** apenas o essencial é obrigatório (marcar marco; nota quando `avancou=true`; `valor_recebido` no fechamento monetário). Tudo mais é **default inteligente + popover opcional + captura assíncrona por token do mentorado** (`fator_ritmo`, `tipo_insatisfacao`, humor, `natureza_venda` etc. só quando o gatilho pede). `foco_n4`, re-diagnóstico, stretch e correção de rota são **eventos pontuais**, não trabalho diário.
- **Custo de atualização de receita explícito (correção 13):** enquanto não houver integração de pagamento (Fase 1.5-Receita), a governança contabiliza o **custo/semana da atualização de receita por tamanho de carteira** (snapshot mensal batelado, não por parcela) e o exibe no painel de carga.
- **Estimativa de itens/dia:** ~8–15% da carteira ativa. `v_fila_volume` mede real vs. baseline.
- **Teto visível na seção "Precisam de você" (§10.c):** top-K por prioridade (default `K = vazao_alvo`) + *"+ N aguardando"*.

### 9.5 Limite de carteira ponderado (teto a calibrar)
Peso por nível: **N1=1,5 · N2=1,3 · N3=1,0 · N4=0,6** (`sem_nivel` = N1). Capacidade-base ≈ 60–80 pontos, **estimativa provisória a validar contra o orçamento de julgamento §9.4**. Alavancas: grupos N1/N2; N4 async; integração de receita; 2ª CS ao passar do teto (§9.7).

### 9.6 SLA por severidade + escalonamento automático + BACKSTOP em CS-solo (correção 14)
- **SLA:** `risco_churn`/`sem_nivel`/`perdido`/`venda_revertida` → ≤24h; `travado (alta)`/sumido (alta)/`insatisfacao (alta)`/`bloqueio_externo (alta)` → ≤48h; `media` → dentro da cadência.
- `calc_sla_venc` grava `sla_venc_em` na criação.
- **Detector de "sinal alta não tratado":** varredura diária marca `SLA_ESTOURADO` → escalona (`status='escalado'`, `escalado_para`) + resumo + topo da Fila.
- **Modo degradado assumido enquanto CS-solo (novo):** o plano **reconhece explicitamente** que, sem 2ª CS, todo estouro e a cobertura de férias/doença roteiam para o **fundador** — o recurso mais propenso a lapsar. Por isso:
  - **(a) Plano de cobertura mínimo de ausência** (`cobertura_backstop`): antes de ausência planejada da Camila (e como default para imprevistos), registra-se **quem toca os vermelhos de 24h e como**, mesmo que seja o Mateus com um **sub-runbook de emergência** que lista **apenas `risco_churn` / `sem_nivel` / `venda_revertida`** (o mínimo que não pode esperar). RLS §6.1 dá acesso ao backstop.
  - **(b) `escalado_so_fundador`** é marcado quando o único escalado possível é o fundador — insumo do KPI §12 e gatilho de §9.7.
- **KPI de aderência ao SLA** (§12), incluindo a **fatia de estouros só-fundador**.

### 9.7 Gatilho de sobrecarga + critérios antecipados de corte + 2ª CS por SLA (correção 14)
Dispara **alerta de 2ª CS** ao Mateus quando **qualquer**:
- `v_fila_volume` acima do `vazao_alvo` por X dias (default 5), **OU**
- carga passa do teto ponderado, **OU**
- **volume de SLA estourado (especialmente `escalado_so_fundador`) acima de um limiar por semana (novo)** — amarra a contratação ao **colapso do backstop**, não só à vazão.

**Degradação controlada:**
1. **Excesso ≤20%:** ampliar peso do grupo + elevar limiar de amarelo (preservando vermelho/SLA).
2. **Excesso 20–40%:** empurrar N4 para async + adiar escopo não-crítico + priorizar integração de receita.
3. **Excesso >40% por ≥5 dias OU estouros só-fundador acima do limiar:** acionar 2ª CS antes do colapso.
Cada alavanca é config, reversível e registrada.

### 9.8 Fronteira CS × Mentor (RACI)
Camila = ritmo, acompanhamento, destravamento (execução e externo), vínculo, **Conversa de Valor**, registro de `valor_recebido`. Mateus = expertise técnica, decisões estratégicas, **auditoria amostral (§3.4, inclui monetários e `avancou`)**, sinais escalados (§9.6), decisão de re-fundação, insatisfação de metodologia/resultado escalada (§8.5), **backstop de emergência em CS-solo (§9.6)**.

---

## 10. Portal / UX (com MVP destacado)

Reusa tokens `--navy`/`--gold`, `.card`, `.badge`, `table.reino`, `.tab-btn`, Recharts. Faixas → verde #1E8449 / dourado #C9A84C / vermelho #C0392B.

### 10.a — Bloco "Plano de Sucesso" na ficha **[MVP 1a]**
Card largo: **chip de nível** (badge "SEM NÍVEL — diagnosticar" quando `sem_nivel`) + `objetivo_do_ciclo` em dourado + **meta estruturada com selo "no ritmo / atrasado" derivado automaticamente** (usa `fator_ritmo` + latência de estabilidade, §2.1); **barra de progresso**; **trilha de marcos** (espinha ✓/●/○ + paralelas, saída com etiqueta "(destrava N3)", **etiqueta "validado provisório" quando auditoria pendente**, **badge "aguardando piso/estabilidade" quando concluído provisório**, **badge "BLOQUEIO EXTERNO: sem_verba/conta_ads/…" quando aplicável**); **linha "Resultado financeiro recebido: R$ Y · contratado R$ Z · ROI Y/X"** (§7.7); **chip de satisfação** (+ última nota + `tipo_insatisfacao` se aberto); **badge "META BATIDA — definir stretch"** quando `meta_atingida_em`; rodapé com CTAs `[✓ Marcar marco concluído]`, `[registrar receita recebida]`, `[enviar check-in]` + "Último sinal de vida: há 4 dias · último progresso do mentorado: há 6 dias · `fator_ritmo` 1,3". Se `risco_churn`, faixa vermelha. Botões "sinalizar oportunidade N4", "correção de rota — rebaixar fundação", "registrar venda revertida", **"marcar bloqueio externo"**. Coleta de evidência de baixo atrito (§10.f). **Campos obrigatórios reduzidos ao mínimo (§9.4); o resto é popover opcional.**

### 10.b — Painel "Travados / Esquecidos / Insatisfeitos / Impedidos" **[MVP 1b]**
Aba "Travados". Cards de topo (Travados · Esquecidos além do SLA · Insatisfeitos · **Impedidos (bloqueio externo)** · Risco alto/`risco_churn`) + `table.reino` **ordenada por `v_fila_acompanhamento`**, bolinha 🔴/🟡/🟣(impedido), filtro por nível. Coluna "PARADO HÁ" fica vermelha ao ultrapassar o vermelho §5.1 (bloqueio externo mostra tempo creditado à parte). Ações inline. Aberta **na quarta** (§9.2).

### 10.c — "Fila de Acompanhamento de Hoje" — porta de entrada única **[MVP 1a]** (correção L)
Aba "Hoje · Acompanhamento", **mesma `v_fila_acompanhamento`**. **É o default diário da Camila.** **Não** contém renovação. Seções: **Precisam de você** (topo `sem_nivel`/`risco_churn`/`sla_estourado`/`job_parado`/`venda_revertida`/insatisfeitos/meta batida/bloqueio externo; **teto visível top-K + "+ N aguardando"**) → **Revisar/confirmar marco** (`PRONTO_SUBIR_NIVEL`) → **Revisões leves** → **Automático já cuidou (só ciência)**. Cada item é uma `tarefas`. Botões `marcar feito · adiar (+Nd) · abrir`.
- **Badges das outras telas dentro da Fila:** cabeçalho com contadores clicáveis — **"Travados: 4 · Insatisfeitos: 2 · Impedidos: 1 · Carteira: revisão sexta"**.
- Banner: "Fila hoje: 14 humanos · alvo 12 · SLA estourados: 0 (só-fundador: 0) · cobertura de log: 82% · detector: OK 07:03".

### 10.d — "Carteira por Nível" **[MVP 1b / Fase 1]**
Aba "Carteira · Níveis". Cards (Total ativo · Avançaram/mês ↑ · Travados · Impedidos · **R$ recebido no mês** · Tempo médio/marco) + BarChart empilhado (níveis × faixa) + LineChart de subidas/mês + funil de trilha + alerta de sobrecarga (§9.7) + **medidor de custo/semana de atualização de receita**. Segue a skill de dataviz. Aberta **na sexta**.

### 10.e — Captura de progresso em 1 clique
CS marca marco → `status='concluido'`; a máquina de `iniciado_em` (§3.1) inicia o próximo; popover **com o mínimo obrigatório** (nota **obrigatória se `avancou=true`**; `valor_contratado`/`valor_recebido` **obrigatórios se monetário**; humor/evidência **opcionais**) grava `progresso_checkins` e atualiza `ultimo_progresso_em` (só se `avancou=true` com nota/origem-mentorado); se marco de saída, pergunta "Subir João para N3?" (respeitando validação forte §3.3 e gate §3.6). Dispara `marco.concluido` → `fn_transicao_nivel` (§3.7).

### 10.f — Coleta de evidência e dados de baixo atrito
- **Link leve para o mentorado colar evidência já no MVP 1b:** página `/p/evidencia/:token` (token assinado, uso único, respeita `consentimentos`) com campo URL + 1 linha → `marcos.evidencia_url`. **A adoção do link é medida** para saber se o mentorado usa ou se a Camila continua sendo o caminho.
- **Mini-form de métricas N4 e de receita (Fase 1):** mesma mecânica de token alimenta `metricas_funil` e `receita_mentorado` (`origem='auto_relato'`).
- **Captura assíncrona por token para reduzir carga da CS (correção 4):** o mesmo mecanismo colhe do mentorado, quando possível, dados que senão a Camila digitaria.
> No MVP 1a, o caminho garantido de progresso é a **call com `avancou=true` + nota** (§5.1); o link do mentorado entra no 1b e sua adoção é acompanhada antes de qualquer dependência.

---

## 11. Automações de engajamento + garantia técnica (n8n + WhatsApp, por nível)

Molde existente: **reserve-before-send + idempotência**. Cada workflow: (1) seleciona por view; (2) `INSERT ... ON CONFLICT DO NOTHING` em `mensagens_enviadas` com `hash(...)`; (3) só quem ganhou a reserva recebe; (4) registra `eventos_automacao`. **Parada global:** não dispara com atividade nas últimas 48h; exige `consentimentos.whatsapp=true`; respeita horário e janela 24h.

### 11.a — Watchdog / heartbeat do detector — canal INDEPENDENTE do n8n (correção H)
- **Heartbeat:** ao concluir com sucesso, grava `job_health.ultima_exec_ok_em = now()` + `status='ok'`. Em erro, `status='erro'` + detalhe.
- **Watchdog independente do n8n:** **Supabase `pg_cron`** roda a cada hora; se `now() − ultima_exec_ok_em > 26h`, cria `JOB_PARADO` (base 90) **e dispara alerta via `pg_net` diretamente** (sem passar pelo n8n): **e-mail via Resend/SMTP** + **WhatsApp Cloud API direto**.
- **Monitor de uptime externo — obrigatório no MVP 1b:** serviço externo pinga um endpoint de saúde; sem heartbeat, alerta fora da stack Supabase/n8n.
- **Alerta de credencial WhatsApp:** o workflow testa o token no início; falha → alerta imediato por e-mail direto.
- **Teste obrigatório:** derrubar o n8n e confirmar que o alerta de `job_parado` chega por e-mail/monitor externo (§14/§16).

### Registros em `automacoes` (sem tocar nas de renovação)
| # | Workflow | Gatilho | Filtro | Ação |
|---|---|---|---|---|
| **E1** | Nudge de próximo passo | Cron diário 9h | `r_ref` na janela amarela **e** sem sinal de vida 48h | WA com o próximo passo + link de check-in |
| **E2** | Lembrete de marco/prazo | Cron diário | `prazo_alvo` (ajustado) vence em 2d | WA lembrete gentil |
| **E3** | Celebração de marco / **da VENDA (correção 5)** | Evento `marco.concluido` **ou `venda_registrada`** | Validado **ou venda paga/compensada no fechamento provisório**; se monetário, cita `valor_recebido` | WA de parabéns + próximo marco (dispara já no fechamento provisório, sem esperar a graduação formal) |
| **E4** | Pesquisa de progresso | Cron quinzenal | Ativo, sem check-in 10d+ | WA com link do mini-form |
| **E5** | Reengajamento de sumido | Cron diário | Sinal `SUMINDO` | 2 toques; silêncio → tarefa humana alta |
| **E6** | Pulso de satisfação | Cron por nível | Passou `cadencia_pulso_satisfacao_dias` | WA NPS-lite → `satisfacao_hist`; 2 sem retorno → `PULSO_SEM_RESPOSTA` |
| **E7** | Coleta de métricas/receita N4 | Cron semanal N4 | N4 ativo | WA mini-form de `metricas_funil`/`receita_mentorado`; sem retorno → `serie_estagnada`/`receita_desatualizada` |
| **E-evidência** | Solicitação de evidência | Marco de saída sem `evidencia_url` | Marco `concluido` sem evidência | WA com link `/p/evidencia/:token` que pré-preenche o registro |
| **E-gateway (Fase 1.5-Receita)** | Ingestão de pagamento | Webhook do gateway | Evento de pagamento/estorno | Grava `receita_mentorado` (`origem='gateway'`) / dispara `venda_revertida` — elimina atualização manual |

### Copy por nível
**E1 — Nudge:** N1: *"Oi João! Seu próximo passo é fechar seu nicho... Me diz em 1 frase pra quem você quer vender? 👉 {link}"* · N4 com série confiável: *"Bia, sua conversão de checkout caiu ({de X% para Y%}) — quer rodar um teste essa semana?"*
**E3 — Celebração (venda registrada, fechamento provisório):** *"🎉 João, VENDA registrada e paga (R$ recebido X)! Já estou preparando seu próximo passo — quando fechar a estabilidade a gente comemora sua subida de nível!"*
**E6 — Pulso:** *"João, rapidinho: de 0 a 10, quão bem acompanhado você tem se sentido? Responde só o número 🙏"*

---

## 12. KPIs de sucesso

| KPI | Definição | Fonte | Meta inicial |
|---|---|---|---|
| **⭐ NORTE — resultado de negócio na mentoria (% E R$ RECEBIDO), por COORTE de safra** | **Coorte por safra de entrada, com janela:** (a) **% que atingiu resultado até o FIM do contrato** e (b) **% que atingiu até o MARCO-ALVO** — resultado = ≥1 venda paga válida acima do piso (N1–N3) ou melhora sustentada/novo funil (N4); **numerador separado por nível**, com **numerador provisório** para venda em curso (concluído provisório, §2.1). **R$ RECEBIDO por safra/nível (corrido pelo recebido, nunca contratado).** Denominador = mentorados **da safra**. | `marcos` (`tipo_validacao='forte'`, `valor_recebido`), `v_receita_mentorado`, `nivel_historico`, safra de `contratos` | % ↑ por safra; R$/safra/nível com baseline na 1ª safra |
| **ROI médio por mentorado** | `receita_recebida_total` / investimento, por nível (recebido) | `receita_mentorado` × `contratos` | ↑ tendência |
| **% da safra que bateu a meta de contrato** | % que atingiu `meta_marco_alvo`/`meta_receita_alvo` até o fim, por nível | meta estruturada × marcos × `nivel_historico` | ↑ tendência |
| **% avançando de marco no prazo (ajustado)** | `concluido_no_prazo=true` / concluídos, por nível (prazo ajustado) | `marcos` | ≥60% |
| **Tempo até 1º resultado por nível** | Dias do início ao marco de saída | `marcos` + `planos_sucesso` | Cair por safra |
| **Progressão de nível** | Nº que subiram/mês (re-fundação à parte) | `nivel_historico` | ↑ |
| **Vencedores precoces reativados** | % de `meta_atingida_cedo` com stretch definido + renovação antecipada | `mentorados`, `sinais_mentorado` | ≥80% |
| **Taxa de resgate de travados** | Travados que voltaram a avançar em ≤14d | `sinais_mentorado` | ≥50% |
| **Taxa de destravamento externo** | % de `bloqueio_externo` resolvido em ≤14d | `sinais_mentorado` | ≥70% |
| **Taxa de recuperação de sumidos** | Sumidos que responderam no resgate | `sinais_mentorado` + `mensagens_enviadas` | ≥40% |
| **Satisfação / recuperação de insatisfeitos** | Nota média; % de `insatisfacao` resolvida em ≤1 ciclo; taxa de resposta ao pulso | `satisfacao_hist`, `sinais_mentorado` | Nota ≥8; recuperação ≥60% |
| **Integridade de venda** | % de vendas fracas/complacência/parcela-única/**sem evidência de comprador** barradas; nº de `venda_revertida`; **taxa de `avancou=true` por CS (inflação)** | `marcos.tipo_validacao`, `auditoria_marco`, `progresso_checkins` | reversões → mínimo; taxa `avancou` estável |
| **Cobertura de acompanhamento** | % da carteira sem "esquecido" além do SLA (inclui N4, `sem_nivel`, meta batida) | detector diário | ≥90% |
| **Cobertura de log de progresso** | % de toques logados com `avancou`/evidência (gate de modo conservador, §5.1) | `progresso_checkins` | ≥ `cobertura_log_alvo` |
| **Aderência ao SLA** | % de sinais `alta` tocados no SLA; nº de estourados/mês; **fatia de estouros cujo único escalado é o fundador (§9.6)** | `sinais_mentorado`, `v_sla_estouros` | ≥95%; estourado → 0; só-fundador ↓ |
| **Saúde do detector** | % de dias com execução OK; alertas `job_parado`/mês | `job_health` | ≥99%; `job_parado` → 0 |
| **Qualidade de validação** | % de spot-checks `ok` (por origem: não-monetário / graduação monetária / call `avancou`); % de "validado provisório" pendentes | `auditoria_marco`, `marcos.auditoria_status` | ≥90% `ok`; provisórios baixos |
| **Frescor da receita** | % de mentorados com marco monetário e receita atualizada ≤X dias; **custo/semana de atualização por carteira** | `receita_mentorado`, sinal `receita_desatualizada` | ≥90% |
| **Vazão e carga** | Itens humanos/dia vs. `vazao_alvo`; **minutos de julgamento/mentorado vs. orçamento (§9.4)**; pontos ponderados/CS vs. teto | `v_fila_volume` | < teto/orçamento; sobrecarga = §9.7 |

---

## 13. Roadmap por fases — MVP re-sequenciado, com sizing por agente/entregável (correções G, 11, 15, 16)

> O risco real é o MVP **atrasar/incompletar**. O Sprint 1 é dividido em **1a (núcleo verificável) + 1b (blindagem)**, cada corte com **critério de aceite explícito**. **Sizing baseline (correção 15): 1a com 2 devs** (o próprio plano nota que "com 2 devs comprime"), OU, se só houver 1 dev, **1a cortado ao mínimo absoluto** (ver abaixo). **Estimativa por agente/entregável publicada** para tornar o risco de atraso visível item a item.

### Sprint 1a — Núcleo "ninguém esquecido, ponta a ponta" — estimativa por entregável
> **Dependência crítica:** seeds → máquina `iniciado_em`/progresso/bloqueio → `v_dias_no_marco`/`r_ref`/`dias_sem_progresso` → detector → `v_fila_acompanhamento` → Fila de Hoje.

| Entregável | Agente | Estimativa (1 dev) | No 1a mínimo (1 dev)? |
|---|---|---|---|
| Enums + `catalogo_marcos` (4 trilhas + N4-A/N4-B) + `planos_sucesso` (índice parcial + ciclo + trigger) + `marcos` (progresso/bloqueio/venda) + `progresso_checkins` + `receita_mentorado` + `parametros_nivel` (com `dias_esperados_min` 7/7/7/10 + `dias_sem_progresso_teto` + estabilidade + `venda_forte_regra`) + `sinais_mentorado` + `job_health` + ALTER `mentorados` | Schema | ~5–6 d | Sim |
| **RLS de escalonamento/backstop completo** | Schema | ~2 d | **Adiado p/ 1b** |
| Seeds + calibração `horizonte_meta` (com estabilidade) | Conteúdo de Trilha | ~2 d | Sim (calibração simplificada) |
| `norm_bool`/`calc_nivel_entrada`/`calc_progress_score` (degradado, piso)/`calc_prioridade` + `v_dias_no_marco` (`r_ref`) + `v_travados` + `v_fila_acompanhamento` | SQL/Analytics | ~4–5 d | Sim |
| `v_fila_volume`, `v_receita_mentorado`, `v_sla_estouros` (views analíticas) | SQL/Analytics | ~2 d | **Parte adiada p/ 1b** |
| Onboarding Q1–Q4 + `fator_ritmo` + meta + gate N3+/N2 + default `sem_nivel` + máquina `iniciado_em`/progresso/desbloqueio | Onboarding | ~4 d | Sim |
| Ficha (§10.a) + Fila de Hoje (§10.c) com teto/badges + marcação 1 clique + captura `valor_recebido` | Frontend | ~6–7 d | Sim |
| Detector diário: **1a mínimo = travado (`r_ref`/disjuntivo/modo conservador) + sumindo + sem_nivel** + heartbeat básico + E1 | n8n Detecção | ~4 d | Sim (queda/oportunidade/receita adiados) |
| Runbook + cartão por item + **ramp de adoção faseada da Camila** | CS Enablement | ~2 d | Sim |

- **✅ Critério de aceite 1a:** *(1) dado um mentorado de cada nível + 1 `sem_nivel`, o detector classifica travado/sumido corretamente (falso-positivo de travado E taxa `avancou=true` medidos e aceitáveis na sombra; abrir frente nova NÃO silencia o vermelho); (2) **teste de adoção (correção 16): a Camila tria a Fila de Hoje sozinha, sem abrir outras telas, com X% de decisões corretas**, marca marco em 1 clique e o próximo abre.* Este corte **já entrega a promessa central**.

### Sprint 1b — Blindagem de processo
- **SLA + escalonamento** + `sla_venc_em` + `escalado_so_fundador` + **RLS de escalonamento/backstop** + `cobertura_backstop` + sub-runbook de emergência (§9.6).
- **Watchdog independente do n8n** (§11.a) + monitor externo obrigatório + alerta de credencial.
- **Meta com selo automático** (com estabilidade) + `meta_atingida_cedo` (§2.2).
- **Botão re-fundação** + `fn_transicao_nivel` transacional (ordem UPDATE→INSERT, teste do trigger §3.7).
- **Bloqueio externo** (§3.1.8/§8.6) + sinal `BLOQUEIO_EXTERNO` + `SEM_LOG_PROGRESSO` + `REVISAR_FATOR_RITMO`.
- **Link de evidência** `/p/evidencia/:token` + medição de adoção.
- **Aba Travados/Insatisfeitos/Impedidos** (§10.b) + **Conversa de Valor** (§8.5) + **Destravamento externo** (§8.6) + recursos.
- **Auditoria à prova de fundador** (§3.4): fila batelada (não-monetário + graduação monetária + `avancou`) + fallback + `auditoria_acumulada`.
- **QUEDA_PROGRESSO** com `progresso_score_snapshot` (correção 11) + views analíticas restantes.
- **✅ Critério de aceite 1b:** *SLA estoura → escalona → 2ª CS/backstop enxerga/edita (QA RLS); n8n derrubado → alerta `job_parado` por canal independente; meta batida → stretch; re-fundação numa transação sem violar constraint e com `nivel_atual` correto; bloqueio externo não vira travado; celebração da venda dispara no fechamento provisório.*

### Sprint 1.5 — visão, celebração e recursos
- Aba **Carteira por Nível** inicial (§10.d) + alerta de sobrecarga (§9.7) + medidor de custo de receita.
- **E3** (com celebração da venda) + **E-evidência** + `recursos_cs` (4 recursos-chave + `roteiro_conversa_de_valor` + `checklist_destravamento_externo`).
- **Pulso de satisfação básico** (`satisfacao_hist` + E6 + `insatisfacao` + `pulso_sem_resposta`).

### Fase 1 — captura sem atrito + engajamento + grupos + métricas/receita N4 + satisfação plena
- Edge Functions `checkin-token`/`evidencia-token`/`metricas-token`/`marco-webhook`; mini-forms.
- `presencas` (Zoom/Meet, incl. grupos) + `entregas` + `calc_engajamento` → **Progress Score pleno (40/20/20/20)**.
- Grupos N1/N2 operacionalizados (§8.2) + **supressão de travado por presença em grupo em produção**.
- `metricas_funil` + E7 + `OPORTUNIDADE` automático com gate + `serie_estagnada` + `receita_desatualizada`.
- Satisfação plena; E2, E4, E5; `objetivos_ciclo` + históricos + `PRONTO_SUBIR_NIVEL`.

### **Fase 1.5-Receita — integração de pagamento (nova, datada — correção 13)**
- **Escopo:** webhook do gateway → `receita_mentorado` (`origem='gateway'`) + `venda_revertida`; reconciliação automática do recebido sem trabalho manual por parcela.
- **Esforço estimado:** ~1–1,5 semana (1 dev), dependente do gateway usado.
- **Por que datada e não "aspiracional":** é o que torna o **KPI norte em R$ sustentável em escala** e remove o custo/semana de atualização manual da governança de vazão (§9.4).

### Fase 2 — escala e refino
- `nivel_historico` completo + relatório por coorte (incl. re-fundações, vencedores precoces, provisórios).
- Painel de carga ponderada + gatilho de 2ª CS por SLA + critérios de corte §9.7 calibrados.
- Biblioteca completa `recursos_cs`.
- Ajuste fino de `parametros_nivel`, SLAs, cadência de pulso, `venda_forte_regra`, janela de estabilidade, teto de vazão, `cobertura_log_alvo`.

---

## 14. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| **LGPD** | Todo disparo checa `consentimentos.whatsapp=true`; tokens assinados, uso único; **RLS explícita (§6.1)**. |
| **Falso-positivo / ruído** | 11 regras (§7.3): dedupe, filtro de estágio, `pausado_ate`, janela 7d, frente-espinha (`r_ref`), `fator_ritmo`, severidade, sinal resolvido, bloqueio externo fora do travado, supressão por grupo + modo conservador, falso-positivo medido na sombra. |
| **Falso-NEGATIVO do detector (frente nova silencia / espinha travada mascarada)** | **`r_ref` = espinha/max, nunca `min`; vermelho disjuntivo com `dias_sem_progresso_teto`; exemplo demonstrado (§5.1).** |
| **`avancou=true` inflado zera o relógio** | Exige nota (evidência); amostra de calls `avancou=true` na auditoria; taxa `avancou` por CS como KPI (§3.4/§5.1/§12). |
| **Toque da CS reseta relógio** | `dias_sem_progresso` conta só progresso de origem-mentorado; interações/`cs_manual` excluídos (§5.1). |
| **Sinais cegos por dados escassos no MVP** | Call `avancou=true`+nota como caminho garantido; presença em grupo suprime; modo conservador enquanto cobertura de log baixa; `SEM_LOG_PROGRESSO` distingue não-logado; adoção do link medida (§5.1/§7.6/§10.f). |
| **Bloqueio externo de tráfego/verba tratado como travado** | `motivo_bloqueio` externo pausa a régua + credita tempo + sinal próprio + playbook §8.6 (§3.1.8). |
| **Régua ignora banda real / muda sem insatisfação** | `fator_ritmo` aplicado + **revisão periódica em transição de fase e lentos crônicos** (§3.1.5). |
| **`dias_esperados_min`/`teto` indefinidos** | Fixados (7/7/7/10; 21/21/21/30) no seed e nos exemplos SQL; validados na sombra. |
| **Bug de cast boolean no diagnóstico** | `norm_bool` + guard → `sem_nivel` (§4). |
| **Resultado contado pelo CONTRATADO / parcelado graduando falso** | `valor_contratado` vs `valor_recebido`; piso por `pct_min_recebido`; estabilidade cobrindo chargeback; `venda_revertida`; KPI pelo recebido (§3.3/§7.7/§12). |
| **Venda de amigo classificada como fora_circulo** | `evidencia_comprador` obrigatória + **graduações monetárias na amostra de auditoria** (§3.3/§3.4). |
| **Celebração negada por 90 dias desmotiva** | E3 no fechamento provisório; graduação formal gated pela estabilidade (§3.3/§7.7/§11). |
| **Viabilidade da meta otimista (ignora estabilidade)** | `dias_esperados_estabilidade` no `horizonte_meta`; régua recalibrada; provisórios tratados na cadência/KPI (§2.1). |
| **Avançando porém insatisfeito** | Pulso + `insatisfacao` + Conversa de Valor por tipo (§7.6/§8.5). |
| **Vencedor precoce esfria** | `meta_atingida_cedo` → stretch + manutenção + renovação antecipada (§2.2). |
| **N4 novo funil na trilha errada** | `foco_n4` escolhe a trilha: N4-B de construção vs. N4-A de otimização (§2/§3.5). |
| **Fundação fraca em N3/N4 escalando** | Re-fundação generalizada + "correção de rota" (§3.6/§8.3). |
| **Fontes de nível divergentes / transição quebra constraint** | Invariante único + trigger + transação UPDATE→INSERT (sem DEFERRABLE) + teste do estado intermediário (§3.7/§6). |
| **Detector falha em silêncio / alerta via o próprio n8n** | Heartbeat + watchdog `pg_cron`/`pg_net` independente + monitor externo + teste com n8n derrubado (§11.a). |
| **Auditoria depende da agenda do fundador** | Fila batelada com teto + fallback + `auditoria_acumulada` (§3.4). |
| **Receita em R$ vira trabalho manual infinito** | Modelo enxuto (fechamento + snapshot mensal, `pct_min_recebido`) + integração de pagamento datada (Fase 1.5-Receita) + custo/semana na governança (§7.7/§9.4/§13). |
| **QUEDA_PROGRESSO com baseline arbitrário** | `progresso_score_snapshot` diário + janela `[hoje-9d,hoje-5d]`; senão delta `indisponivel` (§7.2/§7.5). |
| **Carga de julgamento da Camila estoura o orçamento** | Orçamento explícito + mínimo de campos obrigatórios + captura assíncrona; aceite da sombra confere steady-state (§9.4/§16). |
| **Backstop = o próprio fundador em CS-solo** | Modo degradado assumido + plano de cobertura + sub-runbook de emergência + `escalado_so_fundador` + gatilho de 2ª CS por SLA (§9.6/§9.7/§12). |
| **Superfície de telas confunde CS solo / adoção parcial** | Fila de Hoje única + badges + **adoção faseada da Camila + teste de adoção no aceite do 1a** (§10.c/§13/§16). |
| **Escalonamento barrado por RLS** | Policies incluem `escalado_para` + backstop; QA cobre o caminho (§6.1). |
| **MVP grande demais** | 1a com 2 devs OU 1a mínimo cortado; estimativa por agente/entregável; aceite por corte (§13). |
| **Spam / queimar número** | Reserve-before-send + idempotência; parada 48h; máx. 1 resgate/mês; nunca 3º toque automático. |

---

## 15. Time de agentes de execução

| # | Tarefa importante | Agente especialista | Entregável |
|---|---|---|---|
| 1 | Enums (incl. `motivo_bloqueio`, `foco_n4`) + migrations + ALTER + índice parcial/ciclo + **trigger de sincronização** + `metricas_funil`/`receita_mentorado`/`satisfacao_hist`/`progresso_score_snapshot`/`auditoria_marco`/`recursos_cs`/`job_health`/`cobertura_backstop` + **RLS explícita (§6.1)** | **Agente Schema/Migrations Supabase** | Migrations SQL + policies + trigger |
| 2 | Seed `catalogo_marcos` (4 trilhas + N4-A/N4-B) + `parametros_nivel` (fatores + `dias_esperados_min` 7/7/7/10 + `dias_sem_progresso_teto` + estabilidade + `venda_forte_regra` + `auditoria_*` + `cobertura_log_alvo`) + **calibração `horizonte_meta` com folga × ritmo × estabilidade** | **Agente Conteúdo de Trilha** | Seeds SQL + conferência da meta |
| 3 | `norm_bool`, `calc_nivel_entrada`, `calc_progress_score` (piso), `calc_satisfacao`, `calc_engajamento`, `calc_prioridade`, `calc_sla_venc`, `calc_horizonte_meta`, `fn_transicao_nivel`, `fn_sync_nivel_atual` + views (`v_fila_acompanhamento`, `v_dias_no_marco` com **`r_ref`** + `dias_sem_progresso` origem-mentorado, `v_fila_volume`, `v_receita_mentorado`, `v_sla_estouros`) | **Agente SQL/Analytics** | Funções + views testadas |
| 4 | Diagnóstico Q1–Q4 + `fator_ritmo` (+ revisão periódica) + meta estruturada + gate N3+/N2 + re-diagnóstico N4 (escolhe trilha) + stretch + re-fundação + default `sem_nivel` + máquina `iniciado_em`/progresso/desbloqueio (interno+externo) | **Agente Onboarding/Diagnóstico** | Fluxo + Edge Function `diagnosticar-nivel` |
| 5 | Bloco Plano de Sucesso na ficha (§10.a): marcos paralelos + meta + resultado recebido + satisfação + badges (meta batida, validado provisório, aguardando estabilidade, bloqueio externo) + botões oportunidade/re-fundação/venda revertida/bloqueio externo; **mínimo de campos obrigatórios** | **Agente Frontend Ficha** | Componente React + marcação 1 clique |
| 6 | **Fila de Hoje (§10.c) porta única, teto/top-K + badges** + Travados/Insatisfeitos/Impedidos (§10.b) via `v_fila_acompanhamento` | **Agente Frontend Filas** | 2 abas `/cs/*` + banner (vazão/cobertura log/SLA só-fundador/saúde do job) |
| 7 | Carteira por Nível + gráficos (R$ recebido) + alerta de sobrecarga + medidor de custo de receita | **Agente Frontend Dataviz (Recharts)** | BarChart, LineChart, funil de trilha |
| 8 | Edge Functions `checkin-token` + `evidencia-token` + `metricas-token` + `marco-webhook` + **webhook do gateway (Fase 1.5-Receita)** + mini-forms | **Agente Edge Functions/Captura** | Páginas `/p/*` + webhooks |
| 9 | Detector diário (progresso `r_ref`/disjuntivo + supressão grupo + modo conservador + bloqueio externo + `sem_log_progresso` + sumindo + insatisfação + `pulso_sem_resposta` + `sem_nivel` + queda/oportunidade/serie/receita/`meta_atingida_cedo`/`venda_revertida`/`auditoria_acumulada`/`revisar_fator_ritmo` + SLA/escalonamento) + heartbeat | **Agente n8n Detecção** | Workflow 07:00 BRT + anti-ruído |
| 10 | **Watchdog independente (`pg_cron`/`pg_net`, Resend/SMTP + WhatsApp direto) + monitor externo** + alerta de credencial | **Agente Confiabilidade/Watchdog** | Watchdog + teste com n8n derrubado |
| 11 | Automações E1–E7 + E-evidência + **E-gateway** + copy por nível (celebração da venda) | **Agente n8n Engajamento/WhatsApp** | Workflows reserve-before-send |
| 12 | Presença (Zoom/Meet, incl. grupos) + entregas + **snapshot mensal de receita / ingestão de gateway** | **Agente Integrações** | Webhooks + forms → tabelas |
| 13 | Playbooks + **Conversa de Valor (§8.5) + Destravamento externo (§8.6)** + `recursos_cs` + grupos N1/N2 + **runbook + cartão por item + ramp de adoção faseada da Camila** | **Agente Playbooks/CS Enablement** | Playbooks + recursos + runbook |
| 14 | Painel de carga ponderada + **orçamento de julgamento** + governo de vazão + gatilho de 2ª CS (por vazão E SLA) + backstop de ausência + critérios de corte | **Agente Capacidade/Operações** | `v_fila_volume` + `cobertura_backstop` + regras |
| 15 | LGPD + QA anti-falso-positivo/negativo (**`r_ref`/disjuntivo, frente nova não silencia**, origem-mentorado, `avancou` evidência, desbloqueio interno+externo, `fator_ritmo`, SLA) + **teste RLS de escalonamento/backstop + auditoria (monetário+`avancou`) + venda parcelada/estabilidade/reversão + transação UPDATE→INSERT (0/2 planos nunca)** | **Agente Compliance/QA** | Checklist LGPD + suíte de testes |
| 16 | KPIs + dashboards (KPI norte em % e R$ recebido por coorte/safra; satisfação; saúde do job; frescor de receita; cobertura de log; SLA só-fundador; taxa `avancou`) | **Agente KPIs/BI** | Painel §12 + correlações |
| 17 | Orquestração e integração final (Sprint 1a → 1b → 1.5 → Fase 1.5-Receita → Fase 2), **estimativa por agente/entregável** | **Agente Tech Lead/Integrador** | Roadmap + critérios de aceite por corte |

---

## 16. Próximos passos imediatos

1. **Aprovar a nomenclatura oficial** (§6) e congelar nomes — incluindo `motivo_bloqueio`, `foco_n4`, `r_ref`, `dias_sem_progresso_teto`, `evidencia_comprador`, `conquista_registrada_em`, `dias_esperados_estabilidade`, `venda_forte_regra`, `cobertura_log_alvo`, `escalado_so_fundador`, `progresso_score_snapshot`, `cobertura_backstop`.
2. **Camila valida os seeds contra a meta COM FOLGA, RITMO E ESTABILIDADE:** as 4 trilhas (incl. N4-A/N4-B), `dias_esperados`, `dias_esperados_min` (7/7/7/10), `dias_sem_progresso_teto` e as réguas — **conferindo automaticamente que `horizonte_meta` (execução × ritmo + estabilidade × folga 1,3) cabe em `dias_ate_fim`** antes de comunicar a meta na 1ª call (§2.1).
3. **Definir com Camila e Mateus:** SLAs por severidade, `vazao_alvo` e **`minutos_julgamento_alvo`** iniciais, cadência do pulso, **`venda_forte_regra` (priorizar `pct_min_recebido`) e `janela_estabilidade_venda_dias` por meio de pagamento**, `dias_receita_desatualizada`, `auditoria_teto_semanal`/`auditoria_fallback_dias`/`auditoria_modo_fallback`, **`cobertura_log_alvo`**, destino do escalonamento, **plano de backstop de ausência + sub-runbook de emergência (risco_churn/sem_nivel/venda_revertida)**, e destino dos alertas de `job_parado`/credencial.
4. **Agente Schema** aplica migrations do Sprint 1a (RLS de escalonamento/backstop no 1b) + índice parcial + **trigger de sincronização** em branch de dev.
5. **Agente Onboarding** implementa diagnóstico Q1–Q4 (com `norm_bool`), `fator_ritmo`, meta estruturada, gates N3+/N2, `foco_n4`→trilha, re-fundação e a máquina de estados; **testar com 3 mentorados de cada nível + 1 `sem_nivel` + 1 `diagnostico_score` com "sim"/"talvez" (cai sem erro) + 1 rebaixamento N4→N2 numa transação (verificar que 0 ou 2 planos ativos NUNCA aparecem fora da transação e que `nivel_atual` fica correto)**.
6. **Agente Frontend** entrega ficha (resultado recebido + satisfação + badges + mínimo de campos) + **Fila de Hoje como porta única com badges** lendo a mesma `v_fila_acompanhamento`.
7. **Agente n8n** sobe o workflow diário do **1a mínimo (travado com `r_ref`/disjuntivo/modo conservador + sumindo + sem_nivel)** + E1 + heartbeat, valida a fila priorizada, o modo degradado com piso e **demonstra que abrir frente nova não silencia o vermelho**. No 1b, sobe SLA/escalonamento + bloqueio externo + **watchdog independente e testa com o n8n intencionalmente derrubado**.
8. **CS Enablement — adoção FASEADA da Camila (correção 16):** **dia 1** ela faz **apenas triar a Fila de Hoje e marcar marco**; **semana 2** acrescenta Conversa de Valor e receita; **semana 3** pulso/auditoria/destravamento — casado com os cortes 1a/1b. Entregar **runbook de 1 página + cartão "por tipo de item → pronto + única ação" + roteiro da Conversa de Valor** antes da sombra. **Critério de aceite do 1a: a Camila tria a Fila de Hoje sozinha, sem abrir outras telas, com X% de decisões corretas, antes de expor o resto da superfície.**
9. **Semana de sombra:** a Camila usa a Fila de Hoje em paralelo, **medindo o tempo real por toque (vs. `minutos_julgamento_alvo`), a taxa de falso-positivo de travado, a taxa `avancou=true`, a cobertura de log e a adoção do link de evidência**; **verificar que o STEADY-STATE (não só os picos vermelhos) cabe no `vazao_alvo` e no orçamento de julgamento (§9.4)**; se exceder, aplicar os critérios de corte §9.7; ajustar réguas/SLAs e **só então ligar E2/E4/E5/E6/E7 (gated pela cobertura de log)**.
10. **Definir metas dos KPIs** (§12), com destaque para a **baseline do KPI norte por COORTE de safra em % E R$ RECEBIDO por nível** (`v_receita_mentorado`), a meta de satisfação, a de frescor/custo de receita, a de saúde do detector, a de cobertura de log e a **fatia de SLA só-fundador**; agendar a Fase 1.5-Receita (integração de pagamento) e marcar a 1ª revisão de carteira ponderada + vazão + receita recebida atribuída.

---

## Apêndice · Backlog de melhorias (apontamentos dos supervisores)

> Refinamentos levantados pelo time supervisor e ainda não incorporados ao corpo do plano (nota estabilizou em 9,3). Nenhum é bloqueador. O item de maior valor recorrente: **escrever o conteúdo real dos 6 playbooks/recursos-núcleo** (filtro de nicho N1, one-pager de oferta N2, checklist de setup de funil N3, leitura de métricas N4, roteiro de conversa de valor, checklist de destravamento) — hoje estão nomeados, não redigidos.

**1. [🟡 Média] O conteudo real dos playbooks de intervencao/resgate e dos recursos (filtro_de_nicho_n1, one_pager_oferta_n2, checklist_setup_funil_n3, template_leitura_metricas_n4, roteiro_conversa_de_valor, checklist_destravamento_externo) esta apenas NOMEADO e esquematico ('reduzir escopo -> filtro de 3 perguntas -> 2 melhores -> teste 48h'), e sua autoria esta empurrada para Fase 1.5/Fase 2. Pela lente CS, e exatamente esse conteudo que faz o mentorado destravar e avancar de verdade. Um playbook nomeado nao 'resolve de verdade'; a espinha de deteccao/processo esta em nivel 9.7, mas a substancia de intervencao esta em ~8.5.**

› _Como resolver:_ Escrever o conteudo real dos 6 recursos-nucleo (roteiro passo-a-passo + criterio de saida + script de call de 20 min + gatilho de escalonamento ao Mateus) e valida-los com a Camila ANTES da semana de sombra, puxando esse entregavel para o Sprint 1b (nao Fase 1.5/2). Sem os recursos autorados, as abas de Travados/Conversa de Valor/Destravamento sao cascas.

**2. [🟡 Média] O plano ancora sucesso nos marcos/meta derivados do SISTEMA (meta_marco_alvo, meta_receita_alvo, objetivo_do_ciclo), mas nao captura como campo de primeira classe a DEFINICAO DE SUCESSO DO PROPRIO MENTORADO - o objetivo pessoal/financeiro que ELE veio buscar. Em CS de high-ticket, o alinhamento com a meta declarada pelo cliente e o que sustenta a Conversa de Valor (tipo 'expectativa'/'resultado') e a narrativa de renovacao. Sem esse ancoramento, 'recontratar expectativa contra a meta estruturada' (§8.5) recontrata contra uma meta que o sistema definiu, nao contra a promessa que o mentorado ouviu na venda.**

› _Como resolver:_ Adicionar no diagnostico/onboarding (§4) o campo obrigatorio 'objetivo_declarado_mentorado' (meta financeira/de negocio em palavras dele + prazo desejado), exibi-lo na ficha ao lado da meta estruturada, e usa-lo como referencia explicita na Conversa de Valor (tipo expectativa/resultado) e na regua de renovacao. Revisitar em cada transicao de fase.

**3. [🟡 Média] A re-fundacao (fundacao fraca de posicionamento/oferta descoberta durante a execucao de N3/N4) e tratada como acao REATIVA disparada quando a CS percebe o problema - potencialmente semanas ou meses depois, com custo emocional e de tempo altos para o mentorado. O gate de qualidade cobre a ENTRADA em N3+, mas nao ha checkpoint proativo para o mentorado que ENTROU legitimamente e cuja fundacao se revela fragil na pratica.**

› _Como resolver:_ Instituir um checkpoint explicito de 'validacao de fundacao' na fase de Arranque para todo entrante N2+ (ex.: revisao obrigatoria de posicionamento/oferta nos primeiros 21 dias) com um sinal 'FUNDACAO_FRAGIL' (baixa/media) quando a CS marcar que a base nao sustenta, acionando a correcao de rota cedo em vez de deixar o mentorado escalar trafego sobre fundacao ruim.

**4. [🟡 Média] Limbo do conjunto ativo vazio entre 'concluido provisorio' e graduação. Nos marcos monetários, ao fechar provisoriamente (tipo_validacao=fraca, aguardando piso+estabilidade 30-90d) o marco sai do conjunto ativo (status=concluido), mas a graduação — que inicia o 1º marco da próxima trilha com iniciado_em=now() — fica GATED pela estabilidade. Nesse intervalo o mentorado pode ficar com ZERO marco em_andamento. v_dias_no_marco / r_ref ficam NULL sobre conjunto vazio e o comportamento do detector (e do componente tempo_marco do Progress Score) não está especificado. O plano afirma 'não é tratado como travado', mas não define o SQL que garante isso para conjunto ativo vazio.**

› _Como resolver:_ Especificar explicitamente o estado 'aguardando_estabilidade' no detector: quando não há marco em_andamento porque a espinha está concluido-provisório, suprimir TRAVADO e SEM_LOG_PROGRESSO por essa causa, r_ref tratado como não-aplicável (não NULL propagando para predicado), e manter apenas a tarefa leve 'aguardando piso/estabilidade' + o piso de vigilância de esquecido. Adicionar caso de QA no §14 cobrindo mentorado sem nenhum marco em_andamento.

**5. [🟡 Média] Hand-waving na fórmula interna do calc_progress_score. O componente 'Tempo no marco' (peso 40) diz apenas 'usa r_ref + dias_sem_progresso'; não há mapeamento definido de (r_ref, dias_sem_progresso) para o escore 0-40, nem os cortes numéricos que ligam r_ref às faixas. Idem para 'Ritmo recente' (definição de 'no prazo' com prazo ajustado) e 'Recência'. Sem isso o número não é reproduzível e o Agente SQL/Analytics precisa inventar a curva, gerando divergência entre score numérico e o predicado de faixa da §5.1.**

› _Como resolver:_ Publicar a função de pontuação de cada componente (ex.: tempo_marco = clamp linear/por faixas de r_ref ancorado em fator_travado_amarelo/vermelho do nível; ritmo = %concluido_no_prazo com neutro 60; recência = decaimento por dias). Fixar que o piso de faixa (§5.1) sempre vence o corte numérico e documentar em componentes jsonb qual regra dominou, para o QA conferir score vs faixa.

**6. [🟡 Média] Escopo de cobertura_log_alvo indefinido. O 'modo conservador' desliga o vermelho automático enquanto cobertura_log_call < cobertura_log_alvo, mas não se define se a cobertura é medida GLOBALMENTE, por CS ou por mentorado/segmento. Se global, um segmento bem logado tem o vermelho suprimido por causa de outro mal logado; e no go-live (cobertura baixa por definição) o detector de travado fica efetivamente OFF — justamente a promessa central 'ninguém esquecido' fica fraca no momento de maior risco.**

› _Como resolver:_ Definir a granularidade da cobertura (recomendado: por CS e por faixa de nível, não global) e a condição de saída do modo conservador por segmento. Documentar EXPLICITAMENTE o backstop manual do período de rampa: enquanto em modo conservador, a Fila de Hoje força revisão humana batelada dos amarelos + SEM_LOG_PROGRESSO com SLA, para que a supressão do vermelho automático não vire ausência de vigilância.

**7. [🟡 Média] Os criterios de aceite mais importantes usam limiares nao definidos como 'gate' carregando peso: aceite do 1a exige que a Camila trie a Fila 'com X% de decisoes corretas' e o teste de adocao fala em 'X% da carteira', mas X nunca e fixado. Um gate de aprovacao com placeholder nao e falsificavel — na pratica qualquer resultado 'passa'.**

› _Como resolver:_ Fixar numeros concretos antes da sombra: ex. '>=85% de decisoes de triagem corretas em amostra auditada pelo Mateus' e '>=90% dos itens da Fila resolvidos sem abrir outra tela'. Sem numero fechado, o aceite do 1a nao pode ser marcado como cumprido.

**8. [🟡 Média] A restricao CENTRAL de escala (steady-state cabe na capacidade da Camila) fica sem ancora numerica inicial. vazao_alvo tem faixa (~10-14), mas minutos_julgamento_alvo, cobertura_log_alvo, teto ponderado e capacidade-base sao todos 'a calibrar na sombra'. A primeira sombra precisa de um alvo previo para testar CONTRA; medir sem alvo inicial e circular e nao prova que o modelo cabe na operacao de 1 CS.**

› _Como resolver:_ Publicar valores PROVISORIOS explicitos para a 1a medicao (ex. minutos_julgamento_alvo ~X min/mentorado/semana, cobertura_log_alvo ~70% no arranque subindo para 85%, capacidade ~N mentorados ponderados por CS-solo) e declarar o resultado esperado do steady-state por tamanho de carteira, para a sombra confirmar/refutar em vez de apenas 'descobrir'.

**9. [🟡 Média] Apesar do faseamento, a superficie operacional em regime para uma CS-SOLO permanece grande: na semana 3 a Camila acumula triagem + Conversa de Valor (5 tipos) + registro de receita + pulso + destravamento externo, com ~20 tipos de sinal por tras. O plano prova o desenho da alivio, mas nao demonstra que o regime cabe — e o unico backstop e o proprio fundador.**

› _Como resolver:_ Adicionar um checkpoint de operabilidade em REGIME apos a semana 3 de adocao (nao so a sombra pre-lancamento) com go/no-go: se minutos_julgamento exceder o orcamento, congelar escopo. Definir explicitamente um 'modo minimo de sobrevivencia' — quais sinais sao suprimiveis/rebaixaveis quando a CS satura — para que a degradacao seja pre-decidida e nao improvisada sob pressao.

**10. [⚪ Baixa] Nos niveis pre-receita (N1 e parte do N2) ha um trecho de varias semanas (dias_esperados N1 ~= 31 de execucao ideal, maior com folga) sem nenhuma vitoria externa/monetaria. O plano detecta 'travado' muito bem, mas subespecifica a narrativa mentee-facing de 'sensacao de vitoria' nesse trecho: a celebracao E3 dispara na conclusao de marco, porem o mentorado N1/N2 pode se sentir 'so estudando' sem resultado tangivel, o que e um vetor de churn silencioso que Progress verde nao captura.**

› _Como resolver:_ Definir para cada marco nao-monetario de N1/N2 o 'entregavel que o mentorado passa a possuir e pode usar' (ex.: documento de posicionamento acionavel, one-pager de oferta pronto para mostrar) e enquadrar E3/copy como vitoria concreta ('agora voce tem X'), reforcando percepcao de progresso antes da primeira venda.

**11. [⚪ Baixa] O plano e prescritivo/linear quanto a trilha e ao nivel diagnosticado, mas nao trata o caso do mentorado que DISCORDA do nivel diagnosticado ou resiste a trilha (ex.: diagnosticado N1 mas quer rodar ads ja). Re-fundacao cobre o recuo tecnico, nao a divergencia de expectativa no arranque.**

› _Como resolver:_ Adicionar no runbook de Arranque uma nota de co-construcao: como a Camila apresenta o nivel/trilha como recomendacao (nao imposicao), registra a divergencia, e usa o objetivo_declarado do mentorado para reconciliar - evitando que o mentorado sabote a trilha por nao ter comprado o diagnostico.

**12. [⚪ Baixa] fn_sync_nivel_atual: a justificativa atribui a proteção do estado intermediário (0 planos ativos) ao coalesce, mas quando a subconsulta FROM não retorna linha o UPDATE afeta zero linhas e o coalesce sequer executa — a proteção real vem do join vazio, não do coalesce. Além disso o trigger re-consulta planos_sucesso duas vezes (para nivel e para mentorado_id) sem ordenação no limit 1 do mentorado_id.**

› _Como resolver:_ Corrigir a nota técnica (a proteção vem do join sem linhas) e simplificar o trigger para uma única leitura do plano ativo; adicionar teste de QA que confirme, dentro da transação UPDATE->INSERT, que nivel_atual nunca zera nem fica com dois valores visíveis fora da transação (já previsto no §14, mas amarrar ao comportamento correto do join vazio).

**13. [⚪ Baixa] Latência de detecção de META_ATINGIDA_CEDO e RECEITA por meta_receita_alvo depende do snapshot mensal / review de sexta enquanto não há gateway (Fase 1.5-Receita). Um vencedor precoce que bate meta_receita_alvo pode ficar até ~30 dias sem o gatilho de stretch, contrariando o princípio 'vencedor não pode esfriar'.**

› _Como resolver:_ Para meta_receita_alvo, permitir captura pontual imediata no fechamento do marco monetário (valor_recebido já é obrigatório ali) alimentar a checagem de meta_atingida no mesmo dia, em vez de esperar o snapshot mensal; reservar o snapshot apenas para o acompanhamento contínuo do recebido acumulado.

**14. [⚪ Baixa] O cenario 1-dev do Sprint 1a soma ~30 dev-dias em serie com forte encadeamento de dependencias (seeds -> maquina iniciado_em -> v_dias_no_marco/r_ref -> detector -> fila). A coluna '1a minimo' ajuda, mas o corte exato depende de decisao no momento, aumentando o risco de atraso justamente no MVP.**

› _Como resolver:_ Pre-comprometer, ja na aprovacao, a lista EXATA de itens do '1a minimo (1 dev)' e a ordem serial critica, de modo que o fallback seja acionavel no dia 1 sem renegociacao de escopo. Idealmente garantir os 2 devs para o 1a (o proprio plano nota que 'com 2 devs comprime').

**15. [⚪ Baixa] O proprio documento de plano e denso demais para servir de artefato operacional de um time pequeno; o valor executavel depende quase inteiramente do runbook de 1 pagina + cartao 'por tipo de item -> pronto + unica acao', que sao citados mas nao anexados/versionados como entregavel bloqueante do arranque.**

› _Como resolver:_ Tornar o runbook de 1 pagina + o cartao por tipo de item + o roteiro da Conversa de Valor entregaveis OBRIGATORIOS e versionados, entregues ANTES da sombra e revisados no aceite do 1a — condicao de partida, nao anexo opcional.

