# Síntese Temática — Pipeline de 5 Fases

Método estruturado para ir de transcrições/notas brutas de entrevista até insights acionáveis, quando o volume de sessões (5+) torna a síntese em "3 bullets no caminho de volta" (protocolo padrão da skill, ver `SKILL.md` passo 4) insuficiente para capturar o que se repete entre participantes.

Baseado em análise temática de Braun & Clarke, adaptado para o formato dos artefatos desta skill.

## Quando usar este pipeline em vez do passo 4 padrão

- 5 ou mais sessões de entrevista/teste no mesmo research
- múltiplos pesquisadores conduziram sessões separadas e precisam consolidar
- o padrão "3 bullets por sessão" não está convergindo — sessões parecem dizer coisas diferentes e falta uma camada de agregação

Para 1-4 sessões, o passo 4 padrão da skill já é suficiente — não aplicar este pipeline mais pesado sem necessidade.

## Fase 1 — Familiarização

Ler (ou reler) todas as transcrições/notas de uma vez, sem codificar ainda. Objetivo: ter o conjunto completo na cabeça antes de fragmentar em códigos — evita que o primeiro achado marcante vire lente que distorce a leitura do resto.

Saída: lista solta de primeiras impressões, sem estrutura ainda.

## Fase 2 — Coding (codificação aberta)

Para cada trecho relevante de cada transcrição, atribuir um código curto (label) que descreve o que está acontecendo ali — não uma categoria final, uma etiqueta de trabalho.

- Um trecho pode receber mais de um código
- Códigos nascem do dado, não de uma lista prévia de categorias esperadas
- Manter rastreabilidade: cada código aponta para `[participante, trecho literal]`

Exemplo:
```
"Eu sempre esqueço de salvar antes de fechar" → código: "perda-de-trabalho-nao-salvo"
"Não sei se salvou ou não, fico com medo" → código: "incerteza-sobre-estado-salvo"
```

## Fase 3 — Busca por Temas

Agrupar códigos relacionados em temas candidatos. Um tema é um padrão que captura algo importante sobre os dados em relação à pergunta de pesquisa — não é a mesma coisa que uma categoria de assunto.

- Os dois códigos do exemplo acima podem virar um tema: "ausência de feedback visual de estado salvo gera ansiedade"
- Um tema precisa aparecer em múltiplos participantes para ser candidato sólido — um código isolado de 1 pessoa é observação, não tema (mas registrar mesmo assim, com nota de baixa frequência)

## Fase 4 — Revisão dos Temas

Testar cada tema candidato contra dois níveis:
1. **Contra os códigos:** os códigos agrupados sob o tema realmente formam um padrão coerente, ou foram forçados a caber?
2. **Contra o dataset completo:** o tema realmente representa o que está nos dados, ou é uma narrativa que o pesquisador queria encontrar?

Temas fracos nesta fase: fundir com outro tema, dividir em dois, ou descartar como ruído.

## Fase 5 — Síntese e Relatório

Para cada tema que sobreviveu à revisão, produzir:
- **Nome do tema** — frase que captura a essência, não uma categoria genérica ("Navegação" é fraco; "usuários abandonam a busca quando o filtro não confirma visualmente que foi aplicado" é forte)
- **Prevalência** — em quantos participantes/sessões o tema apareceu
- **Evidência** — 1-2 citações literais que ilustram o tema, com atribuição ao participante
- **Implicação** — o que este tema muda na decisão de produto (conecta de volta à Fase 1 do protocolo principal: "que decisão esta pesquisa precisa informar?")

Formato de saída, para inserir na seção de insights do artefato principal (persona/jornada/relatório):

```markdown
### Tema: <nome do tema como afirmação, não como categoria>

**Prevalência:** 4 de 6 participantes
**Evidência:**
- "Eu sempre esqueço de salvar antes de fechar" — P3
- "Não sei se salvou ou não, fico com medo" — P5
**Implicação:** o fluxo precisa de confirmação visual de estado salvo persistente, não só um toast que some em 2s.
```

## Checkpoint de integridade

Mesma regra do `SKILL.md`: cada tema precisa apontar para trecho literal de transcrição real. Um tema sem citação rastreável é hipótese do pesquisador, não achado de pesquisa — marcar como tal.
