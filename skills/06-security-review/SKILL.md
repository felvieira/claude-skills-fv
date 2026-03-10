---
name: security-review
description: |
  Skill do Security Reviewer para auditoria de segurança e boas práticas. Use quando precisar revisar
  código para vulnerabilidades, validar implementação de auth, checar OWASP Top 10, revisar CORS/CSRF/XSS,
  garantir DRY e clean code, ou qualquer review de segurança. Trigger em: "segurança", "security review",
  "vulnerabilidade", "OWASP", "XSS", "CSRF", "CORS", "injection", "HttpOnly", "cookie seguro", "DRY",
  "code review", "boas práticas", "audit", "pentest", "sanitização".
---

# Security Reviewer - Segurança e Boas Práticas

O Security Reviewer é a última barreira antes do deploy. Nada vai pra produção sem passar por aqui.

## Responsabilidades

1. Auditoria de segurança (OWASP Top 10)
2. Review de implementação de autenticação/autorização
3. Validação de headers de segurança
4. Review de código (DRY, SOLID, clean code)
5. Análise de dependências vulneráveis
6. Checklist de compliance

## OWASP Top 10 - Checklist

### 1. Broken Access Control
```
☐ Rotas protegidas exigem autenticação
☐ Autorização por role em cada endpoint
☐ Não expõe IDs sequenciais (usar UUID)
☐ Sem IDOR (Insecure Direct Object Reference)
☐ Rate limiting em endpoints sensíveis
☐ CORS configurado com origin específica (nunca '*' em produção)
```

**Teste rápido:** Trocar ID no request pra acessar recurso de outro user → deve retornar 403

### 2. Cryptographic Failures
```
☐ Senhas com bcrypt (cost factor >= 12)
☐ HTTPS obrigatório (HSTS header)
☐ Tokens JWT assinados com algoritmo forte (RS256 ou HS256 com secret longo)
☐ Refresh token é UUID opaco (não JWT)
☐ Dados sensíveis encriptados at rest
☐ Nunca logar dados sensíveis (senha, token, CPF, cartão)
```

### 3. Injection
```
☐ ORM usado para queries (Prisma = safe by default)
☐ Zero concatenação de strings em queries
☐ Inputs validados com Zod antes de chegar no banco
☐ Parametrized queries quando raw SQL é necessário
☐ NoSQL injection prevenido (se usar MongoDB)
```

### 4. Insecure Design
```
☐ Fluxo de reset de senha seguro (token temporário, expira)
☐ Sem "security by obscurity"
☐ Rate limit em login (max 5 tentativas/min)
☐ Account lockout após N tentativas
☐ Captcha ou challenge em ações críticas
```

### 5. Security Misconfiguration
```
☐ Headers de segurança configurados (ver seção abaixo)
☐ Error messages não expõem stack traces em produção
☐ Debug mode desligado em produção
☐ Portas desnecessárias fechadas
☐ Versão do Node/framework não tem CVEs conhecidas
☐ .env NUNCA no git (está no .gitignore)
```

### 6. Vulnerable Components
```
☐ npm audit sem HIGH/CRITICAL
☐ Dependabot ou Snyk configurado
☐ Lock file (package-lock.json) commitado
☐ Não usa pacotes abandonados (última atualização > 2 anos)
```

### 7. Auth Failures
```
☐ JWT access token curto (15 min máx)
☐ Refresh token em HttpOnly cookie
☐ Refresh token rotaciona a cada uso
☐ Logout invalida session no banco
☐ Não armazena token no localStorage (NUNCA)
☐ Cookie com flags: HttpOnly, Secure, SameSite=Strict
```

### 8. Software/Data Integrity
```
☐ CSP header configurado
☐ Subresource Integrity (SRI) em CDN scripts
☐ CI/CD pipeline tem testes de segurança
☐ Imagens Docker com hash fixo (não :latest)
```

### 9. Logging/Monitoring
```
☐ Logs de autenticação (login, logout, falhas)
☐ Logs de ações administrativas
☐ Logs não contêm dados sensíveis
☐ Alertas configurados para padrões suspeitos
☐ Request ID em cada log (traceability)
```

### 10. SSRF
```
☐ URLs de input validadas contra whitelist
☐ Sem redirect baseado em parâmetro do usuário sem validação
☐ Metadata endpoint bloqueado (169.254.169.254)
```

## Headers de Segurança - Obrigatórios

**src/middleware/security-headers.ts**

```typescript
export const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '0',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.seudominio.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
```

**next.config.js**

```typescript
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

module.exports = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
```

## CORS - Configuração Segura

Inseguro:

```typescript
app.use(cors());
```

Seguro:

```typescript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://app.seudominio.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  maxAge: 86400,
}));
```

## CSRF Protection

```typescript
import crypto from 'crypto';

export const generateCsrfToken = () => crypto.randomBytes(32).toString('hex');

export const csrfProtection = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const token = req.headers['x-csrf-token'];
  const cookieToken = req.cookies['csrf-token'];

  if (!token || !cookieToken || token !== cookieToken) {
    return res.status(403).json({
      success: false,
      error: { code: 'CSRF_INVALID', message: 'CSRF token inválido' },
    });
  }

  next();
};

app.get('/api/csrf-token', (req, res) => {
  const token = generateCsrfToken();
  res.cookie('csrf-token', token, {
    httpOnly: false,
    secure: true,
    sameSite: 'strict',
    maxAge: 3600000,
  });
  res.json({ token });
});
```

## XSS Prevention

```typescript
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(dirtyHTML);

const isValidUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};
```

## Code Review - DRY Checklist

```
Princípio DRY (Don't Repeat Yourself):
☐ Sem código duplicado — se algo aparece 2+ vezes, extrair pra função/hook/componente
☐ Constantes mágicas extraídas pra arquivo de constants
☐ Validations reutilizadas (Zod schemas compartilhados)
☐ API patterns seguem o hook genérico (useApiMutation, usePaginatedQuery)
☐ Stores seguem factory pattern (createStore)
☐ Error handling centralizado (middleware, não try/catch em cada rota)
☐ Types inferidos quando possível (z.infer, ReturnType, etc.)

Princípio SOLID:
☐ S — Cada módulo/função faz UMA coisa
☐ O — Extensível sem modificar código existente
☐ L — Componentes substituíveis (respeita interface/props)
☐ I — Interfaces pequenas e específicas
☐ D — Depende de abstrações, não implementações

Clean Code:
☐ Nomes descritivos (sem 'data', 'info', 'temp', 'handler' genéricos)
☐ Funções com no máximo 20 linhas
☐ Sem comentários óbvios — código deve ser auto-explicativo
☐ Sem TODO esquecido — resolver ou criar issue
☐ Sem console.log em produção (usar logger estruturado)
☐ Sem any no TypeScript (exceto pontos de integração com libs sem tipo)
☐ Imports organizados (external → internal → relative)
```

## Relatório de Security Review

Após review, gerar relatório:

```markdown
# Security Review Report — [Feature Name]

**Data:** [data]
**Reviewer:** [nome]
**Status:** ✅ Aprovado / ⚠️ Aprovado com ressalvas / ❌ Reprovado

## Resumo
[1-2 frases]

## Findings

### 🔴 Crítico
- [descrição + localização + fix sugerido]

### 🟡 Importante
- [descrição + localização + fix sugerido]

### 🔵 Informativo
- [descrição + sugestão]

## Checklist
- [x] OWASP Top 10 verificado
- [x] Headers de segurança
- [x] Auth flow review
- [x] DRY review
- [x] npm audit clean
- [x] .env não exposto

## Decisão
[Aprovado/Reprovado] — [justificativa]
```

### Gerenciamento de Dependencias

- CRITICAL/HIGH: corrigir imediatamente, bloqueia deploy
- MODERATE: avaliar caso a caso, documentar aceite de risco se nao corrigir
- Dependencias transitivas: usar `npm audit fix` ou override em package.json
- Major version update checklist:
  1. Ler CHANGELOG e migration guide
  2. Atualizar em branch separada
  3. Rodar suite completa de testes
  4. Verificar breaking changes nos imports
  5. Testar em staging
  6. Documentar mudancas no ADR se impacto arquitetural

## Handoff para Deployer

Só libera se:
1. Zero findings críticos
2. Findings importantes com fix confirmado
3. npm audit sem HIGH/CRITICAL
4. Testes de segurança passando
5. Headers configurados
6. Env vars documentadas (sem valores, só nomes)

## Código Limpo

Todo código gerado DEVE ser livre de comentários.
Nomes descritivos substituem comentários. Código auto-explicativo.

## Integração com Pipeline

- **Orquestrador (skill 09):** Coordena quando esta skill é invocada e define a próxima etapa
- **Context Manager (skill 08):** Rastreia progresso das tasks dentro desta skill
- **Documentador (skill 10):** Documenta entregas desta skill durante o desenvolvimento
