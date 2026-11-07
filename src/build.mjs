// Builds the site from src/. Run from the repo root: npm install && npm run build
import {compile} from 'tailwindcss';
import {build} from 'esbuild';
import {readFileSync as R,writeFileSync as W,mkdirSync,readdirSync,rmSync} from 'fs';
import {createRequire} from 'module';
import {dirname,join} from 'path';
import {createHash} from 'crypto';
const req=createRequire(process.env.TW_FROM||import.meta.url);
const T=dirname(req.resolve('tailwindcss/package.json'));
const app=R('src/app.jsx','utf8');
const cands=new Set(app.match(/[^\s"'`<>=(){}\\,;]+/g));
const c=await compile(R('src/input.css','utf8'),{loadStylesheet:async(id)=>{const f=id==='tailwindcss'?'index.css':id.replace('./','');return{path:join(T,f),base:T,content:R(join(T,f),'utf8')}}});
mkdirSync('assets',{recursive:true});rmSync('lessons',{recursive:true,force:true});mkdirSync('lessons');
W('assets/app.css',c.build([...cands])+'\n'+R('src/tokens.css','utf8'));
await build({entryPoints:['src/app.jsx'],bundle:true,minify:true,format:'iife',target:'es2020',define:{'process.env.NODE_ENV':'"production"'},jsx:'automatic',outfile:'assets/app.js',logLevel:'warning'});
const V=createHash('md5').update(R('assets/app.js')).update(R('assets/app.css')).digest('hex').slice(0,8);
const FONT='https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap';
const page=(title,root,lesson)=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${title}</title><link rel="stylesheet" href="${FONT}"><link rel="stylesheet" href="${root}assets/app.css?v=${V}"></head><body data-root="${root}"${lesson?` data-lesson="${lesson}"`:''}><div id="root"></div><script src="${root}assets/app.js?v=${V}"></script></body></html>\n`;
W('index.html',page('Easy German Wortbank','',null));
const list=readdirSync('src/lessons').filter(f=>/^l\d+.*\.js$/.test(f)&&/slug:'/.test(R('src/lessons/'+f,'utf8')));
for(const f of list){const slug=f.replace('.js','');const t=/title:'([^']+)'/.exec(R('src/lessons/'+f,'utf8'))[1];W(`lessons/${slug}.html`,page(t,'../',slug))}
console.log('built',list.length,'lesson page(s)');
