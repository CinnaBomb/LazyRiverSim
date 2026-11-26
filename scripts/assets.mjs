import {mkdir,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
const headers={'User-Agent':'LazyRiverSim/1.0 (github.com/CinnaBomb/LazyRiverSim)'};
async function get(url){const r=await fetch(url,{headers,signal:AbortSignal.timeout(90000)});if(!r.ok)throw Error(url+' HTTP '+r.status);return r;}
async function files(id){return (await get('https://api.polyhaven.com/files/'+id)).json();}
async function save(url,path){await mkdir(dirname(path),{recursive:true});await writeFile(path,Buffer.from(await (await get(url)).arrayBuffer()));}
const report={};
for(const id of ['coast_rocks_01','fern_02','calathea_orbifolia_01','island_tree_01','anthurium_botany_01','coast_rocks_05','boulder_01']){
try{const d=await files(id),model=d.gltf?.['1k']?.gltf||d.gltf?.['2k']?.gltf;if(!model?.url)throw Error('1k glTF unavailable');const root='assets/'+id+'/';const gltf=await (await get(model.url)).json();for(const item of [...(gltf.buffers||[]),...(gltf.images||[])]){if(!item.uri||item.uri.startsWith('data:'))continue;const name=decodeURIComponent(item.uri).split('/').pop();const deps=model.include||{};const dep=deps[item.uri]||deps[decodeURIComponent(item.uri)]||Object.entries(deps).find(([k])=>k.split('/').pop()===name)?.[1];await save(dep?.url||new URL(item.uri,model.url),root+name);item.uri=name;}await mkdir(root,{recursive:true});await writeFile(root+'model.gltf',JSON.stringify(gltf));report[id]='ok';}catch(e){report[id]=e.message;console.warn(id,e.message);}
}
for(const id of ['kloofendal_48d_partly_cloudy_puresky','brown_mud_leaves_01','rock_boulder_dry']){
try{const d=await files(id);if(d.hdri){await save(d.hdri['1k'].hdr.url,'assets/sky.hdr');}else{for(const [type,name] of [['diff','color'],['nor_gl','normal'],['rough','roughness']]){const f=d[type]?.['1k']?.jpg||d[type]?.['1k']?.png;if(f?.url)await save(f.url,'assets/'+id+'/'+name+(f.url.endsWith('.png')?'.png':'.jpg'));}}report[id]='ok';}catch(e){report[id]=e.message;console.warn(id,e.message);}
}
for(const [id,url] of Object.entries({
 lounger:'https://tevy.dev/models/sun-lounger/v1/lod0.glb',
 umbrella:'https://tevy.dev/models/beach-umbrella/v1/lod0.glb',
 picnic:'https://tevy.dev/models/picnic-table/v1/lod0.glb',
 cabana:'https://files.innerscene.com/library/beach-cabana-with-canopy-and-curtains-43812d9e/dd5c59d1f8d6636b5d1a/beach-cabana-with-canopy-and-curtains.glb',
 palm:'https://files.innerscene.com/library/palm-detailed-a8777b8c/6c1f074e83cdb7dbaeae/palm-detailed.glb',
 banana:'https://tevy.dev/models/banana-plant/v1/lod0.glb',
 treefern:'https://tevy.dev/models/tree-fern/v1/lod0.glb',
 towel:'https://cdn.3dassets.dev/assets/28970/v1/model.glb',
 shower:'https://cdn.3dassets.dev/assets/28974/v1/model.glb'
})){try{const bytes=Buffer.from(await (await get(url)).arrayBuffer());if(bytes.subarray(0,4).toString()!=='glTF')throw Error('Not a GLB');await mkdir('assets/resort',{recursive:true});await writeFile('assets/resort/'+id+'.glb',bytes);report[id]='ok';}catch(e){report[id]=e.message;console.warn(id,e.message);}}
// Download attributed, web-optimized palms through the provider's documented MCP tool.
const {spawn}=await import('node:child_process');
const {mkdtemp,readdir,readFile,rm}=await import('node:fs/promises');
const {tmpdir}=await import('node:os');
const {join,resolve}=await import('node:path');
const {createInterface}=await import('node:readline');
const palmPicks=[['palm-mature','24bc514ac5e04e56a97fcb9b555aa67d'],['palm-young','2517eb623aea48c4b4cc5e96e1e3f971'],['palm-bart','f34a5b4ccc774d68b9fc51b3e59690db'],['tiki-bar','1cba37949ec34d738675c5f4d1358f96']];
async function glbs(dir){const result=[];for(const e of await readdir(dir,{withFileTypes:true})){if(e.name==='node_modules'||e.name.startsWith('.'))continue;const p=join(dir,e.name);if(e.isDirectory())result.push(...await glbs(p));else if(e.name.endsWith('.glb'))result.push(p);}return result;}
const work=await mkdtemp(join(tmpdir(),'lazy-palms-'));
const child=spawn('npx',['-y','paprika3d','serve'],{cwd:work,stdio:['pipe','pipe','inherit'],env:{...process.env,CI:'true'}});
let seq=0;const pending=new Map();
const lines=createInterface({input:child.stdout});
lines.on('line',line=>{try{const msg=JSON.parse(line),p=pending.get(msg.id);if(p){pending.delete(msg.id);clearTimeout(p.timer);msg.error?p.reject(Error(JSON.stringify(msg.error))):p.resolve(msg.result);}}catch{}});
function rpc(method,params){return new Promise((resolve,reject)=>{const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timed out'));},90000);pending.set(id,{resolve,reject,timer});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});}
child.on('error',e=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(e);}pending.clear();});
try{await rpc('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'lazy-river-build',version:'1.0'}});child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
for(const [name,pick] of palmPicks){try{const cwd=join(work,name);await mkdir(cwd,{recursive:true});const result=await rpc('tools/call',{name:'asset_search',arguments:{pick,cwd}});if(result?.isError)throw Error(JSON.stringify(result.content));if(name==='tiki-bar'){const credits=await readFile(join(cwd,'assets','CREDITS.md'),'utf8').catch(()=>readFile(join(cwd,'public','assets','CREDITS.md'),'utf8').catch(()=>''));if(!/CC BY 4\.0|creativecommons\.org\/licenses\/by\/4\.0/i.test(credits)||!credits.includes(pick))throw Error('Tiki bar commercial-use license not verified by provider');}const files=await glbs(cwd);if(files.length!==1)throw Error('Expected one GLB, got '+files.length);const bytes=await readFile(files[0]);if(bytes.subarray(0,4).toString()!=='glTF')throw Error('Invalid GLB');await mkdir('assets/resort',{recursive:true});await writeFile('assets/resort/'+name+'.glb',bytes);report[name]='ok';}catch(e){report[name]=e.message;console.warn(name,e.message);}}
}catch(e){for(const [name] of palmPicks)report[name]??=e.message;}finally{child.kill();lines.close();await rm(work,{recursive:true,force:true});}
await mkdir('assets',{recursive:true});await writeFile('assets/report.json',JSON.stringify(report,null,2));console.log(report);
