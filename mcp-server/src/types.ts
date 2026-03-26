export interface SkillMeta {
  id: string;
  name: string;
  description: string;
  argumentHint?: string;
  allowedTools?: string;
  triggers: string[];
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
