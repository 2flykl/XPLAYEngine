
import { SourceTruthGuard } from './source_guard.js';

const guard = new SourceTruthGuard();
guard.lock({
  sourcePacketId:'alpine_test_packet',
  sourceImageId:'alpine_test_image',
  buildId:'alpine_test_build',
  allowedTerms:['alpine','lake','windmill','castle','dirt path'],
  forbiddenTerms:['Alex','B7','Zenith Industries','dockyard','green barrels']
});

const results = [];
try {
  guard.derive('prompt', {text:'alpine lake windmill castle dirt path'});
  results.push(['current-source prompt','PASS']);
} catch(e) {
  results.push(['current-source prompt','FAIL: '+e.message]);
}
try {
  guard.derive('prompt2', {text:'Alex enters the dockyard beside green barrels'});
  results.push(['stale-content blocker','FAIL: stale content was not blocked']);
} catch(e) {
  results.push(['stale-content blocker','PASS']);
}
console.table(results);
