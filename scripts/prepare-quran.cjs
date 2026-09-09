/* Fetch the named Arabic edition, validate all 114 chapters, and preserve verse text verbatim. */
const fs=require('node:fs');
const path=require('node:path');
const D=require('../web/nur-deen-core.js');
const C=require('../web/nur-deen-content.js');
const counts=C.COUNTS;
async function main(){
 const url='https://api.alquran.cloud/v1/quran/quran-uthmani';
 const r=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(90000)});
 if(!r.ok)throw Error('Quran source request failed: HTTP '+r.status);
 const raw=await r.text();if(raw.length>16000000)throw Error('Quran source exceeds size limit.');
 const input=JSON.parse(raw),data=input.data;
 if(!data||!Array.isArray(data.surahs)||data.surahs.length!==114)throw Error('Incomplete Quran source.');
 if(!data.edition)data.edition=data.surahs[0]?.edition;
 const chapters=data.surahs.map((s,i)=>{
  if(!s.edition)s.edition=data.edition;
  if(s.number!==i+1||s.ayahs?.length!==counts[i])throw Error('Invalid Quran chapter.');
  return s;
 });
 const edition=D.validateCorpus({code:200,data:{...data,surahs:chapters}},'quran-uthmani');
 if(edition.reduce((n,c)=>n+c.verses.length,0)!==6236)throw Error('Incomplete Quran edition.');
 const out={format:'nur-quran-edition',version:1,source:url,edition:'quran-uthmani',attribution:'Tanzil Project, Uthmani text, via AlQuran.Cloud. https://tanzil.net',chapters:edition};
 const dir=path.join(__dirname,'..','web','assets');fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'quran-uthmani.json'),JSON.stringify(out));
 console.log('Validated and saved 114 chapters and 6,236 Arabic verses.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
