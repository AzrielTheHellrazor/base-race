import { io } from 'socket.io-client';

// WebSocket client configuration
export const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'https://math-race-backend.onrender.com';

// WebSocket connection helper
export const createWebSocketConnection = (raceId: string) => {
  return io(WEBSOCKET_URL, {
    query: { raceId }
  });
};
