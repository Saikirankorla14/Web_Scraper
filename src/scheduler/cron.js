require("dotenv").config();
const cron = require("node-cron");
const { scrapeMultiple } = require("../scraper/scraper");
const { analyzeMultiple } = require("../analyzer/analyzer");
const { generateReport } = require("../report/reportGenerator");
const { sendReportEmail, sendErrorAlert } = require("../mailer/mailer");
const logger = require("../utils/logger");

// ─── URLs TO SCRAPE ───────────────────────────────────────────────────
// Add or remove URLs here as needed
const URLS_TO_SCRAPE = [
  "https://news.ycombinator.com",
  "https://dev.to",
  "https://techcrunch.com",
];

/**
 * Main scrape job — runs the full pipeline:
 * Scrape → Analyze → Generate PDF → Send Email
 */
async function runScrapingJob() {
  logger.info("🚀 Starting scheduled scraping job...");
  const startTime = Date.now();

  try {
    // Step 1: Scrape all URLs
    logger.info(`🌐 Scraping ${URLS_TO_SCRAPE.length} URLs...`);
    const scrapedResults = await scrapeMultiple(URLS_TO_SCRAPE, {
      concurrency: 2,
    });

    const successCount = scrapedResults.filter((r) => r.success).length;
    logger.info(
      `✅ Scraped ${successCount}/${URLS_TO_SCRAPE.length} pages successfully`,
    );

    if (successCount === 0) {
      throw new Error("All scraping attempts failed");
    }

    // Step 2: Analyze with Groq AI
    logger.info("🤖 Running AI analysis...");
    const { analyses, overallSummary } = await analyzeMultiple(scrapedResults);

    // Step 3: Generate PDF report
    logger.info("📄 Generating PDF report...");
    const { filePath, fileName } = await generateReport(
      scrapedResults,
      analyses,
      overallSummary,
    );

    // Step 4: Send email with report
    logger.info("📧 Sending report email...");
    await sendReportEmail(filePath, overallSummary, successCount);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.info(`🏁 Job complete in ${duration}s — Report: ${fileName}`);

    return { success: true, fileName, duration };
  } catch (error) {
    logger.error(`❌ Scraping job failed: ${error.message}`);
    await sendErrorAlert(error.message, URLS_TO_SCRAPE);
    return { success: false, error: error.message };
  }
}

/**
 * Starts the cron scheduler
 */
function startScheduler() {
  const schedule = process.env.SCRAPE_SCHEDULE || "0 9 * * *";

  if (!cron.validate(schedule)) {
    logger.error(`❌ Invalid cron schedule: "${schedule}"`);
    process.exit(1);
  }

  logger.info(`⏰ Scheduler started — runs on: "${schedule}"`);
  logger.info(`📋 Watching ${URLS_TO_SCRAPE.length} URLs`);

  cron.schedule(schedule, async () => {
    logger.info("⏰ Cron triggered — running job...");
    await runScrapingJob();
  });
}

module.exports = { startScheduler, runScrapingJob, URLS_TO_SCRAPE };
