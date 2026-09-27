# Mastery Grove

A 3D forest where every tree is a question from a teacher's worksheet. When a kid gets one wrong, a Gemini tutor guesses how they were thinking, checks that guess with them, and remembers it for next time. The teacher gets a short list of what to reteach.

Built at the Berkeley x DeepMind hackathon on 27 September 2026 by Afshal Gulam, Roshan Premil and Sophie Cloué. It grew out of Mastery Grove v1, which placed 5th at the Stanford AI + Education Hackathon.

- Hackathon build: https://mastery-grove.ai.studio
- 1-minute demo: https://youtu.be/QZ_cm19n5ks
- 2-minute pitch: https://youtu.be/vF0fdhmE72o

## Run it locally

You need Node 20+ (or Bun) and a Gemini API key.

```bash
bun install                 # or: npm install
cp .env.example .env        # then set GEMINI_API_KEY in .env
bun run dev                 # http://localhost:3000
```
