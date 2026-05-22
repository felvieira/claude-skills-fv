---
scenario: 22-accessibility-specialist
pass: treatment
model: claude-opus-4-7
tokens_in_approx: 290
tokens_out_approx: 1900
time_seconds: 45
quality_score: 4.5
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 5
  actionability: 4
  discipline: 4
pass_fail: pass
delta_vs_baseline: +1.7
notes: "aplicou template accessibility-check.md, priorizou por impacto, handoff explicito UI-UX/FE/QA, WCAG 2.2 novidades cobertas, screen reader + motion + reduced-motion explicitos"
---

# Accessibility Check — Landing SaaS (WCAG 2.2 AA)

> Aplicacao da skill `22-accessibility-specialist` + template `accessibility-check.md`.
> Stack alvo: React. Cliente exige WCAG 2.2 AA.

## Fluxo/Componente alvo

Landing page SaaS completa: hero + CTA principal, secao de features, pricing, form de signup/lead, footer com links legais, modal de demo, menu mobile.

## Findings priorizados (alto -> baixo impacto)

### P0 — Bloqueante (corrigir antes do go-live)

1. **Teclado e foco**
   - Trap de foco em modal de demo: `role="dialog"` + `aria-modal="true"` + focus return ao trigger ao fechar
   - Focus ring visivel em TODO elemento focavel (`:focus-visible` com outline 2px + offset, contraste 3:1 contra fundo)
   - Skip-link "Pular para conteudo principal" como primeiro `<a>` focavel
   - Ordem de tab segue ordem visual (sem `tabindex` positivo)

2. **WCAG 2.2 — novos criterios AA**
   - **2.4.11 Focus Not Obscured**: header sticky nao pode cobrir elemento focado — usar `scroll-padding-top: <altura-header>` no html
   - **2.5.7 Dragging Movements**: se houver carrossel/slider drag, prover botoes prev/next
   - **2.5.8 Target Size (Minimum)**: hit targets >= 24x24 CSS px — auditar icon buttons do header/social
   - **3.3.8 Accessible Authentication**: form de signup nao pode exigir CAPTCHA cognitivo sem alternativa (preferir hCaptcha com audio fallback ou honeypot)

3. **Semantica e roles**
   - `<html lang="pt-BR">` (ou idioma real)
   - Landmarks: `<header>`, `<nav>`, `<main>`, `<footer>` — `<main>` unico por pagina
   - Heading hierarchy: um `<h1>` por pagina (titulo do hero), sem pular niveis
   - Botao vs link: CTA que abre modal e `<button>`, CTA que navega e `<a>`

### P1 — Alto impacto

4. **Contraste e textos alternativos**
   - Texto normal 4.5:1, texto grande (>=18pt ou 14pt bold) 3:1, componentes UI/icones 3:1 — auditar com axe DevTools
   - Texto sobre imagem do hero: usar overlay com opacidade suficiente OU `text-shadow` para garantir contraste
   - `alt` descritivo em imagens de produto/feature; `alt=""` em decorativas (ilustracoes de fundo)
   - Logo no header: `alt="Nome do produto"`, nao `alt="logo"`

5. **Screen reader**
   - Forms: cada `<input>` com `<label>` associado por `htmlFor`/`id` ou label wrapping
   - Erros de validacao: `aria-describedby` no input apontando para id da mensagem + `aria-invalid="true"`
   - Status messages (signup enviado, erro de submit): `role="status"` para info, `role="alert"` para erro critico
   - Icon-only buttons (close modal, hamburger menu) precisam `aria-label`
   - Cards de pricing: estrutura semantica clara, preco nao pode ser so visual — usar `<dl>`/`<dt>`/`<dd>` ou heading + texto

### P2 — Recomendado

6. **Motion reduction**
   - Toda animacao (fade-in on scroll, parallax, hover micro-interactions) envolta em `@media (prefers-reduced-motion: reduce)` com `animation: none` ou duracao minima
   - Framer Motion: usar hook `useReducedMotion()` e passar `false` para `animate` quando true
   - Carrossel auto-play: desligar quando reduced-motion ativo

## Como corrigir (operativo)

### Setup imediato (1 hora)

```bash
npm install --save-dev eslint-plugin-jsx-a11y @axe-core/react
```

- Adicionar `plugin:jsx-a11y/recommended` no `.eslintrc`
- Em `src/main.tsx`/`index.tsx` modo dev:
  ```ts
  if (process.env.NODE_ENV !== 'production') {
    import('@axe-core/react').then(axe => axe.default(React, ReactDOM, 1000));
  }
  ```
- Rodar `npx lighthouse https://landing.url --only-categories=accessibility --view`

### Auditoria semi-automatizada (2-4h)

1. axe DevTools (extensao Chrome) na landing toda — anotar criticos/serios
2. Lighthouse Accessibility (target score >=95)
3. Pa11y CI: `npx pa11y-ci` configurado com `--standard WCAG2AA` no GitHub Actions
4. Substituir componentes custom problematicos por **Radix UI** ou **React Aria** (Adobe) — primitivos com acessibilidade resolvida (modal, dropdown, dialog, tabs)

### Auditoria manual (4-8h, indispensavel)

1. **Desconectar mouse** e completar fluxo: landing -> CTA -> modal de demo -> form -> submit, so com Tab/Shift+Tab/Enter/ESC
2. **NVDA (Windows, gratis)** ou **VoiceOver (Mac, Cmd+F5)**: navegar com teclado + leitor, conferir se anuncia hierarquia, labels, erros
3. **Zoom 200%** no browser: nada deve quebrar layout nem perder funcionalidade
4. **Color Contrast Analyser** (TPGi) ou DevTools > Lighthouse > Contrast: validar todos os pares texto/fundo
5. **Chrome DevTools > Rendering > Emulate vision deficiencies**: deuteranopia, protanopia, tritanopia, achromatopsia

### Suspeitas comuns em landing React

| Componente | Bug tipico | Fix |
|---|---|---|
| Hero CTA | nao tem focus ring visivel | `:focus-visible { outline: 2px solid; outline-offset: 2px }` |
| Modal demo | nao trapa foco, ESC nao fecha | usar Radix Dialog ou `react-focus-lock` |
| Menu mobile | hamburger sem aria-label, sem trap | `aria-label="Abrir menu"` + `aria-expanded` + trap |
| Pricing toggle | switch sem role/label | `role="switch"` + `aria-checked` + label associado |
| Form de signup | erros so visuais | `aria-describedby` + `aria-invalid` + `role="alert"` |
| Footer social icons | so icone sem texto | `aria-label="LinkedIn"` em cada link |
| Animacoes scroll | sempre tocam | gate em `prefers-reduced-motion` |

## Gaps de cobertura

- Nao consigo validar contraste sem ver cores reais — pedir tokens do design system
- Nao sei se ha video no hero — se sim, precisa captions (WCAG 1.2.2) e controle de pause/stop (2.2.2)
- Falta auditar dark mode separado — contrastes mudam
- Sem especialista em a11y interno, recomendo **auditoria externa paga** antes do lancamento (Deque, TPGi, Hand Talk) — custo medio R$ 5-15k, evita risco juridico com cliente

## Handoff

- **UI/UX**: revisar tokens de cor para garantir contraste 4.5:1 em todos os pares; definir focus ring no design system; especificar reduced-motion variants
- **Frontend**: aplicar fixes P0/P1 acima; trocar componentes custom por Radix/React Aria; instalar eslint-plugin-jsx-a11y e @axe-core/react
- **QA**: criar caso de teste manual de teclado + leitor de tela no plano de regressao; integrar pa11y-ci no pipeline
- **PO/Cliente**: comunicar que conformidade total WCAG 2.2 AA requer 1-2 sprints + auditoria externa para evidencia formal

## Evidencia de conclusao

- [ ] axe DevTools: 0 criticos, 0 serios
- [ ] Lighthouse Accessibility >= 95
- [ ] Pa11y-CI no pipeline com `--standard WCAG2AA`
- [ ] Fluxo critico (CTA -> modal -> form) navegavel so por teclado
- [ ] NVDA/VoiceOver anuncia heading hierarchy, labels e erros corretamente
- [ ] Reduced-motion respeitado em todas animacoes
- [ ] Revalidacao pos-fix por axe + manual antes do go-live
