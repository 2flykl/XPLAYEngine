
export class SourceTruthGuard {
  constructor() {
    this.current = null;
    this.downstream = {};
  }

  lock(packet) {
    if (!packet || !packet.sourcePacketId) {
      throw new Error("Cannot lock source packet without sourcePacketId");
    }
    this.current = structuredClone(packet);
    this.downstream = {}; // HARD INVALIDATION of all prior derived state
    return this.current;
  }

  derive(kind, payload) {
    if (!this.current) throw new Error("No locked source packet");
    const wrapped = {
      sourcePacketId: this.current.sourcePacketId,
      sourceImageId: this.current.sourceImageId,
      derivedFromBuildId: this.current.buildId,
      kind,
      payload: structuredClone(payload)
    };
    this.assertCurrent(wrapped);
    this.assertNoStaleEntities(JSON.stringify(wrapped));
    this.downstream[kind] = wrapped;
    return wrapped;
  }

  get(kind) {
    const item = this.downstream[kind];
    if (!item) return null;
    this.assertCurrent(item);
    return item;
  }

  assertCurrent(item) {
    if (!this.current) throw new Error("No locked source packet");
    if (item.sourcePacketId !== this.current.sourcePacketId) {
      throw new Error(`STALE SOURCE BLOCKED: ${item.sourcePacketId} != ${this.current.sourcePacketId}`);
    }
  }

  assertNoStaleEntities(text) {
    if (!this.current) return;
    const allowed = new Set(
      (this.current.allowedTerms || []).map(s => s.toLowerCase())
    );

    const forbidden = this.current.forbiddenTerms || [
      "alex",
      "b7",
      "zenith industries",
      "dockyard",
      "shipping container",
      "green barrels",
      "hazard-striped concrete",
      "moonlit industrial"
    ];

    const lc = String(text).toLowerCase();
    for (const term of forbidden) {
      if (lc.includes(term.toLowerCase()) && !allowed.has(term.toLowerCase())) {
        throw new Error(`BLOCKED: prompt contains entity not supported by current locked source: ${term}`);
      }
    }
  }

  resetDerived() {
    this.downstream = {};
  }
}
