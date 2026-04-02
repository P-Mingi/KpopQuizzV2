// K-pop Artist Catalog v2 for Deezer Song Population
// 248 artists with direct deezer_artist_id where possible
// Run: node populate-songs.mjs

const ARTISTS = [
  // ============================================
  // GIRL GROUPS - 4th/5th Generation
  // ============================================
  { name: "aespa", gender: "gg", generation: "4th", deezer_artist_id: 113547672 },
  { name: "NewJeans", gender: "gg", generation: "4th", deezer_artist_id: 178008437 },
  { name: "IVE", gender: "gg", generation: "4th", deezer_search: "IVE 아이브" },
  { name: "LE SSERAFIM", gender: "gg", generation: "4th", deezer_artist_id: 168158797 },
  { name: "ITZY", gender: "gg", generation: "4th", deezer_artist_id: 3649631 },
  { name: "(G)I-DLE", gender: "gg", generation: "4th", deezer_artist_id: 15065941 },
  { name: "NMIXX", gender: "gg", generation: "4th", deezer_artist_id: 160138282 },
  { name: "Kep1er", gender: "gg", generation: "4th", deezer_artist_id: 154701791 },
  { name: "STAYC", gender: "gg", generation: "4th", deezer_artist_id: 87703262 },
  { name: "KISS OF LIFE", gender: "gg", generation: "4th", deezer_artist_id: 6389700 },
  { name: "ILLIT", gender: "gg", generation: "5th", deezer_search: "ILLIT 아일릿" },
  { name: "BABYMONSTER", gender: "gg", generation: "5th", deezer_artist_id: 244386532 },
  { name: "tripleS", gender: "gg", generation: "4th", deezer_artist_id: 7712602 },
  { name: "YOUNG POSSE", gender: "gg", generation: "5th", deezer_artist_id: 237432491 },
  { name: "H1-KEY", gender: "gg", generation: "4th", deezer_artist_id: 154788011 },
  { name: "IZ*ONE", gender: "gg", generation: "4th", deezer_artist_id: 53330262 },
  { name: "fromis_9", gender: "gg", generation: "4th", deezer_artist_id: 14981411 },
  { name: "Billlie", gender: "gg", generation: "4th", deezer_artist_id: 150971252 },
  { name: "VIVIZ", gender: "gg", generation: "4th", deezer_artist_id: 6986527 },
  { name: "Weki Meki", gender: "gg", generation: "4th", deezer_artist_id: 49589172 },
  { name: "LIGHTSUM", gender: "gg", generation: "4th", deezer_artist_id: 135029282 },
  { name: "Lapillus", gender: "gg", generation: "4th", deezer_artist_id: 173227717 },

  // ============================================
  // GIRL GROUPS - 3rd Generation
  // ============================================
  { name: "TWICE", gender: "gg", generation: "3rd", deezer_artist_id: 161553 },
  { name: "BLACKPINK", gender: "gg", generation: "3rd", deezer_artist_id: 10803980 },
  { name: "Red Velvet", gender: "gg", generation: "3rd", deezer_artist_id: 338654 },
  { name: "MAMAMOO", gender: "gg", generation: "3rd", deezer_artist_id: 7161880 },
  { name: "GFRIEND", gender: "gg", generation: "3rd", deezer_artist_id: 52083222 },
  { name: "OH MY GIRL", gender: "gg", generation: "3rd", deezer_artist_id: 58272932 },
  { name: "LOONA", gender: "gg", generation: "3rd", deezer_artist_id: 78598292 },
  { name: "Dreamcatcher", gender: "gg", generation: "3rd", deezer_search: "Dreamcatcher 드림캐쳐" },
  { name: "WJSN", gender: "gg", generation: "3rd", deezer_artist_id: 13695737 },
  { name: "CLC", gender: "gg", generation: "3rd", deezer_search: "CLC 씨엘씨" },
  { name: "EXID", gender: "gg", generation: "3rd", deezer_artist_id: 6510693 },
  { name: "Apink", gender: "gg", generation: "3rd", deezer_artist_id: 6779515 },
  { name: "MOMOLAND", gender: "gg", generation: "3rd", deezer_artist_id: 5845339 },
  { name: "Gugudan", gender: "gg", generation: "3rd", deezer_artist_id: 10640703 },
  { name: "EVERGLOW", gender: "gg", generation: "3rd", deezer_artist_id: 3249881 },
  { name: "GWSN", gender: "gg", generation: "3rd", deezer_artist_id: 55146862 },
  { name: "Cherry Bullet", gender: "gg", generation: "3rd", deezer_artist_id: 68279042 },
  { name: "Rocket Punch", gender: "gg", generation: "3rd", deezer_artist_id: 50329992 },
  { name: "PURPLE KISS", gender: "gg", generation: "3rd", deezer_artist_id: 4181009 },
  { name: "Brave Girls", gender: "gg", generation: "3rd", deezer_artist_id: 2797211 },

  // ============================================
  // GIRL GROUPS - 2nd Generation
  // ============================================
  { name: "Girls' Generation", gender: "gg", generation: "2nd", deezer_artist_id: 1310497 },
  { name: "f(x)", gender: "gg", generation: "2nd", deezer_search: "f(x) 에프엑스" },
  { name: "2NE1", gender: "gg", generation: "2nd", deezer_artist_id: 1492615 },
  { name: "miss A", gender: "gg", generation: "2nd", deezer_artist_id: 2797271 },
  { name: "SISTAR", gender: "gg", generation: "2nd", deezer_artist_id: 2562881 },
  { name: "T-ara", gender: "gg", generation: "2nd", deezer_artist_id: 1389971 },
  { name: "Wonder Girls", gender: "gg", generation: "2nd", deezer_artist_id: 410599 },
  { name: "KARA", gender: "gg", generation: "2nd", deezer_artist_id: 70570 },
  { name: "4Minute", gender: "gg", generation: "2nd", deezer_artist_id: 1408175 },
  { name: "Brown Eyed Girls", gender: "gg", generation: "2nd", deezer_artist_id: 2651261 },
  { name: "After School", gender: "gg", generation: "2nd", deezer_search: "After School 애프터스쿨" },
  { name: "AOA", gender: "gg", generation: "2nd", deezer_artist_id: 1271245 },
  { name: "Girl's Day", gender: "gg", generation: "2nd", deezer_artist_id: 1455609 },
  { name: "9Muses", gender: "gg", generation: "2nd", deezer_artist_id: 101759992 },

  // ============================================
  // GIRL GROUPS - 1st Generation
  // ============================================
  { name: "S.E.S.", gender: "gg", generation: "1st", deezer_artist_id: 1103 },
  { name: "Fin.K.L", gender: "gg", generation: "1st", deezer_artist_id: 10076214 },
  { name: "Baby V.O.X", gender: "gg", generation: "1st", deezer_artist_id: 7935 },

  // ============================================
  // BOY GROUPS - 4th/5th Generation
  // ============================================
  { name: "Stray Kids", gender: "bg", generation: "4th", deezer_artist_id: 13923487 },
  { name: "ATEEZ", gender: "bg", generation: "4th", deezer_artist_id: 49280302 },
  { name: "TXT", gender: "bg", generation: "4th", deezer_artist_id: 60552072 },
  { name: "ENHYPEN", gender: "bg", generation: "4th", deezer_artist_id: 113915572 },
  { name: "TREASURE", gender: "bg", generation: "4th", deezer_artist_id: 119559102 },
  { name: "P1Harmony", gender: "bg", generation: "4th", deezer_artist_id: 111567892 },
  { name: "THE BOYZ", gender: "bg", generation: "4th", deezer_artist_id: 84959312 },
  { name: "ZEROBASEONE", gender: "bg", generation: "4th", deezer_artist_id: 219364175 },
  { name: "RIIZE", gender: "bg", generation: "5th", deezer_artist_id: 225538625 },
  { name: "BOYNEXTDOOR", gender: "bg", generation: "5th", deezer_artist_id: 215753985 },
  { name: "XIKERS", gender: "bg", generation: "5th", deezer_search: "xikers" },
  { name: "CRAVITY", gender: "bg", generation: "4th", deezer_artist_id: 11363266 },
  { name: "TEMPEST", gender: "bg", generation: "4th", deezer_search: "TEMPEST 템페스트" },
  { name: "OMEGA X", gender: "bg", generation: "4th", deezer_artist_id: 137763192 },
  { name: "8TURN", gender: "bg", generation: "5th", deezer_artist_id: 198939617 },
  { name: "TWS", gender: "bg", generation: "5th", deezer_search: "TWS 투어스" },
  { name: "PLAVE", gender: "bg", generation: "5th", deezer_artist_id: 11135396 },
  { name: "DRIPPIN", gender: "bg", generation: "4th", deezer_artist_id: 5036424 },
  { name: "E'LAST", gender: "bg", generation: "4th", deezer_artist_id: 97281812 },
  { name: "VERIVERY", gender: "bg", generation: "4th", deezer_artist_id: 51668762 },
  { name: "ONEUS", gender: "bg", generation: "4th", deezer_artist_id: 58547552 },
  { name: "ONEWE", gender: "bg", generation: "4th", deezer_artist_id: 65486902 },
  { name: "Xdinary Heroes", gender: "bg", generation: "4th", deezer_artist_id: 152856922 },

  // ============================================
  // BOY GROUPS - 3rd Generation
  // ============================================
  { name: "BTS", gender: "bg", generation: "3rd", deezer_artist_id: 6982223 },
  { name: "EXO", gender: "bg", generation: "3rd", deezer_artist_id: 88684 },
  { name: "SEVENTEEN", gender: "bg", generation: "3rd", deezer_artist_id: 240582 },
  { name: "GOT7", gender: "bg", generation: "3rd", deezer_artist_id: 6209854 },
  { name: "MONSTA X", gender: "bg", generation: "3rd", deezer_artist_id: 5501870 },
  { name: "NCT 127", gender: "bg", generation: "3rd", deezer_artist_id: 50306442 },
  { name: "NCT DREAM", gender: "bg", generation: "3rd", deezer_artist_id: 11999322 },
  { name: "WayV", gender: "bg", generation: "3rd", deezer_artist_id: 14106799 },
  { name: "iKON", gender: "bg", generation: "3rd", deezer_artist_id: 16407 },
  { name: "WINNER", gender: "bg", generation: "3rd", deezer_artist_id: 14156973 },
  { name: "DAY6", gender: "bg", generation: "3rd", deezer_search: "DAY6 데이식스" },
  { name: "BTOB", gender: "bg", generation: "3rd", deezer_artist_id: 1696083 },
  { name: "VIXX", gender: "bg", generation: "3rd", deezer_artist_id: 5503925 },
  { name: "NU'EST", gender: "bg", generation: "3rd", deezer_artist_id: 2797161 },
  { name: "PENTAGON", gender: "bg", generation: "3rd", deezer_search: "PENTAGON 펜타곤" },
  { name: "SF9", gender: "bg", generation: "3rd", deezer_artist_id: 12564416 },
  { name: "ASTRO", gender: "bg", generation: "3rd", deezer_artist_id: 242530 },
  { name: "AB6IX", gender: "bg", generation: "3rd", deezer_artist_id: 65860082 },
  { name: "CIX", gender: "bg", generation: "3rd", deezer_search: "CIX 씨아이엑스" },
  { name: "Wanna One", gender: "bg", generation: "3rd", deezer_artist_id: 13577033 },
  { name: "N.Flying", gender: "bg", generation: "3rd", deezer_artist_id: 9793684 },
  { name: "KNK", gender: "bg", generation: "3rd", deezer_search: "KNK 크나큰" },
  { name: "UP10TION", gender: "bg", generation: "3rd", deezer_artist_id: 49771572 },
  { name: "VICTON", gender: "bg", generation: "3rd", deezer_artist_id: 14517451 },
  { name: "Golden Child", gender: "bg", generation: "3rd", deezer_search: "Golden Child 골든차일드" },

  // ============================================
  // BOY GROUPS - 2nd Generation
  // ============================================
  { name: "BIGBANG", gender: "bg", generation: "2nd", deezer_artist_id: 65209 },
  { name: "SHINee", gender: "bg", generation: "2nd", deezer_artist_id: 1377613 },
  { name: "2PM", gender: "bg", generation: "2nd", deezer_search: "2PM 투피엠" },
  { name: "INFINITE", gender: "bg", generation: "2nd", deezer_search: "INFINITE 인피니트" },
  { name: "B.A.P", gender: "bg", generation: "2nd", deezer_search: "B.A.P 비에이피" },
  { name: "Highlight", gender: "bg", generation: "2nd", deezer_search: "Highlight 하이라이트" },
  { name: "Block B", gender: "bg", generation: "2nd", deezer_artist_id: 1407277 },
  { name: "B1A4", gender: "bg", generation: "2nd", deezer_artist_id: 2797281 },
  { name: "CNBLUE", gender: "bg", generation: "2nd", deezer_artist_id: 1492698 },
  { name: "FT Island", gender: "bg", generation: "2nd", deezer_artist_id: 824393 },
  { name: "Teen Top", gender: "bg", generation: "2nd", deezer_artist_id: 101762682 },
  { name: "MBLAQ", gender: "bg", generation: "2nd", deezer_artist_id: 1493325 },
  { name: "ZE:A", gender: "bg", generation: "2nd", deezer_artist_id: 1479809 },
  { name: "U-KISS", gender: "bg", generation: "2nd", deezer_artist_id: 1493637 },
  { name: "Cross Gene", gender: "bg", generation: "2nd", deezer_artist_id: 3071721 },

  // ============================================
  // BOY GROUPS - 1st Generation
  // ============================================
  { name: "TVXQ", gender: "bg", generation: "1st", deezer_artist_id: 63705822 },
  { name: "Super Junior", gender: "bg", generation: "1st", deezer_artist_id: 1020444 },
  { name: "H.O.T.", gender: "bg", generation: "1st", deezer_artist_id: 178870 },
  { name: "Shinhwa", gender: "bg", generation: "1st", deezer_artist_id: 1489573 },
  { name: "Sechskies", gender: "bg", generation: "1st", deezer_artist_id: 11165440 },
  { name: "SS501", gender: "bg", generation: "1st", deezer_artist_id: 345706 },
  { name: "Epik High", gender: "bg", generation: "1st", deezer_artist_id: 4814124 },
  { name: "Dynamic Duo", gender: "bg", generation: "1st", deezer_search: "Dynamic Duo 다이나믹듀오" },

  // ============================================
  // SOLO FEMALE
  // ============================================
  { name: "IU", gender: "solo_female", generation: "2nd", deezer_artist_id: 2810121 },
  { name: "Taeyeon", gender: "solo_female", generation: "2nd", deezer_artist_id: 2562931 },
  { name: "BIBI", gender: "solo_female", generation: "4th", deezer_artist_id: 11467 },
  { name: "Lee Hi", gender: "solo_female", generation: "3rd", deezer_artist_id: 4741249 },
  { name: "Chungha", gender: "solo_female", generation: "3rd", deezer_artist_id: 15014373 },
  { name: "Sunmi", gender: "solo_female", generation: "2nd", deezer_artist_id: 8904144 },
  { name: "HyunA", gender: "solo_female", generation: "2nd", deezer_artist_id: 1389973 },
  { name: "Heize", gender: "solo_female", generation: "3rd", deezer_artist_id: 6777467 },
  { name: "BoA", gender: "solo_female", generation: "1st", deezer_search: "BoA 보아" },
  { name: "Ailee", gender: "solo_female", generation: "2nd", deezer_search: "Ailee 에일리" },
  { name: "Soyou", gender: "solo_female", generation: "2nd", deezer_artist_id: 1493304 },
  { name: "Jessi", gender: "solo_female", generation: "3rd", deezer_artist_id: 1165265 },
  { name: "CL", gender: "solo_female", generation: "2nd", deezer_artist_id: 193587 },
  { name: "Rose", gender: "solo_female", generation: "3rd", deezer_artist_id: 126335112 },
  { name: "Jennie", gender: "solo_female", generation: "3rd", deezer_artist_id: 1228100 },
  { name: "Lisa", gender: "solo_female", generation: "3rd", deezer_artist_id: 145068682 },
  { name: "Jisoo", gender: "solo_female", generation: "3rd", deezer_artist_id: 206710097 },
  { name: "Nayeon", gender: "solo_female", generation: "3rd", deezer_artist_id: 13601441 },
  { name: "Jihyo", gender: "solo_female", generation: "3rd", deezer_artist_id: 379431 },
  { name: "Somi", gender: "solo_female", generation: "4th", deezer_artist_id: 504381 },
  { name: "Kwon Eunbi", gender: "solo_female", generation: "4th", deezer_artist_id: 138548442 },
  { name: "Yuju", gender: "solo_female", generation: "3rd", deezer_artist_id: 49842502 },
  { name: "Wheein", gender: "solo_female", generation: "3rd", deezer_artist_id: 15194283 },
  { name: "Hwasa", gender: "solo_female", generation: "3rd", deezer_artist_id: 8719366 },
  { name: "Solar", gender: "solo_female", generation: "3rd", deezer_artist_id: 144604312 },
  { name: "Moonbyul", gender: "solo_female", generation: "3rd", deezer_artist_id: 12608479 },
  { name: "Seulgi", gender: "solo_female", generation: "3rd", deezer_artist_id: 11634341 },
  { name: "Kang Daniel", gender: "solo_male", generation: "3rd", deezer_artist_id: 70157462 },
  { name: "Lee Young Ji", gender: "solo_female", generation: "4th", deezer_artist_id: 63129952 },
  { name: "YENA", gender: "solo_female", generation: "4th", deezer_search: "YENA 최예나" },
  { name: "Jo Yuri", gender: "solo_female", generation: "4th", deezer_artist_id: 111518042 },
  { name: "Jvcki Wai", gender: "solo_female", generation: "4th", deezer_artist_id: 13728933 },
  { name: "Yoon Mirae", gender: "solo_female", generation: "1st", deezer_artist_id: 13902697 },

  // ============================================
  // SOLO MALE - Singers
  // ============================================
  { name: "Baekhyun", gender: "solo_male", generation: "3rd", deezer_artist_id: 15067623 },
  { name: "Taemin", gender: "solo_male", generation: "2nd", deezer_search: "Taemin 태민" },
  { name: "Key", gender: "solo_male", generation: "2nd", deezer_artist_id: 5061 },
  { name: "D.O.", gender: "solo_male", generation: "3rd", deezer_artist_id: 178582907 },
  { name: "Chen", gender: "solo_male", generation: "3rd", deezer_artist_id: 486430 },
  { name: "Suho", gender: "solo_male", generation: "3rd", deezer_artist_id: 9715666 },
  { name: "Lay", gender: "solo_male", generation: "3rd", deezer_artist_id: 1644588 },
  { name: "Kai", gender: "solo_male", generation: "3rd", deezer_artist_id: 114834992 },
  { name: "RM", gender: "solo_male", generation: "3rd", deezer_artist_id: 83448 },
  { name: "Agust D", gender: "solo_male", generation: "3rd", deezer_artist_id: 14728175 },
  { name: "j-hope", gender: "solo_male", generation: "3rd", deezer_search: "j-hope 제이홉" },
  { name: "Jimin", gender: "solo_male", generation: "3rd", deezer_artist_id: 168047437 },
  { name: "V", gender: "solo_male", generation: "3rd", deezer_artist_id: 134200 },
  { name: "Jin", gender: "solo_male", generation: "3rd", deezer_search: "Jin 진 BTS" },
  { name: "Jungkook", gender: "solo_male", generation: "3rd", deezer_artist_id: 9172904 },
  { name: "G-Dragon", gender: "solo_male", generation: "2nd", deezer_artist_id: 1407280 },
  { name: "Taeyang", gender: "solo_male", generation: "2nd", deezer_artist_id: 1493340 },
  { name: "T.O.P", gender: "solo_male", generation: "2nd", deezer_artist_id: 288100631 },
  { name: "Daesung", gender: "solo_male", generation: "2nd", deezer_artist_id: 245809992 },
  { name: "WOODZ", gender: "solo_male", generation: "4th", deezer_artist_id: 5114606 },
  { name: "Colde", gender: "solo_male", generation: "4th", deezer_artist_id: 13423415 },
  { name: "Sam Kim", gender: "solo_male", generation: "3rd", deezer_artist_id: 10715569 },
  { name: "Eric Nam", gender: "solo_male", generation: "3rd", deezer_artist_id: 10502945 },
  { name: "Henry", gender: "solo_male", generation: "2nd", deezer_artist_id: 5848729 },
  { name: "Onew", gender: "solo_male", generation: "2nd", deezer_artist_id: 53633732 },
  { name: "Woozi", gender: "solo_male", generation: "3rd", deezer_artist_id: 10983150 },
  { name: "Bang Chan", gender: "solo_male", generation: "4th", deezer_artist_id: 14596657 },
  { name: "Taeyong", gender: "solo_male", generation: "3rd", deezer_artist_id: 10031150 },
  { name: "Jackson Wang", gender: "solo_male", generation: "3rd", deezer_artist_id: 11140418 },

  // ============================================
  // SOLO - K-Hip-Hop / K-R&B / Rappers
  // ============================================
  { name: "Zico", gender: "solo_male", generation: "2nd", deezer_search: "Zico 지코" },
  { name: "Dean", gender: "solo_male", generation: "3rd", deezer_artist_id: 70036 },
  { name: "Crush", gender: "solo_male", generation: "3rd", deezer_search: "Crush 크러쉬" },
  { name: "pH-1", gender: "solo_male", generation: "4th", deezer_artist_id: 12039028 },
  { name: "Jay Park", gender: "solo_male", generation: "2nd", deezer_artist_id: 650215 },
  { name: "Beenzino", gender: "solo_male", generation: "3rd", deezer_artist_id: 4990404 },
  { name: "Simon Dominic", gender: "solo_male", generation: "2nd", deezer_artist_id: 5140525 },
  { name: "Gray", gender: "solo_male", generation: "3rd", deezer_artist_id: 96571 },
  { name: "Loco", gender: "solo_male", generation: "3rd", deezer_artist_id: 208931 },
  { name: "Penomeco", gender: "solo_male", generation: "3rd", deezer_artist_id: 6291170 },
  { name: "DPR Live", gender: "solo_male", generation: "4th", deezer_artist_id: 12133152 },
  { name: "DPR Ian", gender: "solo_male", generation: "4th", deezer_artist_id: 87397162 },
  { name: "Changmo", gender: "solo_male", generation: "4th", deezer_artist_id: 12786195 },
  { name: "Ash Island", gender: "solo_male", generation: "4th", deezer_artist_id: 54085752 },
  { name: "Justhis", gender: "solo_male", generation: "4th", deezer_artist_id: 8608996 },
  { name: "Kid Milli", gender: "solo_male", generation: "4th", deezer_artist_id: 13151015 },
  { name: "Sik-K", gender: "solo_male", generation: "4th", deezer_artist_id: 11173818 },
  { name: "Coogie", gender: "solo_male", generation: "4th", deezer_artist_id: 4929429 },
  { name: "MKIT RAIN", gender: "solo_male", generation: "4th", deezer_artist_id: 14025785 },
  { name: "BE'O", gender: "solo_male", generation: "4th", deezer_artist_id: 80707342 },
  { name: "Tabber", gender: "solo_male", generation: "4th", deezer_artist_id: 61349382 },
  { name: "Yuzion", gender: "solo_male", generation: "5th", deezer_artist_id: 60211062 },
  { name: "BIG Naughty", gender: "solo_male", generation: "4th", deezer_artist_id: 72991442 },
  { name: "Giriboy", gender: "solo_male", generation: "3rd", deezer_artist_id: 7358828 },
  { name: "The Quiett", gender: "solo_male", generation: "2nd", deezer_artist_id: 116358 },
  { name: "Dok2", gender: "solo_male", generation: "2nd", deezer_artist_id: 345513 },
  { name: "Tiger JK", gender: "solo_male", generation: "1st", deezer_artist_id: 4574381 },
  { name: "Leellamarz", gender: "solo_male", generation: "4th", deezer_artist_id: 12783959 },
  { name: "Nafla", gender: "solo_male", generation: "4th", deezer_artist_id: 9288876 },
  { name: "GroovyRoom", gender: "bg", generation: "4th", deezer_artist_id: 12315770 },
  { name: "Bewhy", gender: "solo_male", generation: "3rd", deezer_artist_id: 7766832 },

  { name: "Hash Swan", gender: "solo_male", generation: "4th", deezer_artist_id: 10371178 },

  // ============================================
  // K-R&B
  // ============================================
  { name: "OFFONOFF", gender: "bg", generation: "3rd", deezer_artist_id: 3126681 },
  { name: "Zion.T", gender: "solo_male", generation: "2nd", deezer_artist_id: 4990400 },

  { name: "Suran", gender: "solo_female", generation: "3rd", deezer_artist_id: 8042155 },
  { name: "Sogumm", gender: "solo_female", generation: "4th", deezer_artist_id: 15193823 },
  { name: "JUNNY", gender: "solo_male", generation: "4th", deezer_artist_id: 1331356 },
  { name: "SAAY", gender: "solo_female", generation: "3rd", deezer_artist_id: 12080690 },
  { name: "Dvwn", gender: "solo_male", generation: "4th", deezer_artist_id: 12497058 },
  { name: "Youha", gender: "solo_female", generation: "4th", deezer_artist_id: 52194882 },

  // ============================================
  // CO-ED + SUB-UNITS
  // ============================================
  { name: "KARD", gender: "coed", generation: "3rd", deezer_artist_id: 4331560 },
  { name: "EXO-CBX", gender: "bg", generation: "3rd", deezer_artist_id: 13474099 },
  { name: "EXO-SC", gender: "bg", generation: "3rd", deezer_artist_id: 71330722 },
  { name: "Super Junior-D&E", gender: "bg", generation: "1st", deezer_artist_id: 7674934 },
  { name: "Super Junior-K.R.Y.", gender: "bg", generation: "1st", deezer_artist_id: 9111040 },
  { name: "GOT the beat", gender: "gg", generation: "3rd", deezer_artist_id: 155899692 },
  { name: "SuperM", gender: "bg", generation: "3rd", deezer_artist_id: 75116692 },
  { name: "BSS", gender: "bg", generation: "3rd", deezer_artist_id: 319264051 },
  { name: "MiSaMo", gender: "gg", generation: "3rd", deezer_artist_id: 201002147 },
  { name: "Red Velvet - IRENE & SEULGI", gender: "gg", generation: "3rd", deezer_artist_id: 99548022 },
  { name: "ODD EYE CIRCLE", gender: "gg", generation: "3rd", deezer_artist_id: 203431627 },
  { name: "ARTMS", gender: "gg", generation: "3rd", deezer_artist_id: 111244772 },
];

export default ARTISTS;
