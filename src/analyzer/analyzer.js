require("dotenv").config();
const Groq = require("groq-sdk");
const logger = require("../utils/logger");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = process.env.GROQ_MODEL || "llama3-70b-8192";

/**
 * Analyzes scraped data from a single page using Groq AI
 */
async function analyzePage(scrapedData) {
  try {
    logger.info(`🤖 Analyzing: ${scrapedData.url}`);

    const prompt = `
You are an expert web content analyst. Analyze the following scraped webpage data and return a structured JSON report.

PAGE DATA:
- URL: ${scrapedData.url}
- Title: ${scrapedData.title}
- Meta Description: ${scrapedData.metaDescription || "N/A"}
- Word Count: ${scrapedData.wordCount}
- H1 Headings: ${scrapedData.headings.h1.join(" | ") || "None"}
- H2 Headings: ${scrapedData.headings.h2.slice(0, 5).join(" | ") || "None"}
- Sample Content: ${scrapedData.paragraphs.slice(0, 5).join(" ")}

Return ONLY a valid JSON object with this exact structure:
{
  "summary": "2-3 sentence summary of what this page is about",
  "mainTopics": ["topic1", "topic2", "topic3"],
  "sentiment": "positive | neutral | negative",
  "contentQuality": {
    "score": 1-10,
    "reason": "brief explanation"
  },
  "seoAnalysis": {
    "score": 1-10,
    "hasMetaDescription": true/false,
    "hasH1": true/false,
    "issues": ["issue1", "issue2"]
  },
  "keyInsights": ["insight1", "insight2", "insight3"],
  "recommendations": ["recommendation1", "recommendation2"],
  "targetAudience": "description of likely audience",
  "contentType": "blog | news | ecommerce | portfolio | documentation | other"
}`;

    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const raw = response.choices[0].message.content;

    // Parse JSON safely
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in Groq response");

    const analysis = JSON.parse(jsonMatch[0]);

    logger.info(
      `✅ Analysis done for ${scrapedData.url} — Score: ${analysis.contentQuality.score}/10`,
    );

    return { success: true, analysis, url: scrapedData.url };
  } catch (error) {
    logger.error(`❌ Analysis failed for ${scrapedData.url}: ${error.message}`);
    return { success: false, error: error.message, url: scrapedData.url };
  }
}

/**
 * Analyzes multiple scraped pages and returns a combined summary
 */
async function analyzeMultiple(scrapedResults) {
  const analyses = [];

  for (const result of scrapedResults) {
    if (!result.success) {
      logger.warn(`⚠️ Skipping failed scrape: ${result.url}`);
      continue;
    }
    const analysis = await analyzePage(result.data);
    analyses.push(analysis);
  }

  // Generate overall summary across all pages
  const overallSummary = await generateOverallSummary(analyses);

  return { analyses, overallSummary };
}

/**
 * Generates a high-level summary across all analyzed pages
 */
async function generateOverallSummary(analyses) {
  try {
    const successfulAnalyses = analyses.filter((a) => a.success);
    if (successfulAnalyses.length === 0) return null;

    logger.info(
      `📊 Generating overall summary for ${successfulAnalyses.length} pages...`,
    );

    const summaryData = successfulAnalyses.map((a) => ({
      url: a.url,
      summary: a.analysis.summary,
      sentiment: a.analysis.sentiment,
      contentScore: a.analysis.contentQuality.score,
      seoScore: a.analysis.seoAnalysis.score,
      topics: a.analysis.mainTopics,
    }));

    const prompt = `
You are a senior digital analyst. Based on analysis of ${successfulAnalyses.length} webpages, provide an executive summary.

PAGE ANALYSES:
${JSON.stringify(summaryData, null, 2)}

Return ONLY a valid JSON object:
{
  "executiveSummary": "3-4 sentence high-level overview",
  "totalPagesAnalyzed": ${successfulAnalyses.length},
  "averageContentScore": number,
  "averageSeoScore": number,
  "overallSentiment": "positive | neutral | negative | mixed",
  "commonTopics": ["topic1", "topic2", "topic3"],
  "topPerformingPage": "url of best scoring page",
  "criticalIssues": ["issue1", "issue2"],
  "strategicRecommendations": ["rec1", "rec2", "rec3"]
}`;

    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 800,
    });

    const raw = response.choices[0].message.content;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in overall summary response");

    const summary = JSON.parse(jsonMatch[0]);
    logger.info(`✅ Overall summary generated`);

    return summary;
  } catch (error) {
    logger.error(`❌ Overall summary failed: ${error.message}`);
    return null;
  }
}

module.exports = { analyzePage, analyzeMultiple, generateOverallSummary };
