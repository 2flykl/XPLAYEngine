# V11 Playable Completion Spec

## Required Runtime Lifecycle
BUILD -> ASSEMBLE -> VALIDATE -> MOUNT -> READY -> PLAY -> WIN/FAIL -> RETRY -> CAPTURE

## Required Build Contract
Every generated manifest must contain:
- engine
- title
- objective
- controls
- required game assets
- playability metadata
- fun-factor metadata
- explicit completion behavior

## Startup Watchdog
A build must not sit forever on a dark canvas.
If Phaser does not produce an active scene within the startup window:
- stop the game,
- show the actual error,
- expose Retry,
- preserve the build for debugging.

## Completion Standard
A player must be able to begin, understand, act, get feedback, face challenge, and finish.
