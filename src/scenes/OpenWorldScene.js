
import Phaser from 'phaser';
import { BasePLXScene } from './BasePLXScene.js';

export class OpenWorldScene extends BasePLXScene{
  constructor(manifest){super('OpenWorldScene',manifest);}

  create(){
    this.worldW=2400;this.worldH=1600;
    this.add.tileSprite(this.worldW/2,this.worldH/2,this.worldW,this.worldH,'background').setDepth(-20);

    // Roads / districts
    for(let x=200;x<this.worldW;x+=520)this.add.rectangle(x,this.worldH/2,120,this.worldH,0x26394a,.72).setDepth(-10);
    for(let y=250;y<this.worldH;y+=430)this.add.rectangle(this.worldW/2,y,this.worldW,105,0x26394a,.72).setDepth(-10);

    // Buildings
    for(let i=0;i<24;i++){
      const bx=120+Math.random()*(this.worldW-240),by=100+Math.random()*(this.worldH-200);
      const b=this.add.image(bx,by,'building').setScale(.55+Math.random()*.2).setDepth(-3);
    }

    this.physics.world.setBounds(0,0,this.worldW,this.worldH);
    this.cameras.main.setBounds(0,0,this.worldW,this.worldH);
    this.player=this.createFluxPlayer(300,320,{scale:.68,anim:'idle'});
    this.cameras.main.startFollow(this.player,true,.07,.07);

    this.cursors=this.input.keyboard.createCursorKeys();this.keys=this.input.keyboard.addKeys('W,A,S,D,E');

    this.relics=this.physics.add.staticGroup();
    for(let i=0;i<10;i++)this.relics.create(180+Math.random()*(this.worldW-360),160+Math.random()*(this.worldH-320),'collectible').setScale(.42).refreshBody();

    this.npcs=this.physics.add.staticGroup();
    for(let i=0;i<12;i++)this.npcs.create(180+Math.random()*(this.worldW-360),160+Math.random()*(this.worldH-320),'npc').setScale(.5).refreshBody();

    this.physics.add.overlap(this.player,this.relics,(p,r)=>{r.destroy();this.setScore(this.score+1);this.questText.setText(`QUEST: RECOVER RELICS ${this.score}/10`);if(this.score>=10)this.win('QUEST COMPLETE');},null,this);

    this.makeHUD();this.scoreText.setText('RELICS 0');
    this.questText=this.add.text(22,52,'QUEST: RECOVER RELICS 0/10',{fontFamily:'Arial',fontSize:'18px',fontStyle:'bold',color:'#ffffff'}).setScrollFactor(0).setDepth(100);
    this.districtText=this.add.text(938,52,'DOWNTOWN',{fontFamily:'Arial',fontSize:'18px',fontStyle:'bold',color:'#24c9c5'}).setOrigin(1,0).setScrollFactor(0).setDepth(100);
    this.hint=this.add.text(480,565,'Explore freely · collect relics · approach NPCs',{fontFamily:'Arial',fontSize:'15px',color:'#ffffff'}).setOrigin(.5).setScrollFactor(0).setDepth(100);
  }

  setScore(n){this.score=n;this.scoreText?.setText(`RELICS ${n}`);}

  update(){
    if(this.finished)return;
    const s=255;this.player.setVelocity(0);
    if(this.cursors.left.isDown||this.keys.A.isDown){this.player.setVelocityX(-s);this.playFlux(this.player,'walk_w');}
    if(this.cursors.right.isDown||this.keys.D.isDown){this.player.setVelocityX(s);this.playFlux(this.player,'walk_e');}
    if(this.cursors.up.isDown||this.keys.W.isDown){this.player.setVelocityY(-s);this.playFlux(this.player,'walk_n');}
    if(this.cursors.down.isDown||this.keys.S.isDown){this.player.setVelocityY(s);this.playFlux(this.player,'walk_s');}

    if(this.player.body.velocity.lengthSq()===0)this.playFlux(this.player,'idle');const x=this.player.x,y=this.player.y;
    const district=x<800?'OLD QUARTER':x<1600?'DOWNTOWN':'HARBOR';
    this.districtText.setText(district);

    let near=null,min=110;
    for(const npc of this.npcs.getChildren()){
      const d=Phaser.Math.Distance.Between(x,y,npc.x,npc.y);
      if(d<min){near=npc;min=d;}
    }
    this.hint.setText(near?'Press E to talk':'Explore freely · collect relics · approach NPCs');
    if(near&&Phaser.Input.Keyboard.JustDown(this.keys.E)){
      this.flashFlux(this.player,'interact','idle');this.hint.setText('NPC: “Relics are scattered across all three districts.”');
    }
  }
}
