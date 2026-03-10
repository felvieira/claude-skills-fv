# Accessibility Specialist Guide

> Guia auxiliar da skill `22-accessibility-specialist`.  
> Abrir apenas quando a revisao de acessibilidade for detalhada ou quando precisar dos checklists completos por categoria.

---

## O que esta skill faz

O Accessibility Specialist traz rigor dedicado para acessibilidade digital — teclado, screen reader, contraste, semantica, motion reduction e formularios — sem depender de UI/UX ou Frontend para fazer essa analise. O resultado sao findings priorizados por impacto real, prontos para handoff.

---

## Quando acionar

| Situacao | Acionar? |
|----------|----------|
| Fluxo critico novo (onboarding, checkout, login) | Sim |
| Projeto com requisito de compliance (WCAG 2.1 AA) | Sim |
| Componente complexo: modal, combobox, datepicker | Sim |
| Review geral de acessibilidade antes de launch | Sim |
| Check cosmetico de ultima hora sem impacto real | Nao |
| Substituir UI/UX ou Frontend na implementacao base | Nao |

---

## Niveis WCAG

| Nivel | Obrigatoriedade | Exemplos |
|-------|----------------|---------|
| A | Minimo absoluto | Alt text, sem armadilhas de teclado |
| AA | Padrao de mercado e legal | Contraste 4.5:1, foco visivel, labels |
| AAA | Excelencia | Contraste 7:1, linguagem simples, ASL |

**Meta recomendada: WCAG 2.1 AA** para a maioria dos produtos.

---

## Checklist completo por categoria

### Teclado

- [ ] Todos os elementos interativos alcancaveis via `Tab`
- [ ] Ordem de foco logica e previsivel
- [ ] `Shift+Tab` funciona corretamente
- [ ] Sem armadilha de foco (focus trap proposital so em modais ativos)
- [ ] Acoes possiveis via `Enter` e `Space` quando apropriado
- [ ] `Escape` fecha modais, dropdowns e overlays

### Foco visivel

- [ ] Indicador de foco visivel em todos os elementos (`:focus-visible`)
- [ ] Foco nao removido via `outline: none` sem substituto equivalente
- [ ] Contraste do indicador de foco: minimo 3:1 contra fundo adjacente

### Semantica e estrutura

- [ ] Hierarquia de headings correta (`h1` > `h2` > `h3`...)
- [ ] Landmarks presentes: `main`, `nav`, `header`, `footer`, `aside`
- [ ] Listas usadas para conjuntos de itens relacionados
- [ ] Botoes sao `<button>`, links sao `<a href>` — sem div/span clicavel sem role
- [ ] Tabelas com `<caption>`, `<th scope>` quando necessario

### Roles e ARIA

- [ ] `role` somente quando semantica nativa nao for suficiente
- [ ] `aria-label` ou `aria-labelledby` em elementos sem texto visivel
- [ ] `aria-expanded`, `aria-selected`, `aria-checked` atualizados dinamicamente
- [ ] `aria-live` em regioes que atualizam sem reload (notificacoes, erros inline)
- [ ] Nao abusar de ARIA — semantica HTML nativa e preferivel

### Contraste

| Contexto | Minimo AA | Recomendado AAA |
|----------|-----------|-----------------|
| Texto normal (< 18px) | 4.5:1 | 7:1 |
| Texto grande (>= 18px ou 14px bold) | 3:1 | 4.5:1 |
| Componentes de UI e graficos | 3:1 | — |
| Texto decorativo | Sem requisito | — |

- [ ] Texto sobre background verifica contraste minimo
- [ ] Icones informativos verificam contraste 3:1
- [ ] Status nao comunicado apenas por cor (usar icone ou texto tambem)

### Imagens e midia

- [ ] `alt` descritivo em imagens informativas
- [ ] `alt=""` em imagens decorativas
- [ ] SVG inline com `<title>` ou `aria-label` quando informativo
- [ ] Videos com legendas (closed captions)
- [ ] Audio com transcript quando relevante

### Formularios

- [ ] Todo input tem `<label>` associado (via `for/id` ou `aria-labelledby`)
- [ ] Mensagens de erro associadas ao campo (`aria-describedby`)
- [ ] Campos obrigatorios indicados visualmente e com `aria-required`
- [ ] Instrucoes de formato visíveis antes do campo (nao so no placeholder)
- [ ] Placeholder nao e substituto para label
- [ ] Erros de validacao descrevem o problema e como corrigir

### Motion e animacao

- [ ] `@media (prefers-reduced-motion: reduce)` implementado
- [ ] Animacoes criticas nao transmitem informacao que desaparece
- [ ] Sem conteudo que pisca mais de 3x por segundo (seizure risk)
- [ ] Carrosseis e auto-play com controle de pause/stop

### Screen reader

- [ ] Fluxo principal navegavel linearmente faz sentido semantico
- [ ] Conteudo dinamico anunciado via `aria-live` quando necessario
- [ ] Modais capturam foco e retornam ao trigger ao fechar
- [ ] Nomes acessiveis de botoes de icone: `aria-label="Fechar"` nao `aria-label="X"`

---

## Ferramentas recomendadas

| Ferramenta | Uso |
|------------|-----|
| axe DevTools | Auditoria automatica no browser |
| Lighthouse Accessibility | Score rapido via Chrome DevTools |
| NVDA (Windows) | Screen reader gratuito para testes |
| VoiceOver (macOS/iOS) | Screen reader nativo Apple |
| Colour Contrast Analyser | Verificar contraste de cores |
| Playwright + axe-core | Testes automatizados de acessibilidade em CI |

---

## Priorizacao de findings

| Severidade | Criterio | Acao |
|-----------|----------|------|
| Critico | Impede uso por usuarios com deficiencia | Bloquear release |
| Alto | Dificulta significativamente a experiencia | Corrigir antes do launch |
| Medio | Degrada a experiencia, workaround possivel | Planejar para proximo sprint |
| Baixo | Melhoria incremental sem impacto imediato | Backlog |

---

## Integracao com outras skills

| Skill | Relacao com Accessibility Specialist |
|-------|--------------------------------------|
| `UI/UX` | Design deve incluir foco, contraste e semantica; Accessibility valida |
| `Frontend` | Implementa as correcoes apontadas |
| `QA Testing` | Inclui casos de acessibilidade na suite de testes |
| `Documenter` | Registra criterios de acessibilidade como parte da feature doc |
| `Motion Design` | Motion Specialist deve respeitar `prefers-reduced-motion` |

---

## Evidencia de conclusao

- [ ] Checklist de teclado e foco verificado
- [ ] Semantica e roles revisados
- [ ] Contraste validado nos contextos criticos
- [ ] Formularios com labels e mensagens de erro corretos
- [ ] `prefers-reduced-motion` implementado onde ha animacao
- [ ] Screen reader consegue navegar o fluxo principal
- [ ] Findings priorizados por severidade
- [ ] Handoff entregue para UI/UX, Frontend ou QA
