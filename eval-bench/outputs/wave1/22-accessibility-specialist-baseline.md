---
scenario: 22-accessibility-specialist
pass: baseline
model: claude-opus-4-7
tokens_in_approx: 90
tokens_out_approx: 1450
time_seconds: 30
quality_score: 2.8
quality_breakdown:
  specificity: 2
  completeness: 3
  correctness: 4
  actionability: 3
  discipline: 3
pass_fail: baseline
notes: "generic WCAG checklist sem priorizacao, sem stack-aware (React Testing Library, axe-core), sem operativo"
---

# WCAG 2.2 AA na landing page React — Resposta Baseline

## O que verificar

Para conformidade WCAG 2.2 AA numa landing React, voce precisa verificar 4 pilares:

### 1. Perceivable (Perceptivel)
- **Contraste de cor**: texto normal precisa 4.5:1, texto grande (18pt+) 3:1, componentes UI 3:1
- **Texto alternativo em imagens**: todo `<img>` precisa de `alt` descritivo ou `alt=""` se decorativo
- **Video/audio**: legendas para video, transcript para audio
- **Responsividade**: zoom ate 200% sem perda de funcionalidade
- **Orientacao**: nao trave em landscape ou portrait
- **Texto reflow em 320px**: sem scroll horizontal

### 2. Operable (Operavel)
- **Teclado**: todos os elementos interativos acessiveis via Tab
- **Skip links**: link "pular para conteudo" no inicio da pagina
- **Focus visivel**: outline ou ring em foco de todo elemento focavel
- **Trap de foco**: modals e menus devem trapar foco corretamente
- **Tempo**: nao ter timeouts sem aviso
- **WCAG 2.2 novidades**:
  - **Focus Not Obscured** (2.4.11/12): elemento focado nao pode ser coberto por sticky header
  - **Dragging Movements** (2.5.7): toda funcionalidade de drag tem alternativa de clique
  - **Target Size** (2.5.8): targets clicaveis >= 24x24px (exceto inline em texto)
  - **Consistent Help** (3.2.6): ajuda em posicao consistente
  - **Redundant Entry** (3.3.7): nao pedir mesma info duas vezes no fluxo
  - **Accessible Authentication** (3.3.8): nao exigir resolver puzzle cognitivo (CAPTCHA com alternativa)

### 3. Understandable (Compreensivel)
- **Lang attribute**: `<html lang="pt-BR">`
- **Labels em forms**: todo input com `<label>` associado
- **Mensagens de erro**: claras, identificam o campo, sugerem correcao
- **Navegacao consistente**: header/footer iguais em todas as paginas

### 4. Robust (Robusto)
- **HTML valido**: passar W3C validator
- **ARIA correto**: nao usar `role` redundante (`<button role="button">`), preferir HTML semantico
- **Status messages**: usar `aria-live` para feedbacks dinamicos

## Como corrigir

### Ferramentas para escanear
1. **axe DevTools** (extensao Chrome/Firefox) — roda auditoria automatizada
2. **Lighthouse** (Chrome DevTools > Lighthouse > Accessibility)
3. **WAVE** (wave.webaim.org) — outra opcao de auditoria
4. **Pa11y CLI**: `npx pa11y https://seusite.com` para CI

### Fluxo de correcao
1. Rode axe DevTools e Lighthouse, anote todos os issues
2. Priorize por severidade: criticos primeiro (contraste, alt, teclado)
3. Para React, use:
   - `eslint-plugin-jsx-a11y` no projeto para pegar issues em dev time
   - `@axe-core/react` para alertar em runtime no dev mode
4. Componentes comuns que sempre quebram:
   - **Modal**: precisa `role="dialog"`, `aria-modal="true"`, trap de foco, ESC fecha, retornar foco ao trigger
   - **Dropdown menu**: setas para navegar, Enter/Space ativa, ESC fecha
   - **Tabs**: usar pattern WAI-ARIA Authoring Practices
   - **Form**: cada input com label, erros com `aria-describedby`

### Bibliotecas que ajudam
- **Radix UI** ou **React Aria** (Adobe) — primitivos acessiveis prontos
- **Headless UI** — componentes acessiveis sem estilo

### Testar com leitor de tela
- Windows: NVDA (gratuito)
- macOS: VoiceOver (built-in, Cmd+F5)
- Faca o fluxo critico (CTA principal, form de signup) so com leitor de tela + teclado

### Auditoria manual essencial
1. Desconecte o mouse, navegue so com teclado — todos os fluxos devem funcionar
2. Zoom 200% — nada deve quebrar layout
3. Color contrast checker em todos os pares texto/fundo
4. Simule daltonismo (Chrome DevTools > Rendering > Emulate vision deficiencies)

## Resumo

Comece com automatizado (axe + Lighthouse), corrija criticos, depois manual com teclado + leitor de tela. Use eslint-plugin-jsx-a11y como guardrail. Para componentes complexos, adote Radix ou React Aria em vez de reinventar acessibilidade.
