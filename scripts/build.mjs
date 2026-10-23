import fs from 'node:fs/promises';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {build,transform} from 'esbuild';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'release');
await fs.mkdir(out,{recursive:true});
const result=await build({entryPoints:[path.join(root,'dist/game.js')],bundle:true,minify:true,treeShaking:true,format:'esm',target:['es2020'],outfile:path.join(out,'game.min.js'),legalComments:'eof',metafile:true,plugins:[{name:'local-version-queries',setup(b){b.onResolve({filter:/\.js\?v=/},args=>({path:path.resolve(args.resolveDir,args.path.split('?')[0])}));}}]});
const html=(await fs.readFile(path.join(root,'dist/index.html'),'utf8')).replace(/src="game\.js\?v=[^"]+"/,'src="game.min.js?v=3.0.0"');await fs.writeFile(path.join(out,'index.html'),html);
const css=await transform(await fs.readFile(path.join(root,'dist/style.css'),'utf8'),{loader:'css',minify:true});await fs.writeFile(path.join(out,'style.css'),css.code);
for(const folder of ['env','car','vfx','ui','buttons'])await fs.cp(path.join(root,'dist/assets',folder),path.join(out,'assets',folder),{recursive:true});
await fs.copyFile(path.join(root,'dist/assets/manifest.json'),path.join(out,'assets/manifest.json'));
await fs.copyFile(path.join(root,'dist/vendor/LICENSE'),path.join(out,'THREE-LICENSE.txt'));
async function files(dir){let all=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);all.push(...(e.isDirectory()?await files(p):[p]));}return all;}
const published=await files(out),total=(await Promise.all(published.map(p=>fs.stat(p)))).reduce((n,s)=>n+s.size,0);const js=await fs.readFile(path.join(out,'game.min.js'));
console.log(JSON.stringify({version:'3.0.0',files:published.length,totalBytes:total,javascriptBytes:js.length,javascriptGzipBytes:gzipSync(js).length},null,2));
