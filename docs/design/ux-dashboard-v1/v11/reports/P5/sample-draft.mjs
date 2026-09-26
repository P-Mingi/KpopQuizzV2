// The prototype's create sample as a funnel draft (lib/create-draft.ts shape), for the
// report screenshots and the e2e spec only: it lives in the test browser's
// localStorage and never reaches a server (the specs stub every write).

export const SAMPLE_DRAFT = {
  title: 'Ultimate BTS era quiz - only real ARMYs survive',
  group_slug: 'bts',
  newGroup: null,
  difficulty: 'medium',
  language: 'en',
  quiz_type: 'multiple_choice',
  cover: '/idols/BTS.jpg',
  coverRights: true,
  creatorNote: 'From the first Billboard 200 number one to the Grammy stage, eight questions across every era. Casuals will not survive.',
  questions: [
    { question: "What was BTS's first album to reach #1 on the Billboard 200?", options: ['Love Yourself: Tear', 'Wings', 'Love Yourself: Answer', 'Map of the Soul: Persona'], correct: 0, fun_fact: 'Love Yourself: Tear topped the Billboard 200 in May 2018.' },
    { question: 'Which BTS song was their first to be performed at the Grammy Awards?', options: ['Dynamite', 'Boy With Luv', 'Old Town Road (remix)', 'Butter'], correct: 0, fun_fact: 'BTS performed Dynamite at the 63rd Grammy Awards in March 2021.' },
    { question: 'Map of the Soul: 7 is named after what?', options: ['Seven years together', 'Seven members', 'A Jung book', 'A film'], correct: 0, fun_fact: 'The 7 marks seven members and seven years together.' },
    { question: "Which song was BTS's first fully Korean-language #1 on the Hot 100?", options: ['Life Goes On', 'Dynamite', '', ''], correct: 0, fun_fact: '' },
  ],
};

/** localStorage writes for a draft at a step (keys of lib/create-draft.ts). */
export function draftInit(step, draft = SAMPLE_DRAFT) {
  return { draft: JSON.stringify({ ...draft, updatedAt: Date.now() }), step: String(step) };
}
