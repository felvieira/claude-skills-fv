---
name: react-useeffect-review
description: |
  Checklist de quando NAO usar useEffect, baseado na doc oficial do React
  ("You Might Not Need an Effect"). Use ao escrever ou revisar useEffect,
  useState pra valor derivado, data fetching, sincronizacao de estado entre
  componentes, ou reset de estado ao trocar prop. Trigger em: "useEffect",
  "efeito colateral", "estado derivado", "sincronizar estado", "resetar
  estado quando prop muda", "race condition no fetch", "effect chain",
  "notificar parent via effect", "inicializacao duplicada em dev",
  "useSyncExternalStore", "por que renderizou duas vezes".
---

# React useEffect — Quando NAO Usar

Effects sao uma **valvula de escape** do React: servem pra sincronizar com um
sistema externo (DOM nao-React, API do browser, subscription de store
externa). Se nao ha sistema externo envolvido, provavelmente nao precisa de
Effect — e o codigo com Effect desnecessario tende a rodar em passes extras,
causar race condition ou disparar em momentos inesperados (ex: refresh de
pagina).

Esta skill entra em dois momentos: (1) ao escrever um `useEffect` novo, como
checklist antes de commitar; (2) ao revisar codigo/PR que usa `useEffect`,
como lente pra achar o antipattern especifico e sugerir a alternativa direta.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`.

## Quando Usar

- escrever um `useEffect` novo, como checklist antes de commitar
- revisar código/PR que usa `useEffect`, pra achar o antipattern específico
- componente renderiza duas vezes de forma inesperada, ou tem race condition em fetch
- estado parece sincronizado manualmente quando poderia ser calculado direto

## Quando Nao Usar

- a sincronização é de fato com um sistema externo (widget não-React, API de browser, subscription) — aí o Effect é a ferramenta certa
- o código já usa `useSyncExternalStore`, `key` prop, ou calcula no render corretamente — nada a revisar

## Quick Reference

| Situacao                       | NAO FACA                       | FACA                                   |
| ------------------------------- | ------------------------------- | ---------------------------------------- |
| Estado derivado de props/state  | `useState` + `useEffect`        | Calcular durante o render                |
| Calculo caro                    | `useEffect` pra cachear         | `useMemo`                                |
| Resetar estado ao mudar prop    | `useEffect` com `setState`      | `key` prop                               |
| Resposta a evento do usuario    | `useEffect` observando state    | Direto no event handler                  |
| Notificar parent de uma mudanca | `useEffect` chamando `onChange` | Chamar no mesmo event handler            |
| Fetch de dados                  | `useEffect` sem cleanup         | `useEffect` com cleanup OU lib de fetch  |

## Arvore de Decisao

```
Precisa responder a algo?
├── Interacao do usuario (click, submit, drag)?
│   └── EVENT HANDLER
├── Componente apareceu na tela e precisa sincronizar com algo externo?
│   └── EFFECT (widget nao-React, analytics, subscription)
├── Prop/state mudou e precisa de um valor derivado?
│   └── CALCULAR DURANTE O RENDER
│       └── Caro? use useMemo
└── Precisa resetar estado quando uma prop de identidade muda?
    └── KEY PROP no componente filho
```

## Quando DE FATO precisa de Effect

- Sincronizar com **sistema externo** (widget nao-React, API de browser)
- **Subscription** a store externo (preferir `useSyncExternalStore`)
- Analytics/log que deve rodar porque o componente foi exibido
- Data fetching com cleanup adequado (ou usar mecanismo de fetch do framework)

## Guia Detalhado

- [anti-patterns.md](./anti-patterns.md) — 9 antipatterns com exemplo ruim/bom lado a lado (estado derivado, filtro em Effect, reset via Effect, logica de evento em Effect, chain de Effects, notificar parent, subir dado pro parent, fetch sem cleanup, inicializacao duplicada em dev)
- [alternatives.md](./alternatives.md) — as alternativas em detalhe (calcular no render, `useMemo`, `key` prop, guardar ID em vez de objeto, event handler, `useSyncExternalStore`, lifting state up, custom hook de fetch)

## Evidencia de Conclusao

- código revisado não tem `useEffect` cobrindo um dos 9 antipadrões de `anti-patterns.md`
- toda sincronização com sistema externo restante está justificada (subscription, widget não-React, analytics)

## Handoff

- **Frontend Engineer (skill 04)** — recebe o código já revisado antes de integrar com o resto da feature
- **Reviewer (skill 11)** — pode citar esta skill como critério de qualidade no checklist de código

## Integracao com Pipeline

- **Frontend Engineer (04):** consultar antes de escrever `useEffect` novo, ou ao revisar PR com hooks
- **Reviewer (11):** critério de qualidade de código React durante review final

## Fontes

Conteúdo adaptado do skill público `react-useeffect` do repositório
[wealthfolio/wealthfolio](https://github.com/wealthfolio/wealthfolio)
(`.claude/skills/react-useeffect/`), que por sua vez destila a doc oficial
["You Might Not Need an Effect"](https://react.dev/learn/you-might-not-need-an-effect).
Sem acoplamento a nenhum projeto específico — aplicável a qualquer codebase
React/Next.js do kit.
