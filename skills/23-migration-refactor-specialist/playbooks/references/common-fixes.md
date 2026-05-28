# Common Fixes — Spring Boot 2→3 Migration

> Referência de troubleshooting para o playbook `spring-boot-2-to-3.md`.  
> Adaptado de [addozhang/spring-boot-migrator-skill](https://github.com/addozhang/spring-boot-migrator-skill) (MIT).

---

## 1. Ambiente

### JDK ou Maven não encontrado

```
Error: JAVA_HOME is not set
```

**Fix:**
```bash
# macOS/Linux
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
export PATH=$JAVA_HOME/bin:$PATH

# Verificar
java -version   # deve mostrar 21.x
mvn -version    # deve mostrar 3.6.3+
```

---

## 2. Erros javax → jakarta

### `package javax.persistence does not exist`

**Causa:** Spring Boot 3 usa Jakarta EE 10 — todos os pacotes `javax.*` relevantes foram renomeados para `jakarta.*`.

**Fix manual:**
```bash
# Ver todos os imports problemáticos
grep -r "import javax\." src/ --include="*.java"
```

| Antes (javax) | Depois (jakarta) |
|---|---|
| `javax.persistence.*` | `jakarta.persistence.*` |
| `javax.validation.*` | `jakarta.validation.*` |
| `javax.transaction.*` | `jakarta.transaction.*` |
| `javax.servlet.*` | `jakarta.servlet.*` |
| `javax.annotation.*` | `jakarta.annotation.*` |

> `javax.sql.*` e `javax.crypto.*` **não mudam** — pertencem ao Java SE, não ao Jakarta EE.

---

## 3. Hibernate Dialect

### `HibernateJpaDialect` / Dialect depreciado

**Erro:**
```
org.hibernate.dialect.PostgreSQL10Dialect has been deprecated
```

**Fix no `application.properties`:**
```properties
# Antes
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQL10Dialect

# Depois (Spring Boot 3 detecta automaticamente — remover a linha)
# spring.jpa.properties.hibernate.dialect=...
```

Se precisar especificar explicitamente:
```properties
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
```

### Mapeamento de dialetos renomeados

| Antes | Depois |
|---|---|
| `PostgreSQL10Dialect` | `PostgreSQLDialect` |
| `MySQL8Dialect` | `MySQLDialect` |
| `H2Dialect` | `H2Dialect` (sem mudança) |
| `Oracle12cDialect` | `OracleDialect` |

---

## 4. Properties renomeadas

### `spring.datasource` / `server.*`

| Antes | Depois |
|---|---|
| `server.max-http-header-size` | `server.max-http-request-header-size` |
| `spring.redis.*` | `spring.data.redis.*` |
| `spring.data.mongodb.*` | sem mudança |
| `management.metrics.export.*` | `management.prometheus.metrics.export.*` |
| `spring.security.oauth2.resourceserver.jwt.jwk-set-uri` | sem mudança |

**Verificação rápida:**
```bash
# Listar properties que podem estar depreciadas
mvn spring-boot:run 2>&1 | grep -i "deprecated\|renamed\|removed"
```

---

## 5. Conflitos de dependência

### `NoSuchMethodError` em runtime

**Causa comum:** dependência transitiva trazendo versão antiga de biblioteca que conflita com Spring Boot 3.

**Diagnóstico:**
```bash
mvn dependency:tree | grep -A2 -B2 "nome-da-lib"
```

**Fix:** forçar versão via `dependencyManagement`:
```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>com.exemplo</groupId>
            <artifactId>lib-conflitante</artifactId>
            <version>VERSÃO-COMPATÍVEL</version>
        </dependency>
    </dependencies>
</dependencyManagement>
```

---

## 6. Falhas de teste

### Testes de Spring Security

Spring Boot 3 mudou o comportamento padrão do `SecurityFilterChain`. Se testes de integração com `@SpringBootTest` falharem com 401/403 inesperado:

```java
// Adicionar em testes que não precisam de auth
@WithMockUser
@Test
void testEndpoint() { ... }
```

Ou desabilitar security no contexto de teste:
```java
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
class MyIntegrationTest { ... }
```

### Testes com `MockMvc` e `.andExpect(status().isOk())`

Spring Boot 3 pode retornar status diferentes para erros de validação. Revisar assertions de status code em testes de controller.

---

## 7. OpenRewrite não executa

### `Plugin not found`

```bash
# Forçar download com -U
mvn -U org.openrewrite.maven:rewrite-maven-plugin:run ...
```

### `Recipe not found`

Verificar que o artefato está disponível:
```bash
mvn dependency:get \
  -Dartifact=org.openrewrite.recipe:rewrite-spring:LATEST
```

Se LATEST não resolver, especificar versão explícita (ver [releases](https://github.com/openrewrite/rewrite-spring/releases)).

---

## 8. Parent POM customizado

Ver `custom-parent-strategy.md` — cobre os 2 cenários: atualizar parent próprio vs usar BOM import.

---

## 9. Driver de banco de dados

### PostgreSQL

```xml
<!-- Spring Boot 3 usa driver 42.x por padrão -->
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <!-- versão gerenciada pelo spring-boot-starter-parent -->
</dependency>
```

### MySQL

```xml
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <!-- groupId mudou de mysql:mysql-connector-java para com.mysql:mysql-connector-j -->
</dependency>
```

---

## 10. Flyway

Spring Boot 3 atualiza Flyway para versão 9+. Mudanças relevantes:

- Localização padrão: `classpath:db/migration` (sem mudança)
- Formato de nome: `V{versão}__{descrição}.sql` (sem mudança)
- `spring.flyway.check-location` removido — sempre verifica

Se usar `flyway-core` explicitamente:
```xml
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
    <!-- versão gerenciada pelo parent -->
</dependency>

<!-- Para MySQL/MariaDB — agora requer dependência separada -->
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-mysql</artifactId>
</dependency>
```

---

## 11. Virtual Threads (JDK 21 — opcional)

Spring Boot 3.2+ suporta Virtual Threads nativamente. Para habilitar:

```properties
# application.properties
spring.threads.virtual.enabled=true
```

**Não habilitar sem teste de carga.** Virtual Threads mudam o comportamento de thread-local e podem causar problemas com libs que assumem thread pinning (ex: versões antigas do Hibernate com `@Transactional`).
