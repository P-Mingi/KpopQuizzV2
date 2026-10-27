#!/usr/bin/env python3
"""Run O1, lot (e) part 2, lane E1a: the content proof against a running anime build (read only, numbers only).

  python3 apps/quiz/e2e/o1/E1a/content-proof.py http://127.0.0.1:3187

For each fixture series: the hub answers 200 and carries the series facts, every arc name, the characters visible in the
spoiler-free view and the openings; the characters above spoiler level 0 are absent from the HTML. For each fixture quiz
above arc 0: the page shows the spoiler gate and no tagged question text; /series lists the three series. Exit 1 on any miss.
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

BASE = sys.argv[1].rstrip('/') if len(sys.argv) > 1 else 'http://127.0.0.1:3187'
ROOT = Path(__file__).resolve().parents[5]
FIX = ROOT / 'docs/o1/contracts/fixtures/series'
SERIES = ['death-note', 'one-piece', 'spy-x-family']


def get(path):
    req = urllib.request.Request(BASE + path, headers={'User-Agent': 'o1-content-proof'})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, r.read().decode('utf8', 'replace')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf8', 'replace')


def text_of(html):
    html = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', html, flags=re.S)
    html = re.sub(r'<[^>]+>', ' ', html)
    html = html.replace('&amp;', '&').replace('&#x27;', "'").replace('&#39;', "'").replace('&quot;', '"')
    return re.sub(r'\s+', ' ', html)


def raw_has(html, needle):
    esc = needle.replace('&', '&amp;').replace("'", '&#x27;')
    return needle in html or esc in html or needle in text_of(html)


def option_labels(x):
    return [o if isinstance(o, str) else o.get('label', '') for o in x.get('options', [])]


def tagged_text_in(html, x, quiz):
    """True when the question, its fun fact, a clue, or a distinctive option (15+ characters and not also used by a
    spoiler-free question of the same quiz) is readable in the HTML."""
    others = {t for y in quiz['questions'] if y is not x and y.get('spoiler', {}).get('arc', 0) == 0 for t in option_labels(y) + [y['question']]}
    texts = [x['question'], x.get('fun_fact', '')] + list(x.get('clues', [])) + [o for o in option_labels(x) if len(o) >= 15 and o not in others]
    return any(t and raw_has(html, t) for t in texts)


miss = []
n = {'hubs_200': 0, 'facts': 0, 'arcs': 0, 'arcs_total': 0, 'characters': 0, 'characters_total': 0, 'hidden_ok': 0, 'hidden_total': 0,
     'themes': 0, 'themes_total': 0, 'gated_quizzes': 0, 'gated_expected': 0, 'tagged_leaks': 0, 'tagged_total': 0, 'free_quizzes_200': 0, 'free_expected': 0}

for slug in SERIES:
    f = json.loads((FIX / f'{slug}.json').read_text())
    code, html = get(f'/{slug}-quiz')
    if code == 200:
        n['hubs_200'] += 1
    else:
        miss.append(f'/{slug}-quiz answered {code}')
        continue
    if raw_has(html, f['series']['title_en']):
        n['facts'] += 1
    else:
        miss.append(f'{slug}: title missing')
    for a in f['arcs']:
        n['arcs_total'] += 1
        if raw_has(html, a['name']):
            n['arcs'] += 1
        else:
            miss.append(f'{slug}: arc {a["name"]} missing')
    for c in f['characters']:
        if c['spoiler_level'] == 0:
            n['characters_total'] += 1
            if raw_has(html, c['name']):
                n['characters'] += 1
            else:
                miss.append(f'{slug}: character {c["name"]} missing')
        else:
            n['hidden_total'] += 1
            if not raw_has(html, c['description']):
                n['hidden_ok'] += 1
            else:
                miss.append(f'{slug}: spoiler character text {c["name"]} in the HTML')
    for t in f['themes']:
        n['themes_total'] += 1
        if raw_has(html, t['title']):
            n['themes'] += 1
        else:
            miss.append(f'{slug}: theme {t["title"]} missing')
    for q in f['quizzes']:
        tagged = [x for x in q['questions'] if x.get('spoiler', {}).get('arc', 0) > 0]
        code, qh = get(f'/q/{q["slug"]}')
        if tagged:
            n['gated_expected'] += 1
            if code != 200:
                miss.append(f'/q/{q["slug"]} answered {code}')
                continue
            gate = 'data-testid="spoiler-gate"' in qh and 'anime-o3-interstitial' in qh
            if gate:
                n['gated_quizzes'] += 1
            else:
                miss.append(f'/q/{q["slug"]}: no spoiler gate')
            for x in tagged:
                n['tagged_total'] += 1
                if tagged_text_in(qh, x, q):
                    n['tagged_leaks'] += 1
                    miss.append(f'/q/{q["slug"]}: tagged question text in the HTML: {x["question"][:50]}')
        else:
            n['free_expected'] += 1
            if code == 200:
                n['free_quizzes_200'] += 1
            else:
                miss.append(f'/q/{q["slug"]} answered {code}')

code, html = get('/series')
listed = [s for s in SERIES if f'/{s}-quiz' in html]
n['series_listed'] = len(listed)
if code != 200 or len(listed) != 3:
    miss.append(f'/series: status {code}, listed {len(listed)}')

for p in ('/groups', '/bts-quiz', '/idols'):
    c, _ = get(p)
    n[f'kpop{p}'] = c

print(' '.join(f'{k}={v}' for k, v in n.items()))
for m in miss:
    print('MISS', m)
sys.exit(1 if miss else 0)
