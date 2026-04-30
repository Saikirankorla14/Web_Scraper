require("dotenv").config();
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Sends the PDF report as an email attachment
 */
async function sendReportEmail(reportPath, overallSummary, totalPages) {
  try {
    logger.info(`📧 Sending report email to ${process.env.EMAIL_TO}...`);

    const fileName = path.basename(reportPath);
    const date = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const avgContent = overallSummary?.averageContentScore ?? "N/A";
    const avgSeo = overallSummary?.averageSeoScore ?? "N/A";
    const sentiment = overallSummary?.overallSentiment ?? "N/A";
    const issues = (overallSummary?.criticalIssues || [])
      .map((i) => `<li>${i}</li>`)
      .join("");
    const recs = (overallSummary?.strategicRecommendations || [])
      .map((r) => `<li>${r}</li>`)
      .join("");

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #2d3748; background: #f7fafc; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .header { background: #1a1a2e; color: #fff; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; }
    .header p { margin: 5px 0 0; color: #a0aec0; font-size: 13px; }
    .body { padding: 30px; }
    .scores { display: flex; gap: 12px; margin: 20px 0; }
    .score-box { flex: 1; background: #edf2f7; border-radius: 8px; padding: 14px; text-align: center; }
    .score-box .value { font-size: 22px; font-weight: bold; color: #1a1a2e; }
    .score-box .label { font-size: 11px; color: #718096; margin-top: 4px; }
    .section { margin: 20px 0; }
    .section h3 { font-size: 14px; color: #2b6cb0; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    .section ul { padding-left: 18px; margin: 8px 0; }
    .section li { font-size: 13px; margin-bottom: 4px; color: #4a5568; }
    .footer { background: #edf2f7; padding: 16px 30px; text-align: center; font-size: 11px; color: #a0aec0; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; }
    .positive { background: #c6f6d5; color: #276749; }
    .neutral { background: #fefcbf; color: #744210; }
    .negative { background: #fed7d7; color: #822727; }
    .mixed { background: #e9d8fd; color: #553c9a; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🕷️ AI Web Scraper Report</h1>
      <p>${date}</p>
    </div>
    <div class="body">
      <p>Your scheduled scrape has completed. <strong>${totalPages} page(s)</strong> were analyzed. Here's your summary:</p>

      <div class="scores">
        <div class="score-box">
          <div class="value">${totalPages}</div>
          <div class="label">Pages Analyzed</div>
        </div>
        <div class="score-box">
          <div class="value">${avgContent}/10</div>
          <div class="label">Avg Content Score</div>
        </div>
        <div class="score-box">
          <div class="value">${avgSeo}/10</div>
          <div class="label">Avg SEO Score</div>
        </div>
        <div class="score-box">
          <span class="badge ${sentiment}">
            ${sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
          </span>
          <div class="label">Sentiment</div>
        </div>
      </div>

      ${
        overallSummary?.executiveSummary
          ? `<div class="section">
              <h3>📋 Executive Summary</h3>
              <p style="font-size:13px; color:#4a5568;">${overallSummary.executiveSummary}</p>
            </div>`
          : ""
      }

      ${
        issues
          ? `<div class="section">
              <h3>⚠️ Critical Issues</h3>
              <ul>${issues}</ul>
            </div>`
          : ""
      }

      ${
        recs
          ? `<div class="section">
              <h3>✅ Recommendations</h3>
              <ul>${recs}</ul>
            </div>`
          : ""
      }

      <p style="font-size:13px; color:#718096;">The full PDF report is attached to this email.</p>
    </div>
    <div class="footer">
      AI Web Scraper & Analyst — Powered by Groq + Playwright
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: `"AI Web Scraper" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_TO,
      subject: `📊 Web Scrape Report — ${date}`,
      html,
      attachments: [
        {
          filename: fileName,
          path: reportPath,
          contentType: "application/pdf",
        },
      ],
    });

    logger.info(`✅ Report email sent to ${process.env.EMAIL_TO}`);
    return { success: true };
  } catch (error) {
    logger.error(`❌ Email failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Sends an alert email when scraping fails
 */
async function sendErrorAlert(errorMessage, urls) {
  try {
    logger.info(`🚨 Sending error alert email...`);

    await transporter.sendMail({
      from: `"AI Web Scraper" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_TO,
      subject: `🚨 Scraper Alert — Error Detected`,
      html: `
        <div style="font-family:Arial,sans-serif; max-width:500px; margin:auto; padding:30px;">
          <h2 style="color:#e53e3e;">🚨 Scraper Error Alert</h2>
          <p>An error occurred during the scheduled scraping job.</p>
          <p><strong>Error:</strong> ${errorMessage}</p>
          <p><strong>URLs attempted:</strong></p>
          <ul>${urls.map((u) => `<li>${u}</li>`).join("")}</ul>
          <p style="color:#718096; font-size:12px;">Please check your logs for more details.</p>
        </div>`,
    });

    logger.info(`✅ Error alert sent`);
    return { success: true };
  } catch (error) {
    logger.error(`❌ Error alert email failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Verifies email connection is working
 */
async function verifyEmailConnection() {
  try {
    await transporter.verify();
    logger.info(`✅ Email connection verified`);
    return true;
  } catch (error) {
    logger.error(`❌ Email connection failed: ${error.message}`);
    return false;
  }
}

module.exports = { sendReportEmail, sendErrorAlert, verifyEmailConnection };
