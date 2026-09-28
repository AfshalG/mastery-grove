import { WorldData } from '../types/game';

export const SAMPLE_WORLD: WorldData = {
  subject: 'Primary 5 Mathematics — Fractions',
  concepts: [
    {
      id: 'c1',
      name: 'Equivalent fractions',
      questName: 'The Simplest Spring',
      prerequisites: [],
    },
    {
      id: 'c2',
      name: 'Comparing unlike fractions',
      questName: 'The Fraction Bridge',
      prerequisites: ['c1'],
    },
    {
      id: 'c3',
      name: 'Adding unlike fractions',
      questName: 'The Common Ground Crossing',
      prerequisites: ['c1', 'c2'],
    },
  ],
  misconceptions: [
    {
      id: 'm1',
      conceptId: 'c1',
      label: 'thinks a fraction changes value when simplified',
    },
    {
      id: 'm2',
      conceptId: 'c1',
      label: 'divides only the numerator when simplifying',
    },
    {
      id: 'm3',
      conceptId: 'c2',
      label: 'compares fractions by numerator alone, so thinks 5/8 > 3/4',
    },
    {
      id: 'm4',
      conceptId: 'c2',
      label: 'thinks a larger denominator always means a larger fraction',
    },
    {
      id: 'm5',
      conceptId: 'c3',
      label: 'adds numerators and denominators separately, so 1/2 + 1/3 = 2/5',
    },
    {
      id: 'm6',
      conceptId: 'c3',
      label: 'finds a common denominator but forgets to convert the numerators',
    },
  ],
  trees: [
    // Grove 1: The Simplest Spring (c1)
    {
      id: 't1_1',
      conceptId: 'c1',
      question: 'Simplify the fraction 4/8 to its simplest form.',
      choices: [
        '1/2',
        '2/8',
        'It becomes a smaller quantity than 4/8',
        '1/8',
      ],
      answerIndex: 0,
      visual: {
        kind: 'cake',
        parts: 8,
        shaded: 4,
      },
      explanation:
        'Divide both the numerator and denominator by their greatest common factor (4): 4 ÷ 4 = 1 and 8 ÷ 4 = 2. 4/8 = 1/2. The simplified fraction represents the exact same portion!',
      citation: null,
      state: 'unanswered',
    },
    {
      id: 't1_2',
      conceptId: 'c1',
      question: 'Which of the following is equivalent to 6/9 in simplest form?',
      choices: [
        '2/9',
        '2/3',
        '3/9',
        '6/9 cannot equal any other fraction without changing size',
      ],
      answerIndex: 1,
      visual: {
        kind: 'cake',
        parts: 9,
        shaded: 6,
      },
      explanation:
        'Dividing both numerator (6 ÷ 3 = 2) and denominator (9 ÷ 3 = 3) yields 2/3. Dividing top and bottom by the same number keeps the proportion identical.',
      citation: null,
      state: 'unanswered',
    },
    {
      id: 't1_3',
      conceptId: 'c1',
      question:
        'Leo has a pizza cut into 12 slices and eats 8 slices (8/12). Maya eats 2/3 of an identical pizza. Who ate more pizza?',
      choices: [
        'Leo ate more because 8/12 has larger numbers than 2/3',
        'Leo ate 4/12 of the pizza',
        'They ate the exact same amount because 8/12 simplifies to 2/3',
        'Maya ate less because 2 is smaller than 8',
      ],
      answerIndex: 2,
      visual: {
        kind: 'two-cakes',
        left: { parts: 12, shaded: 8 },
        right: { parts: 3, shaded: 2 },
      },
      explanation:
        '8/12 and 2/3 are equivalent fractions! Dividing both 8 and 12 by 4 yields 2/3. Simplifying simply groups the pizza into 3 bigger equal sections instead of 12 smaller ones.',
      citation: null,
      state: 'unanswered',
    },
    {
      id: 't1_4',
      conceptId: 'c1',
      question: 'How do you correctly simplify 15/20 to its simplest form?',
      choices: [
        'Divide only 15 by 5 to get 3/20',
        'Subtract 5 from both 15 and 20 to get 10/15',
        '3/4, but note that 3/4 represents less than 15/20',
        'Divide both numerator 15 and denominator 20 by 5 to get 3/4',
      ],
      answerIndex: 3,
      visual: {
        kind: 'bar',
        parts: 20,
        shaded: 15,
      },
      explanation:
        'To simplify without altering the fraction’s true value, divide both the numerator (15 ÷ 5 = 3) and denominator (20 ÷ 5 = 4) by their common factor 5, arriving at 3/4.',
      citation: null,
      state: 'unanswered',
    },
    // Grove 1 Hands-On Serve Question
    {
      id: 't1_serve',
      conceptId: 'c1',
      question: 'Serve 2/3 of the cake.',
      kind: 'serve',
      serveConfig: {
        targetNumerator: 2,
        targetDenominator: 3,
        totalSlices: 6,
      },
      visual: {
        kind: 'cake',
        parts: 6,
        shaded: 4,
      },
      choices: [],
      answerIndex: 4,
      explanation:
        'Since this cake has 6 slices, 2/3 means 2 out of every 3 slices. There are two groups of 3 slices, so serving 4 slices gives exactly 4/6 = 2/3!',
      citation: null,
      state: 'unanswered',
    },

    // Grove 2: The Fraction Bridge (c2)
    {
      id: 't2_1',
      conceptId: 'c2',
      question: 'Which is larger: 3/4 or 5/8?',
      choices: [
        '5/8 because 5 is greater than 3',
        '5/8 because 8 is larger than 4',
        '3/4 because converted to eighths it is 6/8, and 6/8 > 5/8',
        'They are equal because 5 - 3 = 8 - 4',
      ],
      answerIndex: 2,
      visual: {
        kind: 'two-cakes',
        left: { parts: 4, shaded: 3 },
        right: { parts: 8, shaded: 5 },
      },
      explanation:
        'To compare fractions with different denominators, convert to a common denominator. 3/4 = (3×2)/(4×2) = 6/8. Now comparing 6/8 to 5/8, since 6 > 5, 3/4 is larger!',
      citation: null,
      state: 'unanswered',
    },
    {
      id: 't2_2',
      conceptId: 'c2',
      question: 'Which statement correctly compares 2/3 and 3/5?',
      choices: [
        '3/5 is larger because 3 is greater than 2',
        '3/5 is larger because fifths are larger than thirds',
        '2/3 is larger because 2/3 = 10/15 and 3/5 = 9/15',
        'Both fractions are equal since both are less than 1',
      ],
      answerIndex: 2,
      visual: {
        kind: 'two-cakes',
        left: { parts: 3, shaded: 2 },
        right: { parts: 5, shaded: 3 },
      },
      explanation:
        'With a common denominator of 15: 2/3 = 10/15, and 3/5 = 9/15. Comparing the numerators: 10 > 9, so 2/3 is greater than 3/5.',
      citation: null,
      state: 'unanswered',
    },
    {
      id: 't2_3',
      conceptId: 'c2',
      question: 'Between 1/3 and 1/6, which fraction represents a bigger share of a cake?',
      choices: [
        '1/6 because 6 is a larger number than 3',
        '1/3 because cutting into 3 pieces produces bigger slices than 6 pieces',
        'Both are equal because both have 1 as numerator',
        '1/6 because the denominator always determines greatness',
      ],
      answerIndex: 1,
      visual: {
        kind: 'two-cakes',
        left: { parts: 3, shaded: 1 },
        right: { parts: 6, shaded: 1 },
      },
      explanation:
        'The denominator tells us into how many equal slices the whole is divided. Fewer total slices (3) means each slice is significantly bigger! 1/3 = 2/6, which is twice as big as 1/6.',
      citation: null,
      state: 'unanswered',
    },
    {
      id: 't2_4',
      conceptId: 'c2',
      question: 'Which is the correct order from smallest to largest: 1/2, 3/8, 3/4?',
      choices: [
        '1/2 < 3/8 < 3/4 because 1 < 3',
        '1/2 < 3/4 < 3/8 because 8 is the largest denominator',
        '3/8 < 1/2 < 3/4',
        '3/4 < 3/8 < 1/2',
      ],
      answerIndex: 2,
      visual: {
        kind: 'cake',
        parts: 8,
        shaded: 3,
      },
      explanation:
        'Convert all three fractions to eighths: 3/8 = 3/8; 1/2 = 4/8; 3/4 = 6/8. Now comparing numerators gives 3/8 < 4/8 < 6/8, meaning 3/8 < 1/2 < 3/4.',
      citation: null,
      state: 'unanswered',
    },
    // Grove 2 hands-on challenge: build the bridge (the same maths as serving a cake, on planks)
    {
      id: 't2_serve',
      conceptId: 'c2',
      question: 'Lay 3/4 of the planks on the bridge.',
      kind: 'serve',
      serveConfig: {
        targetNumerator: 3,
        targetDenominator: 4,
        totalSlices: 8,
        whole: 'bridge',
      },
      visual: {
        kind: 'bar',
        parts: 8,
        shaded: 6,
      },
      choices: [],
      answerIndex: 6,
      explanation:
        'The bridge has 8 planks in 4 equal groups of 2. Three of those groups is 6 planks, so 3/4 of the bridge is 6 planks.',
      citation: null,
      state: 'unanswered',
    },

    // Grove 3: The Common Ground Crossing (c3)
    {
      id: 't3_1',
      conceptId: 'c3',
      question: 'What is 1/2 + 1/3?',
      choices: [
        '2/5',
        '2/6',
        '5/6',
        '1/5',
      ],
      answerIndex: 2,
      visual: {
        kind: 'two-cakes',
        left: { parts: 2, shaded: 1 },
        right: { parts: 3, shaded: 1 },
      },
      explanation:
        'Find a common denominator: 6. 1/2 = 3/6 and 1/3 = 2/6. Then add the converted numerators: 3/6 + 2/6 = 5/6. Denominators describe piece size and must never simply be added together!',
      citation: null,
      state: 'unanswered',
    },
    {
      id: 't3_2',
      conceptId: 'c3',
      question: 'Calculate: 1/4 + 3/8.',
      choices: [
        '4/12',
        '4/8',
        '5/8',
        '3/32',
      ],
      answerIndex: 2,
      visual: {
        kind: 'two-cakes',
        left: { parts: 4, shaded: 1 },
        right: { parts: 8, shaded: 3 },
      },
      explanation:
        'Convert 1/4 to eighths: 1/4 = 2/8. Now that denominators match: 2/8 + 3/8 = (2+3)/8 = 5/8.',
      citation: null,
      state: 'unanswered',
    },
    {
      id: 't3_3',
      conceptId: 'c3',
      question:
        'Emma walks 2/5 km in the morning and 1/10 km in the afternoon. How far did she walk in total?',
      choices: [
        '3/15 km',
        '3/10 km',
        '5/10 km (which simplifies to 1/2 km)',
        '2/50 km',
      ],
      answerIndex: 2,
      visual: {
        kind: 'bar',
        parts: 10,
        shaded: 5,
      },
      explanation:
        'Convert 2/5 to tenths: 2/5 = 4/10. Add the distances: 4/10 + 1/10 = 5/10 km. Simplifying 5/10 gives 1/2 km.',
      citation: null,
      state: 'unanswered',
    },
    {
      id: 't3_4',
      conceptId: 'c3',
      question: 'Why can’t you directly compute 1/3 + 1/6 as (1+1)/(3+6) = 2/9?',
      choices: [
        'Because 2/9 is already in simplest form',
        'Because thirds and sixths are different sized portions; you must convert them to the same denominator first (2/6 + 1/6 = 3/6 = 1/2)',
        'Because you should only add the denominators, keeping the numerator 1',
        'Because fractions with different denominators can only be subtracted',
      ],
      answerIndex: 1,
      visual: {
        kind: 'two-cakes',
        left: { parts: 3, shaded: 1 },
        right: { parts: 6, shaded: 1 },
      },
      explanation:
        'Fractions represent portions of a unit whole. 1/3 is a much bigger slice than 1/6! To combine them meaningfully, convert 1/3 to 2/6. Then 2/6 + 1/6 = 3/6 = 1/2. Adding denominators together actually makes smaller pieces instead of combining totals!',
      citation: null,
      state: 'unanswered',
    },
    // Grove 3 Hands-On Serve Question
    {
      id: 't3_serve',
      conceptId: 'c3',
      question: 'Serve 5/6 of the cake.',
      kind: 'serve',
      serveConfig: {
        targetNumerator: 5,
        targetDenominator: 6,
        totalSlices: 12,
      },
      visual: {
        kind: 'cake',
        parts: 12,
        shaded: 10,
      },
      choices: [],
      answerIndex: 10,
      explanation:
        'The cake is divided into 12 slices. 5/6 converted to twelfths is (5×2)/(6×2) = 10/12. Serving 10 slices serves exactly 5/6 of the whole cake!',
      citation: null,
      state: 'unanswered',
    },
  ],
  // Mia, at the heart of each grove, holds one of the grove's mix-ups. Rubric points are in plain kid words.
  teachSpots: [
    {
      conceptId: 'c1',
      misconceptionId: 'm2',
      puzzledThought: 'To simplify 4/8, I halved the top and got 2/8. My teacher marked it wrong. Why?',
      board: '4/8 = 2/8 ?',
      rubricPoints: [
        'Divide the top and the bottom by the same number',
        '2/8 is less than 4/8, so it is not the same amount',
        '4/8 simplifies to 1/2',
      ],
    },
    {
      conceptId: 'c2',
      misconceptionId: 'm3',
      puzzledThought: '5/8 is bigger than 3/4, because 5 is bigger than 3. Right?',
      board: '5/8 > 3/4 ?',
      rubricPoints: [
        'Eighths are smaller pieces than quarters, so you cannot just compare the tops',
        'Change 3/4 to 6/8 so the bottoms match',
        '6/8 is more than 5/8, so 3/4 is bigger',
      ],
    },
    {
      conceptId: 'c3',
      misconceptionId: 'm5',
      puzzledThought: '1/2 + 1/3 = 2/5. I added the tops and I added the bottoms. What did I do wrong?',
      board: '1/2 + 1/3 = 2/5 ?',
      rubricPoints: [
        'You cannot add the bottoms. Make them the same first, like sixths',
        '1/2 is 3/6 and 1/3 is 2/6',
        '3/6 + 2/6 = 5/6',
      ],
    },
  ],
};

/**
 * Pre-written thoughtProcess and scaffoldHint per wrong choice for the sample world.
 * Used whenever Gemini hits quota/fails, ensuring the sample world runs offline with zero quota.
 */
export const SAMPLE_WRONG_CHOICE_DIAGNOSES: Record<
  string,
  Record<number, { misconceptionId: string; thoughtProcess: string; scaffoldHint: string }>
> = {
  t1_1: {
    1: {
      misconceptionId: 'm2',
      thoughtProcess: 'You divided only the numerator (4 ÷ 2 = 2) while leaving the denominator 8 unchanged.',
      scaffoldHint: 'Remember to divide both top and bottom numbers by the same common factor.',
    },
    2: {
      misconceptionId: 'm1',
      thoughtProcess: 'You believed that simplifying a fraction makes the portion smaller because the numbers look smaller.',
      scaffoldHint: 'Think of cutting a pizza: 4 out of 8 slices covers the exact same area as 1 out of 2 slices!',
    },
    3: {
      misconceptionId: 'm2',
      thoughtProcess: 'You simplified the top number to 1 but did not simplify the bottom number.',
      scaffoldHint: 'Whatever you divide the top number by (4), you must also divide the bottom number by (8 ÷ 4).',
    },
  },
  t1_2: {
    0: {
      misconceptionId: 'm2',
      thoughtProcess: 'You divided only the top number by 3 (6 ÷ 3 = 2), but left the denominator as 9.',
      scaffoldHint: 'Divide both numerator and denominator by 3 to keep the balance.',
    },
    2: {
      misconceptionId: 'm2',
      thoughtProcess: 'You subtracted from the top number instead of dividing both numbers by their common factor.',
      scaffoldHint: 'Simplifying requires dividing both top and bottom by their common factor.',
    },
    3: {
      misconceptionId: 'm1',
      thoughtProcess: 'You thought writing different numbers always changes the true size of the fraction.',
      scaffoldHint: 'Equivalent fractions represent the exact same portion grouped into different slice counts.',
    },
  },
  t1_3: {
    0: {
      misconceptionId: 'm1',
      thoughtProcess: 'You judged the size solely by how big the numbers 8 and 12 looked compared to 2 and 3.',
      scaffoldHint: 'Try simplifying 8/12 by dividing both numbers by 4.',
    },
    1: {
      misconceptionId: 'm2',
      thoughtProcess: 'You subtracted 8 from 12 instead of comparing the portions eaten.',
      scaffoldHint: 'Leo ate 8 out of 12 slices. What fraction of the pizza is that?',
    },
    3: {
      misconceptionId: 'm1',
      thoughtProcess: 'You compared just the numerators without considering how much larger thirds are than twelfths.',
      scaffoldHint: '1 third is worth 4 twelfths, so 2 thirds equals 8 twelfths.',
    },
  },
  t1_4: {
    0: {
      misconceptionId: 'm2',
      thoughtProcess: 'You divided only the numerator by 5 without changing the denominator.',
      scaffoldHint: "A fraction's value stays constant only if you divide both top and bottom by 5.",
    },
    1: {
      misconceptionId: 'm1',
      thoughtProcess: 'You subtracted 5 from top and bottom instead of dividing by a common factor.',
      scaffoldHint: 'Simplifying is done by division, not subtraction.',
    },
    2: {
      misconceptionId: 'm1',
      thoughtProcess: 'You reached 3/4 but believed 3/4 is less than 15/20 because the digits are smaller.',
      scaffoldHint: '3/4 and 15/20 represent the exact same amount of the whole!',
    },
  },
  t2_1: {
    0: {
      misconceptionId: 'm3',
      thoughtProcess: 'You compared only the top numbers (5 is bigger than 3) without checking the slice sizes.',
      scaffoldHint: 'Convert 3/4 to eighths first: how many eighths are in 3/4?',
    },
    1: {
      misconceptionId: 'm4',
      thoughtProcess: 'You assumed the larger denominator (8) makes the fraction larger.',
      scaffoldHint: 'A larger denominator means the cake is cut into smaller slices!',
    },
    3: {
      misconceptionId: 'm3',
      thoughtProcess: 'You compared the difference between top and bottom numbers rather than finding a common denominator.',
      scaffoldHint: 'To compare unlike fractions, make their denominators match.',
    },
  },
  t2_2: {
    0: {
      misconceptionId: 'm3',
      thoughtProcess: 'You compared just the numerators, thinking 3 is bigger than 2.',
      scaffoldHint: 'Look at the denominators: thirds are larger slices than fifths.',
    },
    1: {
      misconceptionId: 'm4',
      thoughtProcess: 'You thought fifths are larger pieces than thirds because 5 is a bigger number.',
      scaffoldHint: 'Cutting into 3 pieces makes bigger slices than cutting into 5 pieces.',
    },
    3: {
      misconceptionId: 'm3',
      thoughtProcess: 'You treated all fractions less than 1 as having similar values.',
      scaffoldHint: 'Find a common denominator of 15 to compare their exact sizes.',
    },
  },
  t2_3: {
    0: {
      misconceptionId: 'm4',
      thoughtProcess: 'You thought 1/6 is bigger because the denominator 6 is larger than 3.',
      scaffoldHint: 'If you share a cake with 6 people versus 3 people, which group gets bigger slices?',
    },
    2: {
      misconceptionId: 'm3',
      thoughtProcess: 'You assumed having the same numerator means the fractions have equal value.',
      scaffoldHint: 'The denominator dictates how small each slice was cut.',
    },
    3: {
      misconceptionId: 'm4',
      thoughtProcess: 'You believed a bigger bottom number always creates a greater fraction.',
      scaffoldHint: 'Remember: more slices means smaller pieces!',
    },
  },
  t2_4: {
    0: {
      misconceptionId: 'm3',
      thoughtProcess: 'You ordered by the top numbers first without converting denominators.',
      scaffoldHint: 'Convert all fractions to eighths: 1/2 is 4/8, and 3/4 is 6/8.',
    },
    1: {
      misconceptionId: 'm4',
      thoughtProcess: 'You placed 3/8 as the largest because of the denominator 8.',
      scaffoldHint: 'Notice that 3/8 is less than half a cake (which would be 4/8).',
    },
    3: {
      misconceptionId: 'm4',
      thoughtProcess: 'You reversed the order based on denominator size.',
      scaffoldHint: 'Compare them all using eighths: 3/8, 4/8, and 6/8.',
    },
  },
  t3_1: {
    0: {
      misconceptionId: 'm5',
      thoughtProcess: 'You added the top numbers (1 + 1 = 2) and bottom numbers (2 + 3 = 5) directly across.',
      scaffoldHint: 'Denominators describe the size of the pieces; find a common denominator before adding!',
    },
    1: {
      misconceptionId: 'm6',
      thoughtProcess: 'You changed the denominator to 6 but added the numerators without converting them first (1 + 1 = 2).',
      scaffoldHint: '1/2 becomes 3/6 and 1/3 becomes 2/6. Add those converted numerators!',
    },
    3: {
      misconceptionId: 'm5',
      thoughtProcess: 'You added denominators but left the numerator unchanged.',
      scaffoldHint: 'Convert both fractions into equivalent sixths before adding.',
    },
  },
  t3_2: {
    0: {
      misconceptionId: 'm5',
      thoughtProcess: 'You added the top numbers (1 + 3 = 4) and bottom numbers (4 + 8 = 12) straight across.',
      scaffoldHint: 'You cannot add slices of different sizes. Convert 1/4 into eighths first!',
    },
    1: {
      misconceptionId: 'm6',
      thoughtProcess: 'You used 8 as the common denominator but forgot to convert 1/4 into 2/8 (1 + 3 = 4).',
      scaffoldHint: '1/4 is equivalent to 2/8. Now add 2/8 + 3/8.',
    },
    3: {
      misconceptionId: 'm5',
      thoughtProcess: 'You multiplied the denominators instead of finding an equivalent fraction to add.',
      scaffoldHint: '4 divides into 8. Multiply 1/4 top and bottom by 2.',
    },
  },
  t3_3: {
    0: {
      misconceptionId: 'm5',
      thoughtProcess: 'You added top numbers (2 + 1 = 3) and bottom numbers (5 + 10 = 15) straight across.',
      scaffoldHint: 'Convert 2/5 km into tenths before adding.',
    },
    1: {
      misconceptionId: 'm6',
      thoughtProcess: 'You used 10 as the common denominator but added 2 + 1 without scaling 2/5 to 4/10.',
      scaffoldHint: '2/5 is equal to 4/10. What is 4/10 + 1/10?',
    },
    3: {
      misconceptionId: 'm5',
      thoughtProcess: 'You multiplied the denominators instead of finding equivalent fractions.',
      scaffoldHint: 'To combine distances, bring both fractions to tenths.',
    },
  },
  t3_4: {
    0: {
      misconceptionId: 'm5',
      thoughtProcess: 'You thought the issue was simplification rather than adding unequal slice sizes.',
      scaffoldHint: '1/3 is bigger than 1/6. Adding denominators actually makes smaller pieces!',
    },
    2: {
      misconceptionId: 'm5',
      thoughtProcess: 'You thought only denominators are added when fractions are combined.',
      scaffoldHint: 'Denominators must never be added directly together.',
    },
    3: {
      misconceptionId: 'm5',
      thoughtProcess: 'You believed unlike fractions cannot be added at all.',
      scaffoldHint: 'Unlike fractions can be added once converted to a common denominator.',
    },
  },
};

export function getSampleWrongChoiceDiagnosis(treeId: string, choiceIndex: number) {
  const treeMap = SAMPLE_WRONG_CHOICE_DIAGNOSES[treeId];
  if (treeMap && treeMap[choiceIndex]) {
    return treeMap[choiceIndex];
  }
  // Generic fallback if not in explicit dictionary
  return {
    misconceptionId: 'm1',
    thoughtProcess: 'You may have relied on whole-number rules rather than fraction partition principles.',
    scaffoldHint: 'Look closely at what the numerator and denominator represent before calculating.',
  };
}

/**
 * Reserve bank of sample-world questions per misconception for offline "Made for you" & Deploy Quest fallback.
 */
export const SAMPLE_RESERVE_QUESTIONS: Record<string, any[]> = {
  m1: [
    {
      id: 'res_m1_1',
      question: 'Maya says 6/8 of a chocolate bar is more than 3/4 of the same bar because 6 > 3. Is she right?',
      choices: [
        'No, 6/8 and 3/4 are equal because both top and bottom were divided by 2',
        'Yes, 6 pieces are always more food than 3 pieces',
        'No, 3/4 is bigger because smaller denominators are better',
        'Yes, simplification decreases the total portion',
      ],
      answerIndex: 0,
      visual: { kind: 'two-cakes', left: { parts: 8, shaded: 6 }, right: { parts: 4, shaded: 3 } },
      explanation: 'Simplifying groups smaller slices into larger slices without changing the total amount eaten.',
    },
    {
      id: 'res_m1_2',
      question: 'A recipe asks for 2/4 cup of sugar. You only have a 1/2 cup measure. What should you do?',
      choices: [
        'Use the 1/2 cup measure once, because 2/4 = 1/2',
        'The 1/2 cup measure gives too little sugar',
        'The 1/2 cup measure gives too much sugar',
        'You must find a 2/4 cup measuring cup',
      ],
      answerIndex: 0,
      visual: { kind: 'cake', parts: 4, shaded: 2 },
      explanation: '2/4 and 1/2 describe identical quantities. Dividing both top and bottom by 2 confirms 2/4 is exactly 1/2.',
    },
    {
      id: 'res_m1_3',
      question: 'Does dividing both top and bottom of 10/20 by 10 change how much of the rectangle is shaded?',
      choices: [
        'No, 10/20 and 1/2 cover the exact same shaded fraction',
        'Yes, 1/2 is smaller because 1 < 10',
        'Yes, 1/2 is larger because 2 is a smaller denominator',
        'It depends on the color of the shading',
      ],
      answerIndex: 0,
      visual: { kind: 'bar', parts: 20, shaded: 10 },
      explanation: 'Dividing numerator and denominator by the same non-zero number scales the partition without changing proportion.',
    },
  ],
  m2: [
    {
      id: 'res_m2_1',
      question: 'Simplify 8/12. Which step is strictly required?',
      choices: [
        'Divide both 8 and 12 by 4 to get 2/3',
        'Divide only 8 by 4 to get 2/12',
        'Subtract 4 from 8 to get 4/12',
        'Divide 12 by 4 to get 8/3',
      ],
      answerIndex: 0,
      visual: { kind: 'cake', parts: 12, shaded: 8 },
      explanation: 'Both numerator and denominator must be divided by their common factor to preserve proportion.',
    },
    {
      id: 'res_m2_2',
      question: 'Jordan simplified 9/15 to 3/15. What mistake was made?',
      choices: [
        'He divided only the top number by 3 and forgot to divide 15 by 3',
        'He subtracted 6 from the top',
        'Nothing, 3/15 is in simplest form',
        'He should have multiplied instead',
      ],
      answerIndex: 0,
      visual: { kind: 'bar', parts: 15, shaded: 9 },
      explanation: '15 must also be divided by 3: 15 ÷ 3 = 5, so the correct simplified fraction is 3/5.',
    },
    {
      id: 'res_m2_3',
      question: 'Which fraction correctly simplifies 4/16?',
      choices: [
        '1/4 (divide both 4 and 16 by 4)',
        '1/16 (divide only 4 by 4)',
        '2/16 (divide only 4 by 2)',
        '4/4 (divide only 16 by 4)',
      ],
      answerIndex: 0,
      visual: { kind: 'cake', parts: 16, shaded: 4 },
      explanation: '4 ÷ 4 = 1 and 16 ÷ 4 = 4, giving 1/4.',
    },
  ],
  m3: [
    {
      id: 'res_m3_1',
      question: 'Compare 2/3 and 3/4. Which is greater?',
      choices: [
        '3/4 (converted to twelfths, 9/12 > 8/12)',
        '3/4 solely because 3 is greater than 2',
        '2/3 because 3 is smaller than 4',
        'They are equal',
      ],
      answerIndex: 0,
      visual: { kind: 'two-cakes', left: { parts: 3, shaded: 2 }, right: { parts: 4, shaded: 3 } },
      explanation: 'Convert to a common denominator: 2/3 = 8/12 and 3/4 = 9/12. Comparing converted numerators reveals 3/4 is larger.',
    },
    {
      id: 'res_m3_2',
      question: 'Why is 7/12 smaller than 3/4, even though 7 is larger than 3?',
      choices: [
        'Because 3/4 is 9/12, and 9 twelfths is more than 7 twelfths',
        'Because 7 is an odd number',
        'Because 12 is greater than 4',
        '7/12 is actually larger than 3/4',
      ],
      answerIndex: 0,
      visual: { kind: 'two-cakes', left: { parts: 12, shaded: 7 }, right: { parts: 4, shaded: 3 } },
      explanation: 'A numerator only counts pieces, but the denominator defines piece size! 3/4 = 9/12, which exceeds 7/12.',
    },
    {
      id: 'res_m3_3',
      question: 'Liam claims 4/6 is smaller than 5/12 because 4 < 5. How should Liam check?',
      choices: [
        'Convert 4/6 to twelfths: 4/6 = 8/12, which is larger than 5/12',
        'Agree with Liam because 5 is greater than 4',
        'Subtract 5 - 4 and 12 - 6',
        'Convert both to whole numbers',
      ],
      answerIndex: 0,
      visual: { kind: 'two-cakes', left: { parts: 6, shaded: 4 }, right: { parts: 12, shaded: 5 } },
      explanation: '4 sixths is 8 twelfths, which is larger than 5 twelfths.',
    },
  ],
  m4: [
    {
      id: 'res_m4_1',
      question: 'Which piece of cake is larger: 1/4 of a cake or 1/8 of the exact same cake?',
      choices: [
        '1/4 because dividing into 4 pieces yields larger slices than dividing into 8',
        '1/8 because 8 is larger than 4',
        'Both slices are the exact same size',
        '1/8 because 8 has more factors',
      ],
      answerIndex: 0,
      visual: { kind: 'two-cakes', left: { parts: 4, shaded: 1 }, right: { parts: 8, shaded: 1 } },
      explanation: 'A larger denominator means the same whole is cut into more pieces, making each individual piece smaller.',
    },
    {
      id: 'res_m4_2',
      question: 'If you share an apple equally among 2 friends (1/2) vs 5 friends (1/5), who gets more apple?',
      choices: [
        'Each friend in the group of 2 gets more (1/2 > 1/5)',
        'Each friend in the group of 5 gets more because 5 is bigger',
        'Everyone gets the same amount',
        '1/5 is larger because fifths are wider',
      ],
      answerIndex: 0,
      visual: { kind: 'two-cakes', left: { parts: 2, shaded: 1 }, right: { parts: 5, shaded: 1 } },
      explanation: 'Fewer shares mean each person receives a significantly larger share.',
    },
    {
      id: 'res_m4_3',
      question: 'True or False: A fraction with denominator 10 is always smaller than a fraction with denominator 5.',
      choices: [
        'False; for example, 9/10 is larger than 1/5',
        'True; 10 is bigger so all tenths are smaller',
        'True; denominators always dictate fraction order',
        'False; denominators have no connection to fraction size',
      ],
      answerIndex: 0,
      visual: { kind: 'two-cakes', left: { parts: 10, shaded: 9 }, right: { parts: 5, shaded: 1 } },
      explanation: 'Denominator determines piece size, but you must also count how many pieces (numerator) you have!',
    },
  ],
  m5: [
    {
      id: 'res_m5_1',
      question: 'Find the sum: 1/5 + 2/5.',
      choices: ['3/5', '3/10', '2/25', '1/5'],
      answerIndex: 0,
      visual: { kind: 'cake', parts: 5, shaded: 3 },
      explanation: 'When denominators are already equal, add only the numerators (1 + 2 = 3) and keep the common denominator 5.',
    },
    {
      id: 'res_m5_2',
      question: 'Why is 1/4 + 1/4 equal to 2/4 and NOT 2/8?',
      choices: [
        'Because fourths represent piece size; 1 fourth + 1 fourth gives 2 fourths',
        'Because 4 + 4 = 4 in fraction rules',
        '2/8 is actually correct',
        'Because 1/4 cannot be added',
      ],
      answerIndex: 0,
      visual: { kind: 'two-cakes', left: { parts: 4, shaded: 1 }, right: { parts: 4, shaded: 1 } },
      explanation: 'Adding two quarters of a dollar gives 50 cents (2/4 = 1/2), not 2/8 (which would be only 25 cents!).',
    },
    {
      id: 'res_m5_3',
      question: 'Calculate: 2/7 + 3/7.',
      choices: ['5/7', '5/14', '6/49', '1/7'],
      answerIndex: 0,
      visual: { kind: 'bar', parts: 7, shaded: 5 },
      explanation: 'Add the counts: 2 + 3 = 5 sevenths. Never add the denominators together!',
    },
  ],
  m6: [
    {
      id: 'res_m6_1',
      question: 'Calculate: 1/3 + 1/6.',
      choices: ['3/6 (which simplifies to 1/2)', '2/6', '2/9', '1/6'],
      answerIndex: 0,
      visual: { kind: 'two-cakes', left: { parts: 3, shaded: 1 }, right: { parts: 6, shaded: 1 } },
      explanation: 'Convert 1/3 to sixths: 1/3 = 2/6. Then add: 2/6 + 1/6 = 3/6 = 1/2.',
    },
    {
      id: 'res_m6_2',
      question: 'To add 2/5 + 3/10, what is the first step?',
      choices: [
        'Convert 2/5 to 4/10 so both fractions share tenths',
        'Directly add 2 + 3 over 10 to get 5/10',
        'Add 2+3 and 5+10 to get 5/15',
        'Subtract 5 from 10',
      ],
      answerIndex: 0,
      visual: { kind: 'two-cakes', left: { parts: 5, shaded: 2 }, right: { parts: 10, shaded: 3 } },
      explanation: 'Multiply top and bottom of 2/5 by 2 to get 4/10. Then 4/10 + 3/10 = 7/10.',
    },
    {
      id: 'res_m6_3',
      question: 'What is 3/8 + 1/2?',
      choices: ['7/8 (since 1/2 = 4/8, and 3/8 + 4/8 = 7/8)', '4/8', '4/10', '3/16'],
      answerIndex: 0,
      visual: { kind: 'two-cakes', left: { parts: 8, shaded: 3 }, right: { parts: 2, shaded: 1 } },
      explanation: 'Convert 1/2 to 4/8 before adding: 3/8 + 4/8 = 7/8.',
    },
  ],
};

export function getFallbackTargetedQuestions(
  misconceptionId: string,
  count: number = 2,
  excludeIds: string[] = []
): any[] {
  const bank = SAMPLE_RESERVE_QUESTIONS[misconceptionId] || SAMPLE_RESERVE_QUESTIONS['m1'] || [];
  const available = bank.filter((q) => !excludeIds.includes(q.id));
  const pool = available.length >= count ? available : bank;
  return pool.slice(0, count);
}
