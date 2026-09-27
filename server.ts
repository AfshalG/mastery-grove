import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '25mb' }));

// Initialize GoogleGenAI SDK
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// In-memory request cache for 10 minutes
interface CacheEntry {
  data: any;
  expiresAt: number;
}
const requestCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Shared robust Gemini caller with retries, exponential backoff, model fallback, and caching.
 * Model rotation order on 429 / RESOURCE_EXHAUSTED:
 *   1. gemini-3.8-flash
 *   2. gemini-flash-latest
 *   3. gemini-3.1-flash-lite
 *   4. gemini-2.5-flash
 * Retries on 503 with backoff (1s, 2s, 4s) per model before advancing.
 * Caches identical requests in memory for 10 minutes.
 */
const GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
];

async function callGeminiWithRetry(params: {
  endpointName?: string;
  contents: any;
  config?: any;
}) {
  // Generate cache key
  const cacheKey = JSON.stringify({
    ep: params.endpointName || 'default',
    contents: params.contents,
    config: params.config,
  });

  const now = Date.now();
  const cached = requestCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  let lastError: any = null;

  for (let mIdx = 0; mIdx < GEMINI_MODELS.length; mIdx++) {
    const currentModel = GEMINI_MODELS[mIdx];
    const delays = [1000, 2000, 4000];

    for (let attempt = 0; attempt <= 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: currentModel,
          contents: params.contents,
          config: params.config,
        });

        // Cache successful response
        requestCache.set(cacheKey, {
          data: response,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });

        return response;
      } catch (error: any) {
        lastError = error;
        const errMsg = String(error?.message || '');
        const status = error?.status || error?.statusCode;

        const isQuotaOr429 =
          status === 429 ||
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('Resource has been exhausted') ||
          errMsg.includes('quota');

        if (isQuotaOr429) {
          console.warn(
            `[Gemini] Quota/429 on model ${currentModel}. Advancing to next model in rotation...`
          );
          // Break inner loop to try next model immediately without burning delays on exhausted quota
          break;
        }

        const isTransient503 =
          status === 503 ||
          errMsg.includes('503') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('high demand') ||
          errMsg.includes('overloaded');

        if (isTransient503 && attempt < 3) {
          console.warn(
            `[Gemini] 503/high demand on ${currentModel} (attempt ${attempt + 1}). Backing off ${delays[attempt]}ms...`
          );
          await new Promise((r) => setTimeout(r, delays[attempt]));
        } else {
          // If not 503 or all backoffs used, try next model
          break;
        }
      }
    }
  }

  throw lastError || new Error('All Gemini model fallbacks exhausted.');
}

// 1. Generate World Endpoint
app.post('/api/generate-world', async (req, res) => {
  try {
    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server. Please check the Secrets panel.',
      });
    }

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
5. Citations:
   - If worksheet text or an uploaded worksheet file is provided, every question MUST be derived from or directly present in that worksheet, and "citation" must include { "page": <page number (1-indexed)>, "quote": "<exact line or phrase from worksheet>" }.
   - If only a topic was provided without worksheet text or file, set "citation" to null.
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

    const response = await callGeminiWithRetry({
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
          },
          required: ['subject', 'concepts', 'misconceptions', 'trees'],
        },
      },
    });

    const textContent = response.text;
    if (!textContent) throw new Error('Gemini returned an empty response.');
    return res.json(JSON.parse(textContent));
  } catch (error: any) {
    console.error('Error generating world:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate world from Gemini.',
    });
  }
});

// 2. Predict Trees Endpoint (Tutor World Model)
app.post('/api/predict-trees', async (req, res) => {
  try {
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });

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

    const response = await callGeminiWithRetry({
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

    const textContent = response.text;
    if (!textContent) throw new Error('Gemini returned an empty prediction.');
    return res.json(JSON.parse(textContent));
  } catch (error: any) {
    console.error('Error predicting trees:', error);
    return res.status(500).json({ error: error?.message || 'Failed to predict trees.' });
  }
});

// 3. Thought-Process Diagnosis Endpoint
app.post('/api/diagnose-thought-process', async (req, res) => {
  try {
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });

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

    const response = await callGeminiWithRetry({
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

    const textContent = response.text;
    if (!textContent) throw new Error('Gemini returned an empty diagnosis.');
    return res.json(JSON.parse(textContent));
  } catch (error: any) {
    console.error('Error diagnosing thought process:', error);
    return res.status(500).json({ error: error?.message || 'Failed to diagnose thought process.' });
  }
});

// 4. Revise Diagnosis Endpoint (when student clicked "Not quite" and explained)
app.post('/api/revise-thought-process', async (req, res) => {
  try {
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });

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

    const response = await callGeminiWithRetry({
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

    const textContent = response.text;
    if (!textContent) throw new Error('Gemini returned empty revised diagnosis.');
    return res.json(JSON.parse(textContent));
  } catch (error: any) {
    console.error('Error revising thought process:', error);
    return res.status(500).json({ error: error?.message || 'Failed to revise thought process.' });
  }
});

// 4b. Generate Targeted Sapling Variant Endpoint
app.post('/api/generate-targeted-sapling', async (req, res) => {
  try {
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });

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

    const response = await callGeminiWithRetry({
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

    const textContent = response.text;
    if (!textContent) throw new Error('Empty sapling response.');
    return res.json(JSON.parse(textContent));
  } catch (error: any) {
    console.error('Error generating targeted sapling:', error);
    return res.status(500).json({ error: error?.message || 'Failed to generate targeted sapling.' });
  }
});

// 4c. Generate Retention Check Question (Memory Sprout)
app.post('/api/generate-retention-check', async (req, res) => {
  try {
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });

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

    const response = await callGeminiWithRetry({
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

    const textContent = response.text;
    if (!textContent) throw new Error('Empty retention response.');
    return res.json(JSON.parse(textContent));
  } catch (error: any) {
    console.error('Error generating retention check:', error);
    return res.status(500).json({ error: error?.message || 'Failed to generate retention check.' });
  }
});

// 4d. Generate Teacher Intervention Endpoint
app.post('/api/generate-intervention', async (req, res) => {
  try {
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });

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

    const response = await callGeminiWithRetry({
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

    const textContent = response.text;
    if (!textContent) throw new Error('Empty intervention response.');
    return res.json(JSON.parse(textContent));
  } catch (error: any) {
    console.error('Error generating intervention:', error);
    return res.status(500).json({ error: error?.message || 'Failed to generate intervention.' });
  }
});

// 5. Generate Targeted Questions ("Made for you")
app.post('/api/generate-targeted-questions', async (req, res) => {
  try {
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });

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

    const response = await callGeminiWithRetry({
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

    const textContent = response.text;
    if (!textContent) throw new Error('Empty targeted questions response.');
    return res.json(JSON.parse(textContent));
  } catch (error: any) {
    console.error('Error generating targeted questions:', error);
    return res.status(500).json({ error: error?.message || 'Failed to generate targeted questions.' });
  }
});

// 6. Deploy Teacher Quest Endpoint
app.post('/api/deploy-teacher-quest', async (req, res) => {
  try {
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });

    const { misconception, conceptId, worldSubject } = req.body;

    const prompt = `You are Mastery Grove's curriculum engine.
A teacher has clicked "Deploy Quest" for the misconception:
- Misconception: ${misconception?.label} (ID: ${misconception?.id})
- Subject: ${worldSubject}

Write 3 focus questions for that misconception that will sprout as trees tagged "From your teacher".
Each question must have 4 choices, an answerIndex (0-3), and an explanation. The distractor matching the misconception must be included.
If the question is about fractions, include a "visual" ({ kind: 'cake'|'two-cakes'|'bar', parts, shaded }) whenever it helps visualize the fractions.`;

    const response = await callGeminiWithRetry({
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

    const textContent = response.text;
    if (!textContent) throw new Error('Empty deploy quest response.');
    return res.json(JSON.parse(textContent));
  } catch (error: any) {
    console.error('Error deploying teacher quest:', error);
    return res.status(500).json({ error: error?.message || 'Failed to deploy teacher quest.' });
  }
});

// Helper to build fallback rundown report in plain code
function buildPlainCodeRundown(worldSubject: string, compactList: any[]) {
  const sorted = [...compactList].sort((a, b) => (b.count || b.affectedStudents?.length || 0) - (a.count || a.affectedStudents?.length || 0));
  const top3 = sorted.slice(0, 3).map((item) => {
    const quotes: string[] = item.quotes || [];
    const typical = quotes.length > 0
      ? quotes[0]
      : `Students exhibit confusion regarding ${item.label?.toLowerCase() || 'this concept'}.`;

    let activity = 'Use visual fraction bars or paper-folding strips to model equivalent proportions concretely.';
    const lbl = (item.label || '').toLowerCase();
    if (lbl.includes('numerator') || lbl.includes('simplif')) {
      activity = '5-Minute Slicing Demo: Fold a paper strip in half, then fourths, then eighths to prove the shaded amount remains identical.';
    } else if (lbl.includes('compare') || lbl.includes('denominator')) {
      activity = '5-Minute Denominator Duel: Compare 1/3 and 1/6 using real cake diagrams so students see fewer cuts = bigger slices.';
    } else if (lbl.includes('add') || lbl.includes('plus') || lbl.includes('unlike')) {
      activity = '5-Minute Common Ground Grid: Color 1/2 on a 6-grid (3 blocks) and 1/3 (2 blocks) to visually add 3/6 + 2/6 = 5/6.';
    }

    const students = Array.isArray(item.affectedStudents) && item.affectedStudents.length > 0
      ? item.affectedStudents
      : ['Students needing review'];

    return {
      misconceptionId: item.id || item.misconceptionId || 'm1',
      label: item.label || 'Fraction Concept Rule',
      affectedStudents: students,
      typicalReasoning: typical,
      whyReteach: `Students holding this view confuse foundational fraction properties, which blocks progression.`,
      fiveMinuteActivity: activity,
    };
  });

  const priorityOrder = top3
    .map(
      (t, i) =>
        `${i + 1}. Address "${t.label}" (${t.affectedStudents.length} student${t.affectedStudents.length === 1 ? '' : 's'} flagged)`
    )
    .join('; ');

  let md = `# End of Session Pedagogical Rundown\n**Subject:** ${worldSubject || 'Mathematics'}\n\n`;
  md += `## Executive Priority Summary\n${priorityOrder}\n\n`;
  md += `## Top 3 Targeted Misconceptions\n`;
  top3.forEach((t, i) => {
    md += `### ${i + 1}. ${t.label}\n`;
    md += `- **Affected Students:** ${t.affectedStudents.join(', ')}\n`;
    md += `- **Typical Student Reasoning:** "${t.typicalReasoning}"\n`;
    md += `- **Why Address First:** ${t.whyReteach}\n`;
    md += `- **5-Minute Reteach Activity:** ${t.fiveMinuteActivity}\n\n`;
  });

  return {
    topMisconceptions: top3,
    priorityOrderSummary: priorityOrder,
    fullReportMarkdown: md,
  };
}

// 7. End of Session Rundown Report
app.post('/api/generate-rundown', async (req, res) => {
  const { worldSubject, misconceptions, allStudentData, compactSummary } = req.body;

  // Build compact summary: per-misconception counts, affected students, up to 3 thought-process quotes each
  let compactList = Array.isArray(compactSummary) ? compactSummary : [];
  if (compactList.length === 0 && Array.isArray(misconceptions)) {
    compactList = misconceptions.map((m: any) => {
      let affectedStudents: string[] = [];
      let quotes: string[] = [];

      if (Array.isArray(allStudentData)) {
        allStudentData.forEach((st: any) => {
          const isAffected =
            st.activeMisconception === m.id ||
            st.recentAttempts?.some((a: any) => a.thoughtProcess && !a.correct) ||
            st.flags?.some((f: any) => f.thoughtProcess);

          if (isAffected) {
            affectedStudents.push(st.name || 'Student');
          }

          if (Array.isArray(st.flags)) {
            st.flags.forEach((f: any) => {
              if (f.thoughtProcess && quotes.length < 3) quotes.push(f.thoughtProcess);
            });
          }
        });
      }

      return {
        id: m.id,
        label: m.label,
        count: affectedStudents.length,
        affectedStudents: Array.from(new Set(affectedStudents)),
        quotes: quotes.slice(0, 3),
      };
    });
  }

  try {
    if (!apiKey) {
      return res.json(buildPlainCodeRundown(worldSubject, compactList));
    }

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

    const response = await callGeminiWithRetry({
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

    const textContent = response.text;
    if (!textContent) throw new Error('Empty rundown response.');
    return res.json(JSON.parse(textContent));
  } catch (error: any) {
    console.warn('Gemini rundown failed or quota exhausted. Using offline plain code generator:', error?.message || error);
    // Graceful plain-code fallback to guarantee the modal displays
    return res.json(buildPlainCodeRundown(worldSubject, compactList));
  }
});

// Setup Vite middleware in dev or static files in prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Mastery Grove server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
