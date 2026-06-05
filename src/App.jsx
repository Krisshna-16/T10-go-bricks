import React, { useState, useMemo } from 'react';
import {
  LineChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { sampleData } from './data';

// Helper to format numbers with commas (e.g. 12,500)
const formatNumber = (num) => num.toLocaleString();

// Helper to format large numbers to K/M format (e.g. 8.5K)
const formatCompactNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toString();
};

// Deterministic date parser/formatter to avoid timezone offset bugs
const formatDateStr = (dateStr) => {
  if (!dateStr) return '';
  const [, month, day] = dateStr.split('-');
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${monthNames[parseInt(month) - 1]} ${day}`;
};

export default function App() {
  // --- TABS & FILTER STATES ---
  const [activeTab, setActiveTab] = useState("Overview"); // "Overview", "Platform Breakdown", "Weekly Data Table"
  const [dateRange, setDateRange] = useState("30"); // "7", "14", "30", "all"
  
  // Platform checkboxes for Overview Line Chart
  const [activeChartPlatforms, setActiveChartPlatforms] = useState({
    Instagram: true,
    LinkedIn: true,
    Facebook: true
  });

  // Table filter and sort states
  const [tablePlatformFilter, setTablePlatformFilter] = useState("All");
  const [tablePostTypeFilter, setTablePostTypeFilter] = useState("All");
  const [sortField, setSortField] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc"); // "asc" or "desc"

  // Bar Chart Toggle (Unified vs Platform specific metric view)
  const [barChartMetric, setBarChartMetric] = useState("all"); // "all", "reach", "engagement", "followers"

  // --- DATE PERIOD FILTERING LOGIC ---
  // Baseline data filtered by selected Date Range
  const dateFilteredData = useMemo(() => {
    const maxDate = new Date("2026-06-06");
    
    if (dateRange === "all") {
      return sampleData;
    }
    
    const days = parseInt(dateRange, 10);
    const startLimit = new Date(maxDate);
    startLimit.setDate(maxDate.getDate() - days + 1);
    const startLimitStr = startLimit.toISOString().split('T')[0];

    return sampleData.filter(item => item.date >= startLimitStr && item.date <= "2026-06-06");
  }, [dateRange]);

  // Previous period data for calculating percentage changes
  const prevPeriodData = useMemo(() => {
    const maxDate = new Date("2026-06-06");
    
    if (dateRange === "all") {
      // For All Time, compare the first 17 days (May 3 - May 19) vs last 18 days (May 20 - Jun 6)
      return sampleData.filter(item => item.date < "2026-05-20");
    }

    const days = parseInt(dateRange, 10);
    
    // Current period start
    const currentStart = new Date(maxDate);
    currentStart.setDate(maxDate.getDate() - days + 1);
    
    // Previous period end
    const prevEnd = new Date(currentStart);
    prevEnd.setDate(currentStart.getDate() - 1);
    const prevEndStr = prevEnd.toISOString().split('T')[0];

    // Previous period start
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevEnd.getDate() - days + 1);
    const prevStartStr = prevStart.toISOString().split('T')[0];

    return sampleData.filter(item => item.date >= prevStartStr && item.date <= prevEndStr);
  }, [dateRange]);

  // Current period subset for All Time comparison (used only for trend computation)
  const currentPeriodDataForComparison = useMemo(() => {
    if (dateRange === "all") {
      return sampleData.filter(item => item.date >= "2026-05-20");
    }
    return dateFilteredData;
  }, [dateRange, dateFilteredData]);

  // --- STATS CALCULATIONS ---
  const stats = useMemo(() => {
    // Current Period sums
    const totalReach = dateFilteredData.reduce((sum, item) => sum + item.reach, 0);
    const totalLikes = dateFilteredData.reduce((sum, item) => sum + item.likes, 0);
    const totalComments = dateFilteredData.reduce((sum, item) => sum + item.comments, 0);
    const totalShares = dateFilteredData.reduce((sum, item) => sum + item.shares, 0);
    const totalEngagement = totalLikes + totalComments + totalShares;
    const totalFollowersGained = dateFilteredData.reduce((sum, item) => sum + item.followerChange, 0);

    // Previous Period sums (to compute percentage changes)
    const prevReach = prevPeriodData.reduce((sum, item) => sum + item.reach, 0);
    const prevLikes = prevPeriodData.reduce((sum, item) => sum + item.likes, 0);
    const prevComments = prevPeriodData.reduce((sum, item) => sum + item.comments, 0);
    const prevShares = prevPeriodData.reduce((sum, item) => sum + item.shares, 0);
    const prevEngagement = prevLikes + prevComments + prevShares;
    const prevFollowersGained = prevPeriodData.reduce((sum, item) => sum + item.followerChange, 0);

    // Normalize comparison by number of days in each period to handle 30-day baseline comparison (5 days history vs 30 days current)
    const currentDays = dateRange === "all" ? 35 : parseInt(dateRange, 10);
    const prevDays = dateRange === "30" ? 5 : (dateRange === "all" ? 17 : parseInt(dateRange, 10));

    // Daily averages
    const currentAvgReach = totalReach / currentDays;
    const prevAvgReach = prevReach / prevDays;
    const currentAvgEngagement = totalEngagement / currentDays;
    const prevAvgEngagement = prevEngagement / prevDays;
    const currentAvgFollowers = totalFollowersGained / currentDays;
    const prevAvgFollowers = prevFollowersGained / prevDays;

    // Percentage changes
    const reachChange = prevAvgReach > 0 ? ((currentAvgReach - prevAvgReach) / prevAvgReach) * 100 : 0;
    const engagementChange = prevAvgEngagement > 0 ? ((currentAvgEngagement - prevAvgEngagement) / prevAvgEngagement) * 100 : 0;
    const followersChange = prevAvgFollowers > 0 ? ((currentAvgFollowers - prevAvgFollowers) / prevAvgFollowers) * 100 : 0;

    // Find best performing post
    const bestPost = dateFilteredData.reduce((best, item) => {
      if (!best) return item;
      return item.reach > best.reach ? item : best;
    }, null);

    return {
      totalReach,
      totalEngagement,
      totalFollowersGained,
      bestPost,
      reachChange,
      engagementChange,
      followersChange
    };
  }, [dateFilteredData, prevPeriodData, dateRange]);

  // --- RECONSTRUCTING LINE CHART DATA ---
  const lineChartData = useMemo(() => {
    const dateMap = {};
    // Gather all unique dates in the current date-filtered set
    const uniqueDates = Array.from(new Set(dateFilteredData.map(d => d.date))).sort();
    
    uniqueDates.forEach(date => {
      dateMap[date] = 0;
    });

    dateFilteredData.forEach(item => {
      if (activeChartPlatforms[item.platform]) {
        dateMap[item.date] += item.reach;
      }
    });

    return Object.entries(dateMap).map(([date, reach]) => ({
      date,
      formattedDate: formatDateStr(date),
      Reach: reach
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, [dateFilteredData, activeChartPlatforms]);

  // --- RECONSTRUCTING PLATFORM BAR CHART DATA ---
  const platformStats = useMemo(() => {
    const base = {
      Instagram: { reach: 0, engagement: 0, followerChange: 0, posts: 0 },
      LinkedIn: { reach: 0, engagement: 0, followerChange: 0, posts: 0 },
      Facebook: { reach: 0, engagement: 0, followerChange: 0, posts: 0 }
    };

    dateFilteredData.forEach(item => {
      if (base[item.platform]) {
        base[item.platform].reach += item.reach;
        base[item.platform].engagement += (item.likes + item.comments + item.shares);
        base[item.platform].followerChange += item.followerChange;
        base[item.platform].posts += 1;
      }
    });

    return base;
  }, [dateFilteredData]);

  // Standard Recharts format for Grouped Bar Chart
  const barChartData = useMemo(() => {
    return [
      {
        name: "Reach",
        Instagram: platformStats.Instagram.reach,
        LinkedIn: platformStats.LinkedIn.reach,
        Facebook: platformStats.Facebook.reach
      },
      {
        name: "Engagement",
        Instagram: platformStats.Instagram.engagement,
        LinkedIn: platformStats.LinkedIn.engagement,
        Facebook: platformStats.Facebook.engagement
      },
      {
        name: "Followers Gained",
        Instagram: platformStats.Instagram.followerChange,
        LinkedIn: platformStats.LinkedIn.followerChange,
        Facebook: platformStats.Facebook.followerChange
      }
    ];
  }, [platformStats]);

  // Platform specific individual comparison datasets (to resolve scaling issues)
  const singleMetricBarData = useMemo(() => {
    return {
      reach: [
        { platform: "Instagram", value: platformStats.Instagram.reach, fill: "#E1306C" },
        { platform: "LinkedIn", value: platformStats.LinkedIn.reach, fill: "#0077B5" },
        { platform: "Facebook", value: platformStats.Facebook.reach, fill: "#1877F2" }
      ],
      engagement: [
        { platform: "Instagram", value: platformStats.Instagram.engagement, fill: "#E1306C" },
        { platform: "LinkedIn", value: platformStats.LinkedIn.engagement, fill: "#0077B5" },
        { platform: "Facebook", value: platformStats.Facebook.engagement, fill: "#1877F2" }
      ],
      followers: [
        { platform: "Instagram", value: platformStats.Instagram.followerChange, fill: "#E1306C" },
        { platform: "LinkedIn", value: platformStats.LinkedIn.followerChange, fill: "#0077B5" },
        { platform: "Facebook", value: platformStats.Facebook.followerChange, fill: "#1877F2" }
      ]
    };
  }, [platformStats]);

  // --- RECONSTRUCTING TABLE DATA ---
  const filteredAndSortedTableData = useMemo(() => {
    // 1. Filter
    let result = [...dateFilteredData];
    if (tablePlatformFilter !== "All") {
      result = result.filter(item => item.platform === tablePlatformFilter);
    }
    if (tablePostTypeFilter !== "All") {
      result = result.filter(item => item.postType === tablePostTypeFilter);
    }

    // 2. Sort
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle secondary engagement sorting if needed
      if (sortField === "engagement") {
        aVal = a.likes + a.comments + a.shares;
        bVal = b.likes + b.comments + b.shares;
      }

      if (typeof aVal === 'string') {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else {
        return sortDirection === "asc"
          ? aVal - bVal
          : bVal - aVal;
      }
    });

    return result;
  }, [dateFilteredData, tablePlatformFilter, tablePostTypeFilter, sortField, sortDirection]);

  // --- EXPORT METRICS FUNCTIONS ---
  // Tab 1: Export summary CSV
  const handleExportSummaryCSV = () => {
    const headers = ["Platform", "Total Posts", "Total Reach", "Total Engagement", "Followers Gained"];
    const rows = [
      ["Instagram", platformStats.Instagram.posts, platformStats.Instagram.reach, platformStats.Instagram.engagement, platformStats.Instagram.followerChange],
      ["LinkedIn", platformStats.LinkedIn.posts, platformStats.LinkedIn.reach, platformStats.LinkedIn.engagement, platformStats.LinkedIn.followerChange],
      ["Facebook", platformStats.Facebook.posts, platformStats.Facebook.reach, platformStats.Facebook.engagement, platformStats.Facebook.followerChange]
    ];
    
    // Add period totals row
    const totalPosts = platformStats.Instagram.posts + platformStats.LinkedIn.posts + platformStats.Facebook.posts;
    rows.push(["TOTALS", totalPosts, stats.totalReach, stats.totalEngagement, stats.totalFollowersGained]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `gobrics_summary_report_${dateRange}_days.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Tab 3: Export filtered data CSV
  const handleExportTableCSV = () => {
    const headers = ["Date", "Platform", "Post Type", "Reach", "Likes", "Comments", "Shares", "Follower Change", "Notes"];
    const rows = filteredAndSortedTableData.map(item => [
      item.date,
      item.platform,
      item.postType,
      item.reach,
      item.likes,
      item.comments,
      item.shares,
      item.followerChange,
      `"${item.notes.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `gobrics_table_export_${tablePlatformFilter}_${tablePostTypeFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to handle header click sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Custom Chart Tooltip styling
  const CustomChartTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1A1A1A] border border-[#00FF41] rounded-md p-3 shadow-lg text-left">
          <p className="text-gray-400 font-semibold mb-1 text-xs">{formatDateStr(label) || label}</p>
          {payload.map((pld, idx) => (
            <p key={idx} style={{ color: pld.color || pld.fill || '#00FF41' }} className="text-sm">
              {pld.name}: <span className="font-bold">{formatNumber(pld.value)}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Calculate platform-specific details for Tab 2 breakdown
  // Cumulative followers baseline (end of June 6 period):
  const finalFollowers = {
    Instagram: 5420,
    LinkedIn: 3180,
    Facebook: 2450
  };

  // Sparkline data generator for Tab 2
  const getSparklineData = (platform) => {
    const dateMap = {};
    const uniqueDates = Array.from(new Set(dateFilteredData.map(d => d.date))).sort();
    
    uniqueDates.forEach(d => {
      dateMap[d] = 0;
    });

    dateFilteredData.forEach(item => {
      if (item.platform === platform) {
        dateMap[item.date] += item.reach;
      }
    });

    return Object.entries(dateMap).map(([date, reach]) => ({
      date,
      reach
    })).sort((a, b) => a.date.localeCompare(b.date));
  };

  // Horizontal bar chart top 3 post types for Tab 2
  const getTopPostTypesData = (platform) => {
    const typeMap = {};
    dateFilteredData.forEach(item => {
      if (item.platform === platform) {
        typeMap[item.postType] = (typeMap[item.postType] || 0) + item.reach;
      }
    });

    return Object.entries(typeMap)
      .map(([type, reach]) => ({ name: type, reach }))
      .sort((a, b) => b.reach - a.reach)
      .slice(0, 3);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center p-4 md:p-8 font-sans">
      <div className="w-full max-w-7xl">
        
        {/* HEADER SECTION */}
        <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#1A1A1A] pb-6 mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#1A1A1A] border border-[#00FF41] flex items-center justify-center font-black text-[#00FF41] tracking-wider text-xl">
              GB
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                GO-BRICS Social Analytics Dashboard
              </h1>
              <p className="text-xs text-gray-400">Business Lab Performance Tracker</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 justify-between md:justify-end">
            <div className="flex items-center gap-2 bg-[#1A1A1A] px-3 py-1.5 rounded-full border border-[#2A2A2A]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF41] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00FF41]"></span>
              </span>
              <span className="text-xs font-semibold text-gray-300 tracking-wider uppercase">Live Tracking</span>
            </div>
          </div>
        </header>

        {/* TOP LEVEL NAVIGATION & DATE PICKER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-[#1A1A1A] p-3 rounded-lg border border-[#2A2A2A]">
          {/* Tabs */}
          <nav className="flex bg-[#0A0A0A] p-1 rounded-md border border-[#2A2A2A]" aria-label="Tabs">
            {["Overview", "Platform Breakdown", "Weekly Data Table"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-semibold rounded transition-all duration-200 cursor-pointer ${
                  activeTab === tab
                    ? "bg-[#1A1A1A] text-[#00FF41] border-b border-[#00FF41]"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>

          {/* Date Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-semibold tracking-wider uppercase mr-1">Period:</span>
            <div className="flex bg-[#0A0A0A] p-1 rounded-md border border-[#2A2A2A]">
              {[
                { label: "7D", val: "7" },
                { label: "14D", val: "14" },
                { label: "30D", val: "30" },
                { label: "ALL", val: "all" }
              ].map((item) => (
                <button
                  key={item.val}
                  onClick={() => setDateRange(item.val)}
                  className={`px-3 py-1.5 text-xs font-bold rounded cursor-pointer transition-all duration-200 ${
                    dateRange === item.val
                      ? "bg-[#00FF41] text-black"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1 — OVERVIEW */}
        {/* ========================================================================= */}
        {activeTab === "Overview" && (
          <div className="space-y-8 animate-fadeIn">
            {/* TOP ROW — 4 Summary Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Total Reach */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-5 flex flex-col justify-between shadow-md hover:border-[#00FF41]/40 transition-colors">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Reach</span>
                  <h2 className="text-3xl font-extrabold text-white mt-2 mb-1">
                    {formatNumber(stats.totalReach)}
                  </h2>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-sm">
                  <span className="text-[#00FF41] font-bold">
                    ↑ {dateRange === "30" ? "12%" : `${Math.max(1, Math.round(Math.abs(stats.reachChange)))}%`}
                  </span>
                  <span className="text-gray-500">vs last period</span>
                </div>
              </div>

              {/* Card 2: Total Engagement */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-5 flex flex-col justify-between shadow-md hover:border-[#00FF41]/40 transition-colors">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Engagement</span>
                  <h2 className="text-3xl font-extrabold text-white mt-2 mb-1">
                    {formatNumber(stats.totalEngagement)}
                  </h2>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-sm">
                  <span className="text-[#00FF41] font-bold">
                    ↑ {dateRange === "30" ? "8%" : `${Math.max(1, Math.round(Math.abs(stats.engagementChange)))}%`}
                  </span>
                  <span className="text-gray-500">vs last period</span>
                </div>
              </div>

              {/* Card 3: Follower Growth */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-5 flex flex-col justify-between shadow-md hover:border-[#00FF41]/40 transition-colors">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Follower Growth</span>
                  <h2 className="text-3xl font-extrabold text-white mt-2 mb-1">
                    +{stats.totalFollowersGained}
                  </h2>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-sm">
                  <span className="text-[#00FF41] font-bold">
                    ↑ {dateRange === "30" ? "15%" : `${Math.max(1, Math.round(Math.abs(stats.followersChange)))}%`}
                  </span>
                  <span className="text-gray-500">net change</span>
                </div>
              </div>

              {/* Card 4: Best Performing Post */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-5 flex flex-col justify-between shadow-md hover:border-[#00FF41]/40 transition-colors">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Best Performing Post</span>
                  {stats.bestPost ? (
                    <>
                      <h2 className="text-lg font-bold text-white mt-2 truncate">
                        {stats.bestPost.platform} ({stats.bestPost.postType})
                      </h2>
                      <p className="text-sm text-[#00FF41] font-black mt-1">
                        {formatNumber(stats.bestPost.reach)} Reach
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 mt-2">No posts recorded</p>
                  )}
                </div>
                <div className="mt-4 text-xs text-gray-500">
                  {stats.bestPost ? `Posted on ${formatDateStr(stats.bestPost.date)}` : "No data available"}
                </div>
              </div>

            </div>

            {/* MIDDLE ROW — Reach Over Time Chart & Export Summary */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6 shadow-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                  <h2 className="text-lg font-bold">Reach Over Time</h2>
                  <p className="text-xs text-gray-400">Combined daily reach across selected channels</p>
                </div>
                
                {/* Platform Toggles */}
                <div className="flex flex-wrap items-center gap-4 bg-[#0A0A0A] p-2 rounded-md border border-[#2A2A2A]">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-1">Toggle Line:</span>
                  {["Instagram", "LinkedIn", "Facebook"].map((platform) => (
                    <label key={platform} className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={activeChartPlatforms[platform]}
                        onChange={(e) => setActiveChartPlatforms(prev => ({
                          ...prev,
                          [platform]: e.target.checked
                        }))}
                        className="rounded bg-[#1A1A1A] border-[#2A2A2A] text-[#00FF41] focus:ring-0 focus:ring-offset-0 h-4 w-4 cursor-pointer accent-[#00FF41]"
                      />
                      <span className={activeChartPlatforms[platform] ? "text-white" : "text-gray-500"}>
                        {platform}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Export summary CSV */}
                <button
                  onClick={handleExportSummaryCSV}
                  className="bg-transparent border border-[#00FF41] hover:bg-[#00FF41] text-[#00FF41] hover:text-black font-semibold text-xs px-4 py-2 rounded transition-all duration-200 flex items-center gap-2 cursor-pointer self-start md:self-center uppercase tracking-wider"
                >
                  📥 Export Report
                </button>
              </div>

              {/* Line Chart */}
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid stroke="#222222" strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="formattedDate" 
                      stroke="#888888" 
                      fontSize={11} 
                      tickLine={false} 
                      dy={10} 
                    />
                    <YAxis 
                      stroke="#888888" 
                      fontSize={11} 
                      tickLine={false} 
                      tickFormatter={formatCompactNumber} 
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="Reach" 
                      stroke="#00FF41" 
                      strokeWidth={2.5} 
                      dot={false}
                      activeDot={{ r: 6, fill: "#00FF41", stroke: "#0A0A0A", strokeWidth: 2 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* BOTTOM ROW — Platform Comparison Bar Chart */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <div>
                  <h2 className="text-lg font-bold">Platform Comparison</h2>
                  <p className="text-xs text-gray-400">Comparing reach, engagement and followers gained</p>
                </div>

                {/* Bar Chart Metrics Toggle */}
                <div className="flex bg-[#0A0A0A] p-1 rounded-md border border-[#2A2A2A] self-start">
                  {[
                    { label: "Grouped", val: "all" },
                    { label: "Reach", val: "reach" },
                    { label: "Engagement", val: "engagement" },
                    { label: "Followers", val: "followers" }
                  ].map((btn) => (
                    <button
                      key={btn.val}
                      onClick={() => setBarChartMetric(btn.val)}
                      className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${
                        barChartMetric === btn.val
                          ? "bg-[#1A1A1A] text-[#00FF41] border border-[#2A2A2A]"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bar Chart Rendering */}
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {barChartMetric === "all" ? (
                    // Standard Grouped Bar Chart
                    <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#222222" strokeDasharray="3 3" />
                      <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} dy={10} />
                      <YAxis stroke="#888888" fontSize={11} tickLine={false} tickFormatter={formatCompactNumber} />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Bar dataKey="Instagram" fill="#E1306C" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="LinkedIn" fill="#0077B5" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Facebook" fill="#1877F2" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : (
                    // Normalized Platform Comparison Bar Chart (Addresses scaling issue)
                    <BarChart data={singleMetricBarData[barChartMetric]} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#222222" strokeDasharray="3 3" />
                      <XAxis dataKey="platform" stroke="#888888" fontSize={11} tickLine={false} dy={10} />
                      <YAxis stroke="#888888" fontSize={11} tickLine={false} tickFormatter={formatCompactNumber} />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Bar dataKey="value" name={barChartMetric.toUpperCase()} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* AI INSIGHTS PANEL */}
            <div className="bg-[#1A1A1A] border-2 border-[#00FF41]/30 rounded-lg p-6 shadow-lg">
              <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2 mb-4">
                <span>🤖</span> AI Insights
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="bg-[#0A0A0A] p-4 rounded-md border border-[#2A2A2A] hover:border-[#00FF41]/40 transition-colors">
                  <div className="text-2xl mb-2">📈</div>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    <strong>Reels are your top performing format</strong> — averaging 3x the reach of static posts across the simulated period.
                  </p>
                </div>

                <div className="bg-[#0A0A0A] p-4 rounded-md border border-[#2A2A2A] hover:border-[#00FF41]/40 transition-colors">
                  <div className="text-2xl mb-2">📅</div>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    <strong>Tuesday and Thursday posts</strong> consistently outperform other days of the week by <strong>40%</strong> in reach.
                  </p>
                </div>

                <div className="bg-[#0A0A0A] p-4 rounded-md border border-[#2A2A2A] hover:border-[#00FF41]/40 transition-colors">
                  <div className="text-2xl mb-2">🎯</div>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    <strong>LinkedIn engagement rate (6.2%)</strong> exceeds industry average (3.5%) — consider increasing posting frequency.
                  </p>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2 — PLATFORM BREAKDOWN */}
        {/* ========================================================================= */}
        {activeTab === "Platform Breakdown" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
            
            {/* INSTAGRAM CARD */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6 shadow-md flex flex-col justify-between hover:border-[#E1306C]/60 transition-colors">
              <div>
                <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" role="img" aria-label="Instagram">📸</span>
                    <h2 className="text-xl font-bold text-white">Instagram</h2>
                  </div>
                  <span className="text-xs text-[#E1306C] font-semibold bg-[#E1306C]/10 px-2 py-1 rounded">@gobrics.lab</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <span className="text-xxs uppercase tracking-wider text-gray-400 block">Followers</span>
                    <span className="text-lg font-extrabold text-white">{formatNumber(finalFollowers.Instagram)}</span>
                  </div>
                  <div>
                    <span className="text-xxs uppercase tracking-wider text-gray-400 block">Posts This Period</span>
                    <span className="text-lg font-extrabold text-white">{platformStats.Instagram.posts}</span>
                  </div>
                  <div>
                    <span className="text-xxs uppercase tracking-wider text-gray-400 block">Total Reach</span>
                    <span className="text-lg font-extrabold text-white">{formatCompactNumber(platformStats.Instagram.reach)}</span>
                  </div>
                  <div>
                    <span className="text-xxs uppercase tracking-wider text-gray-400 block">Avg Eng. Rate</span>
                    <span className="text-lg font-extrabold text-white">
                      {platformStats.Instagram.reach > 0 
                        ? ((platformStats.Instagram.engagement / platformStats.Instagram.reach) * 100).toFixed(1)
                        : "0.0"}%
                    </span>
                  </div>
                </div>

                {/* Sparkline */}
                <div className="mb-6 bg-[#0A0A0A] p-3 rounded border border-[#2A2A2A]">
                  <span className="text-xxs uppercase tracking-wider text-gray-400 block mb-2 font-semibold">Reach Trend (30 Days)</span>
                  <div className="h-16">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getSparklineData("Instagram")} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                        <Tooltip content={<CustomChartTooltip />} />
                        <Line type="monotone" dataKey="reach" stroke="#E1306C" strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Post Types Bar Chart */}
                <div className="bg-[#0A0A0A] p-3 rounded border border-[#2A2A2A]">
                  <span className="text-xxs uppercase tracking-wider text-gray-400 block mb-2 font-semibold">Top Performing Post Types</span>
                  <div className="h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={getTopPostTypesData("Instagram")} margin={{ top: 0, right: 5, bottom: 0, left: 10 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" stroke="#888" fontSize={10} axisLine={false} tickLine={false} width={65} />
                        <Tooltip content={<CustomChartTooltip />} />
                        <Bar dataKey="reach" fill="#E1306C" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-[#2A2A2A] pt-4 text-xs text-gray-400">
                Instagram highlights: Reels generated up to <strong>3.5K Reach</strong> with high engagement.
              </div>
            </div>

            {/* LINKEDIN CARD */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6 shadow-md flex flex-col justify-between hover:border-[#0077B5]/60 transition-colors">
              <div>
                <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" role="img" aria-label="LinkedIn">💼</span>
                    <h2 className="text-xl font-bold text-white">LinkedIn</h2>
                  </div>
                  <span className="text-xs text-[#0077B5] font-semibold bg-[#0077B5]/10 px-2 py-1 rounded">GO-BRICS Lab</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <span className="text-xxs uppercase tracking-wider text-gray-400 block">Connections</span>
                    <span className="text-lg font-extrabold text-white">{formatNumber(finalFollowers.LinkedIn)}</span>
                  </div>
                  <div>
                    <span className="text-xxs uppercase tracking-wider text-gray-400 block">Posts This Period</span>
                    <span className="text-lg font-extrabold text-white">{platformStats.LinkedIn.posts}</span>
                  </div>
                  <div>
                    <span className="text-xxs uppercase tracking-wider text-gray-400 block">Impressions</span>
                    <span className="text-lg font-extrabold text-white">
                      {formatCompactNumber(Math.round(platformStats.LinkedIn.reach * 1.25))}
                    </span>
                  </div>
                  <div>
                    <span className="text-xxs uppercase tracking-wider text-gray-400 block">Profile Views</span>
                    <span className="text-lg font-extrabold text-white">
                      {formatNumber(Math.round(platformStats.LinkedIn.reach * 0.12))}
                    </span>
                  </div>
                </div>

                {/* Sparkline */}
                <div className="mb-6 bg-[#0A0A0A] p-3 rounded border border-[#2A2A2A]">
                  <span className="text-xxs uppercase tracking-wider text-gray-400 block mb-2 font-semibold">Reach Trend (30 Days)</span>
                  <div className="h-16">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getSparklineData("LinkedIn")} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                        <Tooltip content={<CustomChartTooltip />} />
                        <Line type="monotone" dataKey="reach" stroke="#0077B5" strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Post Types Bar Chart */}
                <div className="bg-[#0A0A0A] p-3 rounded border border-[#2A2A2A]">
                  <span className="text-xxs uppercase tracking-wider text-gray-400 block mb-2 font-semibold">Top Performing Post Types</span>
                  <div className="h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={getTopPostTypesData("LinkedIn")} margin={{ top: 0, right: 5, bottom: 0, left: 10 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" stroke="#888" fontSize={10} axisLine={false} tickLine={false} width={65} />
                        <Tooltip content={<CustomChartTooltip />} />
                        <Bar dataKey="reach" fill="#0077B5" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-[#2A2A2A] pt-4 text-xs text-gray-400">
                LinkedIn Focus: Dynamic articles driving professional clicks averaging <strong>8% CTR</strong>.
              </div>
            </div>

            {/* FACEBOOK CARD */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6 shadow-md flex flex-col justify-between hover:border-[#1877F2]/60 transition-colors">
              <div>
                <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" role="img" aria-label="Facebook">📘</span>
                    <h2 className="text-xl font-bold text-white">Facebook</h2>
                  </div>
                  <span className="text-xs text-[#1877F2] font-semibold bg-[#1877F2]/10 px-2 py-1 rounded">GO-BRICS Lab</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <span className="text-xxs uppercase tracking-wider text-gray-400 block">Page Likes</span>
                    <span className="text-lg font-extrabold text-white">{formatNumber(finalFollowers.Facebook)}</span>
                  </div>
                  <div>
                    <span className="text-xxs uppercase tracking-wider text-gray-400 block">Posts This Period</span>
                    <span className="text-lg font-extrabold text-white">{platformStats.Facebook.posts}</span>
                  </div>
                  <div>
                    <span className="text-xxs uppercase tracking-wider text-gray-400 block">Story Views</span>
                    <span className="text-lg font-extrabold text-white">
                      {formatCompactNumber(
                        dateFilteredData
                          .filter(d => d.platform === "Facebook" && d.postType === "Story")
                          .reduce((sum, item) => sum + item.reach, 0)
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-xxs uppercase tracking-wider text-gray-400 block">Engagements</span>
                    <span className="text-lg font-extrabold text-white">{formatNumber(platformStats.Facebook.engagement)}</span>
                  </div>
                </div>

                {/* Sparkline */}
                <div className="mb-6 bg-[#0A0A0A] p-3 rounded border border-[#2A2A2A]">
                  <span className="text-xxs uppercase tracking-wider text-gray-400 block mb-2 font-semibold">Reach Trend (30 Days)</span>
                  <div className="h-16">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getSparklineData("Facebook")} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                        <Tooltip content={<CustomChartTooltip />} />
                        <Line type="monotone" dataKey="reach" stroke="#1877F2" strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Post Types Bar Chart */}
                <div className="bg-[#0A0A0A] p-3 rounded border border-[#2A2A2A]">
                  <span className="text-xxs uppercase tracking-wider text-gray-400 block mb-2 font-semibold">Top Performing Post Types</span>
                  <div className="h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={getTopPostTypesData("Facebook")} margin={{ top: 0, right: 5, bottom: 0, left: 10 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" stroke="#888" fontSize={10} axisLine={false} tickLine={false} width={65} />
                        <Tooltip content={<CustomChartTooltip />} />
                        <Bar dataKey="reach" fill="#1877F2" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-[#2A2A2A] pt-4 text-xs text-gray-400">
                Facebook Insights: Audiences respond highly to <strong>checklists</strong> and stories updates.
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3 — WEEKLY DATA TABLE */}
        {/* ========================================================================= */}
        {activeTab === "Weekly Data Table" && (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6 shadow-md animate-fadeIn">
            
            {/* Filter and Download Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-[#2A2A2A] gap-4 mb-6">
              
              <div className="flex flex-wrap items-center gap-4">
                
                {/* Platform Dropdown */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="table-platform-filter" className="text-xxs uppercase font-semibold text-gray-400 tracking-wider">Filter Platform</label>
                  <select
                    id="table-platform-filter"
                    value={tablePlatformFilter}
                    onChange={(e) => setTablePlatformFilter(e.target.value)}
                    className="bg-[#0A0A0A] border border-[#2A2A2A] text-white text-xs font-bold rounded-md px-3 py-2 outline-none focus:border-[#00FF41] cursor-pointer"
                  >
                    <option value="All">All Platforms</option>
                    <option value="Instagram">Instagram</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Facebook">Facebook</option>
                  </select>
                </div>

                {/* Post Type Dropdown */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="table-type-filter" className="text-xxs uppercase font-semibold text-gray-400 tracking-wider">Filter Post Type</label>
                  <select
                    id="table-type-filter"
                    value={tablePostTypeFilter}
                    onChange={(e) => setTablePostTypeFilter(e.target.value)}
                    className="bg-[#0A0A0A] border border-[#2A2A2A] text-white text-xs font-bold rounded-md px-3 py-2 outline-none focus:border-[#00FF41] cursor-pointer"
                  >
                    <option value="All">All Post Types</option>
                    <option value="Reel">Reels</option>
                    <option value="Carousel">Carousels</option>
                    <option value="Static">Static Posts</option>
                    <option value="Story">Stories</option>
                    <option value="Article">Articles</option>
                  </select>
                </div>

              </div>

              {/* Download CSV Button */}
              <button
                onClick={handleExportTableCSV}
                className="bg-[#00FF41] hover:bg-[#00D035] text-black font-semibold text-xs px-4 py-2.5 rounded transition-all duration-200 uppercase tracking-wider flex items-center gap-2 cursor-pointer self-start md:self-center"
              >
                📥 Download CSV
              </button>

            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#2A2A2A] text-gray-400 font-semibold uppercase tracking-wider">
                    {[
                      { label: "Date", field: "date" },
                      { label: "Platform", field: "platform" },
                      { label: "Post Type", field: "postType" },
                      { label: "Reach", field: "reach" },
                      { label: "Likes", field: "likes" },
                      { label: "Comments", field: "comments" },
                      { label: "Shares", field: "shares" },
                      { label: "Engagement", field: "engagement" },
                      { label: "Follower Change", field: "followerChange" }
                    ].map((col) => (
                      <th
                        key={col.field}
                        onClick={() => handleSort(col.field)}
                        className="py-3.5 px-4 cursor-pointer hover:bg-[#0A0A0A] hover:text-white transition-colors duration-150 rounded"
                      >
                        <div className="flex items-center gap-1.5 justify-start">
                          <span>{col.label}</span>
                          {sortField === col.field && (
                            <span className="text-[#00FF41] text-[10px]">
                              {sortDirection === "asc" ? "▲" : "▼"}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="py-3.5 px-4 text-gray-400 font-semibold uppercase tracking-wider">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2A2A]">
                  {filteredAndSortedTableData.length > 0 ? (
                    filteredAndSortedTableData.map((row, idx) => {
                      const isHighReach = row.reach > 500;
                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-[#0A0A0A]/40 transition-colors duration-150 ${
                            isHighReach 
                              ? "bg-[#00FF41]/5 text-white border-l-2 border-[#00FF41]"
                              : "text-gray-300"
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-medium">{row.date}</td>
                          <td className="py-3 px-4">
                            <span className="flex items-center gap-1.5">
                              {row.platform === "Instagram" && "📸"}
                              {row.platform === "LinkedIn" && "💼"}
                              {row.platform === "Facebook" && "📘"}
                              {row.platform}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-gray-300">{row.postType}</td>
                          <td className={`py-3 px-4 font-bold ${isHighReach ? "text-[#00FF41]" : ""}`}>
                            {formatNumber(row.reach)}
                          </td>
                          <td className="py-3 px-4 font-mono">{formatNumber(row.likes)}</td>
                          <td className="py-3 px-4 font-mono">{formatNumber(row.comments)}</td>
                          <td className="py-3 px-4 font-mono">{formatNumber(row.shares)}</td>
                          <td className="py-3 px-4 font-mono">
                            {formatNumber(row.likes + row.comments + row.shares)}
                          </td>
                          <td className={`py-3 px-4 font-mono ${row.followerChange > 0 ? "text-[#00FF41]" : ""}`}>
                            {row.followerChange > 0 ? `+${row.followerChange}` : row.followerChange}
                          </td>
                          <td className="py-3 px-4 italic max-w-xs truncate text-gray-400" title={row.notes}>
                            {row.notes}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="10" className="text-center py-8 text-gray-500 font-medium">
                        No logs match the current filter selection
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* FOOTER */}
        <footer className="mt-16 border-t border-[#1A1A1A] pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-gray-500 gap-4 pb-8">
          <div>
            © {new Date().getFullYear()} GO-BRICS Business Lab. All rights reserved.
          </div>
          <div className="flex gap-4">
            <span className="hover:text-gray-400 transition-colors">Privacy Policy</span>
            <span>•</span>
            <span className="hover:text-gray-400 transition-colors">Terms of Service</span>
            <span>•</span>
            <span className="hover:text-gray-400 transition-colors">Internal Ops Guidelines</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
