# Custom Parent POM Strategy — Spring Boot 2→3

> Para projetos que NÃO usam `spring-boot-starter-parent` diretamente como parent.  
> Adaptado de [addozhang/spring-boot-migrator-skill](https://github.com/addozhang/spring-boot-migrator-skill) (MIT).

---

## Problema

Projetos corporativos frequentemente têm um parent POM próprio:

```xml
<parent>
    <groupId>com.empresa</groupId>
    <artifactId>empresa-parent</artifactId>
    <version>1.0.0</version>
</parent>
```

Nesse caso, o `spring-boot-starter-parent` é uma dependência transitiva, não direta. O OpenRewrite pode não conseguir atualizar as versões corretamente.

---

## Estratégia 1 — Atualizar o parent próprio primeiro

**Quando usar:** você controla o parent POM da empresa.

**Passos:**
1. No `empresa-parent`, atualizar o parent dele para `spring-boot-starter-parent 3.x`
2. Publicar nova versão do `empresa-parent`
3. Atualizar o projeto para a nova versão do parent
4. Continuar o playbook normalmente

```xml
<!-- empresa-parent/pom.xml — ANTES -->
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>2.7.18</version>
</parent>

<!-- empresa-parent/pom.xml — DEPOIS -->
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.5</version>
</parent>
```

---

## Estratégia 2 — BOM import (recomendado quando não controla o parent)

**Quando usar:** o parent POM é de terceiros ou não pode ser alterado agora.

Substituir o parent por um `dependencyManagement` com BOM:

```xml
<!-- ANTES: parent direto -->
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>2.7.18</version>
</parent>

<!-- DEPOIS: manter seu parent + importar BOM -->
<parent>
    <groupId>com.empresa</groupId>
    <artifactId>empresa-parent</artifactId>
    <version>1.0.0</version>
</parent>

<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-dependencies</artifactId>
            <version>3.2.5</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

**Diferença importante:** o BOM `spring-boot-dependencies` gerencia **versões** de dependências, mas não herda o `pluginManagement` do `spring-boot-starter-parent`. Se precisar do plugin de build:

```xml
<build>
    <plugins>
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
            <version>3.2.5</version>
            <executions>
                <execution>
                    <goals>
                        <goal>repackage</goal>
                    </goals>
                </execution>
            </executions>
        </plugin>
    </plugins>
</build>
```

---

## Estratégia 3 — Migrar JARs javax internos

**Quando usar:** o projeto tem JARs internos que ainda usam `javax.*` e não podem ser recompilados agora.

Usar o [Apache Tomcat Jakarta Migration Tool](https://github.com/apache/tomcat-jakartaee-migration):

```bash
# Baixar o tool
wget https://downloads.apache.org/tomcat/jakartaee-migration/v1.0.7/binaries/jakartaee-migration-1.0.7-shaded.jar

# Migrar um JAR
java -jar jakartaee-migration-1.0.7-shaded.jar \
  meu-jar-legado-2.0.0.jar \
  meu-jar-legado-3.0.0-jakarta.jar
```

Após migrar, publicar a versão `-jakarta` no repositório interno e atualizar a dependência no `pom.xml`.

---

## Checklist por Estratégia

| Estratégia | Controla parent? | Tempo | Risco |
|---|---|---|---|
| 1 — Atualizar parent | Sim | Alto | Baixo |
| 2 — BOM import | Não necessário | Baixo | Médio (sem pluginManagement) |
| 3 — Migrar JARs internos | N/A | Alto | Baixo |

**Recomendação:** Estratégia 2 para desbloquear a migração rapidamente; planejar Estratégia 1 como dívida técnica a quitar no próximo trimestre.
