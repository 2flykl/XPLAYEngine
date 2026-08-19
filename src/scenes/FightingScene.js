import Phaser from 'phaser';
import { BasePLXScene } from './BasePLXScene.js';

export class FightingScene extends BasePLXScene{
  constructor(manifest){super('FightingScene',manifest)}
  create(){
    this.makeParallaxBackground({speed:.05});const wk=this.manifest.worldKit||{};const props=wk.propKeys||[];
    // Dense arena dressing: foreground equipment, runway lamps and distant crowd silhouettes.
    this.add.rectangle(480,525,960,150,0x0a1823,.70).setDepth(2);
    for(let i=0;i<14;i++){const key=props[i%props.length];if(key&&this.textures.exists(key))this.add.image(45+i*72,478-(i%3)*10,key).setScale(.48).setAlpha(.72).setDepth(3);}
    for(let i=0;i<10;i++){const glow=this.add.circle(45+i*100,122+(i%2)*18,4,0x24c9c5,.6).setScrollFactor(0).setDepth(-8);this.tweens.add({targets:glow,alpha:.08,duration:600+i*75,yoyo:true,repeat:-1});}
    this.floor=this.physics.add.staticImage(480,558,'platform').setScale(7.6,.78).refreshBody();
    this.player=this.physics.add.sprite(245,440,'player').setScale(1.05).setCollideWorldBounds(true);this.enemy=this.physics.add.sprite(715,440,'enemy').setScale(1.05).setFlipX(true).setCollideWorldBounds(true);this.player.__sourceSubject=true;this.enemy.__sourceSubject=true;
    this.physics.add.collider(this.player,this.floor);this.physics.add.collider(this.enemy,this.floor);
    this.keys=this.input.keyboard.addKeys('A,D,W,J,K,L,S');this.playerHP=100;this.enemyHP=100;this.attackCooldown=0;this.enemyCooldown=0;this.roundTime=60_000;this.combo=0;this.special=0;
    this.idleTween(this.player);this.idleTween(this.enemy);this.makeHUD();this.scoreText.setVisible(false);this.goalText.setVisible(false);
    this.pHPBg=this.add.rectangle(235,38,360,20,0x1a2636,.92).setDepth(100);this.eHPBg=this.add.rectangle(725,38,360,20,0x1a2636,.92).setDepth(100);this.pHP=this.add.rectangle(55,38,360,14,0x24c9c5,1).setOrigin(0,.5).setDepth(101);this.eHP=this.add.rectangle(905,38,360,14,0xff5d7d,1).setOrigin(1,.5).setDepth(101);this.timer=this.add.text(480,19,'60',{fontFamily:'Arial',fontSize:'34px',fontStyle:'bold',color:'#ffffff'}).setOrigin(.5,0).setDepth(110);this.add.text(55,57,'PLAYER',{fontFamily:'Arial',fontSize:'14px',fontStyle:'bold',color:'#ffffff'}).setDepth(110);this.add.text(905,57,'RIVAL',{fontFamily:'Arial',fontSize:'14px',fontStyle:'bold',color:'#ffffff'}).setOrigin(1,0).setDepth(110);this.specialText=this.add.text(480,66,'SPECIAL 0%',{fontFamily:'Arial',fontSize:'13px',fontStyle:'bold',color:'#ffcb4c'}).setOrigin(.5,0).setDepth(110);
  }
  idleTween(sprite){this.tweens.add({targets:sprite,scaleY:sprite.scaleY*.985,y:sprite.y+2,duration:700,yoyo:true,repeat:-1,ease:'Sine.inOut'});}
  impact(x,y,power=1){for(let i=0;i<10;i++){const p=this.add.rectangle(x,y,8*power,3*power,i%2?0xffcb4c:0xffffff,.95).setDepth(90).setRotation(i*Math.PI/5);this.tweens.add({targets:p,x:x+Math.cos(i*Math.PI/5)*55*power,y:y+Math.sin(i*Math.PI/5)*55*power,alpha:0,duration:220,onComplete:()=>p.destroy()});}}
  animateAttack(sprite,type){const dir=sprite.flipX?-1:1;const x=sprite.x;this.tweens.killTweensOf(sprite);this.tweens.add({targets:sprite,x:x+dir*(type==='kick'?22:14),scaleX:sprite.scaleX*(type==='kick'?1.08:1.04),duration:85,yoyo:true,ease:'Quad.out',onComplete:()=>this.idleTween(sprite)});}
  attack(type='punch'){
    if(this.attackCooldown>0||this.finished)return;const kick=type==='kick',special=type==='special';const dmg=special?25:kick?13:8,range=special?180:kick?138:112;this.attackCooldown=special?900:kick?520:360;this.animateAttack(this.player,type);
    if(Math.abs(this.player.x-this.enemy.x)<range&&Math.abs(this.player.y-this.enemy.y)<100){this.enemyHP=Math.max(0,this.enemyHP-dmg);this.combo++;this.special=Math.min(100,this.special+(special?0:18));this.specialText.setText(`SPECIAL ${this.special}%`);this.enemy.setVelocityX(this.player.x<this.enemy.x?(special?310:175):(special?-310:-175));this.impact(this.enemy.x,this.enemy.y-55,special?1.8:1);this.cameras.main.shake(special?180:80,special?.014:.008);this.cameras.main.zoomTo(special?1.05:1.025,55);this.time.delayedCall(80,()=>this.cameras.main.zoomTo(1,120));this.enemy.setTint(0xffffff);this.time.delayedCall(110,()=>this.enemy.clearTint());this.updateBars();if(this.enemyHP<=0)this.win('K.O. — YOU WIN');}
    if(special)this.special=0;
  }
  updateBars(){this.pHP.displayWidth=360*(this.playerHP/100);this.eHP.displayWidth=360*(this.enemyHP/100)}
  update(_,dt){
    if(this.finished)return;this.roundTime=Math.max(0,this.roundTime-dt);this.timer.setText(Math.ceil(this.roundTime/1000));if(this.roundTime<=0){this.win(this.playerHP>=this.enemyHP?'TIME — YOU WIN':'TIME — RIVAL WINS');return;}
    this.attackCooldown=Math.max(0,this.attackCooldown-dt);this.enemyCooldown=Math.max(0,this.enemyCooldown-dt);const block=this.keys.L.isDown;this.player.setVelocityX(0);const speed=225;if(this.keys.A.isDown)this.player.setVelocityX(-speed);if(this.keys.D.isDown)this.player.setVelocityX(speed);if(Phaser.Input.Keyboard.JustDown(this.keys.W)&&this.player.body.blocked.down)this.player.setVelocityY(-470);if(Phaser.Input.Keyboard.JustDown(this.keys.J))this.attack('punch');if(Phaser.Input.Keyboard.JustDown(this.keys.K))this.attack('kick');if(Phaser.Input.Keyboard.JustDown(this.keys.S)&&this.special>=100)this.attack('special');
    if(block)this.player.setTint(0x9ee8ff);else this.player.clearTint();const dx=this.player.x-this.enemy.x;this.player.setFlipX(dx>0);this.enemy.setFlipX(dx<0);if(Math.abs(dx)>120)this.enemy.setVelocityX(Math.sign(dx)*125);else this.enemy.setVelocityX(0);
    if(Math.abs(dx)<130&&this.enemyCooldown<=0){this.enemyCooldown=650+Math.random()*300;const dmg=block?2:7;this.combo=0;this.playerHP=Math.max(0,this.playerHP-dmg);this.player.setVelocityX(this.enemy.x<this.player.x?145:-145);this.impact(this.player.x,this.player.y-55,.8);this.updateBars();this.cameras.main.shake(65,.007);if(this.playerHP<=0)this.win('K.O. — RIVAL WINS');}
  }
}
