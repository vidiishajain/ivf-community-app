// matching.js

const WEIGHTS = [
  0.25, // IVF stage
  0.20, // Support persona
  0.10, // Mental battery
  0.08, // Round number
  0.07, // Pathway
  0.06, // Age
  0.03, // Journey partner
  0.008, 0.008, 0.008, 0.008, 0.008, 0.008, // diagnosis (6)
  0.024, 0.024, 0.024, 0.024, 0.024,         // hurdle (5)
  0.008, 0.008, 0.008, 0.008, 0.008,         // escape (5)
];

function toArray(v) {
  if (!v) return null;
  // Already a proper JS array
  if (Array.isArray(v)) return v.map(Number);
  // Came back as a string
  if (typeof v === "string") return JSON.parse(v).map(Number);
  // Came back as object with numeric keys (rare Supabase edge case)
  if (typeof v === "object") return Object.values(v).map(Number);
  return null;
}

export function getMatches(currentUser, allProfiles, topN = 5) {
  const myVec = toArray(currentUser.feature_vec);

  if (!myVec) return [];

  const scored = allProfiles
    .filter(p => p.id !== currentUser.id && p.feature_vec)
    .map(p => {
      const theirVec = toArray(p.feature_vec);
      if (!theirVec) return null;

      // Weighted euclidean distance
      let sum = 0;
      const len = Math.min(myVec.length, theirVec.length, WEIGHTS.length);
      for (let i = 0; i < len; i++) {
        const w = WEIGHTS[i];
        const diff = (myVec[i] || 0) - (theirVec[i] || 0);
        sum += w * diff * diff;
      }
      const d = Math.sqrt(sum);

      return { profile: p, distance: d };
    })
    .filter(Boolean)
    .filter(s => isFinite(s.distance));

  scored.sort((a, b) => a.distance - b.distance);

  const top = scored.slice(0, topN);
  if (top.length === 0) return [];

  const minD = top[0].distance;
  const maxD = top[top.length - 1].distance;
  const range = maxD - minD || 0.001;

  return top.map(({ profile, distance: d }) => {
    const matchPct = Math.round(99 - ((d - minD) / range) * 29);
    return { profile, distance: d, matchPct };
  });
}