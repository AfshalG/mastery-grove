import path from 'node:path';
import { devices, expect, test } from '@playwright/test';
import { Tour } from './tour-kit';

// The feature tour: plays through everything in Mastery Grove v2 against the real Gemini, with captions, and
// records three clips (the main journey, a class room, a phone). tour/assemble.py cuts them into one video.

const W = 1440;
const H = 900;

test('the main journey', async ({ browser }) => {
  const t = await Tour.open(browser, 'main', { viewport: { width: W, height: H } });
  const { page } = t;
  const byId = (id: string) => page.getByTestId(id);
  try {
    // ---- The start screen ------------------------------------------------------------------------------------------
    await t.wait(1200);
    await t.caption('Mastery Grove', 'A 3D forest where every question on a worksheet is a tree', 3800);
    await t.point(byId('join-class'));
    await t.caption('Join your class with a code', 'Everyone in the class walks the same forest, together', 3200);
    await t.point(byId('grow-world-btn'));
    await t.caption('Or grow a forest from any topic, worksheet text or photo', 'Gemini builds it. We’ll do that at the end.', 3200);
    await t.caption('First, the fractions forest');
    await t.click(byId('play-sample-btn'));
    t.mark('forest');

    // ---- The forest ---------------------------------------------------------------------------------------------------
    await t.canvasReady();
    await t.caption('A storybook forest', 'Each grove is one idea from the worksheet. Its trees are the questions.', 3500);
    await t.hold('ArrowUp', 1600);
    await t.wait(500);
    await t.point(byId('mission-panel').filter({ visible: true }));
    await t.caption('Missions for this grove', 'Grow 3 trees to build the bridge, help Mia, then cross to the next grove', 3800);
    await t.caption(
      'Byte’s golden beam',
      'Byte, the Gemini tutor, predicts every question. The beam marks the best next one for this kid.',
      4000,
    );

    // ---- A right answer, by walking onto a stone -------------------------------------------------------------------------
    const openTree = async (id: string) => {
      if (!(await byId(`quest-tree-${id}`).isVisible())) await t.click(byId('toggle-quest-list-btn'), 700);
      await t.click(byId(`quest-tree-${id}`), 300);
      await t.until((s) => s.selectedTree?.id === id, 30_000);
      await t.wait(1400);
    };
    const walkOntoStone = async (choice: number) => {
      const s = await t.state();
      const stone = s.answerStones[choice];
      const at = await t.project([stone.x, 0.35, stone.z]);
      await t.clickAt(at.x, at.y, 300);
      await t.until((st) => st.showExplanationModal, 20_000);
    };

    await openTree('t1_1');
    await t.caption('Answer by walking onto a stone', 'But first the fox asks: how sure are you?', 3000);
    await t.click(byId('confidence-fairly-sure'), 600);
    await walkOntoStone(0);
    await t.wait(1200);
    await t.caption('Right, so the tree blossoms', 'The line underneath compares how sure you were with how it went', 4200);
    await t.click(byId('continue-btn'), 800);

    // ---- A wrong answer: Byte works out the thinking ---------------------------------------------------------------------
    await openTree('t1_2');
    await t.caption('Now a wrong answer, on purpose', '2/9: dividing only the top number', 2600);
    await t.click(byId('confidence-very-sure'), 500);
    await walkOntoStone(0);
    await t.caption('Byte comes over', 'Gemini works out the thinking behind that exact wrong answer', 0);
    await t.until((s) => !s.isDiagnosing, 60_000);
    await t.wait(1800);
    await t.caption('Byte’s guess, checked with the kid', 'The kid says yes or no, and Byte remembers it for next time', 4200);
    await t.click(byId('confirm-thought-yes'), 1000);
    await t.caption('It comes back later as a sapling', 'and Gemini writes new questions aimed at that exact mix-up', 3600);
    await t.click(byId('continue-btn'), 1500);
    await t.caption('“Made for you” trees', 'Pink lanterns mark questions written for this kid’s mix-up', 3000);

    // ---- Hands-on: serve the cake -----------------------------------------------------------------------------------------
    await openTree('t1_serve');
    await t.caption('Hands-on: serve 2/3 of the cake', 'Tap slices on the cake itself', 2600);
    await t.click(byId('confidence-fairly-sure'), 400);
    const serveTree = (await t.state()).selectedTree;
    // The top of each slice, on the cake that floats 4.7 over the tree and leans back 0.25 rad toward the camera.
    const lean = 0.25;
    for (const slice of [4, 5]) {
      const angle = ((slice + 0.5) / 6) * 2 * Math.PI;
      const local = { x: Math.cos(angle) * 0.55, y: 0.45, z: -Math.sin(angle) * 0.55 };
      const at = await t.project([
        serveTree.position[0] + local.x,
        serveTree.position[1] + 4.7 + local.y * Math.cos(lean) - local.z * Math.sin(lean),
        serveTree.position[2] + local.y * Math.sin(lean) + local.z * Math.cos(lean),
      ]);
      await t.clickAt(at.x, at.y, 700);
    }
    await t.click(byId('serve-submit-btn'), 1600);
    await t.caption(
      'A wrong serve names the exact mistake',
      'Plain rules, not a guess: 2 slices is the top number, not 2/3 of the cake',
      4500,
    );
    await t.click(byId('continue-btn'), 800);

    // ---- Or tap an answer in the card ---------------------------------------------------------------------------------------
    await openTree('t1_3');
    await t.caption('Or tap an answer in the card', 'Stones and card buttons do the same thing', 2400);
    await t.click(byId('confidence-fairly-sure'), 400);
    await t.click(byId('choice-2'), 1200);
    await t.until((s) => s.showExplanationModal, 20_000);
    await t.wait(1500);
    await t.click(byId('continue-btn'), 800);

    // ---- The bridge builds as the grove grows ------------------------------------------------------------------------
    const layout = (await t.state()).layout;
    const s0 = layout.streams[0];
    await t.caption('Every tree grown lays planks on the bridge', 'Two grown: the bridge to the next grove is two thirds built', 0);
    await t.call('moveTo', [s0.bridge.x + 0.5, 0, s0.z + s0.bridge.halfLength + 2.5]);
    await t.until((s) => s.targetPosition === null, 30_000);
    await t.wait(2600);
    await t.caption('One more tree…', 'answered in the grove', 1200);
    await t.call('answerTreeQuestion', 't1_4', 3, 'Fairly sure');
    await t.until((s) => !s.isDiagnosing, 20_000);
    await t.call('dismissFeedback');
    await t.wait(600);
    await t.caption('The bridge is built, and the next grove opens', 'Learning is the way forward, plank by plank', 4500);

    // ---- Mia ------------------------------------------------------------------------------------------------------------
    await t.caption('Mia needs help', 'She’s stuck on the same mix-up. Explaining it is the best test of knowing it.', 3200);
    await t.click(byId('mission-mia'), 500);
    await t.until((s) => s.openTeachSpot === 'c1', 30_000);
    await t.wait(1500);
    await t.caption('Mia holds up her working', 'The kid can type, or say it out loud: Gemini listens', 3000);
    await t.point(byId('mia-record'), 1600);
    await t.type(byId('mia-text'), 'You just need to make the numbers smaller.');
    await t.click(byId('mia-send'), 300);
    await t.caption('Gemini marks it against a rubric', 'Plain code decides whether Mia gets it', 0);
    await t.until((s) => !s.teachBackPending, 60_000);
    await t.wait(1200);
    await t.caption('Not yet: Mia asks a question back', 'The kid gets another go', 4200);
    await t.click(byId('mia-try-again'), 400);
    await t.type(
      byId('mia-text'),
      'Mia, you can’t halve just the top. Whatever you do to the top, do to the bottom: divide 4 and 8 by 4 and you get 1/2. 2/8 is less than 4/8, so it isn’t the same amount.',
    );
    await t.click(byId('mia-send'), 300);
    await t.until((s) => !s.teachBackPending, 60_000);
    await t.wait(1500);
    await t.caption('Mia gets it', 'and the kid sees which ideas they got across', 4500);
    await t.click(byId('mia-done'), 1500);

    // ---- Over the bridge, and the build-the-bridge challenge -----------------------------------------------------------
    await t.caption('Cross the bridge', 'Byte’s beam now points into the next grove', 0);
    await t.click(byId('mission-cross'), 300);
    await t.until((s) => s.visitedGroves.includes('c2'), 45_000);
    await t.wait(800);
    await openTree('t2_serve');
    await t.caption('Build the bridge: lay 3/4 of the planks', 'Tap the plank spots on the little bridge', 2600);
    await t.click(byId('confidence-very-sure'), 400);
    const buildTree = (await t.state()).selectedTree;
    for (let i = 0; i < 6; i++) {
      const x = -1.55 + ((i + 0.5) * 3.1) / 8;
      const y = 0.32 * Math.cos((x / 1.55) * (Math.PI / 2)) + 0.05;
      const at = await t.project([
        buildTree.position[0] + x,
        buildTree.position[1] + 4.7 + y * Math.cos(0.25),
        buildTree.position[2] + y * Math.sin(0.25),
      ]);
      await t.clickAt(at.x, at.y, 350);
    }
    await t.wait(500);
    await t.click(byId('serve-submit-btn'), 1500);
    await t.caption('6 of 8 planks is 3/4', 'Just right', 3200);
    await t.click(byId('continue-btn'), 800);

    // ---- Next session: the Memory Quest ----------------------------------------------------------------------------------
    await t.click(byId('teacher-btn'), 1200);
    await t.caption('Next day: the teacher starts a new session', 'Trees the kid grew come back later, to check they remember', 2600);
    await t.click(byId('next-session-btn'), 1400);
    await t.click(byId('back-to-forest-btn'), 1200);
    await openTree('t1_1');
    await t.caption('A memory check (teal lantern)', 'The answers stay hidden until the kid has one in mind', 3800);
    await t.click(byId('reveal-choices-btn'), 1200);
    await t.click(byId('confidence-very-sure'), 400);
    await walkOntoStone(0);
    await t.wait(1200);
    await t.caption('Remembered', 'It moves up a box, and comes back less often', 3200);
    await t.click(byId('continue-btn'), 800);

    // ---- The teacher view ------------------------------------------------------------------------------------------------
    await t.click(byId('teacher-btn'), 1500);
    await t.caption('The teacher view', 'Every student’s mix-ups, from what they actually did (samples labelled)', 3500);
    await page.mouse.wheel(0, 700);
    await t.wait(1600);
    await t.caption('The class map', 'Which mix-ups each student has, overcome or still active', 3500);
    await t.click(byId('tab-flags'), 1500);
    await t.caption('Just flagged', 'What each student was thinking, in their own words where they gave them', 3800);
    await t.click(byId('tab-heatmap'), 800);
    await t.click(byId('select-student-student-you'), 1000);
    await t.point(byId('own-words'), 800);
    await t.caption('In their own words', 'What the kid told Mia, which ideas they covered, and what they missed', 4200);
    await t.click(byId('generate-student-intervention-btn'), 500);
    await t.caption('A lesson plan for this kid', 'Gemini writes a 5-minute mini-lesson for their mix-up', 0);
    await expect(byId('intervention-bullets').first()).toBeVisible({ timeout: 90_000 });
    await t.wait(4200);
    await t.click(byId('close-intervention-modal-btn'), 800);
    await t.click(byId('rundown-btn'), 500);
    await t.caption('What to reteach tomorrow', 'Gemini reads the whole class’s mix-ups and ranks them', 0);
    await expect(byId('copy-rundown-btn').first()).toBeVisible({ timeout: 90_000 });
    await t.wait(4800);
    await t.click(byId('close-rundown-btn'), 800);
    await t.click(byId('deploy-quest-m2'), 500);
    await t.caption('Send a quest to the forest', 'Gemini writes focus questions for one mix-up, and they grow in the kid’s forest', 0);
    await t.until((s) => s.trees.some((tr: any) => tr.isTeacherDeployed), 90_000);
    await t.wait(2500);
    await t.click(byId('back-to-forest-btn'), 1500);
    await t.caption('“From your teacher” trees', 'Violet lanterns', 3500);

    // ---- The reading forest ---------------------------------------------------------------------------------------------
    await t.click(byId('new-world-btn'), 1200);
    await t.click(byId('play-reading-btn'), 500);
    t.mark('reading');
    await t.canvasReady();
    await t.caption('Reading worlds look different', 'An autumn wood, with passages to read and reading mix-ups', 3800);
    await openTree('rd1_1');
    await t.point(byId('passage-card'), 500);
    await t.caption('Read the passage, then answer', 'The book floats over the tree', 3800);
    await t.click(byId('confidence-very-sure'), 400);
    await t.click(byId('choice-1'), 400);
    await t.caption('A detail, not the main idea', 'Byte names the reading mix-up', 0);
    await t.until((s) => !s.isDiagnosing, 60_000);
    await t.wait(4500);
    await t.click(byId('continue-btn'), 800);

    // ---- Grow a forest from a worksheet photo ------------------------------------------------------------------------------
    await t.click(byId('new-world-btn'), 1200);
    await t.click(byId('tab-file'), 500);
    await page.setInputFiles('#worksheet-file', path.resolve('tour/worksheet-decimals.jpg'));
    await t.caption('Snap a photo of a worksheet', 'Here, a Primary 4 decimals worksheet', 2800);
    await t.click(byId('grow-world-btn'), 300);
    t.mark('grow-start');
    await t.caption('Gemini reads it and plants a forest', 'Concepts, mix-ups, questions, and a Mia for each grove', 0);
    await t.until((s) => s.screen === 'game' && s.world?.subject !== 'Primary 4 English: Reading', 180_000);
    t.mark('grow-done');
    await t.canvasReady();
    await t.caption('A new forest from the worksheet', 'Every question points back to the line it came from', 3000);
    const firstTree = (await t.state()).objective;
    if (firstTree?.kind === 'tree') {
      await openTree(firstTree.treeId);
      if ((await page.getByTestId('citation').count()) > 0) await t.point(page.getByTestId('citation').first(), 500);
      await t.wait(3500);
    }
    await t.caption('Mastery Grove', 'github.com/AfshalG/mastery-grove', 4000);
  } finally {
    await t.finish();
  }
});

test('a class room', async ({ browser }) => {
  const teacher = await Tour.open(browser, 'class-teacher', { viewport: { width: W, height: H } });
  const kids: Tour[] = [];
  try {
    await teacher.click(teacher.page.getByTestId('play-sample-btn'), 1500);
    await teacher.click(teacher.page.getByTestId('teacher-btn'), 1000);
    await teacher.caption('Play together', 'The teacher opens a class room for this forest', 2000);
    await teacher.click(teacher.page.getByTestId('open-room-btn'), 1200);
    const code = (await teacher.page.getByTestId('room-code').textContent())!.trim();
    await teacher.caption(`Class code ${code}`, 'Students type it on their own devices', 0);

    const join = async (name: string, file: string) => {
      const kid = await Tour.open(browser, file, { viewport: { width: W, height: H } });
      await kid.caption(`${name} joins`, 'Code and first name');
      await kid.type(kid.page.getByTestId('class-code-input'), code);
      await kid.type(kid.page.getByTestId('class-name-input'), name);
      await kid.click(kid.page.getByTestId('join-class-btn'), 300);
      kids.push(kid);
      await kid.canvasReady();
      return kid;
    };
    const aisha = await join('Aisha', 'class-aisha');
    const wei = await join('Wei Jie', 'class-wei');
    teacher.mark('both-in');
    aisha.mark('both-in');
    wei.mark('both-in');

    await aisha.caption('Aisha', 'sees Wei Jie in her forest');
    await wei.caption('Wei Jie', 'sees Aisha walk up the trail');
    await teacher.caption('The roster fills in, live', 'Each student’s own learner model, as they play');
    await aisha.hold('ArrowUp', 2200);
    await wei.hold('ArrowRight', 900);
    await wei.hold('ArrowUp', 1400);
    await aisha.wait(1500);

    await aisha.call('answerTreeQuestion', 't1_1', 1, 'Very sure');
    await aisha.until((s) => !s.isDiagnosing, 60_000);
    await aisha.wait(3000);
    await aisha.call('dismissFeedback');
    await teacher.caption('Aisha’s mix-up shows up for the teacher', 'Seconds after she answers', 3500);

    await teacher.caption('The teacher sends a quest to the whole class', 'Gemini writes it once; every student gets it', 0);
    await teacher.click(teacher.page.getByTestId('deploy-quest-m2'), 300);
    await aisha.until((s) => s.trees.some((tr: any) => tr.isTeacherDeployed), 90_000);
    await wei.until((s) => s.trees.some((tr: any) => tr.isTeacherDeployed), 30_000);
    await aisha.caption('Your teacher sent new trees', 'Violet lanterns, in both forests');
    await wei.caption('Your teacher sent new trees', 'Violet lanterns, in both forests');
    await wei.wait(4500);
    for (const tour of [teacher, aisha, wei]) tour.mark('done');
  } finally {
    for (const kid of kids) await kid.finish();
    await teacher.finish();
  }
});

test('on a phone', async ({ browser }) => {
  const { defaultBrowserType: _webkit, ...iphone } = devices['iPhone 13'];
  // The recorder draws the page at its CSS size, so the video is the phone's own 390x844 (the cut shows it about 1:1).
  const phone = await Tour.open(browser, 'phone', { ...iphone });
  const byId = (id: string) => phone.page.getByTestId(id);
  try {
    await phone.wait(800);
    await phone.caption('On a phone', 'The same forest, made for thumbs', 2500);
    await phone.click(byId('play-sample-btn'), 500);
    await phone.canvasReady();
    await phone.point(byId('mission-panel').filter({ visible: true }), 400);
    await phone.caption('Missions fold into one line', 'Tap to see them all', 2200);
    await phone.click(byId('mission-panel').filter({ visible: true }).getByRole('button').first(), 1200);
    await phone.click(byId('mission-grow').filter({ visible: true }), 300);
    await phone.until((s) => s.selectedTree !== null, 30_000);
    await phone.wait(1600);
    await phone.caption('Questions come up as a sheet', 'The stones stay in view above it', 3200);
    await phone.click(byId('confidence-fairly-sure'), 400);
    const s = await phone.state();
    await phone.click(byId(`choice-${s.selectedTree.answerIndex}`), 1500);
    await phone.until((st) => st.showExplanationModal, 20_000);
    await phone.wait(1800);
    await phone.click(byId('continue-btn'), 800);
    await phone.caption('Walk with the pad, hop with the button', '', 0);
    await phone.page.getByTestId('dpad-up').dispatchEvent('pointerdown');
    await phone.wait(1500);
    await phone.page.getByTestId('dpad-up').dispatchEvent('pointerup');
    await phone.click(byId('jump-btn'), 1500);
  } finally {
    await phone.finish();
  }
});
