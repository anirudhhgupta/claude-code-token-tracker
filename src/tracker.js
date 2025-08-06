import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { TokenDatabase } from './database.js';

export class ClaudeTokenTracker {
  constructor() {
    this.db = new TokenDatabase();
    this.claudeConfigPath = path.join(os.homedir(), '.claude.json');
    this.previousState = new Map(); // Track previous state per project
    this.isProcessing = false;
    this.codeBasePath = '/Users/anirudhgupta/Code'; // Base path for auto-discovery
    
    console.log(`🔍 Monitoring Claude config at: ${this.claudeConfigPath}`);
    console.log(`📁 Auto-discovering projects in: ${this.codeBasePath}`);
  }

  async start() {
    // Discover and register all Code folder projects first
    await this.discoverCodeProjects();
    
    // Read initial state
    await this.processClaudeConfig();
    
    // Watch for changes in Claude config
    const configWatcher = chokidar.watch(this.claudeConfigPath, {
      persistent: true,
      usePolling: false,
      interval: 1000,
      ignoreInitial: true
    });

    configWatcher.on('change', async () => {
      if (this.isProcessing) return;
      
      console.log('📝 Claude config changed, processing...');
      await this.processClaudeConfig();
    });

    // Watch for new projects in Code folder
    const codeWatcher = chokidar.watch(this.codeBasePath, {
      persistent: true,
      usePolling: false,
      interval: 5000,
      ignoreInitial: true,
      ignored: /(^|[\/\\])\../, // Ignore hidden files
      depth: 1 // Only watch direct subdirectories
    });

    codeWatcher.on('addDir', async (dirPath) => {
      if (dirPath !== this.codeBasePath) {
        console.log(`📁 New project detected: ${path.basename(dirPath)}`);
        await this.registerProject(dirPath);
      }
    });

    configWatcher.on('error', (error) => {
      console.error('❌ Config watcher error:', error);
    });

    codeWatcher.on('error', (error) => {
      console.error('❌ Code watcher error:', error);
    });

    console.log('✅ Token tracker started successfully');
    console.log('📊 Use "npm run report" to view token usage');
    
    // Keep process alive
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down token tracker...');
      configWatcher.close();
      codeWatcher.close();
      this.db.close();
      process.exit(0);
    });
  }

  async processClaudeConfig() {
    this.isProcessing = true;
    
    try {
      if (!fs.existsSync(this.claudeConfigPath)) {
        console.log('⚠️  Claude config file not found');
        return;
      }

      const configData = JSON.parse(fs.readFileSync(this.claudeConfigPath, 'utf8'));
      
      if (!configData.projects) {
        console.log('⚠️  No projects found in Claude config');
        return;
      }

      // Process each project
      for (const [projectPath, projectData] of Object.entries(configData.projects)) {
        await this.processProject(projectPath, projectData);
      }
      
    } catch (error) {
      console.error('❌ Error processing Claude config:', error.message);
    } finally {
      this.isProcessing = false;
    }
  }

  async processProject(projectPath, projectData) {
    // Always register the project, even without a session
    await this.registerProject(projectPath);
    
    // Skip session processing if no session ID
    if (!projectData.lastSessionId) {
      return;
    }

    const sessionId = projectData.lastSessionId;
    const currentState = this.extractTokenData(projectData);
    const previousState = this.previousState.get(projectPath);

    // Get or create session FIRST
    this.db.getOrCreateSession(sessionId, projectPath);
    
    // Then record snapshot
    this.db.recordSnapshot(sessionId, projectPath, projectData);
    
    // Update session with latest totals
    this.db.updateSession(sessionId, projectData);

    // Calculate deltas for conversation tracking
    if (previousState) {
      const deltaTokens = this.calculateDeltas(previousState, currentState);
      
      // Only record conversation if there are meaningful changes
      if (this.hasSignificantChange(deltaTokens)) {
        this.db.recordConversation(sessionId, deltaTokens);
        
        console.log(`💬 New conversation detected in ${path.basename(projectPath)}`);
        console.log(`   Input: +${deltaTokens.input} | Output: +${deltaTokens.output} | Cost: +$${deltaTokens.cost.toFixed(4)}`);
      }
    }

    // Update previous state
    this.previousState.set(projectPath, currentState);
  }

  extractTokenData(projectData) {
    return {
      inputTokens: projectData.lastTotalInputTokens || 0,
      outputTokens: projectData.lastTotalOutputTokens || 0,
      cacheCreationTokens: projectData.lastTotalCacheCreationInputTokens || 0,
      cacheReadTokens: projectData.lastTotalCacheReadInputTokens || 0,
      cost: projectData.lastCost || 0,
      sessionId: projectData.lastSessionId
    };
  }

  calculateDeltas(previous, current) {
    return {
      input: Math.max(0, current.inputTokens - previous.inputTokens),
      output: Math.max(0, current.outputTokens - previous.outputTokens),
      cacheCreation: Math.max(0, current.cacheCreationTokens - previous.cacheCreationTokens),
      cacheRead: Math.max(0, current.cacheReadTokens - previous.cacheReadTokens),
      cost: Math.max(0, current.cost - previous.cost)
    };
  }

  hasSignificantChange(deltaTokens) {
    // Consider it significant if there are new input/output tokens
    return deltaTokens.input > 0 || deltaTokens.output > 0;
  }

  async discoverCodeProjects() {
    try {
      if (!fs.existsSync(this.codeBasePath)) {
        console.log(`⚠️  Code base path not found: ${this.codeBasePath}`);
        return;
      }

      const entries = fs.readdirSync(this.codeBasePath, { withFileTypes: true });
      const projectDirs = entries
        .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
        .map(entry => path.join(this.codeBasePath, entry.name));

      console.log(`🔍 Discovered ${projectDirs.length} projects in Code folder`);
      
      for (const projectDir of projectDirs) {
        await this.registerProject(projectDir);
      }
    } catch (error) {
      console.error('❌ Error discovering Code projects:', error.message);
    }
  }

  async registerProject(projectPath) {
    try {
      // Create a placeholder session entry for projects without active sessions
      const placeholderSessionId = `placeholder-${Buffer.from(projectPath).toString('base64').slice(0, 8)}`;
      
      // Check if project already has a real session in database
      const existingSessions = this.db.db.prepare(
        `SELECT COUNT(*) as count FROM sessions WHERE project_path = ? AND id NOT LIKE 'placeholder-%'`
      ).get(projectPath);

      // Only create placeholder if no real sessions exist
      if (existingSessions.count === 0) {
        const existing = this.db.db.prepare(
          'SELECT id FROM sessions WHERE project_path = ? AND id = ?'
        ).get(projectPath, placeholderSessionId);

        if (!existing) {
          this.db.db.prepare(`
            INSERT OR IGNORE INTO sessions (
              id, project_path, started_at, total_input_tokens, 
              total_output_tokens, total_cost_usd
            ) VALUES (?, ?, ?, 0, 0, 0)
          `).run(placeholderSessionId, projectPath, new Date().toISOString());
          
          console.log(`📋 Registered project: ${path.basename(projectPath)}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error registering project ${projectPath}:`, error.message);
    }
  }

  stop() {
    this.db.close();
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const tracker = new ClaudeTokenTracker();
  tracker.start().catch(console.error);
}