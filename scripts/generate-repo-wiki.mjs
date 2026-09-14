#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { collectSources } from './repo-wiki-sources.mjs';

const titles = {business_rules:'Regras de negócio e comportamento',security:'Segurança',automations:'Automações',rpa:'RPA',improvements:'Melhorias do repositório'};
const filenames = {business_rules:'business-rules.md',security:'security.md',automations:'automations.md',rpa:'rpa.md',improvements:'improvements.md'};
const args = {repo:process.cwd(),output:'docs/repo-wiki',mode:'Full'};
for(let i=2;i<process.argv.length;i++) {
  const key=process.argv[i].replace(/^--/,'');
  if(!['repo','output','mode','analysis'].includes(key) || !process.argv[i+1]) throw new Error('Argumento inválido: '+process.argv[i]);
  args[key]=process.argv[++i];
}
function git(repo,...argv) { try{return execFileSync('git',['-C',repo,...argv],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{return null;} }
function prose(text) { return String(text).replaceAll('<','&lt;').replaceAll('>','&gt;'); }
async function main() {
  if(args.mode!=='Full') throw new Error('Este CLI compõe Full. Focused/Incremental/Drift exigem investigação pelo agente; não são aliases de Full.');
  const repo=path.resolve(args.repo), output=path.resolve(repo,args.output);
  if(output===repo || !output.startsWith(repo+path.sep)) throw new Error('Saída deve ser subdiretório do repositório');
  const {sources,skipped}=await collectSources(repo);
  const sourceMap=new Map(sources.map(f=>[f.path,f]));
  const analysis=args.analysis?JSON.parse(await fs.readFile(path.resolve(repo,args.analysis),'utf8')):null;
  if(analysis && (analysis.schema_version!==2 || !Array.isArray(analysis.findings) || !Array.isArray(analysis.reviewed_files))) throw new Error('Análise deve seguir schema_version 2');
  const reviewed=new Set();
  for(const ref of analysis?.reviewed_files||[]) {
    const source=sourceMap.get(ref.path);
    if(!source || source.sha256!==ref.sha256) throw new Error('Fonte excluída ou revisão obsoleta: '+ref.path);
    reviewed.add(ref.path);
  }
  const findings=[];
  const ids=new Set();
  for(const item of analysis?.findings||[]) {
    if(!titles[item.track] || !['observed','inferred'].includes(item.confidence) || !['product','operational','reference'].includes(item.kind)) throw new Error('Classificação inválida: '+item.id);
    for(const field of ['id','title','domain','condition','effect','exceptions','verification']) if(typeof item[field]!=='string' || !item[field].trim()) throw new Error('Campo obrigatório '+field);
    if(ids.has(item.id)) throw new Error('ID duplicado '+item.id);
    ids.add(item.id);
    if(!item.evidence?.length) throw new Error('Achado sem código: '+item.id);
    const evidence=item.evidence.map(ref=>{
      const source=sourceMap.get(ref.path);
      if(!source || !reviewed.has(ref.path)) throw new Error('Evidência excluída ou não lida: '+ref.path);
      if(!ref.quote?.trim() || source.text.indexOf(ref.quote)<0 || source.text.indexOf(ref.quote)!==source.text.lastIndexOf(ref.quote)) throw new Error('Trecho ausente ou ambíguo: '+ref.path);
      const start=source.text.slice(0,source.text.indexOf(ref.quote)).split('\n').length;
      return {...ref,start,end:start+ref.quote.split('\n').length-1,sha256:source.sha256};
    });
    findings.push({...item,evidence});
  }
  const report={schema_version:2,mode:'Full',project:path.basename(repo),sha:git(repo,'rev-parse','HEAD'),branch:git(repo,'branch','--show-current'),dirty:Boolean(git(repo,'status','--porcelain')),generated_at:new Date().toISOString(),
    analysis_method:'agent-reviewed-code',scope:analysis?.scope||'Inventário de código; leitura semântica ainda não realizada.',
    exclusions:['qualquer componente de caminho iniciado por ponto','gitignore','symlinks/junctions','dependências, builds, docs, logs, caches','arquivos acima de 512 KiB'],
    source_snapshot:sources.map(({path,sha256})=>({path,sha256})),reviewed_files:[...reviewed],skipped,
    coverage:{source_files:sources.length,reviewed_files:reviewed.size,unreviewed_files:sources.length-reviewed.size},
    tracks:{},findings,pages_generated:['README.md',...Object.values(filenames)],verification:{markdown:'pending',html:'pending'},
    gaps:analysis?.gaps||['Falta ler o código e fornecer --analysis; inventário não é extração de regras.']};
  const pages={};
  const fence=String.fromCharCode(96).repeat(3);
  for(const [track,title] of Object.entries(titles)) {
    const items=findings.filter(f=>f.track===track);
    report.tracks[track]={status:items.length?'partial':'not_reviewed',findings:items.length};
    const sections=items.map(item=>[
      '## '+item.id+' — '+prose(item.title),
      'Domínio: '+prose(item.domain)+'. Natureza: '+item.kind+'. Evidência: '+item.confidence+'.',
      '**Quando:** '+prose(item.condition), '**O que acontece:** '+prose(item.effect),
      '**Exceções e limites:** '+prose(item.exceptions), '**Verificação:** '+prose(item.verification),
      ...item.evidence.map(ref=>'[evidence: '+ref.path+':'+ref.start+'-'+ref.end+']\n\n'+fence+'text\n'+ref.quote+'\n'+fence)
    ].join('\n\n'));
    pages[filenames[track]]='# '+title+'\n\n'+prose(report.scope)+'\n\n'+(items.length?items.length+' comportamentos descritos a partir de código lido. Cobertura parcial; não equivale a execução em produção.':'Nenhum achado revisado nesta trilha. Não é prova de ausência no projeto.')+'\n\n'+sections.join('\n\n')+'\n';
  }
  pages['README.md']='# '+report.project+' — documentação do código\n\n'+prose(report.scope)+'\n\n'+Object.entries(filenames).map(([track,file])=>'- ['+titles[track]+'](./'+file+')').join('\n')+'\n\n## Cobertura\n\n'+reviewed.size+' arquivos lidos e revisados semanticamente de '+sources.length+' fontes de código inventariadas. '+findings.length+' achados documentados. Pastas ocultas são excluídas antes da leitura.\n\n## Lacunas\n\n'+report.gaps.map(g=>'- '+prose(g)).join('\n')+'\n';
  await fs.mkdir(output,{recursive:true});
  for(const [file,text] of Object.entries(pages)) await fs.writeFile(path.join(output,file),text);
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:'generated',repo,markdown_dir:output,report:path.join(output,'report.json'),findings:findings.length,coverage:report.coverage,tracks:report.tracks},null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
