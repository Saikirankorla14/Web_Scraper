# 🕷️ AI Web Scraper & Analyst

An intelligent web scraper that automatically scrapes websites, analyzes content using **Groq AI**, generates **PDF reports**, and sends **email alerts** — all on a schedule.

## 🚀 Features

- ✅ Scrape any website using **Playwright**
- ✅ AI-powered analysis using **Groq (LLaMA3)**
- ✅ Auto-generate **PDF reports**
- ✅ **Email alerts** with report attachments
- ✅ **Scheduled scraping** with cron jobs
- ✅ REST API with **Express**
- ✅ Structured logging with **Winston**

## 🛠️ Tech Stack

| Tool       | Purpose                       |
| ---------- | ----------------------------- |
| Playwright | Browser automation & scraping |
| Groq SDK   | AI content analysis (LLaMA3)  |
| PDFKit     | PDF report generation         |
| Nodemailer | Email alerts                  |
| node-cron  | Scheduled scraping            |
| Express    | REST API server               |
| Winston    | Logging                       |

## ⚙️ Setup

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/ai-web-scraper.git
cd ai-web-scraper
```

### 2. Install dependencies

```bash
npm install
npx playwright install chromium
```

### 3. Configure environment

```bash
cp .env.example .env
# Fill in your GROQ_API_KEY and email settings
```

### 4. Run

```bash
# Start the API server
npm start

# Run a one-time scrape
npm run scrape

# Start the scheduler
npm run schedule
```

## 📡 API Endpoints

| Method | Endpoint           | Description       |
| ------ | ------------------ | ----------------- |
| POST   | `/api/scrape`      | Scrape a URL now  |
| GET    | `/api/reports`     | List all reports  |
| GET    | `/api/reports/:id` | Download a report |

## 📁 Project Structure

```
ai-web-scraper/
├── src/
│   ├── scraper/       ← Playwright scraping
│   ├── analyzer/      ← Groq AI analysis
│   ├── report/        ← PDF generation
│   ├── mailer/        ← Email alerts
│   ├── scheduler/     ← Cron jobs
│   └── utils/         ← Logger, helpers
├── reports/           ← Generated PDFs
├── logs/              ← App logs
└── .env.example
```

## 🔑 Environment Variables

| Variable          | Description                             |
| ----------------- | --------------------------------------- |
| `GROQ_API_KEY`    | Your Groq API key                       |
| `GROQ_MODEL`      | Model to use (default: llama3-70b-8192) |
| `EMAIL_USER`      | Gmail address for sending alerts and get mails for reports generated      |
| `EMAIL_PASS`      | Gmail app password                      |
| `EMAIL_TO`        | Recipient email                         |
| `SCRAPE_SCHEDULE` | Cron schedule (default: daily at 9am)   |

## 📄 License

MIT
