# v2 upgrade plan

Steps run one at a time. Each step:
1. Branch off `development`.
2. Write the failing tests first, then make them pass, then tidy up.
3. Run `tsc`, Vitest and Playwright.
4. Watch it play in a visible browser.
5. Merge into `development`, push, and report back.

Nothing touches the live hackathon app until after the finals.

Status (28 Sep 2026): all steps are done. Version 2 is merged into `main` and tagged `v2.0`. Publishing v2 in AI Studio was dropped after the finals, so mastery-grove.ai.studio still runs the hackathon build.

New libraries: **Socket.IO** and **Vitest + Playwright** (both confirmed), and **Zod** for checking Gemini's JSON. Zod is proposed; v1 used it. Voice uses the browser's own MediaRecorder, so it adds no library.

| # | Branch | What changes | Done when |
|---|---|---|---|
| 0 | `chore/test-tooling` | Vitest, Playwright (desktop + iPhone), mock Gemini (`GEMINI_MOCK=1`), `?debug=1` hook, package name, favicon | `bun run test` and `bun run test:e2e` pass on the current game |
| 1 | `fix/forest-layout` | `src/game/layout.ts`: golden-angle groves, signs at the entrances, clearance search for new trees, a path and bounds that grow with the number of groves | The layout invariants (see architecture.md) pass for 1–12 groves; no tree touches a sign in screenshots |
| 2 | `fix/render-glitches` | Bugs from the code audit: sign clipping, label overlap, whole-store re-renders, shadow acne, per-frame allocations | No visual glitches in a desktop or phone walkthrough; frame rate holds on a phone |
| 2b | `fix/learner-loop` | Learner-model bugs from the code audit: the rundown ignored the class data it was sent, some state wasn't saved, answered trees could be reopened and would lock groves again, and a missed tree came straight back as Byte's pick. Also: "grove complete" meant four different things, a wrong serve blamed the wrong misconception, and there were races between diagnoses and between world loads | Unit tests for each rule; the teacher rundown names the students who actually got it wrong |
| 3 | `feature/storybook-look` | Paper-and-ink UI, Nunito, chunky buttons, painted signboards, soft light, sky, instanced background forest, shorter kid copy | Side-by-side screenshots against v1.0 read as designed, not generated |
| 4 | `feature/stones-and-fox` | Walk onto answer stones (tap on phones) with a question card that doesn't block the game. The fox asks how sure you are. Calibration line after each answer. Diagnosis receives confidence | End-to-end test answers by standing on a stone; calibration tests pass |
| 5 | `feature/byte-npc` | Byte walks up beside the tree after a miss and asks the question back, in a portrait dialog | Byte appears and never blocks the camera |
| 6 | `feature/leitner-memory` | Leitner cards, spacing rule, grove health, unlock at 0.6, Memory Quest next session, from-memory trees, reflection with feedback | Leitner, spacing, unlock and reflection tests pass; a test plays session 2 and meets the Memory Quest |
| 7 | `feature/mia-teach-back` | Teach spots in the world, Mia in each grove, explain by typing or talking, rubric marked by Gemini, pass decided in code | Mock and live teach-backs both pass and fail correctly |
| 8 | `feature/bridges-missions` | Bridges whose planks fill as you learn and block you while locked; mission panel; beacon follows the next objective | A locked bridge can't be crossed; mission tests pass |
| 9 | `feature/cake-challenge` | Serve-the-cake and build-the-bridge hands-on fraction challenges | Wrong serves name the exact mistake |
| 10 | `feature/multiplayer-rooms` | Socket.IO rooms with codes, a join screen, live classmates, sample classmates, a live teacher roster, deploy quest and next session sent to the room | Two browsers in one room see each other move; the teacher's deploy reaches both |
| 11 | `feature/reading-world` | Reading skin (warm autumn) and reading questions with passage cards | A reading world grows, looks different and plays through |
| 12 | `chore/release-v2` | Full end-to-end run with video, a feature-tour video, README; merge to `main`; link AI Studio and publish (after the finals, together) | mastery-grove.ai.studio runs v2 |
