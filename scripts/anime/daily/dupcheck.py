#!/usr/bin/env python3
"""Near-duplicate finder over every anime question already asked (published quizzes, taken rows, lot 1, lot 2 parts).
usage: python3 dupcheck.py "question text" ["answer text"] [--series bleach] [--top 6]
       python3 dupcheck.py --file quiz.json   (a lot2 part file: checks each of its questions against the corpus, skipping itself)"""
import json,glob,re,sys,math,collections
R='/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-kpopdle/'
TAKEN=['Name That Series: Deep Cuts','Sessions in the Solar System: True or False','Stand Proud: Facts From the Joestar Archive','Naruto Endings: Roll the Credits','Directors, Awards and Theme Songs','Rank E True or False','Dragon Ball Jukebox: Openings and Endings','One Punch Statements: True or False','Closing Credits: Ending Song Quiz','Soul Reaper Statements: True or False','From Web Novel to Webtoon to Film','Name That Series: Studios, Songs and Staff','From 1984 to Daima: Dragon Ball by the Calendar','Rank E and the Web Novel Behind It']
stop=set('the a an of in to and is was which who what how are did does for by on as at with from this that it its be or not true false these following first'.split())
def lab(o): return o if isinstance(o,str) else o['label']
def ans(q):
    if 'options' in q: return lab(q['options'][q['correct']])
    return 'True' if q['correct'] else 'False'
def toks(s): return [w for w in re.findall(r"[a-z0-9]+",s.lower()) if w not in stop]
def corpus(skip=None):
    c=[]
    for f in glob.glob(R+'docs/anime/data/quizzes/*/*.json'):
        d=json.load(open(f))
        for q in d['questions']: c.append((f"published:{d['group_slug']}:{d['title']}",q))
    l08=json.load(open(R+'docs/anime/data/daily/b1.json'))+json.load(open(R+'docs/anime/data/daily/b2.json'))
    for r in l08:
        if r['title'] in TAKEN:
            for q in r['questions']: c.append((f"taken:{r['group_slug']}:{r['title']}",q))
    lot=json.load(open(R+'docs/anime/data/verify/bank-lot1.json'))
    for z in lot['quizzes']:
        for q in z['questions']: c.append((f"lot1:{z['group_slug']}:{z['date']}",q))
    for f in sorted(glob.glob(R+'docs/anime/data/verify/lot2-parts/*.json')):
        if skip and f.endswith(skip): continue
        z=json.load(open(f))
        for q in z['questions']: c.append((f"lot2:{z['group_slug']}:{z['date']}",q))
    return c
def text(q):
    t=q['question']
    if 'options' in q: t+=' '+ans(q)+' '+ans(q)
    if q.get('clues'): t+=' '+' '.join(q['clues'])
    return t
def build(c):
    docs=[collections.Counter(toks(text(q))) for _,q in c]
    df=collections.Counter()
    for d in docs: df.update(d.keys())
    N=len(docs); idf={w:math.log((N+1)/(n+0.5)) for w,n in df.items()}
    return docs,idf
def vec(cnt,idf):
    v={w:n*idf.get(w,math.log(5000)) for w,n in cnt.items()}; nr=math.sqrt(sum(x*x for x in v.values())) or 1
    return {w:x/nr for w,x in v.items()}
def top(qtext,c,docs,idf,k=5,series=None):
    qv=vec(collections.Counter(toks(qtext)),idf); out=[]
    for i,d in enumerate(docs):
        dv=vec(d,idf); s=sum(x*dv.get(w,0) for w,x in qv.items())
        if s>0.2: out.append((s,i))
    out.sort(reverse=True); return [(s,c[i]) for s,i in out[:k]]
def show(qt,res):
    for s,(o,q) in res:
        print(f"   {s:.2f} [{o}] {q['question']}  => {ans(q)}")
if __name__=='__main__':
    a=sys.argv[1:]
    if a and a[0]=='--draft':
        l08=json.load(open(R+'docs/anime/data/daily/b1.json'))+json.load(open(R+'docs/anime/data/daily/b2.json'))
        r=[x for x in l08 if x['title']==a[1]][0]; c=corpus(); docs,idf=build(c)
        print(json.dumps({k:v for k,v in r.items() if k!='questions'},indent=1)[:1500])
        for i,q in enumerate(r['questions']):
            res=top(text(q),c,docs,idf,k=3); print(f"--- draft #{i+1}: {json.dumps(q,ensure_ascii=False)}")
            print('   nearest already asked:'); show(q,res)
    elif a and a[0]=='--file':
        z=json.load(open(a[1])); c=corpus(skip=a[1].split('/')[-1]); docs,idf=build(c)
        for i,q in enumerate(z['questions']):
            res=top(text(q),c,docs,idf,k=3)
            flag=' <<< CHECK' if res and res[0][0]>=0.55 else ''
            print(f"#{i+1} {q['question'][:90]} => {ans(q)}{flag}"); show(q,res[:2] if not flag else res)
    else:
        k=6
        if '--top' in a: k=int(a[a.index('--top')+1]); 
        pos=[x for x in a if not x.startswith('--') and not (a.index(x)>0 and a[a.index(x)-1]=='--top')]
        c=corpus(); docs,idf=build(c)
        t=pos[0]+((' '+pos[1]+' '+pos[1]) if len(pos)>1 else '')
        show(t,top(t,c,docs,idf,k=k))
