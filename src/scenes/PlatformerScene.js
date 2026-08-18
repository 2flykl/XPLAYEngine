
import Phaser from 'phaser';
import { BasePLXScene } from './BasePLXScene.js';

export class PlatformerScene extends BasePLXScene{
  constructor(manifest){ super('PlatformerScene', manifest); }

  create(){
    this.worldW=2600;
    this.bg=this.makeParallaxBackground({speed:0,axis:'x',direction:'left'});
    this.physics.world.setBounds(0,0,this.worldW,600);this.cameras.main.setBounds(0,0,this.worldW,600);

    this.platforms=this.physics.add.staticGroup();
    for(let x=0;x<this.worldW;x+=260)this.platforms.create(x+130,560,'platform').setScale(.9,.65).refreshBody();
    [[500,430],[820,360],[1180,420],[1500,330],[1850,390],[2180,300]].forEach(([x,y])=>this.platforms.create(x,y,'platform').setScale(.55,.45).refreshBody());

    this.player=this.createFluxPlayer(120,450,{scale:.7,anim:'idle'});
    this.physics.add.collider(this.player,this.platforms);
    this.cameras.main.startFollow(this.player,true,.08,.08);

    this.cursors=this.input.keyboard.createCursorKeys();this.wasd=this.input.keyboard.addKeys('A,D,W');
    this.items=this.physics.add.staticGroup();
    for(let i=0;i<12;i++)this.items.create(260+i*180,300-Math.random()*120,'collectible').setScale(.42).refreshBody();
    this.enemies=this.physics.add.group({allowGravity:true});
    for(let i=0;i<7;i++){const e=this.enemies.create(550+i*300,480,'enemy').setScale(.45);e.setVelocityX(i%2?75:-75);e.setBounce(1);e.setCollideWorldBounds(true);}
    this.physics.add.collider(this.enemies,this.platforms);
    this.physics.add.overlap(this.player,this.items,(p,c)=>{c.destroy();this.setScore(this.score+100);},null,this);
    this.physics.add.overlap(this.player,this.enemies,()=>{this.player.setVelocityY(-300);this.setScore(Math.max(0,this.score-100));},null,this);

    this.goal=this.physics.add.staticImage(2470,465,'goal').setScale(.7).refreshBody();
    this.physics.add.overlap(this.player,this.goal,()=>this.win('LEVEL COMPLETE'),null,this);
    this.makeHUD();
  }

  update(){
    if(this.finished)return;
    if(this.player.body.velocity.x===0 && this.player.body.blocked.down)this.playFlux(this.player,'idle');
    this.bg.tilePositionX=this.cameras.main.scrollX*.3;
    const s=240;this.player.setVelocityX(0);
    if(this.cursors.left.isDown||this.wasd.A.isDown){this.player.setVelocityX(-s);this.playFlux(this.player,'run');this.player.setFlipX(true);}
    if(this.cursors.right.isDown||this.wasd.D.isDown){this.player.setVelocityX(s);this.playFlux(this.player,'run');this.player.setFlipX(false);}
    if((Phaser.Input.Keyboard.JustDown(this.cursors.up)||Phaser.Input.Keyboard.JustDown(this.wasd.W))&&this.player.body.blocked.down)this.player.setVelocityY(-510);this.flashFlux(this.player,'jump','run');
  }
}
