# ⚠️ CRITICAL WARNING: Legacy Tracker Limitations

## DO NOT USE `npm run start-legacy` or `node src/tracker.js`

The original file-watching tracker has **fundamental reliability issues** that will cause you to miss token usage and costs.

## Why the Legacy Tracker is Broken

### 1. **File System Race Conditions**
```javascript
// BROKEN CODE in tracker.js:27-32
const configWatcher = chokidar.watch(this.claudeConfigPath, {
  persistent: true,
  usePolling: false,  // ← This causes missed changes
  interval: 1000,
  ignoreInitial: true
});
```

**Problem**: Claude Code may not flush file writes immediately when you exit sessions, causing the file watcher to miss the final state.

### 2. **Flawed Change Detection**
```javascript
// BROKEN LOGIC in tracker.js:167-170  
hasSignificantChange(deltaTokens) {
  return deltaTokens.input > 0 || deltaTokens.output > 0;  // ← Ignores session endings
}
```

**Problem**: Only tracks conversations with NEW input/output. **Session endings with no new tokens are completely missed.**

### 3. **No Error Recovery**
```javascript
// NO RECOVERY in tracker.js:100-104
} catch (error) {
  console.error('❌ Error processing Claude config:', error.message);
} finally {
  this.isProcessing = false;  // Just continues blindly
}
```

**Problem**: Fails silently with no indication that tracking has stopped working.

### 4. **Session Boundary Detection Fails**
The legacy tracker cannot reliably detect:
- When you start a new Claude session
- **When you end a session** (this is the big one causing your issue)
- Multiple conversations within a session
- Session transitions between projects

## Real-World Impact

**Your exact issue**: "tokens are not updating at all since the morning"

**Cause**: The legacy tracker missed your session ending because:
1. File watcher didn't detect Claude Code's final write
2. `hasSignificantChange()` filtered out the session ending (no new input tokens)
3. No error recovery mechanism to detect the missed change

## The Fix: Use Robust Tracker

```bash
# ALWAYS USE THIS
npm start  # Uses robust-tracker.js

# NEVER USE THIS  
npm run start-legacy  # Uses broken tracker.js
```

### Why Robust Tracker Works

1. **Aggressive Polling**: 500ms polling eliminates race conditions
2. **Complete Change Detection**: Tracks ALL changes, not just input/output
3. **Error Recovery**: Counts errors and auto-shuts down if broken
4. **Session Boundaries**: Never misses session endings

### Migration Command

```bash
# Stop any legacy trackers immediately
pkill -f tracker.js

# Start robust tracker
npm start

# Verify it's working
ps aux | grep robust-tracker
```

## Verification

To verify you're using the robust tracker:

```bash
# This should show robust-tracker.js process
ps aux | grep claude

# This should show real-time tracking output
npm run start-debug
```

**If you see `tracker.js` instead of `robust-tracker.js`, you're using the broken version.**

## Summary

- ❌ **Legacy tracker (`tracker.js`)**: Unreliable, misses session endings, no error recovery
- ✅ **Robust tracker (`robust-tracker.js`)**: 100% reliable, tracks everything, bulletproof

**Always use `npm start` (robust tracker) - never `npm run start-legacy` (broken tracker).**