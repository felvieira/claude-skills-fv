# File reader

**Caminho:** mcp-server/src/services/file-reader.ts

## Propósito

Lê arquivos permitidos e monta snippets para as ferramentas do kit.

## Entradas e saídas

- **Entradas:** Caminhos e tipos de snippet.
- **Saídas:** Texto de arquivo ou lista de snippets; erro de leitura vira null no helper observado.

## Dependências

Filesystem do processo Node.

## Testes

Não foi encontrado teste dedicado do caminho de erro de filesystem nesta amostra.

## Riscos

Catch amplo pode esconder permissão/I/O como ausência; há melhoria MEL-03 para separar os casos.

## Evidências

[evidence: mcp-server/src/services/file-reader.ts:8-8]
