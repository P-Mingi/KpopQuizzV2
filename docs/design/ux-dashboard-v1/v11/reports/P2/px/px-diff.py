#!/usr/bin/env python3
"""Diff px-measure.mjs output: boxes (x, w, h absolute; y relative to an anchor) and computed styles."""
import json, sys

data = json.load(open(sys.argv[1]))
only = sys.argv[2].split(',') if len(sys.argv) > 2 and sys.argv[2] else None
TOL = 2.0
# y anchor per label: header labels vs the h1; control/grid labels vs the controls row
ANCHOR = {
    'wrap': None, 'header': 'h1', 'h1': None, 'intro': 'h1', 'create': 'h1',
}
SKIP_STYLE = {'width', 'height'}
TEXTY = {'card-0', 'card-1', 'card-2', 'card-3', 'card-4', 'qt', 'qb', 'intro', 'header', 'more-wrap'}

for key, v in data.items():
    if only and not any(o in key for o in only):
        continue
    p, i = v['proto'], v['impl']
    print(f'\n=== {key}  doc h proto {p["_doc"]["h"]} impl {i["_doc"]["h"]}  overflow impl {i["_doc"]["overflow"]}')
    for lab in [k for k in p if not k.startswith('_')]:
        if lab not in i:
            print(f'  {lab:10s} MISSING in impl')
            continue
        pb, ib = p[lab]['box'], i[lab]['box']
        anc = ANCHOR.get(lab, 'ctl')
        if anc and anc in p and anc in i and lab != anc:
            dy = (ib['y'] - i[anc]['box']['y']) - (pb['y'] - p[anc]['box']['y'])
        else:
            dy = ib['y'] - pb['y']
        dx, dw, dh = ib['x'] - pb['x'], ib['w'] - pb['w'], ib['h'] - pb['h']
        flag = ' ' if max(abs(dx), abs(dy), abs(dw), abs(dh)) <= TOL else '*'
        sd = []
        for prop, pv in p[lab]['s'].items():
            iv = i[lab]['s'].get(prop)
            if prop in SKIP_STYLE or iv == pv:
                continue
            if prop == 'font-family' and pv.split(',')[0] == iv.split(',')[0]:
                continue
            if prop == 'border-top-style' and p[lab]['s'].get('border-top-width') == '0px' and i[lab]['s'].get('border-top-width') == '0px':
                continue
            sd.append(f'{prop}: {pv} -> {iv}')
        print(f' {flag}{lab:10s} p({pb["x"]:.1f},{pb["y"]:.1f},{pb["w"]:.1f}x{pb["h"]:.1f}) i({ib["x"]:.1f},{ib["y"]:.1f},{ib["w"]:.1f}x{ib["h"]:.1f}) d x{dx:+.1f} y{dy:+.1f}[{anc or "abs"}] w{dw:+.1f} h{dh:+.1f}')
        for s in sd:
            print(f'      {s}')
    for lab in [k for k in i if not k.startswith('_') and k not in p]:
        print(f'  {lab:10s} impl only ({i[lab]["box"]})')
