# Régua de Qualidade — Portão 9,5

A entrega só é liberada quando **todos** os supervisores derem nota ≥ 9,5 e
**nenhum item BLOQUEANTE** estiver aberto. Nota é média ponderada dos critérios
do eixo; qualquer bloqueante aberto força a nota do eixo a no máximo 8,0.

Escala: 10 = indistinguível de produto premium em produção · 9,5 = pronto para
uso real no evento, sem ressalva relevante · 9,0 = bom, mas alguém percebe ·
≤8 = tem defeito que aparece ao vivo.

---

## Eixo 1 — Experiência & Mobile (peso 25%)

| # | Critério | Bloqueante |
|---|---|---|
| 1.1 | Não parece formulário: é um construtor guiado, com progresso e narrativa | sim |
| 1.2 | Máx. 3–4 perguntas por tela; nenhuma tela cansativa | sim |
| 1.3 | CTA sempre alcançável com teclado aberto no iOS; nunca coberto | sim |
| 1.4 | Alvos de toque ≥44px; inputs ≥16px (sem zoom automático no Safari) | sim |
| 1.5 | Sem scroll horizontal em 320–430px de largura | sim |
| 1.6 | Voltar, editar e retomar sem perder nada | sim |
| 1.7 | Microcelebrações e transições sutis, sem infantilidade | não |
| 1.8 | Microcopy humana, premium, sem "campo obrigatório" | não |

## Eixo 2 — Robustez Técnica (peso 25%)

| # | Critério | Bloqueante |
|---|---|---|
| 2.1 | Double-submit impossível (guarda síncrona + botão desabilitado + loading) | sim |
| 2.2 | `submission_id` estável entre tentativas; idempotência garantida | sim |
| 2.3 | Falha de webhook não apaga nada e oferece "Tentar novamente" | sim |
| 2.4 | Reload/fechar aba/perder conexão preserva 100% das respostas | sim |
| 2.5 | Safari privado / quota estourada não quebra a aplicação | sim |
| 2.6 | Timeout, offline, 4xx, 5xx tratados com mensagem distinta e humana | sim |
| 2.7 | StrictMode não duplica efeitos, ids nem eventos | sim |
| 2.8 | Build limpo, sem warning relevante, sem console.error em runtime | sim |

## Eixo 3 — Design Premium (peso 20%)

| # | Critério | Bloqueante |
|---|---|---|
| 3.1 | Paleta e tipografia coerentes com a direção (marinho/azul/cinza/branco) | sim |
| 3.2 | Sombras sutis, espaço negativo generoso, gradientes discretos | não |
| 3.3 | Hierarquia visual clara; uma ideia dominante por tela | sim |
| 3.4 | Zero vazamento de estilo do dashboard (nem para ele) | sim |
| 3.5 | Estados (foco, seleção, erro, carregando, salvo) desenhados, não improvisados | sim |
| 3.6 | Sem excesso de emoji, sem cor berrante, sem cara de Google Forms | sim |

## Eixo 4 — Dados para a IA & n8n (peso 20%)

| # | Critério | Bloqueante |
|---|---|---|
| 4.1 | Payload bate exatamente com o schema documentado | sim |
| 4.2 | Chaves semânticas estáveis, snake_case, sem label visual desnecessário | sim |
| 4.3 | Ausência = "" / [] / false — nunca null/undefined/`"undefined"` | sim |
| 4.4 | Delegações à IA explícitas (`ai_delegations`) e legíveis | sim |
| 4.5 | Scores de público calculados corretamente (X/15, maior potencial) | sim |
| 4.6 | Uma IA consegue redigir o Blueprint só com esse JSON, sem adivinhar | sim |
| 4.7 | Webhook configurável por env, sem credencial no código, documentado | sim |
| 4.8 | Nenhuma pergunta de preço/faturamento esperado (fora do escopo por decisão) | sim |

## Eixo 5 — Acessibilidade & Performance (peso 10%)

| # | Critério | Bloqueante |
|---|---|---|
| 5.1 | HTML semântico, labels reais, `aria-*` corretos, erro com `role="alert"` | sim |
| 5.2 | Foco visível e foco programático no primeiro erro | sim |
| 5.3 | Contraste AA em todo texto | sim |
| 5.4 | `prefers-reduced-motion` respeitado | não |
| 5.5 | Bundle enxuto, zero dependência nova, code-split por rota | sim |
| 5.6 | Nada depende de hover | sim |

---

## Sete revisões obrigatórias (simulação de papéis)

Todo supervisor precisa percorrer a aplicação com estas sete cabeças:

1. Participante preenchendo pelo iPhone, em pé, durante a palestra.
2. Apresentador conduzindo 20 pessoas ao mesmo tempo.
3. n8n recebendo 20 payloads quase simultâneos.
4. A IA que vai ler o JSON e escrever o Blueprint.
5. Alguém que atualizou a página no meio da etapa 4.
6. Alguém que clicou duas vezes no botão de enviar.
7. Alguém que deixou uma resposta importante incompleta.

## Formato do parecer

```
EIXO: <nome>   NOTA: <x,y>/10   VEREDITO: LIBERADO | REPROVADO
BLOQUEANTES:
  - [arquivo:linha] problema → correção esperada
AJUSTES NÃO BLOQUEANTES:
  - ...
EVIDÊNCIAS: (o que foi efetivamente executado/lido para afirmar isso)
```
Sem evidência, o parecer não vale. "Parece bom" não é evidência.
