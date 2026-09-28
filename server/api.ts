import express from 'express';
import { Type } from '@google/genai';
import type { GeminiClient } from './gemini';
import { buildCompactList, buildPlainCodeRundown } from './rundown';
import { CannotListenError, gradeTeachBack, parseTeachBackInput } from './teachBack';

const NO_KEY = 'GEMINI_API_KEY is not configured on the server. Add it in the Secrets panel (AI Studio) or in .env (local).';

/**
 * Every Gemini-backed route. Each route builds its prompt and schema; `gemini` makes the call
 * (the real client, or the deterministic mock in tests). With no client, routes answer 500,
 * except the rundown, which falls back to a plain-code report.
 */
export function createApiRouter(gemini: GeminiClient | null) {
  const router = express.Router();
  // 1. Generate World Endpoint
  router.post('/generate-world', async (req, res) => {
    try {
      if (!gemini) return res.status(500).json({ error: NO_KEY });

      const { topic, text, fileData } = req.body;
      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

      let promptIntro = `You are an expert curriculum designer and pedagogist creating a 3D learning world game called "Mastery Grove".
Generate a complete, high-quality World Data JSON according to these strict rules:

WORLD SPECIFICATION:
1. Concepts: Exactly 3 or 4 concepts forming a prerequisite chain.
   - The first concept must have empty prerequisites: [].
   - Subsequent concepts depend on earlier ones (e.g. concept 2 needs concept 1; concept 3 needs concept 1 and 2).
   - "questName" MUST be an exciting, kid-friendly adventure title a 10-year-old would love to explore (e.g. "The Simplest Spring", "The Fraction Bridge", "The Decimal Den", "The Geometric Gorge").
2. Misconceptions: Exactly 6 to 8 misconceptions across the concepts.
   - They MUST be specific, diagnostic, and actionable (e.g. "compares fractions by numerator alone, so thinks 5/8 > 3/4" or "multiplies only numerator when scaling").
   - NEVER be vague like "struggles with fractions".
3. Trees (Questions): Exactly 3 or 4 multiple-choice questions per concept (total 9 to 16 trees).
   - Each question has 4 distinct choices (or for a 'serve' question, choices can be empty).
   - The correct choice is pointed to by "answerIndex" (0, 1, 2, or 3, or slice count for 'serve').
   - CRITICAL: Each of the 3 wrong choices MUST directly correspond to one of the listed misconceptions for that concept.
   - "explanation" MUST provide conceptual reasoning of at most 20 words.
4. Visuals & Hands-on Serve Questions:
   - For maths topics (fractions, ratio, parts of a whole), add a visual to every question where one helps!
     Visual types:
     * { "kind": "cake", "parts": number, "shaded": number }
     * { "kind": "two-cakes", "left": { "parts": number, "shaded": number }, "right": { "parts": number, "shaded": number } }
     * { "kind": "bar", "parts": number, "shaded": number }
     Example: "Which is larger: 3/4 or 5/8?" gets two-cakes: 4 parts with 3 shaded, next to 8 parts with 5 shaded.
   - For fraction topics, include exactly one hands-on "serve" tree in each concept/grove:
     * kind: "serve"
     * question: e.g. "Serve 2/3 of the cake."
     * serveConfig: { "targetNumerator": 2, "targetDenominator": 3, "totalSlices": 6 } (where totalSlices is a multiple of targetDenominator)
     * visual: { "kind": "cake", "parts": 6, "shaded": 4 }
     * choices: []
     * answerIndex: 4
   - In the grove about comparing (or any grove), the hands-on tree may be a bridge instead of a cake: set serveConfig.whole to "bridge", use a "bar" visual, and ask it as laying planks (e.g. "Lay 3/4 of the planks on the bridge." with 8 planks).
5. Reading and English topics (reading comprehension, stories, vocabulary): give every tree a short original passage to read first, as "passage": { "title": "...", "text": "..." } of 30 to 90 words, and ask about it (the main idea, what the clues suggest, what a word means in its sentence, what happens first). No visuals and no serve trees. Each wrong choice must still match one of the concept's misconceptions (e.g. "picks a detail instead of the main idea", "only trusts what the text says word for word").
6. Citations:
   - If worksheet text or an uploaded worksheet file is provided, every question MUST be derived from or directly present in that worksheet, and "citation" must include { "page": <page number (1-indexed)>, "quote": "<exact line or phrase from worksheet>" }.
   - If only a topic was provided without worksheet text or file, set "citation" to null.
7. Teach spots: exactly one per concept. Mia, a classmate, sits in that concept's grove, stuck on ONE of its misconceptions, and the student explains it to her.
   - "conceptId": the concept. "misconceptionId": the misconception Mia has, from your list for that concept.
   - "puzzledThought": what Mia says, at most 25 words, in a 10-year-old's voice: her wrong working and her question (e.g. "To simplify 4/8, I halved the top and got 2/8. My teacher marked it wrong. Why?").
   - "board": her wrong working in at most 18 characters, for the slate she holds up (e.g. "4/8 = 2/8 ?").
   - "rubricPoints": exactly 3 points a good explanation to Mia covers, each at most 15 plain kid words: why her way is wrong, the right way, and the right answer.
`;

      if (topic) promptIntro += `\nTOPIC: "${topic}"\n`;
      if (text) promptIntro += `\nPASTED WORKSHEET CONTENT:\n"""\n${text}\n"""\n`;

      parts.push({ text: promptIntro });

      if (fileData && fileData.base64 && fileData.mimeType) {
        parts.push({
          inlineData: {
            mimeType: fileData.mimeType,
            data: fileData.base64,
          },
        });
        parts.push({
          text: 'Extract and analyze the worksheet from the uploaded file above. Make sure questions directly test the content of this worksheet.',
        });
      }

      const data = await gemini.generateJson({
        endpointName: 'generate-world',
        input: req.body,
        contents: { parts },
        config: {
          systemInstruction:
            'You are Mastery Grove’s World Architect. You output only valid JSON strictly matching the provided schema.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subject: {
                type: Type.STRING,
                description: 'The title of this learning world (e.g. "Primary 5 Mathematics — Fractions")',
              },
              concepts: {
                type: Type.ARRAY,
                description: '3 to 4 sequential concepts forming a learning path',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    questName: { type: Type.STRING },
                    prerequisites: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: ['id', 'name', 'questName', 'prerequisites'],
                },
              },
              misconceptions: {
                type: Type.ARRAY,
                description: '6 to 8 specific diagnostic misconceptions',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    conceptId: { type: Type.STRING },
                    label: { type: Type.STRING },
                  },
                  required: ['id', 'conceptId', 'label'],
                },
              },
              trees: {
                type: Type.ARRAY,
                description: '3 or 4 questions per concept',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    conceptId: { type: Type.STRING },
                    question: { type: Type.STRING },
                    choices: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    answerIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING },
                    kind: {
                      type: Type.STRING,
                      description: "Tree question kind: 'mcq' or 'serve'",
                    },
                    visual: {
                      type: Type.OBJECT,
                      description: 'Optional visual representation of fraction (cake, two-cakes, or bar)',
                      properties: {
                        kind: { type: Type.STRING, description: "'cake', 'two-cakes', or 'bar'" },
                        parts: { type: Type.INTEGER },
                        shaded: { type: Type.INTEGER },
                        left: {
                          type: Type.OBJECT,
                          properties: {
                            parts: { type: Type.INTEGER },
                            shaded: { type: Type.INTEGER },
                          },
                        },
                        right: {
                          type: Type.OBJECT,
                          properties: {
                            parts: { type: Type.INTEGER },
                            shaded: { type: Type.INTEGER },
                          },
                        },
                      },
                    },
                    serveConfig: {
                      type: Type.OBJECT,
                      description: 'Configuration for hands-on cake serving questions',
                      properties: {
                        targetNumerator: { type: Type.INTEGER },
                        targetDenominator: { type: Type.INTEGER },
                        totalSlices: { type: Type.INTEGER },
                        whole: { type: Type.STRING, description: "'cake' (default) or 'bridge'" },
                      },
                    },
                    passage: {
                      type: Type.OBJECT,
                      description: 'Reading topics only: a short original passage to read before the question',
                      properties: {
                        title: { type: Type.STRING },
                        text: { type: Type.STRING, description: '30 to 90 words' },
                      },
                    },
                    citation: {
                      type: Type.OBJECT,
                      nullable: true,
                      properties: {
                        page: { type: Type.INTEGER },
                        quote: { type: Type.STRING },
                      },
                    },
                  },
                  required: ['id', 'conceptId', 'question', 'choices', 'answerIndex', 'explanation'],
                },
              },
              teachSpots: {
                type: Type.ARRAY,
                description: 'One per concept: Mia and the mix-up she needs explained',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    conceptId: { type: Type.STRING },
                    misconceptionId: { type: Type.STRING },
                    puzzledThought: { type: Type.STRING, description: 'At most 25 words, in a 10-year-old voice' },
                    board: { type: Type.STRING, description: 'Her wrong working, at most 18 characters' },
                    rubricPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Exactly 3 short points' },
                  },
                  required: ['conceptId', 'misconceptionId', 'puzzledThought', 'board', 'rubricPoints'],
                },
              },
            },
            required: ['subject', 'concepts', 'misconceptions', 'trees', 'teachSpots'],
          },
        },
      });

      return res.json(data);
    } catch (error: any) {
      console.error('Error generating world:', error);
      return res.status(500).json({
        error: error?.message || 'Failed to generate world from Gemini.',
      });
    }
  });

  // 2. Predict Trees Endpoint (Tutor World Model)
  router.post('/predict-trees', async (req, res) => {
    try {
      if (!gemini) return res.status(500).json({ error: NO_KEY });

      const { misconceptions, openTrees, recentAttempts, memory } = req.body;
      if (!openTrees || !Array.isArray(openTrees) || openTrees.length === 0) {
        return res.json({ predictions: [] });
      }

      const prompt = `You are Professor Byte's cognitive world model in "Mastery Grove".
Predict how this specific student will perform on each open question, anticipating potential misconceptions before they happen.

KNOWN MISCONCEPTIONS IN WORLD:
${JSON.stringify(misconceptions, null, 2)}

STUDENT RECENT ATTEMPTS & MEMORY:
${JSON.stringify({ recentAttempts, memory }, null, 2)}

OPEN QUESTION TREES:
${JSON.stringify(
  openTrees.map((t: any) => ({
    treeId: t.id,
    question: t.question,
    choices: t.choices,
    answerIndex: t.answerIndex,
  })),
  null,
  2
)}

Return for EACH tree: pCorrect (0.0-1.0), predictedChoice (0-3), misconceptionId (id or null if correct), and why (at most 8 words).`;

      const data = await gemini.generateJson({
        endpointName: 'predict-trees',
        input: req.body,
        contents: prompt,
        config: {
          systemInstruction: 'You are Professor Byte’s cognitive student model. Output valid JSON strictly conforming to the schema.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              predictions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    treeId: { type: Type.STRING },
                    pCorrect: { type: Type.NUMBER },
                    predictedChoice: { type: Type.INTEGER },
                    misconceptionId: { type: Type.STRING, nullable: true },
                    why: { type: Type.STRING, description: 'At most 8 words' },
                  },
                  required: ['treeId', 'pCorrect', 'predictedChoice', 'why'],
                },
              },
            },
            required: ['predictions'],
          },
        },
      });

      return res.json(data);
    } catch (error: any) {
      console.error('Error predicting trees:', error);
      return res.status(500).json({ error: error?.message || 'Failed to predict trees.' });
    }
  });

  // 3. Thought-Process Diagnosis Endpoint
  router.post('/diagnose-thought-process', async (req, res) => {
    try {
      if (!gemini) return res.status(500).json({ error: NO_KEY });

      const { question, studentChoice, correctAnswer, confidence, misconceptions, memory } = req.body;

      const prompt = `You are Professor Byte, a compassionate, insightful robot tutor in "Mastery Grove".
A student answered incorrectly. Your job is to uncover HOW the student was thinking and produce a gentle scaffolding question.

QUESTION DETAILS:
- Question: "${question}"
- Student chose: "${studentChoice}"
- Correct answer: "${correctAnswer}"
- Confidence: "${confidence}" (values: "Not sure", "Fairly sure", "Very sure")

KNOWN MISCONCEPTIONS:
${JSON.stringify(misconceptions, null, 2)}

STUDENT'S PAST MEMORY (Previous mistakes & confirmed thought patterns):
${JSON.stringify(memory || [], null, 2)}

INSTRUCTIONS:
1. Work out the most likely thought process behind that EXACT wrong choice.
2. "thoughtProcess": MUST be at most 15 words in second person directly to the student (e.g. "You compared top numbers without checking slice sizes.").
3. "misconceptionId": ID of the matching misconception or "unclassified" if confidence < 0.5.
4. "confidence": Number between 0.0 and 1.0.
5. "scaffoldHint": EXACTLY ONE friendly nudging question of at most 15 words. NEVER the answer.
`;

      const data = await gemini.generateJson({
        endpointName: 'diagnose-thought-process',
        input: req.body,
        contents: prompt,
        config: {
          systemInstruction: 'You are Professor Byte. Output valid JSON strictly conforming to the schema. Keep lines concise (<= 15 words).',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              misconceptionId: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              thoughtProcess: { type: Type.STRING, description: 'At most 15 words in second person' },
              scaffoldHint: { type: Type.STRING, description: 'One nudging question of at most 15 words' },
            },
            required: ['misconceptionId', 'confidence', 'thoughtProcess', 'scaffoldHint'],
          },
        },
      });

      return res.json(data);
    } catch (error: any) {
      console.error('Error diagnosing thought process:', error);
      return res.status(500).json({ error: error?.message || 'Failed to diagnose thought process.' });
    }
  });

  // 4. Revise Diagnosis Endpoint (when student clicked "Not quite" and explained)
  router.post('/revise-thought-process', async (req, res) => {
    try {
      if (!gemini) return res.status(500).json({ error: NO_KEY });

      const { question, studentChoice, correctAnswer, studentWords, misconceptions, initialThoughtProcess } = req.body;

      const prompt = `You are Professor Byte in "Mastery Grove".
The student answered "${studentChoice}" to question "${question}" (correct: "${correctAnswer}").
You initially guessed their thought process was: "${initialThoughtProcess}".
The student responded: "Not quite. Here is how I thought about it: ${studentWords}".

Based on the student's own words:
1. Re-analyze which misconception from the list best matches what they actually did:
${JSON.stringify(misconceptions, null, 2)}
2. Write a revised "thoughtProcess" of at most 15 words in second person acknowledging their explanation.
3. Write a revised "scaffoldHint" of at most 15 words with ONE guiding question.
`;

      const data = await gemini.generateJson({
        endpointName: 'revise-thought-process',
        input: req.body,
        contents: prompt,
        config: {
          systemInstruction: 'You are Professor Byte. Output valid JSON strictly conforming to the schema. Keep lines <= 15 words.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              misconceptionId: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              thoughtProcess: { type: Type.STRING, description: 'At most 15 words' },
              scaffoldHint: { type: Type.STRING, description: 'At most 15 words' },
            },
            required: ['misconceptionId', 'confidence', 'thoughtProcess', 'scaffoldHint'],
          },
        },
      });

      return res.json(data);
    } catch (error: any) {
      console.error('Error revising thought process:', error);
      return res.status(500).json({ error: error?.message || 'Failed to revise thought process.' });
    }
  });

  // 4b. Generate Targeted Sapling Variant Endpoint
  router.post('/generate-targeted-sapling', async (req, res) => {
    try {
      if (!gemini) return res.status(500).json({ error: NO_KEY });

      const { originalQuestion, originalChoices, thoughtProcess, misconception, worldSubject } = req.body;

      const prompt = `You are Professor Byte in "Mastery Grove".
A student answered incorrectly due to this diagnosed thought process:
- Diagnosed Thought Process: "${thoughtProcess}"
- Misconception: ${misconception?.label || 'General misconception'}
- Subject: ${worldSubject || 'Mathematics'}
- Original Question: "${originalQuestion}"

CRITICAL INSTRUCTION:
Generate a targeted variant question for a review sapling that directly targets this confirmed or suspected thought process, with numbers changed and a slight twist, to test whether the student has shifted their mental model.
1. The question must test the same underlying concept but with changed values or a slight contextual twist.
2. Provide exactly 4 choices.
3. One choice MUST be the trap answer that would be picked if the student still holds this misconception!
4. "answerIndex" (0, 1, 2, or 3) points to the single correct choice.
5. "explanation" gives the conceptual reasoning showing why the correct choice works and why the trap fails.
6. If the question is about fractions, include a "visual" ({ kind: 'cake'|'two-cakes'|'bar', parts, shaded }) whenever it helps visualize the concept.`;

      const data = await gemini.generateJson({
        endpointName: 'generate-targeted-sapling',
        input: req.body,
        contents: prompt,
        config: {
          systemInstruction: 'Generate targeted sapling question variant. Output valid JSON strictly matching schema.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              choices: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              answerIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
              visual: {
                type: Type.OBJECT,
                properties: {
                  kind: { type: Type.STRING },
                  parts: { type: Type.INTEGER },
                  shaded: { type: Type.INTEGER },
                  left: {
                    type: Type.OBJECT,
                    properties: {
                      parts: { type: Type.INTEGER },
                      shaded: { type: Type.INTEGER },
                    },
                  },
                  right: {
                    type: Type.OBJECT,
                    properties: {
                      parts: { type: Type.INTEGER },
                      shaded: { type: Type.INTEGER },
                    },
                  },
                },
              },
            },
            required: ['question', 'choices', 'answerIndex', 'explanation'],
          },
        },
      });

      return res.json(data);
    } catch (error: any) {
      console.error('Error generating targeted sapling:', error);
      return res.status(500).json({ error: error?.message || 'Failed to generate targeted sapling.' });
    }
  });

  // 4c. Generate Retention Check Question (Memory Sprout)
  router.post('/generate-retention-check', async (req, res) => {
    try {
      if (!gemini) return res.status(500).json({ error: NO_KEY });

      const { conceptName, misconception, worldSubject } = req.body;

      const prompt = `You are Professor Byte cultivating a "Memory Sprout" retention check in "Mastery Grove".
A student previously completed the grove "${conceptName}" in "${worldSubject}".
This retention check tests if they have permanently overcome the past misconception:
- Past Misconception: "${misconception?.label || 'Core concept rule'}"

Generate a fresh, diagnostic multiple-choice question testing retention.
- Exactly 4 choices.
- One choice is the distractor from that misconception.
- answerIndex (0-3) points to the correct choice.
- Clear explanation.`;

      const data = await gemini.generateJson({
        endpointName: 'generate-retention-check',
        input: req.body,
        contents: prompt,
        config: {
          systemInstruction: 'Generate retention check question. Output valid JSON matching schema.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              choices: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              answerIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
            },
            required: ['question', 'choices', 'answerIndex', 'explanation'],
          },
        },
      });

      return res.json(data);
    } catch (error: any) {
      console.error('Error generating retention check:', error);
      return res.status(500).json({ error: error?.message || 'Failed to generate retention check.' });
    }
  });

  // 4d. Generate Teacher Intervention Endpoint
  router.post('/generate-intervention', async (req, res) => {
    try {
      if (!gemini) return res.status(500).json({ error: NO_KEY });

      const { targetType, targetName, misconceptionLabel, studentThinkingPatterns, worldSubject } = req.body;

      const prompt = `You are an expert pedagogical coach in "Mastery Grove".
The teacher is requesting an intervention plan for:
- Subject: ${worldSubject}
- Target: ${targetType === 'student' ? `Student "${targetName}"` : `Misconception "${misconceptionLabel}"`}
- Misconception: "${misconceptionLabel}"
- Observed Student Thought Patterns:
${JSON.stringify(studentThinkingPatterns || [], null, 2)}

GENERATE:
1. "title": A concise title for this intervention.
2. "miniLessonBullets": Exactly 3 actionable, structured bullet points for a targeted 1-on-1 or small group mini-lesson.
3. "fiveMinuteActivity": A specific, engaging 5-minute offline activity (paper, manipulatives, or verbal prompt) tailored to the exact thinking patterns observed.
4. "pedagogicalInsight": A 1-sentence tip explaining why this thinking occurs and how to gently dismantle it.`;

      const data = await gemini.generateJson({
        endpointName: 'generate-intervention',
        input: req.body,
        contents: prompt,
        config: {
          systemInstruction: 'Output valid JSON strictly adhering to the schema.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              miniLessonBullets: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              fiveMinuteActivity: { type: Type.STRING },
              pedagogicalInsight: { type: Type.STRING },
            },
            required: ['title', 'miniLessonBullets', 'fiveMinuteActivity', 'pedagogicalInsight'],
          },
        },
      });

      return res.json(data);
    } catch (error: any) {
      console.error('Error generating intervention:', error);
      return res.status(500).json({ error: error?.message || 'Failed to generate intervention.' });
    }
  });

  // 5. Generate Targeted Questions ("Made for you")
  router.post('/generate-targeted-questions', async (req, res) => {
    try {
      if (!gemini) return res.status(500).json({ error: NO_KEY });

      const { misconception, thoughtProcess, conceptId, worldSubject } = req.body;

      const prompt = `You are Professor Byte in "Mastery Grove".
Create 2 brand-new targeted multiple-choice questions that specifically target and repair this student misconception:
- Subject: ${worldSubject}
- Misconception: ${misconception?.label || 'Fraction misconception'} (ID: ${misconception?.id})
- Specific Thought Process: "${thoughtProcess}"

RULES:
1. Generate EXACTLY 2 distinct questions designed to test and resolve this specific flaw in thinking.
2. Each question has 4 choices. One choice MUST be the specific trap answer that the misconception produces!
3. answerIndex (0-3) points to the correct choice.
4. Provide a clear pedagogical explanation for each.
5. If the question is about fractions, include a "visual" ({ kind: 'cake'|'two-cakes'|'bar', parts, shaded }) whenever it helps visualize the fractions.
`;

      const data = await gemini.generateJson({
        endpointName: 'generate-targeted-questions',
        input: req.body,
        contents: prompt,
        config: {
          systemInstruction: 'Generate targeted educational questions matching the schema.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    question: { type: Type.STRING },
                    choices: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    answerIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING },
                    visual: {
                      type: Type.OBJECT,
                      properties: {
                        kind: { type: Type.STRING },
                        parts: { type: Type.INTEGER },
                        shaded: { type: Type.INTEGER },
                        left: {
                          type: Type.OBJECT,
                          properties: {
                            parts: { type: Type.INTEGER },
                            shaded: { type: Type.INTEGER },
                          },
                        },
                        right: {
                          type: Type.OBJECT,
                          properties: {
                            parts: { type: Type.INTEGER },
                            shaded: { type: Type.INTEGER },
                          },
                        },
                      },
                    },
                  },
                  required: ['id', 'question', 'choices', 'answerIndex', 'explanation'],
                },
              },
            },
            required: ['questions'],
          },
        },
      });

      return res.json(data);
    } catch (error: any) {
      console.error('Error generating targeted questions:', error);
      return res.status(500).json({ error: error?.message || 'Failed to generate targeted questions.' });
    }
  });

  // 6. Deploy Teacher Quest Endpoint
  router.post('/deploy-teacher-quest', async (req, res) => {
    try {
      if (!gemini) return res.status(500).json({ error: NO_KEY });

      const { misconception, conceptId, worldSubject } = req.body;

      const prompt = `You are Mastery Grove's curriculum engine.
A teacher has clicked "Deploy Quest" for the misconception:
- Misconception: ${misconception?.label} (ID: ${misconception?.id})
- Subject: ${worldSubject}

Write 3 focus questions for that misconception that will sprout as trees tagged "From your teacher".
Each question must have 4 choices, an answerIndex (0-3), and an explanation. The distractor matching the misconception must be included.
If the question is about fractions, include a "visual" ({ kind: 'cake'|'two-cakes'|'bar', parts, shaded }) whenever it helps visualize the fractions.`;

      const data = await gemini.generateJson({
        endpointName: 'deploy-teacher-quest',
        input: req.body,
        contents: prompt,
        config: {
          systemInstruction: 'Generate 3 focus questions strictly adhering to the schema.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    question: { type: Type.STRING },
                    choices: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    answerIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING },
                    visual: {
                      type: Type.OBJECT,
                      properties: {
                        kind: { type: Type.STRING },
                        parts: { type: Type.INTEGER },
                        shaded: { type: Type.INTEGER },
                        left: {
                          type: Type.OBJECT,
                          properties: {
                            parts: { type: Type.INTEGER },
                            shaded: { type: Type.INTEGER },
                          },
                        },
                        right: {
                          type: Type.OBJECT,
                          properties: {
                            parts: { type: Type.INTEGER },
                            shaded: { type: Type.INTEGER },
                          },
                        },
                      },
                    },
                  },
                  required: ['id', 'question', 'choices', 'answerIndex', 'explanation'],
                },
              },
            },
            required: ['questions'],
          },
        },
      });

      return res.json(data);
    } catch (error: any) {
      console.error('Error deploying teacher quest:', error);
      return res.status(500).json({ error: error?.message || 'Failed to deploy teacher quest.' });
    }
  });

  // 7. End of Session Rundown Report (plain-code fallback when Gemini is missing or fails)
  router.post('/generate-rundown', async (req, res) => {
    const { worldSubject } = req.body;
    const compactList = buildCompactList(req.body);

    try {
      if (!gemini) return res.json(buildPlainCodeRundown(worldSubject, compactList));

      const prompt = `You are Professor Byte compiling the "End of Session Rundown" for the teacher.
Based on this compact summary of class misconceptions:
- Subject: ${worldSubject}
- Compact Misconception Summary:
${JSON.stringify(compactList, null, 2)}

PRODUCE A COMPREHENSIVE RUNDOWN:
1. Identify the TOP 3 misconceptions in the class.
2. For each:
   - "misconceptionId" and "label"
   - "affectedStudents": array of names of students affected
   - "typicalReasoning": quote or summarize the students' actual thought processes
   - "whyReteach": why this must be addressed first conceptually
   - "fiveMinuteActivity": one concrete, engaging 5-minute reteach activity
3. "priorityOrderSummary": A brief executive summary of what to reteach first.
4. "fullReportMarkdown": A beautifully formatted markdown briefing ready for teacher printout or copying.`;

      const data = await gemini.generateJson({
        input: { worldSubject, compactList },
        endpointName: 'generate-rundown',
        contents: prompt,
        config: {
          systemInstruction: 'Output valid JSON strictly adhering to the schema.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              topMisconceptions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    misconceptionId: { type: Type.STRING },
                    label: { type: Type.STRING },
                    affectedStudents: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    typicalReasoning: { type: Type.STRING },
                    whyReteach: { type: Type.STRING },
                    fiveMinuteActivity: { type: Type.STRING },
                  },
                  required: ['misconceptionId', 'label', 'affectedStudents', 'typicalReasoning', 'whyReteach', 'fiveMinuteActivity'],
                },
              },
              priorityOrderSummary: { type: Type.STRING },
              fullReportMarkdown: { type: Type.STRING },
            },
            required: ['topMisconceptions', 'priorityOrderSummary', 'fullReportMarkdown'],
          },
        },
      });

      return res.json(data);
    } catch (error: any) {
      console.warn('Gemini rundown failed or quota exhausted. Using offline plain code generator:', error?.message || error);
      // Graceful plain-code fallback to guarantee the modal displays
      return res.json(buildPlainCodeRundown(worldSubject, compactList));
    }
  });

  // Mia's teach-back: Gemini marks the rubric (and listens to a voice note); code decides the pass.
  router.post('/grade-teach-back', async (req, res) => {
    const parsed = parseTeachBackInput(req.body);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });
    try {
      return res.json(await gradeTeachBack(gemini, parsed.input));
    } catch (error: any) {
      if (error instanceof CannotListenError) return res.status(503).json({ error: error.message });
      console.error('Error grading teach-back:', error);
      return res.status(500).json({ error: 'Mia could not follow that. Try again?' });
    }
  });

  return router;
}
