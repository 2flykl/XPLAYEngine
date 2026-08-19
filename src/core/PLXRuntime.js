
import Phaser from 'phaser';
import { analyzeRenderedCanvas } from './VisualFrameCritic.js';
import { planVisualRepairs, shouldRepair } from './VisualRepairDirector.js';

import { RunnerScene } from '../scenes/RunnerScene.js';
import { DodgeScene } from '../scenes/DodgeScene.js';
import { CollectScene } from '../scenes/CollectScene.js';
import { RhythmScene } from '../scenes/RhythmScene.js';
import { PuzzleScene } from '../scenes/PuzzleScene.js';

import { FPSScene } from '../scenes/FPSScene.js';
import { FightingScene } from '../scenes/FightingScene.js';
import { OpenWorldScene } from '../scenes/OpenWorldScene.js';
import { RacingScene } from '../scenes/RacingScene.js';
import { PlatformerScene } from '../scenes/PlatformerScene.js';

const sceneMap = {
  runner: RunnerScene,
  dodge: DodgeScene,
  collect: CollectScene,
  rhythm: RhythmScene,
  puzzle: PuzzleScene,
  fps: FPSScene,
  fighting: FightingScene,
  openworld: OpenWorldScene,
  racing: RacingScene,
  platformer: PlatformerScene,
};

export class PLXRuntime {
  constructor(container='game-container'){
    this.container = container;
    this.game = null;
    this._visualRepairTimers=[];
    this.visualRepairHistory=[];
  }

  destroy(){
    for(const t of this._visualRepairTimers||[])clearTimeout(t);this._visualRepairTimers=[];
    if(this.game){
      this.game.destroy(true);
      this.game = null;
    }
    const el = document.getElementById(this.container);
    if(el) el.innerHTML = '';
  }

  analyzeCurrentFrame(){
    const canvas=this.game?.canvas;
    return analyzeRenderedCanvas(canvas);
  }


  runVisualRepairLoop(){
    this.visualRepairHistory=[];
    const checkpoints=[1300,2600,4200];
    checkpoints.forEach((delay,passIndex)=>{
      const timer=setTimeout(()=>{
        if(!this.game?.canvas)return;
        const report=this.analyzeCurrentFrame();
        const actions=planVisualRepairs(report,passIndex);
        this.visualRepairHistory.push({pass:passIndex+1,report,actions,timestamp:Date.now()});
        if(!shouldRepair(report,passIndex)||!actions.length)return;
        const scene=this.game.scene?.getScenes?.(true)?.[0];
        if(scene?.applyVisualRepair)scene.applyVisualRepair(actions,report);
      },delay);this._visualRepairTimers.push(timer);
    });
  }

  launch(manifest){
    this.destroy();
    if(manifest.engine==='html'){
      const el = document.getElementById(this.container);
      if(el){
        const iframe = document.createElement('iframe');
        iframe.setAttribute('sandbox', 'allow-scripts');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.borderRadius = '22px';
        iframe.srcdoc = manifest.assets?.html || '<h1>No playable HTML content</h1>';
        el.appendChild(iframe);
      }
      return;
    }
    const Scene = sceneMap[manifest.engine];
    if(!Scene){
      throw new Error(`Unknown PLX engine "${manifest.engine}". Registered engines: ${Object.keys(sceneMap).join(', ')}`);
    }

    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: this.container,
      backgroundColor: manifest.theme?.background || '#071b29',
      width: 960,
      height: 600,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: manifest.physics?.gravity ?? 0 },
          debug: false
        }
      },
      scene: [new Scene(manifest)],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    });
    this.runVisualRepairLoop();
    // Runtime truth wins: after the scene has settled, capture a real gameplay frame.
    if(manifest.__id){
      const capture=setTimeout(()=>{
        try{
          const data=this.game?.canvas?.toDataURL?.('image/png',0.92);
          if(data&&data.length>1000)localStorage.setItem(`xplay:runtime-preview:${manifest.__id}`,data);
        }catch{}
      },1800);
      this._visualRepairTimers.push(capture);
    }
  }
}
