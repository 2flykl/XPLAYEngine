const profiles = {
  runner:{combo:true,pressure:'rising',signature:'chase-or-spectacle',rewardCadence:4,nearMiss:true},
  dodge:{combo:true,pressure:'rising',signature:'hazard-storm',rewardCadence:5,nearMiss:true},
  collect:{combo:true,pressure:'exploration',signature:'rare-discovery',rewardCadence:6,nearMiss:false},
  rhythm:{combo:true,pressure:'beat-ramp',signature:'drop-section',rewardCadence:2,nearMiss:false},
  puzzle:{combo:true,pressure:'board-escalation',signature:'cascade',rewardCadence:3,nearMiss:false},
  fps:{combo:true,pressure:'wave-ramp',signature:'elite-wave',rewardCadence:3,nearMiss:true},
  fighting:{combo:true,pressure:'round-ramp',signature:'special-finish',rewardCadence:2,nearMiss:true},
  openworld:{combo:false,pressure:'discovery',signature:'landmark-event',rewardCadence:8,nearMiss:false},
  racing:{combo:true,pressure:'speed-ramp',signature:'final-sprint',rewardCadence:4,nearMiss:true},
  platformer:{combo:true,pressure:'section-ramp',signature:'set-piece',rewardCadence:4,nearMiss:true}
};

export function directFunFactor(input={}) {
  const manifest = input;
  const engine = manifest.engine || 'runner';
  const p = profiles[engine] || profiles.runner;
  const feel = manifest.feel || 'action';

  manifest.fun = {
    ...(manifest.fun || {}),
    profile: p,
    onboardingSeconds: 6,
    firstRewardSeconds: 8,
    firstMeaningfulChallengeSeconds: 12,
    difficultyCurve: feel === 'relaxed' ? 'gentle' : feel === 'challenge' ? 'steep' : 'progressive',
    feedback: {
      hitStopMs: ['fighting','fps'].includes(engine) ? 70 : 35,
      cameraShake: !['puzzle'].includes(engine),
      particles: true,
      scorePopups: true,
      soundCueRequired: true
    },
    retention: {
      comboSystem: p.combo,
      nearMissBonus: p.nearMiss,
      rewardCadenceSeconds: p.rewardCadence,
      signatureMoment: p.signature
    },
    completion: {
      explicitWin: true,
      explicitFail: true,
      retry: true,
      summary: true
    }
  };

  manifest.duration = Math.max(24, Math.min(75, Number(manifest.duration || 40)));
  return manifest;
}
