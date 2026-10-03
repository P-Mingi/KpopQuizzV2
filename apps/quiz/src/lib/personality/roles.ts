// V12 G5: the public role line of a Which member are you result (SYSTEM.md 5.2:
// "links to the member only through their public role (leader, producer, main
// dancer...)").
//
// Only what a group publishes about its own line-up: leader, vocal / rap / dance
// position, a production credit, a unit, the oldest or youngest member. Nothing
// about character, habits or private life. Where a group publishes no positions
// (NewJeans, ENHYPEN, IVE, LE SSERAFIM beyond the leader) the line stays generic.
// A member missing from this map gets "Member of <group>", never a guess.
// Keys: group slug, then personality_profiles.member_slug.

const ROLES: Record<string, Record<string, string>> = {
  bts: {
    rm: 'Leader and rapper',
    jin: 'Vocalist, the oldest',
    suga: 'Rapper and producer',
    'j-hope': 'Rapper and main dancer',
    jimin: 'Vocalist and main dancer',
    v: 'Vocalist',
    jungkook: 'Main vocalist, the youngest',
  },
  blackpink: {
    jisoo: 'Vocalist',
    jennie: 'Rapper and vocalist',
    rose: 'Main vocalist',
    lisa: 'Main dancer and rapper',
  },
  'stray-kids': {
    'bang-chan': 'Leader and producer',
    'lee-know': 'Main dancer',
    changbin: 'Rapper and producer, 3RACHA',
    hyunjin: 'Main dancer and rapper',
    han: 'Rapper, vocalist and producer, 3RACHA',
    felix: 'Rapper and dancer',
    seungmin: 'Vocalist',
    'i-n': 'Vocalist, the youngest',
  },
  twice: {
    nayeon: 'Vocalist, the oldest',
    jeongyeon: 'Vocalist',
    momo: 'Main dancer',
    sana: 'Vocalist',
    jihyo: 'Leader and main vocalist',
    mina: 'Vocalist and dancer',
    dahyun: 'Rapper',
    chaeyoung: 'Rapper',
    tzuyu: 'Vocalist, the youngest',
  },
  aespa: {
    karina: 'Leader, dancer and rapper',
    giselle: 'Rapper',
    winter: 'Vocalist and dancer',
    ningning: 'Main vocalist, the youngest',
  },
  newjeans: {
    minji: 'Vocalist, the oldest',
    hanni: 'Vocalist',
    danielle: 'Vocalist',
    haerin: 'Vocalist',
    hyein: 'Vocalist, the youngest',
  },
  seventeen: {
    's-coups': 'Leader, hip-hop team',
    jeonghan: 'Vocal team',
    joshua: 'Vocal team',
    jun: 'Performance team',
    hoshi: 'Performance team leader',
    wonwoo: 'Hip-hop team',
    woozi: 'Vocal team leader and producer',
    dk: 'Vocal team',
    mingyu: 'Hip-hop team',
    the8: 'Performance team',
    seungkwan: 'Vocal team',
    vernon: 'Hip-hop team',
    dino: 'Performance team, the youngest',
  },
  'g-i-dle': {
    miyeon: 'Main vocalist',
    minnie: 'Vocalist',
    soyeon: 'Leader, rapper and producer',
    yuqi: 'Vocalist',
    shuhua: 'Vocalist, the youngest',
  },
  ive: {
    yujin: 'Leader and vocalist',
    gaeul: 'Rapper, the oldest',
    rei: 'Rapper',
    wonyoung: 'Vocalist',
    liz: 'Vocalist',
    leeseo: 'Vocalist, the youngest',
  },
  'le-sserafim': {
    chaewon: 'Leader and vocalist',
    sakura: 'Vocalist',
    yunjin: 'Vocalist',
    kazuha: 'Vocalist and dancer',
    eunchae: 'Vocalist, the youngest',
  },
  ateez: {
    hongjoong: 'Captain, rapper and producer',
    seonghwa: 'Vocalist, the oldest',
    yunho: 'Main dancer',
    yeosang: 'Vocalist and dancer',
    san: 'Vocalist and dancer',
    mingi: 'Rapper',
    wooyoung: 'Main dancer',
    jongho: 'Main vocalist, the youngest',
  },
  enhypen: {
    jungwon: 'Leader and vocalist',
    heeseung: 'Vocalist, the oldest',
    jay: 'Vocalist',
    jake: 'Vocalist',
    sunghoon: 'Vocalist',
    sunoo: 'Vocalist',
    'ni-ki': 'Dancer, the youngest',
  },
  txt: {
    soobin: 'Leader and vocalist',
    yeonjun: 'Rapper and dancer, the oldest',
    beomgyu: 'Vocalist',
    taehyun: 'Vocalist',
    hueningkai: 'Vocalist, the youngest',
  },
  itzy: {
    yeji: 'Leader and main dancer',
    lia: 'Main vocalist',
    ryujin: 'Main rapper',
    chaeryeong: 'Main dancer',
    yuna: 'Vocalist, the youngest',
  },
  nmixx: {
    haewon: 'Leader and vocalist',
    lily: 'Main vocalist',
    sullyoon: 'Vocalist',
    bae: 'Vocalist',
    jiwoo: 'Rapper',
    kyujin: 'Vocalist and rapper, the youngest',
  },
};

/** The member's public role, or the plain "Member of <group>" when none is listed. */
export function publicRole(groupSlug: string, memberSlug: string, groupName: string): string {
  return ROLES[groupSlug]?.[memberSlug] ?? `Member of ${groupName}`;
}

/** For the unit test: every listed role, flat. */
export function listedRoles(): Array<{ group: string; member: string; role: string }> {
  return Object.entries(ROLES).flatMap(([group, m]) => Object.entries(m).map(([member, role]) => ({ group, member, role })));
}
