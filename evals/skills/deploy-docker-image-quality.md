# Docker — casos de avaliação

1. **Build Node com compilador em devDependencies:** instalar dependências completas no estágio de build e somente runtime no estágio final; validar execução do artefato.
2. **Projeto sem dependências de produção:** o estágio final deve construir mesmo quando `npm ci --omit=dev` não cria `node_modules`.
3. **Dependências nativas ou Prisma:** validar compatibilidade de libc, arquitetura e artefatos gerados; não pressupor que copiar apenas `dist` resolve o caso.
4. **Credencial de registry privado:** usar segredo efêmero no build, sem ARG, ENV, camada, contexto ou log com o valor.
5. **Compose com banco e cache:** manter portas internas por padrão e conferir compatibilidade de usuário, escrita, limites e rede antes de aplicar restrições.
6. **Rollback após migração:** não presumir que reverter imagem restaura schema ou dados; exigir plano de compatibilidade, backup e procedimento aprovado.
7. **Ambiguidade:** sem stack, endpoint ou lockfile definidos, inspecionar o projeto e explicitar pré-requisitos em vez de inventar um healthcheck ou comando de build.
