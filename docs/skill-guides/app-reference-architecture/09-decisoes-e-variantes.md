# Guia de Decisão: Onde os 3 Apps Divergem

Os 3 apps não são idênticos — cada um fez escolhas diferentes em pontos específicos. Este
documento existe para você (ou o agente que está montando um app novo) decidir conscientemente
em vez de copiar a primeira variante que aparecer. Ver também
[00-overview.md](00-overview.md) para o resumo de cada app.

## 1. Auth: JWT custom vs Supabase Auth

| | JWT custom (gastos-app, VisaLab) | Supabase Auth (memrapp) |
|---|---|---|
| Setup inicial | Mais código (hash de senha, geração/validação de token) | Mais rápido — provider pronto |
| OAuth (Google/Apple) | Você implementa cada provider | Pronto, poucas linhas |
| Refresh token | Nenhum nos 2 apps observados — 30 dias fixo, força re-login | Nativo do Supabase |
| Dependência externa crítica | Nenhuma (só seu próprio Postgres) | Supabase precisa estar no ar |
| Dados de app no mesmo banco do auth | Sim, direto | Não necessariamente — memrapp usa
  Postgres Docker separado pra dados, Supabase só pra `auth.users` |

**Decisão recomendada**: se você já usa/vai usar Supabase para outra coisa (Storage, Realtime),
ou quer OAuth pronto sem trabalho, use Supabase Auth com a Variante B. Se quer zero dependência
externa na cadeia de auth (mais controle, um serviço a menos no ar), use JWT custom. Não existe
opção "errada" — os dois estão em produção real. Não misture as duas dentro do mesmo app.

## 2. ORM: Prisma vs `pg` puro

| | Prisma (gastos-app, VisaLab) | `pg` puro (memrapp) |
|---|---|---|
| Produtividade em CRUD | Alta — client tipado automático | Baixa — você escreve/tipa cada query |
| Migrations | `prisma migrate` gerencia sozinho | SQL manual versionado, script próprio de apply |
| Controle de query complexa | Às vezes limitado (raw SQL como fallback) | Total, é SQL puro |
| Overhead de build | `prisma generate` obrigatório a cada mudança de schema | Nenhum |
| Curva de aprendizado pro time | Baixa se já conhece Prisma | Precisa saber SQL bem |

**Decisão recomendada**: Prisma como default para app novo — a produtividade em CRUD (que é a
maior parte do código de um app de assinatura/SaaS) compensa o overhead de generate. Considere
`pg` puro só se: (a) o time já tem forte preferência/experiência com SQL puro, ou (b) o app tem
queries analíticas complexas onde a abstração do Prisma atrapalha mais do que ajuda.

## 3. Single app vs monorepo

| | Single Next.js app (gastos-app, memrapp) | Monorepo pnpm workspaces (VisaLab) |
|---|---|---|
| Complexidade de setup | Baixa | Alta (workspaces, packages compartilhados, script de dev orquestrado) |
| Web e mobile podem divergir de verdade | Não — mesmo código-fonte, comportamento condicional via `isTauri()` | Sim — `apps/web` e `apps/mobile` são apps Next.js DIFERENTES |
| Código compartilhado tipado | Direto (mesmo projeto) | Via `packages/types`, `packages/validation`, `packages/api-client` |
| Quando escolher | Web e app nativo têm a MESMA superfície de features | Web tem features que o app nativo não tem (ou vice-versa) — ex: worker próprio só no web, telas exclusivas do mobile |

**Decisão recomendada**: comece com single app (padrão gastos-app/memrapp) — é mais simples e
cobre a grande maioria dos casos. Migre pra monorepo SÓ quando sentir a dor real de web e mobile
precisarem de código genuinamente diferente (não apenas comportamento condicional via
`isTauri()`, que o padrão single-app já resolve bem).

## 4. Push: Web Push + FCM vs tri-canal com ntfy

| | Dual (gastos-app, VisaLab) | Tri-canal com ntfy (memrapp) |
|---|---|---|
| Complexidade operacional | Baixa — 2 canais, sem serviço extra | Alta — ntfy self-hosted é mais um container/serviço no ar |
| Notificação em tempo real com app aberto | Não nativamente (só quando o SO entrega a push) | Sim, via SSE — atualização instantânea sem WebSocket próprio |
| Quando vale o ntfy | Raramente | Quando o produto precisa de "algo está acontecendo agora" dentro do app aberto (ex: status de processamento em tempo real) sem montar infra de WebSocket própria |

**Decisão recomendada**: comece com Web Push + FCM (dual). Adicione ntfy (ou outra solução de
tempo real) só se o produto genuinamente precisar de atualização instantânea com o app em
foreground — se o worker/fila (ver [08-worker-e-filas.md](08-worker-e-filas.md)) já resolve isso
via polling do cliente, não precisa de SSE/ntfy.

## 5. Pagamento: quantos providers simultâneos

| | Stripe + IAP apenas (gastos-app) | Stripe + IAP + Pix (memrapp, VisaLab) |
|---|---|---|
| Cobertura de mercado | Cartão internacional + Android | + Pix brasileiro |
| Complexidade | Menor | Maior (mais um webhook, mais um fluxo de checkout) |
| Quando adicionar Pix | Público majoritariamente fora do Brasil ou já confortável com cartão | Público BR onde Pix é preferência forte de pagamento |

**Decisão recomendada**: Stripe + Google Play IAP é o mínimo obrigatório para qualquer app
Android com assinatura (o IAP não é opcional, é exigência de política da Play Store). Adicione
Pix apenas se o público-alvo for majoritariamente brasileiro e você tiver evidência de que a
ausência de Pix está custando conversão — não adicione por precaução.

## 6. Créditos vs assinatura pura

| | Assinatura pura (gastos-app, memrapp) | Créditos + assinatura (VisaLab) |
|---|---|---|
| Modelo de cobrança | Acesso binário: free/premium | Consumo medido (cada ação de IA custa N créditos) |
| Quando faz sentido | Features de uso "ilimitado dentro do razoável" (dashboards, relatórios) | Cada uso tem custo variável real e não-trivial pro seu backend (chamada de IA cara, geração de imagem) |
| Complexidade de implementação | Baixa | Alta — ledger append-only, dedução atômica, anti-fraude de reembolso |

**Decisão recomendada**: assinatura pura é suficiente pra maioria dos apps SaaS. Só implemente
sistema de créditos se o seu custo variável por uso for alto o bastante para que "assinatura com
uso ilimitado" seja financeiramente inviável (tipicamente: geração de imagem/vídeo por IA, não
simples chamadas de texto).

## 7. Worker separado: quando realmente precisa

Ver checklist completo em [08-worker-e-filas.md](08-worker-e-filas.md). Resumo da decisão: só
adicione BullMQ + Redis + container worker separado se uma operação do seu produto **não cabe**
num ciclo request/response HTTP normal (dezenas de segundos a minutos). Dois dos 3 apps
(gastos-app, memrapp) não têm worker separado e não precisam — toda ação deles responde rápido o
suficiente pra rodar numa rota de API normal.

## Resumo — pontos de partida recomendados por tipo de app

**App SaaS simples (dashboards, produtividade, finanças pessoais)** → siga o padrão gastos-app:
Prisma, JWT custom, single app, Stripe+IAP, Web Push+FCM, sem worker, sem créditos.

**App com conteúdo/comunidade + múltiplas personas de IA leves** → siga o padrão memrapp:
Supabase Auth se quiser OAuth pronto, considere Postgres separado se quiser portabilidade de
auth provider, Pix se público for BR, tri-canal de push só se precisar de tempo real.

**App com processamento de IA pesado (imagem, vídeo, análise de arquivo)** → siga o padrão
VisaLab: Prisma, worker BullMQ obrigatório, sistema de créditos (custo variável real), considere
monorepo só se mobile e web realmente divergirem em features.
