# Claude Token Tracker - SQL Query Guide 📊

A comprehensive guide to querying your token usage database for insights, analytics, and cost optimization.

## 🗄️ Database Location
```bash
/Users/anirudhgupta/Code/claude-token-tracker/data/tokens.db
```

## 🚀 Quick Access Methods

### Method 1: Direct SQLite Access (Recommended)
```bash
cd /Users/anirudhgupta/Code/claude-token-tracker
sqlite3 data/tokens.db
```

### Method 2: Interactive Mode with Better Formatting
```bash
cd /Users/anirudhgupta/Code/claude-token-tracker
sqlite3 data/tokens.db
.headers on
.mode column
.width 20 15 10 10 12
```

### Method 3: Single Command Query
```bash
sqlite3 data/tokens.db "YOUR_QUERY_HERE;"
```

### Method 4: Export to CSV
```bash
sqlite3 data/tokens.db -header -csv "YOUR_QUERY_HERE;" > output.csv
```

---

## 📋 Database Schema Quick Reference

### Sessions Table
- `id` - Session UUID
- `project_path` - Full path to project
- `started_at` / `ended_at` - Session timestamps
- `total_input_tokens` - Cumulative input tokens
- `total_output_tokens` - Cumulative output tokens  
- `total_cache_creation_tokens` - Cache creation tokens
- `total_cache_read_tokens` - Cache read tokens
- `total_cost_usd` - Total session cost
- `lines_added` / `lines_removed` - Code changes
- `web_search_requests` - Web search count

### Session Snapshots Table
- `session_id` - Links to sessions
- `timestamp` - When snapshot was taken
- `raw_data` - Full JSON from .claude.json
- Token counts at time of snapshot

### Conversations Table
- `session_id` - Links to sessions
- `conversation_index` - Order within session
- Delta tokens for individual conversations

---

## 🔍 Essential Queries

### 1. Overview - All Active Sessions
```sql
SELECT 
  substr(id, 1, 8) as session,
  project_path,
  started_at,
  total_input_tokens as input,
  total_output_tokens as output,
  total_cache_creation_tokens as cache,
  total_cost_usd as cost
FROM sessions 
WHERE id NOT LIKE 'placeholder-%'
ORDER BY started_at DESC;
```

### 2. Project Summary (Most Important Query)
```sql
SELECT 
  project_path,
  COUNT(*) as sessions,
  SUM(total_input_tokens) as total_input,
  SUM(total_output_tokens) as total_output,
  SUM(total_cache_creation_tokens) as total_cache,
  SUM(total_cost_usd) as total_cost,
  ROUND(AVG(total_cost_usd), 4) as avg_cost_per_session,
  MAX(ended_at) as last_activity
FROM sessions 
WHERE id NOT LIKE 'placeholder-%'
GROUP BY project_path
ORDER BY total_cost DESC;
```

### 3. Daily Usage Analysis
```sql
SELECT 
  DATE(started_at) as date,
  COUNT(*) as sessions,
  SUM(total_input_tokens) as daily_input,
  SUM(total_output_tokens) as daily_output,
  ROUND(SUM(total_cost_usd), 4) as daily_cost,
  CASE 
    WHEN SUM(total_cost_usd) > 0.67 THEN '🚨 Over daily budget!'
    ELSE '✅ Within budget'
  END as budget_status
FROM sessions 
WHERE id NOT LIKE 'placeholder-%'
  AND started_at >= datetime('now', '-30 days')
GROUP BY DATE(started_at)
ORDER BY date DESC;
```

### 4. Most Expensive Sessions
```sql
SELECT 
  substr(id, 1, 8) as session,
  substr(project_path, -30) as project,
  ROUND(total_cost_usd, 4) as cost,
  total_input_tokens as input,
  total_output_tokens as output,
  total_cache_creation_tokens as cache,
  datetime(started_at) as started
FROM sessions 
WHERE id NOT LIKE 'placeholder-%'
ORDER BY total_cost_usd DESC
LIMIT 10;
```

---

## 💰 Cost Analysis Queries

### 5. "Robbery" Analysis - Days Over $20/month Budget
```sql
SELECT 
  DATE(started_at) as date,
  COUNT(*) as sessions,
  ROUND(SUM(total_cost_usd), 2) as daily_api_cost,
  '$0.67' as daily_budget,
  ROUND((SUM(total_cost_usd) - 0.67), 2) as over_budget,
  ROUND(SUM(total_cost_usd) * 30, 2) as monthly_equivalent
FROM sessions 
WHERE id NOT LIKE 'placeholder-%'
  AND started_at >= datetime('now', '-30 days')
GROUP BY DATE(started_at)
HAVING daily_api_cost > 0.67
ORDER BY daily_api_cost DESC;
```

### 6. Cache Token Analysis (Hidden Costs)
```sql
SELECT 
  substr(project_path, -25) as project,
  COUNT(*) as sessions,
  SUM(total_input_tokens + total_output_tokens) as conversation_tokens,
  SUM(total_cache_creation_tokens) as cache_tokens,
  ROUND(
    SUM(total_cache_creation_tokens) * 100.0 / 
    NULLIF(SUM(total_input_tokens + total_output_tokens + total_cache_creation_tokens), 0), 
    1
  ) as cache_percentage,
  ROUND(SUM(total_cost_usd), 4) as total_cost,
  ROUND(SUM(total_cache_creation_tokens) * 3.75 / 1000000, 4) as cache_cost_only
FROM sessions 
WHERE id NOT LIKE 'placeholder-%'
GROUP BY project_path
ORDER BY cache_percentage DESC;
```

### 7. Value Analysis - Subscription vs API
```sql
SELECT 
  'Monthly Analysis' as period,
  COUNT(*) as total_sessions,
  ROUND(SUM(total_cost_usd), 2) as api_equivalent_cost,
  '$20.00' as subscription_cost,
  ROUND(20.00 - SUM(total_cost_usd), 2) as savings,
  ROUND((20.00 / SUM(total_cost_usd)), 1) || 'x' as value_multiplier,
  CASE 
    WHEN SUM(total_cost_usd) > 20 THEN '🎯 Subscription is great value!'
    WHEN SUM(total_cost_usd) < 5 THEN '🤔 Maybe overpaying'
    ELSE '💰 Good value'
  END as verdict
FROM sessions 
WHERE id NOT LIKE 'placeholder-%'
  AND started_at >= datetime('now', '-30 days');
```

---

## 🎯 Project-Specific Queries

### 8. anushka-mock-interview Deep Dive
```sql
-- Session details
SELECT 
  'Session Overview' as info,
  substr(id, 1, 8) as session,
  total_input_tokens as input,
  total_output_tokens as output, 
  total_cache_creation_tokens as cache,
  ROUND(total_cost_usd, 6) as cost,
  started_at,
  ended_at
FROM sessions 
WHERE project_path = '/Users/anirudhgupta/Code/anushka-mock-interview';

-- Snapshot history
SELECT 
  'Snapshot History' as info,
  timestamp,
  input_tokens,
  output_tokens,
  cache_creation_tokens,
  ROUND(cost_usd, 6) as cost
FROM session_snapshots 
WHERE project_path = '/Users/anirudhgupta/Code/anushka-mock-interview'
ORDER BY timestamp;
```

### 9. Compare Projects Side by Side
```sql
SELECT 
  CASE 
    WHEN project_path LIKE '%anushka%' THEN 'anushka-mock-interview'
    WHEN project_path LIKE '%claude-token-tracker%' THEN 'claude-token-tracker'
    WHEN project_path LIKE '%notion%' THEN 'notion-duplicator'
    ELSE 'Other Projects'
  END as project,
  COUNT(*) as sessions,
  ROUND(SUM(total_cost_usd), 4) as total_cost,
  ROUND(AVG(total_cost_usd), 4) as avg_per_session,
  SUM(total_input_tokens + total_output_tokens) as conversation_tokens,
  SUM(total_cache_creation_tokens) as cache_tokens
FROM sessions 
WHERE id NOT LIKE 'placeholder-%'
GROUP BY 1
ORDER BY total_cost DESC;
```

---

## 📈 Trend Analysis Queries

### 10. Weekly Trends
```sql
SELECT 
  strftime('%Y-W%W', started_at) as week,
  COUNT(*) as sessions,
  ROUND(SUM(total_cost_usd), 2) as weekly_cost,
  ROUND(AVG(total_cost_usd), 4) as avg_session_cost,
  SUM(total_input_tokens + total_output_tokens) as total_conversation_tokens
FROM sessions 
WHERE id NOT LIKE 'placeholder-%'
  AND started_at >= datetime('now', '-8 weeks')
GROUP BY week
ORDER BY week DESC;
```

### 11. Hourly Usage Patterns
```sql
SELECT 
  strftime('%H', started_at) as hour,
  COUNT(*) as sessions,
  ROUND(SUM(total_cost_usd), 4) as hourly_cost,
  ROUND(AVG(total_cost_usd), 4) as avg_cost
FROM sessions 
WHERE id NOT LIKE 'placeholder-%'
  AND started_at >= datetime('now', '-7 days')
GROUP BY hour
ORDER BY hour;
```

---

## 🔧 Utility Queries

### 12. Database Health Check
```sql
-- Count records in each table
SELECT 'sessions' as table_name, COUNT(*) as records FROM sessions
UNION ALL
SELECT 'session_snapshots', COUNT(*) FROM session_snapshots
UNION ALL  
SELECT 'conversations', COUNT(*) FROM conversations;

-- Check for data integrity
SELECT 
  'Data Integrity' as check_type,
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN id NOT LIKE 'placeholder-%' THEN 1 END) as real_sessions,
  COUNT(CASE WHEN total_cost_usd > 0 THEN 1 END) as sessions_with_cost,
  MIN(started_at) as earliest_session,
  MAX(ended_at) as latest_session
FROM sessions;
```

### 13. Find Sessions by Date Range
```sql
-- Replace dates as needed
SELECT 
  substr(id, 1, 8) as session,
  project_path,
  ROUND(total_cost_usd, 4) as cost,
  started_at
FROM sessions 
WHERE id NOT LIKE 'placeholder-%'
  AND date(started_at) BETWEEN '2025-08-01' AND '2025-08-06'
ORDER BY started_at;
```

### 14. Search Sessions by Project Name
```sql
-- Replace 'anushka' with your search term
SELECT 
  substr(id, 1, 8) as session,
  project_path,
  ROUND(total_cost_usd, 4) as cost,
  total_input_tokens + total_output_tokens as conversation_tokens,
  total_cache_creation_tokens as cache_tokens
FROM sessions 
WHERE project_path LIKE '%anushka%'
  AND id NOT LIKE 'placeholder-%'
ORDER BY started_at DESC;
```

---

## 💡 Pro Tips

### Useful SQLite Commands
```sql
-- Show table structure
.schema sessions

-- Show all tables
.tables

-- Better formatting
.mode column
.headers on
.width 15 10 10 8

-- Export query to file
.output results.csv
.mode csv
SELECT * FROM sessions;
.output stdout

-- Show execution time
.timer on
```

### Quick One-Liners
```bash
# Total cost this month
sqlite3 data/tokens.db "SELECT ROUND(SUM(total_cost_usd), 2) FROM sessions WHERE started_at >= datetime('now', 'start of month');"

# Most expensive project
sqlite3 data/tokens.db "SELECT project_path, ROUND(SUM(total_cost_usd), 4) FROM sessions GROUP BY project_path ORDER BY 2 DESC LIMIT 1;"

# Sessions today
sqlite3 data/tokens.db "SELECT COUNT(*) FROM sessions WHERE date(started_at) = date('now');"
```

---

## 🎯 LinkedIn Post Queries

### The "Robbery" Query - Your Story
```sql
-- Shows days where you "felt robbed"
SELECT 
  DATE(started_at) as date,
  COUNT(*) as sessions,
  ROUND(SUM(total_cost_usd), 2) as daily_cost,
  CASE 
    WHEN SUM(total_cost_usd) >= 5.00 THEN '🚨 $5+ day!'
    WHEN SUM(total_cost_usd) >= 3.00 THEN '💸 Heavy usage'
    WHEN SUM(total_cost_usd) >= 1.00 THEN '💰 Moderate usage'
    ELSE '✅ Light usage'
  END as usage_level,
  ROUND(SUM(total_cost_usd) * 30, 0) as monthly_equivalent
FROM sessions 
WHERE id NOT LIKE 'placeholder-%'
  AND started_at >= datetime('now', '-30 days')
GROUP BY DATE(started_at)
ORDER BY daily_cost DESC;
```

This guide covers all the essential queries you need to analyze your Claude Code token usage and understand your AI development costs!