# Mastery Grove

A 3D forest where every tree is a question from a teacher's worksheet. When a kid gets one wrong, a Gemini tutor guesses how they were thinking, checks that guess with them, and remembers it for next time. The teacher gets a short list of what to reteach.

Built at the Berkeley x DeepMind hackathon on 27 September 2026 by Afshal Gulam, Roshan Premil and Sophie Cloué. It grew out of Mastery Grove v1, which placed 5th at the Stanford AI + Education Hackathon.

- Hackathon build (Google AI Studio): https://mastery-grove.ai.studio
- 1-minute demo: https://youtu.be/QZ_cm19n5ks
- 2-minute pitch: https://youtu.be/vF0fdhmE72o

The hackathon build is tagged `v1.0-hackathon`. Version 2 is on `main`, tagged `v2.0`. The AI Studio link above still runs the hackathon build.

## What version 2 adds

- **Walk onto an answer.** Answer stones rise in front of each tree; the fox asks how sure you are first, and a line after each answer compares how sure you were with how it went.
- **Byte comes over.** After a wrong answer, Professor Byte (Gemini) glides up to the tree, guesses the thinking behind that exact wrong answer, and checks the guess with the kid.
- **Bridges built by learning.** A stream runs between groves. Every tree grown lays a plank on the bridge to the next one. Missions say what's next, and Byte's beam points at it.
- **Mia, who needs it explained.** A classmate in each grove is stuck on the grove's mix-up. The kid explains it by typing or talking; Gemini marks it against a rubric and plain code decides whether Mia gets it.
- **Memory checks.** Trees you grew come back in later sessions (Leitner boxes), with the answers hidden until you have one in mind. Finishing a grove asks how well you know it now.
- **Hands-on fractions.** Serve 2/3 of a 3D cake, or lay 3/4 of a bridge's planks. A wrong serve names the exact mistake.
- **Class rooms.** A teacher opens a room and reads out a code; students join on their own devices, see each other in the forest, and show up on the teacher's roster live. Quests and new sessions go to the whole class.
- **Reading worlds.** Reading topics grow an autumn forest with short passages to read and reading mix-ups.
- **The teacher view.** A class map of mix-ups, what each student said in their own words, a lesson plan per student, what to reteach tomorrow, and focus quests sent into the forest.
- **A storybook look, on any screen.** Paper-and-ink cards, a painted sky, and a phone layout with bottom sheets and a walking pad.

How it fits together, and every rule the game runs on, is in [docs/architecture.md](docs/architecture.md).

## Run it locally

You need Node 20+ (or Bun) and a Gemini API key.

```bash
bun install                 # or: npm install
cp .env.example .env        # then set GEMINI_API_KEY in .env
bun run dev                 # http://localhost:3000
bun run dev:mock            # no key needed: Gemini is replaced by fixed replies
```

## Tests

```bash
bun run test                # Vitest: the game's rules, the server, class rooms
bun run test:e2e            # Playwright, desktop and phone, against the mock Gemini
```

## The feature tour video

`bun run tour` plays through every feature against the real Gemini and records it (it needs the key), and `python3 tour/assemble.py` cuts the clips into `tour-out/mastery-grove-tour.mp4` (needs ffmpeg).
