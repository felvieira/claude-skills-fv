# Melhorias do repositório

Leitura estática de quatorze arquivos: dez arquivos de código do núcleo MCP, proteção de ferramentas, entrypoint e schema de template, mais quatro manifestos/configurações auxiliares. Regras operacionais do kit são separadas de exemplos de aplicação; não há afirmação de produto ou RPA implantado.

4 comportamentos descritos a partir de código lido. Cobertura parcial; não equivale a execução em produção.

## MEL-01 — Validar sessão e revisar as exceções de rotas

Domínio: Segurança e produto. Natureza: reference. Evidência: inferred.

**Quando:** Um app consumidor usa o middleware de exemplo como barreira de acesso.

**O que acontece:** Proposta P1: validar token no servidor e substituir os atalhos de ponto/prefixo por regras de rota explícitas. Aplicar headers também às respostas antecipadas. Impacto: reduzir a diferença entre o redirecionamento da UI e autorização real.

**Exceções e limites:** Não implementado nesta revisão. Depende do contrato de sessão do backend; esforço médio, risco de bloquear rotas públicas legítimas. Os outros endpoints não foram auditados.

**Verificação:** Proposto: testar cookie inválido/expirado, caminho com ponto, prefixo semelhante a API pública, rotas realmente públicas e headers em todos os retornos.

[evidence: src/middleware.ts:16-56]

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

  // Security headers em todas as respostas
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}
```

## MEL-02 — Priorizar a restrição mais forte em comandos compostos

Domínio: Segurança das automações. Natureza: operational. Evidência: inferred.

**Quando:** Um comando contém mais de uma operação que casa com regras distintas.

**O que acontece:** Proposta P1: avaliar todas as correspondências antes de decidir e fazer closed prevalecer sobre gated. Impacto: a ordem dos segmentos não deve reduzir a restrição.

**Exceções e limites:** Não implementado. Esforço médio, risco de falsos positivos. A melhoria não torna regex um parser completo de shell.

**Verificação:** Proposto: fixtures gated→closed, closed→gated, substituição de comando e escape; todas as combinações contendo closed devem negar.

[evidence: hooks/scripts/permission-ladder-guard.mjs:116-171]

```text
  const segments = [command];
  for (const m of command.matchAll(/\$\(([^)]*)\)|`([^`]*)`/g)) {
    segments.push(m[1] ?? m[2] ?? "");
  }
  const flat = segments.flatMap((s) => s.split(/&&|\|\||[;|\n]/));
  return flat.map((s) => s.trim()).filter(Boolean);
}

// A shell treats `"rm"` and `rm` identically; the pattern's word-boundary
// regex does not, because a straddling quote character breaks \b. Strip
// paired quotes immediately around a bareword before matching so this one
// specific dodge (there's no way to close all of them with regex, see the
// header note) doesn't slip through for free.
function stripCommandQuoting(command) {
  return command.replace(/(^|[\s;&|])["']([\w./-]+)["']/g, "$1$2");
}

let inputBuffer = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => { inputBuffer += chunk; });

process.stdin.on("end", () => {
  const allow = () => {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  };

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

## MEL-03 — Distinguir arquivo ausente de falha de leitura

Domínio: Confiabilidade e diagnóstico. Natureza: operational. Evidência: inferred.

**Quando:** readFile recebe erro de permissão, I/O ou arquivo inexistente.

**O que acontece:** Proposta P2: devolver ausência apenas para ENOENT e reportar as demais falhas com contexto sanitizado. Impacto: o catálogo não deve parecer vazio quando a leitura falhou.

**Exceções e limites:** Não implementado. Esforço pequeno; mudar de null para erro pode exigir ajuste dos consumidores e compatibilidade do contrato.

**Verificação:** Proposto: testar arquivo ausente, permissão negada, leitura válida e propagação controlada do erro no serviço.

[evidence: mcp-server/src/services/file-reader.ts:8-16]

```text
export async function readFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

export async function listSkills
```

## MEL-04 — Validar a posição antes de consultar a etapa

Domínio: Contratos, testes e DX. Natureza: operational. Evidência: inferred.

**Quando:** Um consumidor envia índice negativo, fracionário ou NaN a getNextStep.

**O que acontece:** Proposta P2: exigir inteiro não negativo e escolher contrato explícito de erro/null. Impacto: impedir retorno undefined quando o tipo anunciado promete etapa ou null.

**Exceções e limites:** Não implementado. Esforço pequeno; é preciso decidir e documentar compatibilidade de erro para clientes existentes.

**Verificação:** Proposto: testar -1, 0, último índice, tamanho do pipeline, fração e NaN.

[evidence: mcp-server/src/lib/pipeline-engine.ts:166-177]

```text
export function getNextStep(
  pipelineType: TaskType,
  currentStep: number,
): { id: string; name: string; purpose: string } | null {
  const config = PIPELINES[pipelineType];
  if (!config) return null;

  const nextIndex = currentStep;
  if (nextIndex >= config.steps.length) return null;

  return config.steps[nextIndex];
}
```
