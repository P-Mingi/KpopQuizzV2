// Wikimedia Commons photos for the groups and soloists without a photo of the site's
// own in public/idols (owner request, 2026-10-06). Each file was checked by eye for
// the right subject, converted to JPEG within 1200 px (no crop) and stored in Supabase
// Storage, public bucket `images`, at group-photos/<slug>.jpg. Free licenses only
// (CC BY or CC BY-SA). The credits stay here and in docs/design/growth-v12/run/group-photos.json
// (with sizes and dates) but are not displayed: the owner handles the attribution (2026-10-06).

export interface GroupPhotoCredit {
  /** Commons file page. */
  page: string;
  author: string;
  license: string;
  licenseUrl: string;
}

export const GROUP_PHOTO_CREDITS: Record<string, GroupPhotoCredit> = {
  akmu: { page: 'https://commons.wikimedia.org/wiki/File:KOCIS_Korea_President_Park_Culture_Day_Movie_03(1).jpg', author: 'Korea.net / Korean Culture and Information Service (Jeon Han)', license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0' },
  apink: { page: 'https://commons.wikimedia.org/wiki/File:Apink_at_Korea_Sale_Festa_Opening_Ceremony,_30_September_2016.png', author: 'Korea.net', license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0' },
  artms: { page: 'https://commons.wikimedia.org/wiki/File:ARTMS_-_54462684746.jpg', author: 'David Lee', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0' },
  astro: { page: 'https://commons.wikimedia.org/wiki/File:Astro_at_the_HallyuPopFest_London_2022_event.jpg', author: 'Chanhyuk Lee', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0' },
  bibi: { page: 'https://commons.wikimedia.org/wiki/File:BIBI_in_June_2025_(cropped).jpg', author: 'David Lee', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0' },
  billlie: { page: 'https://commons.wikimedia.org/wiki/File:Billlie_on_March_8,_2022.jpg', author: 'Studio FLO 스튜디오 플로', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0' },
  btob: { page: 'https://commons.wikimedia.org/wiki/File:BTOB_2015.09.06_%E9%A6%99%E6%B8%AFAPM%E5%95%86%E5%A0%B4%E6%B4%BB%E5%8B%95.jpg', author: 'LucindaCSB', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0' },
  chungha: { page: 'https://commons.wikimedia.org/wiki/File:Chungha_in_June_2025.png', author: 'K-POPIT 케이팝잇', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0' },
  cortis: { page: 'https://commons.wikimedia.org/wiki/File:CORTIS_Dior_PhotoCall_1.jpg', author: 'TV10', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0' },
  day6: { page: 'https://commons.wikimedia.org/wiki/File:DAY6_in_taiwan.jpg', author: 'The original uploader was Shuohyun at Chinese Wikipedia.', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0' },
  dreamcatcher: { page: 'https://commons.wikimedia.org/wiki/File:190426_%EB%93%9C%EB%A6%BC%EC%BA%90%EC%B3%90_%EC%86%A1%EB%8F%84_%EB%B6%88%EA%BD%83%EC%B6%95%EC%A0%9C.jpg', author: 'Explicit', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0' },
  'fifty-fifty': { page: 'https://commons.wikimedia.org/wiki/File:Fifty_Fifty_2024_Billboard_K_Power_100.png', author: 'K-POPIT 케이팝잇', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0' },
  'fromis-9': { page: 'https://commons.wikimedia.org/wiki/File:181120_fromis_9_02.jpg', author: 'dispatchsns', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0' },
  hearts2hearts: { page: 'https://commons.wikimedia.org/wiki/File:H2H_HMA26.jpg', author: '티비텐 TV10', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0' },
  heize: { page: 'https://commons.wikimedia.org/wiki/File:Heize_2019_3.jpg', author: 'NewsInstar', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0' },
  hwasa: { page: 'https://commons.wikimedia.org/wiki/File:Hwasa_in_January_2026.png', author: 'TV10', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0' },
  hyuna: { page: 'https://commons.wikimedia.org/wiki/File:20230720_Kim_HyunA_in_July_2023_07.jpg', author: 'K-POPIT 케이팝잇', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0' },
  ikon: { page: 'https://commons.wikimedia.org/wiki/File:IKon_in_April_2023_(2).png', author: 'Doha News Official', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0' },
  illit: { page: 'https://commons.wikimedia.org/wiki/File:250221_ILLIT.png', author: 'K-POPIT 케이팝잇', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0' },
  iu: { page: 'https://commons.wikimedia.org/wiki/File:250718_Lee_Ji-eun_(%EC%9D%B4%EC%A7%80%EC%9D%80).png', author: '티비텐 TV10', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0' },
  'jay-park': { page: 'https://commons.wikimedia.org/wiki/File:Won_Spirits_CEO_Jay_Park_04.jpg', author: 'Republic of Korea', license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0' },
  jennie: { page: 'https://commons.wikimedia.org/wiki/File:Jennie_Kim_in_November_2023.jpg', author: 'K-POPIT 케이팝잇', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0' },
  'jeon-somi': { page: 'https://commons.wikimedia.org/wiki/File:20230720_Jeon_Somi_(%EC%A0%84%EC%86%8C%EB%AF%B8).jpg', author: 'K-POPIT 케이팝잇', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0' },
  jimin: { page: 'https://commons.wikimedia.org/wiki/File:Jimin_x_Samsung_Galaxy_August_2021.png', author: 'Samsung Saudi Arabia', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0' },
  jungkook: { page: 'https://commons.wikimedia.org/wiki/File:Jung_Kook_of_BTS,_February_12,_2026_(1).png', author: 'K-POPIT 케이팝잇', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0' },
  kara: { page: 'https://commons.wikimedia.org/wiki/File:Kara_Asia_Song_Festival_(2).jpg', author: 'KIYOUNG KIM', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0' },
  katseye: { page: 'https://commons.wikimedia.org/wiki/File:Katseye_in_Seattle.jpg', author: 'David Lee', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0' },
  kickflip: { page: 'https://commons.wikimedia.org/wiki/File:KickFlip_at_SBS_Radio.jpg', author: 'SBS Radio (YouTube)', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0' },
  'kiss-of-life': { page: 'https://commons.wikimedia.org/wiki/File:KISS_OF_LIFE_at_Music_Bank_(4K)_20240705_01.png', author: 'TV10 (YouTube)', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0' },
  loona: { page: 'https://commons.wikimedia.org/wiki/File:200217_%EC%9D%B4%EB%8B%AC%EC%9D%98_%EC%86%8C%EB%85%80_01.png', author: '韓國娛樂新聞網站NewsInstar', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0' },
  loossemble: { page: 'https://commons.wikimedia.org/wiki/File:Loossemble_at_Incheon_Airport_on_140923_(1).png', author: '티비텐', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0' },
  'miss-a': { page: 'https://commons.wikimedia.org/wiki/File:Miss_A_2013.jpg', author: 'the.angrycamel from Singapore, Singapore', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0' },
  'monsta-x': { page: 'https://commons.wikimedia.org/wiki/File:MonstaX_in_Golden_Disc_Awards_2019.jpg', author: 'Newsen [뉴스엔 김기태 기자]', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0' },
  nct: { page: 'https://commons.wikimedia.org/wiki/File:NCT_going_to_a_Music_Bank_recording_in_April_2018_01.png', author: '뉴스인스타 (News In Star)', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0' },
  'nct-wish': { page: 'https://commons.wikimedia.org/wiki/File:2026_NCT_WISH_promotion_03_(cropped).jpg', author: 'numbuzin', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0' },
  p1harmony: { page: 'https://commons.wikimedia.org/wiki/File:P1Harmony_for_Marie_Claire_Korea_01_(cropped).jpg', author: 'Marie Claire Korea', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0' },
  pentagon: { page: 'https://commons.wikimedia.org/wiki/File:Pentagon_190327.png', author: 'NewsInstar', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0' },
  psy: { page: 'https://commons.wikimedia.org/wiki/File:PSY(%EC%8B%B8%EC%9D%B4)_at_2015_Summer_K-POP_Festival.jpg', author: 'Korea.net / Korean Culture and Information Service (Jeon Han)', license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0' },
  'purple-kiss': { page: 'https://commons.wikimedia.org/wiki/File:PURPLE_KISS_211001.jpg', author: 'KNTV', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0' },
  rescene: { page: 'https://commons.wikimedia.org/wiki/File:RESCENE_at_Incheon_Airport,_12_August_2026.png', author: 'K-POPIT 케이팝잇', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0' },
  rose: { page: 'https://commons.wikimedia.org/wiki/File:Blackpink_Ros%C3%A9_Rimowa_1.jpg', author: 'TV10', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0' },
  sistar: { page: 'https://commons.wikimedia.org/wiki/File:%EC%94%A8%EC%8A%A4%ED%83%80(SISTAR)_G%ED%8E%98%EC%8A%A4%ED%8B%B0%EB%B2%8C_%EC%95%84%EC%8B%9C%EC%95%84_%EB%93%9C%EB%A6%BC_%EC%BD%98%EC%84%9C%ED%8A%B8_(11).jpg', author: 'SJ', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0' },
  stayc: { page: 'https://commons.wikimedia.org/wiki/File:STAYC_in_Seattle.jpg', author: 'David Lee', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0' },
  sunmi: { page: 'https://commons.wikimedia.org/wiki/File:Sunmi_2025_MISS_SIXTYxKNWLS_right.png', author: 'K-POPIT 케이팝잇', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0' },
  't-ara': { page: 'https://commons.wikimedia.org/wiki/File:170614_T-ARA_02.jpg', author: 'photomami', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0' },
  taeyang: { page: 'https://commons.wikimedia.org/wiki/File:Taeyang_-_MADE_THE_MOVIE_Premiere_(cropped).jpg', author: 'GOM, derivative work by Alexataylor07', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0' },
  taeyeon: { page: 'https://commons.wikimedia.org/wiki/File:250807_%ED%83%9C%EC%97%B0_%27%EC%95%85%EB%A7%88%EA%B0%80_%EC%9D%B4%EC%82%AC%EC%99%94%EB%8B%A4%27_VIP_Premiere_04_(cropped).jpg', author: 'sublimitas_spes', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0' },
  team: { page: 'https://commons.wikimedia.org/wiki/File:2025-10-28_%26TEAM_at_Back_to_Life_media_showcase_02_(cropped_and_straightened).jpg', author: 'SBS Star Daily', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0' },
  'the-boyz': { page: 'https://commons.wikimedia.org/wiki/File:The_Boyz_at_the_Dream_Concert_event_on_May_18,_2019.jpg', author: 'THE BOYZ', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0' },
  triples: { page: 'https://commons.wikimedia.org/wiki/File:TripleS_250512.jpg', author: 'K-POPIT 케이팝잇', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0' },
  tuide: { page: 'https://commons.wikimedia.org/wiki/File:Tuide,_August_2026.jpg', author: 'SBS Radio 에라오', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0' },
  tws: { page: 'https://commons.wikimedia.org/wiki/File:TWS_at_Music_Bank_20240202.jpg', author: 'tenasia (티비텐)', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0' },
  'v-bts': { page: 'https://commons.wikimedia.org/wiki/File:V_at_W_Korea_Breast_Cancer_Campaign,_15_October_2025.png', author: 'TV10', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0' },
  viviz: { page: 'https://commons.wikimedia.org/wiki/File:230315_VIVIZ_Seoul_Fashion_Week.jpg', author: 'K-POPIT 케이팝잇', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0' },
  winner: { page: 'https://commons.wikimedia.org/wiki/File:Winner_at_6th_Melon_Music_Awards_01.jpg', author: 'Snowy Boy', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0' },
  xikers: { page: 'https://commons.wikimedia.org/wiki/File:230317_xikers_(%EC%8B%B8%EC%9D%B4%EC%BB%A4%EC%8A%A4).jpg', author: 'K-POPIT 케이팝잇', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0' },
  'young-posse': { page: 'https://commons.wikimedia.org/wiki/File:YOUNG_POSSE_Seoul_Fashion_Week_September_2024.jpg', author: '티비텐', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0' },
  zerobaseone: { page: 'https://commons.wikimedia.org/wiki/File:ZEROBASEONE_@_40th_Golden_Disc_Awards_(20260110).jpg', author: 'TV10', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0' },
  zico: { page: 'https://commons.wikimedia.org/wiki/File:Zico_2017_Monster_5_(cropped).jpg', author: 'Bonnielou2013', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0' },
};
