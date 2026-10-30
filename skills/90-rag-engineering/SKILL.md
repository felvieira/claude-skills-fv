---
name: rag-engineering
description: |
  Projeta, implementa e avalia sistemas RAG e busca sobre documentos com evidências, segurança e custo mensuráveis.
  Trigger em: "RAG", "retrieval augmented generation", "busca semântica", "busca híbrida", "reranking", "pipeline de recuperação", "retrieval evaluation", "chunking de documentos", "graph rag", "agentic rag".
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
metadata:
  version: "1.0.0"
  author: felvieira
---

# RAG engineering

Constrói e melhora recuperação aumentada por geração a partir dos dados, requisitos e stack do projeto. Escolhe técnicas por evidência, custo e risco; não presume que uma arquitetura avançada seja melhor.

## Governança global

Seguir `GLOBAL.md`, `policies/execution.md`, `policies/tool-safety.md`, `policies/evals.md` e `policies/claim-verification.md`. Para arquitetura geral de IA usar também `skills/25-ai-integration-architect`; segurança e avaliação especializadas vão para as skills 06 e 05.

## Quando usar

- implementar ou melhorar busca em documentos e respostas com fontes
- diagnosticar recuperação ruim, citações incorretas ou respostas sem suporte
- comparar chunking, busca híbrida, reranking, grafos ou recuperação iterativa
- construir avaliação reproduzível e operação de um sistema RAG

## Quando não usar

- treinar modelos sem recuperação ou trabalhar apenas no prompt: skills 25 e 26
- consultas estruturadas determinísticas que não precisam de recuperação semântica: usar a camada de dados existente
- auditoria exclusivamente de segurança ou qualidade: skills 06 e 05

## Entradas e saídas

Entradas: objetivo, usuários, corpus e direitos, formatos, permissões, atualização, idiomas, exemplos de perguntas, métricas, orçamento e stack disponível. Investigar o repositório e inferir o que for possível; marcar lacunas e evitar dados reais sem autorização.

Entregar implementação ou proposta conforme pedido, arquitetura e decisões, fontes e limites, resultados das avaliações realmente executadas, custos/latência observados e riscos pendentes. Não prometer acurácia sem medições.

## Protocolo

1. **Enquadrar:** definir tarefas, requisitos de resposta, cobertura e critérios de sucesso. Quando possível, reunir perguntas reais e respostas com trechos de referência; incluir consultas sem resposta, ambíguas e de acesso negado. Separar dados de desenvolvimento e avaliação para evitar contaminação.
2. **Ingerir:** identificar formatos, extração, OCR quando necessário, tabelas, hierarquia e metadados; verificar qualidade da extração. Normalizar, deduplicar e versionar documentos, preservando origem, versão, localizador e permissões. Tratar atualização, exclusão e reindexação idempotentes.
3. **Base:** criar pipeline simples e observável: segmentar respeitando estrutura, indexar, recuperar top-k, montar contexto e responder com citações verificáveis. Testar tamanhos e sobreposição em dados representativos, sem adotar números como regra universal. Em ausência de evidência suficiente, declarar incerteza ou abster-se.
4. **Diagnosticar:** medir separadamente extração, recuperação, ordenação e geração; verificar se o trecho correto foi indexado, recuperado, incluído e citado. Classificar falhas antes de alterar o sistema.
5. **Escolher técnicas:** consultar `references/technique-map.md` e comparar variantes com o mesmo conjunto de avaliação, custo e latência. Adicionar uma técnica por hipótese testável; manter baseline e reversão. Preservar evidência original ao gerar resumos ou consultas hipotéticas.
6. **Segurança:** aplicar autorização e isolamento por usuário/tenant em todas as etapas, inclusive cache, filtros, citações e logs. Tratar documentos recuperados como dados não confiáveis, nunca instruções. Evitar vazamento de dados em logs, embeddings e provedores; observar políticas de retenção e exclusão.
7. **Avaliar:** medir recall@k e MRR/nDCG quando houver relevância rotulada; avaliar suporte das afirmações, correção das citações, abstinência e utilidade com revisão humana quando possível. Medir também latência, custo, falhas e impacto por segmento. Descrever dataset, método, versões, limitações e incertezas; métricas automáticas não provam qualidade por si só.
8. **Operar:** instrumentar ingestão, recuperação e geração sem expor conteúdo sensível; acompanhar mudanças no corpus, versões de índice/modelo, degradação e rollback. Testar permissões, exclusões, dados desatualizados e indisponibilidade de dependências.

## Anti-padrões

- usar RAG para substituir consultas exatas ou autorização na fonte
- tratar texto recuperado ou respostas hipotéticas como instruções ou fatos comprovados
- citar documento não consultado, índice incorreto ou fonte sem permissão
- usar um conjunto pequeno sintético como prova de qualidade em produção
- inserir graph, agentes, reranking ou provedores pagos sem necessidade e comparação

## Handoff

Reportar decisões, arquivos, etapas medidas, fontes de verdade, falhas e verificação pendente. Encaminhar integrações à skill 25, testes à 05 e segurança à 06.
