import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  url: z.string().trim().url({ message: "Please enter a valid URL" }).max(2000),
});

function extractText(html: string): { title: string; text: string } {
  // Strip script/style/noscript blocks
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  const titleMatch = cleaned.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeEntities(titleMatch[1]).trim() : "";

  // Prefer <article> if present
  const articleMatch = cleaned.match(/<article[\s\S]*?<\/article>/i);
  if (articleMatch) cleaned = articleMatch[0];

  // Remove remaining tags
  const text = decodeEntities(cleaned.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

  return { title, text };
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

export const fetchArticle = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const res = await fetch(data.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; TruthLensBot/1.0)",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });
      if (!res.ok) {
        return { success: false as const, error: `Site returned ${res.status} ${res.statusText}` };
      }
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("html") && !ct.includes("text")) {
        return { success: false as const, error: "URL did not return readable text content." };
      }
      const html = await res.text();
      const { title, text } = extractText(html);
      if (text.length < 80) {
        return {
          success: false as const,
          error: "Couldn't extract enough article text from this page.",
        };
      }
      const combined = title ? `${title}\n\n${text}` : text;
      return { success: true as const, text: combined.slice(0, 20000), title };
    } catch (e) {
      return {
        success: false as const,
        error: e instanceof Error ? e.message : "Failed to fetch URL",
      };
    }
  });
