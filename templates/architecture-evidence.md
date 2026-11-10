# Decisão de arquitetura

- **Escopo e revisão:** arquivos/estado analisados; diferenciar commit e alterações locais.
- **Comportamento e invariante:** o que deve continuar verdadeiro, em linguagem do domínio.
- **Fronteiras:** entrada não confiável, representação interna e adaptadores externos.
- **Estado e dono da escrita:** agregado, atomicidade, concorrência e restrições reais.
- **Repetição e recuperação:** identidade da intenção, conflito de payload, retenção e efeitos após queda.
- **Alternativas:** simplificação possível, decisão escolhida e custo aceito.
- **Hipótese rejeitada:** motivo e experimento que a refutou, se houver.
- **Validação:** comando/cenário, resultado observado e artefato de evidência.
- **Lacunas:** o que não foi medido, não pôde ser reproduzido ou depende de integração real.
- **Transição:** menor etapa verificável, compatibilidade e recuperação para mudança estrutural.

Preencha somente os itens pertinentes. Use o formato existente no projeto quando ele já registra essas decisões. Métricas auxiliam a decisão; seu valor isolado não a aprova.
