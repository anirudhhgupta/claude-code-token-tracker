# Claude Token Tracker 📊

> **Comprehensive token usage analytics for Claude Code with **ROBUST** real-time monitoring, detailed reporting, and conversation-level tracking.**

⚠️ **MAJOR UPDATE**: Now includes **RobustClaudeTokenTracker** that fixes all reliability issues with the original file-watching system.

[![Node.js](https://img.shields.io/badge/Node.js-16%2B-green.svg)](https://nodejs.org/)
[![SQLite](https://img.shields.io/badge/SQLite-3-blue.svg)](https://sqlite.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🌟 Features

### 📈 **Multi-Level Analytics**
- **Session-level tracking** - Complete Claude Code sessions
- **Conversation-level deltas** - Individual conversation costs within sessions
- **Project-level summaries** - Usage patterns per codebase
- **Daily trend analysis** - Historical usage patterns

### 🔄 **Robust Real-Time Monitoring**
- **Aggressive polling** - 500ms polling ensures NO missed changes (replaces unreliable file-watching)
- **Complete change detection** - Tracks ALL token changes, not just input/output
- **Error recovery** - Bulletproof error handling with automatic retry
- **Adaptive frequency** - Fast polling during active sessions, slower when idle
- **Session boundary detection** - Never misses session endings or transitions

### 💾 **Robust Data Storage**
- **SQLite database** - Fast, reliable local storage
- **Three-table schema** - Sessions, conversations, and raw snapshots
- **Data integrity** - Foreign key constraints and indexed queries
- **Backup-friendly** - Single database file for easy backup/migration

### 🎨 **Rich Reporting Interface**
- **Colored CLI output** - Easy-to-read terminal reports
- **Multiple report types** - Summary, project, daily, session details
- **Flexible timeframes** - Custom date ranges and limits
- **Data export** - JSON export for external analysis

## 🚀 Quick Start

### ✅ **Robust Tracker Setup** (Recommended)
```bash
git clone <repository-url>
cd claude-token-tracker
npm install

# Start the new robust tracker (recommended)
npm start

# Or with debug output to see every token change
npm run start-debug
```

**✨ What you get with the robust tracker:**
- ⚡ **500ms aggressive polling** - Never misses token changes
- 🔍 **Tracks EVERY change** - Input, output, cache tokens, costs, session endings
- 🛡️ **Bulletproof error recovery** - Continues running through failures
- 📊 **Real-time feedback** - See every conversation and token change instantly
- 🚀 **Adaptive performance** - Fast when active, efficient when idle

### 📊 **Instant Usage Reports** (Available after setup)
```bash
# Overall summary - your main command
claude-tokens summary

# Recent sessions
claude-tokens recent

# Daily statistics  
claude-tokens daily

# Current project details
claude-tokens project

# Real-time monitoring - NEW!
claude-tokens monitor

# Export data to JSON
claude-tokens export
```

### ⚠️ **Legacy Tracker** (Not Recommended)
```bash
# Old file-watching system - has reliability issues
npm run start-legacy
```

**Issues with legacy tracker:**
- ❌ Misses session endings
- ❌ Only tracks input/output changes  
- ❌ File-watching race conditions
- ❌ No error recovery
- ⚠️ **Use robust tracker instead**

## 📋 Usage Examples

### Basic Usage
```bash
# Start robust monitoring (recommended)
npm start

# Start with debug output
npm run start-debug

# Check your usage summary
npm run report
```

### Detailed Analysis
```bash
# Project-specific analysis (last 30 days)
node src/reporter.js project /path/to/my-project

# Recent activity (last 20 sessions)
node src/reporter.js recent 20

# Weekly trends
node src/reporter.js daily 7

# Specific session details
node src/reporter.js session 953809ed

# Export for external analysis
node src/reporter.js export my-usage-data.json
```

### CLI Commands (Global Installation)
```bash
# Install globally
npm install -g .

# Use anywhere
claude-tokens summary
claude-tokens project --days 60
claude-tokens recent --limit 15
claude-tokens daily --days 14
claude-tokens session <session-id>
claude-tokens monitor              # NEW: Real-time monitoring
claude-tokens export
```

## 📊 Sample Output

### Summary Report
```
📊 CLAUDE CODE TOKEN USAGE SUMMARY

Projects:
────────────────────────────────────────────────────────────────────────────────
📁 /Users/user/Code/my-ai-project
   Sessions: 12
   Input tokens: 45,230
   Output tokens: 67,890
   Total cost: $5.2341
   Last activity: 8/5/2025, 2:30:15 PM

📁 /Users/user/Code/web-scraper
   Sessions: 8
   Input tokens: 23,100
   Output tokens: 31,200
   Total cost: $2.1045
   Last activity: 8/4/2025, 11:15:30 AM

Overall Totals:
────────────────────────────────────────────────────────────────────────────────
Total sessions: 20
Total input tokens: 68,330
Total output tokens: 99,090
Total tokens: 167,420
Total cost: $7.3386
```

### Daily Statistics
```
📈 DAILY USAGE (Last 7 days)

Date       Sessions  Input     Output    Cost
────────────────────────────────────────────────────────────
2025-08-05        3     8,420    12,340   $1.2450
2025-08-04        5    15,200    23,100   $2.8900
2025-08-03        2     4,500     6,200   $0.7800
2025-08-02        4    11,300    16,800   $1.9200
2025-08-01        1     2,100     3,400   $0.4100
────────────────────────────────────────────────────────────
Total            15    41,520    61,840   $7.2450
```

### Session Details
```
🔍 SESSION DETAILS: 953809ed-e958-4a54-be9a-047e15e59dea

Session Info:
────────────────────────────────────────────────────────────
ID: 953809ed-e958-4a54-be9a-047e15e59dea
Project: /Users/user/Code/claude-token-tracker
Started: 8/5/2025, 10:30:22 AM
Ended: 8/5/2025, 11:45:18 AM
Duration: 4496.0s

Token Usage:
────────────────────────────────────────────────────────────
Input tokens: 10,871
Output tokens: 27,937
Cache creation: 182,349
Cache read: 2,596,523
Total cost: $1.8872

Activity:
────────────────────────────────────────────────────────────
Lines added: 1,059
Lines removed: 139
Web searches: 0
Conversations: 8
```

### Real-Time Monitor
```
🔍 REAL-TIME TOKEN MONITOR

🔍 Monitoring session in claude-token-tracker
   Session: b55aa152...
   Current: 17,015/1,647/97,353 tokens
   Cost: $0.480625

Polling every 1000ms for changes...

💬 Token change in claude-token-tracker [1:55:23 PM]
   Session: b55aa152...
   Input: +15
   Output: +0
   Cache Creation: +0
   Cache Read: +0
   Cost: +$0.000045
   Code: +5 added, +0 removed
```

## 🏗 Architecture

### Core Components

#### **1. Robust Tracker (`src/robust-tracker.js`)** - RECOMMENDED
- **Aggressive polling** of `~/.claude.json` (500ms intervals)
- **Complete change detection** - ALL token types, costs, session states
- **Error recovery** with consecutive error counting and auto-shutdown
- **Adaptive polling** based on session activity
- **Session boundary detection** that never misses endings

#### **1a. Legacy Tracker (`src/tracker.js`)** - NOT RECOMMENDED
- **Unreliable file watching** with race conditions
- **Limited change detection** - only input/output tokens
- **No error recovery** - fails silently
- ⚠️ **Known to miss session endings and token changes**

#### **2. Database (`src/database.js`)**
- **SQLite storage** with optimized schema
- **Three main tables**:
  - `sessions` - Overall session tracking
  - `conversations` - Individual conversation deltas  
  - `session_snapshots` - Raw data preservation
- **Advanced querying** with indexes and aggregations

#### **3. Reporter (`src/reporter.js`)**
- **Multiple report types** with rich formatting
- **Flexible data filtering** by time, project, session
- **Export functionality** for external tools
- **Colored terminal output** for better readability

#### **4. CLI (`src/cli.js`)**
- **Command-line interface** with argument parsing
- **Global installation** support
- **Help system** and error handling
- **Unified access** to all functionality

### Data Flow
### Robust Architecture
```
Claude Code Usage → ~/.claude.json → Aggressive Poller (500ms) → Complete State Tracker → SQLite DB → Reports
                                   ↓
                            Error Recovery & Logging
```

### Legacy Architecture (Unreliable)
```
Claude Code Usage → ~/.claude.json → File Watcher (unreliable) → Limited Delta Calculator → SQLite DB → Reports
                                   ↓
                            ❌ Race conditions & missed changes
```

## 🔧 Advanced Features

### 🤖 **Fully Automated System Service**

#### Auto Setup Script
The `setup-auto-tracking.sh` script provides complete automated installation:

```bash
# One command sets up everything permanently
./setup-auto-tracking.sh
```

**What it does:**
- ✅ Installs all dependencies automatically
- 🛑 Stops any conflicting processes
- 🔧 Creates macOS system service (launchd)
- 🚀 Installs service to start automatically on boot
- 📁 Auto-discovers all projects in `/Users/anirudhgupta/Code`
- 🔍 Continuously monitors for new projects
- 🌐 Installs CLI globally (`claude-tokens` command available everywhere)
- 📝 Sets up proper logging and error handling
- 🔄 Configures automatic restart if service crashes

#### Service Management
```bash
# Check if service is running
launchctl list | grep claude

# Stop service  
launchctl unload ~/Library/LaunchAgents/com.claude.tokentracker.plist

# Start service
launchctl load ~/Library/LaunchAgents/com.claude.tokentracker.plist

# View logs
tail -f /Users/anirudhgupta/Code/claude-token-tracker/tracker.log
```

#### Manual Background Processing
```bash
# Run as daemon
nohup node src/tracker.js > tracker.log 2>&1 &

# Check status
ps aux | grep tracker.js

# Stop daemon
pkill -f tracker.js
```

### Custom Database Queries
```javascript
import { TokenDatabase } from './src/database.js';

const db = new TokenDatabase();

// Find most expensive sessions
const expensive = db.db.prepare(`
  SELECT project_path, total_cost_usd, started_at
  FROM sessions 
  WHERE total_cost_usd > 2.0
  ORDER BY total_cost_usd DESC
`).all();

console.log(expensive);
db.close();
```

### Automated Reporting
```bash
# Daily report automation
echo "0 9 * * * cd /path/to/tracker && node src/reporter.js daily > daily-report.txt" | crontab -

# Weekly summary email
echo "0 9 * * 1 cd /path/to/tracker && node src/reporter.js summary | mail -s 'Weekly Claude Usage' user@email.com" | crontab -
```

### Data Export & Analysis
```bash
# Export for spreadsheet analysis
node src/reporter.js export usage-data.json

# Convert to CSV (requires jq)
cat usage-data.json | jq -r '.recentSessions[] | [.id, .project_path, .total_cost_usd] | @csv' > sessions.csv
```

## 📁 Project Structure

```
claude-token-tracker/
├── package.json              # Dependencies and scripts
├── README.md                 # This file
├── USAGE_GUIDE.md           # Comprehensive usage guide
├── src/
│   ├── tracker.js           # Real-time monitoring
│   ├── database.js          # SQLite operations
│   ├── reporter.js          # Report generation
│   └── cli.js               # Command-line interface
└── data/
    └── tokens.db            # SQLite database (auto-created)
```

## 🛠 Installation & Setup

### Prerequisites
- **Node.js 16+** - Runtime environment
- **Claude Code** - Installed and configured
- **Active usage** - Some Claude Code sessions to track

### Step-by-Step Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd claude-token-tracker
   npm install
   ```

2. **Verify Claude Code Setup**
   ```bash
   # Check Claude config exists
   ls -la ~/.claude.json
   
   # Verify Claude Code is working
   claude doctor
   ```

3. **Start Monitoring**
   ```bash
   # Start tracker
   npm start
   
   # Use Claude Code normally
   # Tracker will automatically detect and record usage
   ```

4. **View Reports**
   ```bash
   # Check your usage
   npm run report
   ```

5. **Optional: Global Installation**
   ```bash
   npm install -g .
   claude-tokens --help
   ```

## 📊 Database Schema

### Sessions Table
Tracks overall Claude Code sessions with cumulative totals.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PRIMARY KEY | Claude session UUID |
| `project_path` | TEXT | Project directory path |
| `started_at` | DATETIME | Session start time |
| `ended_at` | DATETIME | Last activity time |
| `total_input_tokens` | INTEGER | Cumulative input tokens |
| `total_output_tokens` | INTEGER | Cumulative output tokens |
| `total_cache_creation_tokens` | INTEGER | Cache creation tokens |
| `total_cache_read_tokens` | INTEGER | Cache read tokens |
| `total_cost_usd` | REAL | Total session cost |
| `api_duration_ms` | INTEGER | API call duration |
| `total_duration_ms` | INTEGER | Total session duration |
| `lines_added` | INTEGER | Code lines added |
| `lines_removed` | INTEGER | Code lines removed |
| `web_search_requests` | INTEGER | Web search count |

### Conversations Table
Tracks individual conversations within sessions using delta calculations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Auto-increment ID |
| `session_id` | TEXT | Links to sessions table |
| `conversation_index` | INTEGER | Order within session |
| `started_at` | DATETIME | Conversation start |
| `ended_at` | DATETIME | Conversation end |
| `input_tokens` | INTEGER | Delta input tokens |
| `output_tokens` | INTEGER | Delta output tokens |
| `cache_creation_tokens` | INTEGER | Delta cache creation |
| `cache_read_tokens` | INTEGER | Delta cache read |
| `cost_usd` | REAL | Delta cost |

### Session Snapshots Table
Preserves raw data from Claude Code for audit trails and debugging.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Auto-increment ID |
| `session_id` | TEXT | Links to sessions table |
| `project_path` | TEXT | Project directory |
| `timestamp` | DATETIME | Snapshot time |
| `raw_data` | TEXT | Full JSON from .claude.json |
| `input_tokens` | INTEGER | Snapshot input tokens |
| `output_tokens` | INTEGER | Snapshot output tokens |
| `cache_creation_tokens` | INTEGER | Snapshot cache creation |
| `cache_read_tokens` | INTEGER | Snapshot cache read |
| `cost_usd` | REAL | Snapshot cost |

## 🎯 Use Cases

### **Individual Developers**
- **Track personal usage** across different projects
- **Monitor costs** to manage API spending
- **Analyze productivity patterns** by time and project
- **Historical analysis** of coding efficiency

### **Development Teams**
- **Project cost allocation** - Track usage per project
- **Team usage monitoring** - Individual developer tracking
- **Budget management** - Cost alerts and limits
- **Usage optimization** - Identify expensive patterns

### **Organizations**
- **Department tracking** - Usage by team/department
- **Cost center allocation** - Charge back to projects
- **Usage policies** - Monitor compliance
- **ROI analysis** - Productivity vs cost analysis

### **Freelancers/Consultants**
- **Client billing** - Accurate usage tracking per client
- **Project estimates** - Historical data for pricing
- **Cost analysis** - Optimize tool usage for profitability
- **Time tracking** - Correlate usage with billable hours

## 🔍 Troubleshooting

### ⚠️ **#1 Issue: Stats Not Updating**

**Problem:** You're using Claude Code but `claude-tokens summary` shows old data

**Most Common Cause:** Using the unreliable legacy tracker instead of robust tracker

**Solution:**
```bash
# Switch to robust tracker immediately
npm start  # This uses robust tracker by default

# Or with debug output to verify it's working
npm run start-debug

# Stop any legacy trackers
pkill -f tracker.js
```

**If robust tracker is already running but still not updating:**
```bash
# Check if robust tracker is running
ps aux | grep robust-tracker

# Check for errors
tail -20 tracker.log
```

### 🐛 **Other Common Issues**

#### **"No data found" Error**  
```bash
# Verify Claude Code is configured and has sessions
ls -la ~/.claude.json
cat ~/.claude.json | grep lastSessionId

# Check service logs
tail -20 tracker.log
tail -20 tracker-error.log
```

#### **Token Updates Are Delayed**
- **With robust tracker**: Updates detected within 500ms of Claude Code writing changes
- **With legacy tracker**: May be delayed or missed entirely due to file-watching issues
- **Solution**: Use robust tracker with `npm start` for real-time updates
- **Debug**: Use `npm run start-debug` to see changes as they happen

#### **Service Won't Start**
```bash
# Check Node.js path
which node

# Recreate service with correct paths
./setup-auto-tracking.sh
```

#### **Database Issues**
```bash
# Reset database (will recreate automatically)
rm -f data/tokens.db
launchctl unload ~/Library/LaunchAgents/com.claude.tokentracker.plist
launchctl load ~/Library/LaunchAgents/com.claude.tokentracker.plist
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=1 node src/tracker.js

# Verbose database operations
SQLITE_DEBUG=1 node src/tracker.js
```

### Validation Commands
```bash
# Test database
node -e "import('./src/database.js').then(({TokenDatabase}) => { const db = new TokenDatabase(); console.log('✅ Database OK'); db.close(); })"

# Test reporter
npm run report

# Test CLI
node src/cli.js --help
```

## 🔒 Security & Privacy

### Data Security
- **Local storage only** - All data stays on your machine
- **No network transmission** - Purely local file monitoring
- **No code content** - Only tracks token usage metrics
- **Standard file permissions** - Uses OS-level security

### Privacy Considerations
- **Usage patterns only** - No actual code or prompts stored
- **Project paths** - Directory names are stored (consider sensitive paths)
- **Session metadata** - Timestamps and usage statistics only
- **Raw snapshots** - Limited metadata from Claude config

### Best Practices
- **Secure the database** - `chmod 600 data/tokens.db`
- **Backup encryption** - Encrypt backups if needed
- **Access control** - Limit database file access
- **Regular cleanup** - Archive old data periodically

## 🤝 Contributing

### Development Setup
```bash
git clone <repository-url>
cd claude-token-tracker
npm install

# Run tests
npm test

# Development mode with auto-restart
npm run dev
```

### Code Style
- **ES Modules** - Modern JavaScript module system
- **Async/await** - Promise-based async handling
- **Error handling** - Comprehensive error catching
- **Comments** - Inline documentation for complex logic

### Feature Requests
- **Database enhancements** - Additional metrics or tables
- **Report improvements** - New visualization options
- **Export formats** - CSV, Excel, API endpoints
- **Integration** - External tool connections

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Claude Code** - Anthropic's excellent coding assistant
- **better-sqlite3** - High-performance SQLite driver
- **chokidar** - Reliable file system watching
- **chalk** - Beautiful terminal colors
- **commander** - CLI argument parsing

---

## 🔗 Quick Links

- 📖 **[Complete Usage Guide](USAGE_GUIDE.md)** - Detailed documentation
- 🐛 **[Issue Tracker](https://github.com/user/claude-token-tracker/issues)** - Bug reports and features
- 💬 **[Discussions](https://github.com/user/claude-token-tracker/discussions)** - Community support
- 📝 **[Changelog](CHANGELOG.md)** - Release notes and updates

**Happy tracking! 🚀**