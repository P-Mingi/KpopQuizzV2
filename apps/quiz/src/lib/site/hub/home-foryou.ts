// Run O1, lot H2a: the data of "For you" (signed in) and "Start easy" (signed out). The body returns the design's sample; lot H2b
// computes them by the rules of the Plan (section 3 B) and keeps the shape (HomeForYou).

import type { HomeForYou } from './home-types';

export async function loadHomeForYou(): Promise<HomeForYou> {
  return {
    signedIn: [
      { site: 'kpop', label: 'Continue', title: 'SKZ true or false - only real STAYs pass', meta: '6 of 10 answered', progress: 60, path: '/q/skz-true-or-false' },
      { site: 'kpop', label: 'Next for a Stray Kids fan', title: 'Stray Kids albums and B-sides deep dive', meta: 'Medium · you scored 9/10 on the basics', path: '/q/stray-kids-albums-and-b-sides-deep-dive' },
      { site: 'anime', label: 'Stray Kids fans also play', title: 'First Steps into Jujutsu Kaisen', meta: 'Easy · same account, nothing to sign up for', bridge: true, path: '/q/first-steps-into-jujutsu-kaisen' },
    ],
    signedOut: [
      { site: 'kpop', label: 'First K-pop quiz', title: 'K-pop company quiz - match the group to the label', meta: 'Easy · 1.7k plays', path: '/q/kpop-company-quiz' },
      { site: 'anime', label: 'First anime quiz', title: 'Raising the Flag: One Piece Basics', meta: 'Easy · New', path: '/q/raising-the-flag-one-piece-basics' },
    ],
  };
}
