import type { TaskType } from "./classifier.js";
import type { PipelineStep } from "../types.js";

interface PipelineConfig {
  steps: Array<{ id: string; name: string; purpose: string }>;
  policies: string[];
  templates: string[];
}

const PIPELINES: Record<TaskType, PipelineConfig> = {
  feature: {
    steps: [
      { id: "18-repo-auditor", name: "Repo Auditor", purpose: "mapear stack e convencoes" },
      { id: "28-claude-md-generator", name: "CLAUDE.md Generator", purpose: "gerar CLAUDE.md se necessario" },
      { id: "01-po-feature-spec", name: "PO", purpose: "spec, historias e criterios de aceitacao" },
      { id: "29-design-intelligence", name: "Design Intelligence", purpose: "pesquisa competitiva e moodboard" },
      { id: "02-ui-ux-design", name: "UI/UX", purpose: "wireframe, tokens e responsividade" },
      { id: "03-backend-api", name: "Backend", purpose: "API, schema e validacao" },
      { id: "04-frontend", name: "Frontend", purpose: "componentes, estado e integracao" },
      { id: "12-motion-design", name: "Motion", purpose: "animacoes e micro-interacoes" },
      { id: "13-marketing-copy", name: "Copy", purpose: "CTAs, microcopy e brand voice" },
      { id: "14-seo", name: "SEO", purpose: "meta tags, schema e performance" },
      { id: "05-qa-testing", name: "QA", purpose: "testes e cobertura" },
      { id: "06-security-review", name: "Security", purpose: "auditoria OWASP e validacao" },
      { id: "11-reviewer", name: "Reviewer", purpose: "validacao final" },
      { id: "07-deploy", name: "Deploy", purpose: "docker, CI/CD e rollout" },
    ],
    policies: ["execution", "handoffs", "quality-gates", "token-efficiency", "stack-flexibility", "tool-safety"],
    templates: ["plan", "handoff", "review"],
  },
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
  ui_improvement: {
    steps: [
      { id: "29-design-intelligence", name: "Design Intelligence", purpose: "pesquisa competitiva e tendencias visuais" },
      { id: "02-ui-ux-design", name: "UI/UX", purpose: "wireframe e tokens atualizados" },
      { id: "04-frontend", name: "Frontend", purpose: "implementar nova interface" },
      { id: "12-motion-design", name: "Motion", purpose: "animacoes e transicoes" },
      { id: "05-qa-testing", name: "QA", purpose: "testes de regressao" },
      { id: "06-security-review", name: "Security", purpose: "validar mudancas" },
      { id: "11-reviewer", name: "Reviewer", purpose: "validacao final" },
    ],
    policies: ["execution", "handoffs", "quality-gates", "stack-flexibility"],
    templates: ["design-intelligence-dossier", "handoff", "review"],
  },
  landing_page: {
    steps: [
      { id: "13-marketing-copy", name: "Copy", purpose: "headlines, CTAs e estrutura de conversao" },
      { id: "29-design-intelligence", name: "Design Intelligence", purpose: "benchmarking visual do nicho" },
      { id: "02-ui-ux-design", name: "UI/UX", purpose: "layout e design system" },
      { id: "04-frontend", name: "Frontend", purpose: "implementar pagina" },
      { id: "12-motion-design", name: "Motion", purpose: "animacoes de entrada e scroll" },
      { id: "14-seo", name: "SEO", purpose: "meta tags e performance" },
      { id: "05-qa-testing", name: "QA", purpose: "testes cross-browser" },
      { id: "06-security-review", name: "Security", purpose: "validar forms e headers" },
      { id: "11-reviewer", name: "Reviewer", purpose: "validacao final" },
    ],
    policies: ["execution", "handoffs", "quality-gates", "stack-flexibility"],
    templates: ["design-intelligence-dossier", "handoff", "review"],
  },
  refactor: {
    steps: [
      { id: "18-repo-auditor", name: "Repo Auditor", purpose: "mapear estado atual" },
      { id: "05-qa-testing", name: "QA", purpose: "testes de regressao" },
      { id: "06-security-review", name: "Security", purpose: "validar mudancas" },
      { id: "11-reviewer", name: "Reviewer", purpose: "validacao final" },
    ],
    policies: ["execution", "handoffs", "quality-gates"],
    templates: ["handoff", "review"],
  },
  migration: {
    steps: [
      { id: "18-repo-auditor", name: "Repo Auditor", purpose: "mapear estado atual" },
      { id: "23-migration-refactor", name: "Migration Refactor", purpose: "plano de migracao por fases" },
      { id: "05-qa-testing", name: "QA", purpose: "testes por fase" },
      { id: "06-security-review", name: "Security", purpose: "validar seguranca" },
      { id: "11-reviewer", name: "Reviewer", purpose: "validacao final" },
      { id: "07-deploy", name: "Deploy", purpose: "rollout incremental" },
    ],
    policies: ["execution", "handoffs", "quality-gates", "stack-flexibility"],
    templates: ["migration-plan", "handoff", "review"],
  },
  ai_feature: {
    steps: [
      { id: "18-repo-auditor", name: "Repo Auditor", purpose: "mapear stack" },
      { id: "25-ai-integration", name: "AI Integration Architect", purpose: "arquitetura de integracao" },
      { id: "26-prompt-engineer", name: "Prompt Engineer", purpose: "design de prompts" },
      { id: "03-backend-api", name: "Backend", purpose: "API e adapters" },
      { id: "04-frontend", name: "Frontend", purpose: "UI de integracao" },
      { id: "05-qa-testing", name: "QA", purpose: "testes" },
      { id: "06-security-review", name: "Security", purpose: "validar seguranca" },
      { id: "11-reviewer", name: "Reviewer", purpose: "validacao final" },
    ],
    policies: ["execution", "handoffs", "quality-gates", "tool-safety"],
    templates: ["ai-integration-plan", "prompt-spec", "handoff", "review"],
  },
  hotfix: {
    steps: [
      { id: "06-security-review", name: "Security", purpose: "validar fix critico" },
      { id: "11-reviewer", name: "Reviewer", purpose: "validacao rapida" },
      { id: "07-deploy", name: "Deploy", purpose: "deploy urgente" },
    ],
    policies: ["execution", "quality-gates"],
    templates: ["handoff"],
  },
  release: {
    steps: [
      { id: "11-reviewer", name: "Reviewer", purpose: "validacao final" },
      { id: "24-release-manager", name: "Release Manager", purpose: "versao, changelog e rollout" },
      { id: "07-deploy", name: "Deploy", purpose: "deploy" },
    ],
    policies: ["execution", "handoffs", "quality-gates"],
    templates: ["release-plan", "handoff"],
  },
  infra: {
    steps: [
      { id: "07-deploy", name: "Deploy", purpose: "infra e CI/CD" },
      { id: "20-observability-sre", name: "Observability SRE", purpose: "monitoramento e alertas" },
      { id: "05-qa-testing", name: "QA", purpose: "validar infra" },
      { id: "06-security-review", name: "Security", purpose: "validar seguranca" },
      { id: "11-reviewer", name: "Reviewer", purpose: "validacao final" },
    ],
    policies: ["execution", "handoffs", "quality-gates", "tool-safety"],
    templates: ["observability-check", "handoff", "review"],
  },
  accessibility: {
    steps: [
      { id: "22-accessibility", name: "Accessibility Specialist", purpose: "auditoria WCAG" },
      { id: "02-ui-ux-design", name: "UI/UX", purpose: "ajustes de interface" },
      { id: "04-frontend", name: "Frontend", purpose: "implementar correcoes" },
      { id: "05-qa-testing", name: "QA", purpose: "testar acessibilidade" },
      { id: "11-reviewer", name: "Reviewer", purpose: "validacao final" },
    ],
    policies: ["execution", "handoffs", "quality-gates"],
    templates: ["accessibility-check", "handoff", "review"],
  },
  analytics: {
    steps: [
      { id: "21-data-analytics", name: "Data Analytics", purpose: "definir eventos e funis" },
      { id: "03-backend-api", name: "Backend", purpose: "instrumentar backend" },
      { id: "04-frontend", name: "Frontend", purpose: "instrumentar frontend" },
      { id: "05-qa-testing", name: "QA", purpose: "validar tracking" },
      { id: "11-reviewer", name: "Reviewer", purpose: "validacao final" },
    ],
    policies: ["execution", "handoffs"],
    templates: ["analytics-plan", "handoff", "review"],
  },
};

export function buildPipeline(taskType: TaskType): PipelineConfig & { type: string } {
  const config = PIPELINES[taskType];
  return {
    type: taskType,
    ...config,
  };
}

export function getNextStep(
  pipelineType: TaskType,
  currentStep: number,
): { id: string; name: string; purpose: string } | null {
  const config = PIPELINES[pipelineType];
  if (!config) return null;

  const nextIndex = currentStep;
  if (nextIndex >= config.steps.length) return null;

  return config.steps[nextIndex];
}
