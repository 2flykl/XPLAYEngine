// src/services/funDirector.js
/**
 * Fun Director Service
 * Provides runtime evaluation of gameplay fun metrics and applies
 * scene‑specific improvements to enhance player experience.
 * Works offline without external AI APIs.
 */

/**
 * Evaluate core fun metrics for a given scene.
 * @param {Phaser.Scene} scene - Active game scene.
 * @returns {Object} Metrics: first5Sec, pacing, rewardFreq, difficulty, feedback, signature, replayability.
 */
export function evaluateFun(scene) {
  const data = {
    elapsed: scene.elapsed || scene.roundTime || 0,
    score: scene.score || 0,
    kills: scene.kills || 0,
    playerHP: scene.player ? scene.player.health : undefined,
    enemyHP: scene.enemy ? scene.enemy.health : undefined,
    events: scene._funEvents || []
  };

  const first5Sec = data.events.filter(e => e.time <= 5000).length;
  const pacing = data.elapsed > 0 ? data.events.length / (data.elapsed / 1000) : 0;
  const rewardFreq = data.elapsed > 0 ? data.events.filter(e => e.type === 'reward').length / (data.elapsed / 1000) : 0;
  const damageDealt = data.kills * 10;
  const enemyHealthLoss = data.enemyHP !== undefined ? (100 - data.enemyHP) : 0;
  const difficulty = damageDealt + enemyHealthLoss;
  const feedback = data.events.filter(e => e.type === 'hit').length;
  const signature = data.events.some(e => e.type === 'signature');
  const replayability = data.elapsed > 0 ? data.score / (data.elapsed / 1000) : 0;

  return { first5Sec, pacing, rewardFreq, difficulty, feedback, signature, replayability };
}

/**
 * Apply concrete improvements based on Fun Director analysis.
 * Idempotent – only runs once per scene.
 * @param {Phaser.Scene} scene
 */
export function applyFunImprovements(scene) {
  if (scene._funImproved) return;
  const metrics = evaluateFun(scene);
  const sceneName = scene.constructor.name;
  const lowPacing = metrics.pacing < 2;

  if (sceneName === 'FPSScene') {
    if (lowPacing && typeof scene.spawnClock !== 'undefined') scene.spawnClock = 0;
    if (typeof scene.eliteEvery !== 'undefined') scene.eliteEvery = Math.max(2, scene.eliteEvery - 2);
    scene.time.addEvent({
      delay: 30000,
      callback: () => {
        scene.add.text(480, 300, 'SIGNATURE! DOUBLE SCORE', { fontSize: '32px', color: '#ffea00' })
          .setOrigin(0.5).setDepth(200);
        scene.scoreMultiplier = 2;
      }
    });
  } else if (sceneName === 'FightingScene') {
    scene.time.addEvent({
      delay: 10000,
      callback: () => {
        scene.signatureUnlocked = true;
        if (scene.player) {
          scene.add.text(scene.player.x, scene.player.y - 80, 'SIGNATURE MOVE READY', { fontSize: '14px', color: '#ffd700' })
            .setDepth(200);
        }
      }
    });
    if (lowPacing) scene.blockDamage = 1;
  } else if (sceneName === 'RunnerScene') {
    scene.time.addEvent({
      delay: 20000,
      callback: () => { scene.collectibleBoost = true; }
    });
    if (lowPacing) {
      scene.time.addEvent({
        delay: 25000,
        loop: true,
        callback: () => {
          const reward = scene.add.text(480, 100, 'BONUS POINTS!', { fontSize: '28px', color: '#00ff99' })
            .setOrigin(0.5).setDepth(200);
          if (typeof scene.setScore === 'function') scene.setScore(scene.score + 200);
          else if (typeof scene.score !== 'undefined') scene.score += 200;
          scene.time.delayedCall(1500, () => reward.destroy());
        }
      });
    }
  }

  scene._funImproved = true;
}

/** Optional per‑frame hook – placeholder for future tweaks. */
export function tickFunDirector(scene, delta) {
  // No‑op for now.
}
