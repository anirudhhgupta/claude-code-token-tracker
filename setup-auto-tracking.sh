#!/bin/bash

# Claude Token Tracker - Fully Automated Setup Script
# This script sets up permanent automatic tracking that starts on system boot

set -e

echo "🚀 Setting up Claude Token Tracker for fully automated operation..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TRACKER_DIR="$SCRIPT_DIR"

# Check if we're in the right directory
if [ ! -f "$TRACKER_DIR/package.json" ]; then
    echo "❌ Error: This script must be run from the claude-token-tracker directory"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "$TRACKER_DIR/node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Kill any existing tracker processes
echo "🛑 Stopping any existing tracker processes..."
pkill -f "tracker.js" || true
launchctl unload ~/Library/LaunchAgents/com.claude.tokentracker.plist 2>/dev/null || true
sleep 2

# Get the correct Node.js path
NODE_PATH=$(which node)
echo "📍 Using Node.js at: $NODE_PATH"

# Create the launchd plist file with correct paths
PLIST_FILE="$TRACKER_DIR/com.claude.tokentracker.plist"
cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.claude.tokentracker</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>$NODE_PATH</string>
        <string>$TRACKER_DIR/src/tracker.js</string>
    </array>
    
    <key>WorkingDirectory</key>
    <string>$TRACKER_DIR</string>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>KeepAlive</key>
    <true/>
    
    <key>StandardOutPath</key>
    <string>$TRACKER_DIR/tracker.log</string>
    
    <key>StandardErrorPath</key>
    <string>$TRACKER_DIR/tracker-error.log</string>
    
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:$(dirname $NODE_PATH)</string>
    </dict>
    
    <key>ThrottleInterval</key>
    <integer>10</integer>
    
    <key>ExitTimeOut</key>
    <integer>30</integer>
</dict>
</plist>
EOF

# Install the launchd service
echo "⚙️  Installing macOS system service..."
cp "$PLIST_FILE" ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.claude.tokentracker.plist

# Wait a moment for startup
sleep 5

# Check if service is running
if launchctl list | grep -q com.claude.tokentracker; then
    echo "✅ Claude Token Tracker service installed and running!"
    echo "🔄 The tracker will now start automatically on system boot"
    echo "📊 All projects in $HOME/Code are being tracked automatically"
    echo ""
    echo "Usage Commands (available immediately):"
    echo "  claude-tokens summary   - View overall usage statistics"
    echo "  claude-tokens project   - View current project details"
    echo "  claude-tokens recent    - View recent sessions"
    echo "  claude-tokens daily     - View daily usage trends"
    echo "  claude-tokens export    - Export data to JSON"
    echo ""
    echo "Service Management:"
    echo "  launchctl list | grep claude        - Check if service is running"
    echo "  launchctl unload ~/Library/LaunchAgents/com.claude.tokentracker.plist  - Stop service"
    echo "  launchctl load ~/Library/LaunchAgents/com.claude.tokentracker.plist    - Start service"
    echo ""
    echo "Log Files:"
    echo "  📝 Output: $TRACKER_DIR/tracker.log"
    echo "  ❌ Errors: $TRACKER_DIR/tracker-error.log"
    echo ""
    echo "🎉 SETUP COMPLETE! You can now:"
    echo "   1. Restart your Mac - tracker will auto-start"
    echo "   2. Use Claude Code normally"
    echo "   3. Run 'claude-tokens summary' anytime to see usage"
else
    echo "❌ Failed to install service. Check logs:"
    tail -20 tracker.log 2>/dev/null || echo "No log file found"
    exit 1
fi

# Install CLI globally if not already installed
if ! command -v claude-tokens &> /dev/null; then
    echo "🔧 Installing claude-tokens CLI globally..."
    npm install -g .
    echo "✅ CLI installed globally - 'claude-tokens' command available everywhere"
fi

echo ""
echo "🚀 FULLY AUTOMATED SETUP COMPLETE!"
echo "   ✅ Service starts automatically on boot"
echo "   ✅ Tracks all Claude Code usage automatically"  
echo "   ✅ No manual intervention needed"
echo "   ✅ Just use 'claude-tokens summary' anytime!"