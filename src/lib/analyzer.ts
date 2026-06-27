// Keyword lists for misinformation detection
export const SUSPICIOUS_KEYWORDS = {
  sensational: [
    "shocking",
    "you won't believe",
    "unbelievable",
    "mind-blowing",
    "jaw-dropping",
    "bombshell",
    "explosive",
    "stunning",
    "miracle",
    "secret",
    "they don't want you to know",
    "doctors hate",
    "one weird trick",
    "must see",
    "gone wrong",
    "exposed",
  ],
  clickbait: [
    "click here",
    "share before",
    "before it's deleted",
    "going viral",
    "everyone is talking",
    "what happens next",
    "number 7 will",
    "the truth about",
  ],
  urgency: [
    "urgent",
    "breaking",
    "act now",
    "last chance",
    "immediately",
    "right now",
    "warning",
    "alert",
    "emergency",
  ],
  conspiracy: [
    "they don't want",
    "cover up",
    "hidden truth",
    "mainstream media won't",
    "wake up",
    "sheeple",
    "deep state",
    "false flag",
    "plandemic",
    "hoax",
    "globalist",
    "new world order",
    "psyop",
  ],
  unverified: [
    "anonymous source",
    "sources say",
    "people are saying",
    "rumors",
    "allegedly",
    "reportedly",
    "some say",
    "many believe",
    "it is claimed",
  ],
  emotional: [
    "outrageous",
    "disgusting",
    "horrifying",
    "terrifying",
    "destroys",
    "annihilates",
    "obliterates",
    "devastating",
    "furious",
    "enraged",
  ],
};

export type CategoryKey = keyof typeof SUSPICIOUS_KEYWORDS;

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  sensational: "Sensationalism",
  clickbait: "Clickbait",
  urgency: "False Urgency",
  conspiracy: "Conspiracy Language",
  unverified: "Unverified Sources",
  emotional: "Emotional Manipulation",
};

export interface Match {
  keyword: string;
  category: CategoryKey;
  count: number;
}

export type RiskLevel = "low" | "medium" | "high";

export interface AnalysisResult {
  trustScore: number; // 0-100 (higher = more trustworthy)
  suspicionScore: number; // 0-100 (higher = more suspicious)
  riskLevel: RiskLevel;
  verdict: "trustworthy" | "questionable" | "suspicious" | "highly-suspicious";
  matches: Match[];
  wordCount: number;
  exclamations: number;
  allCapsWords: number;
  categoryCounts: Record<CategoryKey, number>;
  reasons: string[];
}

export function analyzeText(text: string): AnalysisResult {
  const lower = text.toLowerCase();
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const matches: Match[] = [];
  const categoryCounts = {
    sensational: 0,
    clickbait: 0,
    urgency: 0,
    conspiracy: 0,
    unverified: 0,
    emotional: 0,
  } as Record<CategoryKey, number>;

  (Object.keys(SUSPICIOUS_KEYWORDS) as CategoryKey[]).forEach((cat) => {
    SUSPICIOUS_KEYWORDS[cat].forEach((kw) => {
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
      const found = lower.match(regex);
      if (found) {
        matches.push({ keyword: kw, category: cat, count: found.length });
        categoryCounts[cat] += found.length;
      }
    });
  });

  const exclamations = (text.match(/!/g) || []).length;
  const repeatedPunct = (text.match(/[!?]{2,}/g) || []).length;
  const allCapsWords = words.filter(
    (w) => w.length >= 4 && w === w.toUpperCase() && /[A-Z]/.test(w),
  ).length;

  let score = 100;
  const totalMatches = matches.reduce((s, m) => s + m.count, 0);
  score -= Math.min(50, totalMatches * 5);
  score -= Math.min(15, exclamations * 2);
  score -= Math.min(10, repeatedPunct * 5);
  score -= Math.min(15, allCapsWords * 3);
  score -= Math.min(20, categoryCounts.conspiracy * 4);
  score = Math.max(0, Math.min(100, score));

  const suspicionScore = 100 - score;

  let riskLevel: RiskLevel = "low";
  if (suspicionScore >= 60) riskLevel = "high";
  else if (suspicionScore >= 30) riskLevel = "medium";

  let verdict: AnalysisResult["verdict"] = "trustworthy";
  if (score < 30) verdict = "highly-suspicious";
  else if (score < 55) verdict = "suspicious";
  else if (score < 80) verdict = "questionable";

  const reasons: string[] = [];
  (Object.keys(categoryCounts) as CategoryKey[]).forEach((c) => {
    if (categoryCounts[c] > 0) {
      reasons.push(
        `Uses ${CATEGORY_LABELS[c].toLowerCase()} language (${categoryCounts[c]} phrase${categoryCounts[c] > 1 ? "s" : ""}).`,
      );
    }
  });
  if (allCapsWords >= 2)
    reasons.push(`Contains ${allCapsWords} ALL-CAPS words — often used to shout for attention.`);
  if (repeatedPunct > 0)
    reasons.push(
      `Repeated punctuation like "!!!" or "???" appears ${repeatedPunct} time${repeatedPunct > 1 ? "s" : ""}.`,
    );
  if (exclamations >= 3 && repeatedPunct === 0)
    reasons.push(`High number of exclamation marks (${exclamations}) suggests emotional tone.`);
  if (reasons.length === 0)
    reasons.push("No common misinformation patterns detected. Still verify with trusted sources.");

  return {
    trustScore: score,
    suspicionScore,
    riskLevel,
    verdict,
    matches,
    wordCount,
    exclamations,
    allCapsWords,
    categoryCounts,
    reasons,
  };
}

export function highlightText(
  text: string,
  matches: Match[],
): Array<{ text: string; category?: CategoryKey }> {
  if (!matches.length) return [{ text }];
  const allKeywords = matches.map((m) => ({ kw: m.keyword, cat: m.category }));
  const pattern = new RegExp(
    `\\b(${allKeywords.map((k) => k.kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
    "gi",
  );
  const parts: Array<{ text: string; category?: CategoryKey }> = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > lastIndex) parts.push({ text: text.slice(lastIndex, m.index) });
    const found = allKeywords.find((k) => k.kw.toLowerCase() === m![0].toLowerCase());
    parts.push({ text: m[0], category: found?.cat });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) parts.push({ text: text.slice(lastIndex) });
  return parts;
}
