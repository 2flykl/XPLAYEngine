import Phaser from 'phaser';
import { BasePLXScene } from './BasePLXScene.js';
import { saliencyStyle } from '../core/SaliencyDirector.js';
import { composePlatformerLevel } from '../core/LevelComposer.js';
const pick=(arr,i,f)=>arr?.length?arr[i%arr.length]:f;

export class PlatformerScene extends BasePLXScene{
  constructor(manifest){super('PlatformerScene',manifest)}
  create(){
    const seed=this.manifest.worldDNA?.seed||this.manifest.title||'platformer';this.levelPlan=composePlatformerLevel({seed,feel:this.manifest.feel||'action',worldKit:this.manifest.worldKit||{}});this.worldW=this.levelPlan.length;this.bg=this.makeParallaxBackground({speed:0,axis:'x',direction:'left'});this.physics.world.setBounds(0,0,this.worldW,600);this.cameras.main.setBounds(0,0,this.worldW,600);
    const wk=this.manifest.worldKit||{};this.terrainKeys=wk.terrainKeys||['platform'];this.propKeys=wk.propKeys||[];this.enemyKeys=wk.enemyKeys||['enemy'];this.collectibleKeys=wk.collectibleKeys||['collectible'];
    this.platforms=this.physics.add.staticGroup();
    // Constraint-composed world: S-curve difficulty, alternate routes and entropy-selected tile variants.
    let ti=0;for(const section of this.levelPlan.platforms){let cell=0;for(let x=section.x;x<section.x+section.len;x+=124){const key=section.tileSequence?.[cell++]||pick(this.terrainKeys,section.keyOffset+ti++,'platform');this.platforms.create(x+62,section.y,key).setScale(1.02,section.alternate?.62:.7).refreshBody();}}
    this.decor=[];for(const d0 of this.levelPlan.dressing){if(!this.textures.exists(d0.key))continue;const d=this.add.image(d0.x,d0.y,d0.key).setScale(saliencyStyle('prop',d0.scale).scale).setDepth(saliencyStyle('prop').depth).setAlpha(saliencyStyle('prop').alpha);this.decor.push(d);}
    this.player=this.createPlayerCharacter(120,450,{scale:.76,anim:'idle',maxHeight:132,maxWidth:98});this.physics.add.collider(this.player,this.platforms);this.cameras.main.startFollow(this.player,true,.09,.08);
    this.cursors=this.input.keyboard.createCursorKeys();this.wasd=this.input.keyboard.addKeys('A,D,W');
    this.items=this.physics.add.staticGroup();this.levelPlan.items.forEach((it,i)=>this.items.create(it.x,it.y,it.key||pick(this.collectibleKeys,i,'collectible')).setScale(.52).refreshBody());
    this.enemies=this.physics.add.group({allowGravity:true});this.levelPlan.foes.forEach((f,i)=>{const e=this.enemies.create(f.x,f.y,f.key||pick(this.enemyKeys,i,'enemy')).setScale(.56);e.setVelocityX(f.vx);e.setBounce(1);e.setCollideWorldBounds(true);});
    this.physics.add.collider(this.enemies,this.platforms);this.physics.add.overlap(this.player,this.items,(p,c)=>{this.collectBurst(c.x,c.y);c.destroy();this.setScore(this.score+100)},null,this);this.physics.add.overlap(this.player,this.enemies,()=>{this.player.setVelocityY(-320);this.setScore(Math.max(0,this.score-100));this.cameras.main.shake(80,.006)},null,this);
    this.goal=this.physics.add.staticImage(this.levelPlan.finishX,455,'goal').setScale(.72).refreshBody();this.physics.add.overlap(this.player,this.goal,()=>this.win('GATE REACHED'),null,this);
    this.makeAmbient();this.signatureDone=false;this.makeHUD();this.goalText.setText('FIND THE XPLAY GATE');
  }
  makeAmbient(){for(let i=0;i<6;i++){const c=this.add.ellipse(150+i*550,115+(i%2)*45,190,30,0xffffff,.05).setDepth(-12);this.tweens.add({targets:c,x:c.x+90,duration:5000+i*700,yoyo:true,repeat:-1});}for(let i=0;i<10;i++){const l=this.add.circle(80+i*340,512,3,0x24c9c5,.65).setDepth(12);this.tweens.add({targets:l,alpha:.1,duration:700+i*60,yoyo:true,repeat:-1});}}
  collectBurst(x,y){for(let i=0;i<7;i++){const p=this.add.circle(x,y,3,i%2?0xffcb4c:0x24c9c5,.9).setDepth(60);this.tweens.add({targets:p,x:x+Phaser.Math.Between(-26,26),y:y+Phaser.Math.Between(-36,8),alpha:0,duration:420,onComplete:()=>p.destroy()});}}
  signature(){if(this.signatureDone||!this.textures.exists('signatureJet'))return;this.signatureDone=true;const j=this.add.image(this.player.x+850,120,'signatureJet').setScale(1.1).setDepth(-4);this.cameras.main.shake(360,.005);this.tweens.add({targets:j,x:this.player.x-500,y:185,duration:2600,onComplete:()=>j.destroy()});}

  applyVisualRepair(actions=[],report={}){
    const cam=this.cameras.main;const wk=this.manifest.worldKit||{};
    for(const a of actions){
      if(a.type==='density-boost'||a.type==='prototype-repair'){
        const start=cam.scrollX+80,end=cam.scrollX+920;for(let i=0;i<6*(a.amount||1);i++){
          const key=this.propKeys[(this.decor.length+i*5)%Math.max(1,this.propKeys.length)];if(!key||!this.textures.exists(key))continue;
          const d=this.add.image(Phaser.Math.Between(start,end),Phaser.Math.Between(450,505),key).setScale(.34+Math.random()*.18).setDepth(5).setAlpha(.72);this.decor.push(d);
        }
      }
      if(a.type==='layer-boost'&&this._parallaxLayers)this._parallaxLayers.forEach((l,i)=>l.setAlpha(Math.min(1,(l.alpha||.5)+.08+i*.03)));
      if(a.type==='palette-boost')this.cameras.main.flash(90,18,50,70,false);
    }
    this._visualRepairCount=(this._visualRepairCount||0)+actions.length;
  }
  update(){
    if(this.finished)return;const s=245;this.player.setVelocityX(0);if(this.player.body.blocked.down)this.playCharacter(this.player,'idle');
    if(this.cursors.left.isDown||this.wasd.A.isDown){this.player.setVelocityX(-s);this.playCharacter(this.player,'run');this.player.setFlipX(true);}if(this.cursors.right.isDown||this.wasd.D.isDown){this.player.setVelocityX(s);this.playCharacter(this.player,'run');this.player.setFlipX(false);}
    if((Phaser.Input.Keyboard.JustDown(this.cursors.up)||Phaser.Input.Keyboard.JustDown(this.wasd.W))&&this.player.body.blocked.down){this.player.setVelocityY(-515);this.flashCharacter(this.player,'jump','run');}
    if(this._parallaxLayers){const sx=this.cameras.main.scrollX;this._parallaxLayers.forEach((l,i)=>l.tilePositionX=sx*[.08,.20,.38][i]);}
    if(this.player.x>this.levelPlan.signatureX&&!this.signatureDone)this.signature();
  }
}
