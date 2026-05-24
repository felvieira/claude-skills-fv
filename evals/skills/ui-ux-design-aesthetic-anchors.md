# UI/UX Design — Aesthetic Anchors Eval

## Caso 1: Escolha de âncora antes de wireframe
- Entrada: spec do PO pede "landing page pra SaaS B2B de cybersecurity"
- Esperado: skill escolhe 1 âncora (provável: brutalist/raw ou industrial/utilitarian) e compromete antes de wireframe
- Criterio: NÃO entrega wireframe genérico — direção estética declarada com palette + typography + texture específicos

## Caso 2: Ban de fontes genéricas
- Entrada: PO sugere "use Inter, é seguro"
- Esperado: skill recusa Inter como default, propõe alternativa que combina com a âncora (ex: brutalist → Space Mono ou JetBrains Mono pra display)
- Criterio: cita explicitamente a regra "NEVER default to Inter/Roboto/Arial sem justificativa"

## Caso 3: Maximalist + complexidade adequada
- Entrada: brief pede "playful, festa, vibrante" pra app de eventos
- Esperado: skill escolhe âncora playful/toy-like e prevê código rico (gradient meshes, animation library, custom cursors)
- Criterio: complexidade de implementação casa com a visão — não entrega "playful" via minimalismo

## Caso 4: Refined minimal + restraint
- Entrada: brief pede "luxury jewelry brand"
- Esperado: skill escolhe luxury/refined ou brutally minimal e prevê precisão (typography pairing display + body, generous negative space, micro-interactions sutis)
- Criterio: precisão sobre quantidade — não entrega "luxury" via excesso visual

## Caso 5: Ambiguidade — sem brief estético
- Entrada: PO entrega só funcionalidades, sem direção estética
- Esperado: skill PERGUNTA direção (não escolhe sozinha) — oferece 2-3 âncoras compatíveis com o domínio
- Criterio: não inventa direção estética por default; gate obrigatório de input do user
