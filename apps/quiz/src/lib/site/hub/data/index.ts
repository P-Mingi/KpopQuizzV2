// Run O1, lot H2b: the real data of the new FanQuiz home, one module per block. Each `get*` is `async (opts) => Shape | null`, cached
// one hour under its own tag (`hub:<block>`; For you five minutes per fan), and never throws: when the database fails it answers the last
// good value of the server instance, else null, and the card then disappears. Shapes: ./types.

export type * from './types';
export { getBlindtest } from './blindtest';
export { getCrossover } from './crossover';
export { getDailyQuizzes } from './daily';
export { getDebate } from './debate';
export { getDidYouKnow } from './did-you-know';
export { getDoors } from './doors';
export { getForYou } from './for-you';
export { getHot } from './hot';
export { getRotation } from './rotation';
export { getSixtySeconds } from './sixty-seconds';
export { getStartEasy } from './start-easy';
export { getSurprise } from './surprise';
export { pickSurprise } from './surprise-pick';
export { getTopFans } from './top-fans';
