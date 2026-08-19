import Phaser from 'phaser';
import { parallaxFactor } from '../core/WorldMath.js';
import { characterStates, characterKey, characterDataUrl } from '../core/CharacterFactory.js';

const PUBLIC_BASE=import.meta.env.BASE_URL || './';
const publicAsset=(path='')=>`${PUBLIC_BASE}${String(path).replace(/^\.\//,'').replace(/^\//,'')}`;

const CHARACTER_RUNTIME = Object.freeze({source:'per-plx',fallback:'engine-specific'});

export class BasePLXScene extends Phaser.Scene {
  constructor(key, manifest) {
    super(key);
    this.manifest = manifest;
    this.score = 0;
    this.characterCfg = CHARACTER_RUNTIME;
    this.characterDefault = manifest.engine==='fighting'?'stance':manifest.engine==='racing'?'drive_straight':manifest.engine==='rhythm'?'idle_groove':manifest.engine==='puzzle'?'think':'idle';
    // Telemetry: start timestamp and event log
    this._playStartedAt = Date.now();
    this._funEvents = [];
  }

  asset(path) {
    if (!path) return path;
    if (/^(data:|blob:|https?:)/.test(path)) return path;
    if (path.startsWith('/')) return publicAsset(path);
    return `${this.manifest.__base || ''}${path}`;
  }

  preload() {
    const a = this.manifest.assets || {};
    for (const [k, p] of Object.entries(a.images || {})) this.load.image(k, this.asset(p));
    for (const [k, p] of Object.entries(a.audio || {})) this.load.audio(k, this.asset(p));
    const par=this.manifest.parallax||{}; for(const [k,v] of Object.entries(par)){if(v)this.load.image(`parallax:${k}`,this.asset(v));}
    this.preloadCharacters();
  }

  preloadCharacters(){
    const engine=this.manifest.engine||'runner';
    const states=characterStates(engine);
    for(const variant of ['player','rival']) for(const state of states) for(let i=0;i<4;i++) this.load.image(characterKey(engine,variant,state,i),characterDataUrl(engine,variant,state,i));
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

  setupCharacterAnimations(variant='player'){
    const engine=this.manifest.engine||'runner';const states=characterStates(engine);
    for(const state of states){const key=`plx-character-${engine}-${variant}-${state}`;if(this.anims.exists(key))continue;const frames=[];for(let i=0;i<4;i++){const k=characterKey(engine,variant,state,i);if(this.textures.exists(k))frames.push({key:k});}if(frames.length)this.anims.create({key,frames,frameRate:['run','walk','walk_forward','walk_back','drive_straight'].includes(state)?11:8,repeat:['idle','run','walk','stance','drive_straight','idle_groove','think'].includes(state)?-1:0});}
  }

  createPlayerCharacter(x,y,opts={}){
    const generated=this.manifest.generatedAnimations?.player;
    if(generated && this.setupGeneratedPlayerAnimations()){
      const first=(generated[opts.anim||this.characterDefault]||generated.idle||[]).find(k=>this.textures.exists(k));
      if(first){const p=opts.physics===false?this.add.sprite(x,y,first):this.physics.add.sprite(x,y,first);this._fitCharacter(p,opts);p.__generatedPlayer=true;this.playCharacter(p,opts.anim||this.characterDefault,false);return p;}
    }
    if(this.manifest.visualIntelligence && this.textures.exists('player')){const p=opts.physics===false?this.add.sprite(x,y,'player'):this.physics.add.sprite(x,y,'player');this._fitCharacter(p,opts);p.__sourceSubject=true;return p;}
    const variant=opts.variant||'player';this.setupCharacterAnimations(variant);const state=opts.anim||this.characterDefault;const k=characterKey(this.manifest.engine||'runner',variant,state,0);const p=opts.physics===false?this.add.sprite(x,y,k):this.physics.add.sprite(x,y,k);this._fitCharacter(p,opts);p.__plxCharacterVariant=variant;this.playCharacter(p,state,false);return p;
  }

  createOpponentCharacter(x,y,opts={}){return this.createPlayerCharacter(x,y,{...opts,variant:'rival'});}
  _fitCharacter(p,opts={}){const src=p.texture.getSourceImage();const sw=src?.width||96,sh=src?.height||112;const maxH=opts.maxHeight||150,maxW=opts.maxWidth||115;const base=Math.min(maxW/sw,maxH/sh);p.setScale(base*(opts.scale?opts.scale/.72:1));if(opts.depth!=null)p.setDepth(opts.depth);if(opts.physics!==false&&opts.collideWorldBounds!==false)p.setCollideWorldBounds(true);}

  playCharacter(sprite,state,ignoreIfPlaying=true){if(!sprite)return;if(sprite.__generatedPlayer){const key=`generated-player-${state}`;if(this.anims.exists(key)&&sprite.anims?.currentAnim?.key!==key)sprite.play(key,ignoreIfPlaying);return;}if(sprite.__sourceSubject)return;const variant=sprite.__plxCharacterVariant||'player';const key=`plx-character-${this.manifest.engine}-${variant}-${state}`;if(this.anims.exists(key)&&sprite.anims?.currentAnim?.key!==key)sprite.play(key,ignoreIfPlaying);}
  flashCharacter(sprite,state,returnState=this.characterDefault){if(!sprite)return;this.playCharacter(sprite,state,false);sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE,()=>this.playCharacter(sprite,returnState,false));}
  makeCornerCharacter(state=this.characterDefault){const a=this.createPlayerCharacter(900,520,{physics:false,scale:.55,depth:85,anim:state});a.setScrollFactor(0);return a;}

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
    if(this.player)this.flashCharacter(this.player,'victory');
    this.add.rectangle(480,300,560,220,0x081b27,.94).setScrollFactor(0).setDepth(300);
    this.add.text(480,250,message,{fontFamily:'Arial',fontSize:'34px',fontStyle:'bold',color:'#2ad5c8',align:'center'}).setOrigin(.5).setScrollFactor(0).setDepth(301);
    this.add.text(480,310,`Score: ${this.score}`,{fontFamily:'Arial',fontSize:'24px',color:'#ffffff'}).setOrigin(.5).setScrollFactor(0).setDepth(301);
    this.add.text(480,352,'Playable complete. Ready for another run.',{fontFamily:'Arial',fontSize:'16px',color:'#b9d5df'}).setOrigin(.5).setScrollFactor(0).setDepth(301);
  }
}
