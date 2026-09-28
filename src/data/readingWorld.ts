import type { WorldData } from '../types/game';

// A sample reading forest (Primary 4 English: reading comprehension), in the autumn wood. The passages are short
// and written for this game. Each wrong choice is one of the grove's two mix-ups.
export const SAMPLE_READING_WORLD: WorldData = {
  subject: 'Primary 4 English: Reading',
  concepts: [
    { id: 'r1', name: 'Finding the main idea', questName: 'The Big Idea Hollow', prerequisites: [] },
    { id: 'r2', name: 'Reading between the lines', questName: 'The Whispering Thicket', prerequisites: ['r1'] },
    { id: 'r3', name: 'Words in context', questName: 'The Word Weaver’s Glade', prerequisites: ['r1', 'r2'] },
  ],
  misconceptions: [
    { id: 'rm1', conceptId: 'r1', label: 'picks an interesting detail instead of the main idea' },
    { id: 'rm2', conceptId: 'r1', label: 'thinks the main idea is always the first sentence' },
    { id: 'rm3', conceptId: 'r2', label: 'only trusts what the text says word for word, so won’t infer' },
    { id: 'rm4', conceptId: 'r2', label: 'answers from their own experience instead of clues in the text' },
    { id: 'rm5', conceptId: 'r3', label: 'uses the most common meaning of a word and ignores the sentence' },
    { id: 'rm6', conceptId: 'r3', label: 'guesses a word’s meaning from how it looks, not from clues around it' },
  ],
  trees: [
    // The Big Idea Hollow (r1)
    {
      id: 'rd1_1',
      conceptId: 'r1',
      passage: {
        title: 'Flowers of the night',
        text: 'Have you ever smelled flowers at night? The moonflower stays shut all day and opens its white petals after sunset. Its pale colour glows in the moonlight, so moths can find it. Evening primrose blooms late too, and its sweet smell guides insects through the dark. Some flowers are made for the night, when their helpers are awake.',
      },
      question: 'What is this passage mostly about?',
      choices: ['Some flowers bloom at night, when the insects that help them are awake', 'Moonflowers have white petals', 'Smelling flowers at night', 'Moths like moonlight'],
      answerIndex: 0,
      explanation: 'Every sentence is about flowers that open at night for night insects. White petals and moths are details.',
      citation: null,
      state: 'unanswered',
    },
    {
      id: 'rd1_2',
      conceptId: 'r1',
      passage: {
        title: 'Busy builders',
        text: 'With their strong front teeth, beavers cut down young trees and drag the logs to a stream. They pile up sticks, stones and mud to make a dam. The dam slows the water and makes a quiet pond, where the beavers build a lodge with an underwater door. Beavers build their own safe home, one log at a time.',
      },
      question: 'Which sentence best tells the main idea?',
      choices: ['Beavers have strong front teeth', 'Beavers build their own safe home, one log at a time', 'The dam makes a quiet pond', 'Beavers drag logs to a stream'],
      answerIndex: 1,
      explanation: 'The last sentence sums up the whole passage. The others are steps and details.',
      citation: null,
      state: 'unanswered',
    },
    {
      id: 'rd1_3',
      conceptId: 'r1',
      passage: {
        title: 'The library robot',
        text: 'At Park Lane School, the library has a new helper. It is a small robot called Dot. Dot rolls between the shelves at night and puts returned books back in the right places. In the morning it lights up green if a book is ready to borrow. Thanks to Dot, the librarian has more time to read with children.',
      },
      question: 'What is the main idea?',
      choices: ['Dot lights up green', 'Park Lane School has a library', 'A robot called Dot helps the library by putting books away', 'The librarian reads with children'],
      answerIndex: 2,
      explanation: 'The passage is about how Dot helps. Lighting up green is one detail.',
      citation: null,
      state: 'unanswered',
    },
    {
      id: 'rd1_4',
      conceptId: 'r1',
      passage: {
        title: 'A penguin dad',
        text: 'It is winter in Antarctica and the wind is freezing. The emperor penguin dad stands still for two months with an egg on his feet. A warm fold of skin covers the egg. He eats nothing at all. When the chick hatches, the mum comes back from the sea with food.',
      },
      question: 'What is this passage mostly about?',
      choices: ['Antarctica is windy in winter', 'A penguin dad keeps the egg warm for months until it hatches', 'Penguin mums go to the sea', 'Penguins eat fish'],
      answerIndex: 1,
      explanation: 'Most sentences are about the dad looking after the egg. The wind is the setting, not the main idea.',
      citation: null,
      state: 'unanswered',
    },

    // The Whispering Thicket (r2)
    {
      id: 'rd2_1',
      conceptId: 'r2',
      passage: {
        title: 'Getting ready',
        text: 'Mei looked out of the window and frowned. She pulled on her boots, took the big umbrella from the hook and zipped her coat right up to her chin. “Don’t forget your scarf,” her dad called.',
      },
      question: 'What is the weather most likely like?',
      choices: ['Cold and rainy', 'We can’t tell, because the passage never says', 'Sunny, because most days are sunny', 'Hot and dry'],
      answerIndex: 0,
      explanation: 'Boots, an umbrella, a zipped coat and a scarf are clues: cold and wet.',
      citation: null,
      state: 'unanswered',
    },
    {
      id: 'rd2_2',
      conceptId: 'r2',
      passage: {
        title: 'Muddy paws',
        text: 'When Sam came home, the plant on the shelf was knocked over and there were muddy paw prints across the new sofa. Tiger, the cat, was asleep on the rug with mud on her white socks.',
      },
      question: 'Who most likely knocked over the plant?',
      choices: ['Nobody knows: the text doesn’t say who did it', 'Sam’s little brother, because little brothers break things', 'Tiger, the cat', 'The wind'],
      answerIndex: 2,
      explanation: 'The paw prints and the mud on Tiger’s paws are clues that point to Tiger.',
      citation: null,
      state: 'unanswered',
    },
    {
      id: 'rd2_3',
      conceptId: 'r2',
      passage: {
        title: 'Behind the curtain',
        text: 'Ravi’s hands shook as he waited behind the curtain. He could hear the crowd talking. He whispered his first line again and again, and his mouth felt dry.',
      },
      question: 'How is Ravi most likely feeling?',
      choices: ['Bored, because waiting is boring', 'Nervous', 'We can’t know: the text never names his feelings', 'Sleepy'],
      answerIndex: 1,
      explanation: 'Shaking hands, repeating his line and a dry mouth are clues that he is nervous.',
      citation: null,
      state: 'unanswered',
    },
    {
      id: 'rd2_4',
      conceptId: 'r2',
      passage: {
        title: 'The last slice',
        text: 'There was one slice of cake left. Priya looked at it, then at her little brother’s sad face. She smiled, cut the slice in two and slid the bigger half across the table to him.',
      },
      question: 'What does this tell us about Priya?',
      choices: ['She is kind', 'She doesn’t like cake', 'Nothing: it only says what she did', 'She is hungry, because cake makes people hungry'],
      answerIndex: 0,
      explanation: 'Giving her brother the bigger half is a clue that she is kind.',
      citation: null,
      state: 'unanswered',
    },

    // The Word Weaver’s Glade (r3)
    {
      id: 'rd3_1',
      conceptId: 'r3',
      passage: {
        title: 'After the hike',
        text: 'After the long hike up the hill, the children were beat. They flopped down on the grass and didn’t move for an hour.',
      },
      question: 'What does “beat” mean in this sentence?',
      choices: ['Hit again and again', 'Very tired', 'Won a game', 'A rhythm in music'],
      answerIndex: 1,
      explanation: 'They flopped down and didn’t move: the clues show “beat” means very tired here.',
      citation: null,
      state: 'unanswered',
    },
    {
      id: 'rd3_2',
      conceptId: 'r3',
      passage: {
        title: 'The lighthouse',
        text: 'The lighthouse keeper kept a log of every ship that passed: its name, the time and the weather.',
      },
      question: 'What is a “log” in this sentence?',
      choices: ['A piece of a tree trunk', 'A written record', 'A long line of ships', 'To cut down trees'],
      answerIndex: 1,
      explanation: 'He wrote down names, times and weather: here a log is a written record.',
      citation: null,
      state: 'unanswered',
    },
    {
      id: 'rd3_3',
      conceptId: 'r3',
      passage: {
        title: 'Grandma’s soup',
        text: 'Grandma’s soup was so bland that Leo added salt, pepper and a big spoon of chilli.',
      },
      question: 'What does “bland” mean?',
      choices: ['Blended until smooth', 'Too spicy', 'Without much taste', 'Grand and big'],
      answerIndex: 2,
      explanation: 'Leo added salt, pepper and chilli because the soup had little taste.',
      citation: null,
      state: 'unanswered',
    },
    {
      id: 'rd3_4',
      conceptId: 'r3',
      passage: {
        title: 'Bath time',
        text: 'The puppy was reluctant to get into the bath. It pulled back on its lead and hid behind the sofa.',
      },
      question: 'What does “reluctant” mean?',
      choices: ['Excited', 'Coming back again', 'Not wanting to', 'Tired'],
      answerIndex: 2,
      explanation: 'Pulling back and hiding are clues: the puppy did not want to.',
      citation: null,
      state: 'unanswered',
    },
  ],
  teachSpots: [
    {
      conceptId: 'r1',
      misconceptionId: 'rm2',
      puzzledThought: 'The main idea is always the first sentence, so the night flowers story is about smelling flowers. Right?',
      board: '1st line = main?',
      rubricPoints: [
        'The main idea is what the whole passage is about',
        'Check that most sentences fit the main idea',
        'The first sentence can be a hook, like a question',
      ],
    },
    {
      conceptId: 'r2',
      misconceptionId: 'rm3',
      puzzledThought: 'The story never says Mei is cold, so we can’t know what the weather is. Can we?',
      board: 'not said = ??',
      rubricPoints: ['Use clues in the text to work it out', 'Boots, an umbrella and a scarf are clues', 'The clues show it is cold and rainy'],
    },
    {
      conceptId: 'r3',
      misconceptionId: 'rm5',
      puzzledThought: '“Beat” means to hit something. So after the hike, the children hit the grass?',
      board: 'beat = hit?',
      rubricPoints: ['A word can have more than one meaning', 'Read the words around it for clues', 'Here beat means very tired'],
    },
  ],
};

/** Tells which wrong choice shows which mix-up, for the sample reading forest (the order of choices above). */
export const READING_CHOICE_MISCONCEPTIONS: Record<string, Record<number, string>> = {
  rd1_1: { 1: 'rm1', 2: 'rm2', 3: 'rm1' },
  rd1_2: { 0: 'rm2', 2: 'rm1', 3: 'rm1' },
  rd1_3: { 0: 'rm1', 1: 'rm2', 3: 'rm1' },
  rd1_4: { 0: 'rm2', 2: 'rm1', 3: 'rm1' },
  rd2_1: { 1: 'rm3', 2: 'rm4', 3: 'rm4' },
  rd2_2: { 0: 'rm3', 1: 'rm4', 3: 'rm4' },
  rd2_3: { 0: 'rm4', 2: 'rm3', 3: 'rm4' },
  rd2_4: { 1: 'rm4', 2: 'rm3', 3: 'rm4' },
  rd3_1: { 0: 'rm5', 2: 'rm5', 3: 'rm5' },
  rd3_2: { 0: 'rm5', 2: 'rm6', 3: 'rm5' },
  rd3_3: { 0: 'rm6', 1: 'rm5', 3: 'rm6' },
  rd3_4: { 0: 'rm5', 1: 'rm6', 3: 'rm5' },
};
