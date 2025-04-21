const WebSocket = require('ws');
const User = require('../models/User');
const Session = require('../models/Session');
const jwt = require('jsonwebtoken');

// Store active connections
const connections = new Map();
// Store active sessions
const sessions = new Map();

// Initialize WebSocket server
const initializeWebSocketServer = (server) => {
  console.log('Initializing WebSocket server...');
  
  // Create WebSocket server with simpler path
  const wss = new WebSocket.Server({ 
    server,
    path: '/ws',
    verifyClient: () => true, // Skip verification for testing
    clientTracking: true,
    perMessageDeflate: {
      zlibDeflateOptions: {
        // See zlib defaults.
        chunkSize: 1024,
        memLevel: 7,
        level: 3
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      },
      // Other options settable:
      concurrencyLimit: 10, // Limits zlib concurrency for perf.
      threshold: 1024 // Size (in bytes) below which messages
      // should not be compressed if context takeover is disabled.
    }
  });

  console.log(`WebSocket server created with path: ${wss.options.path}`);
  
  // Reset any existing sessions and connections
  connections.clear();
  sessions.clear();
  
  console.log('Sessions and connections cleared on server startup');

  // Connection event
  wss.on('connection', async (ws, req) => {
    console.log('New WebSocket connection request received');
    console.log('Connection URL:', req.url);
    
    try {
      // Extract sessionId and userId from query params
      const url = new URL(req.url, 'http://localhost');
      const sessionId = url.searchParams.get('sessionId') || 'test-session';
      const userId = url.searchParams.get('userId') || `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const userName = url.searchParams.get('userName') || `User ${userId.substr(0, 5)}`;
      
      console.log(`Connection request for: sessionId=${sessionId}, userId=${userId}, userName=${userName}`);
      
      // Clean up any existing connections for this userId (helps with refresh/reconnect)
      let existingConnection = null;
      for (const [existingWs, info] of connections.entries()) {
        if (info.userId === userId && info.sessionId === sessionId) {
          console.log(`Found existing connection for ${userId}, cleaning up...`);
          existingConnection = existingWs;
          break;
        }
      }
      
      // Clean up the existing connection if found
      if (existingConnection) {
        console.log(`Removing existing connection for ${userId}...`);
        
        // Get the session for the existing connection
        const userInfo = connections.get(existingConnection);
        if (userInfo) {
          const existingSession = sessions.get(userInfo.sessionId);
          if (existingSession) {
            existingSession.delete(existingConnection);
            console.log(`Removed user from session ${userInfo.sessionId}`);
          }
        }
        
        // Remove from connections map
        connections.delete(existingConnection);
        
        // Close the connection if it's still open
        if (existingConnection.readyState === WebSocket.OPEN) {
          existingConnection.close();
          console.log(`Closed existing connection for ${userId}`);
        }
      }
      
      // Store the connection with user info
      connections.set(ws, {
        userId,
        userName,
        sessionId,
        connectedAt: new Date().toISOString()
      });
      
      // Initialize session if it doesn't exist
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, new Set());
        console.log(`Created new session: ${sessionId}`);
      }
      
      // Add this connection to the session
      const sessionConnections = sessions.get(sessionId);
      sessionConnections.add(ws);
      
      console.log(`User ${userName} (${userId}) joined session ${sessionId} (${sessionConnections.size} participants)`);
      
      // Send existing participants to the new user
      let existingUsers = [];
      for (const client of sessionConnections) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          const info = connections.get(client);
          if (info) {
            existingUsers.push({
              userId: info.userId,
              userName: info.userName
            });
          }
        }
      }
      
      // Send list of existing participants to new user
      if (existingUsers.length > 0) {
        console.log(`Sending ${existingUsers.length} existing participants to new user ${userName}`);
        ws.send(JSON.stringify({
          type: 'existing-users',
          users: existingUsers
        }));
      }
      
      // Notify other participants about the new user
      for (const client of sessionConnections) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          console.log(`Notifying another participant about ${userName}`);
          client.send(JSON.stringify({
            type: 'user-joined',
            userId,
            userName
          }));
        }
      }
      
      // Handle messages
      ws.on('message', (message) => {
        try {
          console.log('Received WebSocket message:', message.toString().substring(0, 100) + '...');
          const data = JSON.parse(message);
          const sender = connections.get(ws);
          
          if (!sender) {
            console.log('Message from unknown sender, ignoring');
            return;
          }
          
          console.log(`Received message from ${sender.userName} (${sender.userId}): ${data.type}`);
          
          switch (data.type) {
            case 'join':
              // Already handled during connection
              console.log(`${sender.userName} joined again`);
              
              // Send acknowledgment
              ws.send(JSON.stringify({
                type: 'join-ack',
                message: 'Join acknowledged'
              }));
              break;
              
            case 'leave':
              handleUserLeaving(ws);
              break;
              
            case 'offer':
            case 'answer':
            case 'ice-candidate':
              // Forward signaling messages to the target
              forwardSignalingMessage(data, ws);
              break;
              
            case 'media-state-change':
              // Forward media state change to all users in the session
              forwardToAllInSession(data, ws);
              break;
              
            case 'request-participants':
              // Get the sender info
              const requester = connections.get(ws);
              if (!requester) {
                console.log('No requester information found');
                break;
              }
              
              // Get the session connections
              const participantsSessionConnections = sessions.get(requester.sessionId);
              if (!participantsSessionConnections) {
                console.log(`Session ${requester.sessionId} not found for participants request`);
                break;
              }
              
              // Collect existing users
              let sessionParticipants = [];
              for (const client of participantsSessionConnections) {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                  const info = connections.get(client);
                  if (info) {
                    sessionParticipants.push({
                      userId: info.userId,
                      userName: info.userName
                    });
                  }
                }
              }
              
              console.log(`Re-sending ${sessionParticipants.length} participants to ${requester.userId}`);
              
              // Send the list to the requester
              ws.send(JSON.stringify({
                type: 'existing-users',
                users: sessionParticipants
              }));
              
              // Also notify other participants about this user again, in case they missed it
              for (const client of participantsSessionConnections) {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                  console.log(`Re-notifying another participant about ${requester.userName}`);
                  client.send(JSON.stringify({
                    type: 'user-joined',
                    userId: requester.userId,
                    userName: requester.userName
                  }));
                }
              }
              
              break;
              
            case 'force-join-notification':
              // Forward the force join notification to the target user
              console.log(`Forwarding forced join notification from ${sender.userName} to ${data.targetUserId}`);
              
              // Check for targetUserId
              if (!data.targetUserId) {
                console.log('No target user ID for force-join-notification');
                break;
              }
              
              // Find the target
              let forceJoinTarget = null;
              for (const [ws, info] of connections.entries()) {
                if (info.userId === data.targetUserId && info.sessionId === sender.sessionId) {
                  forceJoinTarget = ws;
                  break;
                }
              }
              
              if (!forceJoinTarget) {
                console.log(`Target user ${data.targetUserId} not found for force-join-notification`);
                break;
              }
              
              // Forward the message
              if (forceJoinTarget.readyState === WebSocket.OPEN) {
                const forceJoinMessage = JSON.stringify({
                  type: 'force-join-notification',
                  userId: sender.userId,
                  userName: sender.userName
                });
                forceJoinTarget.send(forceJoinMessage);
                console.log(`Sent force-join-notification to ${data.targetUserId}`);
              }
              break;
              
            case 'restart-connection':
              // Forward connection restart request to the target user
              console.log(`Forwarding connection restart request from ${sender.userName} to ${data.targetUserId}`);
              
              // Check for targetUserId
              if (!data.targetUserId) {
                console.log('No target user ID for restart-connection');
                break;
              }
              
              // Find the target
              let restartTarget = null;
              for (const [ws, info] of connections.entries()) {
                if (info.userId === data.targetUserId && info.sessionId === sender.sessionId) {
                  restartTarget = ws;
                  break;
                }
              }
              
              if (!restartTarget) {
                console.log(`Target user ${data.targetUserId} not found for restart-connection`);
                break;
              }
              
              // Forward the message
              if (restartTarget.readyState === WebSocket.OPEN) {
                const restartMessage = JSON.stringify({
                  type: 'restart-connection',
                  userId: sender.userId
                });
                restartTarget.send(restartMessage);
                console.log(`Sent restart-connection to ${data.targetUserId}`);
              }
              break;
              
            case 'debug-connection-status':
              // Forward the debug connection status to all participants
              console.log(`Broadcasting connection status from ${sender.userName}`);
              forwardToAllInSession(data, ws);
              break;
              
            default:
              console.log('Unknown message type:', data.type);
              
              // Acknowledge the message
              ws.send(JSON.stringify({
                type: 'message-ack',
                message: 'Message received but not handled',
                originalType: data.type
              }));
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      });
      
      // Handle disconnections
      ws.on('close', (code, reason) => {
        console.log(`WebSocket closed with code ${code}, reason: ${reason || 'No reason provided'}`);
        handleUserLeaving(ws);
      });

      // Send connection acknowledgment
      ws.send(JSON.stringify({
        type: 'connection-ack',
        message: 'Connected to server',
        userId,
        userName,
        sessionId,
        participants: sessionConnections.size
      }));
      
      console.log('Sent connection acknowledgment');
    } catch (err) {
      console.error('Error handling WebSocket connection:', err);
      ws.close(1011, 'Internal server error');
    }
  });
  
  // Server events
  wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });

  wss.on('listening', () => {
    console.log('WebSocket server is listening for connections');
  });
  
  // Print active sessions every 30 seconds for debugging
  setInterval(() => {
    console.log(`Active sessions: ${sessions.size}`);
    for (const [sessionId, clients] of sessions.entries()) {
      console.log(`Session ${sessionId}: ${clients.size} clients`);
    }
  }, 30000);
  
  return wss;
};

// Handle a user leaving
const handleUserLeaving = (ws) => {
  const connInfo = connections.get(ws);
  if (!connInfo) return;
  
  console.log(`User ${connInfo.userName} (${connInfo.userId}) left session ${connInfo.sessionId}`);
  
  // Get the session
  const sessionConnections = sessions.get(connInfo.sessionId);
  if (sessionConnections) {
    // Remove this connection from the session
    sessionConnections.delete(ws);
    
    // Notify other participants
    for (const client of sessionConnections) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'user-left',
          userId: connInfo.userId,
          userName: connInfo.userName
        }));
      }
    }
    
    // Clean up empty sessions
    if (sessionConnections.size === 0) {
      sessions.delete(connInfo.sessionId);
    }
  }
  
  // Remove the connection
  connections.delete(ws);
};

// Forward signaling messages to specific target
const forwardSignalingMessage = (data, senderWs) => {
  const sender = connections.get(senderWs);
  if (!sender) {
    console.log('No sender information found');
    return;
  }
  
  const { targetUserId } = data;
  
  // Get the session
  const sessionConnections = sessions.get(sender.sessionId);
  if (!sessionConnections) {
    console.log(`Session ${sender.sessionId} not found`);
    return;
  }
  
  // If targetUserId is specified, try to forward to that specific user
  if (targetUserId) {
    console.log(`Attempting to forward ${data.type} from ${sender.userId} to ${targetUserId}`);
    
    // Check if we're trying to send to self
    if (targetUserId === sender.userId) {
      console.log(`Ignoring message sent from ${sender.userId} to self`);
      return false;
    }
    
    // Find the target user's connection
    let targetWs = null;
    let targetFound = false;
    
    for (const [ws, info] of connections.entries()) {
      if (info.userId === targetUserId && info.sessionId === sender.sessionId) {
        targetWs = ws;
        targetFound = true;
        break;
      }
    }
    
    if (!targetFound) {
      console.log(`Target user ${targetUserId} not found in session ${sender.sessionId}, broadcasting to all instead`);
      
      // Fall back to broadcasting to all users in the session
      return broadcastToSession(data, senderWs, sender, sessionConnections);
    }
    
    // Check if connection is open
    if (targetWs.readyState === WebSocket.OPEN) {
      // Forward the message with the sender's info
      const messageToSend = JSON.stringify({
        ...data,
        userId: sender.userId,
        userName: sender.userName
      });
      
      try {
        targetWs.send(messageToSend);
        console.log(`Successfully forwarded ${data.type} from ${sender.userId} to ${targetUserId}`);
        return true;
      } catch (err) {
        console.error(`Error sending message to ${targetUserId}:`, err);
      }
    } else {
      console.log(`Connection to ${targetUserId} not open, state: ${targetWs.readyState}`);
    }
    
    return false;
  } else {
    // No specific target, broadcast to all in the session
    console.log(`Broadcasting ${data.type} from ${sender.userId} to all in session ${sender.sessionId}`);
    return broadcastToSession(data, senderWs, sender, sessionConnections);
  }
};

// Helper function to broadcast to all users in a session except the sender
const broadcastToSession = (data, senderWs, sender, sessionConnections) => {
  let messageForwarded = false;
  
  // Prepare the message with sender info
  const messageToSend = JSON.stringify({
    ...data,
    userId: sender.userId,
    userName: sender.userName
  });
  
  // Send to all connections in the session except the sender
  for (const ws of sessionConnections) {
    // Skip sender
    if (ws === senderWs) {
      continue;
    }
    
    const recipientInfo = connections.get(ws);
    if (!recipientInfo) {
      continue;
    }
    
    // Skip if same user (e.g., multiple tabs)
    if (recipientInfo.userId === sender.userId) {
      console.log(`Skipping another connection of the same user: ${sender.userId}`);
      continue;
    }
    
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(messageToSend);
        console.log(`Broadcast: forwarded ${data.type} from ${sender.userId} to ${recipientInfo.userId}`);
        messageForwarded = true;
      } catch (err) {
        console.error(`Error sending broadcast to ${recipientInfo.userId}:`, err);
      }
    }
  }
  
  if (!messageForwarded) {
    console.log(`Warning: Message ${data.type} was not forwarded to any recipients`);
  }
  
  return messageForwarded;
};

// Forward to all users in a session
const forwardToAllInSession = (data, senderWs) => {
  const sender = connections.get(senderWs);
  if (!sender) {
    console.log('No sender information found');
    return false;
  }
  
  console.log(`Broadcasting ${data.type} from ${sender.userId} to all in session ${sender.sessionId}`);
  
  // Get the session
  const sessionConnections = sessions.get(sender.sessionId);
  if (!sessionConnections) {
    console.log(`Session ${sender.sessionId} not found`);
    return false;
  }
  
  let messageForwarded = false;
  
  // Add sender information to the message
  const messageToSend = JSON.stringify({
    ...data,
    userId: sender.userId,
    userName: sender.userName
  });
  
  // Send to all connections in the session
  for (const ws of sessionConnections) {
    // Skip sending the message back to the sender
    if (ws === senderWs) continue;
    
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(messageToSend);
        messageForwarded = true;
      } catch (err) {
        console.error(`Error forwarding message to client:`, err);
      }
    }
  }
  
  return messageForwarded;
};

module.exports = { initializeWebSocketServer }; 