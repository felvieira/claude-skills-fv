# Segurança

Leitura estática de quatorze arquivos: dez arquivos de código do núcleo MCP, proteção de ferramentas, entrypoint e schema de template, mais quatro manifestos/configurações auxiliares. Regras operacionais do kit são separadas de exemplos de aplicação; não há afirmação de produto ou RPA implantado.

2 comportamentos descritos a partir de código lido. Cobertura parcial; não equivale a execução em produção.

## SEC-01 — O middleware verifica presença de cookie, não validade da sessão

Domínio: Autenticação. Natureza: reference. Evidência: observed.

**Quando:** Uma rota não dispensada passa pela checagem do middleware.

**O que acontece:** A presença do cookie refresh-token é usada como hasSession. Sem cookie, a rota protegida redireciona para login; nas rotas de login/cadastro, a presença do cookie redireciona para dashboard.

**Exceções e limites:** Não há validação JWT neste arquivo. Prefixos de APIs públicas e caminhos contendo ponto retornam antes da checagem. A proteção efetiva do backend não foi revisada; isto não é certificação de acesso seguro.

**Verificação:** Leitura estática do código citado. O fluxo não foi executado em uma aplicação consumidora neste levantamento.

[evidence: src/middleware.ts:16-49]

```text
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignora assets estáticos e API routes públicas
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') ||
    publicApiRoutes.some((r) => pathname.startsWith(r))
  ) {
    return NextResponse.next();
  }

  // Checa se tem token (via cookie de session ou header)
  // Em produção, validar JWT server-side aqui
  const hasSession = request.cookies.has('refresh-token');

  // Rota pública: permite acesso
  if (publicRoutes.some((r) => pathname.startsWith(r))) {
    // Se já autenticado, redireciona pra dashboard
    if (hasSession && authRoutes.some((r) => pathname.startsWith(r))) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Rota protegida sem sessão: redireciona pra login
  if (!hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Security headers
```

## SEC-02 — O guard diferencia pedir aprovação de negar a ação

Domínio: Permissão de ferramentas. Natureza: operational. Evidência: observed.

**Quando:** Com o guard habilitado, um comando Bash casa com uma regra.

**O que acontece:** A primeira correspondência decide: lane closed produz deny; as demais produzem ask, salvo escape explícito permitido apenas para essas demais lanes.

**Exceções e limites:** O padrão é desabilitado. Entrada JSON inválida, ferramenta diferente de Bash ou ausência de match libera. Regex não interpreta toda a linguagem de shell; combinações podem selecionar uma regra menos restritiva antes da closed.

**Verificação:** Leitura estática do código citado. O fluxo não foi executado em uma aplicação consumidora neste levantamento.

[evidence: hooks/scripts/permission-ladder-guard.mjs:104-110]

```text
function extractCommand(input) {
  const name = input?.tool_name || "";
  if (name === "Bash") return input?.tool_input?.command || "";
  return "";
}

// Splits
```

[evidence: hooks/scripts/permission-ladder-guard.mjs:143-171]

```text
  if (isHookDisabled("permission-ladder-guard")) return allow();

  let input = {};
  try { input = JSON.parse(inputBuffer); } catch { return allow(); }

  const cfg = readHookConfig("permission_ladder_guard", { enabled: false });
  if (cfg.enabled !== true) return allow();

  const command = extractCommand(input);
  if (!command) return allow();

  const segments = splitCompoundCommand(command).map(stripCommandQuoting);
  let hit = null;
  let matchedSegment = command;
  for (const segment of segments) {
    hit = LADDER.find((rule) => rule.pattern.test(segment));
    if (hit) { matchedSegment = segment; break; }
  }
  if (!hit) return allow();

  const isClosedLane = hit.lane === "closed";

  // Escape hatch, same convention as design-anchor-guard and dev-guard — but
  // it does not apply to a closed lane. A lane that any suffix can open is a
  // threshold, not a closed lane, and thresholds are exactly what this is
  // meant not to be.
  if (!isClosedLane && /permission-ladder:\s*allow/i.test(command)) return allow();

  const reason =
```

[evidence: hooks/scripts/permission-ladder-guard.mjs:216-224]

```text
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      // Closed lane denies outright: there is no approval that opens it from
      // inside the agent loop. Everything else asks a human.
      permissionDecision: isClosedLane ? "deny" : "ask",
      permissionDecisionReason: reason,
    },
  }));
```
