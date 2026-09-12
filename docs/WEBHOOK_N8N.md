# Webhook n8n — guia de configuração do Construtor de Mentoria

Guia operacional para deixar o envio do briefing funcionando **antes do evento**.
Leia na ordem. Ao final você terá: o webhook criado no n8n, a URL configurada na
Vercel, um teste ponta a ponta feito e o checklist de véspera fechado.

**O que o app faz:** o participante responde as 37 perguntas numeradas no celular
(quantas delas de fato aparecem depende das respostas dele — ver §5a), toca em
"Enviar" e o navegador dele faz **um POST JSON** para a URL do seu webhook no n8n.
Só isso. Quem conversa com a IA e com o WhatsApp é o n8n, não o app.

**Por que é assim:** qualquer variável `VITE_` vira texto literal dentro do
JavaScript que roda no navegador do participante — é pública, qualquer um lê no
DevTools. Então a chave da Evolution API, a chave da OpenAI/Anthropic e qualquer
credencial de verdade ficam **dentro do n8n**, que roda em servidor. Nunca no app.

---

## 1. Criar o Webhook node no n8n

1. No n8n, crie um workflow novo. Nome sugerido: `Construtor de Mentoria — Briefing`.
2. Adicione o nó **Webhook** como gatilho.
3. Configure:

| Campo | Valor | Por quê |
|---|---|---|
| **HTTP Method** | `POST` | O app só faz POST. |
| **Path** | `construtor-mentoria` | Parte final da URL. Use algo estável — mudar depois obriga a mexer na Vercel de novo. |
| **Respond** | **Immediately** | **Crítico.** Ver abaixo. |
| **Response Code** | `200` | Padrão. |
| **Authentication** | `None` (ou `Header Auth`, ver §3) | |

### Por que "Respond immediately" é obrigatório

Com **Respond immediately**, o n8n devolve `200` assim que recebe o briefing e o
resto do workflow (IA, WhatsApp, planilha) roda depois, sem ninguém esperando.
O participante vê a tela de sucesso em 1–2 segundos.

Com **When Last Node Finishes**, o navegador fica pendurado até a IA terminar de
escrever o método inteiro. Isso costuma passar de 30–60 segundos — mais que o
timeout do app (15s). O participante veria "A conexão demorou demais" mesmo com o
n8n trabalhando direito, e provavelmente tocaria em "Tentar novamente", gerando
uma segunda execução. **Não use.**

> O app considera sucesso no instante em que o n8n confirma o **recebimento**.
> Ele não espera, nem precisa esperar, a IA terminar.

4. Adicione os nós seguintes (IA, WhatsApp etc.) depois do Webhook.
5. **Ative o workflow** no toggle "Active", canto superior direito.
   Sem isso, a Production URL responde `404`.

### Opção obrigatória: CORS

Ainda no nó Webhook, abra **Options → Add option → Allowed Origins (CORS)**.

Preencha com o domínio do app, por exemplo `https://seu-projeto.vercel.app`,
ou `*` durante os testes. Isso é **obrigatório**: a chamada parte do navegador do
participante, de uma origem diferente da do n8n. Sem essa opção o navegador
bloqueia a requisição **antes de ela sair** e o n8n nem registra tentativa.
Detalhes do sintoma em §8.

---

## 2. Copiar a URL e configurar o app

No nó Webhook aparecem **duas** URLs:

| URL | Formato | Quando usar |
|---|---|---|
| **Test URL** | `.../webhook-test/construtor-mentoria` | Só enquanto você clica em "Listen for test event". Aceita **uma** chamada e depois responde 404. Serve para depurar no editor. |
| **Production URL** | `.../webhook/construtor-mentoria` | **Esta é a que vai no app.** Funciona sempre, desde que o workflow esteja ativo. |

Copie a **Production URL**.

### 2a. Localmente (na sua máquina)

```bash
cp .env.example .env.local
```

Edite `.env.local`:

```
VITE_N8N_WEBHOOK_URL=https://SEU-N8N.exemplo.com/webhook/construtor-mentoria
```

Reinicie o `npm run dev`. **O Vite só lê os arquivos `.env` na inicialização** —
salvar o arquivo com o servidor rodando não tem efeito.

`.env` e `.env.local` estão no `.gitignore`. Nunca commite nenhum dos dois.

### 2b. Na Vercel (produção — o que o participante usa)

1. Vercel → seu projeto → **Settings → Environment Variables**.
2. Adicione:

| Name | Value | Environments |
|---|---|---|
| `VITE_N8N_WEBHOOK_URL` | sua Production URL | Production, Preview, Development |

3. **Faça um novo deploy.**

> ⚠️ **Isto derruba evento.** Variáveis `VITE_` são resolvidas **em build time** —
> o Vite troca `import.meta.env.VITE_N8N_WEBHOOK_URL` pelo texto da URL dentro do
> bundle. Salvar a variável na Vercel **não muda o site que já está no ar**.
> É obrigatório redeployar: Deployments → último deploy → menu `...` → **Redeploy**
> (deixe "Use existing Build Cache" **desmarcado**).
> Sem o redeploy, o app continua achando que não há URL configurada e mostra
> "Envio ainda não liberado".

---

## 3. Autenticação opcional por header

O app suporta um token simples. Se você preencher `VITE_N8N_WEBHOOK_TOKEN`, toda
requisição sai com:

```
Authorization: Bearer SEU_TOKEN
```

Se deixar vazio, o header **não é enviado**.

### Validando no n8n

No nó Webhook: **Authentication → Header Auth** → crie uma credencial
*Header Auth* com:

- **Name:** `Authorization`
- **Value:** `Bearer SEU_TOKEN`

Quem chamar sem o header exato recebe `403` e o workflow nem executa.

Alternativa sem credencial: deixe `Authentication: None` e coloque logo após o
Webhook um nó **IF** comparando `{{ $json.headers.authorization }}` com o valor
esperado, seguido de um nó de parada para o caminho falso.

### O que esse token é e o que não é

É um **porteiro descartável**: corta robô, varredura e chamada aleatória que
encontrem a URL. **Não é segurança forte** — ele viaja no bundle e qualquer
participante consegue lê-lo no DevTools. Gere um valor aleatório
(`openssl rand -hex 16`), use no evento e **troque depois**. A segurança real
está no fato de que o webhook só aceita um briefing; nenhuma credencial valiosa
passa por ele.

---

## 4. Idempotência — não processar a mesma submissão duas vezes

O app faz **no máximo uma retentativa automática**, e só quando o pedido
provavelmente não chegou (falha de rede, timeout, `5xx`, `429`). Em `400`/`404`
e afins ele **nunca** repete. Mesmo assim existe um caso real: o n8n recebe e
processa o briefing, mas a resposta se perde no caminho de volta — o app entende
como falha e reenvia.

Para isso toda requisição carrega uma chave estável:

```
X-Idempotency-Key: 8f3c1a2e-...      (= payload.meta.submission_id)
X-Session-Id:      3b9d77e0-...      (= payload.meta.session_id)
```

O `submission_id` é gerado **uma vez por sessão** e é **idêntico** na tentativa
original e na retentativa. Quem garante "processar só uma vez" é o **n8n** — o
app só entrega a chave. Se você não implementar a checagem abaixo, uma
retentativa gera duas execuções e o participante recebe dois WhatsApp.

### Como implementar (n8n Data Table — caminho mais simples)

1. Crie uma Data Table, ex. `briefings_recebidos`, com as colunas
   `submission_id` (string) e `recebido_em` (string).
2. Logo depois do Webhook, adicione um nó **Data Table → Get Row(s)** filtrando
   `submission_id` igual a `{{ $json.headers['x-idempotency-key'] }}`
   (com fallback para `{{ $json.body.meta.submission_id }}`).
3. Um nó **IF**: encontrou linha?
   - **Sim** → já processamos. Encerre o ramo (nó **No Operation**). Nada de IA,
     nada de WhatsApp.
   - **Não** → **Data Table → Insert Row** gravando o `submission_id` **antes**
     de chamar a IA, e siga o fluxo normal.

Gravar **antes** de chamar a IA é o ponto que importa: se as duas requisições
chegarem quase juntas, a segunda já encontra a linha da primeira.

Mesma lógica com Redis (`SET chave valor NX EX 86400`, segue só se retornar OK),
Postgres (coluna `UNIQUE` em `submission_id` e trate o erro de duplicata), Google
Sheets (procure a linha antes de inserir) ou um arquivo. Use a ferramenta que
você já tem credencial configurada no n8n — não crie uma nova dependência na
véspera do evento.

---

## 5. Payload de exemplo

Estrutura exata que chega no `body` do Webhook. Este bloco **não foi escrito à
mão**: ele é a saída literal de `buildPayload()` para um briefing fictício
completo (mentora de gestão financeira de clínicas, cliente empresa). Cole no
n8n (Webhook → **Edit Output / Pin Data**) para montar o prompt da IA sem
depender de ninguém preencher o formulário.

Regras do formato: string ausente é sempre `""` (nunca `null`), lista vazia é
`[]`, booleano ausente é `false`, enums em `snake_case` com um `*_label` humano
ao lado. Todo texto vem com `trim()` e cortado no limite do campo (teto absoluto
de 4000 caracteres).

```json
{
  "meta": {
    "session_id": "3b9d77e0-15c4-4a6e-9b2f-71c0e4f0a911",
    "submission_id": "8f3c1a2e-5d40-4f0b-bb17-2c9a6f3d8e55",
    "submitted_at": "2026-03-14T18:42:07.812Z",
    "version": "1.0",
    "event_mode": true,
    "client": {
      "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15",
      "locale": "pt-BR",
      "timezone": "America/Sao_Paulo",
      "viewport": "390x844"
    }
  },
  "participant": {
    "name": "Renata Aguiar",
    "whatsapp": "+5511912345678",
    "whatsapp_display": "(11) 91234-5678",
    "email": "renata@exemplo.com.br"
  },
  "lastro": {
    "forca": "Organizo a rotina financeira de clínicas odontológicas pequenas, separando o caixa da empresa do bolso do dono.",
    "maior_resultado_proprio": "Saí de R$ 8 mil de dívida no cartão para 6 meses de reserva em 14 meses, sem aumentar o faturamento.",
    "melhor_resultado_terceiros": "A Dra. Camila saiu de R$ 40 mil por mês com lucro zero para R$ 38 mil por mês com R$ 11 mil de lucro em 5 meses.",
    "melhor_resultado_terceiros_ausente": false,
    "narrativa": {
      "antes": "Eu era gerente de clínica e achava que faturar mais resolveria tudo.",
      "dificuldade": "A clínica batia recorde de faturamento e mesmo assim faltava dinheiro no dia 20 de todo mês.",
      "tentativas_falhas": "Planilha nova, curso de gestão, contratar mais uma recepcionista e cortar custo pequeno.",
      "virada": "Percebi que o problema não era faturamento: era a ausência de separação entre caixa da clínica e retirada do dono.",
      "novas_acoes": "Criei pró-labore fixo, reserva automática de impostos e um fechamento semanal de 20 minutos.",
      "resultado_gerado": "O lucro apareceu no terceiro mês, sem vender um procedimento a mais.",
      "repeticao": "Repeti em 23 clínicas nos últimos 2 anos, com o mesmo roteiro de 90 dias.",
      "repeticao_ausente": false
    }
  },
  "persona": {
    "quem_deseja_resultado": "Dentistas donos de clínica própria que faturam bem e não veem o dinheiro.",
    "publicos": [
      {
        "id": "A",
        "descricao": "Dentista dono de clínica com 2 a 6 cadeiras, que já fatura bem e não sabe o próprio lucro",
        "scores": {"capacidade_financeira": 5, "velocidade_resultado": 4, "prazer_atender": 5},
        "score_total": 14,
        "preenchido": true
      },
      {
        "id": "B",
        "descricao": "Dentista recém-formado montando o primeiro consultório",
        "scores": {"capacidade_financeira": 2, "velocidade_resultado": 3, "prazer_atender": 4},
        "score_total": 9,
        "preenchido": true
      },
      {
        "id": "C",
        "descricao": "Rede de clínicas com mais de 10 unidades e sócio investidor",
        "scores": {"capacidade_financeira": 5, "velocidade_resultado": 2, "prazer_atender": 2},
        "score_total": 9,
        "preenchido": true
      }
    ],
    "publicos_descritos": ["A", "B", "C"],
    "publico_escolhido": "A",
    "publico_escolhido_descricao": "Dentista dono de clínica com 2 a 6 cadeiras, que já fatura bem e não sabe o próprio lucro",
    "publico_escolhido_origem": "participante",
    "delegar_escolha_ia": false,
    "maior_score": "A",
    "maior_score_total": 14,
    "maior_score_empate": [],
    "tipo_cliente": "pj",
    "tipo_cliente_label": "Empresa",
    "pf": {"perfil": "", "faixa_renda": "", "faixa_renda_label": "", "faixa_renda_outro": ""},
    "pj": {
      "segmento": "Clínica odontológica própria",
      "faixa_faturamento": "de_50_a_100_mil",
      "faixa_faturamento_label": "De R$ 50 mil a R$ 100 mil por mês",
      "faixa_faturamento_outro": ""
    },
    "dor_principal": "Fatura alto e termina o mês sem saber para onde o dinheiro foi.",
    "desejo_principal": "Ter lucro previsível e tirar pró-labore sem medo de faltar dinheiro para pagar fornecedor.",
    "tentativas_anteriores": "Contador novo, planilha do YouTube, curso de gestão e sistema caro.",
    "por_que_falham": "Tudo que tentaram mede o passado. Ninguém ensinou a decidir o que fazer com o dinheiro na semana."
  },
  "transformacao": {
    "ponto_a": "Fatura R$ 50 mil por mês, não sabe o lucro e tira dinheiro do caixa quando precisa.",
    "ponto_b": "Sabe o lucro toda sexta-feira, tem pró-labore fixo e 3 meses de reserva da clínica.",
    "prazo_estimado": "tres_meses",
    "prazo_estimado_label": "3 meses",
    "evidencias_resultado": "Fechamento semanal preenchido, pró-labore caindo em data fixa e reserva crescendo todo mês."
  },
  "metodo": {
    "erros_comuns": [
      "Misturar conta pessoal com conta da clínica",
      "Tratar faturamento como se fosse lucro",
      "Não reservar o imposto no momento do recebimento",
      "Decidir investimento olhando o saldo do banco"
    ],
    "por_que_falham": "Tentam resolver com ferramenta, quando o problema é a ordem das decisões.",
    "o_que_precisa_ser_diferente": "Separar os caixas antes de qualquer planilha e criar um ritual semanal curto de leitura.",
    "passos": [
      "Diagnóstico de caixa: separar clínica e pessoa física",
      "Pró-labore fixo definido pela capacidade real da clínica",
      "Reserva automática de impostos no recebimento",
      "Fechamento semanal de 20 minutos",
      "Leitura de lucro e decisão de reinvestimento"
    ],
    "passos_delegados_ia": false,
    "tem_nome": true,
    "nome": "Método Caixa Limpo"
  },
  "produto": {
    "modelo": "faco_com",
    "modelo_label": "EU FAÇO COM VOCÊ",
    "duracao_acompanhamento": "tres_meses",
    "duracao_acompanhamento_label": "3 meses",
    "carga_horaria_semanal": "de_2_a_4h",
    "carga_horaria_semanal_label": "2 a 4 horas por semana",
    "entregas_indispensaveis": "Encontro semanal ao vivo, planilha de fechamento e revisão individual do pró-labore no primeiro mês."
  },
  "entrega": {
    "briefing_necessario": "Faturamento dos últimos 3 meses, custos fixos, dívidas e quanto o dono retira da clínica hoje.",
    "tem_niveis": "sim",
    "niveis_descricao": "Nível 1 organiza o caixa. Nível 2 define o lucro-alvo. Nível 3 planeja a expansão.",
    "frequencia_hot_seat": "quinzenal",
    "frequencia_hot_seat_label": "Quinzenal",
    "suporte_entre_encontros": ["grupo_whatsapp", "comunidade"],
    "suporte_entre_encontros_labels": ["Grupo de WhatsApp", "Comunidade"],
    "contexto_adicional": "Prefiro turmas de no máximo 12 clínicas para conseguir olhar número por número com cada dono."
  },
  "progress": {
    "completion_pct": 100,
    "answered_questions": 40,
    "total_questions": 40,
    "started_at": "2026-03-14T17:55:31.004Z",
    "duration_seconds": 2797,
    "ai_delegations": []
  }
}
```

### 5a. O que muda de um participante para outro

O exemplo acima é **um** caminho possível. Estas são as regras que fazem o JSON
mudar de forma — monte as condições do n8n em cima delas, não em cima do
exemplo.

**`progress.total_questions` NÃO é 37.** A tela numera 37 perguntas, mas esse
total é outro número: ele conta as perguntas **que existiram para aquela
pessoa** — a ramificação Pessoa Física/Empresa, os campos que só aparecem
dependendo da resposta anterior e as opcionais deixadas em branco mudam a conta
(no exemplo acima deu 40; num briefing "ambos" passa de 42). Use
`completion_pct === 100` para saber que o briefing está completo. Nunca compare
com 37.

**Escolha do público.** `persona.publico_escolhido` só pode conter um público
que tem descrição, ou `""`. Vale a equivalência:

```
publico_escolhido === ""   <=>   delegar_escolha_ia === true
                           <=>   ai_delegations contém "persona.escolha"
```

Três formas de ler a mesma coisa: **quem escolhe o público é a IA**.
`persona.publico_escolhido_origem` conta como se chegou lá:

| `publico_escolhido_origem` | o que aconteceu |
|---|---|
| `participante` | ele escolheu, e o público escolhido tem descrição |
| `unico_publico_descrito` | descreveu um público só; não havia escolha a fazer |
| `delegado_ia` | marcou "quero que a IA avalie e recomende" |
| `descartado_sem_descricao` | escolheu um público que ficou sem descrição; a escolha foi descartada e virou delegação |
| `indefinido` | nenhum público descrito (briefing incompleto) |

**Empate de score.** `persona.maior_score` é o público **preenchido** (descrição
+ notas) com maior `score_total`; público com notas e sem descrição nunca ganha
esse selo. Quando dois ou três empatam no topo, `persona.maior_score_empate`
lista todos (`["A","B","C"]`) e `maior_score` traz só o primeiro da ordem A > B >
C, para não quebrar quem já lê o campo. **Com `maior_score_empate` não vazio, o
score não decidiu nada** — a IA precisa desempatar pelo conteúdo das descrições,
não pelo número. Sem empate, o campo vem `[]`.

**Escape marcada = texto vazio.** Quando a pessoa marca "ainda não tenho isso", o
texto correspondente vai `""` no payload, mesmo que ela tivesse escrito algo
antes de marcar (o rascunho fica no aparelho dela, não viaja). Vale para:

| flag | campo que vem `""` / `[]` |
|---|---|
| `lastro.melhor_resultado_terceiros_ausente: true` | `lastro.melhor_resultado_terceiros` |
| `lastro.narrativa.repeticao_ausente: true` | `lastro.narrativa.repeticao` |
| `metodo.passos_delegados_ia: true` | `metodo.passos` (vem `[]`) |
| `metodo.tem_nome: false` | `metodo.nome` |
| `entrega.tem_niveis` diferente de `"sim"` | `entrega.niveis_descricao` |

Nunca vão chegar juntos "ainda não gerei resultado para terceiros" e um
depoimento: seria contradição indo parar no WhatsApp do participante.

**Ramificação Pessoa Física / Empresa.** `persona.tipo_cliente` decide qual bloco
vem preenchido: `"pf"` preenche `persona.pf` e zera `persona.pj`; `"pj"` faz o
contrário; `"ambos"` preenche os dois; `"nao_sei"` zera os dois e delega à IA.

**`entrega.tem_niveis`: "nao" e "nao_sei" não são a mesma coisa.** Os dois geram a
delegação `entrega.niveis`, porque nos dois casos a IA propõe os níveis. O que
muda é o tom, e está em `entrega.tem_niveis`:

- `"nao"` — ele afirma que os clientes chegam todos no mesmo estágio. Proponha
  poucos níveis, ou nenhum, e justifique.
- `"nao_sei"` — ele não sabe. Proponha a classificação e explique o critério.

**`persona.pf.faixa_renda` / `persona.pj.faixa_faturamento` com valor `"outro"`.**
A opção na tela é "Outro / Não sei", então ela também entra em `ai_delegations`
(`persona.faixa_renda` / `persona.faixa_faturamento`). Quem diz qual dos dois é
o campo `*_outro` ao lado: **com texto**, foi "Outro" e a resposta está escrita
ali; **vazio**, é "não sei" de verdade e a IA estima a faixa pelo resto do
briefing. Com qualquer outra faixa escolhida, o `*_outro` vem `""` — nunca sobra
texto órfão de uma escolha anterior.

### 5b. `progress.ai_delegations` — o mapa do que a IA precisa PROPOR

Lista fixa e determinística. Campo vazio que aparece aqui **não é esquecimento**:
é pedido explícito de recomendação.

| valor | a IA precisa propor | onde ela acha a matéria-prima |
|---|---|---|
| `persona.escolha` | qual público vira a persona | `persona.publicos[]`, `maior_score`, `maior_score_empate` |
| `persona.tipo_cliente` | se o cliente é pessoa ou empresa | `persona.quem_deseja_resultado` e a descrição do público |
| `persona.faixa_renda` | faixa de renda da persona | `persona.pf.faixa_renda_outro` (vazio = não sabe mesmo) |
| `persona.faixa_faturamento` | porte da empresa | `persona.pj.faixa_faturamento_outro` |
| `transformacao.prazo` | prazo realista da transformação | `transformacao.ponto_a` / `ponto_b` e `metodo.passos` |
| `metodo.passos` | os passos do método | `lastro.narrativa` inteira |
| `metodo.nome` | nomes possíveis para o método | mecanismo + transformação |
| `produto.modelo` | ensino / faço com / faço por | carga horária e entregas indispensáveis |
| `produto.duracao` | duração do acompanhamento | prazo da transformação |
| `produto.carga_horaria` | horas por semana | modelo e entregas |
| `entrega.niveis` | classificação de níveis | `entrega.tem_niveis` (ver acima) |
| `entrega.hot_seat` | frequência do Hot Seat | duração e carga horária |
| `entrega.suporte` | canais de suporte entre encontros | modelo e carga horária |

### 5c. Payload de emergência — o IF que evita quebrar em silêncio

Se a montagem do JSON falhar no navegador do participante (estado corrompido,
navegador antigo, algo inesperado), o app **não deixa o briefing se perder**: ele
envia um payload de emergência, com forma diferente. Ele tem:

```json
{
  "meta": { "...": "...", "fallback_payload": true },
  "participant": { "name": "...", "whatsapp": "(11) 91234-5678", "whatsapp_display": "", "email": "..." },
  "answers_raw": { "lastro_forca": "...", "persona_publicos": { "A": { "descricao": "..." } } },
  "progress": { "completion_pct": 100, "answered_questions": 0, "total_questions": 0,
                "started_at": "", "duration_seconds": 0, "ai_delegations": [] }
}
```

Diferenças que quebram o fluxo se você não tratar:

- **não existem** os blocos `lastro`, `persona`, `transformacao`, `metodo`,
  `produto`, `entrega`. Todas as respostas vêm cruas em **`answers_raw`**,
  indexadas pelo id do campo (`lastro_forca`, `persona_publicos`, …), sem
  `*_label`, sem enum normalizado, sem as regras de escape;
- `participant.whatsapp` vem **como a pessoa digitou** (ex.: `(11) 91234-5678`),
  não em E.164, e `whatsapp_display` vem `""`;
- `duration_seconds` é sempre `0`.

**Monte um nó IF logo depois do Webhook**, testando
`{{ $json.body.meta.fallback_payload }}` igual a `true`:

- **verdadeiro** → não mande para a IA. Grave o JSON em algum lugar (Data Table,
  Sheets, e-mail para a equipe) e avise alguém no evento: esse participante
  precisa de tratamento manual. É raro, mas se acontecer sem o IF a IA recebe um
  JSON sem nenhum dos campos que o prompt espera e devolve um Blueprint vazio —
  em silêncio.
- **falso** (o normal) → segue o fluxo da §4 e da §5.

Dicas para montar o prompt da IA no n8n:

- `lastro.narrativa` é a história de origem — é de onde sai a autoridade do método.
- `metodo.passos` é o esqueleto. Se `passos_delegados_ia` for `true`, a lista veio
  vazia de propósito: o participante pediu para a IA propor os passos.
- `persona.delegar_escolha_ia: true` significa "escolha o público por mim" — use
  `persona.publicos[]` (descrição **e** notas) e o `maior_score_empate` como critério.
- `progress.ai_delegations` lista todos os pontos delegados. Vale checar antes de
  assumir que um campo vazio é esquecimento.
- Campos com `_ausente: true` significam "ainda não tenho isso", não "faltou responder".
- Nenhum campo do payload fala de preço, ticket ou faturamento esperado da
  mentoria: essas perguntas não existem no formulário, por decisão. Não peça para
  a IA "calcular o investimento" com base em campo nenhum.

---

## 6. Como testar

### 6a. Teste direto no webhook (sem o app)

Substitua a URL e rode no terminal:

```bash
curl -i -X POST 'https://SEU-N8N.exemplo.com/webhook/construtor-mentoria' \
  -H 'Content-Type: application/json' \
  -H 'X-Idempotency-Key: teste-manual-001' \
  -H 'X-Session-Id: sessao-teste-001' \
  -d '{
    "meta": { "session_id": "sessao-teste-001", "submission_id": "teste-manual-001", "submitted_at": "2026-03-14T18:42:07.812Z", "version": "1.0", "event_mode": false },
    "participant": { "name": "Teste Curl", "whatsapp": "+5511912345678", "whatsapp_display": "(11) 91234-5678", "email": "teste@exemplo.com" },
    "lastro": { "forca": "teste de integracao" }
  }'
```

Com token configurado, acrescente:

```bash
  -H 'Authorization: Bearer SEU_TOKEN' \
```

**O que esperar:**

| Resposta | Significado |
|---|---|
| `HTTP/1.1 200` + `{"message":"Workflow was started"}` | Funcionou. É exatamente o que o app precisa. |
| `HTTP/1.1 200` + qualquer outro corpo | Também funciona. O app aceita JSON, texto puro ou corpo vazio. |
| `404` + `webhook ... is not registered` | Workflow inativo, ou você usou a Test URL. Ver §8. |
| `403` | Token errado ou ausente (Header Auth ligado). |
| `500` | O workflow executou e quebrou em algum nó. Abra Executions no n8n. |
| Demorou mais de 15s | O Respond não está em "Immediately". Ver §1. |

Rode o **mesmo comando duas vezes**: a segunda deve aparecer nas Executions do
n8n como "já processado", sem mandar WhatsApp de novo. Se mandar dois WhatsApp, a
idempotência (§4) não está funcionando.

### 6b. Teste ponta a ponta (o que vale de verdade)

1. Abra `https://seu-projeto.vercel.app/mentoria` **no celular**, pelos dados
   móveis (não pelo Wi-Fi do escritório).
2. Preencha o formulário com **seu WhatsApp real**.
3. Envie.
4. Confira: tela de sucesso no celular → execução verde nas Executions do n8n →
   mensagem chegando no seu WhatsApp.

Só este teste prova que CORS, URL, token e WhatsApp estão todos certos ao mesmo
tempo. Faça ele **na véspera**, não na hora.

---

## 7. Checklist de véspera

Faça na ordem, um dia antes. Marque tudo.

- [ ] Workflow do n8n está **Active** (toggle ligado, não só salvo).
- [ ] Webhook node com **Respond: Immediately**.
- [ ] Opção **Allowed Origins (CORS)** preenchida com o domínio da Vercel (ou `*`).
- [ ] `VITE_N8N_WEBHOOK_URL` na Vercel = a **Production URL** (`/webhook/`, nunca `/webhook-test/`).
- [ ] **Redeploy feito depois** de salvar a variável (sem build cache).
- [ ] Abri `/mentoria` no celular, no anônimo, e o botão de enviar **não** mostra
      "Envio ainda não liberado".
- [ ] Teste ponta a ponta feito, com WhatsApp real chegando (§6b).
- [ ] Teste de duplicata: enviei o mesmo `submission_id` duas vezes e só chegou
      **um** WhatsApp (§4).
- [ ] Nó **IF** do payload de emergência no lugar: `meta.fallback_payload = true`
      não vai para a IA, vai para a equipe (§5c). Sem ele, o caso raro quebra em
      silêncio e o participante recebe um Blueprint vazio.
- [ ] Credenciais dentro do n8n conferidas: Evolution API respondendo, chave de IA
      com saldo/crédito.
- [ ] Nenhuma credencial forte no `.env.local` nem na Vercel — só URL, token
      descartável e números.
- [ ] **Carga:** a turma envia quase junto no fim da última etapa. Confirme o
      limite de execuções simultâneas do seu n8n (no n8n Cloud isso varia por
      plano; no self-hosted depende da máquina). Com "Respond immediately" o
      participante não trava — a resposta HTTP volta na hora e as execuções
      entram na fila. Se houver limite baixo, considere enfileirar o envio do
      WhatsApp com um pequeno atraso escalonado em vez de disparar 20 de uma vez.
- [ ] Teste de fumaça com 3–5 celulares enviando ao mesmo tempo: 3–5 execuções,
      3–5 WhatsApp, nenhum erro.
- [ ] Plano B anotado: se o envio falhar no evento, **as respostas do participante
      continuam salvas no aparelho dele** (`localStorage`). Basta corrigir a
      configuração e pedir para reabrir a página e tocar em enviar de novo.
      Ninguém perde o que escreveu.

---

## 8. Troubleshooting

### CORS — o problema mais provável

**Sintoma:** o app mostra "Sem conexão no momento" **instantaneamente**, para
**todo mundo**, e o n8n **não registra nenhuma execução** — nem falha, nem nada.
No console do navegador aparece algo como
`Access to fetch at 'https://...' from origin 'https://seu-projeto.vercel.app'
has been blocked by CORS policy`.

**Por que acontece:** a chamada parte do navegador do participante, de um domínio
(`*.vercel.app`) diferente do domínio do n8n. Como o app envia
`Content-Type: application/json` e headers próprios (`X-Idempotency-Key`,
`X-Session-Id`, às vezes `Authorization`), o navegador **obrigatoriamente** manda
antes um `OPTIONS` de preflight. Se o n8n não responder esse preflight liberando a
origem e os headers, o navegador **cancela a requisição antes de ela sair**. Por
isso não há execução no n8n: o POST nunca chegou lá.

**Não dá para contornar tirando os headers.** O `Content-Type: application/json`
sozinho já obriga o preflight. O caminho é liberar no n8n.

**Solução:**

1. Nó Webhook → **Options → Add option → Allowed Origins (CORS)**.
2. Preencha com `https://seu-projeto.vercel.app` (sem barra no fim), ou `*` para
   liberar geral durante o teste.
3. **Salve e reative o workflow.** Mudança em nó de webhook só passa a valer
   depois de reativar.
4. Refaça o teste no celular, em aba anônima (o navegador guarda cache de preflight).

Se a opção "Allowed Origins (CORS)" não existir na sua versão do n8n, ela é
antiga: atualize, ou coloque um proxy reverso na frente do n8n devolvendo
`Access-Control-Allow-Origin`, `Access-Control-Allow-Headers:
content-type,authorization,x-idempotency-key,x-session-id` e
`Access-Control-Allow-Methods: POST,OPTIONS` no `OPTIONS`.

**Como saber se é CORS e não internet:** se **um** participante falha, é a internet
dele. Se **todos** falham na mesma hora, instantaneamente, e o n8n está com zero
execuções, é CORS. Se o n8n mostra execuções mas o app diz erro, aí é outra coisa
(veja timeout abaixo).

### 404 — "webhook is not registered"

Três causas, nesta ordem de probabilidade:

1. **Você usou a Test URL.** `/webhook-test/...` só vive enquanto você segura o
   botão "Listen for test event" no editor e **aceita uma única chamada**. Depois
   dela, 404 para sempre. É o erro clássico: testa, funciona, publica, e no
   evento ninguém consegue enviar. Use `/webhook/` (Production).
2. **Workflow não está ativo.** A Production URL só responde com o toggle
   "Active" ligado.
3. **Path diferente.** Confira caractere por caractere entre o nó e a variável na
   Vercel. Barra no fim conta.

O app **não** repete envio em 404 (é 4xx), então não há risco de duplicar — mas
também não vai passar sozinho. Corrija e peça para reenviar.

### Timeout — "A conexão demorou demais"

O app espera 15 segundos (`VITE_N8N_TIMEOUT_MS`) e tenta **mais uma vez** antes de
desistir.

- **Executions do n8n aparecem e ficam rodando muito tempo:** o Respond não está em
  "Immediately". Esta é a causa em 9 de 10 casos. Volte em §1.
- **Nenhuma execution aparece:** o n8n está fora do ar, dormindo (instâncias
  gratuitas hibernam), ou o domínio está errado.
- **Aumentar o timeout raramente é a resposta certa.** Com "Respond immediately"
  o n8n responde em menos de 1 segundo; se está passando de 15s, alguma coisa
  está errada no fluxo, não no app.

**Atenção à duplicata:** timeout é retentável, então o app reenvia uma vez com o
mesmo `submission_id`. Se o n8n na verdade recebeu a primeira e só demorou a
responder, sem a idempotência do §4 o participante recebe dois WhatsApp.
Essa é exatamente a situação que o §4 previne.

### Resposta lenta, mas chega

Se a execução leva 30s+ e mesmo assim o app mostra sucesso, está tudo certo: o
app só espera a confirmação de recebimento. O participante já viu a tela de
sucesso e vai receber o método pelo WhatsApp quando ficar pronto — a tela de
sucesso deve dizer isso, e diz.

### 403

Header Auth ligado no n8n e token ausente ou diferente de
`VITE_N8N_WEBHOOK_TOKEN`. Compare os dois valores exatamente, incluindo o prefixo
`Bearer ` com espaço. Depois de mudar a variável na Vercel, **redeploy** (§2b).

### "Envio ainda não liberado" na tela

`VITE_N8N_WEBHOOK_URL` chegou vazia no bundle. Quase sempre é **falta de
redeploy** depois de criar a variável na Vercel (§2b), ou a variável foi criada
sem o prefixo `VITE_` (o Vite ignora qualquer variável sem ele), ou só para o
ambiente Preview e não para Production.

### 500 vindo do n8n

O workflow recebeu e quebrou em algum nó. Abra **Executions** no n8n e olhe o nó
vermelho. O app já tentou duas vezes automaticamente — se as duas caíram no mesmo
erro, o problema é o fluxo, não a rede. O briefing do participante continua salvo
no aparelho dele: conserte o nó e peça para reenviar.

---

## Referência rápida

| O que o app envia | Valor |
|---|---|
| Método | `POST` |
| `Content-Type` | `application/json` |
| `X-Idempotency-Key` | `meta.submission_id` — igual na retentativa |
| `X-Session-Id` | `meta.session_id` |
| `Authorization` | `Bearer <token>` — **só** se `VITE_N8N_WEBHOOK_TOKEN` estiver preenchida |
| Timeout | 15s (configurável) |
| Retentativa automática | no máximo **1**, só em rede/timeout/`5xx`/`408`/`429` |
| Nunca retenta | `400`, `401`, `403`, `404` e demais `4xx` |
| Sucesso | qualquer `2xx` — corpo JSON, texto ou vazio, tanto faz |
| Payload normal | blocos `lastro`/`persona`/`transformacao`/`metodo`/`produto`/`entrega` (§5) |
| Payload de emergência | `meta.fallback_payload: true` + `answers_raw`, sem os blocos — trate com um IF (§5c) |

| Variável | Obrigatória | Padrão |
|---|---|---|
| `VITE_N8N_WEBHOOK_URL` | **sim** | — |
| `VITE_N8N_WEBHOOK_TOKEN` | não | vazio (sem header) |
| `VITE_N8N_TIMEOUT_MS` | não | `15000` |
| `VITE_EVENT_MODE` | não | `false` |
| `VITE_CURRENT_EVENT_STEP` | não | `0` |

Arquivos: `src/mentoria/integration/webhook.js` (envio),
`src/mentoria/integration/errors.js` (códigos e mensagens),
`.env.example` (todas as variáveis comentadas).
