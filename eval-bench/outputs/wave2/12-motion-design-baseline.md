---
scenario: 12-motion-design
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 80
tokens_out_approx: 420
time_seconds: 18
quality_score: 2.8
quality_breakdown:
  specificity: 2
  completeness: 3
  correctness: 4
  actionability: 3
  discipline: 3
pass_fail: baseline
delta_vs_baseline: n/a
notes: "generic CSS + Framer Motion snippets, no choreography rationale, no timing system, no reduced-motion depth, misses orchestration between elements"
---

# Pass A — Baseline (sem skill)

**Input:** "Landing page React, hero estático sem vida, queremos animação sutil que destaque o CTA mas não distraia. Como faço?"

---

Para adicionar animação sutil ao hero sem distrair, use CSS transitions/animations ou Framer Motion.

**Opção 1 — CSS puro (mais leve):**

```css
/* Fade-in no hero ao carregar */
.hero {
  animation: fadeInUp 0.8s ease-out;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Pulse sutil no CTA */
.cta-button {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(var(--primary), 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(var(--primary), 0); }
}
```

**Opção 2 — Framer Motion:**

```jsx
import { motion } from 'framer-motion';

export function Hero() {
  return (
    <section>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        Título
      </motion.h1>

      <motion.button
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
      >
        Call to Action
      </motion.button>
    </section>
  );
}
```

**Recomendações:**
- Use `duration` entre 0.3s–0.8s para não parecer lerdo
- Adicione `prefers-reduced-motion` para acessibilidade
- O CTA deve ter `delay` levemente maior que o título para criar hierarquia visual
