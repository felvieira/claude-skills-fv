export interface SkillMeta {
  id: string;
  name: string;
  description: string;
  argumentHint?: string;
  allowedTools?: string;
  triggers: string[];
  // ─── Manifest v2 (absorbed from bytedance/deer-flow) ───────────────────────
  // All optional. Skills without these fields stay valid (backward compat).
  // See policies/skill-manifest.md for the contract.
  version?: string;       // semver, e.g. "1.0.0"
  author?: string;        // free-form, e.g. "felvieira" or "ByteDance"
  compatibility?: string; // semver range of kit versions, e.g. ">=2.10.0"
  requires?: string[];    // other skill ids this one depends on, e.g. ["01-po-feature-spec"]
}

export interface PipelineStep {
  step: number;
  skillId: string;
  skillName: string;
  purpose: string;
}

export interface Pipeline {
  type: string;
  pipeline: PipelineStep[];
  policies: string[];
  templates: string[];
}

export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

export interface ImageResult {
  src: string;
  alt: string;
  localPath: string;
}

export interface Artifact {
  content: string;
  path: string;
  exists: boolean;
}
