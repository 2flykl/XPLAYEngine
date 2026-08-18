
import JSZip from 'jszip';

export async function exportPLX(project){
  const zip=new JSZip();
  const folder=zip.folder(project.slug || 'xplay-plx');
  folder.file('manifest.json',JSON.stringify(project.manifest,null,2));
  folder.file('style-dna.json',JSON.stringify(project.styleDNA,null,2));
  folder.file('README.txt',`XPLAY PLX PACKAGE
Title: ${project.title}
Engine: ${project.manifest.engine}
Generated: ${new Date().toISOString()}
`);
  if(project.sourceFile){
    folder.file(`source/${project.sourceFile.name}`,project.sourceFile);
  }
  const blob=await zip.generateAsync({type:'blob'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`${project.slug || 'xplay-project'}.plx.zip`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1500);
}
