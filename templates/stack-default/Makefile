# Makefile — Stack Default shortcuts
# Uso: make <target>

.PHONY: help up down dev logs ps db-migrate db-seed db-studio storage-init \
        shell-app shell-db clean reset

help: ## Mostra este help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ─────────────────────────────────────────────
# Infra
# ─────────────────────────────────────────────
up: ## Sobe todos os serviços (prod: sem override)
	docker compose -f docker-compose.yml up -d

dev: ## Sobe com override de dev (hot reload, GUIs)
	docker compose up -d
	@echo "App:            http://localhost:3000"
	@echo "Adminer (DB):   http://localhost:8080"
	@echo "Redis UI:       http://localhost:8081"
	@echo "Mailpit (SMTP): http://localhost:8025"
	@echo "MinIO Console:  http://localhost:9001"

down: ## Para todos os serviços (preserva volumes)
	docker compose down

logs: ## Segue logs de todos os serviços
	docker compose logs -f

logs-app: ## Segue logs só do app
	docker compose logs -f app

ps: ## Status dos containers
	docker compose ps

# ─────────────────────────────────────────────
# Database
# ─────────────────────────────────────────────
db-migrate: ## Roda migrations Drizzle
	docker compose exec app npx drizzle-kit migrate

db-generate: ## Gera migration a partir do schema
	docker compose exec app npx drizzle-kit generate

db-push: ## Push schema direto (dev only — sem migration file)
	docker compose exec app npx drizzle-kit push

db-studio: ## Abre Drizzle Studio (GUI web)
	docker compose exec app npx drizzle-kit studio

db-seed: ## Roda seed script
	docker compose exec app node scripts/seed.mjs

# ─────────────────────────────────────────────
# Storage
# ─────────────────────────────────────────────
storage-init: ## Cria bucket inicial no MinIO (dev)
	docker compose run --rm minio-init

# ─────────────────────────────────────────────
# Shells
# ─────────────────────────────────────────────
shell-app: ## Shell no container do app
	docker compose exec app sh

shell-db: ## psql no Postgres
	docker compose exec postgres psql -U $${DB_USER:-app} -d $${DB_NAME:-app}

# ─────────────────────────────────────────────
# Cleanup
# ─────────────────────────────────────────────
clean: ## Para e remove containers (preserva volumes)
	docker compose down --remove-orphans

reset: ## DESTRUTIVO: para tudo e apaga volumes (dados perdidos)
	@echo "⚠️  ISSO APAGA TODOS OS DADOS. Ctrl+C pra cancelar..."
	@sleep 3
	docker compose down -v --remove-orphans
