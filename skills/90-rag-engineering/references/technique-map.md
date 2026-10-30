# Mapa de técnicas de RAG

Este guia organiza opções de recuperação e geração para selecionar conforme os problemas e as características do projeto.

| Problema | Alternativas a comparar | Custo ou limite |
|---|---|---|
| Texto, CSV ou JSON mal extraído | parsing por formato, OCR para páginas digitalizadas, preservar tabelas e metadados | OCR pode perder estrutura e requer revisão; avaliar por formato |
| Trechos perdem contexto | chunking fixo, estrutural ou semântico; janelas vizinhas, títulos contextuais, proposições | trechos gerados podem distorcer o original; guardar vínculo e verificar fidelidade |
| Consulta não encontra evidência | reformulação, expansão, decomposição, step-back, HyDE ou HyPE | chamadas extras e deriva; preservar consulta original e medir recall |
| Vocabulário e identificadores distintos | busca lexical, vetorial e híbrida, fusão e filtros por metadados | filtros não substituem controle de acesso; medir por tipo de consulta |
| Muitos candidatos irrelevantes | reranking, extração de segmentos relevantes e compressão contextual | maior latência; risco de eliminar evidência importante |
| Coleções extensas ou relações complexas | índices hierárquicos, RAPTOR, GraphRAG, LightRAG e recuperação local com atribuição | indexação, atualização e operação mais caras; testar contra baseline |
| Evidência insuficiente ou perguntas compostas | recuperação adaptativa, ciclos com feedback, Self-RAG, CRAG e agentes com ferramentas | limitar iterações, custo e acesso; não pressupor correção automática |
| Imagem ou documentos multimodais | legendas, OCR e embeddings multimodais, como ColPali quando disponível | preservar referências ao item e avaliar extração visual; custo de processamento |
| Contexto disperso entre documentos | enriquecimento de documentos, sumarização e memória de recuperação como MemoRAG | resumos podem omitir fatos; respostas exigem fontes originais |
| Baixa confiança e explicabilidade | trechos verificáveis, proveniência e checagens de relevância e suporte | confiança numérica não equivale à verdade; revisar erros humanos |
| Qualidade desconhecida | avaliação de recuperação e ponta a ponta; ferramentas como DeepEval, GroUSE e Open-RAG-Eval quando adequadas | validar métricas e juízes contra amostra humana e dados separados |
| Recuperação especializada | busca facetada, índices hierárquicos e estratégias como dartboard retrieval | verificar aplicabilidade, complexidade e ganhos no corpus real |

Escolher por hipótese, comparar com baseline e registrar versões, dados, métricas, falhas, custo e latência. Técnicas e nomes são opções, não requisitos de instalação ou promessas de resultado.
