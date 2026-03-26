import matter from "gray-matter";

export interface SkillFrontmatter {
  name: string;
  description: string;
  argumentHint?: string;
  allowedTools?: string;
}

export function parseSkill(content: string): {
  frontmatter: SkillFrontmatter;
  body: string;
} {
  const { data, content: body } = matter(content);
  return {
    frontmatter: {
      name: data.name || "",
      description: (data.description || "").trim(),
      argumentHint: data["argument-hint"],
      allowedTools: data["allowed-tools"],
    },
    body: body.trim(),
  };
}
