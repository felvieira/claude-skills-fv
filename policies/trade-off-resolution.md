# Trade-off Resolution — Quando policies/sinais conflitam

> **Inspiração:** Birgitta Böckeler (Thoughtworks) — pergunta aberta: *"How far can we trust agents to make sensible trade-offs when instructions and feedback signals point in different directions?"*
> Ver `docs/inspiration/harness-engineering.md`.

## Problema

O kit tem **39 policies + 39 skills + 18 hooks**. Conforme o sistema cresce, instruções **inevitavelmente conflitam** em situações borderline:

- `token-efficiency.md` diz "responda curto"
- `dense-output-mode.md` diz "adapte densidade à pergunta"
- `verification-before-completion.md` diz "valide antes de concluir"

O modelo precisa decidir qual ganha **sem inventar regra na hora**. Esta policy define **hierarquia explícita + casos resolvidos** pra evitar inconsistência entre sessões.

## Hierarquia Canônica

Quando regras conflitam, a **maior autoridade** ganha:

```
1. memory/constitution.md  ← user-defined no projeto consumidor (top)
2. GLOBAL.md               ← kit-wide invariants
3. policies/*.md           ← kit shared rules
4. skills/NN-*/SKILL.md    ← skill-specific playbook
5. templates/*.md          ← format suggestions (lowest)
```

**Regra mnemônica:** quanto mais específico ao projeto, maior autoridade. Constitution > kit defaults.

### Exceções (overrides explícitos)

- **`force:` ou `!` prefix** no prompt do user → bypassa qualquer gate (já implementado em `pre-execution-gate`)
- **Hook que retorna `decision: "block"`** → wins sobre advisory (Princípio 4 de `policies/quality-gates.md`)
- **Constitution explicit override clause** → wins sobre kit (constitution pode dizer "ignore X")

## Casos Resolvidos (5 conflitos comuns)

### Caso 1 — Token efficiency vs Dense output mode

**Conflito:**
- `policies/token-efficiency.md`: "responda no mínimo necessário"
- `policies/dense-output-mode.md`: "densidade proporcional à complexidade da pergunta"

**Resolução:** dense-output-mode **ganha** porque é mais específico (define a estratégia, token-efficiency é o motivo).

**Aplicação prática:**
- Pergunta trivial ("rodou?") → densidade baixa (token-efficiency + dense alinhados)
- Pergunta de arquitetura → densidade alta (dense > token-efficiency)
- Override do user: `--brief` força mínimo, `--verbose` força máximo

### Caso 2 — Verification vs Velocity

**Conflito:**
- `policies/verification-before-completion.md`: "evidence before assertions"
- Contexto autônomo (`/swarm`, `/auto`): "execute sem intervenção"

**Resolução:** **verification ganha sempre** em código de produto. Velocity nunca justifica skip de validação.

**Excecão:** spike/POC throwaway com prefix explícito (`/auto --no-tdd`) — user assume risco.

### Caso 3 — Code clarity vs Token economy

**Conflito:**
- `policies/writing-clarity.md`: "código autoexplicativo, nomes descritivos"
- `policies/token-efficiency.md`: "evite verbosidade"

**Resolução:** **clarity ganha** em código. Token-efficiency aplica a **comunicação humano-modelo** (mensagens, relatórios), não ao código produzido.

### Caso 4 — Source-driven vs Senior dev override

**Conflito:**
- `policies/source-driven.md`: "cite fontes pra decisões de framework"
- `GLOBAL.md` Senior Dev Override: "corrija problemas estruturais mesmo sem pedido"

**Resolução:** **Senior dev override ganha** quando o problema é claro (smell óbvio). Source-driven aplica quando há **escolha entre alternativas** — não quando algo está claramente errado.

### Caso 5 — Stack flexibility vs Existing convention

**Conflito:**
- `policies/stack-flexibility.md`: "adapte ao stack real do projeto"
- Convenção do projeto consumidor (ex: usa eslint mas tem 200 warnings ignoradas)

**Resolução:** **convenção do projeto ganha** se for **explícita** (eslint config existe). **Stack-flexibility ganha** se o stack é claro mas convenção está implícita (sem eslint config, mas todos os arquivos seguem padrão visível).

Em ambos casos, **documentar a decisão** em `docs/repo-audit/current.md` na próxima auditoria.

## Como o modelo deve decidir em conflito novo

### Decision tree

```
1. Tem caso resolvido nesta policy? → aplicar
2. Não → Constitution do projeto fala sobre isso? → constitution ganha
3. Não → uma das policies tem termo "ALWAYS"/"NEVER"/"OBRIGATORIO"? → essa ganha
4. Não → pergunte ao user explicitamente (com AskUserQuestion):
   "Detectei conflito entre <policy A> e <policy B>. Como prefere resolver?"
5. Após decisão do user → **documentar** este novo caso aqui (PR pra esta policy)
```

### Anti-padrões (não fazer)

- ❌ **Decidir silenciosamente** — modelo escolhe um lado sem mencionar — vira inconsistência entre sessões
- ❌ **Listar 5 opções** — overhead. Hierarquia + caso resolvido bastam.
- ❌ **Justificar com "geralmente"** — sinal de que não há regra concreta. Documente uma.
- ❌ **Ignorar conflito** — pretender que não existe — produz output incoerente

## Sinais de conflito frequente (red flags)

Quando o **mesmo conflito** aparece em **3+ sessões**, é hora de:

1. Documentá-lo nesta policy como Caso Resolvido
2. Considerar resolver a **causa raiz** (policy A e B realmente precisam coexistir? podem ser fundidas?)
3. Rodar `scripts/check-harness-coherence.mjs` (v2.6.0+) — talvez já detecte como contradição

## Telemetria (futuro v2.7.1)

Roadmap: `.bot/conflict-decisions.jsonl` registrando:
- Timestamp
- Policies envolvidas
- Resolução aplicada (caso resolvido vs ad-hoc)
- Outcome (user reverted? user confirmed?)

Permite `/savings` mostrar "N conflicts resolved via policy, M required user intervention" — mede coherence health.

## Integração com `/savings`

`/savings --since 7d` deveria (v2.7.0+) mostrar:
- Conflitos detectados na semana
- % resolvidos via hierarquia automática
- Top 3 conflitos recorrentes (candidatos a virar Caso Resolvido)

## Referências

- `GLOBAL.md` — hierarquia de instruções base
- `policies/harness-categories.md` Princípio 4 (coherence)
- `policies/self-correcting-sensors.md` — sensor que detecta conflito deveria sugerir resolução
- `scripts/check-harness-coherence.mjs` — detector estrutural de contradições
- Birgitta Böckeler, ["Harness engineering for coding agent users"](https://martinfowler.com/articles/exploring-gen-ai/harness-engineering.html)
