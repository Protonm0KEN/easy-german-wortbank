import React,{useState,useEffect,useMemo,useRef,useCallback} from 'react';
import {createRoot} from 'react-dom/client';
import {LuBookOpen,LuMessageSquare,LuTag,LuGitBranch,LuFileCheck,LuTriangleAlert,LuLayers,LuChartColumn,LuSearch,LuChevronDown,LuCheck,LuX,LuExternalLink,LuFlame,LuPackage,LuRotateCcw,LuPlay,LuHouse,LuDownload,LuUpload} from 'react-icons/lu';
import {LESSONS} from './lessons/index.js';

/* ---------- dates and spaced repetition ---------- */
const INTERVALS=[1,2,4,7,14,30], NEW_PER_DAY=20;
const dayStr=(d=new Date())=>{const p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`};
const addDays=(s,n)=>{const [y,m,d]=s.split('-').map(Number);return dayStr(new Date(y,m-1,d+n))};
const clean=w=>w.replace('·','');
export function rate(card,rating,today){
  const c=card||{box:0,due:null,reps:0};
  let box=c.box, mastered=!!c.mastered;
  if(rating==='again'){box=0;mastered=false}
  else if(rating==='good'||rating==='easy'){
    if(c.box===5&&c.reps>0&&c.due&&c.due<=today)mastered=true;
    box=Math.min(5,c.box+(rating==='easy'?2:1));
  }
  return {box,reps:(c.reps||0)+1,mastered,due:addDays(today,INTERVALS[box]),last:today};
}
export function bumpStreak(s,today){
  if(s.lastDay===today)return s;
  return {...s,lastDay:today,streak:s.lastDay===addDays(today,-1)?(s.streak||0)+1:1};
}

/* ---------- master deck across all lessons ---------- */
const DECK=LESSONS.flatMap((l,li)=>[
  ...l.nouns.map(x=>({id:`${l.id}:n:${x.w}`,kind:'word',front:`${x.art} ${x.w}`,back:x.en,sub:x.pl?`Plural: die ${x.pl}`:'Normally singular',ex:x.ex,c:x.c,lesson:li,key:x.w,art:x.art})),
  ...l.mods.map(x=>({id:`${l.id}:m:${x.w}`,kind:'word',front:x.w,back:x.en,sub:x.pair||x.comp||x.type,ex:x.ex,c:x.c,lesson:li,key:x.w})),
  ...l.verbs.map(x=>({id:`${l.id}:v:${x.inf}`,kind:'verb',front:x.inf,back:x.en,sub:`${x.pr[2]} · ${x.pt[2]} · ${x.aux} ${x.refl?'sich ':''}${x.pp}`,ex:x.ex,c:x.c,lesson:li,key:clean(x.inf)})),
  ...l.phrases.map(x=>({id:`${l.id}:p:${x.de}`,kind:'phrase',front:x.de,back:x.en,sub:x.note,c:x.c,lesson:li,key:x.de})),
]);

/* ---------- persistence: this browser, shared by every page of the site ---------- */
const EMPTY={cards:{},texts:{},streak:0,lastDay:null,newDay:null,newCount:0,updatedAt:0};
const LS='eg-wortbank-v1';
const readLocal=()=>{try{return JSON.parse(localStorage.getItem(LS))}catch{return null}};
const writeLocal=s=>{try{localStorage.setItem(LS,JSON.stringify(s))}catch{}};
function useProgress(){
  const [state,setState]=useState(()=>({...EMPTY,...(readLocal()||{})}));
  useEffect(()=>{const on=e=>{if(e.key===LS)setState({...EMPTY,...(readLocal()||{})})};addEventListener('storage',on);return()=>removeEventListener('storage',on)},[]);
  const update=useCallback(fn=>setState(s=>{const next={...fn(s),updatedAt:Date.now()};writeLocal(next);return next}),[]);
  return [state,update];
}

/* ---------- shared bits ---------- */
const Chip=({children,cls='bg-line/60 text-muted'})=><span className={`inline-block rounded px-1.5 py-0.5 font-mono text-[11px] leading-4 whitespace-nowrap ${cls}`}>{children}</span>;
const GENDER={der:'bg-der-soft text-der',die:'bg-die-soft text-die',das:'bg-das-soft text-das'};
const Filter=({options,value,onChange,label})=><div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
  {options.map(([k,t])=><button key={k} aria-pressed={value===k} onClick={()=>onChange(k)} className={`rounded-full border px-3 py-1 text-sm ${value===k?'border-accent bg-accent text-on-accent':'border-line text-muted hover:text-ink hover:border-muted'}`}>{t}</button>)}
</div>;
const Search=({value,onChange,id,ph})=><label className="relative block w-full sm:w-64"><span className="sr-only">{ph}</span><LuSearch aria-hidden className="absolute left-2.5 top-2.5 size-4 text-muted"/><input id={id} value={value} onChange={e=>onChange(e.target.value)} placeholder={ph} className="w-full rounded-md border border-line bg-surface py-1.5 pl-8 pr-2 text-sm text-ink placeholder:text-muted"/></label>;
const Head=({title,de,children})=><div className="mb-5"><h2 className="font-display text-2xl font-semibold text-ink">{de}</h2><p className="mt-1 max-w-[65ch] text-muted">{title}</p>{children}</div>;

/* ---------- Verben ---------- */
const PERSONS=['ich','du','er/sie/es','wir','ihr','sie/Sie'];
const AUX={hat:['habe','hast','hat','haben','habt','haben'],ist:['bin','bist','ist','sind','seid','sind']};
const REFL={akk:['mich','dich','sich','uns','euch','sich'],dat:['mir','dir','sich','uns','euch','sich']};
const perfekt=(v,i)=>`${AUX[v.aux][i]} ${v.refl?REFL[v.refl][i]+' ':''}${v.pp}`;
function Verbs({lesson}){
  const [f,setF]=useState('all'),[q,setQ]=useState(''),[open,setOpen]=useState(()=>new Set([lesson.verbs[0].inf])),[all,setAll]=useState(false);
  const list=lesson.verbs.filter(v=>(f==='all'||(f==='separable'?v.sep:v.type===f))&&(`${v.inf} ${v.en}`.toLowerCase().includes(q.toLowerCase())));
  const toggle=k=>setOpen(o=>{const n=new Set(o);n.has(k)?n.delete(k):n.add(k);return n});
  return <section>
    <Head de="Verben" title={`${lesson.verbs.length} verbs from the video. Open a row for all six persons in Präsens, Präteritum and Perfekt.`}/>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <Filter label="Verb type" value={f} onChange={setF} options={[['all','All'],['regular','Regular'],['irregular','Irregular'],['separable','Separable']]}/>
      <div className="flex w-full items-center gap-3 sm:w-auto"><Search id="verb-search" value={q} onChange={setQ} ph="Search verbs"/><button onClick={()=>setAll(a=>!a)} className="shrink-0 text-sm text-accent underline underline-offset-2">{all?'Collapse all':'Expand all'}</button></div>
    </div>
    <div className="divide-y divide-line border-y border-line">
      {list.map(v=>{const isOpen=all||open.has(v.inf);return <div key={v.inf}>
        <button aria-expanded={isOpen} onClick={()=>toggle(v.inf)} className="grid w-full grid-cols-[1fr_auto] items-center gap-x-3 py-2.5 text-left hover:bg-surface sm:grid-cols-[13rem_1fr_auto]">
          <span className="min-w-0 font-medium text-ink">{v.inf}<span className="ml-2 font-normal text-muted sm:hidden">{v.en}</span></span>
          <span className="col-start-1 row-start-2 min-w-0 font-mono text-[13px] text-muted sm:col-start-2 sm:row-start-1">{v.pr[2]} · {v.pt[2]} · <span className={v.aux==='ist'?'font-semibold text-accent':''}>{v.aux}</span> {v.refl?'sich ':''}{v.pp}<span className="ml-3 hidden font-sans text-sm lg:inline">{v.en}</span></span>
          <span className="col-start-2 row-span-2 row-start-1 flex items-center gap-1.5 sm:col-start-3 sm:row-span-1">
            <span className="hidden sm:inline"><Chip>{v.type}</Chip></span>{v.sep?<span className="hidden sm:inline"><Chip cls="bg-accent-soft text-accent">trennbar</Chip></span>:null}
            <LuChevronDown aria-hidden className={`size-4 text-muted transition-transform ${isOpen?'rotate-180':''}`}/></span>
        </button>
        {isOpen?<div className="pb-4"><div className="overflow-x-auto"><table className="w-full min-w-[34rem] text-sm"><thead><tr className="text-left text-muted"><th scope="col" className="w-24 py-1 font-normal"></th>{['Präsens','Präteritum','Perfekt'].map(t=><th scope="col" key={t} className="py-1 pr-3 font-medium text-ink">{t}</th>)}</tr></thead>
          <tbody className="font-mono text-[13px]">{PERSONS.map((p,i)=><tr key={p} className="border-t border-line/60"><th scope="row" className="py-1 text-left font-sans font-normal text-muted">{p}</th><td className="py-1 pr-3 text-ink">{v.pr[i]}</td><td className="py-1 pr-3 text-ink">{v.pt[i]}</td><td className="py-1 pr-3 text-ink">{perfekt(v,i)}</td></tr>)}</tbody></table></div>
          <p className="mt-2 text-sm text-muted"><span lang="de" className="text-ink">{v.ex}</span></p></div>:null}
      </div>})}
      {list.length===0?<p className="py-6 text-muted">No verbs match. Clear the search or pick another type.</p>:null}
    </div>
  </section>;
}

/* ---------- Redemittel ---------- */
function Phrases({lesson}){
  const cats=[...new Set(lesson.phrases.map(p=>p.cat))];
  return <section><Head de="Redemittel & Ausdrücke" title="Sentences you can reuse at any post office counter, grouped by the moment you need them."/>
    <div className="grid gap-x-10 gap-y-7 lg:grid-cols-2">{cats.map(c=><div key={c} className="min-w-0"><h3 className="mb-2 font-mono text-xs uppercase tracking-wider text-accent">{c}</h3>
      <ul className="divide-y divide-line border-t border-line">{lesson.phrases.filter(p=>p.cat===c).map(p=><li key={p.de} className="py-2.5"><p lang="de" className="font-medium text-ink">{p.de}</p><p className="text-ink/80">{p.en}</p><p className="mt-0.5 text-sm text-muted">{p.note}</p></li>)}</ul></div>)}</div>
  </section>;
}

/* ---------- Nomen & Adjektive ---------- */
function Vocab({lesson}){
  const [f,setF]=useState('all'),[q,setQ]=useState('');
  const match=s=>s.toLowerCase().includes(q.toLowerCase());
  const nouns=lesson.nouns.filter(x=>(f==='all'||x.art===f)&&match(`${x.w} ${x.en}`));
  const mods=lesson.mods.filter(x=>match(`${x.w} ${x.en}`));
  return <section><Head de="Nomen & Adjektive" title="Learn each noun with its article and plural. Colours follow the gender."/>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><Filter label="Gender" value={f} onChange={setF} options={[['all','All'],['der','der'],['die','die'],['das','das']]}/><Search id="noun-search" value={q} onChange={setQ} ph="Search vocabulary"/></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[36rem] text-sm"><thead><tr className="border-b border-line text-left text-muted"><th scope="col" className="py-1.5 pr-3 font-normal">Nomen</th><th scope="col" className="py-1.5 pr-3 font-normal">Plural</th><th scope="col" className="py-1.5 pr-3 font-normal">English</th><th scope="col" className="py-1.5 font-normal">Beispiel</th></tr></thead>
      <tbody>{nouns.map(x=><tr key={x.w} className="border-b border-line/60 align-top"><td className="py-1.5 pr-3 whitespace-nowrap"><Chip cls={GENDER[x.art]}>{x.art}</Chip> <span className="font-medium text-ink">{x.w}</span></td><td className="py-1.5 pr-3 font-mono text-[13px] text-muted whitespace-nowrap">{x.pl?`die ${x.pl}`:'sg.'}</td><td className="py-1.5 pr-3 text-ink">{x.en}</td><td lang="de" className="py-1.5 text-muted">{x.ex}</td></tr>)}</tbody></table></div>
    <h3 className="mt-9 mb-2 font-display text-xl font-semibold text-ink">Adjektive, Adverbien, Präpositionen</h3>
    <div className="overflow-x-auto"><table className="w-full min-w-[36rem] text-sm"><thead><tr className="border-b border-line text-left text-muted"><th scope="col" className="py-1.5 pr-3 font-normal">Wort</th><th scope="col" className="py-1.5 pr-3 font-normal">English</th><th scope="col" className="py-1.5 pr-3 font-normal">Steigerung</th><th scope="col" className="py-1.5 font-normal">Verbindung</th></tr></thead>
      <tbody>{mods.map(x=><tr key={x.w} className="border-b border-line/60 align-top"><td className="py-1.5 pr-3 whitespace-nowrap"><span className="font-medium text-ink">{x.w}</span> <Chip>{x.type}</Chip></td><td className="py-1.5 pr-3 text-ink">{x.en}</td><td className="py-1.5 pr-3 font-mono text-[13px] text-muted">{x.comp||'not compared'}</td><td lang="de" className="py-1.5 text-muted">{x.pair||x.ex}</td></tr>)}</tbody></table></div>
  </section>;
}

/* ---------- Grammatik ---------- */
const Grammar=({lesson})=><section><Head de="Grammatik" title="The passive is the structure to master first, because official and service language relies on it."/>
  <div className="grid gap-x-10 gap-y-6 lg:grid-cols-2">{lesson.grammar.map(g=><article key={g.t} className="min-w-0 border-t border-line pt-3"><div className="flex items-baseline justify-between gap-3"><h3 className="font-display text-lg font-semibold text-ink">{g.t}</h3><Chip cls="bg-accent-soft text-accent">{g.tag}</Chip></div>
    <p className="mt-1 max-w-[65ch] text-ink/85">{g.r}</p>
    <dl className="mt-2 space-y-1 text-sm">{g.ex.map(([de,en])=><div key={de} className="grid gap-x-4 sm:grid-cols-2"><dt lang="de" className="font-mono text-[13px] text-ink">{de}</dt><dd className="text-muted">{en}</dd></div>)}</dl></article>)}</div>
</section>;

/* ---------- Goethe practice ---------- */
const norm=s=>s.trim().toLowerCase();
function Question({q,i,value,onChange,checked}){
  const ok=q.type==='mc'?value===q.a:norm(value||'')===norm(q.a);
  return <li className="border-t border-line py-3"><p lang="de" className="font-medium text-ink"><span className="mr-1 font-mono text-muted">{i+1}.</span> {q.q}</p>
    {q.type==='mc'?<div className="mt-2 space-y-1">{q.o.map((o,k)=>{const sel=value===k;const cls=checked&&k===q.a?'border-good bg-good-soft':checked&&sel?'border-bad bg-bad-soft':sel?'border-accent bg-accent-soft':'border-line hover:border-muted';
      return <button key={o} disabled={checked} aria-pressed={sel} onClick={()=>onChange(k)} className={`flex w-full items-center gap-2 rounded-md border px-3 py-1.5 text-left text-ink ${cls}`}><span className="font-mono text-xs text-muted">{'abc'[k]}</span><span lang="de" className="min-w-0">{o}</span></button>})}</div>
    :<input aria-label={`Answer to question ${i+1}`} id={`gap-${q.a}`} disabled={checked} value={value||''} onChange={e=>onChange(e.target.value)} placeholder="Type the missing word" className={`mt-2 w-full max-w-xs rounded-md border bg-surface px-3 py-1.5 text-ink ${checked?(ok?'border-good':'border-bad'):'border-line'}`}/>}
    {checked?<p className={`mt-2 flex gap-1.5 text-sm ${ok?'text-good':'text-bad'}`}>{ok?<LuCheck aria-hidden className="mt-0.5 size-4 shrink-0"/>:<LuX aria-hidden className="mt-0.5 size-4 shrink-0"/>}<span lang="de"><span className="font-medium">{ok?'Richtig. ':q.type==='gap'?`Lösung: ${q.a}. `:'Falsch. '}</span><span className="text-ink/85">{q.why}</span></span></p>:null}
  </li>;
}
function Practice({lesson,state,update}){
  const [cur,setCur]=useState(lesson.texts[0].id);
  const t=lesson.texts.find(x=>x.id===cur);
  const saved=state.texts[t.id];
  const [ans,setAns]=useState({}),[checked,setChecked]=useState(false);
  useEffect(()=>{setAns(saved?.ans||{});setChecked(!!saved)},[cur]);
  const score=t.qs.filter((q,i)=>q.type==='mc'?ans[i]===q.a:norm(ans[i]||'')===norm(q.a)).length;
  const answered=t.qs.every((q,i)=>ans[i]!==undefined&&ans[i]!=='');
  const check=()=>{setChecked(true);update(s=>({...s,texts:{...s.texts,[t.id]:{score,total:t.qs.length,ans,day:dayStr()}}}))};
  return <section><Head de="Goethe-Zertifikat B2 Übungen" title="Reading texts built from this lesson's vocabulary, in the style of the exam. These are practice texts, not official Goethe papers."/>
    <div className="mb-5"><Filter label="Text" value={cur} onChange={setCur} options={lesson.texts.map(x=>[x.id,`${x.title}${state.texts[x.id]?' ✓':''}`])}/></div>
    <div className={`grid gap-8 ${t.paras.length?'lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]':''}`}>
      {t.paras.length?<article lang="de" className="min-w-0"><h3 className="font-display text-xl font-semibold text-ink">{t.title}</h3>{t.paras.map(p=><p key={p.slice(0,20)} className="mt-3 max-w-[65ch] leading-relaxed text-ink">{p}</p>)}</article>:null}
      <div className="min-w-0 max-w-[65ch]">{t.intro?<p className="mb-3 text-muted">{t.intro}</p>:null}<h3 className="mb-1 font-mono text-xs uppercase tracking-wider text-accent">Aufgaben</h3>
        <ol>{t.qs.map((q,i)=><Question key={q.q} q={q} i={i} value={ans[i]} checked={checked} onChange={val=>setAns(a=>({...a,[i]:val}))}/>)}</ol>
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
          {checked?<><span className="font-mono text-ink">{score} / {t.qs.length} richtig</span><button onClick={()=>{setChecked(false);setAns({})}} className="flex items-center gap-1.5 text-sm text-accent underline underline-offset-2"><LuRotateCcw aria-hidden className="size-3.5"/>Try again</button></>
          :<><button disabled={!answered} onClick={check} className="rounded-md bg-accent px-4 py-1.5 font-medium text-on-accent disabled:opacity-40">Check answers</button>{!answered?<span className="text-sm text-muted">Answer every question to check.</span>:null}</>}
        </div></div></div></section>;
}

/* ---------- Häufige Fehler ---------- */
function Mistakes({lesson}){
  const kinds=['all',...new Set(lesson.mistakes.map(m=>m.k))];
  const [f,setF]=useState('all');
  return <section><Head de="Häufige Fehler" title="False friends, preposition traps and small differences that cost marks."/>
    <div className="mb-4"><Filter label="Mistake type" value={f} onChange={setF} options={kinds.map(k=>[k,k==='all'?'All':k])}/></div>
    <ul className="grid gap-x-10 lg:grid-cols-2">{lesson.mistakes.filter(m=>f==='all'||m.k===f).map(m=><li key={m.bad} className="min-w-0 border-t border-line py-3"><Chip>{m.k}</Chip>
      <p lang="de" className="mt-1.5 flex gap-1.5 text-bad"><LuX aria-label="Wrong" className="mt-1 size-4 shrink-0"/><span className="line-through decoration-1">{m.bad}</span></p>
      <p lang="de" className="flex gap-1.5 font-medium text-good"><LuCheck aria-label="Right" className="mt-1 size-4 shrink-0"/><span>{m.good}</span></p>
      <p className="mt-1 text-sm text-muted">{m.why}</p></li>)}</ul></section>;
}

/* ---------- SRS ---------- */
const RATINGS=[['again','Again','bg-bad-soft text-bad border-bad/40'],['hard','Hard','bg-warn-soft text-warn border-warn/40'],['good','Good','bg-good-soft text-good border-good/40'],['easy','Easy','bg-accent-soft text-accent border-accent/40']];
const inDays=n=>n===1?'1 day':`${n} days`;
function buildQueue(state,today,kind,scope){
  const pool=DECK.filter(c=>(kind==='all'||c.kind===kind)&&(scope==null||c.lesson===scope));
  const due=pool.filter(c=>state.cards[c.id]&&state.cards[c.id].due<=today);
  const used=state.newDay===today?state.newCount:0;
  const fresh=pool.filter(c=>!state.cards[c.id]).slice(0,Math.max(0,NEW_PER_DAY-used));
  return [...due,...fresh].map(c=>c.id);
}
function SRS({state,update,li}){
  const today=dayStr();
  const [kind,setKind]=useState('all');
  const [scope,setScope]=useState(li);
  const [queue,setQueue]=useState(()=>buildQueue(state,today,'all',li));
  const [flip,setFlip]=useState(false);
  const [done,setDone]=useState(0);
  const change=k=>{setKind(k);setFlip(false);setQueue(buildQueue(state,today,k,scope))};
  const changeScope=k=>{const v=k==='this'?li:null;setScope(v);setFlip(false);setQueue(buildQueue(state,today,kind,v))};
  const card=DECK.find(c=>c.id===queue[0]);
  const answer=r=>{
    if(!card)return;
    const prev=state.cards[card.id];
    update(s=>{const b=bumpStreak(s,today),isNew=!s.cards[card.id];
      return {...b,cards:{...s.cards,[card.id]:rate(s.cards[card.id],r,today)},newDay:today,newCount:(s.newDay===today?s.newCount:0)+(isNew?1:0)}});
    setFlip(false);setDone(d=>d+1);
    setQueue(q=>r==='again'?[...q.slice(1),q[0]]:q.slice(1));
  };
  useEffect(()=>{const on=e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
    if(e.code==='Space'&&!e.target.closest('button')){e.preventDefault();setFlip(f=>!f)}
    if(flip&&'1234'.includes(e.key)&&e.key.length===1)answer(RATINGS[+e.key-1][0])};
    window.addEventListener('keydown',on);return()=>window.removeEventListener('keydown',on)});
  const prev=card&&(state.cards[card.id]||{box:0});
  const preview=r=>{const n=rate(state.cards[card.id],r,today);return r==='again'?'again today':inDays(INTERVALS[n.box])};
  return <section><Head de="SRS-Karteikarten" title={`Reviews are shared across all your videos. Up to ${NEW_PER_DAY} new cards a day, plus everything due.`}/>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-3"><Filter label="Card type" value={kind} onChange={change} options={[['all','All'],['word','Words'],['verb','Verbs'],['phrase','Phrases']]}/>{li!=null?<Filter label="Which videos" value={scope==null?'every':'this'} onChange={changeScope} options={[['this','This video'],['every','All videos']]}/>:null}</div><span className="font-mono text-sm text-muted">{queue.length} left · {done} done</span></div>
    {card?<div className="mx-auto max-w-xl">
      <button onClick={()=>setFlip(f=>!f)} aria-label={flip?'Show the German side':'Show the answer'} className="block min-h-64 w-full rounded-lg border border-line bg-surface p-6 text-left shadow-sm">
        <span className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted"><span>{card.kind} · Box {prev.box}</span><span>{LESSONS[card.lesson].clusters[card.c]}</span></span>
        <span lang="de" className="mt-6 block text-center font-display text-3xl font-semibold text-balance text-ink">{card.art?<span className={card.art==='der'?'text-der':card.art==='die'?'text-die':'text-das'}>{card.art} </span>:null}{card.art?card.front.replace(card.art+' ',''):card.front}</span>
        {flip?<span className="mt-4 block border-t border-line pt-4 text-center"><span className="block text-xl text-ink">{card.back}</span><span lang="de" className="mt-1 block font-mono text-[13px] text-muted">{card.sub}</span>{card.ex?<span lang="de" className="mt-3 block text-ink/80">{card.ex}</span>:null}</span>
        :<span className="mt-10 block text-center text-sm text-muted">Tap to show the answer</span>}
      </button>
      {flip?<div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{RATINGS.map(([k,t,cls],i)=><button key={k} onClick={()=>answer(k)} className={`rounded-md border px-2 py-2 text-center ${cls}`}><span className="block font-medium">{t}</span><span className="block font-mono text-[11px] opacity-80">{preview(k)}</span></button>)}</div>
      :<button onClick={()=>setFlip(true)} className="mt-3 w-full rounded-md bg-accent py-2.5 font-medium text-on-accent">Show answer</button>}
      <p className="mt-3 hidden text-center text-sm text-muted sm:block">Space flips the card. Keys 1 to 4 rate it.</p>
    </div>:<div className="mx-auto max-w-xl rounded-lg border border-line bg-surface p-8 text-center"><p className="font-display text-xl font-semibold text-ink">Nothing left for today</p><p className="mt-1 text-muted">Come back tomorrow for your next reviews, or check the forecast in Fortschritt.</p></div>}
  </section>;
}

/* ---------- Knowledge graph ---------- */
const NODE_STATE=c=>!c?'new':c.mastered?'mastered':c.box>=3?'strong':'learning';
const NODE_CLS={new:'var(--line-strong)',learning:'var(--warn)',strong:'var(--accent)',mastered:'var(--der)'};
function Graph({state,li}){
  const lesson=LESSONS[li],CLUSTERS=lesson.clusters,LDECK=DECK.filter(c=>c.lesson===li);
  const [sel,setSel]=useState(null);
  const W=760,H=460,cx=W/2,cy=H/2;
  const hubs=Object.keys(CLUSTERS);
  const layout=useMemo(()=>{
    const pos={},hubPos={};
    hubs.forEach((h,i)=>{const a=-Math.PI/2+i/hubs.length*2*Math.PI,x=cx+Math.cos(a)*262,y=cy+Math.sin(a)*150;hubPos[h]={x,y};
      LDECK.filter(c=>c.c===h).forEach((c,k)=>{const r=19+10.5*Math.sqrt(k),t=k*2.39996;pos[c.id]={x:x+Math.cos(t)*r*1.25,y:y+Math.sin(t)*r*.9,c}})});
    const byKey=Object.fromEntries(LDECK.filter(c=>c.kind!=='phrase').map(c=>[c.key,c.id]));
    const edges=lesson.links.map(([a,b])=>[byKey[a],byKey[b]]).filter(([a,b])=>a&&b);
    return {pos,hubPos,edges};
  },[]);
  const linked=sel?new Set(layout.edges.filter(e=>e.includes(sel)).flat()):null;
  const s=sel&&layout.pos[sel].c;
  return <div>
    <div className="overflow-x-auto"><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Network of vocabulary grouped into topics. Each dot is one entry, coloured by how well you know it." className="block w-full min-w-[34rem]">
      {hubs.map(h=><line key={h} x1={cx} y1={cy} x2={layout.hubPos[h].x} y2={layout.hubPos[h].y} stroke="var(--line)" strokeWidth="1"/>)}
      {layout.edges.map(([a,b])=>{const A=layout.pos[a],B=layout.pos[b],on=sel&&(a===sel||b===sel);return <line key={a+b} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={on?'var(--accent)':'var(--line-strong)'} strokeWidth={on?2:.8} opacity={sel&&!on?.25:.8}/>})}
      {Object.entries(layout.pos).map(([id,p])=>{const st=NODE_STATE(state.cards[id]),on=id===sel,near=linked?.has(id);return <circle key={id} tabIndex={0} role="button" aria-label={`${p.c.front}: ${p.c.back}`} cx={p.x} cy={p.y} r={on?8:5} fill={NODE_CLS[st]} stroke={on||near?'var(--ink)':'var(--bg)'} strokeWidth={on||near?1.5:1} opacity={sel&&!on&&!near?.45:1} className="cursor-pointer" onClick={()=>setSel(on?null:id)} onKeyDown={e=>{if(e.key==='Enter')setSel(on?null:id)}}><title>{p.c.front}</title></circle>})}
      {sel?[...linked].filter(id=>id).map(id=>{const p=layout.pos[id];return <text key={id} x={p.x+9} y={p.y-7} fontSize="12" fill="var(--ink)" stroke="var(--bg)" strokeWidth="3" paintOrder="stroke" className="pointer-events-none font-sans">{p.c.key.length>22?p.c.key.slice(0,22)+'…':p.c.key}</text>}):null}
      {hubs.map(h=>{const p=layout.hubPos[h];return <text key={h} x={p.x} y={p.y+4} textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--ink)" stroke="var(--bg)" strokeWidth="4" paintOrder="stroke" className="pointer-events-none font-sans">{CLUSTERS[h]}</text>})}
      <text x={cx} y={cy+4} textAnchor="middle" fontSize="15" fontWeight="600" fill="var(--accent)" stroke="var(--bg)" strokeWidth="5" paintOrder="stroke" className="font-sans">{lesson.hub}</text>
    </svg></div>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="min-h-5 text-muted" aria-live="polite">{s?<><span lang="de" className="font-medium text-ink">{s.front}</span>: {s.back}</>:'Select a dot to see what it connects to.'}</p>
      <div className="flex flex-wrap gap-3 text-muted">{[['new','New'],['learning','Learning'],['strong','Box 3+'],['mastered','Mastered']].map(([k,t])=><span key={k} className="flex items-center gap-1.5"><svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="5" fill={NODE_CLS[k]}/></svg>{t}</span>)}</div>
    </div></div>;
}

/* ---------- Fortschritt ---------- */
function stats(state,li){
  const today=dayStr(); const c=id=>state.cards[id];
  const D=li==null?DECK:DECK.filter(x=>x.lesson===li), TX=li==null?LESSONS.flatMap(l=>l.texts):LESSONS[li].texts;
  const of=k=>D.filter(x=>x.kind===k);
  const words=[...of('word'),...of('verb')];
  return {words:words.length,wordsDone:words.filter(x=>c(x.id)?.mastered).length,phrases:of('phrase').length,phrasesDone:of('phrase').filter(x=>(c(x.id)?.box||0)>=3).length,
    texts:TX.length,textsDone:TX.filter(t=>state.texts[t.id]).length,total:D.length,
    due:D.filter(x=>c(x.id)&&c(x.id).due<=today).length,seen:D.filter(x=>c(x.id)).length,
    streak:(state.lastDay===today||state.lastDay===addDays(today,-1))?state.streak:0};
}
function Backup({state,update}){
  const [confirm,setConfirm]=useState(false),[msg,setMsg]=useState('');
  const save=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(state)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`wortbank-progress-${dayStr()}.json`;a.click();URL.revokeObjectURL(url);setMsg('Backup saved to your downloads.')};
  const load=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{const r=JSON.parse(await f.text());if(!r.cards)throw 0;update(()=>({...EMPTY,...r}));setMsg('Progress restored.')}catch{setMsg('That file is not a Wortbank backup. Choose a file saved with Export progress.')}};
  const btn='inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-ink hover:border-muted';
  return <div className="mt-6 border-t border-line pt-3 text-sm text-muted"><p>Progress is saved in this browser. To move it to another device, export it here and import it there.</p>
    <div className="mt-2 flex flex-wrap items-center gap-2"><button onClick={save} className={btn}><LuDownload aria-hidden className="size-4"/>Export progress</button>
    <label className={`${btn} cursor-pointer`}><LuUpload aria-hidden className="size-4"/>Import progress<input id="import-progress" type="file" accept="application/json" onChange={load} className="sr-only"/></label>
    {confirm?<><span className="text-ink">Erase all progress?</span><button onClick={()=>{update(()=>({...EMPTY}));setConfirm(false)}} className="rounded border border-bad px-2 py-0.5 text-bad">Erase</button><button onClick={()=>setConfirm(false)} className="underline underline-offset-2">Keep it</button></>:<button onClick={()=>setConfirm(true)} className="underline underline-offset-2">Reset progress</button>}
    {msg?<span role="status" className="text-ink">{msg}</span>:null}</div></div>;
}
function Progress({state,update,li}){
  const st=stats(state,li),today=dayStr(),D=li==null?DECK:DECK.filter(c=>c.lesson===li);
  const boxes=[0,1,2,3,4,5].map(b=>D.filter(c=>state.cards[c.id]?.box===b).length);
  const unseen=D.length-st.seen, maxB=Math.max(1,unseen,...boxes);
  const fc=Array.from({length:14},(_,i)=>{const d=addDays(today,i);return {d,n:D.filter(c=>{const x=state.cards[c.id];return x&&(i===0?x.due<=d:x.due===d)}).length}});
  const maxF=Math.max(1,...fc.map(x=>x.n));
  return <section><Head de="Fortschritt" title="Everything here updates as you rate cards and check reading texts."/>
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="min-w-0"><h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-accent">Leitner boxes</h3>
        <div className="space-y-1.5">{[['New',unseen],...boxes.map((n,i)=>[`Box ${i}`,n])].map(([l,n])=><div key={l} className="grid grid-cols-[3.5rem_1fr_2.5rem] items-center gap-2 text-sm"><span className="text-muted">{l}</span><span className="h-3 rounded-sm bg-line/50"><span className="block h-3 rounded-sm bg-accent" style={{width:`${n/maxB*100}%`}}/></span><span className="text-right font-mono tabular-nums text-ink">{n}</span></div>)}</div>
        <p className="mt-2 text-sm text-muted">Next review after 1, 2, 4, 7, 14 and 30 days for boxes 0 to 5. A card is mastered when it passes a review in box 5.</p></div>
      <div className="min-w-0"><h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-accent">Reviews due, next 14 days</h3>
        {st.seen===0?<p className="text-muted">Your forecast appears after your first flashcard session.</p>:<svg viewBox="0 0 420 130" role="img" aria-label="Bar chart of reviews due per day for the next 14 days" className="block w-full">
          {fc.map((x,i)=>{const h=x.n/maxF*92;return <g key={x.d}><rect x={i*30+3} y={104-h} width="24" height={Math.max(h,x.n?2:0)} rx="2" fill="var(--accent)"/>{x.n?<text x={i*30+15} y={100-h} textAnchor="middle" fontSize="10" fill="var(--ink)">{x.n}</text>:null}{i%2===0?<text x={i*30+15} y="120" textAnchor="middle" fontSize="10" fill="var(--muted)">{x.d.slice(8)}.{x.d.slice(5,7)}.</text>:null}</g>})}
          <line x1="0" x2="420" y1="104.5" y2="104.5" stroke="var(--line-strong)"/></svg>}</div>
    </div>
    {li!=null?<><h3 className="mt-9 mb-2 font-mono text-xs uppercase tracking-wider text-accent">Wortnetz</h3><Graph state={state} li={li}/></>:null}
    <h3 className="mt-9 mb-2 font-mono text-xs uppercase tracking-wider text-accent">Lessons</h3>
    <div className="overflow-x-auto"><table className="w-full min-w-[30rem] text-sm"><thead><tr className="border-b border-line text-left text-muted"><th scope="col" className="py-1 pr-3 font-normal">Video</th><th scope="col" className="py-1 pr-3 text-right font-normal">Entries</th><th scope="col" className="py-1 pr-3 text-right font-normal">Started</th><th scope="col" className="py-1 text-right font-normal">Texts done</th></tr></thead>
      <tbody>{LESSONS.map((l,i)=>{const cs=DECK.filter(c=>c.lesson===i);return <tr key={l.id} className="border-b border-line/60"><td className="py-1.5 pr-3"><a className="text-accent underline underline-offset-2" href={pageHref(l)}>{l.title}</a></td><td className="py-1.5 pr-3 text-right font-mono text-ink">{cs.length}</td><td className="py-1.5 pr-3 text-right font-mono text-ink">{cs.filter(c=>state.cards[c.id]).length}</td><td className="py-1.5 text-right font-mono text-ink">{l.texts.filter(t=>state.texts[t.id]).length} / {l.texts.length}</td></tr>})}</tbody></table></div>
    <Backup state={state} update={update}/>
  </section>;
}

/* ---------- shell ---------- */
const ROOT=document.body?.dataset.root??'';
const pageHref=l=>`${ROOT}lessons/${l.slug}.html`;
const LESSON_TABS=[['verben','Verben',LuBookOpen],['redemittel','Redemittel',LuMessageSquare],['vokabeln','Nomen & Adj.',LuTag],['grammatik','Grammatik',LuGitBranch],['goethe','Goethe B2',LuFileCheck],['fehler','Fehler',LuTriangleAlert],['srs','SRS',LuLayers],['fortschritt','Fortschritt',LuChartColumn]];
const HOME_TABS=[['lektionen','Lektionen',LuBookOpen],['srs','SRS',LuLayers],['fortschritt','Fortschritt',LuChartColumn]];
const Meter=({label,value,max,note})=><div className="min-w-0"><div className="flex items-baseline justify-between gap-2"><span className="text-sm text-muted">{label}</span><span className="font-mono text-sm tabular-nums whitespace-nowrap text-ink">{value}{max!=null?` / ${max}`:''}</span></div>
  {max!=null?<div className="mt-1 h-1.5 rounded-full bg-line/70"><div className="h-1.5 rounded-full bg-accent" style={{width:`${value/max*100}%`}}/></div>:<div className="mt-1 text-xs text-muted">{note}</div>}</div>;
function Home({state}){
  return <section><Head de="Lektionen" title="One dashboard per video. Flashcard reviews and your streak are shared across all of them."/>
    <ul className="divide-y divide-line border-y border-line">{LESSONS.map((l,i)=>{const s=stats(state,i);return <li key={l.id}><a href={pageHref(l)} className="grid gap-x-6 gap-y-1 py-3 hover:bg-surface sm:grid-cols-[1fr_16rem]"><span className="min-w-0"><span className="font-mono text-xs text-accent">Lektion {String(i+1).padStart(2,'0')} · {l.series} · {l.length}</span><span className="block font-display text-lg font-semibold text-ink">{l.title}</span><span className="block text-sm text-muted">{l.topic}</span></span><span className="self-center"><Meter label="Cards started" value={s.seen} max={s.total}/></span></a></li>})}</ul></section>;
}
function App(){
  const [state,update]=useProgress();
  const slug=document.body?.dataset.lesson;
  const li=slug?LESSONS.findIndex(l=>l.slug===slug):null;
  const lesson=li==null?null:LESSONS[li], TABS=lesson?LESSON_TABS:HOME_TABS;
  const start=()=>{const h=location.hash.slice(1);return TABS.some(t=>t[0]===h)?h:TABS[0][0]};
  const [tab,setTab]=useState(start);
  useEffect(()=>{const on=()=>setTab(start());addEventListener('hashchange',on);return()=>removeEventListener('hashchange',on)},[]);
  const go=k=>{setTab(k);location.hash=k};
  const st=stats(state,li), used=state.newDay===dayStr()?state.newCount:0;
  return <div className="min-h-full bg-bg text-ink">
    <header className="border-b border-line bg-surface"><div className="mx-auto max-w-6xl px-gutter pb-3 pt-5">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">{lesson?<a href={`${ROOT}index.html`} className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-accent"><LuHouse aria-hidden className="size-3.5"/>Alle Lektionen</a>:<p className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-accent"><LuPackage aria-hidden className="size-3.5"/>Goethe B2</p>}
          <h1 className="mt-1 font-display text-3xl font-bold text-balance text-ink">{lesson?lesson.title:'Easy German Wortbank'}</h1>
          {lesson?<a href={lesson.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-muted hover:text-accent"><LuExternalLink aria-hidden className="size-3.5"/>{lesson.series} · {lesson.length}</a>:null}</div>
        {LESSONS.length>1&&lesson?<div className="w-full min-w-0 sm:w-80"><label htmlFor="lesson" className="sr-only">Go to lesson</label><select id="lesson" value={li} onChange={e=>{location.href=pageHref(LESSONS[+e.target.value])}} className="w-full rounded-md border border-line bg-bg px-2 py-1.5 text-ink">{LESSONS.map((l,i)=><option key={l.id} value={i}>Lektion {String(i+1).padStart(2,'0')}: {l.title}</option>)}</select></div>:null}</div>
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-5">
        <Meter label="Words mastered" value={st.wordsDone} max={st.words}/><Meter label="Phrases learned" value={st.phrasesDone} max={st.phrases}/><Meter label="B2 texts completed" value={st.textsDone} max={st.texts}/>
        <Meter label="SRS streak" value={`${st.streak} ${st.streak===1?'day':'days'}`} note={st.streak?'Keep it going today':'Review a card to start'}/>
        <button onClick={()=>go('srs')} className="col-span-2 flex items-center justify-center gap-2 self-center rounded-md bg-accent px-3 py-2 font-medium text-on-accent lg:col-span-1"><LuPlay aria-hidden className="size-4"/>Review cards</button>
      </div></div>
      <nav aria-label="Sections" className="mx-auto max-w-6xl overflow-x-auto px-gutter"><div className="flex w-max gap-1">{TABS.map(([k,t,I])=><button key={k} aria-current={tab===k?'page':undefined} onClick={()=>go(k)} className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 py-2 text-sm ${tab===k?'border-accent font-medium text-ink':'border-transparent text-muted hover:text-ink'}`}><I aria-hidden className="size-4"/>{t}</button>)}</div></nav>
    </header>
    <main className="mx-auto max-w-6xl px-gutter py-7">
      {tab==='lektionen'?<Home state={state}/>:tab==='verben'?<Verbs lesson={lesson}/>:tab==='redemittel'?<Phrases lesson={lesson}/>:tab==='vokabeln'?<Vocab lesson={lesson}/>:tab==='grammatik'?<Grammar lesson={lesson}/>:tab==='goethe'?<Practice lesson={lesson} state={state} update={update}/>:tab==='fehler'?<Mistakes lesson={lesson}/>:tab==='srs'?<SRS state={state} update={update} li={li}/>:<Progress state={state} update={update} li={li}/>}
    </main>
  </div>;
}
if(typeof document!=='undefined'&&document.getElementById('root'))createRoot(document.getElementById('root')).render(<App/>);
