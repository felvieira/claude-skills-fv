# {{GITHUB_USER}}'s blog

Auto-generated technical posts via Dev Team Kit skill 41 (blog-publisher).

🌐 **Live:** https://{{GITHUB_USER}}.github.io/{{BLOG_REPO}}/

## How it works

I send text or a topic to Claude → skill 41 writes an original authorial post → generates HTML + images (via skill 17 fal.ai or skill 42 Playwright) → adds a LinkedIn share block → commits/pushes here → publishes via GitHub Pages → returns the URL.

## Setup (fork / reuse this)

This blog is scaffolded by the Dev Team Kit. To run your own, don't clone this repo —
run the kit's init script pointing at YOUR GitHub account:

```bash
node /path/to/claude-skills-fv/scripts/init-blog-repo.mjs \
  --path=/where/you/want/the/blog \
  --user=YOUR_GITHUB_USERNAME \
  --repo=blog \
  --create-github
```

It creates the repo, enables Pages, and writes `~/.dev-team-kit/blog-config.json` so skill 41
publishes to YOUR blog — never anyone else's. Needs `gh` authenticated and `FAL_AI_API_KEY` set
for images. Full guide: `docs/skill-guides/blog-publisher.md` in the kit.

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
