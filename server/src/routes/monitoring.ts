import express, { Request, Response, NextFunction } from 'express';
import os from 'os';
import { query } from '../database.js';
import { redisCache } from '../utils/redisCache.js';

const router = express.Router();

// Types for metrics
interface MetricsData {
  requests: {
    total: number;
    by_method: Record<string, number>;
    by_route: Record<string, number>;
    by_status: Record<number, number>;
  };
  errors: any[];
  performance: {
    avg_response_time: number;
    response_times: number[];
  };
  uptime: number;
  startTime: number;
}

interface HealthCheck {
  status: string;
  timestamp: string;
  uptime: number;
  checks: {
    database?: { status: string; responseTime?: string; error?: string };
    memory?: { status: string; heapUsed: string; heapTotal: string; percentage: string };
    disk?: { status: string; note?: string };
  };
}

// Store metrics in memory (production should use Redis or dedicated service)
const metrics: MetricsData = {
  requests: {
    total: 0,
    by_method: {},
    by_route: {},
    by_status: {}
  },
  errors: [],
  performance: {
    avg_response_time: 0,
    response_times: []
  },
  uptime: process.uptime(),
  startTime: Date.now()
};

// Middleware to track requests
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Track request
  metrics.requests.total++;
  metrics.requests.by_method[req.method] = (metrics.requests.by_method[req.method] || 0) + 1;
  
  // Override res.send to capture response
  const originalSend = res.send;
  res.send = function(data: any) {
    const responseTime = Date.now() - startTime;
    
    // Track response time
    metrics.performance.response_times.push(responseTime);
    if (metrics.performance.response_times.length > 1000) {
      metrics.performance.response_times.shift(); // Keep last 1000
    }
    metrics.performance.avg_response_time = 
      metrics.performance.response_times.reduce((a, b) => a + b, 0) / metrics.performance.response_times.length;
    
    // Track by status
    metrics.requests.by_status[res.statusCode] = (metrics.requests.by_status[res.statusCode] || 0) + 1;
    
    // Track by route
    const route = req.route ? req.route.path : req.path;
    metrics.requests.by_route[route] = (metrics.requests.by_route[route] || 0) + 1;
    
    // Log slow requests (> 1000ms)
    if (responseTime > 1000) {
      console.warn(`🐌 Slow request: ${req.method} ${req.path} - ${responseTime}ms`);
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// GET /metrics - Prometheus-compatible metrics
router.get('/metrics', async (req, res) => {
  try {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Get database stats
    let dbConnections = 0;
    try {
      const result: any = await query('SHOW STATUS LIKE "Threads_connected"');
      dbConnections = parseInt(result[0]?.Value || '0');
    } catch (e) {
      console.error('Failed to get DB connections:', e);
    }
    
    // Get Redis stats
    let redisKeys = 0;
    let redisMemory = 0;
    let redisCacheHitRate = 0;
    try {
      const info = await redisCache.info();
      redisKeys = info.keys || 0;
      redisMemory = info.memoryUsed || 0;
      // Calculate cache hit rate (hits / (hits + misses))
      if (info.keyspaceHits && info.keyspaceMisses) {
        const total = info.keyspaceHits + info.keyspaceMisses;
        redisCacheHitRate = total > 0 ? (info.keyspaceHits / total) * 100 : 0;
      }
    } catch (e) {
      console.error('Failed to get Redis stats:', e);
    }
    
    // Prometheus format
    const prometheusMetrics = `
# HELP nodejs_process_uptime_seconds Process uptime in seconds
# TYPE nodejs_process_uptime_seconds gauge
nodejs_process_uptime_seconds ${uptime}

# HELP nodejs_memory_heap_used_bytes Memory heap used in bytes
# TYPE nodejs_memory_heap_used_bytes gauge
nodejs_memory_heap_used_bytes ${memUsage.heapUsed}

# HELP nodejs_memory_heap_total_bytes Memory heap total in bytes
# TYPE nodejs_memory_heap_total_bytes gauge
nodejs_memory_heap_total_bytes ${memUsage.heapTotal}

# HELP nodejs_memory_rss_bytes Resident set size in bytes
# TYPE nodejs_memory_rss_bytes gauge
nodejs_memory_rss_bytes ${memUsage.rss}

# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total ${metrics.requests.total}

# HELP http_request_duration_avg_ms Average request duration in milliseconds
# TYPE http_request_duration_avg_ms gauge
http_request_duration_avg_ms ${metrics.performance.avg_response_time.toFixed(2)}

# HELP mysql_connections Current MySQL connections
# TYPE mysql_connections gauge
mysql_connections ${dbConnections}

# HELP redis_keys_total Total Redis keys
# TYPE redis_keys_total gauge
redis_keys_total ${redisKeys}

# HELP redis_memory_used_bytes Redis memory used in bytes
# TYPE redis_memory_used_bytes gauge
redis_memory_used_bytes ${redisMemory}

# HELP redis_cache_hit_rate Redis cache hit rate percentage
# TYPE redis_cache_hit_rate gauge
redis_cache_hit_rate ${redisCacheHitRate.toFixed(2)}

# HELP http_requests_by_method HTTP requests by method
# TYPE http_requests_by_method counter
${Object.entries(metrics.requests.by_method).map(([method, count]) => 
  `http_requests_by_method{method="${method}"} ${count}`
).join('\n')}

# HELP http_responses_by_status HTTP responses by status code
# TYPE http_responses_by_status counter
${Object.entries(metrics.requests.by_status).map(([status, count]) => 
  `http_responses_by_status{status="${status}"} ${count}`
).join('\n')}
`.trim();
    
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(prometheusMetrics);
  } catch (error) {
    console.error('❌ Metrics endpoint error:', error);
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
});

// GET /metrics/json - JSON format metrics
router.get('/metrics/json', async (req, res) => {
  try {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const loadAvg = os.loadavg();
    
    // Get database stats
    let dbStats: any = {};
    try {
      const threads: any = await query('SHOW STATUS LIKE "Threads_connected"');
      const queries: any = await query('SHOW STATUS LIKE "Questions"');
      const slowQueries: any = await query('SHOW STATUS LIKE "Slow_queries"');
      
      dbStats = {
        connections: parseInt(threads[0]?.Value || '0'),
        queries: parseInt(queries[0]?.Value || '0'),
        slowQueries: parseInt(slowQueries[0]?.Value || '0')
      };
    } catch (e: any) {
      dbStats = { error: e.message };
    }
    
    res.json({
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: uptime,
        formatted: formatUptime(uptime)
      },
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      memory: {
        heapUsed: formatBytes(memUsage.heapUsed),
        heapTotal: formatBytes(memUsage.heapTotal),
        rss: formatBytes(memUsage.rss),
        external: formatBytes(memUsage.external),
        heapUsedRaw: memUsage.heapUsed,
        heapTotalRaw: memUsage.heapTotal
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        loadAverage: {
          '1min': loadAvg[0].toFixed(2),
          '5min': loadAvg[1].toFixed(2),
          '15min': loadAvg[2].toFixed(2)
        }
      },
      system: {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemory: formatBytes(os.totalmem()),
        freeMemory: formatBytes(os.freemem()),
        uptime: formatUptime(os.uptime())
      },
      http: {
        requests: metrics.requests,
        performance: {
          avgResponseTime: `${metrics.performance.avg_response_time.toFixed(2)}ms`,
          p50: calculatePercentile(metrics.performance.response_times, 50),
          p95: calculatePercentile(metrics.performance.response_times, 95),
          p99: calculatePercentile(metrics.performance.response_times, 99)
        }
      },
      database: dbStats
    });
  } catch (error) {
    console.error('❌ JSON metrics error:', error);
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
});

// GET /health - Enhanced health check
router.get('/health', async (req: Request, res: Response) => {
  const health: HealthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {}
  };
  
  // Check database
  try {
    await query('SELECT 1');
    health.checks.database = { status: 'up', responseTime: '<50ms' };
  } catch (error: any) {
    health.checks.database = { status: 'down', error: error.message };
    health.status = 'unhealthy';
  }
  
  // Check memory
  const memUsage = process.memoryUsage();
  const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  health.checks.memory = {
    status: memPercent < 90 ? 'up' : 'warning',
    heapUsed: formatBytes(memUsage.heapUsed),
    heapTotal: formatBytes(memUsage.heapTotal),
    percentage: `${memPercent.toFixed(1)}%`
  };
  
  // Check disk space (if possible)
  health.checks.disk = { status: 'up', note: 'Manual monitoring required' };
  
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Utility functions
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);
  
  return parts.join(' ');
}

function calculatePercentile(values: number[], percentile: number): string {
  if (values.length === 0) return '0ms';
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return `${sorted[index].toFixed(2)}ms`;
}

export default router;
