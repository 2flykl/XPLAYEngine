import Phaser from 'phaser';
import { parallaxFactor } from '../core/WorldMath.js';
import { sanitizeAssetRef, sanitizeAssetMap } from '../core/FreshBuildGuard.js';

const PUBLIC_BASE=import.meta.env.BASE_URL || './';
const publicAsset=(path='')=>`${PUBLIC_BASE}${String(path).replace(/^\.\//,'').replace(/^\//,'')}`;

const FLUX_RUNTIME = {
  runner:      { folder:'10_PLX_RUNNER',      default:'idle', animations:['idle','run','jump','fall','land','slide','hurt','celebrate'] },
  dodge:       { folder:'11_PLX_DODGE',       default:'idle', animations:['idle','move_left','move_right','move_up','move_down','duck','hurt','evade'] },
  collect:     { folder:'12_PLX_COLLECT',     default:'idle', animations:['idle','walk','run','pickup','carry','interact','hurt','victory'] },
  rhythm:      { folder:'13_PLX_RHYTHM',      default:'idle_groove', animations:['idle_groove','beat_left','beat_right','beat_up','beat_down','perfect','miss','victory'] },
  puzzle:      { folder:'14_PLX_PUZZLE',      default:'think', animations:['think','inspect','choose','correct','wrong','confused','celebrate','victory'] },
  fps:         { folder:'15_PLX_FPS',         default:'idle_aim', animations:['idle_aim','fire','reload','hurt','recover','crouch','camouflage','victory'] },
  fighting:    { folder:'16_PLX_FIGHTING',    default:'stance', animations:['stance','walk_forward','walk_back','jump','punch','kick','block','hurt','victory'] },
  openworld:   { folder:'17_PLX_OPEN_WORLD',  default:'idle', animations:['idle','walk_n','walk_s','walk_e','walk_w','run_n','run_s','run_e','run_w','interact','talk','victory'] },
  racing:      { folder:'18_PLX_RACING',      default:'idle_car', animations:['idle_car','drive_straight','steer_left','steer_right','boost','brake','crash','finish'] },
  platformer:  { folder:'19_PLX_PLATFORMER',  default:'idle', animations:['idle','run','jump','fall','land','wall_cling','wall_jump','tongue_swing','hurt','finish'] }
};

export class BasePLXScene extends Phaser.Scene {
  constructor(key, manifest) {
    super(key);
    this.manifest = manifest;
    this.score = 0;
    this.fluxCfg = FLUX_RUNTIME[manifest.engine] || null;
    // Telemetry: start timestamp and event log
    this._playStartedAt = Date.now();
    this._funEvents = [];
  }

  asset(path) {
    const ref = sanitizeAssetRef(path);
    if (!ref) return '';
    if (/^(data:|blob:|https?:)/.test(ref)) return ref;
    if (ref.startsWith('/')) return publicAsset(ref);
    return `${this.manifest.__base || ''}${ref}`;
  }

  preload() {
    const a = this.manifest.assets || {};
    const images = sanitizeAssetMap(a.images || {});
    const audio = sanitizeAssetMap(a.audio || {});
    for (const [k,p] of Object.entries(images)) {
      const ref=this.asset(p);
      if(ref) this.load.image(k,ref);
    }
    for (const [k,p] of Object.entries(audio)) {
      const ref=this.asset(p);
      if(ref) this.load.audio(k,ref);
    }
    const par=sanitizeAssetMap(this.manifest.parallax || {});
    for(const [k,v] of Object.entries(par)){
      const ref=this.asset(v);
      if(ref) this.load.image(`parallax:${k}`,ref);
    }
    this.preloadFlux();
  }

  preloadFlux(){
    if(!this.fluxCfg) return;
    const base=publicAsset(`flux-pack/${this.fluxCfg.folder}/frames`);
    for(const anim of this.fluxCfg.animations){
      for(let i=0;i<15;i++) this.load.image(`flux:${anim}:${i}`,`${base}/${anim}/${anim}_${String(i).padStart(3,'0')}.png`);
    }
  }

  setupFluxAnimations(){
    if(!this.fluxCfg || this._fluxAnimationsReady) return;
    for(const anim of this.fluxCfg.animations){
      const key=`flux-${this.manifest.engine}-${anim}`;
      if(!this.anims.exists(key)){
        this.anims.create({key,frames:Array.from({length:15},(_,i)=>({key:`flux:${anim}:${i}`})),frameRate:['runner','racing'].includes(this.manifest.engine)?14:12,repeat:['hurt','victory','finish','jump','land','fire','reload','kick','punch','correct','wrong'].includes(anim)?0:-1});
      }
    }
    this._fluxAnimationsReady=true;
  }

  setupGeneratedPlayerAnimations(){
    const map=this.manifest.generatedAnimations?.player;if(!map||this._generatedPlayerAnimationsReady)return false;
    for(const [state,frames] of Object.entries(map)){
      const valid=(frames||[]).filter(k=>this.textures.exists(k));if(!valid.length)continue;
      const key=`generated-player-${state}`;
      if(!this.anims.exists(key))this.anims.create({key,frames:valid.map(k=>({key:k})),frameRate:state==='run'?12:8,repeat:['idle','run','fall'].includes(state)?-1:0});
    }
    this._generatedPlayerAnimationsReady=true;return true;
  }

  createFluxPlayer(x,y,opts={}){
    // Prefer AI-manufactured state frames when the Production Art Forge supplied them.
    const generated=this.manifest.generatedAnimations?.player;
    if(generated && this.setupGeneratedPlayerAnimations()){
      const first=(generated[opts.anim||'idle']||generated.idle||[]).find(k=>this.textures.exists(k));
      if(first){const p=opts.physics===false?this.add.sprite(x,y,first):this.physics.add.sprite(x,y,first);const src=p.texture.getSourceImage();const maxH=opts.maxHeight||150,maxW=opts.maxWidth||115,sw=src?.width||128,sh=src?.height||128;const scale=Math.min(maxW/sw,maxH/sh);p.setScale(scale*(opts.scale?opts.scale/.72:1));if(opts.depth!=null)p.setDepth(opts.depth);if(opts.physics!==false&&opts.collideWorldBounds!==false)p.setCollideWorldBounds(true);p.__generatedPlayer=true;this.playFlux(p,opts.anim||'idle',false);return p;}
    }
    // Generated PLXs should use the extracted/remastered source subject, not force Flux into the player's slot.
    if(this.manifest.visualIntelligence && this.textures.exists('player')){
      const p=opts.physics===false?this.add.sprite(x,y,'player'):this.physics.add.sprite(x,y,'player');
      const maxH=opts.maxHeight||150,maxW=opts.maxWidth||115;
      const src=p.texture.getSourceImage(); const sw=src?.width||128,sh=src?.height||128;
      const scale=Math.min(maxW/sw,maxH/sh);
      p.setScale(scale*(opts.scale?opts.scale/.72:1));
      if(opts.depth!=null)p.setDepth(opts.depth);
      if(opts.physics!==false && opts.collideWorldBounds!==false)p.setCollideWorldBounds(true);
      p.__sourceSubject=true;
      return p;
    }
    this.setupFluxAnimations();
    const anim=opts.anim || this.fluxCfg?.default || 'idle';
    const key=`flux:${anim}:0`;
    const p=opts.physics===false?this.add.sprite(x,y,key):this.physics.add.sprite(x,y,key);
    p.setScale(opts.scale ?? .72);
    if(opts.depth!=null)p.setDepth(opts.depth);
    if(opts.physics!==false && opts.collideWorldBounds!==false)p.setCollideWorldBounds(true);
    this.playFlux(p,anim);
    return p;
  }

  makeParallaxBackground({speed=0,fixed=true,axis='x',direction='left'}={}){
    const par=this.manifest.parallax||{};
    const layers=[];
    if(par.far&&this.textures.exists('parallax:far')) layers.push(this.add.tileSprite(480,300,960,600,'parallax:far').setDepth(-30).setAlpha(.96));
    if(par.mid&&this.textures.exists('parallax:mid')) layers.push(this.add.tileSprite(480,300,960,600,'parallax:mid').setDepth(-25).setAlpha(.72));
    if(par.near&&this.textures.exists('parallax:near')) layers.push(this.add.tileSprite(480,300,960,600,'parallax:near').setDepth(-20).setAlpha(.38));
    if(!layers.length && this.textures.exists('background')) layers.push(this.add.tileSprite(480,300,960,600,'background').setDepth(-30));
    if(fixed) layers.forEach(x=>x.setScrollFactor(0));
    this._parallaxLayers=layers;this._parallaxSpeed=speed;this._parallaxAxis=axis;this._parallaxDirection=direction;
    return layers[1]||layers[0];
  }

  updateParallax(dt=16,mult=1){
    if(!this._parallaxLayers?.length||!this._parallaxSpeed)return;
    const f=dt/16.666;const total=this._parallaxLayers.length;const speeds=this._parallaxLayers.map((_,i)=>Math.max(.12,parallaxFactor(total-1-i,total,1.55)));
    // Phaser TileSprite sampling means +X visually moves scenery left; -Y visually moves scenery down.
    const sign={left:1,right:-1,down:-1,up:1}[this._parallaxDirection]??1;
    this._parallaxLayers.forEach((l,i)=>{
      const amount=this._parallaxSpeed*speeds[i]*f*mult*sign;
      if(this._parallaxAxis==='y')l.tilePositionY+=amount;else l.tilePositionX+=amount;
    });
  }

  playFlux(sprite,anim,ignoreIfPlaying=true){
    if(!sprite)return;
    if(sprite.__generatedPlayer){const key=`generated-player-${anim}`;if(this.anims.exists(key)&&sprite.anims?.currentAnim?.key!==key)sprite.play(key,ignoreIfPlaying);return;}
    if(sprite.__sourceSubject || !this.fluxCfg?.animations.includes(anim)) return;
    const key=`flux-${this.manifest.engine}-${anim}`;
    if(sprite.anims?.currentAnim?.key===key && ignoreIfPlaying)return;
    sprite.play(key,ignoreIfPlaying);
  }

  flashFlux(sprite,anim,returnAnim=this.fluxCfg?.default || 'idle'){
    if(!sprite)return;
    this.playFlux(sprite,anim,false);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE,()=>this.playFlux(sprite,returnAnim,false));
  }

  makeFluxCornerAvatar(anim=this.fluxCfg?.default || 'idle'){
    const avatar=this.createFluxPlayer(900,520,{physics:false,scale:.55,depth:85,anim});
    avatar.setScrollFactor(0);
    return avatar;
  }


  applyArcadePolish(){
    if(this._arcadePolishApplied)return;this._arcadePolishApplied=true;
    // Thin neon frame + subtle moving glints make generated drafts read like an arcade presentation, not a canvas test.
    this.add.rectangle(480,300,950,590,0x000000,0).setStrokeStyle(2,0x24c9c5,.34).setScrollFactor(0).setDepth(70);
    for(let i=0;i<14;i++){
      const dot=this.add.circle(Phaser.Math.Between(20,940),Phaser.Math.Between(60,570),Phaser.Math.Between(1,3),0xffffff,Phaser.Math.FloatBetween(.12,.36)).setScrollFactor(0).setDepth(65);
      this.tweens.add({targets:dot,alpha:{from:dot.alpha,to:.03},y:dot.y-Phaser.Math.Between(10,35),duration:Phaser.Math.Between(1200,2600),yoyo:true,repeat:-1,delay:Phaser.Math.Between(0,900)});
    }
  }

  makeHUD() {
    this.applyArcadePolish();
    this.add.rectangle(480, 24, 956, 48, 0x051824, 0.5).setScrollFactor(0).setDepth(90);
    this.scoreText = this.add.text(24, 14, 'SCORE 0', {fontFamily:'Arial',fontSize:'19px',fontStyle:'bold',color:'#ffffff'}).setScrollFactor(0).setDepth(100);
    this.goalText = this.add.text(936, 14, this.manifest.objective?.label || 'OBJECTIVE', {fontFamily:'Arial',fontSize:'16px',fontStyle:'bold',color:'#ffffff',align:'right'}).setOrigin(1,0).setScrollFactor(0).setDepth(100);
  }

  // Lightweight telemetry helper
  recordFunEvent(type, detail = {}) {
    const time = Date.now() - this._playStartedAt;
    this._funEvents.push({ time, type, detail });
  }

  setScore(n){ this.score=n; this.scoreText?.setText(`SCORE ${this.score}`); }
  win(message='PLX COMPLETE'){
    if(this.finished)return;
    this.finished=true;this.physics?.pause();
    if(this.player)this.flashFlux(this.player,this.fluxCfg?.animations.includes('victory')?'victory':this.fluxCfg?.animations.includes('finish')?'finish':this.fluxCfg?.default);
    this.add.rectangle(480,300,560,220,0x081b27,.94).setScrollFactor(0).setDepth(300);
    this.add.text(480,250,message,{fontFamily:'Arial',fontSize:'34px',fontStyle:'bold',color:'#2ad5c8',align:'center'}).setOrigin(.5).setScrollFactor(0).setDepth(301);
    this.add.text(480,310,`Score: ${this.score}`,{fontFamily:'Arial',fontSize:'24px',color:'#ffffff'}).setOrigin(.5).setScrollFactor(0).setDepth(301);
    this.add.text(480,352,'Flux cleared this PLX demo.',{fontFamily:'Arial',fontSize:'16px',color:'#b9d5df'}).setOrigin(.5).setScrollFactor(0).setDepth(301);
  }
}
