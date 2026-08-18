
import Phaser from 'phaser';
import { BasePLXScene } from './BasePLXScene.js';
import { AnimationDirector } from '../animation/AnimationDirector.js';

export class FPSScene extends BasePLXScene {
  constructor(manifest){ super('FPSScene',manifest); }

  create(){
    this.makeParallaxBackground({speed:0,axis:'x',direction:'left'});

    // foreground cover gives it a spy/action-shooter composition
    this.add.rectangle(480,575,960,120,0x081523,.9).setDepth(40);
    this.add.image(480,545,'weapon').setScale(.72).setDepth(45);

    this.crosshair=this.add.image(480,285,'crosshair').setScale(.55).setDepth(100);
    // Apply idle sway to crosshair for subtle motion
    AnimationDirector.idleSway(this, this.crosshair);
    this.input.on('pointermove',p=>this.crosshair.setPosition(p.x,p.y));
    this.input.on('pointerdown',p=>this.fire(p.x,p.y));

    this.keys=this.input.keyboard.addKeys('R');
    this.enemies=[];
    this.health=100; this.ammo=12; this.reserve=48; this.elapsed=0; this.spawnClock=0; this.reloading=false;
    this.wave=1; this.kills=0; this.eliteEvery=6;

    this.makeHUD();this.fluxAvatar=this.createFluxPlayer(115,500,{physics:false,scale:.52,depth:60,anim:'idle_aim'});
    this.healthText=this.add.text(22,52,'HEALTH 100',{fontFamily:'Arial',fontSize:'18px',fontStyle:'bold',color:'#ffffff'}).setDepth(100);
    this.ammoText=this.add.text(938,52,'AMMO 12 / 48',{fontFamily:'Arial',fontSize:'18px',fontStyle:'bold',color:'#24c9c5'}).setOrigin(1,0).setDepth(100);
    this.missionText=this.add.text(480,20,'MISSION: CLEAR THE APPROACH',{fontFamily:'Arial',fontSize:'17px',fontStyle:'bold',color:'#ffffff'}).setOrigin(.5,0).setDepth(100);
  }

  reload(){
    if(this.reloading || this.ammo===12 || this.reserve<=0)return;
    this.reloading=true;this.ammoText.setText('RELOADING...');this.flashFlux(this.fluxAvatar,'reload','idle_aim');
    this.time.delayedCall(850,()=>{
      const need=12-this.ammo, take=Math.min(need,this.reserve);
      this.ammo+=take;this.reserve-=take;this.reloading=false;
      this.updateAmmo();
    });
  }

  updateAmmo(){this.ammoText.setText(`AMMO ${this.ammo} / ${this.reserve}`);}

  fire(x,y){
    if(this.finished||this.reloading)return;
    if(this.ammo<=0){this.reload();return;}
    this.ammo--;this.updateAmmo();    this.flashFlux(this.fluxAvatar,'fire','idle_aim');
    // Recoil animation for crosshair on fire
    AnimationDirector.recoil(this, this.crosshair);
    this.cameras.main.flash(28,255,245,220,false);

    let target=null,best=9999;
    for(const e of this.enemies){
      if(!e.active)continue;
      const d=Phaser.Math.Distance.Between(x,y,e.x,e.y);
      if(d<52*e.scaleX && d<best){best=d;target=e;}
    }
    if(target){
      this.kills++;
      this.setScore(this.score+(target.elite?300:100));
      this.add.image(target.x,target.y,'hitfx').setScale(target.scaleX*.5).setDepth(95).setAlpha(.9);
      target.destroy();this.enemies=this.enemies.filter(e=>e!==target);
    }else this.setScore(Math.max(0,this.score-5));
  }

  spawnEnemy(){
    const lane=Phaser.Math.Between(0,4);
    const startX=[145,310,480,650,815][lane];
    const e=this.add.image(startX,160+Phaser.Math.Between(-25,25),'enemy').setScale(.22).setDepth(10);
    e.elite=((this.kills+this.enemies.length+1)%this.eliteEvery===0);
    if(e.elite)e.setTint(0xffd95a);
    e.depthZ=0;e.advance=(e.elite?.00125:.0009)+Math.random()*.00065;e.drift=(Math.random()-.5)*.5;
    this.enemies.push(e);
  }

  update(_,dt){
    if(this.finished)return;
    this.elapsed+=dt;this.spawnClock+=dt;
    if(Phaser.Input.Keyboard.JustDown(this.keys.R))this.reload();
    if(this.spawnClock>Math.max(430,900-this.elapsed/120)){this.spawnClock=0;this.spawnEnemy();}

    for(const e of [...this.enemies]){
      e.depthZ+=e.advance*dt;
      e.x+=e.drift*dt*.08;
      const s=.22+e.depthZ*1.32;
      e.setScale(s);
      e.y=165+e.depthZ*305;
      e.setDepth(10+Math.floor(e.depthZ*20));
      if(e.depthZ>1){
        e.destroy();this.enemies=this.enemies.filter(x=>x!==e);
        this.health=Math.max(0,this.health-20);
        this.healthText.setText(`HEALTH ${this.health}`);
        this.cameras.main.shake(130,.012);
        if(this.health<=0){this.win('MISSION FAILED');return;}
      }
    }
    if(this.elapsed>(this.manifest.duration||45)*1000)this.win('MISSION COMPLETE');
  }
}
