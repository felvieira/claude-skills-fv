# Playbook — Spring Boot 2.x → 3.x + JDK 8/11/17 → 21

> Parte da skill 23 (Migration & Refactor Specialist).  
> Baseado em padrões de [addozhang/spring-boot-migrator-skill](https://github.com/addozhang/spring-boot-migrator-skill) (MIT).  
> Use quando: "migrar spring boot 3", "jakarta migration", "openrewrite", "upgrade spring boot", "JDK 21".

---

## Pré-requisitos

Antes de iniciar, verificar:

```bash
# Java 21+
java -version

# Maven 3.6.3+
mvn -version

# Git limpo (sem uncommitted changes)
git status --short
```

Se qualquer checagem falhar, **parar e resolver antes de continuar**. Migração com ambiente sujo é receita para debugging impossível.

---

## Workflow em 10 Passos

### Passo 1 — Backup e branch

```bash
git checkout -b migration/spring-boot-3
git stash  # se houver changes pendentes
```

Criar tag de segurança:
```bash
git tag pre-migration-$(date +%Y%m%d)
```

### Passo 2 — Analisar dependências atuais

```bash
mvn dependency:tree -Dincludes="org.springframework*,javax.*,jakarta.*" > /tmp/deps-before.txt
mvn dependency:tree > /tmp/full-deps-before.txt
```

Identificar:
- Versão atual do Spring Boot (deve ser 2.x)
- Versão do JDK em uso
- Dependências javax.* que precisarão virar jakarta.*
- Frameworks customizados que estendem Spring (Hibernate, MyBatis, etc.)

### Passo 3 — Executar OpenRewrite (migração automatizada)

```bash
mvn -U org.openrewrite.maven:rewrite-maven-plugin:run \
  -Drewrite.recipeArtifactCoordinates=org.openrewrite.recipe:rewrite-spring:LATEST \
  -Drewrite.activeRecipes=org.openrewrite.java.spring.boot3.UpgradeSpringBoot_3_2
```

> **Nota sobre parent POM customizado:** Se o projeto usa parent POM próprio (não `spring-boot-starter-parent`), ver `references/custom-parent-strategy.md` antes deste passo.

### Passo 4 — Atualizar versões no pom.xml

Após OpenRewrite, verificar e ajustar manualmente se necessário:

```xml
<!-- Parent -->
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.x</version>  <!-- ou versão LTS mais recente -->
</parent>

<!-- Java version -->
<properties>
    <java.version>21</java.version>
</properties>
```

### Passo 5 — Primeiro build (esperar falhas)

```bash
mvn clean compile -q 2>&1 | tee /tmp/compile-errors.txt
```

**Falhas esperadas neste passo:**
- `javax.*` não encontrado → renomear para `jakarta.*`
- Hibernate Dialect depreciado → ver `references/common-fixes.md`
- Properties renomeadas no `application.properties` → ver `references/common-fixes.md`

Não corrigir tudo de uma vez. Resolver categoria por categoria.

### Passo 6 — Corrigir imports javax → jakarta

```bash
# Ver quantos arquivos precisam de correção
grep -r "import javax\." src/ --include="*.java" -l | wc -l

# Lista de arquivos
grep -r "import javax\." src/ --include="*.java" -l
```

O OpenRewrite já deve ter feito a maioria. Para os remanescentes:

```bash
# Correção em batch (usar com cautela — revisar diff depois)
find src/ -name "*.java" -exec sed -i \
  's/import javax\.persistence\./import jakarta.persistence./g;
   s/import javax\.validation\./import jakarta.validation./g;
   s/import javax\.transaction\./import jakarta.transaction./g;
   s/import javax\.servlet\./import jakarta.servlet./g' {} \;
```

> ⚠️ Revisar `git diff` antes de commitar — sed em batch pode pegar falsos positivos.

### Passo 7 — Segundo build e testes unitários

```bash
mvn clean test -q 2>&1 | tee /tmp/test-errors.txt
```

Analisar falhas. Categorias comuns → `references/common-fixes.md`.

### Passo 8 — Testes de integração

```bash
mvn verify -P integration-test 2>&1 | tee /tmp/integration-errors.txt
```

Se não houver perfil de integração:
```bash
mvn verify 2>&1 | tee /tmp/verify-errors.txt
```

### Passo 9 — Verificação de saúde da aplicação

```bash
mvn spring-boot:run &
sleep 15

# Health check
curl -s http://localhost:8080/actuator/health | jq .
curl -s http://localhost:8080/actuator/info | jq .

# Endpoints principais (adaptar para o projeto)
curl -s http://localhost:8080/api/... | jq .

kill %1
```

### Passo 10 — Gerar relatório de validação

Criar `.migration-validation/REPORT.md`:

```markdown
# Migration Validation Report

**Date:** $(date +%Y-%m-%d)  
**From:** Spring Boot 2.x + JDK X  
**To:** Spring Boot 3.x + JDK 21  
**Branch:** migration/spring-boot-3  

## Checklist

- [ ] OpenRewrite executado sem erros
- [ ] pom.xml atualizado (parent + java.version)
- [ ] Zero imports javax.* remanescentes
- [ ] `mvn clean compile` PASS
- [ ] `mvn test` PASS (N testes, N falhas)
- [ ] `mvn verify` PASS
- [ ] Health check `/actuator/health` → UP
- [ ] Endpoints críticos respondendo

## Breaking Changes Encontrados

| Categoria | Arquivo | Correção Aplicada |
|-----------|---------|-------------------|
| (preencher) | | |

## Pendências

- (listar qualquer item não resolvido)

## Rollback

```bash
git checkout main
git tag  # verificar tag pre-migration-YYYYMMDD
```
```

---

## Rollback

Se a migração travar em qualquer passo:

```bash
# Voltar para o estado anterior (tag criada no Passo 1)
git checkout main
git branch -D migration/spring-boot-3

# Ou restaurar a tag
git checkout pre-migration-YYYYMMDD
```

---

## Referências

- `references/common-fixes.md` — troubleshooting por categoria de erro
- `references/custom-parent-strategy.md` — projetos com parent POM próprio
- [OpenRewrite Spring Recipes](https://docs.openrewrite.org/recipes/java/spring)
- [Spring Boot 3 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.0-Migration-Guide)
