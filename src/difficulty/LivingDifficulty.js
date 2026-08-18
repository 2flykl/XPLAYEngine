export class LivingDifficulty {
  constructor() {
    // Profiles per category
    this.profiles = {
      fps: this.fpsProfile,
      fighting: this.fightingProfile,
      runner: this.runnerProfile,
      dodge: this.dodgeProfile,
      racing: this.racingProfile,
      platformer: this.platformerProfile,
      rhythm: this.rhythmProfile,
      collect: this.collectProfile,
      puzzle: this.puzzleProfile,
      openworld: this.openWorldProfile,
    };
  }

  // Entry point: call each frame with scene context
  adjust(scene) {
    const cat = scene.engine || scene.constructor.name.replace('Scene', '').toLowerCase();
    const profile = this.profiles[cat];
    if (profile) profile.call(this, scene);
  }

  // ------- Active profiles (full adaptation) -------
  fpsProfile(scene) {
    if (!scene.difficultyState) scene.difficultyState = {deathStreak: 0, spawnInterval: 2000};
    if (scene.playerDied) scene.difficultyState.deathStreak++;
    if (scene.difficultyState.deathStreak > 2) {
      scene.difficultyState.spawnInterval = Math.max(500, scene.difficultyState.spawnInterval - 200);
    }
    if (scene.enemySpawnTimer) scene.enemySpawnTimer.delay = scene.difficultyState.spawnInterval;
  }

  fightingProfile(scene) {
    if (!scene.difficultyState) scene.difficultyState = {combo: 0, enemySpeed: 150};
    if (scene.lastCombo && scene.lastCombo >= 3) {
      scene.difficultyState.enemySpeed += 20;
    }
    scene.enemySpeed = scene.difficultyState.enemySpeed;
  }

  runnerProfile(scene) {
    if (!scene.difficultyState) scene.difficultyState = {fails: 0, speed: 200};
    if (scene.playerFailed) scene.difficultyState.fails++;
    if (scene.difficultyState.fails > 3) {
      scene.difficultyState.speed = Math.max(100, scene.difficultyState.speed - 20);
    }
    scene.baseSpeed = scene.difficultyState.speed;
  }

  dodgeProfile(scene) {
    if (!scene.difficultyState) scene.difficultyState = {hitsMissed: 0, obstacleFreq: 1500};
    if (scene.missedObstacle) scene.difficultyState.hitsMissed++;
    if (scene.difficultyState.hitsMissed > 4) {
      scene.difficultyState.obstacleFreq = Math.max(800, scene.difficultyState.obstacleFreq - 200);
    }
    if (scene.obstacleTimer) scene.obstacleTimer.delay = scene.difficultyState.obstacleFreq;
  }

  racingProfile(scene) {
    if (!scene.difficultyState) scene.difficultyState = {lapTime: 0, speedBoost: 0};
    if (scene.currentLapTime && scene.currentLapTime < scene.difficultyState.lapTime) {
      scene.difficultyState.speedBoost += 5;
    }
    scene.speedBoost = scene.difficultyState.speedBoost;
    scene.difficultyState.lapTime = scene.currentLapTime || scene.difficultyState.lapTime;
  }

  platformerProfile(scene) {
    if (!scene.difficultyState) scene.difficultyState = {falls: 0, gravity: 900};
    if (scene.playerFell) scene.difficultyState.falls++;
    if (scene.difficultyState.falls > 2) {
      scene.difficultyState.gravity = Math.min(1200, scene.difficultyState.gravity + 50);
    }
    scene.physics.world.gravity.y = scene.difficultyState.gravity;
  }

  // ------- Conservative/specialized profiles -------
  rhythmProfile(scene) {
    if (!scene.difficultyState) scene.difficultyState = {hits: 0, total: 0, window: 150};
    if (scene.lastHit !== undefined) {
      scene.difficultyState.hits += scene.lastHit ? 1 : 0;
      scene.difficultyState.total++;
      const ratio = scene.difficultyState.hits / scene.difficultyState.total;
      if (ratio < 0.6) scene.difficultyState.window = Math.min(250, scene.difficultyState.window + 10);
      else scene.difficultyState.window = Math.max(80, scene.difficultyState.window - 10);
    }
    scene.timingWindow = scene.difficultyState.window;
  }

  collectProfile(scene) {
    if (!scene.difficultyState) scene.difficultyState = {misses: 0, hazardFreq: 2000};
    if (scene.missedCollect) scene.difficultyState.misses++;
    if (scene.difficultyState.misses > 3) {
      scene.difficultyState.hazardFreq = Math.max(800, scene.difficultyState.hazardFreq - 200);
    }
    if (scene.hazardTimer) scene.hazardTimer.delay = scene.difficultyState.hazardFreq;
  }

  puzzleProfile(scene) {
    if (!scene.difficultyState) scene.difficultyState = {fails: 0};
    if (scene.puzzleFailed) scene.difficultyState.fails++;
    if (scene.difficultyState.fails >= 3) {
      scene.showHint && scene.showHint();
    }
  }

  openWorldProfile(scene) {
    if (!scene.difficultyState) scene.difficultyState = {encounterFreq: 5000};
    if (scene.playerIdleTime && scene.playerIdleTime > 30) {
      scene.difficultyState.encounterFreq = Math.max(2000, scene.difficultyState.encounterFreq - 500);
    }
    if (scene.encounterTimer) scene.encounterTimer.delay = scene.difficultyState.encounterFreq;
  }
}
