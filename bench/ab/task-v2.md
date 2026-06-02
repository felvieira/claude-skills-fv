# Tarefa: App de TODO list completo

Você está em uma pasta vazia. Construa um **app de TODO list completo**, do zero, pronto para rodar.

## Requisitos funcionais

1. **Stack backend obrigatória** (não troque):
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

3. **Validação (obrigatória):**
   - `title` ausente ou vazio → 400 com `{ error: "title is required" }`
   - `title` com mais de 200 caracteres → 400
   - `done` que não seja boolean → 400
   - `id` não-numérico → 400

4. **Regras de borda:**
   - Banco criado/migrado automaticamente no boot
   - `createdAt` e `updatedAt` (ISO string) em cada todo
   - JSON malformado → 400, não 500

## Requisitos de teste (vale nota)

- Suite Vitest cobrindo: happy path + validação (400) + 404
- Mínimo 12 casos de teste
- Testes rodam contra DB em memória (`:memory:`)
- `npm test` deve sair com exit code 0

## Entregáveis obrigatórios

- `package.json` com scripts `start` e `test`
- `src/app.js`, `src/server.js`, `src/db.js`
- `test/todos.test.js`
- `.gitignore`
- `README.md`

## Definição de pronto

Só está completo quando `npm install && npm test` roda e **todos os testes passam** (exit 0).
