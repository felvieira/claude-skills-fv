# Verificação e evidências

Use esta lista conforme o escopo. Marque **passou**, **falhou**, **não aplicável** ou **não verificado**, com a causa; não use uma captura como prova de interação.

| Dimensão | Como verificar |
|---|---|
| Linha de base | Registrar rota, viewport, tema, dados e estado antes e depois; não incluir credenciais ou dados pessoais em artefatos |
| Fluxo | Exercitar links, botões, validações, formulários e estados afetados com dados sintéticos seguros |
| Layout | Observar larguras e alturas relevantes, zoom, conteúdo longo, ausência de dados e idioma expandido |
| Acessibilidade | Percorrer por teclado, inspecionar nomes/foco/semântica, medir contraste e testar movimento reduzido quando aplicável |
| Fidelidade | Conferir conteúdo, preço, unidades, data, permissões e eventos existentes no diff e no comportamento observado |
| Performance | Verificar recursos adicionados, dimensões de imagem e métricas disponíveis; não prometer ganhos sem medir |
| Regressão | Rodar as verificações existentes relacionadas e registrar comando e resultado |

Se somente uma URL estiver disponível, registrar que a inspeção é da superfície remota e não presume acesso ao código ou a fluxos autenticados. Se o navegador não estiver disponível, revisar código e testes, mas marcar avaliação visual como não executada.

Vídeo demonstrativo de antes/depois é opcional e depende de pedido explícito. Planeje quadros a partir de evidência real e siga `../../86-code-motion-film/SKILL.md` ou o fluxo de mídia aplicável; não confunda material demonstrativo com aplicação em produção. Nunca instale dependências, configure MCPs ou gere mídia paga sem autorização aplicável.
