import { describe, it, expect } from "vitest";
import {
  getSpellingSuggestion,
  damerauLevenshteinDistance,
  calculateSimilarity
} from "../utils/spellingSuggestion";

describe("Spelling Suggestion Utility", () => {
  it("calculates correct Damerau-Levenshtein distance for transpositions", () => {
    // "boilgy" has 'o' and 'i' transposed (1) and missing second 'o' (1) -> distance 2
    expect(damerauLevenshteinDistance("boilgy", "biology")).toBe(2);
    expect(damerauLevenshteinDistance("chemsitry", "chemistry")).toBe(1);
    expect(damerauLevenshteinDistance("phyics", "physics")).toBe(1);
  });

  it("suggests Biology when user types 'boilgy'", () => {
    const result = getSpellingSuggestion("boilgy");
    expect(result).not.toBeNull();
    expect(result?.suggestedWord).toBe("Biology");
    expect(result?.displayMessage).toBe("Are you searching for Biology?");
  });

  it("suggests Biology for other common misspellings", () => {
    const r1 = getSpellingSuggestion("biolgy");
    expect(r1?.suggestedWord).toBe("Biology");

    const r2 = getSpellingSuggestion("boilogy");
    expect(r2?.suggestedWord).toBe("Biology");

    const r3 = getSpellingSuggestion("biolagy");
    expect(r3?.suggestedWord).toBe("Biology");
  });

  it("suggests Mathematics when user types 'mathemetics' or 'maths'", () => {
    const r1 = getSpellingSuggestion("mathemetics");
    expect(r1?.suggestedWord).toBe("Mathematics");

    const r2 = getSpellingSuggestion("maths");
    expect(r2?.suggestedWord).toBe("Mathematics");

    const r3 = getSpellingSuggestion("math");
    expect(r3?.suggestedWord).toBe("Mathematics");
  });

  it("suggests Physics when user types 'phyics' or 'phsyics'", () => {
    const r1 = getSpellingSuggestion("phyics");
    expect(r1?.suggestedWord).toBe("Physics");

    const r2 = getSpellingSuggestion("phsyics");
    expect(r2?.suggestedWord).toBe("Physics");
  });

  it("suggests Chemistry when user types 'chemsitry' or 'chemestry'", () => {
    const r1 = getSpellingSuggestion("chemsitry");
    expect(r1?.suggestedWord).toBe("Chemistry");

    const r2 = getSpellingSuggestion("chemestry");
    expect(r2?.suggestedWord).toBe("Chemistry");
  });

  it("handles multi-word queries with typo like 'boilgy tutor'", () => {
    const result = getSpellingSuggestion("boilgy tutor");
    expect(result).not.toBeNull();
    expect(result?.suggestedWord).toBe("Biology");
    expect(result?.correctedText).toBe("Biology tutor");
  });

  it("returns null for exact match", () => {
    const result = getSpellingSuggestion("Biology");
    expect(result).toBeNull();
  });

  it("returns null for gibberish with no close match", () => {
    const result = getSpellingSuggestion("xyz999qwerty");
    expect(result).toBeNull();
  });
});
