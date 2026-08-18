/* src/animation/AnimationDirector.js */
// Central reusable animation helpers for PLX scenes.
// Each method receives the Phaser scene (this), the target sprite, and optional config.
// All helpers use existing sprite sheets when possible, falling back to tweens.

export class AnimationDirector {
  /**
   * Apply a subtle breathing scale loop for idle characters.
   * Uses tween on scaleY/scaleX if the sprite has no built‑in idle animation.
   */
  static applyIdleBreathing(scene, sprite, config = {}) {
    const { scale = 1, duration = 2000, yoyo = true } = config;
    if (!sprite) return;
    // If sprite already has an idle animation playing, skip.
    if (sprite.anims && sprite.anims.isPlaying && sprite.anims.currentAnim.key.includes('idle')) return;
    scene.tweens.add({
      targets: sprite,
      scaleX: scale * 1.02,
      scaleY: scale * 0.98,
      duration,
      yoyo,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  /**
   * Jump animation sequence: optional jump sprite animation, then land bounce.
   */
  static jump(scene, sprite, config = {}) {
    const { jumpAnim = 'jump', landAnim = 'land', bounce = 0.2, duration = 150 } = config;
    if (!sprite) return;
    // Try to play a jump animation via Flux or custom frames.
    if (scene.playFlux) scene.playFlux(sprite, jumpAnim, false);
    // Apply upward velocity already handled by scene; we add a small bounce on landing.
    scene.time.delayedCall(300, () => {
      // land animation if exists
      if (scene.playFlux) scene.playFlux(sprite, landAnim, false);
      // bounce tween for landing impact
      scene.tweens.add({
        targets: sprite,
        y: sprite.y + (sprite.body ? sprite.body.height * bounce : 5),
        yoyo: true,
        duration,
        ease: 'Quad.easeOut'
      });
    });
  }

  /**
   * Simple hit reaction: flash tint and small knockback tween.
   */
  static hit(scene, sprite, config = {}) {
    const { tint = 0xff6666, duration = 120, offset = 8 } = config;
    if (!sprite) return;
    sprite.setTint(tint);
    scene.time.delayedCall(duration, () => sprite.clearTint());
    // tiny knockback opposite to attacker direction if known.
    if (scene.player && sprite.x < scene.player.x) {
      scene.tweens.add({ targets: sprite, x: sprite.x - offset, yoyo: true, duration: 80, ease: 'Cubic.easeOut' });
    } else if (scene.player) {
      scene.tweens.add({ targets: sprite, x: sprite.x + offset, yoyo: true, duration: 80, ease: 'Cubic.easeOut' });
    }
  }

  /**
   * Simple recoil for FPS weapon sprite.
   */
  static recoil(scene, sprite, config = {}) {
    const { offset = 5, duration = 80 } = config;
    if (!sprite) return;
    scene.tweens.add({
      targets: sprite,
      x: sprite.x - offset,
      yoyo: true,
      duration,
      ease: 'Back.easeOut'
    });
  }

  /**
   * Idle sway for FPS weapon – subtle left/right swing.
   */
  static idleSway(scene, sprite, config = {}) {
    const { amplitude = 2, speed = 2500 } = config;
    if (!sprite) return;
    scene.tweens.add({
      targets: sprite,
      angle: { from: -amplitude, to: amplitude },
      duration: speed,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }
// Motion helper methods for fighting characters
  static walk(scene, sprite, direction = 'right', config = {}) {
    const { speed = 1.5, amplitude = 2, duration = 400 } = config;
    if (!sprite) return;
    scene.tweens.add({
      targets: sprite,
      y: sprite.y - amplitude,
      yoyo: true,
      repeat: -1,
      duration,
      ease: 'Sine.easeInOut'
    });
    sprite.setFlipX(direction === 'left');
  }

  static jumpAnticipation(scene, sprite, config = {}) {
    const { crouchScale = 0.9, duration = 150 } = config;
    if (!sprite) return;
    scene.tweens.add({
      targets: sprite,
      scaleY: crouchScale,
      yoyo: true,
      duration,
      ease: 'Quad.easeIn'
    });
  }

  static airborne(scene, sprite, config = {}) {
    const { duration = 300, height = -30 } = config;
    if (!sprite) return;
    scene.tweens.add({
      targets: sprite,
      y: sprite.y + height,
      yoyo: true,
      repeat: -1,
      duration,
      ease: 'Sine.easeInOut'
    });
  }

  static landing(scene, sprite, config = {}) {
    const { bounce = 0.2, duration = 120 } = config;
    if (!sprite) return;
    scene.tweens.add({
      targets: sprite,
      y: sprite.y + (sprite.body ? sprite.body.height * bounce : 5),
      yoyo: true,
      duration,
      ease: 'Quad.easeOut'
    });
  }

  static punchSequence(scene, sprite, config = {}) {
    const { tint = 0xffe066, offset = 10, duration = 80 } = config;
    if (!sprite) return;
    sprite.setTint(tint);
    scene.tweens.add({
      targets: sprite,
      x: sprite.x + offset,
      yoyo: true,
      duration,
      ease: 'Cubic.easeOut'
    });
    scene.time.delayedCall(duration, () => sprite.clearTint());
  }

  static kickSequence(scene, sprite, config = {}) {
    const { tint = 0xffa066, offset = 14, duration = 100 } = config;
    if (!sprite) return;
    sprite.setTint(tint);
    scene.tweens.add({
      targets: sprite,
      x: sprite.x + offset,
      yoyo: true,
      duration,
      ease: 'Cubic.easeOut'
    });
    scene.time.delayedCall(duration, () => sprite.clearTint());
  }

  static block(scene, sprite, config = {}) {
    const { tint = 0x99ffff, duration = 200 } = config;
    if (!sprite) return;
    sprite.setTint(tint);
    scene.time.delayedCall(duration, () => sprite.clearTint());
  }

  static hitStun(scene, target, config = {}) {
    const { duration = 200 } = config;
    if (!target) return;
    if (target.body) target.body.enable = false;
    scene.time.delayedCall(duration, () => {
      if (target.body) target.body.enable = true;
    });
  }

  static knockback(scene, sprite, direction = 'right', config = {}) {
    const { offset = 20, duration = 120 } = config;
    if (!sprite) return;
    const dx = direction === 'right' ? offset : -offset;
    scene.tweens.add({
      targets: sprite,
      x: sprite.x + dx,
      yoyo: true,
      duration,
      ease: 'Cubic.easeOut'
    });
  }

  static ko(scene, sprite, config = {}) {
    const { duration = 800 } = config;
    if (!sprite) return;
    scene.tweens.add({
      targets: sprite,
      alpha: 0,
      duration,
      ease: 'Linear'
    });
  }
}

