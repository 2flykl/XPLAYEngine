
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

  launch(manifest, hooks={}){
    this.destroy();
    const onReady = typeof hooks.onReady === 'function' ? hooks.onReady : ()=>{};
    const onFailure = typeof hooks.onFailure === 'function' ? hooks.onFailure : ()=>{};
    const host = document.getElementById(this.container);

    const fail = (error) => {
      const err = error instanceof Error ? error : new Error(String(error || 'Unknown runtime failure'));
      this.lastError = err;
      try { onFailure(err); } catch {}
      if (host) {
        try { if (this.game) this.game.destroy(true); } catch {}
        this.game = null;
        host.innerHTML = `<div style="height:100%;display:grid;place-items:center;background:#101820;color:#fff;padding:32px;text-align:center">
          <div><h2 style="margin:0 0 10px">Playable failed to start</h2>
          <p style="opacity:.8">${String(err.message || err)}</p>
          <button id="xplayRuntimeRetry" style="padding:10px 16px;border:0;border-radius:10px;background:#24c9c5;color:#062431;font-weight:800;cursor:pointer">RETRY</button></div>
        </div>`;
        host.querySelector('#xplayRuntimeRetry')?.addEventListener('click',()=>this.launch(manifest,hooks));
      }
    };

    if(manifest.engine==='html'){
      if(host){
        const iframe = document.createElement('iframe');
        iframe.setAttribute('sandbox', 'allow-scripts');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.borderRadius = '22px';
        iframe.srcdoc = manifest.assets?.html || '<h1>No playable HTML content</h1>';
        host.appendChild(iframe);
        onReady({type:'html',manifest});
      }
      return;
    }

    const Scene = sceneMap[manifest.engine];
    if(!Scene){
      fail(new Error(`Unknown PLX engine "${manifest.engine}". Registered engines: ${Object.keys(sceneMap).join(', ')}`));
      return;
    }

    let startupError = null;
    const errorHandler = (event) => {
      const err = event?.error || new Error(event?.message || 'Runtime startup error');
      startupError = err;
    };
    const rejectionHandler = (event) => {
      startupError = event?.reason instanceof Error ? event.reason : new Error(String(event?.reason || 'Runtime promise rejected'));
    };
    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);

    try {
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
    } catch (error) {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
      fail(error);
      return;
    }

    const maxStartupMs = manifest.playability?.maxStartupMs || 4500;
    const readyTimer = setTimeout(()=>{
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);

      if (startupError) {
        fail(startupError);
        return;
      }

      const canvas = this.game?.canvas;
      const activeScenes = this.game?.scene?.getScenes?.(true) || [];
      if (!canvas || activeScenes.length === 0) {
        fail(new Error('The Phaser scene did not become active. The playable manifest or required assets may be incomplete.'));
        return;
      }

      onReady({type:'phaser',scene:activeScenes[0],manifest});
      this.runVisualRepairLoop();
    }, Math.min(maxStartupMs, 4500));

    this._visualRepairTimers.push(readyTimer);
  }
}
