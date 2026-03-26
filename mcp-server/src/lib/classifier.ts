export type TaskType =
  | "feature"
  | "bugfix"
  | "ui_improvement"
  | "refactor"
  | "migration"
  | "ai_feature"
  | "landing_page"
  | "hotfix"
  | "release"
  | "infra"
  | "accessibility"
  | "analytics";

const PATTERNS: Array<{ type: TaskType; keywords: string[] }> = [
  { type: "hotfix", keywords: ["hotfix", "urgente", "critico", "critical", "producao caiu", "prod down"] },
  { type: "bugfix", keywords: ["bug", "fix", "corrigir", "erro", "error", "broken", "quebrado", "nao funciona"] },
  { type: "ui_improvement", keywords: ["melhorar interface", "redesign", "ui", "ux", "layout", "visual", "melhorar tela", "interface melhor"] },
  { type: "landing_page", keywords: ["landing page", "landing", "pagina de vendas", "pagina inicial"] },
  { type: "migration", keywords: ["migrar", "migration", "upgrade", "atualizar versao", "legacy", "refatorar grande"] },
  { type: "ai_feature", keywords: ["ia", "ai", "gpt", "claude", "llm", "gerar texto", "gerar imagem", "chatbot", "machine learning"] },
  { type: "refactor", keywords: ["refactor", "refatorar", "limpar", "clean", "reorganizar", "simplificar"] },
  { type: "release", keywords: ["release", "versao", "changelog", "deploy", "publicar"] },
  { type: "infra", keywords: ["infra", "docker", "ci/cd", "pipeline", "monitoramento", "observabilidade", "devops"] },
  { type: "accessibility", keywords: ["acessibilidade", "wcag", "aria", "screen reader", "teclado"] },
  { type: "analytics", keywords: ["analytics", "metricas", "tracking", "evento", "funil", "kpi"] },
  { type: "feature", keywords: ["feature", "funcionalidade", "criar", "adicionar", "novo", "implementar", "construir", "quero"] },
];

export function classifyTask(description: string): TaskType {
  const lower = description.toLowerCase();

  for (const { type, keywords } of PATTERNS) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return type;
    }
  }

  return "feature"; // default
}
