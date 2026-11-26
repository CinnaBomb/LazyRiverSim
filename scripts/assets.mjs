import {mkdir,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
const headers={'User-Agent':'LazyRiverSim/1.0 (github.com/CinnaBomb/LazyRiverSim)'};
async function get(url){const r=await fetch(url,{headers});if(!r.ok)throw Error(url+' HTTP '+r.status);return r;}
async function files(id){return (await get('https://api.polyhaven.com/files/'+id)).json();}
async function save(url,path){await mkdir(dirname(path),{recursive:true});await writeFile(path,Buffer.from(await (await get(url)).arrayBuffer()));}
const report={};
for(const id of ['coast_rocks_01','fern_02','calathea_orbifolia_01']){
try{const d=await files(id),model=d.gltf?.['1k']?.gltf;if(!model?.url)throw Error('1k glTF unavailable');const root='assets/'+id+'/';const gltf=await (await get(model.url)).json();for(const item of [...(gltf.buffers||[]),...(gltf.images||[])]){if(!item.uri||item.uri.startsWith('data:'))continue;const name=decodeURIComponent(item.uri).split('/').pop();await save(new URL(item.uri,model.url),root+name);item.uri=name;}await mkdir(root,{recursive:true});await writeFile(root+'model.gltf',JSON.stringify(gltf));report[id]='ok';}catch(e){report[id]=e.message;console.warn(id,e.message);}
}
for(const id of ['kloofendal_48d_partly_cloudy_puresky','brown_mud_leaves_01','rock_boulder_dry']){
try{const d=await files(id);if(d.hdri){await save(d.hdri['1k'].hdr.url,'assets/sky.hdr');}else{for(const [type,name] of [['diff','color'],['nor_gl','normal'],['rough','roughness']]){const f=d[type]?.['1k']?.jpg||d[type]?.['1k']?.png;if(f?.url)await save(f.url,'assets/'+id+'/'+name+(f.url.endsWith('.png')?'.png':'.jpg'));}}report[id]='ok';}catch(e){report[id]=e.message;console.warn(id,e.message);}
}
await mkdir('assets',{recursive:true});await writeFile('assets/report.json',JSON.stringify(report,null,2));console.log(report);
