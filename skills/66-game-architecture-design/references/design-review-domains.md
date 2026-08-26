# Dominios de Design Review

Roteiro completo dos domínios de revisão. Excluir apenas os que o objeto da revisão claramente torna
irrelevantes — manter pelo menos 6 quando fazendo review completa, e registrar a razão de cada
exclusão.

| Dominio | Foco da analise |
|---|---|
| Audiência e experiência pretendida | Promessa ao jogador, cadeia de motivação, inventário de prazer, suposições de aprendizado, lacunas de experiência |
| Conceito, tema e emoção | Clareza do conceito, espaço imaginativo, coerência temática, causas emocionais, unidade expressiva, identidade memorável |
| Ações, regras e agência | Hierarquia de objetivo, qualidade de decisão, julgamento de desempenho, legibilidade de regra, estrutura e estado, comportamento dominante, caráter sistêmico |
| Desafio, progressão e economia | Formato de dificuldade, demanda de habilidade, fairness, retorno esperado, significado de recompensa, estrutura de tempo, fontes/sinks, caminhos viáveis |
| Quebra-cabeça e resolução de problema | Representação do problema, cadeia de raciocínio, estrutura de solução, recuperação e escalada de dica |
| Espaço, nível e ritmo | Escolha de rota, legibilidade, ritmo, recuperação, pressão espacial |
| Curva de atenção e presença | Interesse ao longo do tempo, orientação voluntária, liberdade, interrupção, projeção e narrativa pós-jogo |
| Interface, feedback e acessibilidade | Loop intenção-para-ação, timing de informação, riqueza de feedback, recuperação de erro, barreiras de input e percepção |
| Narrativa, mundo e personagens | Entrega de história jogável, estrutura narrativa, causalidade de mundo, papel do jogador, agência, status e função de personagem |
| Social, comunidade e segurança | Incentivos entre jogadores, confiança, continuidade de relação, expressão, moderação e clareza pro espectador |
| Produção, validação e responsabilidade | Adequação de produção, qualidade de evidência, retirada de risco, viabilidade de mercado, sustentabilidade e bem-estar do jogador |

## Delegando Review pra Subagentes

Quando o volume de material justifica dividir a revisão entre múltiplos agentes, cada um precisa
receber: o objeto da revisão e onde achar o material; a decisão em jogo e a baseline de evidência já
levantada (pra não reabrir fato já assentado); os domínios atribuídos, com instrução de ler as
referências completas antes de analisar; a régua de qualidade de achado (seis campos); e o limite —
retornar achado de design e a menor intervenção recomendada por lote, não tarefa de implementação.

Nunca deixar a severidade ou prioridade de um subagente passar sem revisão — mesclar os achados e
resolver contradição entre lotes é responsabilidade de quem orquestra, não do subagente.

## Estrutura de Relatorio

```markdown
# Design Review: [objeto]

## Decisao em jogo
[A escolha ou incerteza que esta review deveria resolver.]

## Baseline de evidencia
- Confirmado: ...
- Assumido: ...
- Desconhecido: ...

## Achados prioritarios
### [Severidade] [Achado]
- Observacao:
- Mecanismo:
- Status de evidencia:
- Recomendacao:
- Validacao:

## Trade-offs
[O que melhora, o que pode piorar, e quem e afetado.]

## Proximo experimento
[Menor build, simulacao, ou playtest; participantes; sinais observaveis; regra de decisao.]
```
