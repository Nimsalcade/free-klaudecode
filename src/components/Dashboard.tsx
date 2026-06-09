import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from '../ink.js';
import { useAppState, useSetAppState } from '../state/AppState.js';

/** Mock subagent entry. */
type MockAgent = {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'error';
  memory: number; // MB
  uptime: number; // seconds
};

const AGENT_NAMES = [
  'web-searcher',
  'code-reviewer',
  'test-runner',
  'file-indexer',
  'plan-validator',
  'context-loader',
];

/** Deterministic but varying mock CPU value. */
function mockCpuUsage(tick: number): number {
  // Oscillates between 15-60% with some noise
  return 15 + 25 * Math.abs(Math.sin(tick * 0.3)) + 5 * Math.abs(Math.cos(tick * 0.7)) + 2 * Math.sin(tick * 1.3);
}

/** Deterministic mock memory stats. */
function mockMemoryStats(tick: number) {
  const total = 32768; // 32 GB
  const used = 18000 + 2000 * Math.sin(tick * 0.05);
  const free = total - used;
  return { total, used, free };
}

/** Deterministic mock subagents rotated by tick. */
function mockAgents(tick: number): MockAgent[] {
  const count = 2 + (tick % 4); // 2-5 agents
  const agents: MockAgent[] = [];
  for (let i = 0; i < count; i++) {
    const nameIdx = (tick + i) % AGENT_NAMES.length;
    const statuses: MockAgent['status'][] = ['active', 'active', 'active', 'idle', 'error'];
    agents.push({
      id: `agent-${nameIdx}-${tick}`,
      name: AGENT_NAMES[nameIdx]!,
      status: statuses[(tick + i * 3) % statuses.length]!,
      memory: 120 + (tick * 7 + i * 31) % 400,
      uptime: (tick * 2 + i * 17) % 3600,
    });
  }
  return agents;
}

/** Format seconds to h m s. */
function formatUptime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${sec}s`;
}

/** ASCII bar chart of the given width and fill %. */
function Bar({
  pct,
  width,
}: {
  pct: number; // 0-100
  width: number;
}) {
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;
  return (
    <Text>
      {'█'.repeat(filled)}
      {'░'.repeat(empty)}
    </Text>
  );
}

/** Status dot for subagent. */
function StatusDot({ status }: { status: MockAgent['status'] }) {
  switch (status) {
    case 'active':
      return <Text color="text">{'●'}</Text>;
    case 'idle':
      return <Text dimColor>{'○'}</Text>;
    case 'error':
      return <Text>{'✖'}</Text>;
  }
}

const HEADER = `
 █▀ █▄█ █▀▄ ▀█▀ ██▀ █▀▄▀█   █▀▄ █▀█ █▀▀ █▄█ █▀▄ █▀█ ▄▀█ █▀█ █▀▄
 ▄█  █  █▄▀  █  █▄▄ █ ▀ █   █▄▀ █▀█ ▀▀█  █  █▀▄ █▄█ █▀█ █▀▄ █▄▀
`;

export function Dashboard() {
  const [tick, setTick] = useState(0);
  const dashboardVisible = useAppState((s) => s.dashboardVisible);
  const setAppState = useSetAppState();

  // Tick every second
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Dismiss on Escape
  useInput((input, key) => {
    if (key.escape) {
      setAppState((prev) => ({ ...prev, dashboardVisible: false }));
    }
  });

  if (!dashboardVisible) return null;

  const cpu = mockCpuUsage(tick);
  const mem = mockMemoryStats(tick);
  const agents = mockAgents(tick);
  const memUsedGB = (mem.used / 1024).toFixed(1);
  const memFreeGB = (mem.free / 1024).toFixed(1);
  const cpuLabel = cpu > 50 ? 'WARN' : 'OK';

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      {/* Header */}
      <Box flexDirection="column">
        <Text dimColor>{HEADER}</Text>
      </Box>

      {/* CPU Section */}
      <Box flexDirection="column" marginTop={1}>
        <Box flexDirection="row" gap={2}>
          <Text bold>{'CPU'}</Text>
          <Text>{cpu.toFixed(0)}%</Text>
          <Text
            bold={cpu > 50}
            dimColor={cpu <= 50}
          >
            [{cpuLabel}]
          </Text>
        </Box>
        <Box marginTop={0}>
          <Bar pct={cpu} width={40} />
        </Box>
      </Box>

      {/* Memory Section */}
      <Box flexDirection="column" marginTop={1}>
        <Box flexDirection="row" gap={2}>
          <Text bold>{'MEM'}</Text>
          <Text>{memUsedGB} GB used</Text>
          <Text dimColor>{'|'}</Text>
          <Text dimColor>{memFreeGB} GB free</Text>
          <Text dimColor>{'|'}</Text>
          <Text dimColor>{'32.0 GB total'}</Text>
        </Box>
        <Box marginTop={0}>
          <Bar pct={(mem.used / mem.total) * 100} width={40} />
        </Box>
        <Box flexDirection="row" gap={4} marginTop={0}>
          <Box flexDirection="row" gap={1}>
            <Text>{'█'}</Text>
            <Text dimColor>in use</Text>
          </Box>
          <Box flexDirection="row" gap={1}>
            <Text dimColor>{'░'}</Text>
            <Text dimColor>available</Text>
          </Box>
        </Box>
      </Box>

      {/* Subagents Table */}
      <Box flexDirection="column" marginTop={1}>
        <Box flexDirection="row" gap={1}>
          <Text bold>{'Active Subagents'}</Text>
          <Text dimColor>{`(${agents.length})`}</Text>
        </Box>

        {/* Table header */}
        <Box flexDirection="row" marginTop={0}>
          <Box width={2}>
            <Text dimColor>{''}</Text>
          </Box>
          <Box width={18}>
            <Text dimColor>{'NAME'}</Text>
          </Box>
          <Box width={10}>
            <Text dimColor>{'STATUS'}</Text>
          </Box>
          <Box width={10}>
            <Text dimColor>{'MEM'}</Text>
          </Box>
          <Box width={12}>
            <Text dimColor>{'UPTIME'}</Text>
          </Box>
        </Box>

        {/* Separator */}
        <Box marginTop={0}>
          <Text dimColor>{'─'.repeat(52)}</Text>
        </Box>

        {/* Table rows */}
        {agents.map((a, i) => (
          <Box key={i} flexDirection="row">
            <Box width={2}>
              <StatusDot status={a.status} />
            </Box>
            <Box width={18}>
              <Text>{a.name}</Text>
            </Box>
            <Box width={10}>
              <Text dimColor={a.status !== 'active'}>{a.status}</Text>
            </Box>
            <Box width={10}>
              <Text dimColor>{`${a.memory} MB`}</Text>
            </Box>
            <Box width={12}>
              <Text dimColor>{formatUptime(a.uptime)}</Text>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Footer hint */}
      <Box marginTop={1}>
        <Text dimColor>{'Press d or Esc to close dashboard'}</Text>
      </Box>
    </Box>
  );
}
