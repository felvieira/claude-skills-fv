# Security Review Guide

> Guia auxiliar da skill `06-security-review`. Consultar apenas quando a revisao exigir profundidade maior que o checklist base da skill.

---

## Indice

- [OWASP Top 10 — Checklist Detalhado](#owasp-top-10--checklist-detalhado)
- [Headers de Seguranca](#headers-de-seguranca)
- [CORS e CSRF](#cors-e-csrf)
- [XSS Prevention](#xss-prevention)
- [Auth Flow Seguro](#auth-flow-seguro)
- [Dependencias e Audit](#dependencias-e-audit)
- [DRY e Clean Code](#dry-e-clean-code)
- [Relatorio de Security Review](#relatorio-de-security-review)
- [Severidades e Decisao de Bloqueio](#severidades-e-decisao-de-bloqueio)

---

## OWASP Top 10 — Checklist Detalhado

### 1. Broken Access Control

```
☐ Rotas protegidas exigem autenticacao
☐ Autorizacao por role em cada endpoint (nao so autenticacao)
☐ Sem IDs sequenciais expostos — usar UUID
☐ Sem IDOR: recurso de usuario A nao pode ser acessado por usuario B
☐ Rate limiting em endpoints sensiveis (login, reset senha, export)
☐ CORS configurado com origin especifica — nunca '*' em producao
```

**Teste rapido de IDOR:** Trocar o ID no request para ID de outro usuario → deve retornar 403, nao 200 nem 404.

### 2. Cryptographic Failures

```
☐ Senhas com bcrypt, custo >= 12
☐ HTTPS obrigatorio, HSTS configurado
☐ JWT access token assinado com RS256 ou HS256 com secret >= 64 chars
☐ Refresh token e UUID opaco, nao JWT
☐ Dados sensiveis encriptados at-rest (CPF, dados financeiros, PII)
☐ Nenhum dado sensivel nos logs (senha, token, CPF, cartao)
☐ Nenhum secret ou chave de API no repositorio
```

### 3. Injection

```
☐ ORM usado para todas as queries (Prisma e safe by default)
☐ Zero concatenacao de strings em queries SQL
☐ Inputs validados com Zod antes de qualquer operacao
☐ Parametrized queries quando raw SQL for necessario
☐ NoSQL injection prevenido se usar MongoDB ($where, $regex bloqueados)
```

### 4. Insecure Design

```
☐ Fluxo de reset de senha usa token temporario com expiracao
☐ Rate limit em login: max 5 tentativas/min por IP e por usuario
☐ Account lockout apos N tentativas (configuravel)
☐ Captcha em acoes criticas quando exposto a abuso automatizado
☐ Sem "security by obscurity" como unica protecao
```

### 5. Security Misconfiguration

```
☐ Headers de seguranca configurados (ver secao abaixo)
☐ Error messages nao expoe stack trace em producao
☐ Debug mode desligado em producao (NODE_ENV=production)
☐ Portas desnecessarias fechadas no servidor
☐ .env NUNCA no git — verificar .gitignore
☐ Nenhuma credencial hardcoded no codigo
```

### 6. Vulnerable Components

```
☐ npm audit sem HIGH/CRITICAL
☐ Dependabot ou Snyk configurado no repositorio
☐ Lock file (package-lock.json) commitado
☐ Sem pacotes abandonados (ultima atualizacao > 2 anos)
☐ Imagens Docker com hash fixo, nao :latest
```

### 7. Auth Failures

```
☐ JWT access token expira em 15 minutos no maximo
☐ Refresh token armazenado em HttpOnly cookie
☐ Refresh token rotaciona a cada uso (rotation)
☐ Logout invalida o token no banco (blacklist ou delete)
☐ Token NUNCA armazenado em localStorage
☐ Cookie com flags: HttpOnly, Secure, SameSite=Strict
```

### 8. Software and Data Integrity

```
☐ CSP header configurado (nao apenas X-Frame-Options)
☐ SRI em scripts externos carregados via CDN
☐ Pipeline CI/CD tem etapa de seguranca (audit, trivy, snyk)
☐ Imagens Docker usam hash fixo: image@sha256:...
```

### 9. Logging and Monitoring

```
☐ Logs de autenticacao: login, logout, falha
☐ Logs de acoes administrativas
☐ Request ID em cada log para rastreabilidade
☐ Logs nao contem dados sensiveis
☐ Alertas configurados para anomalias (muitos 401, picos de erro)
```

### 10. SSRF

```
☐ URLs de input validadas contra allowlist de dominios
☐ Sem redirect baseado em parametro do usuario sem validacao
☐ Endpoint de metadata bloqueado (169.254.169.254)
☐ Requisicoes de saida via proxy interno quando possivel
```

---

## Headers de Seguranca

### Configuracao completa (Node/Express)

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

### Next.js (next.config.js)

```javascript
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

module.exports = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
```

---

## CORS e CSRF

### CORS seguro

```typescript
// Inseguro
app.use(cors());

// Seguro
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://app.seudominio.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  maxAge: 86400,
}));
```

### CSRF (Double Submit Cookie)

```typescript
import crypto from 'crypto';

export const generateCsrfToken = () => crypto.randomBytes(32).toString('hex');

export const csrfMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const headerToken = req.headers['x-csrf-token'];
  const cookieToken = req.cookies['csrf-token'];

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return res.status(403).json({ success: false, error: { code: 'CSRF_INVALID' } });
  }

  next();
};

app.get('/api/csrf-token', (req, res) => {
  const token = generateCsrfToken();
  res.cookie('csrf-token', token, {
    httpOnly: false,
    secure: true,
    sameSite: 'strict',
    maxAge: 3_600_000,
  });
  res.json({ token });
});
```

---

## XSS Prevention

```typescript
import DOMPurify from 'dompurify';

const safeHtml = DOMPurify.sanitize(userInput);

const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};
```

**Regra principal:** nunca usar `dangerouslySetInnerHTML` com input nao sanitizado. Se precisar renderizar HTML do usuario, sanitizar com DOMPurify antes.

---

## Auth Flow Seguro

```
Access token: JWT, expira em 15min, header Authorization
Refresh token: UUID opaco, HttpOnly cookie, expira em 7d, rotaciona a cada uso
Login:         valida credenciais → emite access + seta refresh cookie
Refresh:       le cookie → valida → emite novo access + novo refresh cookie (rotacao)
Logout:        invalida refresh no banco → limpa cookie
```

**O que nao fazer:**
- Armazenar access token em localStorage (XSS leak)
- Usar refresh token como JWT (nao pode ser invalidado sem blacklist)
- Nao rotacionar refresh (permite reutilizacao apos roubo)

---

## Dependencias e Audit

```bash
npm audit --audit-level=moderate

npm audit fix

npm audit fix --force
```

| Severidade | Acao |
|------------|------|
| CRITICAL   | Corrigir imediatamente — bloqueia deploy |
| HIGH       | Corrigir imediatamente — bloqueia deploy |
| MODERATE   | Avaliar caso a caso — documentar aceite de risco |
| LOW        | Monitorar, corrigir na proxima janela |

**Checklist de major update:**
1. Ler CHANGELOG e migration guide
2. Atualizar em branch separada
3. Rodar suite completa de testes
4. Verificar breaking changes nos imports
5. Testar em staging antes de mergear

---

## DRY e Clean Code

```
DRY
☐ Sem codigo duplicado — 2+ ocorrencias == extrair para funcao/hook/componente
☐ Constantes magicas em arquivo de constants
☐ Schemas Zod compartilhados entre frontend e backend quando possivel
☐ Error handling centralizado — nao try/catch em cada rota

SOLID
☐ S — cada modulo/funcao faz uma coisa
☐ O — extensivel sem modificar codigo existente
☐ L — componentes substituiveis sem quebrar a interface
☐ I — interfaces pequenas e especificas
☐ D — depende de abstracoes, nao implementacoes

Clean Code
☐ Nomes descritivos: sem 'data', 'info', 'temp', 'handler' genericos
☐ Funcoes com responsabilidade unica
☐ Comentarios apenas quando explicam contexto nao obvio, risco ou workaround
☐ Sem TODO esquecido — resolver ou criar issue rastreavel
☐ Sem console.log em producao
☐ Sem 'any' no TypeScript (exceto pontos de integracao sem tipo disponivel)
☐ Imports organizados: external → internal → relative
```

---

## Relatorio de Security Review

```markdown
# Security Review Report — [Feature / PR]

**Data:** [data]
**Reviewer:** [nome]
**Status:** ✅ Aprovado / ⚠️ Aprovado com ressalvas / ❌ Reprovado

## Resumo
[1-2 frases descrevendo o escopo e o resultado geral]

## Findings

### Critico
- [localizacao]: [descricao] — [fix sugerido]

### Importante
- [localizacao]: [descricao] — [fix sugerido]

### Informativo
- [descricao] — [sugestao]

## Checklist
- [x] OWASP Top 10 verificado
- [x] Headers de seguranca configurados
- [x] Auth flow revisado
- [x] DRY e clean code revisados
- [x] npm audit limpo
- [x] .env nao exposto
- [x] Nenhuma credencial hardcoded

## Decisao
[Aprovado / Reprovado] — [justificativa objetiva]
```

---

## Severidades e Decisao de Bloqueio

| Severidade | Descricao | Bloqueia deploy? |
|------------|-----------|-----------------|
| **Critico** | Vulnerabilidade exploravel que compromete dados ou acesso | Sim — obrigatorio corrigir |
| **Importante** | Risco real mas com mitigacao parcial ou menor probabilidade | Sim — salvo aceite de risco documentado |
| **Informativo** | Melhoria de hardening ou boa pratica sem risco imediato | Nao |

**Regra de ouro:** zero findings criticos para liberar deploy. Findings importantes precisam de fix confirmado ou aceite de risco documentado e aprovado pelo time.
