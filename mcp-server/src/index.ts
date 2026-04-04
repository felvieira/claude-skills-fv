#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Services
import * as fileReader from "./services/file-reader.js";
import { searchBrave, searchCompetitors, searchDesignReferences } from "./services/brave-search.js";
import { scrapeWithFirecrawl, isFirecrawlAvailable } from "./services/firecrawl.js";
import { generateImage } from "./services/fal-ai.js";
import { buildScreenshotInstruction, buildImageExtractionInstruction, buildScrapeInstruction } from "./services/playwright.js";

// Lib
import { classifyTask } from "./lib/classifier.js";
import { buildPipeline, getNextStep } from "./lib/pipeline-engine.js";

// Load .env.local fallback
import fs from "fs";
import path from "path";
import { KIT_ROOT, resolveConsumerProjectRoot } from "./constants.js";

function loadEnvFile() {
  for (const envFile of [".env.local", ".env"]) {
    // Try project root (when installed in .bot/) and kit root
    for (const base of [process.cwd(), KIT_ROOT]) {
      const envPath = path.join(base, envFile);
      try {
        const content = fs.readFileSync(envPath, "utf-8");
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const eqIdx = trimmed.indexOf("=");
          if (eqIdx === -1) continue;
          const key = trimmed.slice(0, eqIdx).trim();
          const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      } catch {
        // File not found, continue
      }
    }
  }
}

loadEnvFile();

const server = new McpServer({
  name: "dev-team-kit-mcp-server",
  version: "1.0.0",
});

// ============================================================================
// KNOWLEDGE BLOCK
// ============================================================================

server.registerTool(
  "devkit_route_task",
  {
    title: "Route Task",
    description: "Classifies a task description and returns the recommended pipeline with skills, policies and templates",
    inputSchema: {
      description: z.string().describe("Task description in natural language"),
      project_context: z.string().optional().describe("Optional project context"),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ description }) => {
    const taskType = classifyTask(description);
    const pipeline = buildPipeline(taskType);
    const result = {
      type: pipeline.type,
      pipeline: pipeline.steps.map((s, i) => ({
        step: i + 1,
        skill_id: s.id,
        skill_name: s.name,
        purpose: s.purpose,
      })),
      policies: pipeline.policies,
      templates: pipeline.templates,
    };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "devkit_get_skill",
  {
    title: "Get Skill",
    description: "Returns the full SKILL.md content, skill guide and relevant template for a skill",
    inputSchema: {
      skill_id: z.string().describe("Skill ID, e.g. '29-design-intelligence', '02-ui-ux-design'"),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ skill_id }) => {
    const { content, guide, template } = await fileReader.getSkillContent(skill_id);
    if (!content) {
      return { content: [{ type: "text" as const, text: `Skill '${skill_id}' not found` }] };
    }
    const result = {
      skill_content: content,
      skill_guide: guide,
      template,
    };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "devkit_next_step",
  {
    title: "Next Pipeline Step",
    description: "Returns the next skill in the pipeline given current progress",
    inputSchema: {
      pipeline_type: z.string().describe("Pipeline type from route_task"),
      current_step: z.number().describe("Current step number (0-indexed)"),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ pipeline_type, current_step }) => {
    const next = getNextStep(pipeline_type as any, current_step);
    if (!next) {
      return { content: [{ type: "text" as const, text: "Pipeline complete — no more steps" }] };
    }
    const { content } = await fileReader.getSkillContent(next.id);
    const handoffTemplate = await fileReader.getTemplate("handoff");
    const result = {
      next_skill: { ...next, content },
      handoff_template: handoffTemplate,
    };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "devkit_list_skills",
  {
    title: "List Skills",
    description: "Lists all 29 skills with ID, name, description and triggers",
    inputSchema: {},
    annotations: { readOnlyHint: true },
  },
  async () => {
    const skills = await fileReader.listSkills();
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ skills }, null, 2) }],
    };
  },
);

server.registerTool(
  "devkit_get_governance",
  {
    title: "Get Governance",
    description: "Returns GLOBAL.md and relevant policies for a task type",
    inputSchema: {
      task_type: z.string().optional().describe("Task type to filter relevant policies"),
    },
    annotations: { readOnlyHint: true },
  },
  async () => {
    const global = await fileReader.getGlobal();
    const policies = await fileReader.getPolicies();
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ global, policies }, null, 2) }],
    };
  },
);

server.registerTool(
  "devkit_get_template",
  {
    title: "Get Template",
    description: "Returns a specific template by name (handoff, plan, review, design-intelligence-dossier, etc.)",
    inputSchema: {
      template_name: z.string().describe("Template name without .md extension"),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ template_name }) => {
    const content = await fileReader.getTemplate(template_name);
    return {
      content: [{ type: "text" as const, text: content || `Template '${template_name}' not found` }],
    };
  },
);

server.registerTool(
  "devkit_get_patterns",
  {
    title: "Get AI Patterns",
    description: "Returns AI integration patterns (hooks, providers, cost-efficiency, security, etc.)",
    inputSchema: {
      pattern: z.string().optional().describe("Specific pattern name, or omit for overview"),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ pattern }) => {
    const content = await fileReader.getPatterns(pattern);
    return {
      content: [{ type: "text" as const, text: content || "Pattern not found" }],
    };
  },
);

server.registerTool(
  "devkit_get_code_snippets",
  {
    title: "Get Code Snippets",
    description: "Returns reusable code from the kit (hooks, components, stores, types, middleware)",
    inputSchema: {
      type: z.enum(["hooks", "components", "stores", "types", "middleware"]).describe("Type of code to retrieve"),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ type }) => {
    const files = await fileReader.getCodeSnippets(type);
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ files }, null, 2) }],
    };
  },
);

server.registerTool(
  "devkit_get_repo_audit",
  {
    title: "Get Repo Audit",
    description: "Returns persisted repo audit and asset inventory",
    inputSchema: {
      project_path: z.string().optional().describe("Path to consumer project (defaults to kit)"),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ project_path }) => {
    const { audit, assets } = await fileReader.getRepoAudit(project_path);
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ audit, assets, exists: !!(audit || assets) }, null, 2) }],
    };
  },
);

server.registerTool(
  "devkit_recommend_model",
  {
    title: "Recommend Model Level",
    description: "LLM Selector logic — recommends Fast/Balanced/Deep based on task complexity",
    inputSchema: {
      task_type: z.string().describe("Type of task"),
      complexity: z.enum(["low", "medium", "high"]).describe("Task complexity"),
      risk: z.enum(["low", "medium", "high"]).describe("Risk level"),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ task_type, complexity, risk }) => {
    let level: string;
    let modelClass: string;

    if (risk === "high" || complexity === "high") {
      level = "Deep";
      modelClass = "Most capable model available (Claude Opus, GPT-4, Gemini Ultra)";
    } else if (complexity === "medium" || risk === "medium") {
      level = "Balanced";
      modelClass = "Standard model (Claude Sonnet, GPT-4o, Gemini Pro)";
    } else {
      level = "Fast";
      modelClass = "Fast model (Claude Haiku, GPT-4o-mini, Gemini Flash)";
    }

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({ level, model_class: modelClass, reason: `${complexity} complexity, ${risk} risk for ${task_type}` }, null, 2),
      }],
    };
  },
);

server.registerTool(
  "devkit_get_skill_matrix",
  {
    title: "Get Skill Matrix",
    description: "Returns dependency matrix showing which skills call/are called by other skills",
    inputSchema: {
      skill_id: z.string().optional().describe("Filter to specific skill"),
    },
    annotations: { readOnlyHint: true },
  },
  async () => {
    // Static matrix based on kit architecture
    const matrix = [
      { skill: "09-orchestrator", calls: ["all"], called_by: ["user"] },
      { skill: "01-po-feature-spec", calls: ["02-ui-ux-design", "03-backend-api"], called_by: ["09-orchestrator"] },
      { skill: "29-design-intelligence", calls: ["16-llm-selector", "17-image-generator", "19-asset-librarian", "02-ui-ux-design"], called_by: ["09-orchestrator", "01-po-feature-spec"] },
      { skill: "02-ui-ux-design", calls: ["04-frontend", "12-motion-design"], called_by: ["29-design-intelligence", "01-po-feature-spec"] },
      { skill: "17-image-generator", calls: [], called_by: ["29-design-intelligence", "02-ui-ux-design", "04-frontend"] },
      { skill: "16-llm-selector", calls: [], called_by: ["all"] },
      { skill: "18-repo-auditor", calls: ["28-claude-md-generator", "19-asset-librarian"], called_by: ["09-orchestrator"] },
      { skill: "05-qa-testing", calls: ["06-security-review"], called_by: ["03-backend-api", "04-frontend"] },
      { skill: "06-security-review", calls: ["11-reviewer"], called_by: ["05-qa-testing"] },
      { skill: "11-reviewer", calls: ["07-deploy"], called_by: ["06-security-review"] },
    ];
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ matrix }, null, 2) }],
    };
  },
);

server.registerTool(
  "devkit_get_eval_cases",
  {
    title: "Get Eval Cases",
    description: "Returns test/eval cases for a skill or flow",
    inputSchema: {
      skill_id: z.string().optional().describe("Skill ID to filter evals"),
      flow: z.string().optional().describe("Flow name to filter evals"),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ skill_id, flow }) => {
    const cases = await fileReader.getEvalCases(skill_id, flow);
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ cases }, null, 2) }],
    };
  },
);

// ============================================================================
// EXECUTION BLOCK
// ============================================================================

server.registerTool(
  "devkit_search_web",
  {
    title: "Search Web",
    description: "Search via Brave Search API for competitors, design references, or general queries. Requires BRAVE_SEARCH_KEY.",
    inputSchema: {
      query: z.string().describe("Search query"),
      count: z.number().optional().describe("Number of results (default 5)"),
      search_type: z.enum(["general", "competitors", "design_references"]).optional().describe("Type of search"),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ query, count, search_type }) => {
    try {
      let results;
      switch (search_type) {
        case "competitors":
          results = await searchCompetitors(query, count);
          break;
        case "design_references":
          results = await searchDesignReferences(query, count);
          break;
        default:
          results = await searchBrave(query, count);
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ results }, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Search error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  },
);

server.registerTool(
  "devkit_scrape_page",
  {
    title: "Scrape Page",
    description: "Extract structured content from a URL. Uses Firecrawl if available, otherwise returns Playwright instructions for the LLM to execute.",
    inputSchema: {
      url: z.string().describe("URL to scrape"),
      format: z.enum(["markdown", "html", "text"]).optional().describe("Output format (default markdown)"),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ url, format }) => {
    if (isFirecrawlAvailable()) {
      try {
        const result = await scrapeWithFirecrawl(url, format);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        // Fall through to Playwright instructions
      }
    }

    // Return Playwright instructions for the LLM to execute via Playwright MCP
    const instruction = buildScrapeInstruction(url);
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          fallback: "playwright",
          message: "Firecrawl not available. Use Playwright MCP to execute this scrape.",
          instruction,
        }, null, 2),
      }],
    };
  },
);

server.registerTool(
  "devkit_screenshot_page",
  {
    title: "Screenshot Page",
    description: "Returns instructions to take a full-page screenshot via Playwright MCP",
    inputSchema: {
      url: z.string().describe("URL to screenshot"),
      full_page: z.boolean().optional().describe("Full page screenshot (default true)"),
      viewport_width: z.number().optional().describe("Viewport width"),
      viewport_height: z.number().optional().describe("Viewport height"),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ url, full_page, viewport_width, viewport_height }) => {
    const viewport = viewport_width && viewport_height
      ? { width: viewport_width, height: viewport_height }
      : undefined;
    const instruction = buildScreenshotInstruction(url, full_page ?? true, viewport);
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          message: "Use Playwright MCP to execute this screenshot. Steps: 1) browser_navigate to URL, 2) browser_take_screenshot with fullPage option",
          instruction,
        }, null, 2),
      }],
    };
  },
);

server.registerTool(
  "devkit_extract_images",
  {
    title: "Extract Images",
    description: "Returns instructions to extract images from a page via Playwright MCP",
    inputSchema: {
      url: z.string().describe("URL to extract images from"),
      selector: z.string().optional().describe("CSS selector to filter images (default 'img')"),
      limit: z.number().optional().describe("Max images to extract (default 10)"),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ url, selector, limit }) => {
    const instruction = buildImageExtractionInstruction(url, selector, limit);
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          message: "Use Playwright MCP to execute. Steps: 1) browser_navigate, 2) browser_evaluate to query all matching img elements and extract src/alt",
          instruction,
        }, null, 2),
      }],
    };
  },
);

server.registerTool(
  "devkit_generate_image",
  {
    title: "Generate Image",
    description: "Generate images via fal.ai API. Supports text-to-image, image-to-image, background removal and icon generation. Requires FAL_KEY.",
    inputSchema: {
      mode: z.enum(["t2i", "i2i", "rembg", "ico"]).describe("Generation mode"),
      prompt: z.string().optional().describe("Text prompt for t2i/i2i"),
      image_path: z.string().optional().describe("Input image URL for i2i/rembg"),
      model: z.string().optional().describe("fal.ai model ID override"),
      width: z.number().optional().describe("Output width"),
      height: z.number().optional().describe("Output height"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  },
  async ({ mode, prompt, image_path, model, width, height }) => {
    try {
      const result = await generateImage({
        mode,
        prompt,
        imagePath: image_path,
        model,
        width,
        height,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Image generation error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  },
);

server.registerTool(
  "devkit_analyze_visual_prompt",
  {
    title: "Analyze Visual Prompt",
    description: "Returns a structured prompt for the LLM to analyze competitor screenshots. Does NOT call any LLM — builds the prompt for the client LLM to execute.",
    inputSchema: {
      screenshot_paths: z.array(z.string()).describe("Local paths or URLs of screenshots to analyze"),
      analysis_type: z.enum(["competitive", "trends", "palette", "typography", "layout", "cta"]).describe("Type of visual analysis"),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ screenshot_paths, analysis_type }) => {
    const prompts: Record<string, string> = {
      competitive: `Analyze these competitor screenshots and return a structured comparison:
1. **Color Palettes**: Dominant colors, contrast approach, dark/light mode
2. **Typography**: Font families, hierarchy (H1-H4 sizes), weight usage
3. **Layout Patterns**: Hero section structure, grid system, whitespace strategy
4. **CTAs**: Primary CTA text, color, placement, urgency tactics
5. **Conversion Strategy**: Trust signals, social proof, pricing presentation
6. **Visual Identity**: Photography style, illustration style, icon system
7. **Differentiators**: What makes each unique vs. industry standard

Return as a structured markdown table comparing all screenshots.`,

      trends: `Analyze these design references and identify current trends:
1. What visual patterns are dominant across all references?
2. What emerging design trends are visible?
3. What color schemes are trending in this niche?
4. What typography choices are most common?
5. What layout innovations stand out?`,

      palette: `Extract the color palette from each screenshot:
1. Primary colors (hex values)
2. Secondary/accent colors
3. Background colors
4. Text colors
5. CTA/action colors
6. Overall mood (warm/cool/neutral)
Return as a structured list per screenshot.`,

      typography: `Analyze typography choices in each screenshot:
1. Primary heading font (serif/sans-serif/display)
2. Body text font
3. Font size hierarchy
4. Weight variations used
5. Letter-spacing and line-height patterns`,

      layout: `Analyze layout patterns:
1. Grid system (columns, gutters)
2. Hero section pattern (text-left/center/split)
3. Section rhythm and spacing
4. Navigation pattern
5. Footer structure
6. Mobile-first indicators`,

      cta: `Analyze CTA patterns:
1. Primary CTA text and verb used
2. CTA color and contrast ratio
3. CTA placement (above fold, sticky, multiple)
4. Secondary CTA patterns
5. Urgency/scarcity tactics
6. Trust signals near CTAs`,
    };

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          prompt: prompts[analysis_type],
          images: screenshot_paths,
          instructions: "Send this prompt along with the referenced images to your vision-capable model for analysis. Each image path should be read and included as image content.",
        }, null, 2),
      }],
    };
  },
);

// ============================================================================
// PERSISTENCE BLOCK
// ============================================================================

server.registerTool(
  "devkit_save_artifact",
  {
    title: "Save Artifact",
    description: "Saves an artifact to the correct location in the project",
    inputSchema: {
      type: z.enum(["spec", "dossier", "audit", "assets", "plan", "handoff", "context", "custom"]).describe("Artifact type"),
      content: z.string().describe("Artifact content"),
      filename: z.string().optional().describe("Custom filename"),
      project_path: z.string().optional().describe("Consumer project root path"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async ({ type, content, filename, project_path }) => {
    const base = project_path || KIT_ROOT;
    const pathMap: Record<string, string> = {
      spec: "docs/superpowers/specs",
      dossier: "docs/design-intelligence",
      audit: "docs/repo-audit",
      assets: "docs/repo-audit",
      plan: "docs/plans",
      handoff: "docs/handoffs",
      context: "docs/context",
      custom: "docs",
    };

    const dir = path.join(base, pathMap[type] || "docs");
    const defaultNames: Record<string, string> = {
      dossier: "dossier.md",
      audit: "current.md",
      assets: "assets.md",
      context: "current-focus.md",
    };

    const finalFilename = filename || defaultNames[type] || `${type}-${Date.now()}.md`;
    const fullPath = path.join(dir, finalFilename);

    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(fullPath, content, "utf-8");

    return {
      content: [{ type: "text" as const, text: JSON.stringify({ saved_path: fullPath }, null, 2) }],
    };
  },
);

server.registerTool(
  "devkit_get_artifact",
  {
    title: "Get Artifact",
    description: "Retrieves a previously saved artifact",
    inputSchema: {
      type: z.enum(["spec", "dossier", "audit", "assets", "plan", "handoff", "context", "custom"]).describe("Artifact type"),
      filename: z.string().optional().describe("Specific filename"),
      project_path: z.string().optional().describe("Consumer project root path"),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ type, filename, project_path }) => {
    const base = project_path || KIT_ROOT;
    const pathMap: Record<string, string> = {
      spec: "docs/superpowers/specs",
      dossier: "docs/design-intelligence",
      audit: "docs/repo-audit",
      assets: "docs/repo-audit",
      plan: "docs/plans",
      handoff: "docs/handoffs",
      context: "docs/context",
      custom: "docs",
    };

    const dir = path.join(base, pathMap[type] || "docs");
    const defaultNames: Record<string, string> = {
      dossier: "dossier.md",
      audit: "current.md",
      assets: "assets.md",
      context: "current-focus.md",
    };

    const finalFilename = filename || defaultNames[type] || "";
    const fullPath = path.join(dir, finalFilename);

    try {
      const content = await fs.promises.readFile(fullPath, "utf-8");
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ content, path: fullPath, exists: true }, null, 2) }],
      };
    } catch {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ content: null, path: fullPath, exists: false }, null, 2) }],
      };
    }
  },
);

server.registerTool(
  "devkit_save_context",
  {
    title: "Save Context",
    description: "Persists current focus, decisions, blockers and next steps for session continuity",
    inputSchema: {
      focus: z.string().describe("Current task focus"),
      decisions: z.array(z.string()).optional().describe("Key decisions made"),
      blockers: z.array(z.string()).optional().describe("Current blockers"),
      next_steps: z.array(z.string()).optional().describe("Recommended next steps"),
      project_path: z.string().optional().describe("Consumer project root path"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async ({ focus, decisions, blockers, next_steps, project_path }) => {
    const base = project_path || KIT_ROOT;
    const dir = path.join(base, "docs", "context");
    const fullPath = path.join(dir, "current-focus.md");

    const content = [
      `# Current Focus`,
      ``,
      `**Focus:** ${focus}`,
      `**Updated:** ${new Date().toISOString()}`,
    ];

    if (decisions?.length) {
      content.push(``, `## Decisions`, ...decisions.map((d) => `- ${d}`));
    }
    if (blockers?.length) {
      content.push(``, `## Blockers`, ...blockers.map((b) => `- ${b}`));
    }
    if (next_steps?.length) {
      content.push(``, `## Next Steps`, ...next_steps.map((n) => `- ${n}`));
    }

    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(fullPath, content.join("\n"), "utf-8");

    return {
      content: [{ type: "text" as const, text: JSON.stringify({ saved_path: fullPath }, null, 2) }],
    };
  },
);

server.registerTool(
  "devkit_get_context",
  {
    title: "Get Context",
    description: "Retrieves persisted context from previous session",
    inputSchema: {
      project_path: z.string().optional().describe("Consumer project root path"),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ project_path }) => {
    const base = project_path || KIT_ROOT;
    const fullPath = path.join(base, "docs", "context", "current-focus.md");

    try {
      const content = await fs.promises.readFile(fullPath, "utf-8");
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ content, exists: true }, null, 2) }],
      };
    } catch {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ content: null, exists: false }, null, 2) }],
      };
    }
  },
);

// ============================================================================
// ANALYTICS & SESSION BLOCK
// ============================================================================

server.registerTool(
  "devkit_track_cost",
  {
    title: "Track Cost",
    description: "Tracks and reports estimated cost per session based on skills used and API calls",
    inputSchema: {
      session_id: z.string().optional().describe("Session identifier (defaults to today's date)"),
      skills_used: z.array(z.string()).optional().describe("Array of skill names used in this session"),
      api_calls: z.object({
        fal_ai: z.number().default(0),
        brave_search: z.number().default(0),
        firecrawl: z.number().default(0),
      }).optional().describe("API call counts"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async ({ session_id, skills_used, api_calls }) => {
    const today = new Date().toISOString().slice(0, 10);
    const sid = session_id || today;
    const skills = skills_used || [];
    const calls = api_calls || { fal_ai: 0, brave_search: 0, firecrawl: 0 };

    // Complexity map for token estimation
    const complexSkills = ["09-orchestrator", "29-design-intelligence", "18-repo-auditor", "28-claude-md-generator"];
    const mediumSkills = ["01-po-feature-spec", "02-ui-ux-design", "03-backend-api", "04-frontend", "05-qa-testing", "06-security-review", "11-reviewer"];

    let estimatedTokens = 0;
    for (const skill of skills) {
      if (complexSkills.some((s) => skill.includes(s))) {
        estimatedTokens += 10000;
      } else if (mediumSkills.some((s) => skill.includes(s))) {
        estimatedTokens += 5000;
      } else {
        estimatedTokens += 2000;
      }
    }

    // Cost estimation: tokens * rate + API call costs
    const tokenRate = 0.000003; // ~$3 per 1M tokens (blended input/output)
    const apiRates = { fal_ai: 0.01, brave_search: 0.005, firecrawl: 0.01 };
    const apiCost =
      calls.fal_ai * apiRates.fal_ai +
      calls.brave_search * apiRates.brave_search +
      calls.firecrawl * apiRates.firecrawl;
    const estimatedCost = estimatedTokens * tokenRate + apiCost;

    const report = {
      session_id: sid,
      timestamp: new Date().toISOString(),
      skills_used: skills,
      estimated_tokens: estimatedTokens,
      api_calls: calls,
      estimated_cost_usd: Math.round(estimatedCost * 10000) / 10000,
    };

    // Save report to docs/cost-reports/
    const reportDir = path.join(KIT_ROOT, "docs", "cost-reports");
    const reportPath = path.join(reportDir, `session-${today}.md`);
    const reportMd = [
      `# Cost Report: ${sid}`,
      ``,
      `**Generated:** ${report.timestamp}`,
      ``,
      `## Skills Used`,
      ...(skills.length ? skills.map((s) => `- ${s}`) : ["- (none)"]),
      ``,
      `## Token Estimate`,
      `- Estimated tokens: ${estimatedTokens}`,
      ``,
      `## API Calls`,
      `- fal.ai: ${calls.fal_ai}`,
      `- Brave Search: ${calls.brave_search}`,
      `- Firecrawl: ${calls.firecrawl}`,
      ``,
      `## Cost Estimate`,
      `- **Total: $${report.estimated_cost_usd}**`,
    ].join("\n");

    try {
      await fs.promises.mkdir(reportDir, { recursive: true });
      await fs.promises.writeFile(reportPath, reportMd, "utf-8");
      (report as any).saved_path = reportPath;
    } catch {
      // Non-fatal: report still returned even if save fails
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(report, null, 2) }],
    };
  },
);

server.registerTool(
  "devkit_session_summary",
  {
    title: "Session Summary",
    description: "Generates a session summary for handoff. Reads recent git log, saved context, and pipeline state.",
    inputSchema: {
      project_path: z.string().optional().describe("Path to consumer project"),
      actions_performed: z.array(z.string()).optional().describe("Actions performed in this session"),
      decisions_made: z.array(z.string()).optional().describe("Key decisions made"),
      pending_items: z.array(z.string()).optional().describe("Items still pending"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async ({ project_path, actions_performed, decisions_made, pending_items }) => {
    const base = project_path || KIT_ROOT;
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    const actions = actions_performed || [];
    const decisions = decisions_made || [];
    const pending = pending_items || [];

    // Read recent git log
    let gitLog = "(not available)";
    try {
      const { execSync } = await import("child_process");
      gitLog = execSync("git log --oneline -10", { cwd: base, encoding: "utf-8" }).trim();
    } catch {
      // git not available or not a repo
    }

    // Read existing context
    let existingContext = "";
    try {
      existingContext = await fs.promises.readFile(path.join(base, "docs", "context", "current-focus.md"), "utf-8");
    } catch {
      // No existing context
    }

    // Build summary markdown
    const summary = [
      `# Session Summary: ${today}`,
      ``,
      `**Generated:** ${now}`,
      `**Project:** ${base}`,
      ``,
      `## Actions Performed`,
      ...(actions.length ? actions.map((a) => `- ${a}`) : ["- (none recorded)"]),
      ``,
      `## Decisions Made`,
      ...(decisions.length ? decisions.map((d) => `- ${d}`) : ["- (none recorded)"]),
      ``,
      `## Pending Items`,
      ...(pending.length ? pending.map((p) => `- ${p}`) : ["- (none)"]),
      ``,
      `## Recent Git Activity`,
      "```",
      gitLog,
      "```",
      ``,
      ...(existingContext ? [`## Previous Context`, ``, existingContext] : []),
    ].join("\n");

    // Save session summary
    const contextDir = path.join(base, "docs", "context");
    const summaryPath = path.join(contextDir, `session-${today}.md`);
    try {
      await fs.promises.mkdir(contextDir, { recursive: true });
      await fs.promises.writeFile(summaryPath, summary, "utf-8");
    } catch {
      // Non-fatal
    }

    // Update current-focus.md with latest state
    const focusContent = [
      `# Current Focus`,
      ``,
      `**Updated:** ${now}`,
      `**Last Session:** ${today}`,
      ``,
      ...(pending.length
        ? [`## Pending Items`, ...pending.map((p) => `- ${p}`), ``]
        : []),
      ...(decisions.length
        ? [`## Last Decisions`, ...decisions.map((d) => `- ${d}`), ``]
        : []),
      `## Last Actions`,
      ...(actions.length ? actions.map((a) => `- ${a}`) : ["- (see session summary)"]),
    ].join("\n");

    try {
      await fs.promises.writeFile(path.join(contextDir, "current-focus.md"), focusContent, "utf-8");
    } catch {
      // Non-fatal
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify({ summary, saved_path: summaryPath }, null, 2) }],
    };
  },
);

server.registerTool(
  "devkit_smart_suggestions",
  {
    title: "Smart Suggestions",
    description: "Analyzes project state and suggests next actions based on repo audit, git log, CLAUDE.md, and session context",
    inputSchema: {
      project_path: z.string().optional().describe("Path to consumer project"),
      current_context: z.string().optional().describe("What the user is working on"),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ project_path, current_context }) => {
    const base = resolveConsumerProjectRoot(project_path);
    const suggestions: Array<{
      action: string;
      skill_number: string;
      skill_name: string;
      reason: string;
      priority: "high" | "medium" | "low";
    }> = [];

    // Helper to check if file/dir exists
    const exists = async (p: string) => {
      try { await fs.promises.access(p); return true; } catch { return false; }
    };

    // Check repo audit
    const hasAudit = await exists(path.join(base, "docs", "repo-audit", "current.md"));
    if (!hasAudit) {
      suggestions.push({
        action: "Run Repo Auditor to map the project structure",
        skill_number: "18",
        skill_name: "repo-auditor",
        reason: "No repo audit found. This is the foundation for all other skills.",
        priority: "high",
      });
    }

    // Check CLAUDE.md
    let claudeMdMissing = false;
    try {
      const claudeMd = await fs.promises.readFile(path.join(base, "CLAUDE.md"), "utf-8");
      if (claudeMd.length < 200) {
        claudeMdMissing = true;
      }
    } catch {
      claudeMdMissing = true;
    }
    if (claudeMdMissing) {
      suggestions.push({
        action: "Generate CLAUDE.md with project-specific instructions",
        skill_number: "28",
        skill_name: "claude-md-generator",
        reason: "CLAUDE.md is missing or too generic. A proper CLAUDE.md improves all agent interactions.",
        priority: "high",
      });
    }

    // Check for tests directory
    const testDirs = ["tests", "test", "__tests__", "spec", "e2e"];
    let hasTests = false;
    for (const dir of testDirs) {
      if (await exists(path.join(base, dir))) {
        hasTests = true;
        break;
      }
    }
    if (!hasTests) {
      suggestions.push({
        action: "Create a test strategy and initial test suite",
        skill_number: "05",
        skill_name: "qa-testing",
        reason: "No tests directory found. A test strategy ensures code quality.",
        priority: "medium",
      });
    }

    // Check context for UI-related work
    const ctx = (current_context || "").toLowerCase();
    if (ctx.includes("ui") || ctx.includes("design") || ctx.includes("frontend") || ctx.includes("layout") || ctx.includes("css")) {
      suggestions.push({
        action: "Run Design Intelligence for competitive analysis and design recommendations",
        skill_number: "29",
        skill_name: "design-intelligence",
        reason: "UI improvement context detected. Design Intelligence provides data-driven design decisions.",
        priority: "medium",
      });
    }

    // Check for recent code changes without review
    let hasRecentChanges = false;
    try {
      const { execSync } = await import("child_process");
      const recentLog = execSync("git log --oneline -5 --since='24 hours ago'", { cwd: base, encoding: "utf-8" }).trim();
      if (recentLog.length > 0) {
        hasRecentChanges = true;
      }
    } catch {
      // Not a git repo or git unavailable
    }
    if (hasRecentChanges) {
      suggestions.push({
        action: "Run Security Review and Code Reviewer on recent changes",
        skill_number: "06, 11",
        skill_name: "security-review + reviewer",
        reason: "Recent code changes detected in the last 24h without review.",
        priority: "medium",
      });
    }

    // Default: suggest orchestrator if we have fewer than 3 suggestions
    if (suggestions.length < 3) {
      suggestions.push({
        action: "Run the Orchestrator to plan your next development cycle",
        skill_number: "09",
        skill_name: "orchestrator",
        reason: "The Orchestrator analyzes your project and builds a tailored pipeline of skills.",
        priority: "low",
      });
    }

    // Cap at 5 suggestions
    const finalSuggestions = suggestions.slice(0, 5);

    return {
      content: [{ type: "text" as const, text: JSON.stringify({ suggestions: finalSuggestions, project_path: base, context: current_context || null }, null, 2) }],
    };
  },
);

server.registerTool(
  "devkit_learned_skills",
  {
    title: "Learned Skills",
    description: "List, get, or save project-specific learned skills from .bot/learned-skills/",
    inputSchema: {
      action: z.enum(["list", "get", "save"]).describe("Action to perform"),
      name: z.string().optional().describe("Skill name (required for get/save)"),
      content: z.string().optional().describe("Full markdown content for save action"),
      project_path: z.string().optional().describe("Consumer project root path"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async ({ action, name, content, project_path }) => {
    const base = project_path || process.cwd();
    const learnedDir = path.join(base, ".bot", "learned-skills");

    if (action === "list") {
      try {
        await fs.promises.mkdir(learnedDir, { recursive: true });
        const files = await fs.promises.readdir(learnedDir);
        const skills = await Promise.all(
          files.filter((f: string) => f.endsWith(".md")).map(async (file: string) => {
            const raw = await fs.promises.readFile(path.join(learnedDir, file), "utf-8");
            const nameMatch = raw.match(/^name:\s*(.+)$/m);
            const descMatch = raw.match(/^description:\s*(.+)$/m);
            const triggersMatch = raw.match(/^triggers:\s*\[([^\]]+)\]/m);
            const typeMatch = raw.match(/^type:\s*(.+)$/m);
            return {
              file,
              name: nameMatch?.[1]?.trim() || file.replace(".md", ""),
              description: descMatch?.[1]?.trim() || "",
              triggers: triggersMatch?.[1]?.split(",").map((t: string) => t.replace(/['"]/g, "").trim()) || [],
              type: typeMatch?.[1]?.trim() || "expertise",
            };
          })
        );
        return { content: [{ type: "text" as const, text: JSON.stringify({ skills, directory: learnedDir }, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ skills: [], directory: learnedDir, error: String(err) }, null, 2) }] };
      }
    }

    if (action === "get" && name) {
      const filePath = path.join(learnedDir, `${name}.md`);
      try {
        const raw = await fs.promises.readFile(filePath, "utf-8");
        return { content: [{ type: "text" as const, text: JSON.stringify({ name, content: raw, path: filePath }, null, 2) }] };
      } catch {
        return { content: [{ type: "text" as const, text: JSON.stringify({ name, content: null, path: filePath, exists: false }, null, 2) }] };
      }
    }

    if (action === "save" && name && content) {
      await fs.promises.mkdir(learnedDir, { recursive: true });
      const filePath = path.join(learnedDir, `${name}.md`);
      await fs.promises.writeFile(filePath, content, "utf-8");
      return { content: [{ type: "text" as const, text: JSON.stringify({ saved: true, path: filePath }, null, 2) }] };
    }

    return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Invalid action or missing required parameters" }, null, 2) }] };
  },
);

server.registerTool(
  "devkit_ambiguity_score",
  {
    title: "Ambiguity Score",
    description: "Calculates how ambiguous a task description is and recommends whether to proceed, enrich, or run Deep Interview",
    inputSchema: {
      description: z.string().describe("Task or feature description from the user"),
      is_brownfield: z.boolean().optional().describe("True if this is an existing codebase (adds context_clarity dimension)"),
      mentioned_files: z.array(z.string()).optional().describe("File paths mentioned in the description"),
      constraints: z.array(z.string()).optional().describe("Constraints explicitly mentioned"),
      criteria: z.array(z.string()).optional().describe("Success criteria explicitly mentioned"),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ description, is_brownfield, mentioned_files, constraints, criteria }) => {
    const hasVerb = /add|create|fix|remove|update|refactor|implement|build|change|improve|migrate/i.test(description);
    const hasNoun = description.split(' ').length > 3;
    const hasScope = /in\s+\w+|on\s+\w+|for\s+\w+|when\s+\w+|at\s+\w+/i.test(description);
    const goalScore = ((hasVerb ? 0.4 : 0) + (hasNoun ? 0.3 : 0) + (hasScope ? 0.3 : 0));

    const constraintScore = Math.min(1, (constraints?.length || 0) * 0.4 + (description.match(/max|min|must|cannot|without|no more than|at least/gi)?.length || 0) * 0.2);
    const criteriaScore = Math.min(1, (criteria?.length || 0) * 0.5 + (description.match(/when|then|should|must|expect|verify|returns?|loads? in/gi)?.length || 0) * 0.2);

    let score: number;
    const dimensions: Record<string, number> = {
      goal: Math.round(goalScore * 100) / 100,
      constraints: Math.round(constraintScore * 100) / 100,
      criteria: Math.round(criteriaScore * 100) / 100,
    };

    if (is_brownfield) {
      const contextScore = Math.min(1, (mentioned_files?.length || 0) * 0.5 + (description.match(/\b\w+\.(ts|js|py|go|rs|md)\b/g)?.length || 0) * 0.3);
      dimensions.context_clarity = Math.round(contextScore * 100) / 100;
      score = 1 - (goalScore * 0.30 + constraintScore * 0.25 + criteriaScore * 0.25 + contextScore * 0.20);
    } else {
      score = 1 - (goalScore * 0.40 + constraintScore * 0.30 + criteriaScore * 0.30);
    }

    score = Math.max(0, Math.min(1, Math.round(score * 100) / 100));
    const action = score < 0.40 ? "proceed" : score < 0.70 ? "warn" : "block";

    const suggestedQuestions: string[] = [];
    if (dimensions.goal < 0.5) suggestedQuestions.push("O que exatamente precisa ser feito? (acao + objeto + contexto)");
    if (dimensions.constraints < 0.3) suggestedQuestions.push("Ha restricoes tecnicas ou de negocio? (performance, compatibilidade, prazo)");
    if (dimensions.criteria < 0.3) suggestedQuestions.push("Como saberemos que esta pronto? (criterio verificavel)");
    if (is_brownfield && (dimensions.context_clarity || 0) < 0.3) suggestedQuestions.push("Quais arquivos ou componentes serao afetados?");

    return {
      content: [{ type: "text" as const, text: JSON.stringify({ score, dimensions, action, suggested_questions: suggestedQuestions }, null, 2) }],
    };
  },
);

server.registerTool(
  "devkit_suggest_trailers",
  {
    title: "Suggest Commit Trailers",
    description: "Analyzes a diff summary and decisions to suggest relevant git commit trailers",
    inputSchema: {
      diff_summary: z.string().describe("Short description of what changed in the diff"),
      decisions: z.array(z.string()).optional().describe("Design decisions made during implementation"),
      rejected_alternatives: z.array(z.string()).optional().describe("Alternatives considered and rejected (format: 'alternative | reason')"),
      constraints: z.array(z.string()).optional().describe("External constraints that limited the solution"),
      not_tested: z.array(z.string()).optional().describe("Scenarios not covered by tests and why"),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ diff_summary, decisions, rejected_alternatives, constraints, not_tested }) => {
    const trailers: Array<{ type: string; value: string }> = [];

    if (constraints && constraints.length > 0) {
      constraints.forEach(c => trailers.push({ type: "Constraint", value: c }));
    }
    if (rejected_alternatives && rejected_alternatives.length > 0) {
      rejected_alternatives.forEach(r => trailers.push({ type: "Rejected", value: r }));
    }
    if (decisions && decisions.length > 0) {
      decisions.forEach(d => trailers.push({ type: "Directive", value: d }));
    }
    if (not_tested && not_tested.length > 0) {
      not_tested.forEach(n => trailers.push({ type: "Not-tested", value: n }));
    }

    const trailerLines = trailers.map(t => `${t.type}: ${t.value}`).join('\n');
    const commitMessage = trailers.length > 0
      ? `${diff_summary}\n\n${trailerLines}`
      : diff_summary;

    return {
      content: [{ type: "text" as const, text: JSON.stringify({ trailers, commit_message: commitMessage }, null, 2) }],
    };
  },
);

server.registerTool(
  "devkit_context_guard",
  {
    title: "Context Guard",
    description: "Checks context usage and advises whether to compact before stopping. Call before ending long sessions.",
    inputSchema: {
      input_tokens: z.number().describe("Current input token count"),
      context_window: z.number().describe("Model context window size"),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ input_tokens, context_window }) => {
    const usage = input_tokens / context_window;
    const usagePercent = Math.round(usage * 100);
    const should_compact = usage > 0.60;
    const should_block_stop = usage > 0.75;

    let message = `Context usage: ${usagePercent}%.`;
    if (should_block_stop) {
      message += ` HIGH — run /compact before stopping to preserve session state.`;
    } else if (should_compact) {
      message += ` WARN — consider running /compact soon.`;
    } else {
      message += ` OK — safe to continue or stop.`;
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        usage_percent: usagePercent,
        should_compact,
        should_block_stop,
        message,
      }, null, 2) }],
    };
  },
);

// ============================================================================
// START SERVER
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Dev Team Kit MCP server running on stdio");
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
