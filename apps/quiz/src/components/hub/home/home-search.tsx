// Run O1, lot H2c: the search button of the top bar, a link to the canonical search page of KpopQuiz, named after that site ("Search KpopQuiz").
// Lot HUB-HOT-B (2026-11-22): the All / KpopQuiz / OtakuQuiz filter of "Popular this week" is gone, and with it the context that made this button
// follow it; the button keeps what it showed on the first render, the search of KpopQuiz, and its name still says which site it opens.
import { SearchIcon } from './home-icons';

export function HomeSearch({ href, label }: { href: string; label: string }): React.ReactElement {
  return (
    <a href={href} aria-label={label} className="hub-h2-iconbtn hub-h2-btn"><SearchIcon /></a>
  );
}
