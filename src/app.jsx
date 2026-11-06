import React,{useState,useEffect,useMemo,useRef,useCallback} from 'react';
import {createRoot} from 'react-dom/client';
import {LuBookOpen,LuMessageSquare,LuTag,LuGitBranch,LuFileCheck,LuTriangleAlert,LuLayers,LuChartColumn,LuSearch,LuChevronDown,LuCheck,LuX,LuExternalLink,LuFlame,LuPackage,LuRotateCcw,LuPlay,LuHouse,LuDownload,LuUpload,LuDumbbell,LuChevronLeft,LuChevronRight,LuShuffle,LuRoute,LuStickyNote,LuCircle,LuCircleCheck,LuArrowRight,LuEye,LuEyeOff,LuTrophy} from 'react-icons/lu';
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
const EMPTY={cards:{},texts:{},drills:{},roadmap:{},streak:0,lastDay:null,newDay:null,newCount:0,updatedAt:0};
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
const Head=({title,de,children})=><div className="mb-6"><h2 className="flex items-center gap-2.5 font-display text-2xl font-semibold text-ink"><span aria-hidden className="h-6 w-1.5 rounded-full bg-accent"/>{de}</h2><p className="mt-1 pl-4 text-[14px] text-muted">{title}</p>{children}</div>;

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
    <Head de="Verben" title={`${lesson.verbs.length} verbs · tap a row for every form`}/>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <Filter label="Verb type" value={f} onChange={setF} options={[['all','All'],['regular','Regular'],['irregular','Irregular'],['separable','Separable']]}/>
      <div className="flex w-full items-center gap-3 sm:w-auto"><Search id="verb-search" value={q} onChange={setQ} ph="Search verbs"/><button onClick={()=>setAll(a=>!a)} className="shrink-0 text-sm text-accent underline underline-offset-2">{all?'Collapse all':'Expand all'}</button></div>
    </div>
    <div className="panel divide-y divide-line px-4">
      {list.map(v=>{const isOpen=all||open.has(v.inf);return <div key={v.inf}>
        <button aria-expanded={isOpen} onClick={()=>toggle(v.inf)} className="grid w-full grid-cols-[1fr_auto] items-center gap-x-3 py-3.5 text-left hover:text-accent sm:grid-cols-[13rem_1fr_auto]">
          <span className="min-w-0 font-semibold text-ink">{v.inf}<span className="ml-2 font-normal text-muted sm:hidden">{v.en}</span></span>
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

/* ---------- Training: verb drills ---------- */
const fold=s=>s.toLowerCase().replace(/ß/g,'ss').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/[.,!?;:"„“'’]/g,' ').replace(/\s+/g,' ').trim();
const meanings=en=>en.split(/[,;]/).map(x=>fold(x.replace(/\(.*?\)/g,'').replace(/^\s*to\s+/,''))).filter(Boolean);
const meaningOk=(input,en)=>{const a=fold(input).replace(/^to /,'');return !!a&&meanings(en).some(m=>a===m||a.split(' / ').includes(m))};
const TENSES=[['pr','Präsens'],['pt','Präteritum'],['pf','Perfekt']];
const formOf=(v,t,i)=>t==='pf'?perfekt(v,i):v[t][i];
const UML=['ä','ö','ü','ß','Ä','Ö','Ü'];
function Verdict({ok,shown,onAccept,accepted}){
  if(!shown)return null;
  return ok||accepted?<span className="inline-flex items-center gap-1 text-sm text-good"><LuCheck aria-hidden className="size-4"/>{accepted&&!ok?'Counted as correct':'Richtig'}</span>
  :<span className="inline-flex flex-wrap items-center gap-2 text-sm text-bad"><span className="inline-flex items-center gap-1"><LuX aria-hidden className="size-4"/>Not quite</span>{onAccept?<button onClick={onAccept} className="text-muted underline underline-offset-2 hover:text-ink">I was right, count it</button>:null}</span>;
}
function Training({lesson,state,update,start}){
  const verbs=lesson.verbs;
  const [i,setI]=useState(start||0),[tense,setTense]=useState('pr');
  const [ans,setAns]=useState({}),[shown,setShown]=useState({}),[acc,setAcc]=useState({});
  const active=useRef(null);
  const v=verbs[i], sents=lesson.drills?.[v.inf]||[], id=`${lesson.id}:v:${v.inf}`;
  const reset=()=>{setAns({});setShown({});setAcc({})};
  const goTo=n=>{setI((n+verbs.length)%verbs.length);reset()};
  const set=(k,val)=>setAns(a=>({...a,[k]:val}));
  const field=(k,props)=><input id={`drill-${k}`} value={ans[k]||''} onFocus={e=>active.current={k,el:e.target}} onChange={e=>set(k,e.target.value)} autoComplete="off" spellCheck="false" lang="de" {...props} className={`w-full min-w-0 rounded-md border bg-surface px-2.5 py-1.5 text-ink ${props?.className||''} ${shown[k.split('.')[0]]?(props?.ok||acc[k]?'border-good':'border-bad'):'border-line'}`}/>;
  const insert=ch=>{const a=active.current;if(!a)return;const el=a.el,cur=ans[a.k]||'',p=el.selectionStart??cur.length,q=el.selectionEnd??p;set(a.k,cur.slice(0,p)+ch+cur.slice(q));requestAnimationFrame(()=>{el.focus();el.setSelectionRange(p+1,p+1)})};
  const okT=meaningOk(ans.t||'',v.en);
  const conjOk=k=>fold(ans[`c${tense}.${k}`]||'')===fold(formOf(v,tense,k));
  const sentOk=k=>sents[k][1].some(x=>fold(x)===fold(ans[`s.${k}`]||''));
  const record=patch=>update(s=>({...s,drills:{...(s.drills||{}),[id]:{...(s.drills?.[id]||{}),...patch,day:dayStr()}}}));
  const checkT=()=>{setShown(x=>({...x,t:true}));record({t:okT})};
  const checkC=()=>{setShown(x=>({...x,['c'+tense]:true}));record({[tense]:PERSONS.filter((_,k)=>conjOk(k)).length})};
  const checkS=()=>{setShown(x=>({...x,s:true}));record({s:sents.filter((_,k)=>sentOk(k)).length,sn:sents.length})};
  const acceptS=k=>{setAcc(a=>{const n={...a,[`s.${k}`]:true};record({s:sents.filter((_,j)=>sentOk(j)||n[`s.${j}`]).length,sn:sents.length});return n})};
  const acceptT=()=>{setAcc(a=>({...a,t:true}));record({t:true})};
  const dr=id=>state.drills?.[id];
  const doneCount=verbs.filter(x=>{const d=dr(`${lesson.id}:v:${x.inf}`);return d&&d.t&&d.pr===6&&d.pt===6&&d.pf===6&&d.s===d.sn}).length;
  const step=(n,title,children)=><section className="panel p-5"><h3 className="mb-2 flex items-baseline gap-2 font-display text-lg font-semibold text-ink"><span className="grid size-6 place-items-center rounded-full bg-accent font-mono text-xs text-on-accent">{n}</span>{title}</h3>{children}</section>;
  const btn='rounded-md bg-accent px-3.5 py-1.5 font-medium text-on-accent';
  const d=dr(id)||{};
  return <section><Head de="Verb-Training" title={`Meaning → conjugation → sentences · ${doneCount}/${verbs.length} verbs perfect · ae, oe, ue, ss also accepted`}/>
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <button aria-label="Previous verb" onClick={()=>goTo(i-1)} className="rounded-md border border-line p-1.5 text-ink hover:border-muted"><LuChevronLeft aria-hidden className="size-4"/></button>
      <label htmlFor="drill-verb" className="sr-only">Verb</label>
      <select id="drill-verb" value={i} onChange={e=>goTo(+e.target.value)} className="min-w-0 flex-1 rounded-md border border-line bg-surface px-2 py-1.5 text-ink sm:max-w-xs">{verbs.map((x,k)=>{const q=dr(`${lesson.id}:v:${x.inf}`);return <option key={x.inf} value={k}>{String(k+1).padStart(2,'0')}. {x.inf}{q?' ✓':''}</option>})}</select>
      <button aria-label="Next verb" onClick={()=>goTo(i+1)} className="rounded-md border border-line p-1.5 text-ink hover:border-muted"><LuChevronRight aria-hidden className="size-4"/></button>
      <button onClick={()=>goTo(Math.floor(Math.random()*verbs.length))} className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-sm text-ink hover:border-muted"><LuShuffle aria-hidden className="size-4"/>Random</button>
    </div>
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3"><p lang="de" className="font-display text-4xl font-bold text-ink">{v.inf}</p>
        <div className="flex flex-wrap gap-1.5"><Chip>{v.type}</Chip>{v.sep?<Chip cls="bg-accent-soft text-accent">trennbar</Chip>:null}{v.refl?<Chip cls="bg-accent-soft text-accent">reflexiv, {v.refl==='akk'?'Akk.':'Dat.'}</Chip>:null}</div></div>
      <div role="group" aria-label="Insert special characters" className="flex flex-wrap items-center gap-1.5 text-sm text-muted">Insert:{UML.map(ch=><button key={ch} onMouseDown={e=>e.preventDefault()} onClick={()=>insert(ch)} className="w-8 rounded border border-line bg-surface py-0.5 font-mono text-ink hover:border-muted">{ch}</button>)}</div>
      {step(1,'Translation',<div className="flex flex-wrap items-center gap-3"><div className="w-full sm:w-72">{field('t',{placeholder:'English meaning',lang:'en',ok:okT})}</div>
        <button onClick={checkT} disabled={!ans.t} className={`${btn} disabled:opacity-40`}>Check</button><Verdict ok={okT} shown={shown.t} accepted={acc.t} onAccept={acceptT}/>
        {shown.t?<p className="w-full text-sm text-muted">Answer: <span className="text-ink">{v.en}</span></p>:null}</div>)}
      {step(2,'Konjugation',<div>
        <div className="mb-3"><Filter label="Tense" value={tense} onChange={setTense} options={TENSES.map(([k,t])=>[k,`${t}${d[k]!=null?` ${d[k]}/6`:''}`])}/></div>
        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">{PERSONS.map((p,k)=>{const key=`c${tense}.${k}`,show=shown['c'+tense];return <div key={key} className="grid grid-cols-[5.5rem_1fr] items-center gap-2"><label htmlFor={`drill-${key}`} className="text-sm text-muted">{p}</label>
          <div className="min-w-0">{field(key,{placeholder:tense==='pf'?'habe … / bin …':'',ok:conjOk(k)})}{show&&!conjOk(k)?<p lang="de" className="mt-0.5 font-mono text-[12px] text-good">{formOf(v,tense,k)}</p>:null}</div></div>})}</div>
        <div className="mt-3 flex flex-wrap items-center gap-3"><button onClick={checkC} className={btn}>Check {TENSES.find(t=>t[0]===tense)[1]}</button>
          {shown['c'+tense]?<><span className="font-mono text-ink">{PERSONS.filter((_,k)=>conjOk(k)).length} / 6</span><button onClick={()=>{setShown(x=>({...x,['c'+tense]:false}));setAns(a=>Object.fromEntries(Object.entries(a).filter(([k])=>!k.startsWith('c'+tense+'.'))))}} className="text-sm text-accent underline underline-offset-2">Clear and retry</button></>:null}</div>
        {tense==='pf'?<p className="mt-2 text-sm text-muted">Write the auxiliary too{v.refl?' and the reflexive pronoun':''}: {perfekt(v,0)}.</p>:null}</div>)}
      {step(3,'Sätze übersetzen',sents.length?<div className="space-y-4">{sents.map(([en,des],k)=>{const key=`s.${k}`,ok=sentOk(k);return <div key={key}><label htmlFor={`drill-${key}`} className="mb-1 block text-ink">{en}</label>
          {field(key,{placeholder:'Auf Deutsch …',ok})}
          {shown.s?<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1"><Verdict ok={ok} shown accepted={acc[key]} onAccept={()=>acceptS(k)}/><span lang="de" className="text-sm text-muted">Model: <span className="text-ink">{des[0]}</span>{des.length>1?<span> · also: {des.slice(1).join(' · ')}</span>:null}</span></div>:null}</div>})}
        <div className="flex flex-wrap items-center gap-3"><button onClick={checkS} className={btn}>Check sentences</button>{shown.s?<span className="font-mono text-ink">{sents.filter((_,k)=>sentOk(k)||acc[`s.${k}`]).length} / {sents.length}</span>:null}</div>
        <p className="text-sm text-muted">Different word order but correct? Count it.</p></div>
        :<p className="text-muted">No sentences for this verb yet.</p>)}
      <div className="flex justify-end pt-1"><button onClick={()=>goTo(i+1)} className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-ink hover:border-muted">Next verb<LuChevronRight aria-hidden className="size-4"/></button></div>
    </div></section>;
}

/* ---------- Redemittel ---------- */
function Phrases({lesson}){
  const cats=[...new Set(lesson.phrases.map(p=>p.cat))];
  return <section><Head de="Redemittel & Ausdrücke" title="Ready-made sentences, grouped by situation"/>
    <div className="grid items-start gap-5 lg:grid-cols-2">{cats.map(c=><div key={c} className="panel min-w-0 px-5 pt-4 pb-1"><h3 className="mb-1 font-mono text-xs uppercase tracking-wider text-accent">{c}</h3>
      <ul className="divide-y divide-line">{lesson.phrases.filter(p=>p.cat===c).map(p=><li key={p.de} className="py-3"><p lang="de" className="font-semibold text-ink">{p.de}</p><p className="text-ink/80">{p.en}</p><p className="mt-1 text-[13px] text-muted">{p.note}</p></li>)}</ul></div>)}</div>
  </section>;
}

/* ---------- Nomen & Adjektive ---------- */
function Vocab({lesson}){
  const [f,setF]=useState('all'),[q,setQ]=useState('');
  const match=s=>s.toLowerCase().includes(q.toLowerCase());
  const nouns=lesson.nouns.filter(x=>(f==='all'||x.art===f)&&match(`${x.w} ${x.en}`));
  const mods=lesson.mods.filter(x=>match(`${x.w} ${x.en}`));
  return <section><Head de="Nomen & Adjektive" title="Article, plural, example · colour shows gender"/>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><Filter label="Gender" value={f} onChange={setF} options={[['all','All'],['der','der'],['die','die'],['das','das']]}/><Search id="noun-search" value={q} onChange={setQ} ph="Search vocabulary"/></div>
    <div className="panel overflow-x-auto px-4 py-1"><table className="w-full min-w-[36rem] text-sm"><thead><tr className="border-b border-line text-left text-muted"><th scope="col" className="py-2.5 pr-3 font-normal">Nomen</th><th scope="col" className="py-2.5 pr-3 font-normal">Plural</th><th scope="col" className="py-2.5 pr-3 font-normal">English</th><th scope="col" className="py-2.5 font-normal">Beispiel</th></tr></thead>
      <tbody>{nouns.map(x=><tr key={x.w} className="border-b border-line/60 align-top last:border-0"><td className="py-2.5 pr-3 whitespace-nowrap"><Chip cls={GENDER[x.art]}>{x.art}</Chip> <span className="font-medium text-ink">{x.w}</span></td><td className="py-2.5 pr-3 font-mono text-[13px] text-muted whitespace-nowrap">{x.pl?`die ${x.pl}`:'sg.'}</td><td className="py-2.5 pr-3 text-ink">{x.en}</td><td lang="de" className="py-2.5 text-muted">{x.ex}</td></tr>)}</tbody></table></div>
    <h3 className="mt-9 mb-2 font-display text-xl font-semibold text-ink">Adjektive, Adverbien, Präpositionen</h3>
    <div className="panel overflow-x-auto px-4 py-1"><table className="w-full min-w-[36rem] text-sm"><thead><tr className="border-b border-line text-left text-muted"><th scope="col" className="py-2.5 pr-3 font-normal">Wort</th><th scope="col" className="py-2.5 pr-3 font-normal">English</th><th scope="col" className="py-2.5 pr-3 font-normal">Steigerung</th><th scope="col" className="py-2.5 font-normal">Verbindung</th></tr></thead>
      <tbody>{mods.map(x=><tr key={x.w} className="border-b border-line/60 align-top"><td className="py-2.5 pr-3 whitespace-nowrap"><span className="font-medium text-ink">{x.w}</span> <Chip>{x.type}</Chip></td><td className="py-2.5 pr-3 text-ink">{x.en}</td><td className="py-2.5 pr-3 font-mono text-[13px] text-muted">{x.comp||'not compared'}</td><td lang="de" className="py-2.5 text-muted">{x.pair||x.ex}</td></tr>)}</tbody></table></div>
  </section>;
}

/* ---------- Grammatik ---------- */
const Grammar=({lesson})=><section><Head de="Grammatik" title="Start with the passive: service German runs on it"/>
  <div className="grid gap-4 lg:grid-cols-2">{lesson.grammar.map(g=><article key={g.t} className="panel min-w-0 p-5"><div className="flex items-baseline justify-between gap-3"><h3 className="font-display text-lg font-semibold text-ink">{g.t}</h3><Chip cls="bg-accent-soft text-accent">{g.tag}</Chip></div>
    <p className="mt-1 max-w-[65ch] text-ink/85">{g.r}</p>
    <dl className="mt-3 space-y-1.5 rounded-lg bg-accent-soft/50 p-3 text-sm">{g.ex.map(([de,en])=><div key={de} className="grid gap-x-4 sm:grid-cols-2"><dt lang="de" className="font-mono text-[13px] text-ink">{de}</dt><dd className="text-muted">{en}</dd></div>)}</dl></article>)}</div>
</section>;

/* ---------- Goethe practice ---------- */
const norm=s=>s.trim().toLowerCase();
function Question({q,i,value,onChange,checked}){
  const ok=q.type==='mc'?value===q.a:norm(value||'')===norm(q.a);
  return <li className="border-t border-line py-4 first:border-0 first:pt-2"><p lang="de" className="font-medium text-ink"><span className="mr-1 font-mono text-muted">{i+1}.</span> {q.q}</p>
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
  return <section><Head de="Goethe-Zertifikat B2 Übungen" title="Exam-style practice with this lesson's words · not official papers"/>
    <div className="mb-5"><Filter label="Text" value={cur} onChange={setCur} options={lesson.texts.map(x=>[x.id,`${x.title}${state.texts[x.id]?' ✓':''}`])}/></div>
    <div className={`grid gap-8 ${t.paras.length?'lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]':''}`}>
      {t.paras.length?<article lang="de" className="panel min-w-0 p-5 sm:p-6"><h3 className="font-display text-xl font-semibold text-ink">{t.title}</h3>{t.paras.map(p=><p key={p.slice(0,20)} className="mt-3 max-w-[65ch] leading-relaxed text-ink">{p}</p>)}</article>:null}
      <div className="panel min-w-0 p-5">{t.intro?<p className="mb-3 text-muted">{t.intro}</p>:null}<h3 className="mb-1 font-mono text-xs uppercase tracking-wider text-accent">Aufgaben</h3>
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
  return <section><Head de="Häufige Fehler" title="Traps that cost marks"/>
    <div className="mb-4"><Filter label="Mistake type" value={f} onChange={setF} options={kinds.map(k=>[k,k==='all'?'All':k])}/></div>
    <ul className="grid items-start gap-4 lg:grid-cols-2">{lesson.mistakes.filter(m=>f==='all'||m.k===f).map(m=><li key={m.bad} className="panel min-w-0 p-4"><Chip>{m.k}</Chip>
      <p lang="de" className="mt-1.5 flex gap-1.5 text-bad"><LuX aria-label="Wrong" className="mt-1 size-4 shrink-0"/><span className="line-through decoration-1">{m.bad}</span></p>
      <p lang="de" className="flex gap-1.5 font-medium text-good"><LuCheck aria-label="Right" className="mt-1 size-4 shrink-0"/><span>{m.good}</span></p>
      <p className="mt-2 text-[13px] text-muted">{m.why}</p></li>)}</ul></section>;
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
  return <section><Head de="SRS-Karteikarten" title={`Shared across all videos · ${NEW_PER_DAY} new cards a day`}/>
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
      <p className="mt-3 hidden text-center text-sm text-muted sm:block">Space flips · 1–4 rates</p>
    </div>:<div className="mx-auto max-w-xl rounded-lg border border-line bg-surface p-8 text-center"><p className="font-display text-xl font-semibold text-ink">Nothing left for today</p><p className="mt-1 text-muted">See you tomorrow. The forecast is in Fortschritt.</p></div>}
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
  return <div className="mt-6 text-sm text-muted"><p>Saved in this browser · export to move it to another device</p>
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
  return <section><Head de="Fortschritt" title="Updates as you review and practise"/>
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="panel min-w-0 p-5"><h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-accent">Leitner boxes</h3>
        <div className="space-y-1.5">{[['New',unseen],...boxes.map((n,i)=>[`Box ${i}`,n])].map(([l,n])=><div key={l} className="grid grid-cols-[3.5rem_1fr_2.5rem] items-center gap-2 text-sm"><span className="text-muted">{l}</span><span className="h-3 rounded-sm bg-line/50"><span className="block h-3 rounded-sm bg-accent" style={{width:`${n/maxB*100}%`}}/></span><span className="text-right font-mono tabular-nums text-ink">{n}</span></div>)}</div>
        <p className="mt-3 text-sm text-muted">Intervals 1 · 2 · 4 · 7 · 14 · 30 days · mastered = passed in box 5</p></div>
      <div className="panel min-w-0 p-5"><h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-accent">Reviews due, next 14 days</h3>
        {st.seen===0?<p className="text-muted">Your forecast appears after your first flashcard session.</p>:<svg viewBox="0 0 420 130" role="img" aria-label="Bar chart of reviews due per day for the next 14 days" className="block w-full">
          {fc.map((x,i)=>{const h=x.n/maxF*92;return <g key={x.d}><rect x={i*30+3} y={104-h} width="24" height={Math.max(h,x.n?2:0)} rx="2" fill="var(--accent)"/>{x.n?<text x={i*30+15} y={100-h} textAnchor="middle" fontSize="10" fill="var(--ink)">{x.n}</text>:null}{i%2===0?<text x={i*30+15} y="120" textAnchor="middle" fontSize="10" fill="var(--muted)">{x.d.slice(8)}.{x.d.slice(5,7)}.</text>:null}</g>})}
          <line x1="0" x2="420" y1="104.5" y2="104.5" stroke="var(--line-strong)"/></svg>}</div>
    </div>
    {li!=null?<div className="panel mt-4 p-5"><h3 className="mb-2 font-mono text-xs uppercase tracking-wider text-accent">Wortnetz</h3><Graph state={state} li={li}/></div>:null}
    <div className="panel mt-4 p-5"><h3 className="mb-2 font-mono text-xs uppercase tracking-wider text-accent">Lessons</h3>
    <div className="overflow-x-auto"><table className="w-full min-w-[30rem] text-sm"><thead><tr className="border-b border-line text-left text-muted"><th scope="col" className="py-1 pr-3 font-normal">Video</th><th scope="col" className="py-1 pr-3 text-right font-normal">Entries</th><th scope="col" className="py-1 pr-3 text-right font-normal">Started</th><th scope="col" className="py-1 pr-3 text-right font-normal">Texts done</th><th scope="col" className="py-1 text-right font-normal">Roadmap</th></tr></thead>
      <tbody>{LESSONS.map((l,i)=>{const cs=DECK.filter(c=>c.lesson===i);return <tr key={l.id} className="border-b border-line/60"><td className="py-2.5 pr-3"><a className="text-accent underline underline-offset-2" href={pageHref(l)}>{l.title}</a></td><td className="py-2.5 pr-3 text-right font-mono text-ink">{cs.length}</td><td className="py-2.5 pr-3 text-right font-mono text-ink">{cs.filter(c=>state.cards[c.id]).length}</td><td className="py-1.5 text-right font-mono text-ink">{l.texts.filter(t=>state.texts[t.id]).length} / {l.texts.length}</td><td className="py-2.5 text-right font-mono text-ink">{roadmap(i,state).pct}%</td></tr>})}</tbody></table></div></div>
    <Backup state={state} update={update}/>
  </section>;
}

/* ---------- Roadmap: tasks computed from progress in the other tabs ---------- */
const chunks=(a,n)=>Array.from({length:Math.ceil(a.length/n)},(_,k)=>a.slice(k*n,k*n+n));
export function roadmap(li,state){
  const l=LESSONS[li], rm=state.roadmap?.[l.id]||{}, D=DECK.filter(c=>c.lesson===li);
  const ids=p=>D.filter(c=>c.id.startsWith(`${l.id}:${p}:`)).map(c=>c.id);
  const seen=a=>a.filter(id=>state.cards[id]).length;
  const dr=v=>state.drills?.[`${l.id}:v:${v.inf}`]||{};
  const core=v=>{const d=dr(v);return d.t&&d.pr===6&&(!d.sn||d.s===d.sn)};
  const past=v=>{const d=dr(v);return d.pt===6&&d.pf===6};
  const read=(id,title,hint,tab)=>({id,title,hint,tab,manual:true,done:rm[id]?1:0,total:1});
  const vidx=v=>l.verbs.indexOf(v);
  const exam=l.texts.filter(t=>!t.paras.length), reading=l.texts.filter(t=>t.paras.length);
  const textTask=t=>{const r=state.texts[t.id];return {id:'text:'+t.id,title:t.title,hint:r?`Last score ${r.score}/${r.total}`:'Answer every question, then check',tab:'goethe',done:r?1:0,total:1}};
  const all=D.map(c=>c.id), target=Math.ceil(all.length*.8);
  const stages=[
    {t:'Überblick',en:'Get the big picture',tasks:[
      read('read:verben','Skim the verb list','Open a few rows and look at the forms','verben'),
      read('read:redemittel','Read the phrases','Say each one out loud once','redemittel'),
      read('read:vokabeln','Read nouns & adjectives','Notice the der / die / das colours','vokabeln')]},
    {t:'Wörter einprägen',en:'Meet every card once',tasks:[
      {id:'srs:n',title:'Meet every noun in SRS',hint:'Cards count when you rate them',tab:'srs',done:seen(ids('n')),total:ids('n').length},
      {id:'srs:m',title:'Meet adjectives and adverbs',hint:'Filter SRS to Words',tab:'srs',done:seen(ids('m')),total:ids('m').length},
      {id:'srs:p',title:'Meet every phrase',hint:'Filter SRS to Phrases',tab:'srs',done:seen(ids('p')),total:ids('p').length}]},
    {t:'Verben trainieren',en:'Meaning, Präsens and sentences',tasks:chunks(l.verbs,6).map((g,k)=>({id:'verbs:'+k,title:`Verbs ${vidx(g[0])+1}–${vidx(g[g.length-1])+1}: ${g.map(v=>clean(v.inf)).slice(0,3).join(', ')}…`,hint:'In Training: meaning, Präsens 6/6, all sentences',tab:'training',verb:vidx(g.find(v=>!core(v))??g[0]),done:g.filter(core).length,total:g.length}))},
    {t:'Grammatik & Fehler',en:'Understand the structures',tasks:[
      read('read:grammatik','Work through the grammar cards','Read each rule and its examples','grammatik'),
      read('read:fehler','Read the common mistakes','Cover the right answer and test yourself','fehler'),
      ...exam.map(textTask)]},
    {t:'Vergangenheit',en:'Präteritum and Perfekt',tasks:chunks(l.verbs,12).map((g,k)=>({id:'past:'+k,title:`Past forms, verbs ${vidx(g[0])+1}–${vidx(g[g.length-1])+1}`,hint:'In Training: Präteritum 6/6 and Perfekt 6/6',tab:'training',verb:vidx(g.find(v=>!past(v))??g[0]),done:g.filter(past).length,total:g.length}))},
    {t:'Goethe B2',en:'Exam-style reading',tasks:reading.map(textTask)},
    {t:'Festigen',en:'Make it stick',tasks:[
      {id:'srs:box2',title:'Get 80% of cards to box 2',hint:'Box 2 means two good reviews on different days',tab:'srs',done:Math.min(target,all.filter(id=>(state.cards[id]?.box||0)>=2).length),total:target},
      read('read:cheat','Read the Spickzettel','Your one-page summary for later','spickzettel')]},
  ];
  const tasks=stages.flatMap(x=>x.tasks), frac=x=>Math.min(1,x.done/x.total);
  stages.forEach(x=>{x.complete=x.tasks.every(k=>k.done>=k.total);x.n=x.tasks.filter(k=>k.done>=k.total).length});
  return {stages,tasks,doneTasks:tasks.filter(k=>k.done>=k.total).length,pct:Math.round(tasks.reduce((a,k)=>a+frac(k),0)/tasks.length*100),current:stages.findIndex(x=>!x.complete)};
}
function Roadmap({li,state,update,go}){
  const r=roadmap(li,state), l=LESSONS[li];
  const [open,setOpen]=useState(()=>new Set([Math.max(0,r.current)]));
  const toggle=k=>setOpen(o=>{const n=new Set(o);n.has(k)?n.delete(k):n.add(k);return n});
  const mark=(id,v)=>update(s=>({...s,roadmap:{...s.roadmap,[l.id]:{...(s.roadmap?.[l.id]||{}),[id]:v}}}));
  const next=r.tasks.find(k=>k.done<k.total);
  const finished=r.current===-1;
  return <section><Head de="Roadmap" title="Seven stages · work in the other tabs ticks tasks off by itself"/>
    <div className="panel mb-5 grid items-center gap-5 p-5 sm:grid-cols-[auto_1fr_auto]">
      <svg viewBox="0 0 64 64" className="size-20" role="img" aria-label={`Roadmap ${r.pct}% complete`}><circle cx="32" cy="32" r="27" fill="none" stroke="var(--accent-soft)" strokeWidth="7"/><circle cx="32" cy="32" r="27" fill="none" stroke="var(--accent)" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${r.pct*1.696} 170`} transform="rotate(-90 32 32)"/><text x="32" y="37" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--ink)" className="font-sans">{r.pct}%</text></svg>
      <div className="min-w-0">{finished?<><p className="flex items-center gap-2 font-display text-xl font-semibold text-ink"><LuTrophy aria-hidden className="size-5 text-accent"/>Lektion abgeschlossen</p><p className="text-muted">You have learned this video. From now on, refresh with the Spickzettel and keep up your SRS reviews.</p></>
        :<><p className="font-mono text-xs uppercase tracking-wider text-accent">Stage {r.current+1} of {r.stages.length} · {r.doneTasks}/{r.tasks.length} tasks</p><p className="font-display text-xl font-semibold text-ink">{r.stages[r.current].t}</p><p className="text-muted">Next: {next.title}</p></>}</div>
      {finished?<button onClick={()=>go('spickzettel')} className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 font-medium text-on-accent">Open Spickzettel<LuArrowRight aria-hidden className="size-4"/></button>
      :<button onClick={()=>go(next.tab,{verb:next.verb})} className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 font-medium text-on-accent">Continue<LuArrowRight aria-hidden className="size-4"/></button>}
    </div>
    <ol className="relative space-y-3 before:absolute before:left-[1.15rem] before:top-4 before:bottom-4 before:w-0.5 before:bg-line">{r.stages.map((x,k)=>{const isOpen=open.has(k),cur=k===r.current;
      return <li key={x.t} className="relative pl-11">
        <span aria-hidden className={`absolute left-0 top-3 grid size-[2.3rem] place-items-center rounded-full border-2 font-mono text-sm font-semibold ${x.complete?'border-accent bg-accent text-on-accent':cur?'border-accent bg-surface text-accent':'border-line bg-surface text-muted'}`}>{x.complete?<LuCheck className="size-4"/>:k+1}</span>
        <div className={`panel ${cur?'ring-2 ring-accent/40':''}`}>
          <button aria-expanded={isOpen} onClick={()=>toggle(k)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
            <span className="min-w-0"><span className="block font-display text-lg font-semibold text-ink">{x.t}</span><span className="block text-sm text-muted">{x.en}</span></span>
            <span className="flex shrink-0 items-center gap-2"><span className={`font-mono text-sm ${x.complete?'text-accent':'text-muted'}`}>{x.n}/{x.tasks.length}</span><LuChevronDown aria-hidden className={`size-4 text-muted transition-transform ${isOpen?'rotate-180':''}`}/></span></button>
          {isOpen?<ul className="divide-y divide-line border-t border-line px-4">{x.tasks.map(t=>{const ok=t.done>=t.total;return <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3">
            {t.manual?<button aria-pressed={ok} aria-label={ok?`Mark "${t.title}" as not done`:`Mark "${t.title}" as done`} onClick={()=>mark(t.id,!ok)} className="shrink-0">{ok?<LuCircleCheck aria-hidden className="size-5 text-accent"/>:<LuCircle aria-hidden className="size-5 text-line-strong hover:text-accent"/>}</button>
              :ok?<LuCircleCheck aria-hidden className="size-5 shrink-0 text-accent"/>:<LuCircle aria-hidden className="size-5 shrink-0 text-line-strong"/>}
            <span className="min-w-0 flex-1"><span className={`block ${ok?'text-muted line-through decoration-1':'text-ink'}`}>{t.title}</span><span className="block text-[13px] text-muted">{t.hint}</span></span>
            {t.total>1?<span className="w-28"><span className="flex justify-between font-mono text-[11px] text-muted"><span>{Math.min(t.done,t.total)}</span><span>{t.total}</span></span><span className="mt-0.5 block h-1.5 rounded-full bg-accent-soft"><span className="block h-1.5 rounded-full bg-accent" style={{width:`${Math.min(1,t.done/t.total)*100}%`}}/></span></span>:null}
            <button data-hue={HUE[t.tab]} onClick={()=>go(t.tab,{verb:t.verb})} className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-sm text-accent hover:border-accent">Open<LuArrowRight aria-hidden className="size-3.5"/></button>
          </li>})}</ul>:null}
        </div></li>})}</ol>
    <p className="mt-4 text-sm text-muted">Tasks with a circle you can tap are reading tasks: tick them yourself. Everything else ticks when you finish it in its tab.</p>
  </section>;
}

/* ---------- Spickzettel: one-page refresher ---------- */
function Cheat({lesson,go}){
  const [hide,setHide]=useState(false);
  const en=t=>hide?<span className="select-none rounded bg-line/70 text-transparent">{t}</span>:t;
  const box=(title,children,cls='')=><section className={`panel min-w-0 break-inside-avoid p-4 ${cls}`}><h3 className="mb-2 font-mono text-xs uppercase tracking-wider text-accent">{title}</h3>{children}</section>;
  const g=a=>lesson.nouns.filter(n=>n.art===a);
  return <section><Head de="Spickzettel" title="The whole video on one page · hide English to test yourself"/>
    <div className="mb-4 flex flex-wrap gap-2">
      <button aria-pressed={hide} onClick={()=>setHide(h=>!h)} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink hover:border-muted">{hide?<LuEye aria-hidden className="size-4"/>:<LuEyeOff aria-hidden className="size-4"/>}{hide?'Show English':'Hide English'}</button>
      <button data-hue="blue" onClick={()=>go('srs')} className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-on-accent"><LuPlay aria-hidden className="size-4"/>Review due cards</button>
    </div>
    <div className="gap-4 space-y-4 lg:columns-2 [&>section]:mb-4">
      {lesson.cheat?box('Das Wichtigste',<ol className="list-decimal space-y-1.5 pl-5 text-ink">{lesson.cheat.map(c=><li key={c}>{c}</li>)}</ol>):null}
      {box('Verben · er/sie/es · Präteritum · Perfekt',<ul className="space-y-0.5 text-sm">{lesson.verbs.map(v=><li key={v.inf} className="grid grid-cols-[9.5rem_1fr] gap-2"><span lang="de" className={`truncate font-semibold ${v.type==='irregular'?'text-accent':'text-ink'}`}>{v.inf}</span><span lang="de" className="min-w-0 font-mono text-[12.5px] text-muted">{v.pr[2]} · {v.pt[2]} · <span className={v.aux==='ist'?'font-semibold text-bad':''}>{v.aux}</span> {v.pp}</span></li>)}</ul>,'')}
      {box('Nomen',<div className="space-y-2.5 text-sm">{['der','die','das'].map(a=><p key={a} lang="de" className="leading-7"><Chip cls={GENDER[a]}>{a}</Chip> {g(a).map((n,k)=><span key={n.w}>{k?<span className="text-line-strong"> · </span>:null}<span className="text-ink">{n.w}</span><span className="text-muted"> {n.p}</span></span>)}</p>)}</div>)}
      {box('Sätze für den Schalter',<ul className="space-y-1.5 text-sm">{lesson.phrases.map(p=><li key={p.de}><span lang="de" className="font-medium text-ink">{p.de}</span> <span className="text-muted">{en(p.en)}</span></li>)}</ul>)}
      {box('Grammatik in einer Zeile',<ul className="space-y-1.5 text-sm">{lesson.grammar.map(x=><li key={x.t}><span className="font-semibold text-ink">{x.t}:</span> <span lang="de" className="font-mono text-[12.5px] text-ink/85">{x.ex[0][0]}</span></li>)}</ul>)}
      {box('Adjektive & Co.',<p lang="de" className="text-sm leading-7">{lesson.mods.map((m,k)=><span key={m.w}>{k?<span className="text-line-strong"> · </span>:null}<span className="font-medium text-ink">{m.w}</span> <span className="text-muted">{en(m.en)}</span></span>)}</p>)}
      {box('Vorsicht',<ul className="space-y-1.5 text-sm">{lesson.mistakes.map(m=><li key={m.bad} className="flex gap-1.5"><LuCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-good"/><span lang="de" className="text-ink">{m.good}</span></li>)}</ul>)}
    </div>
    <p className="mt-2 text-sm text-muted">Colour key: <span className="font-semibold text-accent">irregular verb</span> · <span className="font-semibold text-bad">sein</span> in Perfekt</p>
  </section>;
}

/* ---------- shell ---------- */
const ROOT=document.body?.dataset.root??'';
const pageHref=l=>`${ROOT}lessons/${l.slug}.html`;
const LESSON_TABS=[['roadmap','Roadmap',LuRoute],['spickzettel','Spickzettel',LuStickyNote],['verben','Verben',LuBookOpen],['training','Training',LuDumbbell],['redemittel','Redemittel',LuMessageSquare],['vokabeln','Nomen & Adj.',LuTag],['grammatik','Grammatik',LuGitBranch],['goethe','Goethe B2',LuFileCheck],['fehler','Fehler',LuTriangleAlert],['srs','SRS',LuLayers],['fortschritt','Fortschritt',LuChartColumn]];
const HUE={roadmap:'indigo',spickzettel:'magenta',verben:'cyan',training:'tangerine',redemittel:'teal',vokabeln:'rose',grammatik:'violet',goethe:'amber',fehler:'crimson',srs:'blue',fortschritt:'green',lektionen:'indigo'};
const HOME_TABS=[['lektionen','Lektionen',LuBookOpen],['srs','SRS',LuLayers],['fortschritt','Fortschritt',LuChartColumn]];
const Meter=({label,value,max,note,hue,pct})=><div data-hue={hue} className="min-w-0"><div className="flex items-baseline justify-between gap-2"><span className="text-[13px] text-muted">{label}</span><span className="font-mono text-sm tabular-nums whitespace-nowrap text-ink">{value}{pct?'%':max!=null?` / ${max}`:''}</span></div>
  {max!=null?<div className="mt-1.5 h-2 rounded-full bg-accent-soft"><div className="h-2 rounded-full bg-accent" style={{width:`${value/max*100}%`}}/></div>:<div className="mt-1 text-xs text-muted">{note}</div>}</div>;
function Home({state}){
  return <section><Head de="Lektionen" title="One dashboard per video · reviews and streak are shared"/>
    <ul className="panel divide-y divide-line px-5">{LESSONS.map((l,i)=>{const s=stats(state,i);return <li key={l.id}><a href={pageHref(l)} className="grid gap-x-6 gap-y-2 py-4 hover:text-accent sm:grid-cols-[1fr_16rem]"><span className="min-w-0"><span className="font-mono text-xs text-accent">Lektion {String(i+1).padStart(2,'0')} · {l.series} · {l.length}</span><span className="block font-display text-lg font-semibold text-ink">{l.title}</span><span className="block text-sm text-muted">{l.topic}</span></span><span className="self-center space-y-2"><Meter hue="indigo" pct label="Roadmap" value={roadmap(i,state).pct} max={100}/><Meter hue="blue" label="Cards started" value={s.seen} max={s.total}/></span></a></li>})}</ul></section>;
}
function App(){
  const [state,update]=useProgress();
  const slug=document.body?.dataset.lesson;
  const li=slug?LESSONS.findIndex(l=>l.slug===slug):null;
  const lesson=li==null?null:LESSONS[li], TABS=lesson?LESSON_TABS:HOME_TABS;
  const start=()=>{const h=location.hash.slice(1);if(TABS.some(t=>t[0]===h))return h;return lesson&&roadmap(li,state).current===-1?'spickzettel':TABS[0][0]};
  const [tab,setTab]=useState(start);
  useEffect(()=>{const on=()=>setTab(start());addEventListener('hashchange',on);return()=>removeEventListener('hashchange',on)},[]);
  const [focus,setFocus]=useState({});
  const go=(k,opt={})=>{setFocus({...opt,n:Date.now()});setTab(k);location.hash=k;scrollTo(0,0)};
  const st=stats(state,li), used=state.newDay===dayStr()?state.newCount:0;
  return <div className="min-h-full bg-bg text-ink">
    <header className="border-b border-line bg-surface"><div aria-hidden className="stripe"/><div className="mx-auto max-w-6xl px-gutter pb-3 pt-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">{lesson?<a href={`${ROOT}index.html`} className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-accent"><LuHouse aria-hidden className="size-3.5"/>Alle Lektionen</a>:<p className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-accent"><LuPackage aria-hidden className="size-3.5"/>Goethe B2</p>}
          <h1 className="mt-1 font-display text-3xl font-bold text-balance text-ink">{lesson?lesson.title:'Easy German Wortbank'}</h1>
          {lesson?<a href={lesson.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-muted hover:text-accent"><LuExternalLink aria-hidden className="size-3.5"/>{lesson.series} · {lesson.length}</a>:null}</div>
        {LESSONS.length>1&&lesson?<div className="w-full min-w-0 sm:w-80"><label htmlFor="lesson" className="sr-only">Go to lesson</label><select id="lesson" value={li} onChange={e=>{location.href=pageHref(LESSONS[+e.target.value])}} className="w-full rounded-md border border-line bg-bg px-2 py-1.5 text-ink">{LESSONS.map((l,i)=><option key={l.id} value={i}>Lektion {String(i+1).padStart(2,'0')}: {l.title}</option>)}</select></div>:null}</div>
      <div className={`mt-4 grid grid-cols-2 gap-x-6 gap-y-3 ${lesson?'lg:grid-cols-6':'lg:grid-cols-5'}`}>
        {lesson?<Meter hue="indigo" pct label="Roadmap" value={roadmap(li,state).pct} max={100}/>:null}<Meter hue="blue" label="Words mastered" value={st.wordsDone} max={st.words}/><Meter hue="teal" label="Phrases learned" value={st.phrasesDone} max={st.phrases}/><Meter hue="amber" label="B2 texts done" value={st.textsDone} max={st.texts}/>
        <Meter hue="tangerine" label="SRS streak" value={`${st.streak} ${st.streak===1?'day':'days'}`} note={st.streak?'keep it going':'review a card to start'}/>
        <button data-hue="blue" onClick={()=>go('srs')} className={`col-span-2 flex items-center justify-center gap-2 self-center rounded-md bg-accent px-3 py-2 font-medium text-on-accent lg:col-span-1 ${lesson?'col-span-1':''}`}><LuPlay aria-hidden className="size-4"/>Review cards</button>
      </div></div>
      <nav aria-label="Sections" className="mx-auto max-w-6xl overflow-x-auto px-gutter"><div className="flex w-max gap-1">{TABS.map(([k,t,I])=><button key={k} data-hue={HUE[k]} aria-current={tab===k?'page':undefined} onClick={()=>go(k)} className={`flex items-center gap-1.5 whitespace-nowrap border-b-[3px] px-2.5 py-2.5 text-sm ${tab===k?'border-accent font-semibold text-ink':'border-transparent text-muted hover:text-ink'}`}><I aria-hidden className="size-4 text-accent"/>{t}</button>)}</div></nav>
    </header>
    <main data-hue={HUE[tab]} className="mx-auto max-w-6xl px-gutter py-8">
      {tab==='lektionen'?<Home state={state}/>:tab==='verben'?<Verbs lesson={lesson}/>:tab==='roadmap'?<Roadmap li={li} state={state} update={update} go={go}/>:tab==='spickzettel'?<Cheat lesson={lesson} go={go}/>:tab==='training'?<Training key={focus.n||0} start={focus.verb} lesson={lesson} state={state} update={update}/>:tab==='redemittel'?<Phrases lesson={lesson}/>:tab==='vokabeln'?<Vocab lesson={lesson}/>:tab==='grammatik'?<Grammar lesson={lesson}/>:tab==='goethe'?<Practice lesson={lesson} state={state} update={update}/>:tab==='fehler'?<Mistakes lesson={lesson}/>:tab==='srs'?<SRS state={state} update={update} li={li}/>:<Progress state={state} update={update} li={li}/>}
    </main>
  </div>;
}
if(typeof document!=='undefined'&&document.getElementById('root'))createRoot(document.getElementById('root')).render(<App/>);
