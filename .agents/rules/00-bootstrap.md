---
trigger: always_on
---

# Session Bootstrap
- At the start of every new session, read the active local rules in `.agents/rules/` first.
- If a task matches a skill in `.agents/skills/`, load that skill before editing.
- Treat the local rules as the highest-priority project instructions.
- Keep responses and user-facing artifacts in Korean unless the user asks otherwise.
