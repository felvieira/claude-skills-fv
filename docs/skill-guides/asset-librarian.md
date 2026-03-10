# Asset Librarian Guide

> Guia auxiliar da skill `19-asset-librarian`.  
> Abrir apenas quando o inventario visual for complexo ou quando precisar do template completo de `assets.md`.

---

## O que esta skill faz

O Asset Librarian mapeia e cataloga todo o sistema visual de um repositorio: logos, icones, ilustracoes, fontes, tokens de cor, backgrounds, favicons e mascotes. O resultado e um inventario reutilizavel que evita inconsistencias visuais e serve de base para `Image Generator`, `UI/UX` e `Frontend`.

---

## Quando acionar

| Situacao | Acionar? |
|----------|----------|
| Iniciar trabalho visual em repo desconhecido | Sim |
| UI/UX ou Frontend precisar saber quais assets existem | Sim |
| Image Generator precisar de contexto de identidade visual | Sim |
| Gerar asset novo sem necessidade de inventario | Nao |
| Substituir julgamento visual de UI/UX | Nao |

---

## Fluxo de trabalho

```
1. Mapear estrutura de assets do repo
   └── public/, assets/, src/assets/, static/, icons/

2. Catalogar por categoria
   ├── Logos e marcas
   ├── Icones e favicons
   ├── Ilustracoes, backgrounds, mascotes
   ├── Fontes (local e CDN)
   └── Design tokens (cores, espacamento, tipografia)

3. Identificar gaps e conflitos
   ├── Duplicacoes ou versoes conflitantes
   ├── Assets obsoletos ou sem uso
   └── Ausencias criticas (ex: dark mode, tamanhos faltando)

4. Persistir em docs/repo-audit/assets.md
```

---

## Template: `docs/repo-audit/assets.md`

```markdown
# Assets do Projeto

_Atualizado em: YYYY-MM-DD_

## Identidade Visual

- **Paleta principal:** #HEX, #HEX, #HEX
- **Tipografia:** Nome da fonte, peso(s) usado(s)
- **Tom visual:** (ex: minimalista, colorido, corporativo, playful)

## Logos e Marcas

| Arquivo | Formato | Uso | Observacao |
|---------|---------|-----|------------|
| `logo.svg` | SVG | Header, splash | Versao dark em logo-dark.svg |
| `favicon.ico` | ICO | Browser tab | |

## Icones

| Conjunto | Local | Stack | Observacao |
|----------|-------|-------|------------|
| Lucide | npm | React | v0.x |
| Custom icons | `src/assets/icons/` | SVG | 12 icones proprios |

## Ilustracoes e Backgrounds

| Arquivo | Uso | Observacao |
|---------|-----|------------|
| `hero-bg.png` | Landing hero | 1440px, light only |

## Fontes

| Fonte | Origem | Pesos | Observacao |
|-------|--------|-------|------------|
| Inter | Google Fonts | 400, 600, 700 | Carregada via CDN |

## Design Tokens

| Token | Valor | Uso |
|-------|-------|-----|
| `--color-primary` | `#4F46E5` | Botoes, links |
| `--radius-md` | `8px` | Cards, inputs |

## Gaps e Riscos

- [ ] Logo dark mode ausente
- [ ] Favicon 32px faltando
- [ ] Fontes sem fallback local declarado

## Notas de Consistencia

> Resumo de identidade visual para reutilizacao pelo agente em tarefas subsequentes.
```

---

## Categorias de inventario

### Logos e marcas
- Logo principal (SVG preferido)
- Variantes: dark, monocromatico, icone isolado
- Dimensoes e espacamento minimo recomendado

### Icones e favicons
- Biblioteca usada (Lucide, Heroicons, Phosphor, custom...)
- Tamanhos disponíveis
- Favicon: .ico, 16px, 32px, apple-touch-icon

### Ilustracoes, backgrounds e mascotes
- Origem (proprio, Unsplash, gerado por IA...)
- Resolucoes e responsividade
- Licenca quando relevante

### Fontes
- Fontes locais vs CDN
- Subsets carregados
- Estrategia de fallback

### Design tokens
- Cores: primaria, secundaria, neutra, status (sucesso, erro, aviso)
- Espacamento base
- Raios de borda
- Sombras recorrentes

---

## Integracao com outras skills

| Skill | O que consome de Asset Librarian |
|-------|----------------------------------|
| `Image Generator` | Paleta, tom visual, fontes — para manter coerencia ao gerar assets |
| `UI/UX` | Tokens, icones e logos disponiveis para wireframes e specs |
| `Frontend` | Lista de assets a importar, tokens CSS/JS a referenciar |
| `Repo Auditor` | Resumo de identidade visual para contexto inicial do repo |
| `Marketing Copy` | Tom visual e identidade de marca para alinhar copy ao produto |

---

## Evidencia de conclusao

- [ ] `docs/repo-audit/assets.md` criado ou atualizado
- [ ] Logos, icones e fontes catalogados
- [ ] Design tokens listados
- [ ] Gaps e riscos de consistencia registrados
- [ ] Identidade visual resumida para reutilizacao
