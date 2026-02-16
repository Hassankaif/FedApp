from fastapi import WebSocket
from typing import Dict, List

class ConnectionManager:
    def __init__(self):
        # Structure: {room_id: [websocket1, websocket2, ...]}
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Track which room each websocket is in
        self.connection_rooms: Dict[WebSocket, str] = {}
        
    async def connect(self, websocket: WebSocket, room: str = "global"):
        """Initial connection: Accept socket and join room (room is optional, defaults to 'global')"""
        await websocket.accept()        # Accepting is handled in main.py, so we don't do it here
        self.join_room(websocket, room)  # Automatically join the specified room
        print("✓ Client connected")
        
    def join_room(self, websocket: WebSocket, room: str ):
        """Add an ALREADY ACCEPTED websocket to a room"""
        # Create room if it doesn't exist
        if room not in self.active_connections:
            self.active_connections[room] = []
        
        self.active_connections[room].append(websocket)
        self.connection_rooms[websocket] = room
        print(f"✓ Client joined room: {room}")
    
    def disconnect(self, websocket: WebSocket):
        """Remove websocket from its room"""
        room = self.connection_rooms.get(websocket)
        if room and room in self.active_connections:
            if websocket in self.active_connections[room]:
                self.active_connections[room].remove(websocket)
            if not self.active_connections[room]:
                del self.active_connections[room]
        if websocket in self.connection_rooms:
            del self.connection_rooms[websocket]
    
    async def broadcast(self, message: dict, room: str = "global"):
        """Broadcast to a specific room only"""
        if room not in self.active_connections:
            return
        
        dead_connections = []
        for connection in self.active_connections[room]:
            try:
                await connection.send_json(message)
            except:
                dead_connections.append(connection)
        
        # Clean up dead connections
        for conn in dead_connections:
            self.disconnect(conn)
    
    async def broadcast_all(self, message: dict):
        """Broadcast to all rooms"""
        for room in list(self.active_connections.keys()):
            await self.broadcast(message, room)

manager = ConnectionManager()

# creates a ConnectionManager class that manages WebSocket connections. It allows clients to connect, disconnect, and broadcast messages to all connected clients. The manager instance is used in the main.py application to handle WebSocket communication.