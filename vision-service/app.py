import base64, io, math, os
import numpy as np
import cv2
from PIL import Image
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title='XPLAY Visual Intelligence Service', version='2.7')
COCO_CLASSES = [
'__background__','person','bicycle','car','motorcycle','airplane','bus','train','truck','boat','traffic light','fire hydrant','N/A','stop sign','parking meter','bench','bird','cat','dog','horse','sheep','cow','elephant','bear','zebra','giraffe','N/A','backpack','umbrella','N/A','N/A','handbag','tie','suitcase','frisbee','skis','snowboard','sports ball','kite','baseball bat','baseball glove','skateboard','surfboard','tennis racket','bottle','N/A','wine glass','cup','fork','knife','spoon','bowl','banana','apple','sandwich','orange','broccoli','carrot','hot dog','pizza','donut','cake','chair','couch','potted plant','bed','N/A','dining table','N/A','N/A','toilet','N/A','tv','laptop','mouse','remote','keyboard','cell phone','microwave','oven','toaster','sink','refrigerator','N/A','book','clock','vase','scissors','teddy bear','hair drier','toothbrush'
]
_MASK_MODEL=None
def maskrcnn_analyze(img):
    global _MASK_MODEL
    if os.getenv('XPLAY_VISION_PROVIDER','opencv').lower() not in ('maskrcnn','max','auto-max'):
        return None
    try:
        import torch, torchvision
        from torchvision.transforms.functional import to_tensor
        if _MASK_MODEL is None:
            from torchvision.models.detection import maskrcnn_resnet50_fpn_v2, MaskRCNN_ResNet50_FPN_V2_Weights
            _MASK_MODEL=maskrcnn_resnet50_fpn_v2(weights=MaskRCNN_ResNet50_FPN_V2_Weights.DEFAULT).eval()
        rgb=cv2.cvtColor(img,cv2.COLOR_BGR2RGB)
        with torch.no_grad(): out=_MASK_MODEL([to_tensor(rgb)])[0]
        detections=[]
        for i,score in enumerate(out['scores'].cpu().numpy().tolist()):
            if score<0.58: continue
            label=int(out['labels'][i]); box=out['boxes'][i].cpu().numpy().astype(int).tolist(); mask=(out['masks'][i,0].cpu().numpy()*255).astype(np.uint8)
            detections.append({'label':COCO_CLASSES[label] if label<len(COCO_CLASSES) else str(label),'score':round(float(score),3),'box':box,'mask':mask})
        people=[d for d in detections if d['label']=='person']
        return {'detections':detections,'person':max(people,key=lambda d:d['score']) if people else None}
    except Exception as e:
        print('Mask R-CNN unavailable, falling back to OpenCV:',e)
        return None


class AnalyzeRequest(BaseModel):
    imageDataUrl: str
    prompt: str = ''
    subjectHint: str = 'person'
    aggressiveCutout: bool = True

def decode_data_url(data_url):
    if ',' in data_url: data_url=data_url.split(',',1)[1]
    raw=base64.b64decode(data_url)
    pil=Image.open(io.BytesIO(raw)).convert('RGB')
    return cv2.cvtColor(np.array(pil),cv2.COLOR_RGB2BGR)

def encode_png(arr, rgba=False):
    pil=Image.fromarray(cv2.cvtColor(arr,cv2.COLOR_BGRA2RGBA),'RGBA') if rgba else Image.fromarray(cv2.cvtColor(arr,cv2.COLOR_BGR2RGB),'RGB')
    buf=io.BytesIO();pil.save(buf,format='PNG',optimize=True)
    return 'data:image/png;base64,'+base64.b64encode(buf.getvalue()).decode('ascii')

def clamp_rect(x,y,w,h,W,H):
    x=max(0,int(x));y=max(0,int(y));w=max(1,int(w));h=max(1,int(h))
    if x+w>W:w=W-x
    if y+h>H:h=H-y
    return x,y,w,h

def dominant_palette(img,k=5):
    small=cv2.resize(img,(96,96),interpolation=cv2.INTER_AREA).reshape(-1,3).astype(np.float32)
    criteria=(cv2.TERM_CRITERIA_EPS+cv2.TERM_CRITERIA_MAX_ITER,30,.4)
    _,labels,centers=cv2.kmeans(small,k,None,criteria,3,cv2.KMEANS_PP_CENTERS)
    counts=np.bincount(labels.flatten(),minlength=k);order=np.argsort(counts)[::-1]
    out=[]
    for idx in order:
        b,g,r=centers[idx].astype(int);out.append(f'#{r:02x}{g:02x}{b:02x}')
    return out

def detect_faces(img):
    gray=cv2.cvtColor(img,cv2.COLOR_BGR2GRAY)
    c=cv2.CascadeClassifier(cv2.data.haarcascades+'haarcascade_frontalface_default.xml')
    faces=c.detectMultiScale(gray,scaleFactor=1.08,minNeighbors=4,minSize=(28,28))
    return [list(map(int,f)) for f in faces]

def smart_person_rect(img,faces):
    H,W=img.shape[:2]
    if faces:
        x,y,w,h=max(faces,key=lambda r:r[2]*r[3]);cx=x+w/2
        rw=max(w*4.3,W*.26);rh=max(h*8.2,H*.60)
        return clamp_rect(cx-rw/2,y-h*1.05,rw,rh,W,H)
    return clamp_rect(W*.27,H*.08,W*.46,H*.84,W,H)

def refine_mask(img,rect):
    H,W=img.shape[:2];mask=np.zeros((H,W),np.uint8)
    bgd=np.zeros((1,65),np.float64);fgd=np.zeros((1,65),np.float64)
    x,y,w,h=rect
    try:
        cv2.grabCut(img,mask,(x,y,w,h),bgd,fgd,7,cv2.GC_INIT_WITH_RECT)
        m=np.where((mask==2)|(mask==0),0,1).astype('uint8')
    except Exception:
        m=np.zeros((H,W),np.uint8);m[y:y+h,x:x+w]=1
    n,labels,stats,cent=cv2.connectedComponentsWithStats(m,8)
    if n>1:
        cx=x+w/2;cy=y+h*.33;best=0;score=-1e9
        for i in range(1,n):
            area=stats[i,cv2.CC_STAT_AREA]
            if area<(W*H)*.003:continue
            s=math.log(max(area,1))*7-math.hypot(cent[i][0]-cx,cent[i][1]-cy)*.035
            if s>score:score=s;best=i
        if best:m=(labels==best).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8),iterations=2)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8),iterations=1)
    return cv2.GaussianBlur(m*255,(0,0),1.2)

def rgba_cutout(img,mask):
    bgra=cv2.cvtColor(img,cv2.COLOR_BGR2BGRA);bgra[:,:,3]=mask
    ys,xs=np.where(mask>12)
    if len(xs):
        x1,x2=max(0,xs.min()-8),min(img.shape[1],xs.max()+9);y1,y2=max(0,ys.min()-8),min(img.shape[0],ys.max()+9)
        bgra=bgra[y1:y2,x1:x2]
    return bgra

def clean_background(img,mask):
    solid=(mask>48).astype(np.uint8)*255;solid=cv2.dilate(solid,np.ones((9,9),np.uint8),iterations=1)
    try:return cv2.inpaint(img,solid,7,cv2.INPAINT_TELEA)
    except Exception:
        clean=img.copy();blur=cv2.GaussianBlur(img,(0,0),22);clean[solid>0]=blur[solid>0];return clean

def make_layers(clean):
    far=cv2.convertScaleAbs(cv2.GaussianBlur(clean,(0,0),5.5),alpha=.82,beta=8)
    mid=cv2.GaussianBlur(clean,(0,0),1.2)
    near=cv2.convertScaleAbs(clean,alpha=1.12,beta=-14)
    return far,mid,near

def object_candidates(img,subject_mask,limit=6):
    H,W=img.shape[:2];gray=cv2.cvtColor(img,cv2.COLOR_BGR2GRAY);edges=cv2.Canny(gray,75,165)
    edges=cv2.dilate(edges,np.ones((5,5),np.uint8),iterations=2);edges[subject_mask>40]=0
    contours,_=cv2.findContours(edges,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE);items=[]
    for c in contours:
        x,y,w,h=cv2.boundingRect(c);area=w*h
        if area<W*H*.008 or area>W*H*.30 or w<28 or h<28:continue
        aspect=w/max(h,1);score=area/(W*H)-abs(math.log(max(aspect,.01)))*.004;items.append((score,(x,y,w,h)))
    items=sorted(items,reverse=True)[:limit];out=[]
    for rank,(_,box) in enumerate(items):
        x,y,w,h=box;pad=max(5,int(min(w,h)*.08));x,y,w,h=clamp_rect(x-pad,y-pad,w+pad*2,h+pad*2,W,H)
        crop=img[y:y+h,x:x+w];cg=cv2.cvtColor(crop,cv2.COLOR_BGR2GRAY);ce=cv2.Canny(cg,60,150)
        cs,_=cv2.findContours(cv2.dilate(ce,np.ones((3,3),np.uint8)),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
        alpha=np.zeros((h,w),np.uint8)
        if cs:
            largest=max(cs,key=cv2.contourArea);cv2.drawContours(alpha,[largest],-1,255,-1);alpha=cv2.morphologyEx(alpha,cv2.MORPH_CLOSE,np.ones((7,7),np.uint8),iterations=2);alpha=cv2.GaussianBlur(alpha,(0,0),1)
        else:alpha[:]=255
        bgra=cv2.cvtColor(crop,cv2.COLOR_BGR2BGRA);bgra[:,:,3]=alpha
        out.append({'id':f'object_{rank+1}','bbox':[x,y,w,h],'image':encode_png(bgra,True)})
    return out

@app.get('/health')
def health():return {'ok':True,'provider':os.getenv('XPLAY_VISION_PROVIDER','opencv-grabcut'),'features':['face-seeded subject isolation','clean plate','parallax layers','object proposals','palette','quality metrics']}

@app.post('/analyze')
def analyze(req:AnalyzeRequest):
    img=decode_data_url(req.imageDataUrl);H,W=img.shape[:2];faces=detect_faces(img);advanced=maskrcnn_analyze(img)
    if advanced and advanced.get('person'):
        mask=advanced['person']['mask']; x1,y1,x2,y2=advanced['person']['box'];rect=clamp_rect(x1,y1,x2-x1,y2-y1,W,H)
    else:
        rect=smart_person_rect(img,faces);mask=refine_mask(img,rect)
    cutout=rgba_cutout(img,mask);clean=clean_background(img,mask);far,mid,near=make_layers(clean)
    if advanced:
        objects=[]
        for d in [x for x in advanced['detections'] if x['label']!='person'][:8]:
            x1,y1,x2,y2=d['box'];crop=img[y1:y2,x1:x2];am=d['mask'][y1:y2,x1:x2]
            if crop.size==0: continue
            bgra=cv2.cvtColor(crop,cv2.COLOR_BGR2BGRA);bgra[:,:,3]=am
            objects.append({'id':d['label'],'label':d['label'],'confidence':d['score'],'bbox':[x1,y1,x2-x1,y2-y1],'image':encode_png(bgra,True)})
    else: objects=object_candidates(img,mask)
    ratio=float((mask>40).mean());face_conf=.92 if faces else .35;subject_ok=.2<ratio<.72
    quality=max(0,min(100,round((55 if subject_ok else 25)+face_conf*30+min(len(objects),4)*3)))
    return {'ok':True,'analysis':{'width':W,'height':H,'faces':faces,'subjectRect':rect,'subjectCoverage':round(ratio,4),'palette':dominant_palette(img),'qualityScore':quality,'qualityLabel':'strong' if quality>=78 else 'usable' if quality>=58 else 'review','detections':[{k:v for k,v in d.items() if k!='mask'} for d in advanced['detections']] if advanced else [],'warnings':[] if subject_ok else ['Subject mask coverage is unusual; review isolated subject before generating.']},'assets':{'subject':encode_png(cutout,True),'subjectMask':encode_png(cv2.cvtColor(mask,cv2.COLOR_GRAY2BGR)),'backgroundClean':encode_png(clean),'far':encode_png(far),'mid':encode_png(mid),'near':encode_png(near),'objects':objects}}
