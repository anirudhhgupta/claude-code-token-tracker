import { TokenDatabase } from './database.js';

export class CostAnalyzer {
  constructor() {
    this.db = new TokenDatabase();
    
    // Known pricing rates (per million tokens)
    this.SONNET_RATES = { input: 3.00, output: 15.00 };
    this.HAIKU_RATES = { input: 0.25, output: 1.25 };
  }

  // Analyze cost patterns to detect model switching
  analyzeCostPatterns() {
    console.log('🔍 ANALYZING COST PATTERNS FOR MODEL DETECTION\n');
    
    const query = `
      SELECT 
        id, project_path, started_at, ended_at,
        total_input_tokens, total_output_tokens, total_cost_usd,
        total_cache_creation_tokens, total_cache_read_tokens
      FROM sessions 
      WHERE total_input_tokens > 0 AND total_output_tokens > 0 AND total_cost_usd > 0
      AND id NOT LIKE 'placeholder-%'
      ORDER BY started_at DESC
    `;
    
    const sessions = this.db.db.prepare(query).all();
    
    if (sessions.length === 0) {
      console.log('No session data found for analysis');
      return;
    }

    console.log('Session ID | Input   | Output  | Cache Cr| Cache Rd| Actual Cost | Sonnet Est  | Haiku Est   | Likely Model');
    console.log('-'.repeat(105));
    
    let sonnetCount = 0;
    let haikuCount = 0;
    let ambiguousCount = 0;

    sessions.forEach(session => {
      // Calculate expected costs including cache tokens
      const sonnetCost = this.calculateExpectedCostWithCache(session, this.SONNET_RATES);
      const haikuCost = this.calculateExpectedCostWithCache(session, this.HAIKU_RATES);
      
      const actualCost = session.total_cost_usd;
      const sonnetDiff = sonnetCost > 0 ? Math.abs(actualCost - sonnetCost) / sonnetCost : 1;
      const haikuDiff = haikuCost > 0 ? Math.abs(actualCost - haikuCost) / haikuCost : 1;
      
      let likelyModel;
      if (sonnetDiff < 0.1) { // Within 10% of Sonnet pricing
        likelyModel = 'SONNET';
        sonnetCount++;
      } else if (haikuDiff < 0.1) { // Within 10% of Haiku pricing
        likelyModel = 'HAIKU';
        haikuCount++;
      } else {
        likelyModel = 'UNCLEAR';
        ambiguousCount++;
      }
      
      const sessionShort = session.id.substring(0, 10);
      const projectName = session.project_path.split('/').pop().substring(0, 15);
      
      console.log(`${sessionShort} | ${session.total_input_tokens.toString().padStart(7)} | ${session.total_output_tokens.toString().padStart(7)} | ${session.total_cache_creation_tokens.toString().padStart(7)} | ${session.total_cache_read_tokens.toString().padStart(7)} | $${actualCost.toFixed(6)} | $${sonnetCost.toFixed(6)} | $${haikuCost.toFixed(6)} | ${likelyModel}`);
    });

    console.log('-'.repeat(105));
    console.log(`Summary: Sonnet: ${sonnetCount}, Haiku: ${haikuCount}, Unclear: ${ambiguousCount}`);
    
    if (haikuCount > 0) {
      console.log('\n🎯 HAIKU USAGE DETECTED! Claude Code is switching models for cost optimization.');
      console.log('   Your "IT FEELS LIKE ROBBERY" analysis is even more accurate - you\'re getting premium AI at discount rates!');
    } else if (sonnetCount > 0) {
      console.log('\n📊 All sessions appear to use Sonnet pricing.');
      console.log('   Your cost analysis reflects premium model usage.');
    } else {
      console.log('\n❓ Cost patterns are unclear - might indicate complex caching or mixed model usage.');
    }
  }

  calculateExpectedCostWithCache(session, rates) {
    // Standard input/output tokens
    const standardCost = (session.total_input_tokens * rates.input + session.total_output_tokens * rates.output) / 1_000_000;
    
    // Cache tokens are typically priced at input rates
    const cacheCost = (session.total_cache_creation_tokens * rates.input + session.total_cache_read_tokens * rates.input * 0.1) / 1_000_000;
    
    return standardCost + cacheCost;
  }

  calculateExpectedCost(inputTokens, outputTokens, rates) {
    return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
  }

  // Look for rate limit patterns
  analyzeRateLimitPatterns() {
    console.log('\n⏰ ANALYZING FOR RATE LIMIT PATTERNS\n');
    
    // Look for sessions with mixed cost patterns (might indicate model switching)
    const query = `
      SELECT 
        s.id, s.project_path, s.started_at,
        COUNT(c.id) as conversation_count,
        AVG(c.cost_usd / NULLIF((c.input_tokens * 3 + c.output_tokens * 15) / 1000000.0, 0)) as avg_cost_ratio
      FROM sessions s
      JOIN conversations c ON s.id = c.session_id
      WHERE c.input_tokens > 0 AND c.output_tokens > 0 AND c.cost_usd > 0
      GROUP BY s.id
      HAVING conversation_count > 3
      ORDER BY s.started_at DESC
    `;
    
    const sessions = this.db.db.prepare(query).all();
    
    sessions.forEach(session => {
      const costRatio = session.avg_cost_ratio;
      if (costRatio < 0.5) {
        console.log(`🔄 Session ${session.id.substring(0, 8)}... shows mixed pricing (ratio: ${costRatio.toFixed(2)}) - possible model switching`);
      }
    });
  }

  // Check for sudden cost drops within sessions
  checkForCostDrops() {
    console.log('\n📉 CHECKING FOR SUDDEN COST DROPS (Rate Limit Indicators)\n');
    
    const query = `
      SELECT 
        s.id, c1.conversation_index as conv1, c2.conversation_index as conv2,
        c1.input_tokens as tokens1_in, c1.output_tokens as tokens1_out, c1.cost_usd as cost1,
        c2.input_tokens as tokens2_in, c2.output_tokens as tokens2_out, c2.cost_usd as cost2
      FROM sessions s
      JOIN conversations c1 ON s.id = c1.session_id
      JOIN conversations c2 ON s.id = c2.session_id AND c2.conversation_index = c1.conversation_index + 1
      WHERE c1.cost_usd > 0 AND c2.cost_usd > 0
      ORDER BY s.started_at DESC
    `;
    
    const pairs = this.db.db.prepare(query).all();
    
    pairs.forEach(pair => {
      const costPerToken1 = pair.cost1 / (pair.tokens1_in + pair.tokens1_out);
      const costPerToken2 = pair.cost2 / (pair.tokens2_in + pair.tokens2_out);
      
      if (costPerToken1 > 0 && costPerToken2 > 0) {
        const dropRatio = costPerToken2 / costPerToken1;
        
        if (dropRatio < 0.15) { // 85%+ cost drop
          console.log(`⚡ Major cost drop detected in ${pair.id.substring(0, 8)}... between conv ${pair.conv1}->${pair.conv2}`);
          console.log(`   Cost/token: $${(costPerToken1 * 1000).toFixed(3)} -> $${(costPerToken2 * 1000).toFixed(3)} (${(dropRatio * 100).toFixed(1)}% of original)`);
          console.log(`   This likely indicates Sonnet -> Haiku switch due to rate limits`);
        }
      }
    });
  }

  close() {
    this.db.close();
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const analyzer = new CostAnalyzer();
  
  analyzer.analyzeCostPatterns();
  analyzer.analyzeRateLimitPatterns();
  analyzer.checkForCostDrops();
  
  analyzer.close();
}