import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
for(const name of ['project','experience','scene','ui','wayfinding','audio','contact-intents']){
 const result=spawnSync(process.execPath,[`scripts/check-${name}.mjs`],{cwd:root,stdio:'inherit'});
 if(result.status!==0)process.exit(result.status??1);
}
console.log('Tutti i controlli del progetto sono superati.');
