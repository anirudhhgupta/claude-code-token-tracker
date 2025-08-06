# Claude Token Tracker - Complete Usage Guide

## ✅ ONE-TIME SETUP CHECKLIST

**Follow these exact steps once to set up fully automatic tracking:**

### 📋 **Robust Tracker Setup** (RECOMMENDED)

1. **Navigate to project directory:**
   ```bash
   cd /Users/anirudhgupta/Code/claude-token-tracker
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start robust tracker:**
   ```bash
   # Robust tracker with 500ms polling (recommended)
   npm start
   
   # Or with debug output to see every change
   npm run start-debug
   ```

4. **Verify tracking (in another terminal):**
   ```bash
   # Use Claude Code, then check if changes are detected
   npm run report
   ```

**✅ ADVANTAGES of Robust Tracker:**
- ⚡ **Never misses changes** - 500ms aggressive polling
- 🔍 **Tracks everything** - All token types, costs, session endings
- 🛡️ **Error recovery** - Continues through failures with detailed logging
- 📊 **Real-time feedback** - See changes as they happen
- 🎯 **100% reliable** - No race conditions or missed updates

---

## ⚠️ **Legacy Tracker Issues** (Why you need the robust tracker)

The original tracker (`tracker.js`) has these critical flaws:

```bash
# DON'T USE - Legacy tracker with known issues
npm run start-legacy
```

**Problems with Legacy Tracker:**
- ❌ **Misses session endings** - File watcher doesn't detect when you exit Claude
- ❌ **Race conditions** - Changes can be missed due to file system timing
- ❌ **Limited detection** - Only tracks input/output, ignores cache tokens
- ❌ **No error recovery** - Fails silently without indication
- ❌ **Unreliable on macOS** - File system events are inconsistent

**Solution:** Always use the robust tracker with `npm start`

---

## 📖 Table of Contents
1. [Quick Start](#quick-start)
2. [Installation & Setup](#installation--setup)
3. [Core Components](#core-components)
4. [Monitoring System](#monitoring-system)
5. [Reporting Features](#reporting-features)
6. [CLI Commands](#cli-commands)
7. [Data Structure](#data-structure)
8. [Advanced Usage](#advanced-usage)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

## 🚀 Quick Start

**For first-time users:** Complete the [One-Time Setup Checklist](#-one-time-setup-checklist) above first.

**For existing users:** Your tracker is already running automatically! Just use these commands:

```bash
# View overall usage summary
claude-tokens summary

# View recent sessions  
claude-tokens recent

# View daily statistics
claude-tokens daily

# View current project details
claude-tokens project

# Real-time monitoring (NEW!)
claude-tokens monitor

# Export usage data
claude-tokens export
```

### 🔄 **How It Works After Setup**
1. **Automatic Monitoring**: Service runs in background, no manual start needed
2. **Real-time Tracking**: Monitors `~/.claude.json` for changes automatically  
3. **Instant Reports**: Run any `claude-tokens` command anytime to see current stats
4. **Boot Persistence**: Tracker automatically starts when you restart your Mac

## 🛠 Installation & Setup

### Prerequisites
- Node.js 16+ 
- Claude Code installed and configured
- Active Claude Code sessions (to have data to track)

### Installation Steps
```bash
# 1. Navigate to project directory
cd claude-token-tracker

# 2. Install all dependencies
npm install

# 3. Make CLI executable (optional)
chmod +x src/cli.js

# 4. Install globally (optional)
npm install -g .
```

### Verify Installation
```bash
# Test database creation
node -e "import('./src/database.js').then(({TokenDatabase}) => { const db = new TokenDatabase(); console.log('✅ Database OK'); db.close(); })"

# Test config file access
ls -la ~/.claude.json
```

## 🧩 Core Components

### 1. **Tracker (src/tracker.js)**
- **Purpose**: Real-time monitoring of Claude Code usage
- **Function**: Watches `~/.claude.json` for changes
- **Output**: Stores session data and calculates conversation deltas

### 2. **Database (src/database.js)**
- **Purpose**: SQLite-based data storage and querying
- **Tables**: 
  - `sessions` - Overall session tracking
  - `conversations` - Individual conversation deltas
  - `session_snapshots` - Raw data snapshots
- **Features**: Advanced querying, aggregations, time-based filtering

### 3. **Reporter (src/reporter.js)**
- **Purpose**: Data visualization and analysis
- **Features**: Multiple report types with colored output
- **Export**: JSON data export functionality

### 4. **CLI (src/cli.js)**
- **Purpose**: Command-line interface
- **Features**: Unified commands, help system, argument parsing

## 📊 Monitoring System

### How It Works
1. **File Watching**: Monitors `~/.claude.json` using `chokidar`
2. **Change Detection**: Detects when Claude Code updates session data
3. **Delta Calculation**: Compares previous vs current state
4. **Data Storage**: Stores snapshots and calculates conversation-level usage
5. **Real-time Updates**: Provides live feedback on token usage

### Starting the Monitor
```bash
# Method 1: Using npm script
npm start

# Method 2: Direct execution
node src/tracker.js

# Method 3: Background process
nohup node src/tracker.js > tracker.log 2>&1 &
```

### Monitor Output
```
🔍 Monitoring Claude config at: /Users/user/.claude.json
✅ Token tracker started successfully
📊 Use "npm run report" to view token usage

📝 Claude config changed, processing...
💬 New conversation detected in my-project
   Input: +250 | Output: +400 | Cost: +$0.0125
```

### Stopping the Monitor
- **Interactive**: Press `Ctrl+C`
- **Background**: `kill <process_id>` or `pkill -f tracker.js`

## 📈 Reporting Features

### 1. **Overall Summary**
Shows comprehensive usage across all projects.

```bash
npm run report
# or
node src/reporter.js summary
```

**Output includes:**
- All tracked projects
- Session counts per project
- Input/output token totals
- Cost breakdown
- Last activity timestamps
- Grand totals across all projects

### 2. **Project Details**
Deep dive into specific project usage.

```bash
# Current directory project (default)
node src/reporter.js project

# Specific project path
node src/reporter.js project /path/to/project

# Last 60 days instead of default 30
node src/reporter.js project /path/to/project 60
```

**Output includes:**
- Session count for timeframe
- Token usage breakdown (input, output, cache)
- Cost analysis with averages
- Time range (first to last session)
- Activity patterns

### 3. **Recent Sessions**
View latest Claude Code sessions across all projects.

```bash
# Default: last 10 sessions
node src/reporter.js recent

# Last 25 sessions
node src/reporter.js recent 25
```

**Output includes:**
- Session IDs (truncated for readability)
- Project paths
- Start/end timestamps
- Token counts (input/output)
- Session costs

### 4. **Daily Statistics**
Analyze usage patterns over time.

```bash
# Default: last 7 days
node src/reporter.js daily

# Last 30 days
node src/reporter.js daily 30
```

**Output includes:**
- Date-by-date breakdown
- Session counts per day
- Daily token totals
- Daily cost analysis
- Trend visualization

### 5. **Session Details**
Comprehensive information about specific sessions.

```bash
# Using full session ID
node src/reporter.js session 953809ed-e958-4a54-be9a-047e15e59dea

# Using truncated ID (first 8+ characters)
node src/reporter.js session 953809ed
```

**Output includes:**
- Complete session metadata
- Detailed token breakdown
- Cache usage statistics
- Code modification stats (lines added/removed)
- Duration and API timing
- Conversation count within session

### 6. **Data Export**
Export all data for external analysis.

```bash
# Default export file
node src/reporter.js export

# Custom output file
node src/reporter.js export my-usage-data.json

# Export with custom path
node src/reporter.js export /path/to/export/data.json
```

**Export includes:**
- Export timestamp
- All project summaries
- Recent sessions (last 50)
- Daily statistics (last 30 days)
- Raw data for further analysis

## 🖥 CLI Commands

### Global Installation
```bash
npm install -g .
claude-tokens --help
```

### Available Commands

#### **Summary Command**
```bash
claude-tokens summary
claude-tokens  # default command
```

#### **Project Analysis**
```bash
# Current directory
claude-tokens project

# Specific path
claude-tokens project /path/to/project

# Custom timeframe
claude-tokens project /path/to/project --days 60
claude-tokens project /path/to/project -d 60
```

#### **Recent Sessions**
```bash
# Default limit
claude-tokens recent

# Custom limit
claude-tokens recent --limit 25
claude-tokens recent -l 25
```

#### **Daily Statistics**
```bash
# Default timeframe
claude-tokens daily

# Custom timeframe
claude-tokens daily --days 14
claude-tokens daily -d 14
```

#### **Session Details**
```bash
claude-tokens session <session-id>
claude-tokens session 953809ed
```

#### **Data Export**
```bash
claude-tokens export
claude-tokens export custom-filename.json
```

#### **Real-Time Monitoring** (NEW!)
```bash
# Monitor all projects
claude-tokens monitor

# Monitor with custom polling interval
claude-tokens monitor --interval 500
claude-tokens monitor -i 2000

# Monitor specific project only
claude-tokens monitor --project "/path/to/project"
claude-tokens monitor -p "/Users/anirudhgupta/Code/anushka-mock-interview"

# Combined options
claude-tokens monitor -p "/path/to/project" -i 1500
```

#### **Start Monitoring**
```bash
claude-tokens start
```

## 📋 Data Structure

### Database Schema

#### **Sessions Table**
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,                    -- Claude session ID
  project_path TEXT NOT NULL,             -- Project directory path
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME,                      -- Last activity timestamp
  total_input_tokens INTEGER DEFAULT 0,   -- Cumulative input tokens
  total_output_tokens INTEGER DEFAULT 0,  -- Cumulative output tokens
  total_cache_creation_tokens INTEGER DEFAULT 0,
  total_cache_read_tokens INTEGER DEFAULT 0,
  total_cost_usd REAL DEFAULT 0,         -- Total session cost
  api_duration_ms INTEGER DEFAULT 0,      -- API call duration
  total_duration_ms INTEGER DEFAULT 0,    -- Total session duration
  lines_added INTEGER DEFAULT 0,          -- Code lines added
  lines_removed INTEGER DEFAULT 0,        -- Code lines removed
  web_search_requests INTEGER DEFAULT 0   -- Web search count
);
```

#### **Conversations Table**
```sql
CREATE TABLE conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,              -- Links to sessions.id
  conversation_index INTEGER NOT NULL,    -- Order within session
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME,
  input_tokens INTEGER DEFAULT 0,        -- Delta input tokens
  output_tokens INTEGER DEFAULT 0,       -- Delta output tokens
  cache_creation_tokens INTEGER DEFAULT 0,
  cache_read_tokens INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0                -- Delta cost
);
```

#### **Session Snapshots Table**
```sql
CREATE TABLE session_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  project_path TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  raw_data TEXT NOT NULL,               -- Full JSON from .claude.json
  input_tokens INTEGER,                 -- Snapshot values
  output_tokens INTEGER,
  cache_creation_tokens INTEGER,
  cache_read_tokens INTEGER,
  cost_usd REAL
);
```

### Data Flow
1. **File Change** → `~/.claude.json` modified by Claude Code
2. **Detection** → Chokidar detects file change
3. **Processing** → Extract project data and calculate deltas
4. **Storage** → Store session, conversation, and snapshot data
5. **Reporting** → Query database for various report types

## 🔧 Advanced Usage

### Background Monitoring
```bash
# Start as daemon process
nohup node src/tracker.js > /dev/null 2>&1 &

# Check if running
ps aux | grep tracker.js

# Stop background process
pkill -f tracker.js
```

### Custom Analysis Queries
Access the database directly for custom analysis:

```javascript
import { TokenDatabase } from './src/database.js';

const db = new TokenDatabase();

// Custom query example
const expensiveSessions = db.db.prepare(`
  SELECT project_path, total_cost_usd, total_input_tokens, total_output_tokens
  FROM sessions 
  WHERE total_cost_usd > 1.0
  ORDER BY total_cost_usd DESC
`).all();

console.log('Most expensive sessions:', expensiveSessions);
db.close();
```

### Automated Reporting
Create scheduled reports:

```bash
# Create daily report script
cat > daily_report.sh << 'EOF'
#!/bin/bash
echo "Daily Claude Usage Report - $(date)" > daily_report.txt
node src/reporter.js daily >> daily_report.txt
echo "Generated: $(date)" >> daily_report.txt
EOF

chmod +x daily_report.sh

# Schedule with cron (runs daily at 9 AM)
echo "0 9 * * * /path/to/claude-token-tracker/daily_report.sh" | crontab -
```

### Data Migration
Export and import data between systems:

```bash
# Export current data
node src/reporter.js export backup-$(date +%Y%m%d).json

# To restore, you would need to process the JSON back into the database
# (Custom script required for import functionality)
```

## 🔍 Troubleshooting

### ⚠️ **Most Common Issue: Tracker Not Running**

**Symptoms:**
- Stats don't update despite active Claude Code usage
- Cost remains the same across sessions
- `claude-tokens summary` shows old data

**Diagnosis:**
```bash
# Check if service is running
launchctl list | grep claude

# If no output, service is not running
```

**Fix:**
```bash
# Restart the service
launchctl unload ~/Library/LaunchAgents/com.claude.tokentracker.plist
launchctl load ~/Library/LaunchAgents/com.claude.tokentracker.plist

# Or re-run setup
./setup-auto-tracking.sh
```

### 🐛 **Other Common Issues**

#### **"No data found" Error**
```bash
# Check if Claude Code config exists and has data
ls -la ~/.claude.json
cat ~/.claude.json | grep -A5 lastSessionId

# Check service logs for errors
tail -20 tracker.log
tail -20 tracker-error.log
```

#### **Token Updates Delayed**
- **Normal behavior**: Claude Code updates token counts periodically, not immediately
- **Wait time**: Usually updates within 5-10 minutes or when session ends
- **Workaround**: End your Claude Code session to force an update

#### **Service Won't Start**
```bash
# Check Node.js path is correct
which node

# Update plist file with correct path
./setup-auto-tracking.sh  # This will recreate with correct paths
```

#### **Database Permission Issues**
```bash
# Fix data directory permissions
chmod -R 755 data/
rm -f data/tokens.db  # Will recreate automatically
```

#### **Multiple Processes Running**
```bash
# Kill all tracker processes and restart service
pkill -f tracker.js
launchctl unload ~/Library/LaunchAgents/com.claude.tokentracker.plist
launchctl load ~/Library/LaunchAgents/com.claude.tokentracker.plist
```

### Debug Mode
Enable verbose logging:

```bash
# Add debug logging to tracker.js
DEBUG=1 node src/tracker.js
```

### Validation Commands
```bash
# Test database connectivity
node -e "import('./src/database.js').then(({TokenDatabase}) => { const db = new TokenDatabase(); console.log('DB OK'); db.close(); })"

# Test file watching
node -e "import('chokidar').then(c => { c.default.watch('~/.claude.json').on('change', () => console.log('File changed!')); })"

# Verify Claude Code is working
claude doctor
```

## 💡 Best Practices

### 1. **Continuous Monitoring**
- Keep tracker running continuously for complete data
- Use process managers like PM2 for production environments
- Set up automatic restarts on system reboot

### 2. **Regular Data Backup**
```bash
# Weekly backup script
cp data/tokens.db "backups/tokens-$(date +%Y%m%d).db"
node src/reporter.js export "exports/weekly-$(date +%Y%m%d).json"
```

### 3. **Performance Optimization**
- Monitor database size (SQLite handles GBs efficiently)
- Archive old data if needed (>1 year)
- Use indexes for custom queries

### 4. **Security Considerations**
- Database contains usage patterns but no code content
- Protect `.claude.json` file appropriately
- Consider encryption for sensitive environments

### 5. **Integration Ideas**
- Export to Excel/Google Sheets for team reporting
- Create Slack/Discord bots for usage notifications
- Build dashboards with tools like Grafana
- Set up cost alerts for budget management

### 6. **Team Usage**
```bash
# Each team member runs their own tracker
# Aggregate data using export functionality
# Create team reports by combining individual exports
```

This comprehensive guide covers all aspects of the Claude Token Tracker. For additional questions or feature requests, refer to the project's documentation or create custom extensions based on the provided architecture.