# Planejamento · Portal de Mentorados (Customer Success)

Dois planejamentos que se complementam para dar à CS (Camila) controle total do mentorado — do cadastro da venda ao resultado dentro da mentoria — construídos sobre a stack atual (React/Vite/Vercel + Supabase + n8n + WhatsApp).

Ambos foram produzidos por um processo multi-agente: agentes especialistas planejam em paralelo, um sintetizador integra, e um **time de 3 supervisores** pontua de 0 a 10 por lente, com loop de revisão em busca de nota 9,5.

| # | Documento | Foco | Nota (menor das 3 lentes) |
|---|---|---|---|
| 01 | [Portal de Mentorados](./01-planejamento-portal-mentorados.md) | Gestão de carteira, contrato/tempo, jornada, Kanban, health e **aviso automático 30 dias antes do fim** (renovação) | 9,1 |
| 02 | [Motor de Sucesso do Mentorado](./02-planejamento-sucesso-mentorado.md) | Acompanhamento para o mentorado **ter resultado e não se perder**, com trilha diferenciada pelos **4 níveis de entrada** | 9,3 |

## Os 4 níveis de entrada (eixo do documento 02)

| Nível | Ponto de partida | Próximo resultado |
|---|---|---|
| **N1** | Não tem posicionamento | Definir posicionamento / oferta-base |
| **N2** | Tem posicionamento, sem produto | Criar e validar o produto |
| **N3** | Tem produto e posicionamento, sem funil | Colocar um funil no ar (primeira tração) |
| **N4** | Funil rodando | Melhorar performance / adicionar novo funil |

## Como os dois se ligam

- Mesma fonte da verdade (Supabase), mesmo portal (`/cs/*`), mesmo motor de automação (n8n).
- O documento 01 cuida do **tempo/contrato e da renovação**; o 02 cuida do **progresso e do resultado** durante a mentoria.
- O **progresso** (doc 02) alimenta a **narrativa de renovação** (doc 01): mentorado que avança e tem resultado renova.

## Status e próximos passos

Entregues por decisão do cliente em 9,1 / 9,3 — cada documento traz, no fim, um **Backlog de melhorias** com os apontamentos ainda abertos dos supervisores (nenhum bloqueador). O item de maior valor pendente: **redigir o conteúdo real dos 6 playbooks/recursos-núcleo** do doc 02.

Para partir para a execução, será necessário autorizar os conectores **Supabase** e **n8n** (config. de conectores do claude.ai) — aí as tabelas e workflows podem ser criados de verdade.
