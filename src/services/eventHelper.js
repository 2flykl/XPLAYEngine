// src/services/eventHelper.js
/**
 * Lightweight event telemetry helper.
 * Records a typed event with optional detail into the scene's _funEvents array.
 * The timestamp is calculated relative to the scene's start time.
 *
 * @param {Phaser.Scene} scene - The scene emitting the event.
 * @param {string} type - Short identifier for the event (e.g., 'enemy_spawn').
 * @param {any} [detail] - Optional extra data describing the event.
 */
export function logEvent(scene, type, detail) {
  if (!scene || typeof scene._funEvents === 'undefined') return;
  const elapsed = Date.now() - (scene._playStartedAt || Date.now());
  scene._funEvents.push({ time: elapsed, type, detail });
}
