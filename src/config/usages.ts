/**
 * Centralized Address, Port & Service Usages Reference
 * 
 * This file details how backend networking, addresses, ports, and utility
 * folders are organized across the application.
 */

export interface UsageGuide {
  title: string;
  description: string;
  codeSample: string;
  context: string;
}

export const CENTRALIZED_USAGES: UsageGuide[] = [
  {
    title: '1. Accessing Backend Address & Port',
    description: 'Never hardcode "http://localhost:3000" or port 3000 across components. Import helper functions directly from @/config.',
    codeSample: `import { getBackendAddress, getBackendPort, getApiUrl } from '../config';

// Returns full root e.g. "http://localhost:3000" or custom server
const backendRoot = getBackendAddress();

// Returns configured port e.g. "3000" or "8000"
const port = getBackendPort();

// Returns formatted endpoint e.g. "http://localhost:3000/api/nmea/upload"
const uploadUrl = getApiUrl('/nmea/upload');`,
    context: 'Use whenever making external network calls or displaying backend diagnostics.',
  },
  {
    title: '2. Performing HTTP Requests with Centralized Client',
    description: 'Use the centralized apiClient which automatically prepends the centralized host, port, and handles errors.',
    codeSample: `import { apiClient } from '../config';

// GET request
const response = await apiClient.get('/nmea/tasks');
if (response.success) {
  console.log(response.data);
}

// POST request
const postRes = await apiClient.post('/nmea/parse', { rawSentences });

// Health check ping
const health = await apiClient.checkHealth();
console.log('Backend status:', health.status, health.latencyMs);`,
    context: 'Replaces raw window.fetch calls to guarantee consistent base URL and timeout handling.',
  },
  {
    title: '3. Connecting to Telemetry WebSockets',
    description: 'Use getWebSocketUrl() to connect live GNSS serial feeds or high-rate NMEA daemon streams.',
    codeSample: `import { getWebSocketUrl } from '../config';

const wsUrl = getWebSocketUrl('/stream');
const socket = new WebSocket(wsUrl);

socket.onmessage = (event) => {
  const sentence = event.data;
  // Feed to parser
};`,
    context: 'Live hardware serial/TCP telemetry streaming.',
  },
  {
    title: '4. Updating Backend Host or Port at Runtime',
    description: 'Engineers can adjust the backend address and port from UI or diagnostics without modifying source code.',
    codeSample: `import { updateBackendConfig, resetBackendConfig } from '../config';

// Change target server to remote receiver on port 8080
updateBackendConfig({
  host: '192.168.1.150',
  port: '8080',
  protocol: 'http',
});

// Reset back to system defaults
resetBackendConfig();`,
    context: 'Configured in Developer Diagnostics or Settings without breaking existing state.',
  },
];
