import {mkdir,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
for(const id of ['coast_rocks_01','fern_02','calathea_orbifolia_01']) {
 try {
 const response=await fetch('https://api.polyhaven.com/files/'+id,{headers:{'User-Agent':'LazyRiverSim/1.0'}}); if(!response.ok) throw Error(response.status);
 const data=await response.json(); const model=data.gltf['1k'].gltf;
 const root='assets/'+id+'/'; await mkdir(root,{recursive:true});
 const r=await fetch(model.url);if(!r.ok)throw Error(r.status);const gltf=await r.json();
 for(const item of [...(gltf.buffers||[]),...(gltf.images||[])]) {if(!item.uri||item.uri.startsWith('data:'))continue;const url=new URL(item.uri,model.url);const res=await fetch(url);if(!res.ok)throw Error(res.status);const dest=root+decodeURIComponent(item.uri);await mkdir(dirname(dest),{recursive:true});await writeFile(dest,Buffer.from(await res.arrayBuffer()));}
 await writeFile(root+'model.gltf',JSON.stringify(gltf));console.log('Downloaded '+id);
 }catch(e){console.warn(id,e.message);}
}