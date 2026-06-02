# Tarefa: TODO List API com CRUD completo + testes

Você está em uma pasta vazia. Construa uma API REST de TODO list, do zero, pronta para rodar.

## Requisitos funcionais

1. **Stack obrigatória** (não troque):
   - Node.js + Express
   - Persistência em SQLite (arquivo `todos.db`), usando `better-sqlite3`
   - Testes com Vitest + Supertest
   - ESM (`"type": "module"` no package.json)

2. **Endpoints CRUD** (`/todos`):
   - `POST /todos` — cria. Body: `{ title: string, done?: boolean }`. Retorna 201 + o todo criado com `id`.
   - `GET /todos` — lista todos. Suporta `?done=true|false` como filtro opcional.
   - `GET /todos/:id` — retorna um. 404 se não existir.
   - `PUT /todos/:id` — atualiza `title` e/ou `done`. 404 se não existir.
   - `DELETE /todos/:id` — remove. 404 se não existir, 204 em sucesso.

3. **Validação (obrigatória, vale nota):**
   - `title` ausente ou vazio → 400 com `{ error: "title is required" }`
   - `title` com mais de 200 caracteres → 400
   - `done` que não seja boolean → 400
   - `id` não-numérico em rotas com `:id` → 400

4. **Regras de borda:**
   - Banco deve ser criado/migrado automaticamente no boot (tabela `todos`).
   - `createdAt` e `updatedAt` (ISO string) em cada todo, gerenciados pelo servidor.
   - O app não pode crashar com body malformado (JSON inválido → 400, não 500).

## Requisitos de teste (vale nota)

- Suite Vitest cobrindo: cada endpoint no caminho feliz + cada caso de validação (400) + cada 404.
- Mínimo 12 casos de teste.
- Os testes devem rodar contra um DB isolado/em memória (não sujar `todos.db` real).
- `npm test` deve sair com **exit code 0** e todos os testes verdes.

## Entregáveis

- `package.json` com scripts `start` e `test`.
- `src/app.js` (app Express exportável, sem `listen`), `src/server.js` (faz listen), `src/db.js`.
- `test/todos.test.js`.
- `README.md` curto: como instalar, rodar e testar.

## Definição de pronto

A tarefa só está completa quando `npm install && npm test` roda e **todos os testes passam de verdade** (exit 0). Não afirme que passou sem ter rodado o comando e visto a saída.
