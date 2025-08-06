import { TokenDatabase } from './database.js';
import chalk from 'chalk';

export class TokenReporter {
  constructor() {
    this.db = new TokenDatabase();
  }

  // Format numbers with commas
  formatNumber(num) {
    return num.toLocaleString();
  }

  // Format cost
  formatCost(cost) {
    return `$${cost.toFixed(4)}`;
  }

  // Format date in IST
  formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }

  // Show overall summary
  showSummary() {
    console.log(chalk.cyan('\n📊 CLAUDE CODE TOKEN USAGE SUMMARY\n'));
    
    const projects = this.db.getAllProjects();
    
    if (projects.length === 0) {
      console.log(chalk.yellow('No data found. Make sure the tracker is running and you\'ve used Claude Code.'));
      return;
    }

    let totalSessions = 0;
    let totalInput = 0;
    let totalOutput = 0;
    let totalCost = 0;

    console.log(chalk.bold('Projects:'));
    console.log('─'.repeat(80));
    
    projects.forEach(project => {
      totalSessions += project.session_count;
      totalInput += project.total_input;
      totalOutput += project.total_output;
      totalCost += project.total_cost;

      const projectName = project.project_path.split('/').pop();
      const isPlaceholder = project.is_placeholder > 0 && project.session_count === 0;
      
      console.log(`📁 ${chalk.green(projectName)} ${chalk.gray('(' + project.project_path + ')')}`);
      
      if (isPlaceholder) {
        console.log(`   ${chalk.yellow('⏳ No Claude Code sessions yet - ready for tracking')}`);
      } else {
        console.log(`   Sessions: ${this.formatNumber(project.session_count)}`);
        console.log(`   Input tokens: ${chalk.blue(this.formatNumber(project.total_input))}`);
        console.log(`   Output tokens: ${chalk.magenta(this.formatNumber(project.total_output))}`);
        console.log(`   Total cost: ${chalk.yellow(this.formatCost(project.total_cost))}`);
        console.log(`   Last activity: ${this.formatDate(project.last_activity)}`);
      }
      console.log('');
    });

    console.log(chalk.bold('Overall Totals:'));
    console.log('─'.repeat(80));
    console.log(`Total sessions: ${chalk.cyan(this.formatNumber(totalSessions))}`);
    console.log(`Total input tokens: ${chalk.blue(this.formatNumber(totalInput))}`);
    console.log(`Total output tokens: ${chalk.magenta(this.formatNumber(totalOutput))}`);
    console.log(`Total tokens: ${chalk.white(this.formatNumber(totalInput + totalOutput))}`);
    console.log(`Total cost: ${chalk.yellow(this.formatCost(totalCost))}`);
  }

  // Show project details
  showProject(projectPath, days = 30) {
    console.log(chalk.cyan(`\n📁 PROJECT DETAILS: ${projectPath}\n`));
    
    const summary = this.db.getProjectSummary(projectPath, days);
    
    if (summary.session_count === 0) {
      console.log(chalk.yellow('No sessions found for this project in the specified timeframe.'));
      return;
    }

    console.log(chalk.bold(`Summary (Last ${days} days):`));
    console.log('─'.repeat(50));
    console.log(`Sessions: ${chalk.cyan(this.formatNumber(summary.session_count))}`);
    console.log(`Input tokens: ${chalk.blue(this.formatNumber(summary.total_input))}`);
    console.log(`Output tokens: ${chalk.magenta(this.formatNumber(summary.total_output))}`);
    console.log(`Cache creation: ${chalk.green(this.formatNumber(summary.total_cache_creation))}`);
    console.log(`Cache read: ${chalk.green(this.formatNumber(summary.total_cache_read))}`);
    console.log(`Total cost: ${chalk.yellow(this.formatCost(summary.total_cost))}`);
    console.log(`Avg cost/session: ${chalk.yellow(this.formatCost(summary.avg_cost_per_session))}`);
    console.log(`First session: ${this.formatDate(summary.first_session)}`);
    console.log(`Last session: ${this.formatDate(summary.last_session)}`);
  }

  // Show recent sessions
  showRecentSessions(limit = 10) {
    console.log(chalk.cyan(`\n📅 RECENT SESSIONS (Last ${limit})\n`));
    
    const sessions = this.db.getRecentSessions(limit);
    
    if (sessions.length === 0) {
      console.log(chalk.yellow('No sessions found.'));
      return;
    }

    sessions.forEach((session, index) => {
      console.log(`${index + 1}. ${chalk.green(session.id.substring(0, 8))}...`);
      console.log(`   Project: ${session.project_path}`);
      console.log(`   Started: ${this.formatDate(session.started_at)}`);
      console.log(`   Tokens: ${chalk.blue(this.formatNumber(session.total_input_tokens))} in / ${chalk.magenta(this.formatNumber(session.total_output_tokens))} out`);
      console.log(`   Cost: ${chalk.yellow(this.formatCost(session.total_cost_usd))}`);
      console.log('');
    });
  }

  // Show daily stats
  showDailyStats(days = 7) {
    console.log(chalk.cyan(`\n📈 DAILY USAGE (Last ${days} days)\n`));
    
    const stats = this.db.getDailyStats(days);
    
    if (stats.length === 0) {
      console.log(chalk.yellow('No usage data found for the specified period.'));
      return;
    }

    console.log(chalk.bold('Date       Sessions  Input     Output    Cost'));
    console.log('─'.repeat(60));
    
    stats.forEach(stat => {
      const date = stat.date.padEnd(10);
      const sessions = String(stat.session_count).padStart(8);
      const input = this.formatNumber(stat.daily_input).padStart(9);
      const output = this.formatNumber(stat.daily_output).padStart(9);
      const cost = this.formatCost(stat.daily_cost).padStart(9);
      
      console.log(`${date} ${sessions}  ${chalk.blue(input)} ${chalk.magenta(output)} ${chalk.yellow(cost)}`);
    });

    // Show totals
    const totalSessions = stats.reduce((sum, s) => sum + s.session_count, 0);
    const totalInput = stats.reduce((sum, s) => sum + s.daily_input, 0);
    const totalOutput = stats.reduce((sum, s) => sum + s.daily_output, 0);
    const totalCost = stats.reduce((sum, s) => sum + s.daily_cost, 0);

    console.log('─'.repeat(60));
    console.log(`${'Total'.padEnd(10)} ${String(totalSessions).padStart(8)}  ${chalk.blue(this.formatNumber(totalInput).padStart(9))} ${chalk.magenta(this.formatNumber(totalOutput).padStart(9))} ${chalk.yellow(this.formatCost(totalCost).padStart(9))}`);
  }

  // Show session details
  showSessionDetails(sessionId) {
    console.log(chalk.cyan(`\n🔍 SESSION DETAILS: ${sessionId}\n`));
    
    const session = this.db.getSessionSummary(sessionId);
    
    if (!session) {
      console.log(chalk.red('Session not found.'));
      return;
    }

    console.log(chalk.bold('Session Info:'));
    console.log('─'.repeat(40));
    console.log(`ID: ${session.id}`);
    console.log(`Project: ${session.project_path}`);
    console.log(`Started: ${this.formatDate(session.started_at)}`);
    console.log(`Ended: ${this.formatDate(session.ended_at)}`);
    console.log(`Duration: ${session.total_duration_ms ? (session.total_duration_ms / 1000).toFixed(1) + 's' : 'N/A'}`);
    
    console.log(chalk.bold('\nToken Usage:'));
    console.log('─'.repeat(40));
    console.log(`Input tokens: ${chalk.blue(this.formatNumber(session.total_input_tokens))}`);
    console.log(`Output tokens: ${chalk.magenta(this.formatNumber(session.total_output_tokens))}`);
    console.log(`Cache creation: ${chalk.green(this.formatNumber(session.total_cache_creation_tokens))}`);
    console.log(`Cache read: ${chalk.green(this.formatNumber(session.total_cache_read_tokens))}`);
    console.log(`Total cost: ${chalk.yellow(this.formatCost(session.total_cost_usd))}`);
    
    console.log(chalk.bold('\nActivity:'));
    console.log('─'.repeat(40));
    console.log(`Lines added: ${chalk.green(this.formatNumber(session.lines_added))}`);
    console.log(`Lines removed: ${chalk.red(this.formatNumber(session.lines_removed))}`);
    console.log(`Web searches: ${this.formatNumber(session.web_search_requests)}`);
    console.log(`Conversations: ${this.formatNumber(session.conversation_count || 0)}`);
  }

  // Export data to JSON
  exportData(outputPath = 'claude-usage-export.json') {
    console.log(chalk.cyan('\n📤 EXPORTING DATA...\n'));
    
    const data = {
      exportDate: new Date().toISOString(),
      projects: this.db.getAllProjects(),
      recentSessions: this.db.getRecentSessions(50),
      dailyStats: this.db.getDailyStats(30)
    };

    import('fs').then(fs => {
      fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
      console.log(chalk.green(`✅ Data exported to: ${outputPath}`));
    });
  }

  close() {
    this.db.close();
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const reporter = new TokenReporter();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'summary':
      reporter.showSummary();
      break;
    case 'project':
      reporter.showProject(process.argv[3] || process.cwd(), parseInt(process.argv[4]) || 30);
      break;
    case 'recent':
      reporter.showRecentSessions(parseInt(process.argv[3]) || 10);
      break;
    case 'daily':
      reporter.showDailyStats(parseInt(process.argv[3]) || 7);
      break;
    case 'session':
      reporter.showSessionDetails(process.argv[3]);
      break;
    case 'export':
      reporter.exportData(process.argv[3]);
      break;
    default:
      reporter.showSummary();
  }
  
  reporter.close();
}