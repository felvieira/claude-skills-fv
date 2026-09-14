#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile, readFile, symlink, unlink, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import {collectSources, readSource, hash, redactSecrets} from './repo-wiki-sources.mjs';

const root=process.cwd(), bases=[], checks=[];
const put=async(base,relative,text)=>{const file=path.join(base,relative);await mkdir(path.dirname(file),{recursive:true});await writeFile(file,text);};
function run(script,args,base,failPattern) {
  const r=spawnSync(process.execPath,[path.join(root,'scripts',script),...args],{cwd:base,encoding:'utf8',windowsHide:true,timeout:30000});
  if(failPattern) {assert.notEqual(r.status,0);assert.match(r.stderr,failPattern);return;}
  assert.equal(r.status,0,r.stdout+'\n'+r.stderr);
  return JSON.parse(r.stdout);
}
const gen=(base,analysis=false,fail,extra=[])=>run('generate-repo-wiki.mjs',['--repo',base,...analysis?['--analysis','analysis.json']:[],...extra],base,fail);
const build=(base,fail)=>run('build-repo-wiki.mjs',['--repo',base],base,fail);
async function fixture() {const base=await mkdtemp(path.join(os.tmpdir(),'repo-wiki-contract-'));bases.push(base);return base;}
async function main(){
  const base=await fixture();
  const order="export function createOrder(items) {\n  if (!items.length) throw new Error('empty');\n  return {status:'pending'};\n}\n";
  await put(base,'src/order.mjs',order+"export const unrelated = 'DO_NOT_COPY_WHOLE_SOURCE';\n");
  await put(base,'src/leaked.mjs','const apiKey = "sk_live_12345678901234567890";\n');
  for(const file of ['.bot/hidden.mjs','.auto/hidden.mjs','src/.internal/hidden.mjs','node_modules/lib/a.mjs','logs/a.mjs','ignored/a.mjs']) await put(base,file,"throw new Error('HIDDEN_SENTINEL');");
  await put(base,'README.md','All users must be administrators. DOC_BAIT');
  await put(base,'src/readme.md','A fake business rule DOC_BAIT');
  await put(base,'.gitignore','ignored/\n');
  const git=spawnSync('git',['init','-q',base],{encoding:'utf8',windowsHide:true});assert.equal(git.status,0,git.stderr);
  await symlink(path.join(base,'.bot'),path.join(base,'linked'),'junction');
  const collected=await collectSources(base); const {sources}=collected;
  assert.deepEqual(sources.map(s=>s.path),['src/order.mjs']);
  assert.equal(collected.skipped.some(item=>item.path==='src/leaked.mjs'),true);
  assert.doesNotMatch(redactSecrets('apiKey="sk_live_12345678901234567890"'),/sk_live_/);
  for(const file of ['.bot/hidden.mjs','src/.internal/hidden.mjs','ignored/a.mjs','linked/hidden.mjs','README.md','../else.mjs'])
    await assert.rejects(readSource(base,file));
  checks.push('hidden, nested hidden, gitignore, junction, docs and traversal excluded');

  const inventory=gen(base);
  assert.equal(inventory.findings,0);
  let report=JSON.parse(await readFile(path.join(base,'docs/repo-wiki/report.json')));
  assert.equal(report.schema_version,3);
  assert.deepEqual(report.pages_generated.filter(file=>['workflows.md','boundaries.md','database.md','verification.md','modules/index.md'].includes(file)).sort(),['boundaries.md','database.md','modules/index.md','verification.md','workflows.md']);
  assert.equal(report.coverage.reviewed_files,0);
  assert.ok(report.warnings.length>0);
  assert.equal(report.tracks.business_rules.status,'not_reviewed');
  assert.doesNotMatch(JSON.stringify(report),/HIDDEN_SENTINEL|DOC_BAIT|hidden.mjs/);
  checks.push('inventory never claims semantic review');
  const runtimeBase=await fixture(); await put(runtimeBase,'package.json',JSON.stringify({scripts:{build:'echo build',test:'echo test'}}));
  const runtimeProbe=run('run-repo-wiki-runtime.mjs',['--repo',runtimeBase,'--output','runtime.json'],runtimeBase); assert.equal(runtimeProbe.runtime.status,'not_run'); assert.equal(runtimeProbe.runtime.commands.length,2); assert.match(runtimeProbe.runtime.commands[0].notes,/allow-execution/); checks.push('runtime runner is opt-in and reports not_run without execution permission');

  const finding={id:'RN-01',track:'business_rules',kind:'product',confidence:'observed',title:'Pedidos exigem itens',domain:'Pedidos',condition:'A lista de itens está vazia.',effect:'O pedido é rejeitado com erro empty; com itens, começa pending.',exceptions:'O trecho não verifica permissões de usuário.',verification:'Fixture executada: lista vazia rejeitada e lista preenchida retorna pending.',evidence:[{path:'src/order.mjs',quote:order.trimEnd()}]};
  const analysis={schema_version:2,scope:'Fixture de pedidos',reviewed_files:sources.map(({path,sha256})=>({path,sha256})),findings:[finding],gaps:['Somente fluxo da fixture.']};
  const save=async value=>put(base,'analysis.json',JSON.stringify(value));
  await save(analysis);
  const app=await import(pathToFileURL(path.join(base,'src/order.mjs')));
  assert.throws(()=>app.createOrder([]),/empty/);
  assert.equal(app.createOrder(['x']).status,'pending');
  await save(analysis); gen(base,true);
  await put(base,'docs/repo-wiki/old.md','HIDDEN_SENTINEL');
  await put(base,'docs/repo-wiki/site/obsolete.html','HIDDEN_SENTINEL');
  await put(base,'docs/repo-wiki/site/evidence/obsolete.html','HIDDEN_SENTINEL');
  build(base);
  const architectureAnalysis={...analysis,overview:{summary:'Resumo da fixture.',purpose:'Demonstra a composição de uma visão geral.',audience:'Testes do gerador',technologies:[{name:'JavaScript',version:'ESM',role:'Runtime da fixture.',evidence:[{path:'src/order.mjs',quote:"export function createOrder(items) {"}]}],entrypoints:[{name:'createOrder',role:'Entrada pública da fixture.',evidence:[{path:'src/order.mjs',quote:"export function createOrder(items) {"}]}],commands:[{command:'node fixture',purpose:'Executa a fixture.',evidence:[{path:'src/order.mjs',quote:"export function createOrder(items) {"}]}],structure:[{path:'src/order.mjs',role:'Módulo da fixture.',evidence:[{path:'src/order.mjs',quote:order.trimEnd()}]}],gaps:[]},architecture:{summary:'Mapa da fixture de pedidos.',nodes:[
    {id:'order-module',label:'Order module',kind:'module',responsibility:'Cria pedidos e aplica a regra de lista vazia.',evidence:[{path:'src/order.mjs',quote:order.trimEnd()}]},
    {id:'order-input',label:'Itens de entrada',kind:'external',responsibility:'Entrada consumida pelo módulo de pedidos.',evidence:[{path:'src/order.mjs',quote:"export function createOrder(items) {"}]}
  ],edges:[{from:'order-module',to:'order-input',relationship:'recebe itens',confidence:'observed',evidence:[{path:'src/order.mjs',quote:"export function createOrder(items) {"}]}],gaps:[]},workflows:{summary:'Fluxo da fixture.',items:[{id:'create-order',title:'Criar pedido',trigger:'O consumidor chama createOrder.',actors:'Consumidor e módulo de pedidos',steps:['Receber itens','Validar itens','Retornar estado'],success:'Pedido pending.',failure:'Lista vazia lança erro.',confidence:'observed',evidence:[{path:'src/order.mjs',quote:order.trimEnd()}]}],gaps:[]},boundaries:{summary:'Boundary da fixture.',items:[{id:'order-function',kind:'function',name:'createOrder',interface:'Função ESM createOrder(items).',auth:'Não aplicável.',input:'Array de itens.',output:'Objeto com status.',errors:'Erro empty quando vazio.',confidence:'observed',evidence:[{path:'src/order.mjs',quote:"export function createOrder(items) {"}]}],gaps:[]},database:{status:'not_applicable',summary:'A fixture não possui persistência.',gaps:['Nenhuma entidade revisada.']},modules:{summary:'Módulo da fixture.',items:[{id:'order-module',name:'Order module',path:'src/order.mjs',purpose:'Cria pedidos.',inputs:'Itens.',outputs:'Status.',dependencies:'Nenhuma externa.',tests:'Fixture executada.',risks:'Erro de entrada.',evidence:[{path:'src/order.mjs',quote:order.trimEnd()}]}],gaps:[]},runtime_verification:{status:'pass',commands:[{command:'node fixture',purpose:'Executar a fixture.',status:'pass',exit_code:0}],gaps:[]}};
  architectureAnalysis.architecture.contexts=[{id:'fixture-context',label:'Fixture context',summary:'Consumer and order module.',evidence:[{path:'src/order.mjs',quote:"export function createOrder(items) {"}]}];
  architectureAnalysis.architecture.levels=[{id:'fixture-component',label:'Component',summary:'The order module is the reviewed component.',evidence:[{path:'src/order.mjs',quote:"export function createOrder(items) {"}]}];
  await save(architectureAnalysis); gen(base,true); build(base);
  const architectureMd=await readFile(path.join(base,'docs/repo-wiki/architecture.md'),'utf8');
  const architectureHtml=await readFile(path.join(base,'docs/repo-wiki/site/architecture.html'),'utf8');
  const architectureSvg=await readFile(path.join(base,'docs/repo-wiki/site/assets/diagrams/architecture-md-1.svg'),'utf8');
  const architectureReport=JSON.parse(await readFile(path.join(base,'docs/repo-wiki/report.json')));
  const overviewMd=await readFile(path.join(base,'docs/repo-wiki/overview.md'),'utf8');
  const overviewHtml=await readFile(path.join(base,'docs/repo-wiki/site/overview.html'),'utf8');
  const workflowsMd=await readFile(path.join(base,'docs/repo-wiki/workflows.md'),'utf8'); const boundariesMd=await readFile(path.join(base,'docs/repo-wiki/boundaries.md'),'utf8'); const moduleMd=await readFile(path.join(base,'docs/repo-wiki/modules/order-module.md'),'utf8'); const verificationMd=await readFile(path.join(base,'docs/repo-wiki/verification.md'),'utf8');
  assert.match(overviewMd,/Resumo da fixture/); assert.match(overviewHtml,/Tecnologias/); assert.match(architectureMd,/Mapa da fixture/); assert.match(architectureMd,/Contextos e limites/); assert.match(architectureMd,/Níveis arquiteturais/); assert.match(architectureMd,/flowchart LR/); assert.match(architectureHtml,/Diagrama renderizado localmente/); assert.match(architectureSvg,/Order module/); assert.doesNotMatch(architectureSvg,/flowchart LR/); assert.match(workflowsMd,/Criar pedido/); assert.match(boundariesMd,/createOrder/); assert.match(moduleMd,/Cria pedidos/); assert.match(verificationMd,/node fixture/); assert.equal(architectureReport.architecture.edges.length,1); assert.equal(architectureReport.architecture.contexts.length,1); assert.equal(architectureReport.architecture.levels.length,1); assert.equal(architectureReport.tracks.workflows.workflows,1); assert.equal(architectureReport.tracks.boundaries.boundaries,1); assert.equal(architectureReport.tracks.database.status,'not_applicable'); assert.equal(architectureReport.tracks.modules.modules,1); assert.equal(architectureReport.tracks.verification.status,'pass');
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
  await put(base,'src/order.mjs',order+"export const unrelated = 'DO_NOT_COPY_WHOLE_SOURCE';\n");
  await save(architectureAnalysis); gen(base,true);
  const incrementalInput=structuredClone(architectureAnalysis);
  for(const section of ['overview','architecture','workflows','boundaries','database','modules']) delete incrementalInput[section];
  await save(incrementalInput);
  gen(base,true,undefined,['--mode','Incremental']);
  const incrementalReport=JSON.parse(await readFile(path.join(base,'docs/repo-wiki/report.json')));
  assert.equal(incrementalReport.mode,'Incremental'); assert.ok(incrementalReport.incremental.reused_semantic_items>0); assert.equal(incrementalReport.incremental.delta.changed.length,0); checks.push('incremental mode reuses unchanged evidence-backed semantic items');
  const focused=gen(base,true,undefined,['--mode','Focused','--focus','src']); assert.equal(focused.coverage.source_files,1); checks.push('focused mode scopes source inventory');
  const drift=run('generate-repo-wiki.mjs',['--repo',base,'--mode','Drift'],base); assert.equal(drift.status,'drift'); assert.equal(drift.delta.changed.length,0); assert.equal(drift.delta.removed.length,0); checks.push('drift mode writes delta without composing pages');
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
