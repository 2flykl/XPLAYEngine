
import Phaser from 'phaser';
import { BasePLXScene } from './BasePLXScene.js';

export class RacingScene extends BasePLXScene{
  constructor(manifest){ super('RacingScene', manifest); }

  create(){
    this.road=this.makeParallaxBackground({speed:1.7,axis:'y',direction:'down'});
    this.car=this.createPlayerCharacter(480,490,{scale:.72,anim:'drive_straight'});this.player=this.car;
    this.cursors=this.input.keyboard.createCursorKeys();this.wasd=this.input.keyboard.addKeys('A,D');
    this.traffic=this.physics.add.group({allowGravity:false});
    this.boosts=this.physics.add.group({allowGravity:false});
    this.speed=310;this.distance=0;this.makeHUD();
    this.physics.add.overlap(this.car,this.traffic,()=>{this.speed=Math.max(180,this.speed-80);this.setScore(Math.max(0,this.score-50));this.flashCharacter(this.car,'crash','drive_straight');this.cameras.main.shake(100,.012);},null,this);
    this.physics.add.overlap(this.car,this.boosts,(p,b)=>{b.destroy();this.speed=Math.min(480,this.speed+65);this.flashCharacter(this.car,'boost','drive_straight');this.setScore(this.score+100);},null,this);
  }

  update(_,dt){
    if(this.finished)return;
    this.updateParallax(dt,this.speed/310);
    const steer=310;this.car.setVelocityX(0);
    if(this.cursors.left.isDown||this.wasd.A.isDown){this.car.setVelocityX(-steer);this.playCharacter(this.car,'steer_left');}
    if(this.cursors.right.isDown||this.wasd.D.isDown){this.car.setVelocityX(steer);this.playCharacter(this.car,'steer_right');}
    if(Math.random()<.018){const t=this.traffic.create(260+Math.random()*440,-60,'enemy').setScale(.55);t.setVelocityY(220);}
    if(Math.random()<.008){const b=this.boosts.create(290+Math.random()*380,-30,'collectible').setScale(.45);b.setVelocityY(250);}
    this.distance+=this.speed*dt/1000;
    this.goalText.setText(`${Math.min(100,Math.floor(this.distance/22))}%`);
    if(this.distance>=2200)this.win('FINISH LINE');
  }
}
