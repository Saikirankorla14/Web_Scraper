const { chromium } = require("playwright");
const logger = require("../utils/logger");

/**
 * Scrapes a single URL and returns structured data
 */
async function scrapePage(url, options = {}) {
  const { timeout = 30000, waitFor = "networkidle" } = options;
  let browser = null;

  try {
    logger.info(`🌐 Scraping: ${url}`);

    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
    });

    const page = await context.newPage();

    // Block unnecessary resources for speed
    await page.route("**/*.{png,jpg,jpeg,gif,svg,font,woff,woff2}", (route) =>
      route.abort(),
    );

    await page.goto(url, { waitUntil: waitFor, timeout });

    // Extract page data
    const data = await page.evaluate(() => {
      const getText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.innerText.trim() : null;
      };

      const getAllText = (selector) =>
        Array.from(document.querySelectorAll(selector)).map((el) =>
          el.innerText.trim(),
        );

      return {
        title: document.title,
        url: window.location.href,
        metaDescription:
          document
            .querySelector('meta[name="description"]')
            ?.getAttribute("content") || null,
        headings: {
          h1: getAllText("h1"),
          h2: getAllText("h2"),
          h3: getAllText("h3"),
        },
        paragraphs: getAllText("p")
          .filter((p) => p.length > 50)
          .slice(0, 20),
        links: Array.from(document.querySelectorAll("a[href]"))
          .map((a) => ({ text: a.innerText.trim(), href: a.href }))
          .filter((l) => l.text && l.href.startsWith("http"))
          .slice(0, 30),
        images: Array.from(document.querySelectorAll("img[alt]"))
          .map((img) => ({ alt: img.alt, src: img.src }))
          .slice(0, 10),
        wordCount: document.body.innerText.split(/\s+/).length,
        scrapedAt: new Date().toISOString(),
      };
    });

    // Take screenshot
    const screenshot = await page.screenshot({
      type: "png",
      fullPage: false,
    });

    logger.info(`✅ Scraped ${url} — ${data.wordCount} words found`);

    return { success: true, data, screenshot };
  } catch (error) {
    logger.error(`❌ Failed to scrape ${url}: ${error.message}`);
    return { success: false, error: error.message, url };
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * Scrapes multiple URLs concurrently
 */
async function scrapeMultiple(urls, options = {}) {
  const { concurrency = 3 } = options;
  const results = [];

  // Process in batches
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    logger.info(`📦 Processing batch ${Math.floor(i / concurrency) + 1}`);

    const batchResults = await Promise.allSettled(
      batch.map((url) => scrapePage(url, options)),
    );

    batchResults.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        results.push({ success: false, error: result.reason, url: batch[idx] });
      }
    });
  }

  return results;
}

module.exports = { scrapePage, scrapeMultiple };
