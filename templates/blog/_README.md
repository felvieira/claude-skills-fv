# {{GITHUB_USER}}'s blog

Auto-generated technical posts via Dev Team Kit skill 41 (blog-publisher).

🌐 **Live:** https://{{GITHUB_USER}}.github.io/{{BLOG_REPO}}/

## How it works

I send text or a topic to Claude → skill 41 generates HTML + images (via skill 17 fal.ai or skill 42 Playwright) → commits/pushes here → publishes via GitHub Pages → returns the URL.

## Posts

<!-- BLOG_INDEX_START -->
<!-- BLOG_INDEX_END -->

## Structure

```
{{BLOG_REPO}}/
├── index.html              ← landing page with post list (auto-updated)
├── posts/
│   └── YYYY-MM-DD-slug.html
├── assets/
│   ├── css/
│   │   └── post.css        ← shared dark mode style
│   └── images/             ← per-post images
└── _config.yml             ← optional Pages config
```

## Tech

- Static HTML (no build step)
- Dark mode CSS
- Images: fal.ai (gemini-25-flash default) or Playwright screenshots
- GitHub Pages on `main` branch root path
- License: CC-BY-4.0 (text) + Apache-2.0 (code snippets)

## Repo

`https://github.com/{{GITHUB_USER}}/{{BLOG_REPO}}` — scaffolded by `init-blog-repo.mjs` from Dev Team Kit.
