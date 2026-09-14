#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { collectSources } from './repo-wiki-sources.mjs';

const titles = {overview:'Visão geral do repositório',architecture:'Arquitetura e organograma',business_rules:'Regras de negócio e comportamento',security:'Segurança',automations:'Automações',rpa:'RPA',improvements:'Melhorias do repositório'};
const filenames = {overview:'overview.md',architecture:'architecture.md',business_rules:'business-rules.md',security:'security.md',automations:'automations.md',rpa:'rpa.md',improvements:'improvements.md'};
const args = {repo:process.cwd(),output:'docs/repo-wiki',mode:'Full'};
for(let i=2;i<process.argv.length;i++) {
  const key=process.argv[i].replace(/^--/,'');
  if(!['repo','output','mode','analysis'].includes(key) || !process.argv[i+1]) throw new Error('Argumento inválido: '+process.argv[i]);
  args[key]=process.argv[++i];
}
function git(repo,...argv) { try{return execFileSync('git',['-C',repo,...argv],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{return null;} }
function prose(text) { return String(text).replaceAll('<','&lt;').replaceAll('>','&gt;'); }
function tableCell(text) { return String(text).replaceAll('|','/').replaceAll('\n',' '); }
function mermaidId(id) { return 'N_'+String(id).replace(/[^a-zA-Z0-9_]/g,'_'); }
function mermaidLabel(text) { return String(text).replace(/[\[\]"`]/g,'').replace(/\s+/g,' ').trim().slice(0,70); }
function evidenceLabel(ref) { return `[evidence: ${ref.path}:${ref.start}-${ref.end}]`; }
function validateEvidence(refs, sourceMap, reviewed, owner) {
  if (!Array.isArray(refs) || !refs.length) throw new Error('Achado sem código: '+owner);
  return refs.map(ref=>{
    const source=sourceMap.get(ref.path);
    if(!source || !reviewed.has(ref.path)) throw new Error('Evidência excluída ou não lida: '+ref.path);
    if(!ref.quote?.trim() || source.text.indexOf(ref.quote)<0 || source.text.indexOf(ref.quote)!==source.text.lastIndexOf(ref.quote)) throw new Error('Trecho ausente ou ambíguo: '+ref.path);
    const start=source.text.slice(0,source.text.indexOf(ref.quote)).split('\n').length;
    return {...ref,start,end:start+ref.quote.split('\n').length-1,sha256:source.sha256};
  });
}
function validateArchitecture(raw, sourceMap, reviewed) {
  if(raw===undefined) return null;
  if(!raw || typeof raw!=='object' || !Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) throw new Error('Arquitetura deve conter nodes e edges');
  if(typeof raw.summary!=='string' || !raw.summary.trim()) throw new Error('Resumo obrigatório da arquitetura');
  const nodeIds=new Set();
  const nodes=raw.nodes.map(node=>{
    for(const field of ['id','label','kind','responsibility']) if(typeof node[field]!=='string' || !node[field].trim()) throw new Error('Campo obrigatório de arquitetura '+field);
    if(!/^[a-zA-Z0-9_-]+$/.test(node.id)) throw new Error('ID inválido de arquitetura: '+node.id);
    if(nodeIds.has(node.id)) throw new Error('ID de arquitetura duplicado: '+node.id);
    nodeIds.add(node.id);
    if(!['module','interface','external','control'].includes(node.kind)) throw new Error('Tipo inválido de arquitetura: '+node.id);
    return {...node,evidence:validateEvidence(node.evidence,sourceMap,reviewed,node.id)};
  });
  const edges=raw.edges.map(edge=>{
    for(const field of ['from','to','relationship']) if(typeof edge[field]!=='string' || !edge[field].trim()) throw new Error('Campo obrigatório de relação '+field);
    if(!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) throw new Error('Relação aponta para nó inexistente: '+edge.from+' -> '+edge.to);
    if(!['observed','inferred'].includes(edge.confidence)) throw new Error('Confiança inválida na relação: '+edge.from+' -> '+edge.to);
    return {...edge,evidence:validateEvidence(edge.evidence,sourceMap,reviewed,edge.from+' -> '+edge.to)};
  });
  return {status:'partial',summary:raw.summary,nodes,edges,gaps:Array.isArray(raw.gaps)?raw.gaps.map(String):[]};
}
function validateOverview(raw, sourceMap, reviewed) {
  if(raw===undefined) return null;
  if(!raw || typeof raw!=='object') throw new Error('Visão geral inválida');
  for(const field of ['summary','purpose']) if(typeof raw[field]!=='string' || !raw[field].trim()) throw new Error('Campo obrigatório da visão geral '+field);
  const validateItems=(items,fields,label)=>{
    if(!Array.isArray(items)) throw new Error('Lista inválida da visão geral '+label);
    return items.map((item,index)=>{
      for(const field of fields) if(typeof item[field]!=='string' || !item[field].trim()) throw new Error('Campo obrigatório da visão geral '+label+'['+index+'].'+field);
      return {...item,evidence:validateEvidence(item.evidence,sourceMap,reviewed,label+'['+index+']')};
    });
  };
  return {status:'partial',summary:raw.summary,purpose:raw.purpose,audience:raw.audience||'Não identificado no recorte revisado.',technologies:validateItems(raw.technologies,['name','role'], 'technologies'),entrypoints:validateItems(raw.entrypoints,['name','role'],'entrypoints'),commands:validateItems(raw.commands,['command','purpose'],'commands'),structure:validateItems(raw.structure,['path','role'],'structure'),gaps:Array.isArray(raw.gaps)?raw.gaps.map(String):[]};
}
function overviewPage(report) {
  const overview=report.overview;
  if(overview.status==='not_reviewed') return '# Visão geral do repositório\n\n'+prose(report.scope)+'\n\nNenhuma visão geral foi revisada semanticamente. O inventário de arquivos, sozinho, não explica o propósito do sistema nem confirma sua stack.\n\n## Lacunas\n\n- Fornecer `overview` no arquivo de análise com propósito, tecnologias, pontos de entrada, comandos e estrutura evidenciados.\n';
  const evidence=item=>item.evidence.map(evidenceLabel).join(', ');
  const technologies=overview.technologies.map(item=>`| ${tableCell(item.name)} | ${tableCell(item.version||'não informado')} | ${tableCell(item.role)} | ${evidence(item)} |`).join('\n');
  const entrypoints=overview.entrypoints.map(item=>`| ${tableCell(item.name)} | ${tableCell(item.role)} | ${evidence(item)} |`).join('\n');
  const commands=overview.commands.map(item=>`| \`${tableCell(item.command)}\` | ${tableCell(item.purpose)} | ${evidence(item)} |`).join('\n');
  const structure=overview.structure.map(item=>`| \`${tableCell(item.path)}\` | ${tableCell(item.role)} | ${evidence(item)} |`).join('\n');
  return '# Visão geral do repositório\n\n'+prose(report.scope)+'\n\n'+prose(overview.summary)+'\n\n## O que é e para que serve\n\n'+prose(overview.purpose)+'\n\n**Público ou consumidor identificado:** '+prose(overview.audience)+'\n\n## Tecnologias\n\n| Tecnologia | Versão | Papel | Evidência |\n|---|---|---|---|\n'+technologies+'\n\n## Pontos de entrada\n\n| Entrada | Papel | Evidência |\n|---|---|---|\n'+entrypoints+'\n\n## Comandos úteis\n\n| Comando | Finalidade | Evidência |\n|---|---|---|\n'+commands+'\n\n## Estrutura relevante\n\n| Caminho | Papel | Evidência |\n|---|---|---|\n'+structure+'\n\n## Limites\n\n'+(overview.gaps.length?overview.gaps.map(gap=>'- '+prose(gap)).join('\n'):'- Nenhuma lacuna adicional registrada nesta leitura.')+'\n';
}
function architecturePage(report) {
  const architecture=report.architecture, fence=String.fromCharCode(96).repeat(3);
  if(architecture.status==='not_reviewed') return '# Arquitetura e organograma\n\n'+prose(report.scope)+'\n\nArquitetura ainda não revisada semanticamente. O inventário de arquivos não é um organograma e não autoriza inferir módulos, dependências ou camadas.\n\n## Lacunas\n\n- Fornecer `architecture` no arquivo de análise com nós, relações e evidências exatas do código.\n';
  const diagram=['flowchart LR',...architecture.nodes.map(node=>`  ${mermaidId(node.id)}[${mermaidLabel(node.label)}]`),...architecture.edges.map(edge=>`  ${mermaidId(edge.from)} -->|${mermaidLabel(edge.relationship)}| ${mermaidId(edge.to)}`)].join('\n');
  const nodeRows=architecture.nodes.map(node=>`| ${tableCell(node.label)} | ${tableCell(node.kind)} | ${tableCell(node.responsibility)} | ${node.evidence.map(evidenceLabel).join(', ')} |`).join('\n');
  const edgeRows=architecture.edges.map(edge=>`| ${tableCell(edge.from)} → ${tableCell(edge.to)} | ${tableCell(edge.relationship)} | ${edge.confidence} | ${edge.evidence.map(evidenceLabel).join(', ')} |`).join('\n');
  return '# Arquitetura e organograma\n\n'+prose(report.scope)+'\n\n'+prose(architecture.summary)+'\n\n'+architecture.nodes.length+' nós e '+architecture.edges.length+' relações foram descritos a partir dos trechos revisados. Relações `inferred` são interpretações explícitas, não chamadas confirmadas.\n\n## Organograma de módulos\n\n'+fence+'mermaid\n'+diagram+'\n'+fence+'\n\n## Mapa de módulos\n\n| Módulo ou limite | Tipo | Responsabilidade | Evidência |\n|---|---|---|---|\n'+nodeRows+'\n\n## Relações\n\n| Origem → destino | Relação | Confiança | Evidência |\n|---|---|---|---|\n'+edgeRows+'\n\n## Lacunas e limites\n\n'+(architecture.gaps.length?architecture.gaps.map(gap=>'- '+prose(gap)).join('\n'):'- Nenhuma lacuna adicional registrada nesta leitura.')+'\n';
}
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
    findings.push({...item,evidence:validateEvidence(item.evidence,sourceMap,reviewed,item.id)});
  }
  const overview=validateOverview(analysis?.overview,sourceMap,reviewed)||{status:'not_reviewed',summary:'',purpose:'',audience:'',technologies:[],entrypoints:[],commands:[],structure:[],gaps:['Visão geral não foi revisada semanticamente nesta execução.']};
  const architecture=validateArchitecture(analysis?.architecture,sourceMap,reviewed)||{status:'not_reviewed',summary:'',nodes:[],edges:[],gaps:['Arquitetura não foi revisada semanticamente nesta execução.']};
  const report={schema_version:2,mode:'Full',project:path.basename(repo),sha:git(repo,'rev-parse','HEAD'),branch:git(repo,'branch','--show-current'),dirty:Boolean(git(repo,'status','--porcelain')),generated_at:new Date().toISOString(),
    analysis_method:'agent-reviewed-code',scope:analysis?.scope||'Inventário de código; leitura semântica ainda não realizada.',
    exclusions:['qualquer componente de caminho iniciado por ponto','gitignore','symlinks/junctions','dependências, builds, docs, logs, caches','arquivos acima de 512 KiB'],
    source_snapshot:sources.map(({path,sha256})=>({path,sha256})),reviewed_files:[...reviewed],skipped,
    coverage:{source_files:sources.length,reviewed_files:reviewed.size,unreviewed_files:sources.length-reviewed.size},
    tracks:{},findings,overview,architecture,pages_generated:['README.md',...Object.values(filenames)],verification:{markdown:'pending',html:'pending'},
    gaps:analysis?.gaps||['Falta ler o código e fornecer --analysis; inventário não é extração de regras.']};
  for(const [track,title] of Object.entries(titles)) {
    if(track==='overview') { report.tracks[track]={status:overview.status,technologies:overview.technologies.length,entrypoints:overview.entrypoints.length}; continue; }
    if(track==='architecture') { report.tracks[track]={status:architecture.status,nodes:architecture.nodes.length,edges:architecture.edges.length}; continue; }
    const items=findings.filter(f=>f.track===track);
    report.tracks[track]={status:items.length?'partial':'not_reviewed',findings:items.length};
  }
  const pages={};
  pages['overview.md']=overviewPage(report);
  pages['architecture.md']=architecturePage(report);
  const fence=String.fromCharCode(96).repeat(3);
  for(const [track,title] of Object.entries(titles)) {
    if(track==='overview' || track==='architecture') continue;
    const items=findings.filter(f=>f.track===track);
    const sections=items.map(item=>[
      '## '+item.id+' — '+prose(item.title),
      'Domínio: '+prose(item.domain)+'. Natureza: '+item.kind+'. Evidência: '+item.confidence+'.',
      '**Quando:** '+prose(item.condition), '**O que acontece:** '+prose(item.effect),
      '**Exceções e limites:** '+prose(item.exceptions), '**Verificação:** '+prose(item.verification),
      ...item.evidence.map(ref=>'[evidence: '+ref.path+':'+ref.start+'-'+ref.end+']\n\n'+fence+'text\n'+ref.quote+'\n'+fence)
    ].join('\n\n'));
    pages[filenames[track]]='# '+title+'\n\n'+prose(report.scope)+'\n\n'+(items.length?items.length+' comportamentos descritos a partir de código lido. Cobertura parcial; não equivale a execução em produção.':'Nenhum achado revisado nesta trilha. Não é prova de ausência no projeto.')+'\n\n'+sections.join('\n\n')+'\n';
  }
  pages['README.md']='# '+report.project+' — documentação do código\n\n'+prose(report.scope)+'\n\n'+Object.entries(filenames).map(([track,file])=>'- ['+titles[track]+'](./'+file+')').join('\n')+'\n\n## Cobertura\n\n'+reviewed.size+' arquivos lidos e revisados semanticamente de '+sources.length+' fontes de código inventariadas. '+findings.length+' achados documentados; visão geral: '+overview.technologies.length+' tecnologias e '+overview.entrypoints.length+' entradas; arquitetura: '+architecture.nodes.length+' nós e '+architecture.edges.length+' relações. Pastas ocultas são excluídas antes da leitura.\n\n## Lacunas\n\n'+report.gaps.map(g=>'- '+prose(g)).join('\n')+'\n';
  await fs.mkdir(output,{recursive:true});
  for(const [file,text] of Object.entries(pages)) await fs.writeFile(path.join(output,file),text);
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:'generated',repo,markdown_dir:output,report:path.join(output,'report.json'),findings:findings.length,overview:{technologies:overview.technologies.length,entrypoints:overview.entrypoints.length,status:overview.status},architecture:{nodes:architecture.nodes.length,edges:architecture.edges.length,status:architecture.status},coverage:report.coverage,tracks:report.tracks},null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
