/**
 * System Telemetry and Metrics Service
 */

interface SystemMetrics {
  startTime: number;
  totalBetsPlaced: number;
  failedBets: number;
  duplicateRequestsPrevented: number;
  failedSettlements: number;
  roundCreationFailures: number;
  firestoreErrors: number;
  rateLimitBlocks: number;
  walletInconsistenciesDetected: number;
  latencies: number[];
}

const metrics: SystemMetrics = {
  startTime: Date.now(),
  totalBetsPlaced: 0,
  failedBets: 0,
  duplicateRequestsPrevented: 0,
  failedSettlements: 0,
  roundCreationFailures: 0,
  firestoreErrors: 0,
  rateLimitBlocks: 0,
  walletInconsistenciesDetected: 0,
  latencies: [],
};

export function recordMetric(type: keyof Omit<SystemMetrics, "startTime" | "latencies">, count = 1) {
  metrics[type] += count;
}

export function recordLatency(durationMs: number) {
  metrics.latencies.push(durationMs);
  if (metrics.latencies.length > 500) {
    metrics.latencies.shift();
  }
}

export function getSystemMetricsSummary() {
  const uptimeSeconds = Math.floor((Date.now() - metrics.startTime) / 1000);
  const avgLatency =
    metrics.latencies.length > 0
      ? Number(
          (
            metrics.latencies.reduce((a, b) => a + b, 0) /
            metrics.latencies.length
          ).toFixed(1),
        )
      : 0;

  return {
    uptimeSeconds,
    uptimeHuman: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`,
    totalBetsPlaced: metrics.totalBetsPlaced,
    failedBets: metrics.failedBets,
    duplicateRequestsPrevented: metrics.duplicateRequestsPrevented,
    failedSettlements: metrics.failedSettlements,
    roundCreationFailures: metrics.roundCreationFailures,
    firestoreErrors: metrics.firestoreErrors,
    rateLimitBlocks: metrics.rateLimitBlocks,
    walletInconsistenciesDetected: metrics.walletInconsistenciesDetected,
    averageApiLatencyMs: avgLatency,
    samplesRecorded: metrics.latencies.length,
    status: metrics.failedSettlements > 0 || metrics.roundCreationFailures > 0 ? "degraded" : "healthy",
  };
}
