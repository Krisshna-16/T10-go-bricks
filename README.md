# GO-BRICS Social Media Analytics Dashboard

A premium, data-dense, and highly responsive analytics tracking dashboard developed for the **GO-BRICS Business Lab** team to monitor and analyze social media performance across **Instagram**, **LinkedIn**, and **Facebook**.

---

## 🎨 Design System

- **Background Color**: `#0A0A0A` (Deep Black)
- **Card Color**: `#1A1A1A` (Dark Charcoal)
- **Accent Color**: `#00FF41` (Matrix Green)
- **Typography**: Inter (imported dynamically via Google Fonts)

---

## 🚀 Key Features

### 1. Tabbed Navigation & Dynamic Stats
- **Overview (Tab 1)**: Holds high-level KPIs (Reach, Engagement, Follower Growth, Best Post) showing percentage comparison changes vs the preceding period.
- **Platform Breakdown (Tab 2)**: Platform cards detailing followers, post counts, total reach, and avg engagement rate, backed by custom sparklines and horizontal post type distributions.
- **Weekly Data Table (Tab 3)**: A searchable sheet of all logs with platform and type dropdown filters, multi-column sorting, row highlighting when reach exceeds 500, and a CSV exporter.

### 2. Interactive Charts (via Recharts)
- **Reach Over Time**: Line chart with custom tooltips and checkboxes to overlay/hide platform series.
- **Platform Comparison**: Grouped bar chart comparing Reach, Engagement, and Followers side-by-side. Supports scale normalization to prevent reach metrics from dwarfing follower changes.

### 3. Native Data Portability
- **Export Report**: Tab 1 downloads a summarized performance matrix for each platform over the selected range.
- **Table CSV Exporter**: Tab 3 downloads a CSV file representing the exact filtered/sorted data displayed in the view.

---

## 📂 Project Structure

```
go-brics-social-analytics/
├── index.html                  # Core HTML rendering and font links
├── package.json                # Project configurations & dependencies
├── vite.config.js              # Vite bundler config with Tailwind plugin
└── src/
    ├── index.css               # Base Tailwind CSS styles and animations
    ├── main.jsx                # App mounter
    ├── App.jsx                 # Dashboard core React logic and tabs
    └── data.js                 # 35 days of social media records
```

---

## 🛠️ Getting Started

To run the application locally, follow these steps:

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```

### 3. Build for Production
```bash
npm run build
```

---

## 📅 Updating Data Weekly

The dashboard is designed to be easily updated weekly without requiring database configuration. To add a new week of social media logs:

1. Open `src/data.js`.
2. Scroll to the bottom of the `sampleData` array.
3. Append your new week's entries following this format:
```javascript
{
  date: "2026-06-07",
  platform: "Instagram", // "Instagram" | "LinkedIn" | "Facebook"
  postType: "Reel",      // "Reel" | "Carousel" | "Static" | "Story" | "Article"
  reach: 1250,
  likes: 85,
  comments: 14,
  shares: 19,
  followerChange: 4,
  notes: "Summary of new wellness product launch"
}
```
4. Save the file. The dashboard will automatically recalculate the date limits, metrics, sparklines, and charts to reflect the new data!
