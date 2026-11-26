import {mkdir,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
const headers={'User-Agent':'LazyRiverSim/1.0 (github.com/CinnaBomb/LazyRiverSim)'};
async function get(url){const r=await fetch(url,{headers});if(!r.ok)throw Error(url+' HTTP '+r.status);return r;}
async function files(id){return (await get('https://api.polyhaven.com/files/'+id)).json();}
async function save(url,path){await mkdir(dirname(path),{recursive:true});await writeFile(path,Buffer.from(await (await get(url)).arrayBuffer()));}
const report={};
for(const id of ['coast_rocks_01','fern_02','calathea_orbifolia_01','island_tree_01','anthurium_botany_01','coast_rocks_05','boulder_01']){
try{const d=await files(id),model=(['coast_rocks_05','boulder_01'].includes(id)?d.gltf?.['4k']?.gltf:null)||d.gltf?.['1k']?.gltf;if(!model?.url)throw Error('1k glTF unavailable');const root='assets/'+id+'/';const gltf=await (await get(model.url)).json();for(const item of [...(gltf.buffers||[]),...(gltf.images||[])]){if(!item.uri||item.uri.startsWith('data:'))continue;const name=decodeURIComponent(item.uri).split('/').pop();await save(new URL(item.uri,model.url),root+name);item.uri=name;}await mkdir(root,{recursive:true});await writeFile(root+'model.gltf',JSON.stringify(gltf));report[id]='ok';}catch(e){report[id]=e.message;console.warn(id,e.message);}
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
 hibiscus:'https://cdn.3dassets.dev/assets/6820/v1/model.glb',
 towel:'https://cdn.3dassets.dev/assets/28970/v1/model.glb',
 shower:'https://cdn.3dassets.dev/assets/28974/v1/model.glb'
})){try{const bytes=Buffer.from(await (await get(url)).arrayBuffer());if(bytes.subarray(0,4).toString()!=='glTF')throw Error('Not a GLB');await mkdir('assets/resort',{recursive:true});await writeFile('assets/resort/'+id+'.glb',bytes);report[id]='ok';}catch(e){report[id]=e.message;console.warn(id,e.message);}}
await mkdir('assets',{recursive:true});await writeFile('assets/report.json',JSON.stringify(report,null,2));console.log(report);
