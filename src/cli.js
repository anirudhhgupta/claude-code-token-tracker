#!/usr/bin/env node

import { Command } from 'commander';
import { ClaudeTokenTracker } from './tracker.js';
import { RobustClaudeTokenTracker } from './robust-tracker.js';
import { TokenReporter } from './reporter.js';
import chalk from 'chalk';

const program = new Command();

program
  .name('claude-tokens')
  .description('Track Claude Code token usage with detailed analytics')
  .version('1.0.0');

// Start tracking command
program
  .command('start')
  .description('Start monitoring Claude Code token usage')
  .option('--robust', 'Use robust tracker (recommended)')
  .option('--debug', 'Enable debug output')
  .action(async (options) => {
    if (options.robust) {
      console.log(chalk.green('🚀 Starting Robust Claude Token Tracker...'));
      console.log(chalk.yellow('⚡ This will track EVERY token change with aggressive polling'));
      const tracker = new RobustClaudeTokenTracker();
      if (options.debug) {
        setInterval(() => tracker.showCurrentState(), 10000);
      }
      await tracker.start();
    } else {
      console.log(chalk.green('🚀 Starting Legacy Claude Token Tracker...'));
      console.log(chalk.red('⚠️  Consider using --robust for better accuracy'));
      const tracker = new ClaudeTokenTracker();
      await tracker.start();
    }
  });

// Show summary
program
  .command('summary')
  .description('Show overall token usage summary')
  .action(() => {
    const reporter = new TokenReporter();
    reporter.showSummary();
    reporter.close();
  });

// Show project details
program
  .command('project')
  .description('Show detailed stats for a specific project')
  .argument('[path]', 'Project path', process.cwd())
  .option('-d, --days <days>', 'Number of days to look back', '30')
  .action((path, options) => {
    const reporter = new TokenReporter();
    reporter.showProject(path, parseInt(options.days));
    reporter.close();
  });

// Show recent sessions
program
  .command('recent')
  .description('Show recent Claude Code sessions')
  .option('-l, --limit <limit>', 'Number of sessions to show', '10')
  .action((options) => {
    const reporter = new TokenReporter();
    reporter.showRecentSessions(parseInt(options.limit));
    reporter.close();
  });

// Show daily stats
program
  .command('daily')
  .description('Show daily usage statistics')
  .option('-d, --days <days>', 'Number of days to show', '7')
  .action((options) => {
    const reporter = new TokenReporter();
    reporter.showDailyStats(parseInt(options.days));
    reporter.close();
  });

// Show session details
program
  .command('session')
  .description('Show detailed information about a specific session')
  .argument('<sessionId>', 'Session ID (first 8 characters are enough)')
  .action((sessionId) => {
    const reporter = new TokenReporter();
    reporter.showSessionDetails(sessionId);
    reporter.close();
  });

// Real-time monitoring
program
  .command('monitor')
  .description('Monitor token usage in real-time')
  .option('-p, --project <path>', 'Filter by specific project path')
  .option('-i, --interval <ms>', 'Polling interval in milliseconds', '1000')
  .action(async (options) => {
    console.log(chalk.cyan('🔍 REAL-TIME TOKEN MONITOR\n'));
    console.log(chalk.yellow('Press Ctrl+C to stop monitoring\n'));
    
    const { TokenDatabase } = await import('./database.js');
    const db = new TokenDatabase();
    let lastSnapshot = new Map(); // sessionId -> last known state
    
    const formatDelta = (value) => {
      if (value > 0) return chalk.green(`+${value.toLocaleString()}`);
      if (value < 0) return chalk.red(value.toLocaleString());
      return chalk.gray('0');
    };

    const formatCost = (value) => {
      if (value > 0) return chalk.yellow(`+$${value.toFixed(6)}`);
      if (value < 0) return chalk.red(`-$${Math.abs(value).toFixed(6)}`);
      return chalk.gray('$0.000000');
    };

    const checkForChanges = () => {
      try {
        const sessions = db.db.prepare(`
          SELECT * FROM sessions 
          WHERE id NOT LIKE 'placeholder-%'
          ${options.project ? 'AND project_path = ?' : ''}
          ORDER BY ended_at DESC
        `).all(options.project ? [options.project] : []);

        sessions.forEach(session => {
          const currentState = {
            inputTokens: session.total_input_tokens,
            outputTokens: session.total_output_tokens,
            cacheCreationTokens: session.total_cache_creation_tokens,
            cacheReadTokens: session.total_cache_read_tokens,
            cost: session.total_cost_usd,
            linesAdded: session.lines_added,
            linesRemoved: session.lines_removed,
            webSearches: session.web_search_requests
          };

          const previousState = lastSnapshot.get(session.id);
          
          if (previousState) {
            const hasChanges = Object.keys(currentState).some(key => 
              currentState[key] !== previousState[key]
            );

            if (hasChanges) {
              const projectName = session.project_path.split('/').pop();
              const timestamp = new Date().toLocaleTimeString();
              
              console.log(`${chalk.blue('💬')} Token change in ${chalk.green(projectName)} ${chalk.gray(`[${timestamp}]`)}`);
              console.log(`   Session: ${session.id.substring(0, 8)}...`);
              console.log(`   Input: ${formatDelta(currentState.inputTokens - previousState.inputTokens)}`);
              console.log(`   Output: ${formatDelta(currentState.outputTokens - previousState.outputTokens)}`);
              console.log(`   Cache Creation: ${formatDelta(currentState.cacheCreationTokens - previousState.cacheCreationTokens)}`);
              console.log(`   Cache Read: ${formatDelta(currentState.cacheReadTokens - previousState.cacheReadTokens)}`);
              console.log(`   Cost: ${formatCost(currentState.cost - previousState.cost)}`);
              
              if (currentState.linesAdded !== previousState.linesAdded || currentState.linesRemoved !== previousState.linesRemoved) {
                console.log(`   Code: ${formatDelta(currentState.linesAdded - previousState.linesAdded)} added, ${formatDelta(currentState.linesRemoved - previousState.linesRemoved)} removed`);
              }
              
              if (currentState.webSearches !== previousState.webSearches) {
                console.log(`   Web searches: ${formatDelta(currentState.webSearches - previousState.webSearches)}`);
              }
              
              console.log('');
            }
          } else {
            // First time seeing this session
            const projectName = session.project_path.split('/').pop();
            console.log(`${chalk.cyan('🔍')} Monitoring session in ${chalk.green(projectName)}`);
            console.log(`   Session: ${session.id.substring(0, 8)}...`);
            console.log(`   Current: ${currentState.inputTokens.toLocaleString()}/${currentState.outputTokens.toLocaleString()}/${currentState.cacheCreationTokens.toLocaleString()} tokens`);
            console.log(`   Cost: $${currentState.cost.toFixed(6)}`);
            console.log('');
          }

          lastSnapshot.set(session.id, currentState);
        });
      } catch (error) {
        console.error(chalk.red('❌ Error monitoring tokens:'), error.message);
      }
    };

    // Initial check
    checkForChanges();
    console.log(chalk.gray(`Polling every ${options.interval}ms for changes...\n`));

    // Start monitoring
    const interval = setInterval(checkForChanges, parseInt(options.interval));

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n🛑 Stopping monitor...'));
      clearInterval(interval);
      db.close();
      process.exit(0);
    });
  });

// Export data
program
  .command('export')
  .description('Export usage data to JSON file')
  .argument('[output]', 'Output file path', 'claude-usage-export.json')
  .action((output) => {
    const reporter = new TokenReporter();
    reporter.exportData(output);
    reporter.close();
  });

// Cost analysis
program
  .command('analyze-costs')
  .description('Analyze costs to detect Sonnet vs Haiku model usage')
  .action(async () => {
    console.log(chalk.cyan('🔬 Running cost analysis to detect model switching...\n'));
    const { CostAnalyzer } = await import('./cost-analyzer.js');
    const analyzer = new CostAnalyzer();
    analyzer.analyzeCostPatterns();
    analyzer.analyzeRateLimitPatterns();
    analyzer.checkForCostDrops();
    analyzer.close();
  });

// Default command (show summary)
if (process.argv.length === 2) {
  const reporter = new TokenReporter();
  reporter.showSummary();
  reporter.close();
} else {
  program.parse();
}