# Games hub, SEO gates (PART B)

Checked against the built static HTML served by `next start` on :3021.

1. Canonical unchanged. `<link rel="canonical" href="https://kpopquiz.org/games"/>`.
2. hreflang unchanged. `en -> /games`, `pt-BR -> /pt/games`, `x-default -> /games`.
3. Title/description unchanged.
   `<title>K-pop Games: Blind Test, This or That, Which Member | KpopQuiz</title>`.
4. JSON-LD ItemList gains Tier Lists after Duel. Positions from the built HTML:
   ```
   1 Which K-pop Member Are You?  -> /personality
   2 K-pop Blind Test             -> /blindtest
   3 This or That                 -> /games/this-or-that/all
   4 Name Them All                -> /games/name-them-all
   5 Sort It                      -> /games/sort-it
   6 Match-Up                     -> /games/match-up
   7 Duel 1v1                     -> /battle
   8 K-pop Tier Lists             -> /tier-list      <- added after Duel
   9 K-pop Fan Rankings           -> /rankings       <- shifted 8 -> 9
   ```
5. Cards stay crawlable server HTML. All eight card test ids
   (`card-name-them-all` ... `card-kpop-idle`) are present in the prerendered
   `/games` HTML (the client filter only toggles visibility; it never removes a
   card from the DOM). The route is `○ Static`, so this HTML is what crawlers get.
