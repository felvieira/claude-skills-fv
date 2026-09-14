#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile, readFile, symlink, unlink, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import {collectSources, readSource, hash} from './repo-wiki-sources.mjs';

const root=process.cwd(), bases=[], checks=[];
const put=async(base,relative,text)=>{const file=path.join(base,relative);await mkdir(path.dirname(file),{recursive:true});await writeFile(file,text);};
function run(script,args,base,failPattern) {
  const r=spawnSync(process.execPath,[path.join(root,'scripts',script),...args],{cwd:base,encoding:'utf8',windowsHide:true,timeout:30000});
  if(failPattern) {assert.notEqual(r.status,0);assert.match(r.stderr,failPattern);return;}
  assert.equal(r.status,0,r.stdout+'\n'+r.stderr);
  return JSON.parse(r.stdout);
}
const gen=(base,analysis=false,fail)=>run('generate-repo-wiki.mjs',['--repo',base,...analysis?['--analysis','analysis.json']:[]],base,fail);
const build=(base,fail)=>run('build-repo-wiki.mjs',['--repo',base],base,fail);
async function fixture() {const base=await mkdtemp(path.join(os.tmpdir(),'repo-wiki-contract-'));bases.push(base);return base;}
async function main(){
  const base=await fixture();
  const order="export function createOrder(items) {\n  if (!items.length) throw new Error('empty');\n  return {status:'pending'};\n}\n";
  await put(base,'src/order.mjs',order+"export const unrelated = 'DO_NOT_COPY_WHOLE_SOURCE';\n");
  for(const file of ['.bot/hidden.mjs','.auto/hidden.mjs','src/.internal/hidden.mjs','node_modules/lib/a.mjs','logs/a.mjs','ignored/a.mjs']) await put(base,file,"throw new Error('HIDDEN_SENTINEL');");
  await put(base,'README.md','All users must be administrators. DOC_BAIT');
  await put(base,'src/readme.md','A fake business rule DOC_BAIT');
  await put(base,'.gitignore','ignored/\n');
  const git=spawnSync('git',['init','-q',base],{encoding:'utf8',windowsHide:true});assert.equal(git.status,0,git.stderr);
  await symlink(path.join(base,'.bot'),path.join(base,'linked'),'junction');
  const {sources}=await collectSources(base);
  assert.deepEqual(sources.map(s=>s.path),['src/order.mjs']);
  for(const file of ['.bot/hidden.mjs','src/.internal/hidden.mjs','ignored/a.mjs','linked/hidden.mjs','README.md','../else.mjs'])
    await assert.rejects(readSource(base,file));
  checks.push('hidden, nested hidden, gitignore, junction, docs and traversal excluded');

  const inventory=gen(base);
  assert.equal(inventory.findings,0);
  let report=JSON.parse(await readFile(path.join(base,'docs/repo-wiki/report.json')));
  assert.equal(report.coverage.reviewed_files,0);
  assert.equal(report.tracks.business_rules.status,'not_reviewed');
  assert.doesNotMatch(JSON.stringify(report),/HIDDEN_SENTINEL|DOC_BAIT|hidden.mjs/);
  checks.push('inventory never claims semantic review');

  const finding={id:'RN-01',track:'business_rules',kind:'product',confidence:'observed',title:'Pedidos exigem itens',domain:'Pedidos',condition:'A lista de itens está vazia.',effect:'O pedido é rejeitado com erro empty; com itens, começa pending.',exceptions:'O trecho não verifica permissões de usuário.',verification:'Fixture executada: lista vazia rejeitada e lista preenchida retorna pending.',evidence:[{path:'src/order.mjs',quote:order.trimEnd()}]};
  const analysis={schema_version:2,scope:'Fixture de pedidos',reviewed_files:sources.map(({path,sha256})=>({path,sha256})),findings:[finding],gaps:['Somente fluxo da fixture.']};
  const save=async value=>put(base,'analysis.json',JSON.stringify(value));
  await save(analysis);
  const app=await import(pathToFileURL(path.join(base,'src/order.mjs')));
  assert.throws(()=>app.createOrder([]),/empty/);
  assert.equal(app.createOrder(['x']).status,'pending');
  gen(base,true);
  await put(base,'docs/repo-wiki/old.md','HIDDEN_SENTINEL');
  await put(base,'docs/repo-wiki/site/obsolete.html','HIDDEN_SENTINEL');
  await put(base,'docs/repo-wiki/site/evidence/obsolete.html','HIDDEN_SENTINEL');
  build(base);
  const architectureAnalysis={...analysis,overview:{summary:'Resumo da fixture.',purpose:'Demonstra a composição de uma visão geral.',audience:'Testes do gerador',technologies:[{name:'JavaScript',version:'ESM',role:'Runtime da fixture.',evidence:[{path:'src/order.mjs',quote:"export function createOrder(items) {"}]}],entrypoints:[{name:'createOrder',role:'Entrada pública da fixture.',evidence:[{path:'src/order.mjs',quote:"export function createOrder(items) {"}]}],commands:[{command:'node fixture',purpose:'Executa a fixture.',evidence:[{path:'src/order.mjs',quote:"export function createOrder(items) {"}]}],structure:[{path:'src/order.mjs',role:'Módulo da fixture.',evidence:[{path:'src/order.mjs',quote:order.trimEnd()}]}],gaps:[]},architecture:{summary:'Mapa da fixture de pedidos.',nodes:[
    {id:'order-module',label:'Order module',kind:'module',responsibility:'Cria pedidos e aplica a regra de lista vazia.',evidence:[{path:'src/order.mjs',quote:order.trimEnd()}]},
    {id:'order-input',label:'Itens de entrada',kind:'external',responsibility:'Entrada consumida pelo módulo de pedidos.',evidence:[{path:'src/order.mjs',quote:"export function createOrder(items) {"}]}
  ],edges:[{from:'order-module',to:'order-input',relationship:'recebe itens',confidence:'observed',evidence:[{path:'src/order.mjs',quote:"export function createOrder(items) {"}]}],gaps:[]}};
  await save(architectureAnalysis); gen(base,true); build(base);
  const architectureMd=await readFile(path.join(base,'docs/repo-wiki/architecture.md'),'utf8');
  const architectureHtml=await readFile(path.join(base,'docs/repo-wiki/site/architecture.html'),'utf8');
  const architectureSvg=await readFile(path.join(base,'docs/repo-wiki/site/assets/diagrams/architecture-md-1.svg'),'utf8');
  const architectureReport=JSON.parse(await readFile(path.join(base,'docs/repo-wiki/report.json')));
  const overviewMd=await readFile(path.join(base,'docs/repo-wiki/overview.md'),'utf8');
  const overviewHtml=await readFile(path.join(base,'docs/repo-wiki/site/overview.html'),'utf8');
  assert.match(overviewMd,/Resumo da fixture/); assert.match(overviewHtml,/Tecnologias/); assert.match(architectureMd,/Mapa da fixture/); assert.match(architectureMd,/flowchart LR/); assert.match(architectureHtml,/Diagrama renderizado localmente/); assert.match(architectureSvg,/Order module/); assert.doesNotMatch(architectureSvg,/flowchart LR/); assert.equal(architectureReport.architecture.edges.length,1); assert.equal(architectureReport.overview.technologies.length,1); assert.equal(architectureReport.tracks.architecture.status,'partial'); assert.equal(architectureReport.tracks.overview.status,'partial');
  checks.push('architecture map and Mermaid organogram are generated and searchable');
  await save(analysis); gen(base,true); build(base);
  const md=await readFile(path.join(base,'docs/repo-wiki/business-rules.md'),'utf8');
  const html=await readFile(path.join(base,'docs/repo-wiki/site/business-rules.html'),'utf8');
  assert.match(md,/A lista de itens está vazia/); assert.match(html,/pedido é rejeitado/);
  assert.doesNotMatch(html,/HIDDEN_SENTINEL|DOC_BAIT|administrators/);
  await assert.rejects(readFile(path.join(base,'docs/repo-wiki/site/obsolete.html')));
  const evidenceFiles=await readdir(path.join(base,'docs/repo-wiki/site/evidence'));
  assert.equal(evidenceFiles.length,1);
  const evidence=await readFile(path.join(base,'docs/repo-wiki/site/evidence',evidenceFiles[0]),'utf8');
  assert.doesNotMatch(evidence,/DO_NOT_COPY_WHOLE_SOURCE/);
  assert.match(evidence,/id="L2"/);
  checks.push('actual conditions/effects, executed fixture, snippet-only HTML, stale pages pruned');

  for(const [label,change,pattern] of [
    ['hidden evidence',a=>a.findings[0].evidence[0].path='.bot/hidden.mjs',/Evidência excluída/],
    ['doc evidence',a=>a.findings[0].evidence[0].path='README.md',/Evidência excluída/],
    ['stale hash',a=>a.reviewed_files[0].sha256='stale',/revisão obsoleta/],
    ['invented quote',a=>a.findings[0].evidence[0].quote='not in code',/Trecho ausente/],
    ['ambiguous quote',a=>a.findings[0].evidence[0].quote='export',/ambíguo/],
    ['missing condition',a=>delete a.findings[0].condition,/Campo obrigatório/],
    ['false confidence',a=>a.findings[0].confidence='confirmed',/Classificação inválida/]
  ]) {const bad=structuredClone(analysis);change(bad);await save(bad);gen(base,true,pattern);checks.push(label+' rejected');}
  await save(analysis);
  gen(base,true);build(base);
  assert.equal(run('verify-docset.mjs',['--docs','docs/repo-wiki','--json'],base).status,'pass');
  assert.equal(run('verify-repo-wiki.mjs',['--docs','docs/repo-wiki','--json'],base).status,'pass');

  const js=await readFile(path.join(base,'docs/repo-wiki/site/assets/site.js'),'utf8');
  const elements=new Map();
  const element=()=>({value:'',hidden:true,textContent:'',children:[],listeners:{},append(child){this.children.push(child);},addEventListener(event,cb){this.listeners[event]=cb;},focus(){},select(){},classList:{toggle(){}}});
  for(const id of ['#site-search','#track-filter','#search-results','[data-menu]','[data-theme-toggle]']) elements.set(id,element());
  const document={currentScript:{src:'https://offline.invalid/docs/site/assets/site.js'},querySelector:s=>elements.get(s),createElement:element,addEventListener(){},documentElement:{dataset:{}}};
  vm.runInNewContext(js,{URL,document,window:{REPO_WIKI_INDEX:[{title:'Pedidos',path:'business-rules.md',url:'business-rules.html',track:'business-rules',search:'regra de pedidos',excerpt:'lista vazia'}]},localStorage:{getItem(){throw Error('denied');}}});
  const input=elements.get('#site-search');
  input.value='pedidos'; input.listeners.input();
  const results=elements.get('#search-results');
  assert.equal(results.hidden,false);
  assert.equal(results.children[1].href,'https://offline.invalid/docs/site/business-rules.html');
  checks.push('search resolves from nested pages and tolerates storage denial');

  // HTML builder independently rejects excluded evidence, even in a forged report.
  report=JSON.parse(await readFile(path.join(base,'docs/repo-wiki/report.json')));
  report.findings[0].evidence=[{path:'.bot/hidden.mjs',start:1,end:1}];
  await put(base,'docs/repo-wiki/report.json',JSON.stringify(report));
  await put(base,'docs/repo-wiki/business-rules.md','[evidence: .bot/hidden.mjs:1-1]');
  build(base,/Fonte excluída/);
  checks.push('builder independently refuses hidden source');
  gen(base,true);
  await put(base,'src/order.mjs',order+'// changed');
  build(base,/Stale evidence/);
  checks.push('HTML rejects stale source snapshot');

  const empty=await fixture();await put(empty,'README.md','No app code');
  assert.equal(gen(empty).findings,0);build(empty);
  assert.equal(run('verify-repo-wiki.mjs',['--docs','docs/repo-wiki','--json'],empty).status,'pass');
  checks.push('empty repository stays not_reviewed');
  for (const [track,code,condition,effect] of [
    ['security',"export const permits = role => role === 'admin';",'A operação recebe um papel.','Somente admin é permitido.'],
    ['rpa',"export const instruction = url => ({url, action:'capture'});",'O helper recebe uma URL.','Retorna instrução de captura, sem executar browser.']
  ]) {
    const sample=await fixture();
    await put(sample,'src/behavior.mjs',code);
    const sampleSources=(await collectSources(sample)).sources;
    const sampleFinding={...finding,id:'CASE-01',track,kind:'operational',condition,effect,evidence:[{path:'src/behavior.mjs',quote:code}]};
    await put(sample,'analysis.json',JSON.stringify({...analysis,reviewed_files:sampleSources.map(({path,sha256})=>({path,sha256})),findings:[sampleFinding]}));
    assert.equal(gen(sample,true).findings,1);build(sample);
    const behavior=await import(pathToFileURL(path.join(sample,'src/behavior.mjs')));
    if(track==='security') {assert.equal(behavior.permits('admin'),true);assert.equal(behavior.permits('reader'),false);}
    else assert.deepEqual(behavior.instruction('https://example.invalid'),{url:'https://example.invalid',action:'capture'});
    assert.equal(run('verify-repo-wiki.mjs',['--docs','docs/repo-wiki','--json'],sample).status,'pass');
    checks.push(track+' reviewed fixture compiles and behavior executes');
  }
  await unlink(path.join(base,'linked'));
  console.log(JSON.stringify({status:'pass',checks:checks.length,results:checks},null,2));
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(async()=>{
  for(const base of bases){
    // Only test-created temp directories; remove junction itself before recursive cleanup.
    await unlink(path.join(base,'linked')).catch(e=>{if(e.code!=='ENOENT')throw e;});
    if(!base.startsWith(path.join(os.tmpdir(),'repo-wiki-contract-'))) throw Error('Unsafe cleanup');
    await rm(base,{recursive:true,force:true});
  }
});
