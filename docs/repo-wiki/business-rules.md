# Regras de negócio e comportamento

Leitura estática de quatorze arquivos: dez arquivos de código do núcleo MCP, proteção de ferramentas, entrypoint e schema de template, mais quatro manifestos/configurações auxiliares. Regras operacionais do kit são separadas de exemplos de aplicação; não há afirmação de produto ou RPA implantado.

6 comportamentos descritos a partir de código lido. Cobertura parcial; não equivale a execução em produção.

## RN-01 — O tipo de tarefa determina a sequência de trabalho

Domínio: Orquestração. Natureza: operational. Evidência: observed.

**Quando:** Um consumidor chama buildPipeline com bugfix ou hotfix.

**O que acontece:** Bugfix recebe auditoria do repositório, QA, segurança e revisão final. Hotfix recebe segurança, revisão e deploy. A função devolve a configuração ordenada.

**Exceções e limites:** O retorno é um plano; esta função não executa testes nem deploy e não prova que etapas foram cumpridas.

**Verificação:** Leitura estática do código citado. O fluxo não foi executado em uma aplicação consumidora neste levantamento.

[evidence: mcp-server/src/lib/pipeline-engine.ts:31-41]

```text
  bugfix: {
    steps: [
      { id: "18-repo-auditor", name: "Repo Auditor", purpose: "entender contexto do bug" },
      { id: "05-qa-testing", name: "QA", purpose: "reproduzir e testar fix" },
      { id: "06-security-review", name: "Security", purpose: "validar se fix nao abre brecha" },
      { id: "11-reviewer", name: "Reviewer", purpose: "validacao final" },
    ],
    policies: ["execution", "handoffs", "quality-gates"],
    templates: ["handoff", "review"],
  },
  ui_improvement:
```

[evidence: mcp-server/src/lib/pipeline-engine.ts:105-114]

```text
  hotfix: {
    steps: [
      { id: "06-security-review", name: "Security", purpose: "validar fix critico" },
      { id: "11-reviewer", name: "Reviewer", purpose: "validacao rapida" },
      { id: "07-deploy", name: "Deploy", purpose: "deploy urgente" },
    ],
    policies: ["execution", "quality-gates"],
    templates: ["handoff"],
  },
  release:
```

[evidence: mcp-server/src/lib/pipeline-engine.ts:158-166]

```text
export function buildPipeline(taskType: TaskType): PipelineConfig & { type: string } {
  const config = PIPELINES[taskType];
  return {
    type: taskType,
    ...config,
  };
}

export function getNextStep
```

## RN-02 — Saídas repetidas podem ser substituídas por referência à chamada anterior

Domínio: Economia de contexto. Natureza: operational. Evidência: observed.

**Quando:** check recebe texto com hash igual a uma chamada na janela; na ausência de igualdade, avalia similaridade das assinaturas.

**O que acontece:** Uma igualdade retorna marcador com ID da chamada mais recente correspondente; similaridade igual ou superior ao limiar retorna marcador percentual da melhor correspondência. Sem correspondência, replacement é null.

**Exceções e limites:** O padrão é uma janela de 16 e limiar de 0,85. check não insere. A comparação aproximada não prova equivalência semântica; o chamador decide aplicar a substituição.

**Verificação:** Leitura estática do código citado. O fluxo não foi executado em uma aplicação consumidora neste levantamento.

[evidence: mcp-server/src/lib/cross-call-dedup.ts:183-235]

```text
  constructor(opts: CrossCallDedupOptions = {}) {
    this.windowSize = Math.max(1, opts.windowSize ?? 16);
    this.threshold = Math.min(1, Math.max(0, opts.threshold ?? 0.85));
  }

  /**
   * Check the cache. Does NOT insert. Returns a replacement string when the
   * incoming text matches a recent call exactly or fuzzily.
   */
  check(text: string): DedupResult {
    if (this.records.length === 0) return { replacement: null };

    const exactHash = fnv1a64(text);
    // Fast path: exact hash match. Walk newest-to-oldest.
    for (let i = this.records.length - 1; i >= 0; i--) {
      const r = this.records[i];
      if (r.exactHash === exactHash) {
        return {
          replacement: `[squeez-style: identical to call #${r.callId}${r.label ? ` (${r.label})` : ""}]`,
          match: { callId: r.callId, kind: "exact", similarity: 1, label: r.label },
        };
      }
    }

    // Fuzzy path: compute signature, scan window, pick best above threshold.
    const sig = shingleMinHash(text);
    let best: { record: CallRecord; sim: number } | null = null;
    for (let i = this.records.length - 1; i >= 0; i--) {
      const r = this.records[i];
      const sim = jaccard(sig, r.signature);
      if (sim >= this.threshold && (best === null || sim > best.sim)) {
        best = { record: r, sim };
      }
    }

    if (best !== null) {
      const pct = Math.round(best.sim * 100);
      return {
        replacement: `[squeez-style: ~${pct}% similar to call #${best.record.callId}${best.record.label ? ` (${best.record.label})` : ""}]`,
        match: {
          callId: best.record.callId,
          kind: "fuzzy",
          similarity: best.sim,
          label: best.record.label,
        },
      };
    }

    return { replacement: null };
  }

  /**
   * Insert a new call
```

## RN-03 — O cache descarta a chamada mais antiga quando excede a janela

Domínio: Retenção do histórico. Natureza: operational. Evidência: observed.

**Quando:** insert adiciona uma chamada e o número de registros ultrapassa windowSize.

**O que acontece:** O registro mais antigo é removido. checkAndInsert insere mesmo quando encontrou repetição. clear esvazia a janela e reinicia os IDs em 1.

**Exceções e limites:** A classe mantém estado em memória, não um histórico persistente. Reiniciar a sessão exige que o consumidor limpe ou substitua a instância.

**Verificação:** Leitura estática do código citado. O fluxo não foi executado em uma aplicação consumidora neste levantamento.

[evidence: mcp-server/src/lib/cross-call-dedup.ts:239-275]

```text
  insert(text: string, label?: string): CallRecord {
    const record: CallRecord = {
      callId: this.nextId++,
      exactHash: fnv1a64(text),
      signature: shingleMinHash(text),
      label,
    };
    this.records.push(record);
    if (this.records.length > this.windowSize) {
      this.records.shift();
    }
    return record;
  }

  /**
   * Convenience: check first, then insert (always). Returns the dedup result.
   * Inserting after a match lets future calls match against the same anchor.
   */
  checkAndInsert(text: string, label?: string): DedupResult {
    const result = this.check(text);
    this.insert(text, label);
    return result;
  }

  /** Current number of records in the window. */
  size(): number {
    return this.records.length;
  }

  /** Reset the window. Useful between sessions or for tests. */
  clear(): void {
    this.records = [];
    this.nextId = 1;
  }
}

// ─── Default singleton
```

## RN-04 — Tipos desconhecidos não retornam snippets

Domínio: Distribuição de exemplos. Natureza: operational. Evidência: observed.

**Quando:** getCodeSnippets recebe uma categoria de código.

**O que acontece:** Categorias reconhecidas selecionam hooks, components, stores, types ou middleware. Uma categoria desconhecida retorna lista vazia; middleware retorna apenas o exemplo correspondente quando legível.

**Exceções e limites:** Isso identifica src como biblioteca de exemplos exposta pelo serviço, não prova que uma aplicação Next.js esteja implantada. Falhas de leitura são convertidas em null pelo helper.

**Verificação:** Leitura estática do código citado. O fluxo não foi executado em uma aplicação consumidora neste levantamento.

[evidence: mcp-server/src/services/file-reader.ts:103-133]

```text
export async function getCodeSnippets(type: string): Promise<Array<{ path: string; content: string }>> {
  const typeMap: Record<string, string> = {
    hooks: "hooks",
    components: "components",
    stores: "stores",
    types: "types",
    middleware: "",
  };

  const subDir = typeMap[type];
  if (subDir === undefined) return [];

  if (type === "middleware") {
    const content = await readFile(path.join(PATHS.src, "middleware.ts"));
    return content ? [{ path: "src/middleware.ts", content }] : [];
  }

  const files = await glob("**/*.{ts,tsx}", { cwd: path.join(PATHS.src, subDir) });
  const results: Array<{ path: string; content: string }> = [];

  for (const file of files) {
    const content = await readFile(path.join(PATHS.src, subDir, file));
    if (content) {
      results.push({ path: `src/${subDir}/${file}`, content });
    }
  }

  return results;
}

export async function getRepoAudit
```

[evidence: mcp-server/src/services/file-reader.ts:8-16]

```text
export async function readFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

export async function listSkills
```

## RN-05 — Logout encerra a sessão local mesmo quando a API falha

Domínio: Sessão do exemplo de aplicação. Natureza: reference. Evidência: observed.

**Quando:** A mutação de logout termina, com sucesso ou erro.

**O que acontece:** onSettled limpa o estado de autenticação e o cache de consultas e navega para /login.

**Exceções e limites:** Não comprova revogação do token no servidor em caso de erro. É comportamento do snippet de referência, não uma regra de produto em produção.

**Verificação:** Leitura estática do código citado. O fluxo não foi executado em uma aplicação consumidora neste levantamento.

[evidence: src/hooks/useAuth.ts:56-67]

```text
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSettled: () => {
      clearAuth();
      queryClient.clear();
      router.push('/login');
    },
  });

  // Me query
```

## RN-06 — Navegação de páginas respeita os limites conhecidos

Domínio: Listagem do exemplo de aplicação. Natureza: reference. Evidência: observed.

**Quando:** goToPage, nextPage ou prevPage são chamados com metadados de paginação disponíveis.

**O que acontece:** goToPage limita o destino entre 1 e totalPages; nextPage usa o menor valor entre próxima página e totalPages; prevPage não desce de 1. Sem metadados, totalPages vale 1.

**Exceções e limites:** initialPage não é normalizado e não há validação de NaN ou números fracionários. A regra descreve entradas numéricas válidas e não garante correção para metadados inválidos.

**Verificação:** Leitura estática do código citado. O fluxo não foi executado em uma aplicação consumidora neste levantamento.

[evidence: src/hooks/usePagination.ts:31-46]

```text
  const meta = query.data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  const goToPage = useCallback((p: number) => {
    setPage(Math.max(1, Math.min(p, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    setPage((p) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(p - 1, 1));
  }, []);

  // Gera array
```
