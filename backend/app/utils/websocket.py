from fastapi import WebSocket
from typing import List

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        """Accept connection and register websocket client."""
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"WebSocket client connected. Active connections count: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """Unregister websocket client."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        print(f"WebSocket client disconnected. Active connections count: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Broadcast JSON message to all connected clients."""
        print(f"Broadcasting event: {message} to {len(self.active_connections)} clients")
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                # Catch closed/broken connections to avoid breaking other clients
                print(f"Failed to send websocket message to a client: {e}")

manager = ConnectionManager()
