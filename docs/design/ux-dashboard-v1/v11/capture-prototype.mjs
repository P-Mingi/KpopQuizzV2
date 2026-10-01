// Reference captures of the v11 prototype, for the pixel checker (C1).
// Usage: node capture-prototype.mjs <path/to/prototype.html> <outDir>
// Produces <outDir>/<width>-<theme>-<state>.png for every state below, full page,
// plus <outDir>/styles.json: computed styles of the landmark selectors per state.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const [,, proto, out = 'v11-ref'] = process.argv;
fs.mkdirSync(out, { recursive: true });

// state id -> JS run in the prototype page (all functions exist in the prototype script)
export const STATES = {
  'home': "go('home')",
  'home-guest': "document.body.classList.add('guest');go('home')",
  'groups': "go('groups')",
  'quizzes': "go('quizzes')",
  'quiz': "go('quiz')",
  'play': "startQuiz()",
  'play-answered': "startQuiz();answer(2)",
  'play-qotd': "startQuiz(0,null,'qotd')",
  'end-guest': "document.body.classList.add('guest');startQuiz();for(let i=0;i<8;i++){G_.ans=null;answer(QZ[G_.i].c);if(G_.i<7){G_.i++;renderQ();}}endQuiz()",
  'end': "startQuiz();for(let i=0;i<8;i++){G_.ans=null;answer(QZ[G_.i].c);if(G_.i<7){G_.i++;renderQ();}}endQuiz()",
  'create-1': "go('create');setStep(1)",
  'create-2': "go('create');setStep(2)",
  'create-3': "go('create');setStep(3)",
  'blindtest': "go('blindtest')",
  'blindtest-playlist-open': "go('blindtest');pop('plmenu')",
  'blindtest-group-search': "go('blindtest');$('btg-q').value='nct';btgFilter('nct');$('bt-pop').closest('section').scrollIntoView()",
  'btplay': "btStart()",
  'btplay-answered': "btStart();btPick(0)",
  'btend-ranked': "btStart('Ranked');for(let i=0;i<10;i++){B_.ans=null;B_.i=i;btRender();B_.t0=Date.now()-1500;btPick(i%4===3?0:BTQ[i].c);clearTimeout(B_.auto);}btEnd()",
  'ranked': "go('ranked')",
  'community': "go('community')",
  'post-challenge': "openPost('challenge')",
  'post-blog': "openPost('blog')",
  'post-debate': "openPost('debate')",
  'editor': "go('community');openEditor('debate')",
  'leaderboard': "go('leaderboard')",
  'hub-blackpink': "openG('BLACKPINK')",
  'hub-ateez': "openG('ATEEZ')",
  'hub-empty': "openG('Chungha')",
  'passport': "go('you')",
  'passport-badges': "go('you');ptab('badges')",
  'settings': "go('settings')",
  'header-sheet': "go('you');openHeader()",
  'notifications': "go('notifs')",
  'search': "go('home');openSearch()",
  'share': "startQuiz();for(let i=0;i<8;i++){G_.ans=null;answer(QZ[G_.i].c);if(G_.i<7){G_.i++;renderQ();}}endQuiz();openShare('result')",
  'signin': "go('create');setStep(3);document.body.classList.add('guest');nextStep()",
  'bell': "go('home');pop('bellpop')"
};
// Landmarks whose computed style the checker compares with the implementation (map them to data-ux ids).
const LANDMARKS = ['.nav','.links a.on','.qcard','.qotd','.hhead h1','.sec-h h2','.post','.rail>section','.btn-primary','.utabs button.on','.tcard','.stats3','.aboutbox','.tring','.bthero','.orb','.medal2','.personprev','.pband','.lrow','.pin','.qlab','.qline','.gsearch','.bpt','.gi','.bmed'];
const PROPS = ['width','height','padding-top','padding-right','padding-bottom','padding-left','margin-top','border-top-width','border-top-color','border-radius','background-color','background-image','color','font-size','font-weight','line-height','letter-spacing','box-shadow','gap'];

const browser = await chromium.launch();
const styles = {};
for (const [w, h] of [[1440, 900], [390, 844]]) {
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme, isMobile: w < 500, hasTouch: w < 500 });
    const page = await ctx.newPage();
    await page.goto('file://' + path.resolve(proto));
    await page.waitForTimeout(400);
    // prototype-only controls never appear in reference shots
    await page.addStyleTag({ content: '.notes-t,.guestbar,.notes{display:none!important}' });
    for (const [id, js] of Object.entries(STATES)) {
      await page.evaluate((code) => { document.body.classList.remove('guest'); closeAll(); if (window.btgFilter) { BTG_OPEN = false; $('btg-q').value = ''; btgFilter(''); } eval(code); }, js);
      await page.waitForTimeout(700);
      const overlay = /^search|share|signin|bell|editor|header-sheet|playlist-open/.test(id);
      await page.screenshot({ path: `${out}/${w}-${theme}-${id}.png`, fullPage: !overlay && !/^play|^btplay/.test(id) });
      styles[`${w}-${theme}-${id}`] = await page.evaluate(({ L, P }) => {
        const o = {};
        for (const sel of L) { const el = document.querySelector('.view.on ' + sel) || document.querySelector(sel); if (!el || !el.offsetParent) continue; const cs = getComputedStyle(el); o[sel] = Object.fromEntries(P.map((p) => [p, cs.getPropertyValue(p)])); }
        return o;
      }, { L: LANDMARKS, P: PROPS });
    }
    await ctx.close();
  }
}
fs.writeFileSync(`${out}/styles.json`, JSON.stringify(styles, null, 1));
await browser.close();
console.log('captured', Object.keys(STATES).length * 4, 'states into', out);
