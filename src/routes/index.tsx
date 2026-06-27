import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { analyzeText, highlightText, CATEGORY_LABELS, type CategoryKey, type AnalysisResult, type RiskLevel } from "@/lib/analyzer";
import { fetchArticle } from "@/server/article.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "TruthLens — Fake News Keyword Checker" },
      { name: "description", content: "Paste any news text and get an instant trust score based on misinformation signals like sensationalism, clickbait, and conspiracy language." },
    ],
  }),
});

const SAMPLE = `BREAKING: Shocking truth they don't want you to know! Anonymous sources say a bombshell report will be released immediately. You won't believe what happens next — this is going viral! Doctors hate this one weird trick. Share before it's deleted!`;

const CATEGORY_COLORS: Record<CategoryKey, string> = {
  sensational: "bg-destructive/25 text-destructive-foreground border-destructive/40",
  clickbait: "bg-warning/25 text-warning border-warning/40",
  urgency: "bg-destructive/20 text-destructive border-destructive/40",
  conspiracy: "bg-destructive/30 text-destructive border-destructive/50",
  unverified: "bg-accent/20 text-accent border-accent/40",
  emotional: "bg-warning/20 text-warning border-warning/40",
};

function Index() {
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchedTitle, setFetchedTitle] = useState<string | null>(null);

  const handleCheck = () => {
    if (!text.trim()) return;
    setResult(analyzeText(text));
  };

  const handleFetchUrl = async () => {
    if (!url.trim()) return;
    setFetching(true);
    setFetchError(null);
    setFetchedTitle(null);
    setResult(null);
    try {
      const res = await fetchArticle({ data: { url: url.trim() } });
      if (!res.success) {
        setFetchError(res.error);
      } else {
        setText(res.text);
        setFetchedTitle(res.title || null);
        setResult(analyzeText(res.text));
      }
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Failed to fetch URL");
    } finally {
      setFetching(false);
    }
  };

  const highlighted = useMemo(
    () => (result ? highlightText(text, result.matches) : []),
    [result, text]
  );

  return (
    <main className="min-h-screen px-6 py-12 md:py-20 max-w-5xl mx-auto">
      <header className="mb-12 md:mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/50 text-xs font-mono uppercase tracking-widest text-muted-foreground mb-6">
          <span className="size-2 rounded-full bg-primary animate-pulse" />
          Misinformation Detector
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[0.95] mb-4">
          Spot the{" "}
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-hero)" }}>
            fake news
          </span>{" "}
          before you share.
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
          Paste any article, headline, or social post. We'll scan for manipulative language, conspiracy phrasing, and clickbait signals — then give you a trust score.
        </p>
      </header>

      <section className="bg-card/60 backdrop-blur border border-border rounded-2xl p-6 md:p-8 mb-6">
        <label htmlFor="url-input" className="block text-sm font-mono uppercase tracking-wider text-muted-foreground mb-3">
          Article URL <span className="text-muted-foreground/60 normal-case">(optional)</span>
        </label>
        <form
          onSubmit={(e) => { e.preventDefault(); handleFetchUrl(); }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            id="url-input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/news-article"
            className="flex-1 bg-input/60 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
            disabled={fetching}
          />
          <Button
            type="submit"
            variant="outline"
            size="lg"
            disabled={!url.trim() || fetching}
            className="font-semibold whitespace-nowrap"
          >
            {fetching ? "Fetching…" : "Fetch & Analyze"}
          </Button>
        </form>
        {fetchError && (
          <div className="mt-3 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
            {fetchError}
          </div>
        )}
        {fetchedTitle && !fetchError && (
          <div className="mt-3 text-sm text-muted-foreground">
            Fetched: <span className="text-foreground font-medium">{fetchedTitle}</span>
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          We'll fetch the page text server-side and run the same analysis. Some sites block scrapers — if that happens, just paste the text below.
        </p>
      </section>

      <section className="bg-card/60 backdrop-blur border border-border rounded-2xl p-6 md:p-8 mb-8">
        <label className="block text-sm font-mono uppercase tracking-wider text-muted-foreground mb-3">
          News text
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste a news article, headline, or social media post here..."
          className="w-full min-h-[200px] bg-input/60 border border-border rounded-xl p-4 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring resize-y font-mono text-sm leading-relaxed"
        />
        <div className="flex flex-wrap gap-3 mt-4 items-center justify-between">
          <div className="flex gap-2">
            <Button onClick={handleCheck} disabled={!text.trim()} size="lg" className="font-semibold">
              Analyze →
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => { setText(SAMPLE); setResult(null); }}
            >
              Try sample
            </Button>
            {(text || result || url) && (
              <Button variant="ghost" size="lg" onClick={() => { setText(""); setResult(null); setUrl(""); setFetchError(null); setFetchedTitle(null); }}>
                Clear
              </Button>
            )}
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {text.trim().split(/\s+/).filter(Boolean).length} words
          </span>
        </div>
      </section>

      {result && (
        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ScoreCard result={result} />
          <ReasonsPanel result={result} />
          <CategoryBreakdown result={result} />
          <HighlightedView parts={highlighted} hasMatches={result.matches.length > 0} />
          <GuidancePanel level={result.riskLevel} />
        </section>
      )}

      {!result && (
        <section className="grid sm:grid-cols-3 gap-4 mt-12">
          {[
            { n: "01", t: "Paste text", d: "Drop in any news article or post" },
            { n: "02", t: "Instant scan", d: "We check 80+ red-flag keywords" },
            { n: "03", t: "Trust score", d: "0–100 with clear breakdown" },
          ].map((s) => (
            <div key={s.n} className="border border-border rounded-xl p-5 bg-card/40">
              <div className="font-mono text-xs text-primary mb-2">{s.n}</div>
              <div className="font-semibold mb-1">{s.t}</div>
              <div className="text-sm text-muted-foreground">{s.d}</div>
            </div>
          ))}
        </section>
      )}

      <footer className="mt-20 pt-8 border-t border-border text-xs text-muted-foreground font-mono">
        Heuristic tool — not a substitute for fact-checking. Always verify with trusted sources.
      </footer>
    </main>
  );
}

function ScoreCard({ result }: { result: AnalysisResult }) {
  const { trustScore, verdict, riskLevel } = result;
  const verdictMeta = {
    "trustworthy": { label: "Looks Trustworthy", color: "var(--success)", grad: "var(--gradient-safe)" },
    "questionable": { label: "Use Caution", color: "var(--warning)", grad: "linear-gradient(135deg, var(--warning), var(--accent))" },
    "suspicious": { label: "Suspicious", color: "var(--destructive)", grad: "var(--gradient-danger)" },
    "highly-suspicious": { label: "Highly Suspicious", color: "var(--destructive)", grad: "var(--gradient-danger)" },
  }[verdict];
  const riskMeta = {
    low: { dot: "bg-success", text: "text-success", label: "🟢 Low Risk" },
    medium: { dot: "bg-warning", text: "text-warning", label: "🟡 Medium Risk" },
    high: { dot: "bg-destructive", text: "text-destructive", label: "🔴 High Risk" },
  }[riskLevel];

  return (
    <div
      className="rounded-2xl p-8 md:p-10 border border-border relative overflow-hidden"
      style={{ background: "var(--card)", boxShadow: "var(--shadow-glow)" }}
    >
      <div className="absolute inset-0 opacity-10" style={{ background: verdictMeta.grad }} />
      <div className="relative grid md:grid-cols-[auto_1fr] gap-8 items-center">
        <div className="flex items-center justify-center">
          <div className="relative size-40">
            <svg viewBox="0 0 100 100" className="size-full -rotate-90">
              <circle cx="50" cy="50" r="44" fill="none" stroke="var(--secondary)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="44" fill="none"
                stroke={verdictMeta.color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(trustScore / 100) * 276.46} 276.46`}
                style={{ transition: "stroke-dasharray 1s ease-out" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-5xl font-bold tabular-nums">{trustScore}</div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Trust score</div>
            </div>
          </div>
        </div>
        <div>
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border border-current/30 ${riskMeta.text} text-xs font-mono uppercase tracking-widest mb-3`}>
            <span className={`size-2 rounded-full ${riskMeta.dot}`} />
            {riskMeta.label}
          </div>
          <div className="text-3xl md:text-4xl font-bold mb-3" style={{ color: verdictMeta.color }}>
            {verdictMeta.label}
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Stat label="Words" value={result.wordCount} />
            <Stat label="Red flags" value={result.matches.reduce((s, m) => s + m.count, 0)} />
            <Stat label="ALL CAPS" value={result.allCapsWords} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border rounded-lg p-3 bg-background/40">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function CategoryBreakdown({ result }: { result: AnalysisResult }) {
  const cats = (Object.keys(result.categoryCounts) as CategoryKey[])
    .filter((c) => result.categoryCounts[c] > 0);

  if (!cats.length) {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/5 p-6 text-center">
        <div className="text-success font-semibold mb-1">No suspicious keywords detected</div>
        <div className="text-sm text-muted-foreground">The text avoids common misinformation signals.</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-6">
      <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground mb-4">Detected signals</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {cats.map((c) => {
          const kws = result.matches.filter((m) => m.category === c);
          return (
            <div key={c} className={`border rounded-xl p-4 ${CATEGORY_COLORS[c]}`}>
              <div className="flex items-baseline justify-between mb-2">
                <div className="font-semibold">{CATEGORY_LABELS[c]}</div>
                <div className="font-mono text-sm">×{result.categoryCounts[c]}</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {kws.map((k) => (
                  <span key={k.keyword} className="text-xs px-2 py-0.5 rounded-full bg-background/40 border border-current/20">
                    {k.keyword}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HighlightedView({ parts, hasMatches }: { parts: Array<{ text: string; category?: CategoryKey }>; hasMatches: boolean }) {
  if (!hasMatches) return null;
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-6">
      <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground mb-4">Highlighted text</h2>
      <p className="leading-relaxed whitespace-pre-wrap">
        {parts.map((p, i) =>
          p.category ? (
            <mark key={i} className={`px-1 rounded ${CATEGORY_COLORS[p.category]} border`}>
              {p.text}
            </mark>
          ) : (
            <span key={i}>{p.text}</span>
          )
        )}
      </p>
    </div>
  );
}

function ReasonsPanel({ result }: { result: AnalysisResult }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-6">
      <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground mb-4">
        Why this score?
      </h2>
      <ul className="space-y-2.5">
        {result.reasons.map((r, i) => (
          <li key={i} className="flex gap-3 items-start text-sm leading-relaxed">
            <span className="mt-1.5 size-1.5 rounded-full bg-primary shrink-0" />
            <span>{r}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GuidancePanel({ level }: { level: RiskLevel }) {
  const tips = {
    low: [
      "Still cross-check with at least one trusted source before sharing.",
      "Look for a named author and a date — anonymous posts deserve extra caution.",
    ],
    medium: [
      "Pause. Search the headline on a trusted news site before forwarding.",
      "Check who wrote it and when — old stories often resurface as 'breaking'.",
      "Reverse-image-search any attached photos.",
    ],
    high: [
      "Do not forward this message yet.",
      "Search a key phrase on Google News, Snopes, or your country's fact-check sites.",
      "Be skeptical of urgent calls to action ('share now', 'before it's deleted').",
    ],
  }[level];

  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/5 p-6">
      <h2 className="text-sm font-mono uppercase tracking-widest text-accent mb-4">
        What to do next
      </h2>
      <ul className="space-y-2.5 mb-5">
        {tips.map((t, i) => (
          <li key={i} className="flex gap-3 items-start text-sm leading-relaxed">
            <span className="font-mono text-accent shrink-0">→</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
      <div className="text-xs text-muted-foreground border-t border-border pt-4 leading-relaxed">
        <strong className="text-foreground">Honest limitation:</strong> This is a suspicion indicator, not a fact-checker. It detects writing patterns common in misleading content — it cannot confirm whether claims are true or false. Real verification still requires trusted sources.
      </div>
    </div>
  );
}
