import fs from 'fs';
import path from 'path';

const root=process.cwd();
const p=path.join(root,'server','index.js');
if(!fs.existsSync(p)){console.error('Run from XPLAYEngine repo root.');process.exit(1);}
let s=fs.readFileSync(p,'utf8');

const importLine="import { registerPlayableTranslationRoutes } from './playableTranslation.js';";
if(!s.includes(importLine)){
  const imports=[...s.matchAll(/^import .*?;$/gm)];
  if(imports.length){
    const last=imports[imports.length-1];
    const at=last.index+last[0].length;
    s=s.slice(0,at)+"\n"+importLine+s.slice(at);
  }else{
    s=importLine+"\n"+s;
  }
}

if(!s.includes('registerPlayableTranslationRoutes(app')){
  const marker='registerGeminiVisionDropRoutes(app';
  const i=s.indexOf(marker);
  if(i>=0){
    const lineEnd=s.indexOf('\n',i);
    s=s.slice(0,lineEnd+1)+
      "registerPlayableTranslationRoutes(app,{apiKey:geminiKey,model:geminiModel});\n"+
      s.slice(lineEnd+1);
  } else {
    const listen=s.lastIndexOf('app.listen');
    if(listen<0) throw new Error('Could not find a safe registration point in server/index.js');
    s=s.slice(0,listen)+
      "registerPlayableTranslationRoutes(app,{apiKey:geminiKey,model:geminiModel});\n\n"+
      s.slice(listen);
  }
}

fs.copyFileSync(p,p+'.before-playable-translation.bak');
fs.writeFileSync(p,s);
console.log('Installed Analysis -> Interpreter -> Asset Manifest -> Builder routes.');
console.log('Open /translation-lab.html after starting XPLAY.');
