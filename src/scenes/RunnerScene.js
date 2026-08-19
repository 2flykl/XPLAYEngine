import Phaser from 'phaser';
import { BasePLXScene } from './BasePLXScene.js';
import { saliencyStyle } from '../core/SaliencyDirector.js';
import { composeRunnerLevel } from '../core/LevelComposer.js';
import { solveTerrainStrip } from '../core/TileWFC.js';

const pick=(arr,i,fallback)=>arr?.length?arr[i%arr.length]:fallback;

export class RunnerScene extends BasePLXScene{
  constructor(m){super('RunnerScene',m)}
  create(){
    this.bg=this.makeParallaxBackground({speed:1.15,axis:'x',direction:'left'});
    const wk=this.manifest.worldKit||{};this.terrainKeys=wk.terrainKeys||['platform'];this.propKeys=wk.propKeys||[];this.hazardKeys=wk.hazardKeys||['hazard'];this.collectibleKeys=wk.collectibleKeys||['collectible'];
    this.ground=this.physics.add.staticGroup();
    // Layered runway: varied tile textures with subtle height rhythm, never one repeated slab.
    const groundSequence=solveTerrainStrip(this.terrainKeys,11,{seed:`${this.manifest.worldDNA?.seed||this.manifest.title||'runner'}:visible-ground`});
    for(let i=0;i<11;i++){
      const y=548+(i%4===2?-10:0), key=groundSequence[i]||pick(this.terrainKeys,i,'platform');
      this.ground.create(i*128+64,y,key).setScale(1.04,.72).refreshBody();
    }
    // Decorative runway props create visual density without affecting collision.
    this.decor=[];
    for(let i=0;i<9;i++){
      const key=pick(this.propKeys,i,'collectible');
      if(!this.textures.exists(key))continue;
      const d=this.add.image(120+i*118,470-(i%3)*18,key).setScale(saliencyStyle('prop',.55+(i%2)*.08).scale).setDepth(saliencyStyle('prop').depth).setAlpha(saliencyStyle('prop').alpha);
      this.decor.push(d);
    }
    this.player=this.createFluxPlayer(160,430,{scale:.82,anim:'run',maxHeight:128,maxWidth:96});
    this.physics.add.collider(this.player,this.ground);
    this.collectibles=this.physics.add.group({allowGravity:false});this.hazards=this.physics.add.group({allowGravity:false});
    this.cursors=this.input.keyboard.createCursorKeys();this.space=this.input.keyboard.addKey('SPACE');
    this.physics.add.overlap(this.player,this.collectibles,(p,c)=>{this.collectBurst(c.x,c.y);c.destroy();this.setScore(this.score+(c.premium?250:100));},null,this);
    this.physics.add.overlap(this.player,this.hazards,()=>{this.setScore(Math.max(0,this.score-150));this.flashFlux(this.player,'hurt','run');this.cameras.main.shake(120,.009)},null,this);
    const seed=this.manifest.worldDNA?.seed||this.manifest.title||'runner';this.levelPlan=composeRunnerLevel({seed,feel:this.manifest.feel||'action',speed:330,worldKit:wk,length:Math.max(7000,(this.manifest.duration||38)*330)});this.elapsed=0;this.spawnClock=0;this.spawnCursor={hazard:0,collectible:0};this.signatureDone=false;this.makeAmbient();this.makeHUD();
    this.goalText.setText('REACH THE GATE');
  }
  makeAmbient(){
    // Moving cloud wisps, runway light pulses, and a later signature aircraft pass.
    for(let i=0;i<5;i++){
      const c=this.add.ellipse(110+i*220,100+(i%3)*40,150,28,0xffffff,.055).setDepth(-15).setScrollFactor(0);
      this.tweens.add({targets:c,x:c.x-170,duration:7000+i*900,yoyo:true,repeat:-1,ease:'Sine.inOut'});
    }
    for(let i=0;i<8;i++){
      const l=this.add.circle(55+i*125,505,3,0x24c9c5,.65).setDepth(15);
      this.tweens.add({targets:l,alpha:.12,duration:650+(i%3)*170,yoyo:true,repeat:-1});
    }
  }
  collectBurst(x,y){for(let i=0;i<8;i++){const p=this.add.circle(x,y,2+(i%3),i%2?0xffcb4c:0x24c9c5,.9).setDepth(60);this.tweens.add({targets:p,x:x+Phaser.Math.Between(-30,30),y:y+Phaser.Math.Between(-35,12),alpha:0,duration:380,onComplete:()=>p.destroy()});}}
  signature(){if(this.signatureDone||!this.textures.exists('signatureJet'))return;this.signatureDone=true;const j=this.add.image(1120,118,'signatureJet').setScale(1.25).setDepth(-5).setScrollFactor(0);this.cameras.main.shake(420,.006);this.tweens.add({targets:j,x:-260,y:180,duration:2800,ease:'Sine.in',onComplete:()=>j.destroy()});for(let i=0;i<8;i++){const c=this.collectibles.create(920+i*70,280-Math.sin(i/7*Math.PI)*85,pick(this.collectibleKeys,2,'collectible')).setScale(.62);c.premium=true;c.setVelocityX(-310);}}

  applyVisualRepair(actions=[],report={}){
    for(const a of actions){
      if(a.type==='density-boost'||a.type==='prototype-repair'){
        for(let i=0;i<6*(a.amount||1);i++){
          const key=this.propKeys[(this.decor.length+i*7)%Math.max(1,this.propKeys.length)];if(!key||!this.textures.exists(key))continue;
          const d=this.add.image(80+Math.random()*850,430+Math.random()*70,key).setScale(.34+Math.random()*.2).setDepth(7).setAlpha(.76);this.decor.push(d);
        }
      }
      if(a.type==='layer-boost'&&this._parallaxLayers)this._parallaxLayers.forEach((l,i)=>l.setAlpha(Math.min(1,(l.alpha||.5)+.08+i*.03)));
      if(a.type==='detail-boost')this._parallaxSpeed=Math.min(2.2,(this._parallaxSpeed||1)+.14);
    }
    this._visualRepairCount=(this._visualRepairCount||0)+actions.length;
  }
  update(_,dt){
    if(this.finished)return;this.elapsed+=dt;this.spawnClock+=dt;this.updateParallax(dt);
    if((Phaser.Input.Keyboard.JustDown(this.space)||Phaser.Input.Keyboard.JustDown(this.cursors.up))&&this.player.body.blocked.down){this.player.setVelocityY(-535);this.flashFlux(this.player,'jump','run');}
    // Authored spawn schedule generated by LevelComposer. The same idea always produces the same readable challenge arc.
    const speed=330;const nowX=this.elapsed/1000*speed;
    const cs=this.levelPlan.placements.collectibles;while(this.spawnCursor.collectible<cs.length&&cs[this.spawnCursor.collectible].x<=nowX+1050){const it=cs[this.spawnCursor.collectible++];const c=this.collectibles.create(1050+(it.x-nowX),it.y,it.key).setScale(it.premium?.72:.58);c.premium=it.premium;c.setVelocityX(-speed);}
    const hs=this.levelPlan.placements.hazards;while(this.spawnCursor.hazard<hs.length&&hs[this.spawnCursor.hazard].x<=nowX+1080){const it=hs[this.spawnCursor.hazard++];const h=this.hazards.create(1080+(it.x-nowX),it.y,it.key).setScale(.62);h.setVelocityX(it.speed);}
    this.collectibles.children.each(x=>{if(x.active&&x.x<-90)x.destroy()});this.hazards.children.each(x=>{if(x.active&&x.x<-90)x.destroy()});
    if(this.elapsed/1000*330>this.levelPlan.placements.events[0].x&&!this.signatureDone)this.signature();
    if(this.elapsed>(this.manifest.duration||38)*1000)this.win('RUNWAY CLEARED');
  }
}
