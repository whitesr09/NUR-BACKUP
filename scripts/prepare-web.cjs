/* Copy the pinned, licensed prayer calculation engine into local web assets. */
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=path.join(root,'node_modules','adhan');
const target=path.join(root,'web','vendor');
const candidates=['lib/bundles/adhan.umd.min.js','lib/bundles/adhan.umd.js'];
const bundle=candidates.map(x=>path.join(source,x)).find(fs.existsSync);
if(!bundle)throw Error('Adhan dependency is missing its UMD bundle. Run npm install with the pinned dependencies.');
fs.mkdirSync(target,{recursive:true});
fs.copyFileSync(bundle,path.join(target,'adhan.js'));
for(const name of ['LICENSE','LICENSE.md','LICENSE.txt']){const file=path.join(source,name);if(fs.existsSync(file)){fs.copyFileSync(file,path.join(target,'adhan.LICENSE.txt'));break;}}
console.log('Prepared local Adhan prayer calculation assets. No Android build was run.');
