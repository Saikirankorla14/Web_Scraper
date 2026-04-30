require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const {
  startScheduler,
  runScrapingJob,
  URLS_TO_SCRAPE,
} = require("./scheduler/cron");
const { verifyEmailConnection } = require("./mailer/mailer");
const logger = require("./utils/logger");

const app = express();
const PORT = process.env.PORT || 3000;
const REPORTS_DIR = path.join(__dirname, "../reports");

app.use(express.json());

// ─── ROUTES ──────────────────────────────────────────────────────────

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "running",
    app: "AI Web Scraper & Analyst",
    version: "1.0.0",
    endpoints: [
      "GET  /",
      "GET  /api/status",
      "POST /api/scrape",
      "GET  /api/reports",
      "GET  /api/reports/:filename",
    ],
  });
});

// Status check
app.get("/api/status", (req, res) => {
  const reports = fs.existsSync(REPORTS_DIR)
    ? fs.readdirSync(REPORTS_DIR).filter((f) => f.endsWith(".pdf"))
    : [];

  res.json({
    status: "ok",
    schedule: process.env.SCRAPE_SCHEDULE || "0 9 * * *",
    urlsWatching: URLS_TO_SCRAPE,
    totalReports: reports.length,
    lastReport: reports.sort().pop() || "none",
  });
});

// Trigger a scrape manually
app.post("/api/scrape", async (req, res) => {
  const { urls } = req.body;

  // Allow custom URLs or fall back to defaults
  if (urls && Array.isArray(urls)) {
    logger.info(`📡 Manual scrape triggered for ${urls.length} custom URLs`);
    URLS_TO_SCRAPE.length = 0;
    URLS_TO_SCRAPE.push(...urls);
  } else {
    logger.info(`📡 Manual scrape triggered for default URLs`);
  }

  res.json({ message: "Scraping job started", urls: URLS_TO_SCRAPE });

  // Run in background so response returns immediately
  runScrapingJob().then((result) => {
    logger.info(`Job result: ${JSON.stringify(result)}`);
  });
});

// List all generated reports
app.get("/api/reports", (req, res) => {
  if (!fs.existsSync(REPORTS_DIR)) {
    return res.json({ reports: [] });
  }

  const reports = fs
    .readdirSync(REPORTS_DIR)
    .filter((f) => f.endsWith(".pdf"))
    .map((f) => {
      const stats = fs.statSync(path.join(REPORTS_DIR, f));
      return {
        filename: f,
        size: `${(stats.size / 1024).toFixed(1)} KB`,
        createdAt: stats.birthtime,
        downloadUrl: `/api/reports/${f}`,
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ total: reports.length, reports });
});

// Download a specific report
app.get("/api/reports/:filename", (req, res) => {
  const filePath = path.join(REPORTS_DIR, req.params.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Report not found" });
  }

  res.download(filePath);
});

// ─── START SERVER ─────────────────────────────────────────────────────
async function start() {
  logger.info("🔧 Starting AI Web Scraper & Analyst...");

  // Verify email on startup
  await verifyEmailConnection();

  // Start cron scheduler
  startScheduler();

  // Start Express server
  app.listen(PORT, () => {
    logger.info(`🚀 Server running at http://localhost:${PORT}`);
    logger.info(
      `📡 POST http://localhost:${PORT}/api/scrape to trigger manually`,
    );
    logger.info(`📄 GET  http://localhost:${PORT}/api/reports to list reports`);
  });
}

start();
