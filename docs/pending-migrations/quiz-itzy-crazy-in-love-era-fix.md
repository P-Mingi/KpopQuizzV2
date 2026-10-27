# Fix of /q/itzy-the-crazy-in-love-era (owner request, 2026-10-25)

The live quiz "ITZY: The CRAZY IN LOVE Era" (bank quiz of 2026-04-12) is corrected, not unpublished. The owner asked
for one fix (Q7: CRAZY IN LOVE was not ITZY's first Billboard 200 album); every question was then checked at its
source. Six of the ten cited URLs are on soompi.com: five answer 404 and the sixth redirects to a Soompi song database
page that says nothing about the claim; both YouTube videos are unavailable, and the two twitter.com sources are not
allowed sources. The check found a wrong release date (Q1), a wrong or doubled answer on a member's
role (Q4), a song that is not a B-side of the album and an option by another group (Q8), and two subjective questions
with no source (Q3, Q9). Fun facts lost their quotation marks, double hyphens and unsourced claims, and no question or
fun fact names the answer of another question (the page shuffles the questions; Q9 named LOCO, the answer of Q2).
Same 10 questions in the same order, every right answer at the same position (1,1,1,3,1,2,0,0,0,1).

SQL: `quiz-itzy-crazy-in-love-era-fix.sql` and its rollback, owner-gated. The guard reads the md5 of the live content
(read on 2026-10-25, the same values in production: quiz `de0a37721c70b6a5513c8ed77bab8743`, bank row
`afb896ed9e6b4e8a760efd448aafd16c`) and of the corrected content (quiz `814d81f7d3a45d366bf14fca805eb3ba`, bank row
`93e0174f935d77a793f019e35b2c2079`). Tested on a local Postgres loaded with the live content (same md5 as production):
the fix changes both rows and leaves `updated_at` alone, a second run is refused by the guard and changes nothing, the
rollback restores the exact live content (and the empty bank notes), and a second rollback is refused.

Independent check: a second reader answered each corrected question from the pages before looking at the marked
answer, and checked every wrong option and every fun fact: 10 OK, 0 FIX (track list of the album against Guess Who,
the three music show wins of Loco, the Billboard 200 positions in Billboard's own article, the 17.1 million first-day
views in Billboard, Yuna's answer in NME).

## Q1: changed

- Before: When was ITZY's debut full album 'CRAZY IN LOVE' released? Answer: July 2021 (options: 2020, July 2021, 2022, 2023). Fun fact: ITZY released their debut full album 'CRAZY IN LOVE' on July 19, 2021, over two years after their debut.
- After: When did ITZY release their first full album, CRAZY IN LOVE? Answer: September 2021 (options: July 2021, September 2021, November 2021, March 2022). Fun fact: It came out on September 24, 2021, six weeks after that release date was first announced on August 13.
- Why and proof: Wrong date: the album came out on September 24, 2021, not July 19. The label announced that date on August 13, 2021 (Wikipedia); the Korea Times reported on August 17, 2021 that the album would come out on Sept. 24. The options are now months, so the year in the quiz description no longer gives the answer away. The cited soompi.com URL answers 404. https://en.wikipedia.org/wiki/Crazy_in_Love_(Itzy_album) and https://www.koreatimes.co.kr/entertainment/k-pop/20210817/itzy-to-release-1st-full-length-album-next-month

## Q2: changed

- Before: What was the title track from 'CRAZY IN LOVE'? Answer: LOCO (options: In the Morning, LOCO, Tennis (0:0), Not Shy). Fun fact: 'LOCO' is the lead single from CRAZY IN LOVE -- a high-energy, colorful track about the crazy, irrational feeling of being in love.
- After: What was the title track of ITZY's album CRAZY IN LOVE? Answer: LOCO (options: Sneakers, LOCO, Tennis (0:0), Cheshire). Fun fact: LOCO earned a Best K-Pop nomination at the 2022 MTV Video Music Awards.
- Why and proof: The answer is right: Loco was released as the album's lead single on September 24, 2021 (Wikipedia; the Korea Times calls it the lead track). Two options changed: In the Morning and Not Shy are both on the album's track list as instrumental bonus tracks (tracks 14 and 15), and In the Morning is also the lead single of the other 2021 release, Guess Who, so they were replaced by two later ITZY lead singles that are not on the album, Sneakers (Checkmate, 2022) and Cheshire (2022). Tennis (0:0) is a Guess Who track. The fun fact lost its quotation marks, its double hyphen and its unsourced description; the new one is on the Loco page (2022 MTV VMA, Best K-Pop, nominated). The cited YouTube video is unavailable. https://en.wikipedia.org/wiki/Loco_(Itzy_song)

## Q3: changed (replaced, same theme)

- Before: What is the central theme of the ITZY CRAZY IN LOVE album? Answer: Self-acceptance and the beautiful madness of being true to yourself. Fun fact: CRAZY IN LOVE continues ITZY's consistent theme of self-love and self-acceptance -- embracing your 'crazy' authentic self.
- After: CRAZY IN LOVE's lead single was pitched as a song about a first crush, told in the style of which generation? Answer: Generation Z (options: Baby Boomers, Generation Z, Generation X, Millennials). Fun fact: Another of the album's 16 tracks, #Twenty, is a hip hop song about the thrill of reaching age 20.
- Why and proof: The marked answer had no source and the sources say otherwise: at the album's release the members said their earlier songs were about themselves and this album is about being caught up in love (Soompi interview, Yeji: "What would ITZY look like if we were crazy about love?"), and NME's review, as summarized on Wikipedia, found the album lacks the empowering message of their earlier work. The cited soompi.com URL answers 404. The new question stays on the album's theme: Wikipedia's composition section says Loco expresses a first strong attraction in the style of Generation Z, and NME (October 4, 2021) also describes its Gen Z flair. #Twenty is described there as a hip hop song about just turning 20. https://en.wikipedia.org/wiki/Crazy_in_Love_(Itzy_album) and https://www.nme.com/features/itzy-interview-crazy-in-love-loco-3059287 and https://www.soompi.com/article/1490088wpp/itzy-describes-their-new-concept-for-first-full-length-album-what-they-are-loco-about-and-more

## Q4: changed (replaced, era theme)

- Before: Which ITZY member is the main dancer and rapper? Answer: Chaeryeong (options: Yeji, Lia, Ryujin, Chaeryeong). Fun fact: Chaeryeong is widely recognized as ITZY's strongest dancer -- her dance skills have been highlighted in numerous fancams and performance analyses.
- After: Which music show gave the CRAZY IN LOVE title track its first trophy? Answer: Music Bank (options: Inkigayo, Show Champion, M Countdown, Music Bank). Fun fact: The song went on to win on Inkigayo and M Countdown as well, for three music show trophies in all.
- Why and proof: Main and lead positions are not official and no allowed source states them. Wikipedia's member list (which deliberately leaves out main or lead labels) gives Chaeryeong as dancer and vocalist, not rapper, and gives Ryujin and Yuna as both rapper and dancer: the marked answer was wrong and Ryujin was a second plausible answer. The fun fact was an unsourced superlative. The cited soompi.com URL answers 404. The new question is sourced: Loco won on Music Bank (October 8, 2021), Inkigayo (October 10) and M Countdown (October 14), three wins in all, none on Show Champion. Wikipedia's list of 2021 Music Bank winners shows Loco on October 8 with 6,033 points, and Soompi titles the Inkigayo trophy as Loco's 2nd win. https://en.wikipedia.org/wiki/Loco_(Itzy_song) and https://en.wikipedia.org/wiki/List_of_Music_Bank_Chart_winners_(2021) and https://www.soompi.com/article/1492764wpp/itzy-takes-2nd-win-for-loco-on-inkigayo

## Q5: changed

- Before: How many members are in ITZY? Answer: 5 (options: 4, 5, 6, 7). Fun fact: ITZY has 5 members: Yeji, Lia, Ryujin, Chaeryeong, and Yuna.
- After: How many members were in ITZY when CRAZY IN LOVE came out? Answer: 5 (options: 4, 5, 6, 7). Fun fact: The members are Yeji, Lia, Ryujin, Chaeryeong and Yuna.
- Why and proof: The answer is right, but a member count can change, so the question is now dated to the album's release (lot 3 brief rule). In August 2021 the Korea Times described a five-member group of Yeji, Lia, Ryujin, Chaeryeong and Yuna; Wikipedia lists the same five as current members, with no former member. The cited source (the group's twitter.com account) is not an allowed source. https://en.wikipedia.org/wiki/Itzy and https://www.koreatimes.co.kr/entertainment/k-pop/20210817/itzy-to-release-1st-full-length-album-next-month

## Q6: changed

- Before: What was ITZY's debut song that established their 'self-love' concept? Answer: Dalla Dalla (options: Not Shy, Wannabe, Dalla Dalla, Icy). Fun fact: 'DALLA DALLA' (달라달라 -- 'Different Different') was ITZY's debut in 2019 -- a declaration of being different and proud of it.
- After: What was ITZY's debut song, a 2019 single about self-love and confidence? Answer: Dalla Dalla (options: Not Shy, Wannabe, Dalla Dalla, Icy). Fun fact: Its title means different in Korean, and its video drew 17.1 million views in a day, then the most for a K-pop group's debut video.
- Why and proof: The answer is right: Dalla Dalla is ITZY's debut single, released on February 12, 2019, with lyrics on confidence, self-love and empowerment; Dalla means different in Korean; its video reached 17.1 million views, then the most for a K-pop group's debut video within 24 hours (Wikipedia; the Itzy page gives the same record). Not Shy, Wannabe and Icy are later singles. The stem lost its quotation marks; the fun fact lost its quotation marks, double hyphens and Korean script. The cited YouTube video is unavailable. https://en.wikipedia.org/wiki/Dalla_Dalla

## Q7: changed

- Before: What Western market milestone did the CRAZY IN LOVE album achieve? Answer: First ITZY album on Billboard 200 (options: First ITZY album on Billboard 200, First K-pop girl group album to chart in the UK, First JYP girl group album to chart on US iTunes, They charted on all major global platforms simultaneously). Fun fact: 'CRAZY IN LOVE' charted on the US Billboard 200, marking a significant US market presence for ITZY.
- After: At what position did CRAZY IN LOVE enter the US Billboard 200 albums chart? Answer: No. 11 (options: No. 11, No. 148, No. 3, No. 64). Fun fact: That was a career high at the time: their first Billboard 200 entry, the EP Guess Who, had debuted at No. 148 a few months earlier.
- Why and proof: Owner request, wrong answer: ITZY's first Billboard 200 album was the EP Guess Who (April 30, 2021), which debuted at No. 148; CRAZY IN LOVE was their second entry and debuted at No. 11, a new career high (Wikipedia). The Korea Herald (Yonhap, October 2021) reports the same: 11th, the group's highest rank ever, after Guess Who reached No. 148 in May. The three other old options were unverifiable claims. Billboard (October 7, 2021) adds that the album opened at No. 1 on Top Album Sales, the group's first leader there. Checkmate later reached No. 8 (2022), hence "at the time" in the fun fact. The cited soompi.com URL answers 404. https://en.wikipedia.org/wiki/Itzy and https://www.koreaherald.com/article/2700820 and https://www.billboard.com/pro/itzy-crazy-in-love-the-1st-album-top-album-sales-chart/

## Q8: changed (replaced, same theme)

- Before: Which CRAZY IN LOVE B-side became a fan-beloved concert staple? Answer: In the Morning (options: In the Morning, Magic, Swipe, Secret Story of the Swan). Fun fact: 'In the Morning' is an acclaimed B-side from CRAZY IN LOVE beloved for its sophisticated production and the members' standout vocal performances.
- After: Which of these songs is a B-side track on ITZY's album CRAZY IN LOVE? Answer: Swipe (options: Swipe, Kidding Me, Wild Wild West, Sorry Not Sorry). Fun fact: Swipe pairs a retro clarinet with 808 drums and heavy bass, and it was given its own music video.
- Why and proof: Wrong answer: In the Morning is not a B-side of CRAZY IN LOVE. It is the lead single of the EP Guess Who (April 30, 2021) and is on CRAZY IN LOVE only as an instrumental bonus track. Swipe, an option, really is a B-side of the album. Magic is not on the album, and Secret Story of the Swan is a 2020 IZ*ONE single. The concert staple and acclaim claims had no source. The cited soompi.com URL redirects to a Soompi song database page that says nothing about it. Proof for the new question: the Itzy page names Swipe and #Twenty as the album's B-side tracks; the album page lists Swipe as track 2, describes its retro clarinet, 808 drums and heavy bass, and dates its music video teaser to September 21, 2021. Kidding Me, Wild Wild West and Sorry Not Sorry are tracks of Guess Who, not of CRAZY IN LOVE. https://en.wikipedia.org/wiki/Crazy_in_Love_(Itzy_album) and https://en.wikipedia.org/wiki/Itzy and https://en.wikipedia.org/wiki/Guess_Who_(EP) and https://en.wikipedia.org/wiki/Secret_Story_of_the_Swan

## Q9: changed (replaced, same theme)

- Before: What dance move from 'LOCO' became a point choreo trend? Answer: The shoulder bounce (options: The shoulder bounce, The loco spin, The eye wink gesture, The hair flip). Fun fact: The shoulder bounce sequence in 'LOCO' became a popular reference point for ITZY fans and was widely recreated in cover dance videos.
- After: ITZY dances tend to spotlight one body part per single. Which part did the group name for the CRAZY IN LOVE lead single? Answer: Fingers (options: Fingers, Shoulders, Knees, Neck). Fun fact: Fans had linked earlier ITZY singles to the back, neck, shoulders, legs and knees; for this one, Yuna told NME it was the fingers.
- Why and proof: The shoulder bounce trend had no source, and the cited soompi.com URL answers 404; the stem also named LOCO, the answer of Q2. The new question stays on the dance of the lead single: in an NME interview (October 4, 2021), ITZY's choreography is said to highlight a different body part in each single, with fans linking earlier ones to the back, neck, shoulders, legs and knees; asked about Loco, Yuna answered "Fingers". https://www.nme.com/features/itzy-interview-crazy-in-love-loco-3059287

## Q10: changed

- Before: What company is ITZY under? Answer: JYP Entertainment (options: SM Entertainment, JYP Entertainment, YG Entertainment, HYBE). Fun fact: ITZY debuted under JYP Entertainment on February 12, 2019, following in the footsteps of TWICE as JYP's prominent girl group.
- After: Which company launched ITZY in 2019? Answer: JYP Entertainment (options: SM Entertainment, JYP Entertainment, YG Entertainment, HYBE). Fun fact: ITZY was JYP's first new girl group since TWICE in 2015, and it debuted on February 12, 2019.
- Why and proof: The answer is right: JYP Entertainment formed ITZY and announced its debut on January 21, 2019, as its first girl group since TWICE in 2015; the group debuted on February 12, 2019 (Wikipedia). The official site itzy.jype.com is run by JYP Entertainment. The stem is now dated (a label can change); the fun fact lost the unsourced "prominent girl group" wording. The cited source (JYP's twitter.com account) is not an allowed source. https://en.wikipedia.org/wiki/Itzy and https://itzy.jype.com/
