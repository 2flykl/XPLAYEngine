
const http=require('http'),fs=require('fs'),path=require('path');
const root=__dirname,port=8791;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png'};
http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]); if(p==='/')p='/index.html';
  const f=path.join(root,p); if(!f.startsWith(root)){res.writeHead(403);return res.end('Forbidden')}
  fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end('Not found')}
    res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});res.end(d)
  })
}).listen(port,()=>console.log(`XPLAY Screenshot World Lab: http://localhost:${port}/`));
