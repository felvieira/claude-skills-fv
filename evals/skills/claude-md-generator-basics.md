# Eval - CLAUDE.md Generator Basics

## Objetivo
Validar que o CLAUDE.md Generator produz um CLAUDE.md especifico e acionavel a partir da auditoria e entrevista.

## Entrada
- `docs/repo-audit/current.md` de um projeto Next.js com Prisma e Tailwind
- Respostas simuladas: "usamos pnpm", "testes com vitest", "deploy no Vercel"

## Esperado
- CLAUDE.md com menos de 100 linhas
- secao de comandos com no maximo 5 entradas
- stack real refletida (Next.js, Prisma, Tailwind, pnpm, vitest)
- sem secoes especulativas ou genericas

## Evidencias Minimas
- arquivo CLAUDE.md criado no projeto consumidor
- nenhuma secao copiada diretamente da auditoria (reformulada)
- comandos de build, test e dev presentes e corretos

## Casos Limite
- projeto sem auditoria: skill deve recusar e pedir Repo Auditor primeiro
- CLAUDE.md existente com contexto real: atualizar apenas secoes desatualizadas
