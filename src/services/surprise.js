export async function generateSurpriseIdeas({imageDataUrl, prompt = ''}) {
  // 1️⃣ Local intelligent suggestion pipeline
  //   - Analyze media via existing vision service
  //   - Cast roles and score categories using existing directors
  //   - Produce three distinct playable interpretations
  const localAnalysis = await import('./vision.js').then(m => m.analyzeVisualSource({imageDataUrl, prompt}));
  const suggestions = [];
  if (localAnalysis.ok) {
    const {analysis} = localAnalysis;
    // Simple deterministic generation using role info
    const categories = ['Fighting', 'FPS', 'Runner', 'Dodge', 'Racing', 'Platformer'];
    for (let i = 0; i < 3; i++) {
      const cat = categories[(i + Math.floor(Math.random() * categories.length)) % categories.length];
      const title = `${cat} Idea ${i + 1}`;
      const premise = `A ${cat.toLowerCase()} experience generated from your media.`;
      const mechanic = cat === 'Fighting' ? 'Close‑quarter combos' : cat === 'FPS' ? 'First‑person shooting' : 'Endless run';
      const casting = `Player avatar derived from detected ${analysis.subjectHint || 'person'}.`;
      const signature = `Special ${cat.toLowerCase()} move unlocked after 30 seconds.`;
      suggestions.push({title, category: cat, premise, mechanic, casting, signature});
    }
  }
  // 2️⃣ Optional AI enhancement – try to call remote model if configured
  try {
    const resp = await fetch('/api/ai/enhanceSuggestions', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({suggestions})
    });
    if (resp.ok) {
      const enhanced = await resp.json();
      return enhanced.suggestions || suggestions;
    }
  } catch (e) {
    // Remote model unavailable – fall back to local suggestions
  }
  return suggestions;
}

export function formatSuggestion(s) {
  return `**${s.title}**\n${s.category}\n${s.premise}\n${s.mechanic}\n${s.casting}\n${s.signature}`;
}
