
import Phaser from 'phaser';
import { BasePLXScene } from './BasePLXScene.js';
import { AnimationDirector } from '../animation/AnimationDirector.js';

export class FightingScene extends BasePLXScene{
  constructor(manifest){super('FightingScene',manifest);}

  create(){
    this.makeParallaxBackground({speed:.04});
    this.floor=this.physics.add.staticImage(480,558,'platform').setScale(3.4,.55).refreshBody();

    this.player=this.physics.add.sprite(245,465,'player').setScale(.84).setCollideWorldBounds(true);
    this.enemy=this.physics.add.sprite(715,465,'enemy').setScale(.84).setFlipX(true).setCollideWorldBounds(true);
    this.physics.add.collider(this.player,this.floor);this.physics.add.collider(this.enemy,this.floor);
    // Apply idle breathing animation to both fighters
    AnimationDirector.applyIdleBreathing(this, this.player);
    AnimationDirector.applyIdleBreathing(this, this.enemy);

    this.keys=this.input.keyboard.addKeys('A,D,W,J,K,L');
    this.playerHP=100;this.enemyHP=100;this.attackCooldown=0;this.enemyCooldown=0;this.roundTime=60_000;
    this.combo=0;this.hitStop=false;

    this.makeHUD();
    this.scoreText.setVisible(false);
    this.goalText.setVisible(false);
    this.pHPBg=this.add.rectangle(235,38,360,20,0x1a2636,.9).setDepth(100);
    this.eHPBg=this.add.rectangle(725,38,360,20,0x1a2636,.9).setDepth(100);
    this.pHP=this.add.rectangle(55,38,360,14,0x24c9c5,1).setOrigin(0,.5).setDepth(101);
    this.eHP=this.add.rectangle(905,38,360,14,0xff5d7d,1).setOrigin(1,.5).setDepth(101);
    this.timer=this.add.text(480,24,'60',{fontFamily:'Arial',fontSize:'32px',fontStyle:'bold',color:'#ffffff'}).setOrigin(.5,0).setDepth(110);
    this.add.text(55,57,'PLAYER',{fontFamily:'Arial',fontSize:'14px',fontStyle:'bold',color:'#ffffff'}).setDepth(110);
    this.add.text(905,57,'RIVAL',{fontFamily:'Arial',fontSize:'14px',fontStyle:'bold',color:'#ffffff'}).setOrigin(1,0).setDepth(110);
  }

  attack(type){
    if(this.attackCooldown>0||this.finished)return;
    const kick=type==='kick', dmg=kick?13:8, range=kick?132:108;
    this.attackCooldown=kick?520:360;
    this.player.setTint(kick?0xffe66c:0xffffff);
    this.time.delayedCall(90,()=>this.player.clearTint());

    if(Math.abs(this.player.x-this.enemy.x)<range && Math.abs(this.player.y-this.enemy.y)<90){
      this.enemyHP=Math.max(0,this.enemyHP-dmg);this.combo++;
      this.enemy.setVelocityX(this.player.x<this.enemy.x?155:-155);
      this.cameras.main.zoomTo(1.025,45);this.time.delayedCall(55,()=>this.cameras.main.zoomTo(1,80));
      this.enemy.setTint(0xffffff);this.time.delayedCall(100,()=>this.enemy.clearTint());
      this.updateBars();
      if(this.enemyHP<=0)this.win('K.O. — YOU WIN');
    }
  }

  updateBars(){
    this.pHP.displayWidth=360*(this.playerHP/100);
    this.eHP.displayWidth=360*(this.enemyHP/100);
  }

  update(_,dt){
    if(this.finished)return;
    this.roundTime=Math.max(0,this.roundTime-dt);
    this.timer.setText(Math.ceil(this.roundTime/1000));
    if(this.roundTime<=0){
      this.win(this.playerHP>=this.enemyHP?'TIME — YOU WIN':'TIME — RIVAL WINS');return;
    }

    this.attackCooldown=Math.max(0,this.attackCooldown-dt);this.enemyCooldown=Math.max(0,this.enemyCooldown-dt);
    const block=this.keys.L.isDown;if(block)this.playFlux(this.player,'block');
    const speed=225;this.player.setVelocityX(0);
    if(this.keys.A.isDown){this.player.setVelocityX(-speed);this.playFlux(this.player,'walk_back');}
    if(this.keys.D.isDown){this.player.setVelocityX(speed);this.playFlux(this.player,'walk_forward');}
    if(Phaser.Input.Keyboard.JustDown(this.keys.W)&&this.player.body.blocked.down)this.player.setVelocityY(-470);this.flashFlux(this.player,'jump','stance');
    if(Phaser.Input.Keyboard.JustDown(this.keys.J)){this.flashFlux(this.player,'punch','stance');this.attack('punch');}
    if(Phaser.Input.Keyboard.JustDown(this.keys.K)){this.flashFlux(this.player,'kick','stance');this.attack('kick');}

    const dx=this.player.x-this.enemy.x;
    this.player.setFlipX(dx>0);this.enemy.setFlipX(dx<0);
    if(Math.abs(dx)>112)this.enemy.setVelocityX(Math.sign(dx)*130);else this.enemy.setVelocityX(0);

    if(Math.abs(dx)<125&&this.enemyCooldown<=0){
      this.enemyCooldown=650+Math.random()*300;
      const dmg=block?2:7;this.combo=0;
      this.playerHP=Math.max(0,this.playerHP-dmg);
      this.player.setVelocityX(this.enemy.x<this.player.x?120:-120);
      // Hit reaction animation
      AnimationDirector.hit(this, this.player);
      this.updateBars();
      this.cameras.main.shake(55,.007);
      if(this.playerHP<=0)this.win('K.O. — RIVAL WINS');
    }
  }
}
