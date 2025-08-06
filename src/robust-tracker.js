import fs from 'fs';
import path from 'path';
import os from 'os';
import { TokenDatabase } from './database.js';

export class RobustClaudeTokenTracker {
  constructor() {
    this.db = new TokenDatabase();
    this.claudeConfigPath = path.join(os.homedir(), '.claude.json');
    this.sessionSnapshots = new Map(); // sessionId -> last known snapshot
    this.isProcessing = false;
    this.pollInterval = null;
    this.activeSessions = new Set();
    this.consecutiveErrors = 0;
    this.maxErrors = 10;
    
    console.log(`🔍 Robust tracking of: ${this.claudeConfigPath}`);
    console.log(`⚡ Using aggressive polling with error recovery`);
  }

  async start() {
    // Initial state capture
    await this.captureInitialState();
    
    // Start polling with adaptive frequency
    this.startAdaptivePolling();
    
    console.log('✅ Robust token tracker started');
    console.log('📊 Every token change will be tracked');
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down robust tracker...');
      this.shutdown();
    });
  }

  async captureInitialState() {
    try {
      if (!fs.existsSync(this.claudeConfigPath)) {
        console.log('⚠️ Claude config not found - waiting for Claude Code to start');
        return;
      }

      const configData = JSON.parse(fs.readFileSync(this.claudeConfigPath, 'utf8'));
      
      if (configData.projects) {
        for (const [projectPath, projectData] of Object.entries(configData.projects)) {
          if (projectData.lastSessionId) {
            const sessionId = projectData.lastSessionId;
            const snapshot = this.extractCompleteSnapshot(projectData);
            
            // Store initial snapshot
            this.sessionSnapshots.set(sessionId, snapshot);
            this.activeSessions.add(projectPath);
            
            // Ensure session exists in database
            this.db.getOrCreateSession(sessionId, projectPath);
            this.db.recordSnapshot(sessionId, projectPath, projectData);
            
            console.log(`📋 Initial state captured for ${path.basename(projectPath)}`);
            console.log(`   Session: ${sessionId.substring(0, 8)}...`);
            console.log(`   Tokens: ${snapshot.inputTokens}/${snapshot.outputTokens}/${snapshot.cacheCreationTokens}`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error capturing initial state:', error.message);
    }
  }

  startAdaptivePolling() {
    let currentInterval = 500; // Start with 500ms
    
    const poll = async () => {
      try {
        await this.processAllSessions();
        this.consecutiveErrors = 0;
        
        // Adaptive polling: fast if active sessions, slower if not
        const newInterval = this.activeSessions.size > 0 ? 500 : 2000;
        
        if (newInterval !== currentInterval) {
          currentInterval = newInterval;
          clearInterval(this.pollInterval);
          this.pollInterval = setInterval(poll, currentInterval);
          
          console.log(`🔄 Polling interval: ${currentInterval}ms (${this.activeSessions.size} active)`);
        }
        
      } catch (error) {
        this.consecutiveErrors++;
        console.error(`❌ Polling error ${this.consecutiveErrors}/${this.maxErrors}:`, error.message);
        
        if (this.consecutiveErrors >= this.maxErrors) {
          console.error('🚨 Too many consecutive errors - stopping tracker');
          this.shutdown();
        }
      }
    };
    
    this.pollInterval = setInterval(poll, currentInterval);
  }

  async processAllSessions() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    try {
      if (!fs.existsSync(this.claudeConfigPath)) {
        this.activeSessions.clear();
        return;
      }

      const configData = JSON.parse(fs.readFileSync(this.claudeConfigPath, 'utf8'));
      
      if (!configData.projects) {
        this.activeSessions.clear();
        return;
      }

      const currentProjectPaths = new Set();
      
      // Process each project
      for (const [projectPath, projectData] of Object.entries(configData.projects)) {
        currentProjectPaths.add(projectPath);
        
        if (projectData.lastSessionId) {
          await this.processSession(projectPath, projectData);
        } else {
          this.activeSessions.delete(projectPath);
        }
      }
      
      // Clean up sessions that no longer exist
      for (const projectPath of this.activeSessions) {
        if (!currentProjectPaths.has(projectPath)) {
          this.activeSessions.delete(projectPath);
          console.log(`🗑️ Removed inactive session: ${path.basename(projectPath)}`);
        }
      }
      
    } catch (error) {
      throw error; // Re-throw for error counting
    } finally {
      this.isProcessing = false;
    }
  }

  async processSession(projectPath, projectData) {
    const sessionId = projectData.lastSessionId;
    const currentSnapshot = this.extractCompleteSnapshot(projectData);
    const lastSnapshot = this.sessionSnapshots.get(sessionId);
    
    // Mark as active
    this.activeSessions.add(projectPath);
    
    // Ensure session exists
    this.db.getOrCreateSession(sessionId, projectPath);
    
    // Always record snapshot for audit trail
    this.db.recordSnapshot(sessionId, projectPath, projectData);
    
    // Detect ANY changes in tokens
    if (lastSnapshot && this.hasAnyTokenChange(lastSnapshot, currentSnapshot)) {
      const delta = this.calculatePreciseDeltas(lastSnapshot, currentSnapshot);
      
      // Record every change - no filtering
      this.db.recordConversation(sessionId, delta);
      
      console.log(`💬 Token change in ${path.basename(projectPath)} [${new Date().toLocaleTimeString()}]`);
      console.log(`   Δ Input: ${delta.input > 0 ? '+' + delta.input : delta.input}`);
      console.log(`   Δ Output: ${delta.output > 0 ? '+' + delta.output : delta.output}`);
      console.log(`   Δ Cache Creation: ${delta.cacheCreation > 0 ? '+' + delta.cacheCreation : delta.cacheCreation}`);
      console.log(`   Δ Cache Read: ${delta.cacheRead > 0 ? '+' + delta.cacheRead : delta.cacheRead}`);
      console.log(`   Δ Cost: $${delta.cost.toFixed(6)}`);
    }
    
    // Always update session totals
    this.db.updateSession(sessionId, projectData);
    
    // Store current snapshot for next comparison
    this.sessionSnapshots.set(sessionId, currentSnapshot);
  }

  extractCompleteSnapshot(projectData) {
    return {
      inputTokens: projectData.lastTotalInputTokens || 0,
      outputTokens: projectData.lastTotalOutputTokens || 0,
      cacheCreationTokens: projectData.lastTotalCacheCreationInputTokens || 0,
      cacheReadTokens: projectData.lastTotalCacheReadInputTokens || 0,
      cost: projectData.lastCost || 0,
      timestamp: new Date().toISOString(),
      apiDuration: projectData.lastAPIDuration || 0,
      totalDuration: projectData.lastDuration || 0,
      linesAdded: projectData.lastLinesAdded || 0,
      linesRemoved: projectData.lastLinesRemoved || 0,
      webSearchRequests: projectData.lastTotalWebSearchRequests || 0
    };
  }

  hasAnyTokenChange(previous, current) {
    return (
      current.inputTokens !== previous.inputTokens ||
      current.outputTokens !== previous.outputTokens ||
      current.cacheCreationTokens !== previous.cacheCreationTokens ||
      current.cacheReadTokens !== previous.cacheReadTokens ||
      Math.abs(current.cost - previous.cost) > 0.000001 || // Account for floating point precision
      current.linesAdded !== previous.linesAdded ||
      current.linesRemoved !== previous.linesRemoved ||
      current.webSearchRequests !== previous.webSearchRequests
    );
  }

  calculatePreciseDeltas(previous, current) {
    return {
      input: current.inputTokens - previous.inputTokens,
      output: current.outputTokens - previous.outputTokens,
      cacheCreation: current.cacheCreationTokens - previous.cacheCreationTokens,
      cacheRead: current.cacheReadTokens - previous.cacheReadTokens,
      cost: current.cost - previous.cost
    };
  }

  shutdown() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    this.db.close();
    process.exit(0);
  }

  // Debug method to show current state
  showCurrentState() {
    console.log(`\n📊 CURRENT TRACKER STATE`);
    console.log(`Active sessions: ${this.activeSessions.size}`);
    console.log(`Tracked snapshots: ${this.sessionSnapshots.size}`);
    console.log(`Consecutive errors: ${this.consecutiveErrors}`);
    
    for (const [sessionId, snapshot] of this.sessionSnapshots) {
      console.log(`\n  Session: ${sessionId.substring(0, 8)}...`);
      console.log(`    Tokens: ${snapshot.inputTokens}/${snapshot.outputTokens}/${snapshot.cacheCreationTokens}/${snapshot.cacheReadTokens}`);
      console.log(`    Cost: $${snapshot.cost.toFixed(6)}`);
      console.log(`    Last update: ${snapshot.timestamp}`);
    }
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const tracker = new RobustClaudeTokenTracker();
  
  if (process.argv[2] === '--debug') {
    // Show state every 10 seconds in debug mode
    setInterval(() => tracker.showCurrentState(), 10000);
  }
  
  tracker.start().catch(console.error);
}