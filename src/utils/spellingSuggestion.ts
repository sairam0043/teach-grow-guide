/**
 * Spelling Suggestion Utility for Tutor Search
 * Helps users who mistype subjects, tutor names, or cities (e.g. "boilgy" -> "Biology")
 */

// Comprehensive subject dictionary for tutor discovery
export const STANDARD_SEARCH_SUBJECTS = [
  "Biology",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Coding / Computer Science",
  "Computer Science",
  "Programming",
  "English",
  "History",
  "Geography",
  "Economics & Finance",
  "Economics",
  "Accountancy",
  "Foreign Languages",
  "French",
  "German",
  "Spanish",
  "Hindi",
  "Malayalam",
  "Kannada",
  "Tamil",
  "Telugu",
  "Sanskrit",
  "Music (Vocal/Instruments)",
  "Music",
  "Guitar",
  "Piano",
  "Keyboard",
  "Violin",
  "Drums",
  "Dance",
  "Bharatanatyam",
  "Kathak",
  "Fine Arts & Drawing",
  "Drawing",
  "Painting",
  "Chess",
  "Yoga & Meditation",
  "Yoga",
  "Public Speaking & Debate",
  "Creative Writing",
  "Photography & Video",
  "Photography",
  "Science",
  "Social Science",
  "Social Studies",
  "Environmental Science",
  "Statistics",
  "Psychology",
  "Sociology",
  "Political Science",
  "Business Studies",
  "Robotics",
  "Artificial Intelligence",
  "Data Science"
];

// Common short-forms & abbreviations
export const SUBJECT_ABBREVIATIONS: Record<string, string> = {
  "bio": "Biology",
  "math": "Mathematics",
  "maths": "Mathematics",
  "mathematic": "Mathematics",
  "chem": "Chemistry",
  "chemi": "Chemistry",
  "phy": "Physics",
  "phys": "Physics",
  "cs": "Coding / Computer Science",
  "comp": "Coding / Computer Science",
  "compsci": "Coding / Computer Science",
  "it": "Coding / Computer Science",
  "eng": "English",
  "econ": "Economics & Finance",
  "econs": "Economics & Finance",
  "geo": "Geography",
  "hist": "History",
  "ai": "Artificial Intelligence",
  "ml": "Artificial Intelligence",
  "ds": "Data Science",
  "art": "Fine Arts & Drawing",
  "arts": "Fine Arts & Drawing",
  "singing": "Music (Vocal/Instruments)",
  "vocal": "Music (Vocal/Instruments)"
};

/**
 * Calculates the Damerau-Levenshtein distance between two strings.
 * Handles insertions, deletions, substitutions, and adjacent transpositions
 * (e.g. "boilgy" -> "biology").
 */
export function damerauLevenshteinDistance(source: string, target: string): number {
  const s = source.toLowerCase();
  const t = target.toLowerCase();
  const m = s.length;
  const n = t.length;

  if (m === 0) return n;
  if (n === 0) return m;

  // Initialize (m + 2) x (n + 2) matrix
  const INF = m + n;
  const H: number[][] = Array.from({ length: m + 2 }, () => Array(n + 2).fill(0));

  H[0][0] = INF;
  for (let i = 0; i <= m; i++) {
    H[i + 1][1] = i;
    H[i + 1][0] = INF;
  }
  for (let j = 0; j <= n; j++) {
    H[1][j + 1] = j;
    H[0][j + 1] = INF;
  }

  const da: Record<string, number> = {};

  for (let i = 1; i <= m; i++) {
    let db = 0;
    for (let j = 1; j <= n; j++) {
      const i1 = da[t[j - 1]] || 0;
      const j1 = db;
      let cost = 0;
      if (s[i - 1] === t[j - 1]) {
        db = j;
      } else {
        cost = 1;
      }

      H[i + 1][j + 1] = Math.min(
        H[i][j] + cost, // substitution
        H[i + 1][j] + 1, // insertion
        H[i][j + 1] + 1, // deletion
        H[i1][j1] + (i - i1 - 1) + 1 + (j - j1 - 1) // transposition
      );
    }
    da[s[i - 1]] = i;
  }

  return H[m + 1][n + 1];
}

/**
 * Calculates string similarity ratio between 0 and 1
 */
export function calculateSimilarity(s1: string, s2: string): number {
  const distance = damerauLevenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  if (maxLength === 0) return 1.0;
  return Math.max(0, 1 - distance / maxLength);
}

export interface SpellingSuggestionResult {
  hasSuggestion: boolean;
  originalQuery: string;
  suggestedWord: string;
  correctedText: string;
  targetType: "subject" | "name" | "city" | "general";
  displayMessage: string;
  confidence: number;
}

export interface CandidateDictionary {
  subjects?: string[];
  names?: string[];
  cities?: string[];
}

/**
 * Finds the best spelling suggestion for a given search query
 */
export function getSpellingSuggestion(
  query: string,
  extraCandidates?: CandidateDictionary
): SpellingSuggestionResult | null {
  const cleanQuery = query.trim();
  if (!cleanQuery || cleanQuery.length < 3) return null;

  const normalizedQuery = cleanQuery.toLowerCase();

  // Check 1: Direct abbreviation / short form match
  if (SUBJECT_ABBREVIATIONS[normalizedQuery]) {
    const suggestedWord = SUBJECT_ABBREVIATIONS[normalizedQuery];
    return {
      hasSuggestion: true,
      originalQuery: cleanQuery,
      suggestedWord,
      correctedText: suggestedWord,
      targetType: "subject",
      displayMessage: `Are you searching for ${suggestedWord}?`,
      confidence: 0.95
    };
  }

  // Build candidate pool
  const subjectList = Array.from(
    new Set([...STANDARD_SEARCH_SUBJECTS, ...(extraCandidates?.subjects || [])])
  );
  const nameList = extraCandidates?.names || [];
  const cityList = extraCandidates?.cities || [];

  // If the query already matches exactly one of the candidates, no typo suggestion is needed
  const exactMatchExists =
    subjectList.some((s) => s.toLowerCase() === normalizedQuery) ||
    nameList.some((n) => n.toLowerCase() === normalizedQuery) ||
    cityList.some((c) => c.toLowerCase() === normalizedQuery);

  if (exactMatchExists) {
    return null;
  }

  // Check single-word or entire phrase against candidates
  let bestCandidate = "";
  let bestType: SpellingSuggestionResult["targetType"] = "subject";
  let highestSimilarity = 0;
  let minDistance = 999;

  const evaluateCandidate = (
    candidate: string,
    type: SpellingSuggestionResult["targetType"]
  ) => {
    const candidateLower = candidate.toLowerCase();
    // Do not suggest if it is already identical
    if (candidateLower === normalizedQuery) return;

    // Check full candidate match
    const dist = damerauLevenshteinDistance(normalizedQuery, candidateLower);
    const maxLen = Math.max(normalizedQuery.length, candidateLower.length);
    const sim = 1 - dist / maxLen;

    // Allow flexible matching:
    // For 3-4 chars: max dist 1, sim >= 0.65
    // For 5-7 chars (e.g. "boilgy" -> "biology"): max dist 2, sim >= 0.65
    // For 8+ chars: max dist 3, sim >= 0.65
    let maxAllowedDist = 1;
    if (normalizedQuery.length >= 8) maxAllowedDist = 3;
    else if (normalizedQuery.length >= 5) maxAllowedDist = 2;

    if (dist <= maxAllowedDist && sim >= 0.65) {
      if (sim > highestSimilarity || (sim === highestSimilarity && dist < minDistance)) {
        highestSimilarity = sim;
        minDistance = dist;
        bestCandidate = candidate;
        bestType = type;
      }
    }

    // Also check individual words inside multi-word candidate (e.g. "Coding / Computer Science" -> "Computer")
    const words = candidateLower.split(/[\s/&,()-]+/).filter((w) => w.length >= 3);
    for (const word of words) {
      const wordDist = damerauLevenshteinDistance(normalizedQuery, word);
      const wordMaxLen = Math.max(normalizedQuery.length, word.length);
      const wordSim = 1 - wordDist / wordMaxLen;

      let wordMaxAllowed = 1;
      if (normalizedQuery.length >= 8) wordMaxAllowed = 3;
      else if (normalizedQuery.length >= 5) wordMaxAllowed = 2;

      if (wordDist <= wordMaxAllowed && wordSim >= 0.65) {
        if (wordSim > highestSimilarity) {
          highestSimilarity = wordSim;
          minDistance = wordDist;
          bestCandidate = candidate;
          bestType = type;
        }
      }
    }
  };

  // Evaluate all subjects first (highest priority)
  for (const s of subjectList) {
    evaluateCandidate(s, "subject");
  }

  // Then evaluate names and cities if no very strong subject match
  if (highestSimilarity < 0.85) {
    for (const c of cityList) {
      evaluateCandidate(c, "city");
    }
    for (const n of nameList) {
      evaluateCandidate(n, "name");
    }
  }

  if (bestCandidate && highestSimilarity >= 0.65) {
    return {
      hasSuggestion: true,
      originalQuery: cleanQuery,
      suggestedWord: bestCandidate,
      correctedText: bestCandidate,
      targetType: bestType,
      displayMessage: `Are you searching for ${bestCandidate}?`,
      confidence: highestSimilarity
    };
  }

  // Check multi-word query (e.g. "boilgy tutor" or "grade 10 boilgy")
  const tokens = cleanQuery.split(/\s+/);
  if (tokens.length > 1) {
    let replacedAny = false;
    const correctedTokens = [...tokens];
    let matchedWord = "";

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.length < 3) continue;

      // Check abbreviations first
      const tokenLower = token.toLowerCase();
      if (SUBJECT_ABBREVIATIONS[tokenLower]) {
        const suggestion = SUBJECT_ABBREVIATIONS[tokenLower];
        correctedTokens[i] = suggestion;
        matchedWord = suggestion;
        replacedAny = true;
        break;
      }

      // Check token against subjects
      let bestTokenCandidate = "";
      let bestTokenSim = 0;

      for (const s of subjectList) {
        const sLower = s.toLowerCase();
        const dist = damerauLevenshteinDistance(tokenLower, sLower);
        const maxLen = Math.max(tokenLower.length, sLower.length);
        const sim = 1 - dist / maxLen;

        let maxAllowed = 1;
        if (tokenLower.length >= 8) maxAllowed = 3;
        else if (tokenLower.length >= 5) maxAllowed = 2;

        if (dist <= maxAllowed && sim >= 0.65 && sim > bestTokenSim) {
          bestTokenSim = sim;
          bestTokenCandidate = s;
        }
      }

      if (bestTokenCandidate) {
        correctedTokens[i] = bestTokenCandidate;
        matchedWord = bestTokenCandidate;
        replacedAny = true;
        break;
      }
    }

    if (replacedAny) {
      const correctedText = correctedTokens.join(" ");
      return {
        hasSuggestion: true,
        originalQuery: cleanQuery,
        suggestedWord: matchedWord,
        correctedText,
        targetType: "subject",
        displayMessage: `Are you searching for ${matchedWord}?`,
        confidence: 0.8
      };
    }
  }

  return null;
}
