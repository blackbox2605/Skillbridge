import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  FaMicrophone, FaMicrophoneSlash, 
  FaVideo, FaVideoSlash, 
  FaPhoneSlash,
  FaUserCircle,
  FaExpand, FaCompress
} from 'react-icons/fa';
import styles from './VideoCall.module.css';

const VideoCall = ({ sessionId, participants, onEndCall }) => {
  const { currentUser } = useAuth();
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [connections, setConnections] = useState({});
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('Initializing...');
  const [myUserId, setMyUserId] = useState('');
  const [fullscreenVideo, setFullscreenVideo] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // New state object for consolidated participant info - single source of truth
  const [participantInfo, setParticipantInfo] = useState({});
  
  const localVideoRef = useRef(null);
  const fullScreenContainerRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionsRef = useRef({});
  
  // Ice servers configuration for STUN/TURN
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      // Add free TURN servers for better connectivity
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:turn.jitsi.org:443?transport=tcp',
        username: 'jitsi',
        credential: 'meetpass'
      }
    ],
    iceCandidatePoolSize: 10
  };

  // Additional configuration that forces WebRTC to use relay servers for local testing
  const peerConnectionConfig = {
    ...iceServers,
    sdpSemantics: 'unified-plan',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    // This helps when testing locally in the same browser
    iceTransportPolicy: 'all' // Use 'relay' for production
  };

  // Handle connection retry
  const retryConnection = () => {
    if (retryCount < 3) {
      // Close existing connections
      Object.values(peerConnectionsRef.current).forEach(pc => {
        if (pc) pc.close();
      });
      peerConnectionsRef.current = {};
      
      // Clear remote streams
      setRemoteStreams({});
      
      // Clear connections
      setConnections({});
      
      // Stop local stream if it exists
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      
      // Close WebSocket connection
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      
      // Reset states and retry
      setError(null);
      setIsConnecting(true);
      setRetryCount(prevCount => prevCount + 1);
    } else {
      setError("Maximum retry attempts reached. Please check if the server is running.");
    }
  };

  // Safe way to send messages through WebSocket
  const safeSendMessage = (message) => {
    try {
      if (!socketRef.current) {
        console.warn('WebSocket not initialized');
        return false;
      }
      
      // Better debugging for message content
      const messageObj = typeof message === 'string' ? JSON.parse(message) : message;
      console.log(`Sending ${messageObj.type} message to ${messageObj.targetUserId || 'unknown'}`);

      // Always make sure we use myUserId as the userId
      if (!messageObj.userId) {
        console.log(`Adding userId: ${myUserId}`);
        messageObj.userId = myUserId;
      }
      
      const messageStr = JSON.stringify(messageObj);
      
      if (socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(messageStr);
        console.log(`Message sent successfully: ${messageObj.type}`);
        return true;
      } else {
        console.warn(`WebSocket not open, current state: ${socketRef.current.readyState}`);
        
        // Queue the message to send when connection opens
        if (socketRef.current.readyState === WebSocket.CONNECTING) {
          console.log('WebSocket still connecting, queueing message');
          
          // Remove any existing onopen handler
          const existingOnOpen = socketRef.current.onopen;
          
          // Add new handler that sends queued message and then calls original handler
          socketRef.current.onopen = (event) => {
            console.log('Connection opened, sending queued message');
            socketRef.current.send(messageStr);
            
            // Call the original onopen handler
            if (existingOnOpen) {
              existingOnOpen(event);
            }
          };
        }
        
        return false;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  };

  // Handle a new user joining the session
  const handleUserJoined = async (userId, userName) => {
    console.log(`User joined: ${userName} (${userId}), my ID: ${myUserId}`);
    
    // Double check to make sure we don't create a connection to ourself
    if (userId === myUserId) {
      console.log('Ignoring self-join event');
      return;
    }
    
    // Add more detailed logging
    console.log(`Current peer connections:`, Object.keys(peerConnectionsRef.current));
    console.log(`Current remote streams:`, Object.keys(remoteStreams));
    
    try {
      // Check if we already have a connection for this user
      if (peerConnectionsRef.current[userId]) {
        console.log(`Peer connection for ${userName} already exists, checking state...`);
        const existingConnection = peerConnectionsRef.current[userId];
        
        // If the connection is in a failed state, recreate it
        if (existingConnection.iceConnectionState === 'failed' || 
            existingConnection.iceConnectionState === 'disconnected' ||
            existingConnection.signalingState === 'closed') {
          console.log(`Existing connection is in ${existingConnection.iceConnectionState} state, recreating...`);
          existingConnection.close();
          delete peerConnectionsRef.current[userId];
        } else {
          console.log(`Existing connection is in ${existingConnection.iceConnectionState} state, keeping it.`);
          return;
        }
      }
      
      // Create a new RTCPeerConnection
      console.log(`Creating new peer connection for ${userName}`);
      const peerConnection = new RTCPeerConnection(peerConnectionConfig);
      peerConnectionsRef.current[userId] = peerConnection;
      
      // Update connections state
      setConnections(prev => ({
        ...prev,
        [userId]: { 
          ...prev[userId], 
          userName, 
          status: 'new' 
        }
      }));
      
      // Add local stream tracks to the peer connection
      if (localStream) {
        console.log('Adding local stream tracks to peer connection');
        localStream.getTracks().forEach(track => {
          console.log(`Adding track to peer connection: ${track.kind}`);
          peerConnection.addTrack(track, localStream);
        });
      } else {
        console.warn('No local stream available when creating peer connection');
        // Try to get the stream again if it's not available
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
          });
          setLocalStream(newStream);
          newStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, newStream);
          });
        } catch (err) {
          console.error('Failed to get user media on retry:', err);
        }
      }
      
      // Inside handleUserJoined function, add additional logging for connection creation
      console.log(`Setting up ICE candidate and connection state handlers for ${userName}`);

      // Set up ice candidate handling
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`Generated ICE candidate for peer ${userId} (${event.candidate.candidate.substring(0, 50)}...)`);
          safeSendMessage({
            type: 'ice-candidate',
            candidate: event.candidate,
            targetUserId: userId
          });
        } else {
          console.log('ICE candidate gathering complete for peer', userId);
        }
      };
      
      // Add logging for iceconnectionstatechange
      peerConnection.addEventListener('iceconnectionstatechange', () => {
        console.log(`ICE connection state changed for ${userName}: ${peerConnection.iceConnectionState}`);
      });
      
      // Add logging for connectionstatechange
      peerConnection.addEventListener('connectionstatechange', () => {
        console.log(`Connection state changed for ${userName}: ${peerConnection.connectionState}`);
      });
      
      // Add logging for signalingStateChange
      peerConnection.addEventListener('signalingstatechange', () => {
        console.log(`Signaling state changed for ${userName}: ${peerConnection.signalingState}`);
      });
      
      // Add error handler for potential connection problems
      peerConnection.addEventListener('icecandidateerror', (event) => {
        console.error(`ICE candidate error for ${userName}:`, event);
      });
      
      // Set up ice connection state change handling
      peerConnection.oniceconnectionstatechange = () => {
        console.log(`ICE connection state changed to: ${peerConnection.iceConnectionState} for ${userName}`);
        
        if (peerConnection.iceConnectionState === 'failed' || 
            peerConnection.iceConnectionState === 'disconnected') {
          console.log(`ICE connection to ${userName} failed or disconnected. Attempting to restart...`);
          
          // Update connection status
          setConnections(prev => ({
            ...prev,
            [userId]: { 
              ...prev[userId],
              status: 'connection-failed' 
            }
          }));
          
          // Try to restart ICE if possible
          try {
            if (peerConnection.restartIce) {
              peerConnection.restartIce();
              console.log('ICE restart initiated');
            } else {
              // If restartIce is not available, recreate the connection
              console.log('restartIce not available, recreating connection...');
              setTimeout(() => {
                // Close the existing connection
                peerConnection.close();
                delete peerConnectionsRef.current[userId];
                
                // Remove from remoteStreams
                setRemoteStreams(prev => {
                  const newStreams = { ...prev };
                  delete newStreams[userId];
                  return newStreams;
                });
                
                // Create a new connection after a brief delay
                setTimeout(() => handleUserJoined(userId, userName), 1000);
              }, 500);
            }
          } catch (err) {
            console.error('Error handling connection failure:', err);
          }
        } else if (peerConnection.iceConnectionState === 'connected' || 
                  peerConnection.iceConnectionState === 'completed') {
          console.log(`ICE connection to ${userName} established successfully`);
          
          // Update connections state
          setConnections(prev => ({
            ...prev,
            [userId]: { 
              ...prev[userId], 
              userName, 
              status: 'connected' 
            }
          }));
        }
      };
      
      // Set up connection state change handling
      peerConnection.onconnectionstatechange = () => {
        console.log(`Connection state changed to: ${peerConnection.connectionState} for ${userName}`);
      };
      
      // Handle remote track
      peerConnection.ontrack = (event) => {
        console.log(`Received remote track from ${userId}: ${event.track.kind}`, event.streams);
        
        if (event.streams && event.streams[0]) {
          console.log(`Stream has ${event.streams[0].getTracks().length} tracks`);
          
          // Add stability by managing track state
          event.streams[0].getTracks().forEach(track => {
            console.log(`Remote track details: kind=${track.kind}, enabled=${track.enabled}, readyState=${track.readyState}`);
            
            // Add ended listener with debounce mechanism to prevent flickering
            track.onended = () => handleTrackEnded(userId, track.kind);
            
            // Add mute listener as an alternative signal that the track is having issues
            track.onmute = () => {
              console.log(`Track ${track.kind} muted for ${userId}`);
              
              // Only update videoDisabled if it's a video track
              if (track.kind === 'video') {
                setRemoteStreams(prev => {
                  if (!prev[userId]) return prev;
                  
                  return {
                    ...prev,
                    [userId]: {
                      ...prev[userId],
                      videoDisabled: true
                    }
                  };
                });
              }
            };
            
            // Add unmute listener to restore video
            track.onunmute = () => {
              console.log(`Track ${track.kind} unmuted for ${userId}`);
              
              // Only update videoDisabled if it's a video track
              if (track.kind === 'video') {
                setRemoteStreams(prev => {
                  if (!prev[userId]) return prev;
                  
                  return {
                    ...prev,
                    [userId]: {
                      ...prev[userId],
                      videoDisabled: false
                    }
                  };
                });
              }
            };
            
            // Force track to be enabled in case it comes in disabled
            track.enabled = true;
          });
          
          // Store the remote stream with a small delay to ensure React can properly update
          setTimeout(() => {
        setRemoteStreams(prev => {
          // Check if we already have this stream
              if (prev[userId] && prev[userId].stream && prev[userId].stream.id === event.streams[0].id) {
                // Don't replace the stream if it's the same ID to avoid UI rerendering
                console.log(`Stream already exists for ${userId}, preserving stability`);
                return prev;
          }
          
          console.log(`Adding new remote stream for ${userName}`, event.streams[0]);
              
              // Get participant info for consistent naming
              const info = participantInfo[userId] || { userName, videoEnabled: true, audioEnabled: true };
              
              // Use the most reliable name source (priority: participantInfo > connections > passed userName > "Unknown")
              const reliableName = 
                (info.userName && info.userName !== 'Unknown' ? info.userName : 
                  (connections[userId]?.userName && connections[userId]?.userName !== 'Unknown' ? connections[userId].userName : 
                    (userName && userName !== 'Unknown' ? userName : 'Unknown Participant')));
              
              // Check for video and audio track presence and status
              const hasEnabledVideoTrack = event.streams[0].getVideoTracks().some(track => 
                track.enabled && track.readyState === 'live');
              
          return {
            ...prev,
            [userId]: {
              stream: event.streams[0],
                  userName: reliableName,
                  videoDisabled: !hasEnabledVideoTrack, // Set based on actual track state
                  isReconnecting: false, // Reset reconnecting state when receiving a new stream
                  lastTrackUpdate: Date.now() // Track when we last updated
            }
          };
        });
            
            // Update participant info to indicate we have their stream, but don't override name if we have a good one
            const currentName = participantInfo[userId]?.userName;
            updateParticipantInfo(userId, {
              hasStream: true,
              isReconnecting: false,
              // Only update name if we don't have one or it's "Unknown"
              ...((!currentName || currentName === 'Unknown') && userName !== 'Unknown' ? { userName } : {})
            });
            
            // Clear the reconnection flag from last reconnect time
            if (window._lastReconnectTime && window._lastReconnectTime[userId]) {
              window._lastReconnectTime[userId] = 0;
            }
            
            // Also log the current remoteStreams to check state
            console.log(`Current remote streams after adding: ${Object.keys(remoteStreams).length}`);
          }, 100);
        } else {
          console.warn(`Received track event without streams for ${userName}`);
        }
      };
      
      // Create and send an offer
      try {
        console.log(`Creating offer for peer ${userId}`);
        
        // Check if we already have a local description
        if (peerConnection.signalingState !== 'stable') {
          console.log(`Signaling state is ${peerConnection.signalingState}, waiting for it to stabilize`);
          await new Promise(resolve => {
            const checkState = () => {
              if (peerConnection.signalingState === 'stable') {
                resolve();
              } else {
                setTimeout(checkState, 500);
              }
            };
            checkState();
          });
        }
        
        const offer = await peerConnection.createOffer({
          offerToReceiveAudio: true, 
          offerToReceiveVideo: true
        });
        
        console.log(`Offer created: ${offer.sdp.substring(0, 100)}...`);
        
        await peerConnection.setLocalDescription(offer);
        console.log('Set local description, sending offer');
        
        // Send offer using safe send method - TO the target user
        const offerSent = safeSendMessage({
          type: 'offer',
          offer: peerConnection.localDescription,
          targetUserId: userId  // We are sending TO the other user
        });
        
        if (offerSent) {
          console.log(`Offer sent to ${userName} (${userId})`);
        } else {
          console.warn(`Failed to send offer to ${userName}, will retry in 2 seconds`);
          setTimeout(() => {
            if (peerConnectionsRef.current[userId]) {
              console.log(`Retrying offer send to ${userName}`);
              safeSendMessage({
                type: 'offer',
                offer: peerConnection.localDescription,
                targetUserId: userId
              });
            }
          }, 2000);
        }
        
        // Update the connections state
        setConnections(prev => ({
          ...prev,
          [userId]: { userName, status: 'connecting' }
        }));
      } catch (err) {
        console.error('Error creating offer:', err);
      }
    } catch (err) {
      console.error('Error in handleUserJoined:', err);
    }

    // Make sure participantStates is also updated with the name
    setParticipantInfo(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        userName
      }
    }));

    // Update participant info for this user
    updateParticipantInfo(userId, {
      userName,
      connected: true
    });
  };
  
  // Handle a user leaving the session
  const handleUserLeft = (userId) => {
    console.log(`User left: ${userId}`);
    
    // Close the peer connection
    if (peerConnectionsRef.current[userId]) {
      peerConnectionsRef.current[userId].close();
      delete peerConnectionsRef.current[userId];
    }
    
    // Remove the remote stream
    setRemoteStreams(prev => {
      const newStreams = { ...prev };
      delete newStreams[userId];
      return newStreams;
    });
    
    // Update the connections state
    setConnections(prev => {
      const newConnections = { ...prev };
      delete newConnections[userId];
      return newConnections;
    });
  };
  
  // Handle an incoming offer
  const handleOffer = async (offer, userId, userName) => {
    console.log(`Received offer from ${userName || 'Unknown'} (${userId})`, offer);
    
    // Make sure userName is stored even if connection fails
    setConnections(prev => ({
      ...prev,
      [userId]: { 
        ...prev[userId],
        userName: userName || prev[userId]?.userName || 'Unknown', 
        status: 'connecting' 
      }
    }));
    
    // Also update participant state
    setParticipantInfo(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        userName: userName || prev[userId]?.userName || 'Unknown'
      }
    }));
    
    // Double check to make sure we don't create a connection to ourself
    if (userId === myUserId) {
      console.log('Ignoring offer from self');
      return;
    }
    
    try {
      // Create a peer connection if it doesn't exist
      if (!peerConnectionsRef.current[userId]) {
        console.log(`Creating new peer connection for ${userName} in response to offer`);
        const peerConnection = new RTCPeerConnection(peerConnectionConfig);
        peerConnectionsRef.current[userId] = peerConnection;
        
        // Add local stream tracks to the connection
        if (localStream) {
          console.log('Adding local tracks to peer connection');
          localStream.getTracks().forEach(track => {
            console.log(`Adding track: ${track.kind}`);
            peerConnection.addTrack(track, localStream);
          });
        } else {
          console.warn('No local stream available when receiving offer');
        }
        
        // Set up event handlers
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            console.log(`Generated ICE candidate for peer ${userId} after offer`, event.candidate);
            safeSendMessage({
              type: 'ice-candidate',
              candidate: event.candidate,
              targetUserId: userId  // Send TO the user who sent us the offer
            });
          } else {
            console.log('ICE candidate gathering complete after offer for peer', userId);
          }
        };
        
        // Set up ice connection state change handling
        peerConnection.oniceconnectionstatechange = () => {
          console.log(`ICE connection state with ${userName}: ${peerConnection.iceConnectionState}`);
          
          if (peerConnection.iceConnectionState === 'failed' || 
              peerConnection.iceConnectionState === 'disconnected') {
            console.warn(`ICE connection failed or disconnected with ${userName}`);
            // Update connection status in UI
            setConnections(prev => ({
              ...prev,
              [userId]: { 
                ...prev[userId],
                status: 'connection-failed' 
              }
            }));
            
            // Try to restart ICE if possible
            try {
              if (peerConnection.restartIce) {
                peerConnection.restartIce();
                console.log('ICE restart initiated after offer');
              }
            } catch (err) {
              console.error('Error restarting ICE after offer:', err);
            }
          } else if (peerConnection.iceConnectionState === 'connected' || 
                    peerConnection.iceConnectionState === 'completed') {
            console.log(`ICE connection established with ${userName}`);
            // Update connection status in UI
            setConnections(prev => ({
              ...prev,
              [userId]: { 
                ...prev[userId], 
                status: 'connected' 
              }
            }));
          }
        };
        
        peerConnection.ontrack = (event) => {
          console.log(`Received remote track from ${userName} after offer: ${event.track.kind}`, event.streams);
          
          if (event.streams && event.streams[0]) {
            console.log(`Stream has ${event.streams[0].getTracks().length} tracks`);
            event.streams[0].getTracks().forEach(track => {
              console.log(`Remote track details: kind=${track.kind}, enabled=${track.enabled}, readyState=${track.readyState}`);
            });
          }
          
          // Store the remote stream
          setRemoteStreams(prev => {
            // Check if we already have this stream
            if (prev[userId] && prev[userId].stream && prev[userId].stream.id === event.streams[0].id) {
              return prev; // No change needed
            }
            
            console.log(`Adding new remote stream for ${userName} after receiving offer`, event.streams[0]);
            return {
              ...prev,
              [userId]: {
                stream: event.streams[0],
                userName: userName || connections[userId]?.userName || 'Unknown'
              }
            };
          });
        };
        
        // Update connections state
        setConnections(prev => ({
          ...prev,
          [userId]: { 
            userName: userName || prev[userId]?.userName || 'Unknown', 
            status: 'connecting' 
          }
        }));
      } else {
        console.log(`Using existing peer connection for ${userName}`);
      }
      
      const peerConnection = peerConnectionsRef.current[userId];
      
      try {
        console.log('Setting remote description from offer', offer);
        // Set remote description from the offer
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        
        // Small delay to ensure remote description is set before creating answer
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('Creating answer');
        // Create and send an answer
        const answer = await peerConnection.createAnswer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await peerConnection.setLocalDescription(answer);
        
        console.log(`Sending answer to ${userName} (${userId})`, answer);
        safeSendMessage({
          type: 'answer',
          answer: peerConnection.localDescription,
          targetUserId: userId  // Send TO the user who sent us the offer
        });
        
        console.log(`Answer sent to ${userName}`);
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    } catch (err) {
      console.error('Error in handleOffer:', err);
    }
  };
  
  // Handle an incoming answer
  const handleAnswer = async (answer, userId, userName) => {
    console.log(`Received answer from ${userName || 'Unknown'} (${userId})`, answer);
    
    // Make sure userName is stored
    setConnections(prev => ({
      ...prev,
      [userId]: { 
        ...prev[userId],
        userName: userName || prev[userId]?.userName || 'Unknown', 
        status: prev[userId]?.status || 'connecting' 
      }
    }));
    
    // Also update participant state
    setParticipantInfo(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        userName: userName || prev[userId]?.userName || 'Unknown'
      }
    }));
    
    try {
      const peerConnection = peerConnectionsRef.current[userId];
      if (peerConnection) {
        console.log('Setting remote description from answer', answer);
        
        // Check current signaling state to avoid errors
        if (peerConnection.signalingState === 'have-local-offer') {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
          console.log(`Remote description set successfully for ${userName}`);
          
          // Update connection status
          setConnections(prev => ({
            ...prev,
            [userId]: { 
              ...prev[userId],
              userName: userName || prev[userId]?.userName,
              status: 'connected' 
            }
          }));
          
          console.log(`Connection established with ${userName}`);
        } else {
          console.warn(`Cannot set remote description in current signaling state: ${peerConnection.signalingState}`);
          
          // Try to recreate the connection if in a bad state
          if (peerConnection.signalingState === 'closed') {
            console.log(`Peer connection is closed, recreating for ${userName}`);
            
            // Clean up old connection
            peerConnection.close();
            delete peerConnectionsRef.current[userId];
            
            // Create new connection
            handleUserJoined(userId, userName);
          }
        }
      } else {
        console.warn(`No peer connection found for ${userId} when receiving answer`);
        // Create a new connection
        handleUserJoined(userId, userName);
      }
    } catch (err) {
      console.error('Error handling answer:', err);
    }
  };
  
  // Handle an incoming ICE candidate
  const handleIceCandidate = async (candidate, userId, userName) => {
    console.log(`Received ICE candidate from ${userName} (${userId})`, candidate);
    
    // Double check to make sure it's not from ourself
    if (userId === myUserId) {
      console.log('Ignoring ICE candidate from self');
      return;
    }
    
    try {
      const peerConnection = peerConnectionsRef.current[userId];
      if (!peerConnection) {
        console.warn(`No peer connection found for ${userId} when receiving ICE candidate`);
        // Store the candidate to process later when the connection is created
        if (!window._pendingCandidates) window._pendingCandidates = {};
        if (!window._pendingCandidates[userId]) window._pendingCandidates[userId] = [];
        window._pendingCandidates[userId].push(candidate);
        console.log(`Stored pending ICE candidate for future connection with ${userName}`);
        return;
      }
      
        // Make sure the peer connection is in a valid state to add ICE candidates
        if (peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
          console.log('Adding ICE candidate to peer connection');
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('ICE candidate added successfully');
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
        } else {
          console.warn('Remote description not set, cannot add ICE candidate yet');
          
          // Buffer the candidate to add later
          console.log('Buffering ICE candidate for later');
          const existingCandidates = peerConnection._bufferedIceCandidates || [];
          peerConnection._bufferedIceCandidates = [...existingCandidates, candidate];
          
          // Set up a one-time event listener to process buffered candidates
          if (!peerConnection._hasBufferProcessor) {
            peerConnection._hasBufferProcessor = true;
            
            const processCandidates = async () => {
              if (peerConnection._bufferedIceCandidates && peerConnection._bufferedIceCandidates.length > 0) {
                console.log(`Processing ${peerConnection._bufferedIceCandidates.length} buffered ICE candidates`);
                
                for (const bufferedCandidate of peerConnection._bufferedIceCandidates) {
                  try {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(bufferedCandidate));
                    console.log('Buffered ICE candidate added');
                  } catch (err) {
                    console.error('Error adding buffered ICE candidate:', err);
                  }
                }
                
                peerConnection._bufferedIceCandidates = [];
              }
            };
            
            // Process when remote description is set
            peerConnection.addEventListener('signalingstatechange', () => {
            console.log(`Signaling state changed to: ${peerConnection.signalingState}`);
              if (peerConnection.signalingState !== 'have-local-offer' && 
                  peerConnection.remoteDescription && 
                  peerConnection.remoteDescription.type) {
                processCandidates();
              }
            });
          }
      }
    } catch (err) {
      console.error('Error handling ICE candidate:', err);
    }
  };
  
  // Toggle microphone
  const toggleAudio = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      const newAudioState = !isAudioEnabled;
      setIsAudioEnabled(newAudioState);
      
      // Broadcast audio state change to other participants
      broadcastMediaStateChange('audio', newAudioState);
    }
  };
  
  // Toggle camera
  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      const newVideoState = !isVideoEnabled;
      setIsVideoEnabled(newVideoState);
      
      // Broadcast video state change to other participants
      broadcastMediaStateChange('video', newVideoState);
    }
  };
  
  // Broadcast media state changes to all participants
  const broadcastMediaStateChange = (mediaType, enabled) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      console.log(`Broadcasting ${mediaType} state change: ${enabled}`);
      
      // Update local participant info first
      if (myUserId) {
        updateParticipantInfo(myUserId, {
          [`${mediaType}Enabled`]: enabled,
          userName: currentUser?.name || 'You'
        });
      }
      
      // Send message to other participants
      safeSendMessage({
        type: 'media-state-change',
        userId: myUserId,
        mediaType,
        enabled
      });
    }
  };
  
  // End the call
  const endCall = () => {
    // Notify the server that we're leaving
    if (socketRef.current) {
      safeSendMessage({
        type: 'leave',
        userId: myUserId,
        sessionId
      });
    }
    
    // Notify the parent component
    if (onEndCall) {
      onEndCall();
    }
  };

  // Toggle fullscreen for a specific video
  const toggleFullscreen = (videoId) => {
    if (fullscreenVideo === videoId) {
      setFullscreenVideo(null);
    } else {
      setFullscreenVideo(videoId);
    }
  };

  // Toggle fullscreen mode for the entire call interface
  const toggleFullScreenMode = () => {
    const videoContainer = document.getElementById('video-container');
    
    if (!videoContainer) return;

    if (!isFullScreen) {
      if (videoContainer.requestFullscreen) {
        videoContainer.requestFullscreen();
      } else if (videoContainer.webkitRequestFullscreen) { /* Safari */
        videoContainer.webkitRequestFullscreen();
      } else if (videoContainer.msRequestFullscreen) { /* IE11 */
        videoContainer.msRequestFullscreen();
      } else if (videoContainer.mozRequestFullScreen) { /* Firefox */
        videoContainer.mozRequestFullScreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) { /* Safari */
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) { /* IE11 */
        document.msExitFullscreen();
      } else if (document.mozCancelFullScreen) { /* Firefox */
        document.mozCancelFullScreen();
      }
    }
  };

  // Add fullscreen change event listener
  useEffect(() => {
    const handleFullScreenChange = () => {
      const isFullscreenActive = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullScreen(isFullscreenActive);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullScreenChange);
    document.addEventListener('mozfullscreenchange', handleFullScreenChange);
    document.addEventListener('MSFullscreenChange', handleFullScreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullScreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullScreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullScreenChange);
    };
  }, []);

  // Add custom CSS styles for the fullscreen mode
  useEffect(() => {
    if (isFullScreen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isFullScreen]);

  // Setup WebSocket connection and initialize WebRTC
  useEffect(() => {
    let currentPeerConnections = {};
    let currentLocalStream = null;

    const setupCall = async () => {
      try {
        setConnectionStatus('Setting up camera and microphone...');
        
        // Special handling for local testing with multiple tabs in the same browser
        // Store a reference to the last used stream in localStorage
        const existingStreamTab = localStorage.getItem('activeVideoCallTab');
        const tabSessionId = sessionStorage.getItem('tabSessionId');
        
        // If we're in another tab and a stream is already active, show a warning
        if (existingStreamTab && existingStreamTab !== tabSessionId) {
          console.warn(`Another tab (${existingStreamTab}) is already using the camera and microphone`);
          setConnectionStatus('Warning: Multiple video calls may interfere with each other');
        }
        
        // Set this tab as the active one
        localStorage.setItem('activeVideoCallTab', tabSessionId);
        
        // Ensure we remove this reference when leaving the page
        window.addEventListener('beforeunload', () => {
          if (localStorage.getItem('activeVideoCallTab') === tabSessionId) {
            localStorage.removeItem('activeVideoCallTab');
          }
        });
        
        // Request the media stream with constraints optimized for the connection
        const constraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: {
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            frameRate: { max: 30 }
          }
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
          
          currentLocalStream = stream;
          setLocalStream(stream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
        }
        
        // Then try to connect to WebSocket server
        try {
          // Get token for authentication
          const token = localStorage.getItem('token');
          if (!token) {
            setError('You must be logged in to join a video call.');
            setIsConnecting(false);
            return;
          }
          
          setConnectionStatus('Connecting to session server...');

          // Use environment-aware WebSocket URL with simplified path for testing
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const host = window.location.hostname === 'localhost' ? 'localhost:5000' : window.location.host;
          
          // Generate a truly unique ID for this browser tab
          if (!sessionStorage.getItem('tabSessionId')) {
            sessionStorage.setItem('tabSessionId', 
              `tab-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`);
          }
          const tabSessionId = sessionStorage.getItem('tabSessionId');
          
          // Generate a truly unique userId that's different for each browser tab
          // This is critical for local testing with multiple tabs
          const userId = currentUser?._id ? 
            `${currentUser._id}-${tabSessionId.substring(0, 8)}` : 
            `user-${tabSessionId}`;
          
          // Store userId in state for use in other functions
          setMyUserId(userId);
          
          // Create a unique display name for each participant
          const displayName = currentUser?.name || 
            `User ${tabSessionId.substring(tabSessionId.length - 4)}`;
          
          // Use the simplified path but pass necessary parameters as query params
          const wsUrl = `${protocol}//${host}/ws?sessionId=${sessionId}&userId=${userId}&userName=${encodeURIComponent(displayName)}`;
          
          console.log(`Connecting to WebSocket at ${wsUrl} with userId: ${userId}`);
          const socket = new WebSocket(wsUrl);
          socketRef.current = socket;
          
          // Set a connection timeout
          const connectionTimeout = setTimeout(() => {
            if (socket.readyState !== WebSocket.OPEN) {
              console.error('WebSocket connection timeout');
              socket.close();
              setError('Connection to video call server timed out. The server may be down or unreachable.');
              setIsConnecting(false);
            }
          }, 10000);
          
          socket.onopen = () => {
            console.log('WebSocket connection established');
            clearTimeout(connectionTimeout);
            setConnectionStatus('Connected! Joining session...');
            
            // Store user info for reference in component
            setConnectionStatus('Joining session as ' + userId);
            
            // Join the session
            socket.send(JSON.stringify({
              type: 'join',
              userId: userId,
              userName: currentUser?.name || 'Anonymous',
              sessionId
            }));
            
            // Request participants list again after 1 second, in case we missed someone
            setTimeout(() => {
              console.log('Requesting participants list again');
              socket.send(JSON.stringify({
                type: 'request-participants',
                userId: userId,
                sessionId
              }));
            }, 1000);
          };
          
          socket.onmessage = async (event) => {
            try {
              const message = JSON.parse(event.data);
              console.log('Received message:', message);
              
              // Handle connection acknowledgment
              if (message.type === 'connection-ack') {
                setConnectionStatus('Session joined successfully!');
                setIsConnecting(false);
                
                // Initialize our own participant state
                initializeParticipantState(myUserId, currentUser?.name || 'You');
                
                // Broadcast our current media state to anyone already in the session
                broadcastMediaStateChange('audio', isAudioEnabled);
                broadcastMediaStateChange('video', isVideoEnabled);
                return;
              }
              
              // Skip messages from ourselves
              if (message.userId === myUserId) {
                console.log(`Ignoring message of type ${message.type} from self`);
                return;
              }
              
              switch (message.type) {
                case 'existing-users':
                  console.log(`Received list of ${message.users?.length || 0} existing users in session`);
                  // Initiate connections to all existing users
                  if (message.users && message.users.length > 0) {
                    message.users.forEach(user => {
                      // Don't connect to self
                      if (user.userId !== myUserId) {
                        console.log(`Initiating connection to existing user: ${user.userName} (${user.userId})`);
                        // Initialize participant state
                        initializeParticipantState(user.userId, user.userName);
                        handleUserJoined(user.userId, user.userName);
                      }
                    });
                  }
                  break;
                case 'user-joined':
                  console.log(`User joined notification: ${message.userName} (${message.userId})`);
                  // Only handle if it's not our own join event
                  if (message.userId !== myUserId) {
                    // Use the best user name we have
                    const bestUserName = getBestUserName(message.userId, message.userName);
                    
                    // Update participant info first with complete information
                    updateParticipantInfo(message.userId, {
                      userName: bestUserName,
                      connected: true,
                      audioEnabled: true,    // Default assumption until we get an update
                      videoEnabled: true     // Default assumption until we get an update
                    });
                    
                    // Initialize other state objects
                    initializeParticipantState(message.userId, bestUserName);
                    handleUserJoined(message.userId, bestUserName);
                    
                    // Send our current media state to the new participant
                    broadcastMediaStateChange('audio', isAudioEnabled);
                    broadcastMediaStateChange('video', isVideoEnabled);
                    
                    // Broadcast connection status to help debug
                    setTimeout(() => broadcastConnectionStatus(), 3000);
                  } else {
                    console.log('Ignoring self-join event from server');
                  }
                  break;
                case 'force-join-notification':
                  console.log(`Received forced join notification from ${message.userName} (${message.userId})`);
                  // Always handle this even if we think we already know this user
                  const bestForcedJoinName = getBestUserName(message.userId, message.userName);
                  initializeParticipantState(message.userId, bestForcedJoinName);
                  
                  // Force close any existing connection
                  if (peerConnectionsRef.current[message.userId]) {
                    console.log(`Closing existing connection to ${message.userId} for forced rejoin`);
                    peerConnectionsRef.current[message.userId].close();
                    delete peerConnectionsRef.current[message.userId];
                  }
                  
                  // Create a new connection
                  handleUserJoined(message.userId, bestForcedJoinName);
                  
                  // Send our current media state
                  broadcastMediaStateChange('audio', isAudioEnabled);
                  broadcastMediaStateChange('video', isVideoEnabled);
                  
                  // Broadcast our connection status back after a short delay
                  setTimeout(() => broadcastConnectionStatus(), 3000);
                  break;
                case 'restart-connection':
                  console.log(`Received connection restart request from ${message.userId}`);
                  
                  // Force close and recreate connection
                  if (peerConnectionsRef.current[message.userId]) {
                    console.log(`Closing existing connection to ${message.userId} for restart`);
                    peerConnectionsRef.current[message.userId].close();
                    delete peerConnectionsRef.current[message.userId];
                  }
                  
                  // Remove from remoteStreams if it exists
                  if (remoteStreams[message.userId]) {
                    setRemoteStreams(prev => {
                      const newStreams = { ...prev };
                      delete newStreams[message.userId];
                      return newStreams;
                    });
                  }
                  
                  // Recreate the connection using best name
                  const bestRestartName = getBestUserName(message.userId, connections[message.userId]?.userName);
                  handleUserJoined(message.userId, bestRestartName);
                  break;
                case 'debug-connection-status':
                  // Handle connection status update
                  handleDebugConnectionStatus(message.userId, message.status);
                  break;
                case 'user-left':
                  // Handle user leaving
                  handleUserLeft(message.userId);
                  
                  // Remove from participant states
                  setParticipantInfo(prev => {
                    const newStates = { ...prev };
                    delete newStates[message.userId];
                    return newStates;
                  });
                  break;
                case 'media-state-change':
                  console.log(`Media state change from ${message.userId}: ${message.mediaType} is ${message.enabled}`);
                  
                  if (message.userId !== myUserId) {
                    // Update participant info to reflect media state change
                    updateParticipantInfo(message.userId, {
                      [`${message.mediaType}Enabled`]: message.enabled
                    });
                    
                    handleMediaStateChange(message.userId, message.userName, message.mediaType, message.enabled);
                  }
                  break;
                case 'offer':
                  // Handle incoming offer
                  const bestOfferName = getBestUserName(message.userId, message.userName);
                  handleOffer(message.offer, message.userId, bestOfferName);
                  break;
                case 'answer':
                  // Handle incoming answer
                  const bestAnswerName = getBestUserName(message.userId, message.userName);
                  handleAnswer(message.answer, message.userId, bestAnswerName);
                  break;
                case 'ice-candidate':
                  // Handle incoming ICE candidate
                  const bestIceName = getBestUserName(message.userId, message.userName);
                  handleIceCandidate(message.candidate, message.userId, bestIceName);
                  break;
                default:
                  console.log('Unknown message type:', message.type);
              }
            } catch (error) {
              console.error('Error processing WebSocket message:', error);
            }
          };
          
          socket.onclose = (event) => {
            console.log('WebSocket connection closed', event);
            clearTimeout(connectionTimeout);
            
            if (!event.wasClean) {
              setError('Connection to video call server was lost. The server may be down or unreachable.');
            }
            setIsConnecting(false);
          };
          
          socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            clearTimeout(connectionTimeout);
            setError('Failed to connect to video call server. Please ensure the server is running.');
            setIsConnecting(false);
          };
        } catch (wsError) {
          console.error('WebSocket setup error:', wsError);
          setError('Failed to establish connection to the video call server.');
          setIsConnecting(false);
        }
      } catch (err) {
        console.error('Error setting up call:', err);
        setError('An unexpected error occurred while setting up the call.');
        setIsConnecting(false);
      }
    };
    
    setupCall();
    
    // Store current peer connections
    currentPeerConnections = { ...peerConnectionsRef.current };

    // Cleanup
    return () => {
      // Stop local media stream
      if (currentLocalStream) {
        currentLocalStream.getTracks().forEach(track => track.stop());
      }
      
      // Close all peer connections
      Object.values(currentPeerConnections).forEach(pc => {
        if (pc) pc.close();
      });
      
      // Close WebSocket connection
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, currentUser, retryCount]);

  // Handle media state change messages
  const handleMediaStateChange = (userId, userName, mediaType, enabled) => {
    console.log(`Received media state change from ${userName || 'Unknown'} (${userId}): ${mediaType} = ${enabled}`);
    
    // Skip processing if it's our own media state change (we handle that locally)
    if (userId === myUserId) {
      console.log('Ignoring own media state change as it\'s handled locally');
      return;
    }
    
    // Update participant info in one place
    updateParticipantInfo(userId, {
      userName: userName || participantInfo[userId]?.userName || 'Unknown',
      [`${mediaType}Enabled`]: enabled
    });
    
    // If it's a video state change, update the stream info
    if (mediaType === 'video') {
      setRemoteStreams(prev => {
        if (!prev[userId]) {
          console.log(`No remote stream found for ${userId}, can't update video state`);
          return prev;
        }
        
        // Only update if the state is different from current state
        if (prev[userId].videoDisabled === !enabled) {
          console.log(`Remote stream for ${userId} already has video ${enabled ? 'enabled' : 'disabled'}`);
          return prev;
        }
        
        console.log(`Updating remote stream for ${userId}: videoDisabled = ${!enabled}`);
        return {
          ...prev,
          [userId]: {
            ...prev[userId],
            videoDisabled: !enabled
          }
        };
      });
    }
    
    // For audio state changes, we don't need to update the stream
    // as the audio track enabled property is controlled by the sender
  };

  // Initialize participant state
  const initializeParticipantState = (userId, userName) => {
    setParticipantInfo(prev => {
      // Only initialize if not already present
      if (prev[userId]) return prev;
      
      return {
        ...prev,
        [userId]: {
          userName,
          video: true,  // Assume enabled by default
          audio: true   // Assume enabled by default
        }
      };
    });
  };

  // Broadcast connection status to help debug one-way connections
  const broadcastConnectionStatus = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      console.log('Broadcasting connection status to all participants');
      
      // First collect our local state
      const localState = {
        userId: myUserId,
        connections: Object.keys(peerConnectionsRef.current).map(peerId => ({
          peerId,
          iceState: peerConnectionsRef.current[peerId]?.iceConnectionState || 'unknown',
          signalState: peerConnectionsRef.current[peerId]?.signalingState || 'unknown',
          hasRemoteDescription: !!peerConnectionsRef.current[peerId]?.remoteDescription,
          connectedStreams: Object.keys(remoteStreams)
        }))
      };
      
      safeSendMessage({
        type: 'debug-connection-status',
        status: localState
      });
    }
  };

  // Add this handler for debug-connection-status messages
  const handleDebugConnectionStatus = (userId, status) => {
    console.log('Received connection status from:', userId);
    console.log('Their connections:', status.connections);
    
    // Check if they have me in their connections
    const connectionToMe = status.connections.find(conn => conn.peerId === myUserId);
    
    if (!connectionToMe) {
      console.log('ISSUE DETECTED: They do not have a connection to me. Sending join notification.');
      // Force a join notification to the user
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'force-join-notification',
          targetUserId: userId,
          userId: myUserId,
          userName: currentUser?.name || 'Anonymous'
        }));
      }
    } else if (connectionToMe && !connectionToMe.hasRemoteDescription) {
      console.log('ISSUE DETECTED: They have connection to me but no remote description.');
      // If they have a connection to me but no remote description, send them an offer
      if (peerConnectionsRef.current[userId]) {
        console.log('Recreating connection to fix missing remote description');
        // Close existing connection
        peerConnectionsRef.current[userId].close();
        delete peerConnectionsRef.current[userId];
        // Create new connection
        handleUserJoined(userId, status.userName || 'Unknown');
      }
    } else if (!status.connections.some(conn => conn.connectedStreams.includes(myUserId))) {
      console.log('ISSUE DETECTED: They do not have my stream. Attempting to restart connection.');
      // Force a restart of the connection if they don't have my stream
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'restart-connection',
          targetUserId: userId,
          userId: myUserId
        }));
      }
    }
    
    // Also check if I have them in my connections
    if (!peerConnectionsRef.current[userId] || 
        !remoteStreams[userId] ||
        peerConnectionsRef.current[userId].iceConnectionState === 'failed' ||
        peerConnectionsRef.current[userId].iceConnectionState === 'disconnected') {
      console.log('ISSUE DETECTED: I do not have a valid connection to them. Recreating connection.');
      // If I don't have a connection to them, recreate it
      if (peerConnectionsRef.current[userId]) {
        peerConnectionsRef.current[userId].close();
        delete peerConnectionsRef.current[userId];
      }
      // Remove from remoteStreams if it exists
      if (remoteStreams[userId]) {
        setRemoteStreams(prev => {
          const newStreams = { ...prev };
          delete newStreams[userId];
          return newStreams;
        });
      }
      // Create new connection
      handleUserJoined(userId, status.userName || 'Unknown');
    }
  };

  // Add a function to handle track ended events and prevent rapid reconnects
  const handleTrackEnded = (userId, trackKind) => {
    console.log(`Track ${trackKind} ended for ${userId}`);
    
    // Reference to store the last reconnection time for each user
    if (!window._lastReconnectTime) window._lastReconnectTime = {};
    
    // Only attempt to reconnect if we haven't tried recently (within last 5 seconds)
    const now = Date.now();
    const lastTime = window._lastReconnectTime[userId] || 0;
    
    if (now - lastTime > 5000) {
      // Update the last reconnect time
      window._lastReconnectTime[userId] = now;
      
      // Get the most reliable user name we have before the reconnection process starts
      // and store it to prevent name flickering during reconnection
      let reliableName = participantInfo[userId]?.userName;
      if (!reliableName || reliableName === 'Unknown' || reliableName === 'Unknown Participant') {
        reliableName = remoteStreams[userId]?.userName;
      }
      if (!reliableName || reliableName === 'Unknown' || reliableName === 'Unknown Participant') {
        reliableName = connections[userId]?.userName;
      }
      if (!reliableName || reliableName === 'Unknown' || reliableName === 'Unknown Participant') {
        try {
          const storedParticipants = JSON.parse(sessionStorage.getItem(`videoCall-participants-${sessionId}`) || '{}');
          if (storedParticipants[userId]?.userName) {
            reliableName = storedParticipants[userId].userName;
          }
        } catch (err) {
          console.error('Error reading from sessionStorage:', err);
        }
      }
      
      // Don't default to 'Unknown' if we found a better name
      if (!reliableName || reliableName === 'Unknown' || reliableName === 'Unknown Participant') {
        reliableName = 'Unknown Participant';
      }
      
      // Create a persistent reference to the user name for this reconnection sequence
      if (!window._reconnectingUserNames) window._reconnectingUserNames = {};
      window._reconnectingUserNames[userId] = reliableName;
      
      // Mark as reconnecting for UI purposes and track when the reconnection started
      // Use the stable name we determined
      updateParticipantInfo(userId, {
        isReconnecting: true,
        reconnectStartTime: Date.now(), // Add timestamp to track how long we've been reconnecting
        userName: reliableName // Use our reliable name to prevent flickering
      });
      
      // Update remote stream to show reconnecting state
      setRemoteStreams(prev => {
        if (!prev[userId]) return prev;
        
        return {
          ...prev,
          [userId]: {
            ...prev[userId],
            isReconnecting: true,
            userName: reliableName // Keep the name consistent
          }
        };
      });
      
      // Delay the reconnection attempt slightly
      setTimeout(() => {
        if (peerConnectionsRef.current[userId]) {
          console.log(`Attempting to restart connection due to ended track`);
          
          // Send a reconnection request to the server
          safeSendMessage({
            type: 'restart-connection',
            targetUserId: userId,
            userId: myUserId
          });
          
          // Set a timeout to clear the reconnecting state if it persists too long
          setTimeout(() => {
            // Get the stable name we stored at the beginning of this reconnection sequence
            const stableName = window._reconnectingUserNames?.[userId] || reliableName;
            
            updateParticipantInfo(userId, {
              isReconnecting: false,
              reconnectStartTime: null, // Clear the timestamp when we're done
              userName: stableName // Keep using our stable name
            });
            
            setRemoteStreams(prev => {
              if (!prev[userId]) return prev;
              
              return {
                ...prev,
                [userId]: {
                  ...prev[userId],
                  isReconnecting: false,
                  userName: stableName // Keep the name consistent
                }
              };
            });
          }, 10000); // Clear reconnecting state after 10 seconds regardless
        }
      }, 1000);
    } else {
      console.log(`Ignoring rapid reconnection request for ${userId}, last attempt was ${now - lastTime}ms ago`);
    }
  };

  // Add a function to periodically check for missing connections
  // eslint-disable-next-line no-unused-vars
  const checkMissingConnections = () => {
    // If there are remoteStreams, check if all connections have streams
    const knownUsers = new Set(Object.keys(connections));
    const connectedUsers = new Set(Object.keys(remoteStreams));
    
    // Check for users we know about but haven't connected with
    knownUsers.forEach(userId => {
      if (!connectedUsers.has(userId) && 
          (!peerConnectionsRef.current[userId] || 
           peerConnectionsRef.current[userId].iceConnectionState === 'failed' ||
           peerConnectionsRef.current[userId].iceConnectionState === 'disconnected' ||
           peerConnectionsRef.current[userId].iceConnectionState === 'closed')) {
        
        console.log(`Found missing connection to ${userId}, attempting to reconnect`);
        
        // Get best name from all sources
        const userName = getBestUserName(userId, connections[userId]?.userName);
        
        // Remove old connection if it exists
        if (peerConnectionsRef.current[userId]) {
          peerConnectionsRef.current[userId].close();
          delete peerConnectionsRef.current[userId];
        }
        
        // Attempt to establish connection
        handleUserJoined(userId, userName);
      }
    });
    
    // Also check if we have any remoteStreams without working connections
    const activeStreamNames = {};
    connectedUsers.forEach(userId => {
      const userName = remoteStreams[userId].userName;
      if (userName && userName !== 'Unknown' && userName !== 'Unknown Participant') {
        activeStreamNames[userName] = userId;
      }
    });
    
    // Check if connections are in a bad state but we still have remoteStreams
    connectedUsers.forEach(userId => {
      const connection = peerConnectionsRef.current[userId];
      const stream = remoteStreams[userId];
      
      // If we have a stream but connection is in a bad state, try to fix it
      if (stream && connection && 
          (connection.iceConnectionState === 'disconnected' ||
           connection.iceConnectionState === 'failed' ||
           connection.iceConnectionState === 'closed')) {
        console.log(`Connection to ${userId} is in ${connection.iceConnectionState} state but we still have a stream. Attempting to recover.`);
        
        // Preserve stream data
        const streamData = { ...stream };
        
        // Close and recreate the connection but keep the stream
        connection.close();
        delete peerConnectionsRef.current[userId];
        
        // Get best name
        const userName = getBestUserName(userId, stream.userName);
        
        // Create a new connection
        handleUserJoined(userId, userName);
        
        // If the stream was lost during reconnection, temporarily keep showing the last known stream data
        setTimeout(() => {
          if (!remoteStreams[userId]) {
            console.log(`Temporarily preserving stream data for ${userId} during reconnection`);
            setRemoteStreams(prev => ({
              ...prev,
              [userId]: {
                ...streamData,
                isReconnecting: true
              }
            }));
            
            // Add a status update in participantInfo
            updateParticipantInfo(userId, {
              isReconnecting: true,
              reconnectStartTime: Date.now(), // Track when reconnection started
              userName: streamData.userName || userName
            });
          }
        }, 1000);
      }
    });
  };

  // Add optimized stream monitoring
  useEffect(() => {
    let streamStabilityInterval = null;
    
    if (!isConnecting && !error && Object.keys(remoteStreams).length > 0) {
      // Monitor stream stability
      streamStabilityInterval = setInterval(() => {
        Object.entries(remoteStreams).forEach(([userId, { stream, userName: streamUserName }]) => {
          if (stream) {
            const videoTracks = stream.getVideoTracks();
            
            // Check video tracks in detail
            videoTracks.forEach(track => {
              if (track.readyState === 'ended' || !track.enabled) {
                console.log(`Video track for ${userId} is in state: ${track.readyState}, enabled: ${track.enabled}`);
                
                // Try to restart the track by requesting sender to renegotiate
                if (!participantInfo[userId]?.isReconnecting) {
                  console.log('Requesting media state update to recover video');
                  
                  // Request media state update as a gentler way to recover
                  safeSendMessage({
                    type: 'request-media-state',
                    targetUserId: userId,
                    userId: myUserId
                  });
                }
              }
            });
            
            // Check if we've been in a reconnecting state for too long
            const reconnectingForTooLong = 
              participantInfo[userId]?.isReconnecting && 
              participantInfo[userId]?.reconnectStartTime && 
              (Date.now() - participantInfo[userId].reconnectStartTime > 15000); // 15 seconds
            
            if (reconnectingForTooLong) {
              console.log(`Reconnection for ${userId} taking too long, attempting recovery`);
              
              // Find a stable user name to use for this recovery
              let stableName = participantInfo[userId]?.userName;
              if (!stableName || stableName === 'Unknown' || stableName === 'Unknown Participant') {
                stableName = window._reconnectingUserNames?.[userId];
              }
              if (!stableName || stableName === 'Unknown' || stableName === 'Unknown Participant') {
                stableName = streamUserName;
              }
              if (!stableName || stableName === 'Unknown' || stableName === 'Unknown Participant') {
                stableName = connections[userId]?.userName;
              }
              if (!stableName || stableName === 'Unknown' || stableName === 'Unknown Participant') {
                try {
                  const storedParticipants = JSON.parse(sessionStorage.getItem(`videoCall-participants-${sessionId}`) || '{}');
                  if (storedParticipants[userId]?.userName) {
                    stableName = storedParticipants[userId].userName;
                  }
                } catch (err) {
                  console.error('Error reading from sessionStorage:', err);
                }
              }
              
              // Clear the reconnecting state to allow interaction - Use setParticipantInfo directly
              setParticipantInfo(prev => ({
                ...prev,
                [userId]: {
                  ...(prev[userId] || {}),
                  isReconnecting: false,
                  reconnectStartTime: null,
                  userName: stableName || 'Unknown Participant' // Use our stable name
                }
              }));
              
              // Update remote stream state
              setRemoteStreams(prev => {
                if (!prev[userId]) return prev;
                
                return {
                  ...prev,
                  [userId]: {
                    ...prev[userId],
                    isReconnecting: false,
                    userName: stableName || 'Unknown Participant' // Use our stable name
                  }
                };
              });
              
              // Try a full reconnection
              if (peerConnectionsRef.current[userId]) {
                peerConnectionsRef.current[userId].close();
                delete peerConnectionsRef.current[userId];
                
                // Recreate the connection
                // Don't use getBestUserName here to avoid the dependency
                handleUserJoined(userId, stableName || 'Unknown Participant');
                
                // Reset reconnection time tracking
                if (window._lastReconnectTime) {
                  window._lastReconnectTime[userId] = 0;
                }
              }
            }
          }
        });
      }, 2000);
      
      return () => {
        if (streamStabilityInterval) {
          clearInterval(streamStabilityInterval);
        }
      };
    }
  }, [isConnecting, error, remoteStreams, participantInfo, myUserId, safeSendMessage, handleUserJoined, connections, sessionId]);
  
  // Add listener for track readyState changes
  useEffect(() => {
    // Create a function to monitor track health for each stream
    const monitorTrackHealth = () => {
      Object.entries(remoteStreams).forEach(([userId, { stream }]) => {
        if (stream) {
          stream.getTracks().forEach(track => {
            // We're using the track's onended handler already, this is an additional safeguard
            if (track.readyState === 'ended' && !track._monitoredEnded) {
              track._monitoredEnded = true;
              console.log(`Track ${track.kind} detected as ended through monitoring`);
              
              // Use our debounced handler
              handleTrackEnded(userId, track.kind);
            }
          });
        }
      });
    };
    
    // Set up a frequent check of all tracks
    const trackMonitorInterval = setInterval(monitorTrackHealth, 1000);
    
    return () => {
      clearInterval(trackMonitorInterval);
    };
  }, [remoteStreams, handleTrackEnded]);

  // Add function to update participant info consistently
  const updateParticipantInfo = (userId, updates) => {
    if (!userId) return;

    console.log(`Updating participant info for ${userId}:`, updates);
    
    setParticipantInfo(prev => {
      // Get current info or initialize if not present
      const currentInfo = prev[userId] || {
        userId,
        userName: 'Unknown',
        audioEnabled: true,
        videoEnabled: true,
        connected: false,
        hasStream: false
      };
      
      // Don't override a real name with "Unknown"
      const userName = updates.userName;
      if (userName === 'Unknown' && currentInfo.userName && currentInfo.userName !== 'Unknown') {
        updates = {
          ...updates,
          userName: currentInfo.userName
        };
      }
      
      // Create new info object with updates
      const newInfo = {
        ...currentInfo,
        ...updates,
        // Ensure these are updated atomically
        lastUpdated: Date.now()
      };
      
      // Only update if there are actual changes
      if (JSON.stringify(currentInfo) === JSON.stringify(newInfo)) {
        return prev; // No changes
      }
      
      // If we have a good userName, save it to sessionStorage for persistence across reconnects
      if (newInfo.userName && 
          newInfo.userName !== 'Unknown' && 
          newInfo.userName !== 'Unknown Participant') {
        try {
          const storageKey = `videoCall-participants-${sessionId}`;
          const storedParticipants = JSON.parse(sessionStorage.getItem(storageKey) || '{}');
          storedParticipants[userId] = {
            userName: newInfo.userName,
            lastSeen: Date.now()
          };
          sessionStorage.setItem(storageKey, JSON.stringify(storedParticipants));
        } catch (err) {
          console.error('Error storing participant info to sessionStorage:', err);
        }
      }
      
      // Update remoteStreams userName if we have more reliable info
      if (updates.userName && updates.userName !== 'Unknown' && remoteStreams[userId]) {
        setRemoteStreams(streams => ({
          ...streams,
          [userId]: {
            ...streams[userId],
            userName: updates.userName
          }
        }));
      }
      
      return {
        ...prev,
        [userId]: newInfo
      };
    });
  };

  // Helper function to determine the best user name to display - more resilient version
  const getBestUserName = (userId, providedName) => {
    // If we already have participant info with a good name, use that
    if (participantInfo[userId]?.userName && 
        participantInfo[userId].userName !== 'Unknown' && 
        participantInfo[userId].userName !== 'Unknown Participant') {
      return participantInfo[userId].userName;
    }
    
    // Check in sessionStorage for persistent identity
    try {
      const storedParticipants = JSON.parse(sessionStorage.getItem(`videoCall-participants-${sessionId}`) || '{}');
      if (storedParticipants[userId] && storedParticipants[userId].userName &&
          storedParticipants[userId].userName !== 'Unknown' && 
          storedParticipants[userId].userName !== 'Unknown Participant') {
        return storedParticipants[userId].userName;
      }
    } catch (err) {
      console.error('Error reading participant info from sessionStorage:', err);
    }
    
    // If we have a name in connections, use that
    if (connections[userId]?.userName && 
        connections[userId].userName !== 'Unknown' && 
        connections[userId].userName !== 'Unknown Participant') {
      return connections[userId].userName;
    }
    
    // If a good name was provided, use that
    if (providedName && providedName !== 'Unknown' && providedName !== 'Unknown Participant') {
      return providedName;
    }
    
    // If we have a remote stream with a name, use that
    if (remoteStreams[userId]?.userName && 
        remoteStreams[userId].userName !== 'Unknown' && 
        remoteStreams[userId].userName !== 'Unknown Participant') {
      return remoteStreams[userId].userName;
    }
    
    // Fall back to the provided name or 'Unknown Participant'
    return providedName || 'Unknown Participant';
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white overflow-hidden relative">
      <div 
        id="video-container"
        ref={fullScreenContainerRef}
        className={`flex-1 flex flex-col overflow-hidden ${isFullScreen ? styles.fullscreen : ''}`}
      >
      {isConnecting && (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mb-4"></div>
          <span className="text-lg font-medium">{connectionStatus}</span>
        </div>
      )}
      
      {error && (
        <div className="bg-red-500 p-4 text-center">
          <p className="text-white">{error}</p>
          <div className="mt-4 flex justify-center space-x-4">
            <button 
              onClick={retryConnection}
              className="bg-white text-red-500 px-4 py-2 rounded-md font-medium disabled:opacity-50"
              disabled={retryCount >= 3}
            >
              Retry Connection
            </button>
            <button 
              onClick={onEndCall}
              className="bg-gray-800 text-white px-4 py-2 rounded-md font-medium"
            >
              Return to Session
            </button>
          </div>
          <p className="mt-4 text-sm text-white opacity-80">
            Make sure the server is running and your internet connection is stable.
          </p>
        </div>
      )}
      
      {!isConnecting && !error && (
        <>
          <div className="p-4 bg-gray-800 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Session Video Call</h2>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-400 mr-2">
              {Object.keys(remoteStreams).length === 0 
                ? 'Waiting for participants to join...' 
                : `${Object.keys(remoteStreams).length} participant(s) connected`}
                </div>
                <button 
                  onClick={toggleFullScreenMode} 
                  className={`${styles.toggleButton}`}
                  style={{position: 'static'}}
                >
                  {isFullScreen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a2 2 0 012-2h2v2H7v2H5zm10 0V7a2 2 0 00-2-2h-2v2h2v2h2zm0 2v2a2 2 0 01-2 2h-2v-2h2v-2h2zm-10 0v2a2 2 0 002 2h2v-2H7v-2H5z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
            </div>
          </div>
          
            {fullscreenVideo ? (
              <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
                <button 
                  onClick={() => toggleFullscreen(null)} 
                  className={`${styles.toggleButton} absolute top-4 right-4 z-10`}
                >
                  <FaCompress />
                </button>
                
                {fullscreenVideo === 'local' ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    {isVideoEnabled && (
                      <video
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-contain"
                        ref={el => {
                          if (el && localStream) {
                            el.srcObject = localStream;
                            el.onloadedmetadata = () => {
                              el.play().catch(e => console.error('Error playing video:', e));
                            };
                          }
                        }}
                      />
                    )}
                    {!isVideoEnabled && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800">
                        <FaUserCircle className="text-gray-400 w-40 h-40 mb-4" />
                        <div className="text-center text-gray-300 text-xl">
                          Your camera is turned off
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-20 left-8 bg-gray-900 bg-opacity-80 px-4 py-2 rounded-md text-lg flex items-center space-x-3">
                      <span>You</span>
                      {!isAudioEnabled && (
                        <span className="bg-red-500 p-1 rounded-full flex items-center justify-center">
                          <FaMicrophoneSlash size={14} />
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  remoteStreams[fullscreenVideo] && (
                    <div className="relative w-full h-full flex items-center justify-center">
                      {/* Get the latest participant info as source of truth */}
                      {(() => {
                        const info = participantInfo[fullscreenVideo] || { 
                          userName: remoteStreams[fullscreenVideo].userName || 'Unknown Participant',
                          audioEnabled: true,
                          videoEnabled: true,
                          connected: false
                        };
                        
                        // Check if this connection is reconnecting
                        const reconnecting = remoteStreams[fullscreenVideo].isReconnecting || info.isReconnecting || false;
                        
                        // Use the most reliable name source available
                        const displayName = 
                          (info.userName && info.userName !== 'Unknown' && info.userName !== 'Unknown Participant') ? info.userName :
                          (remoteStreams[fullscreenVideo].userName && 
                           remoteStreams[fullscreenVideo].userName !== 'Unknown' && 
                           remoteStreams[fullscreenVideo].userName !== 'Unknown Participant') ? 
                            remoteStreams[fullscreenVideo].userName : 
                          connections[fullscreenVideo]?.userName || 'Unknown Participant';
                        
                        // Use debounced video state to prevent flickering
                        const now = Date.now();
                        let showVideo = !(remoteStreams[fullscreenVideo].videoDisabled || 
                                          !info.videoEnabled || 
                                          reconnecting);
                        
                        // Get last known stable video state
                        if (window._lastVideoState && window._lastVideoState[fullscreenVideo]) {
                          const lastUpdate = window._lastVideoState[fullscreenVideo].lastUpdate || 0;
                          const lastState = window._lastVideoState[fullscreenVideo].state;
                          
                          // Use stored stable state if the change is recent (last 3 seconds)
                          if (now - lastUpdate < 3000) {
                            showVideo = lastState;
                          } else {
                            // Update the stored state
                            window._lastVideoState[fullscreenVideo] = {
                              state: showVideo,
                              lastUpdate: now
                            };
                          }
                        } else if (!window._lastVideoState) {
                          window._lastVideoState = {};
                          window._lastVideoState[fullscreenVideo] = {
                            state: showVideo,
                            lastUpdate: now
                          };
                        }
                        
                        return (
                          <>
                            {/* Only render video when it's actually enabled and not reconnecting */}
                            {showVideo && (
                              <video
                                autoPlay
                                playsInline
                                className="w-full h-full object-contain"
                                ref={el => {
                                  if (el && remoteStreams[fullscreenVideo]?.stream) {
                                    el.srcObject = remoteStreams[fullscreenVideo].stream;
                                    el.onloadedmetadata = () => {
                                      el.play().catch(e => console.error('Error playing video:', e));
                                    };
                                  }
                                }}
                              />
                            )}
                            {/* Show avatar placeholder when video is disabled or reconnecting */}
                            {!showVideo && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800">
                                <FaUserCircle className="text-gray-400 w-40 h-40 mb-4" />
                                <div className="text-center text-gray-300 text-xl">
                                  {reconnecting ? `${displayName} is reconnecting...` : `${displayName} turned off camera`}
                                </div>
                                {reconnecting && (
                                  <div className="animate-pulse mt-8 px-6 py-3 bg-blue-500 bg-opacity-30 rounded-md text-lg">
                                    Reconnecting...
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="absolute bottom-20 left-8 bg-gray-900 bg-opacity-80 px-4 py-2 rounded-md text-lg flex items-center space-x-3">
                              <span className={reconnecting ? "text-blue-300" : ""}>{displayName}</span>
                              {!info.audioEnabled && (
                                <span className="bg-red-500 p-1 rounded-full flex items-center justify-center">
                                  <FaMicrophoneSlash size={14} />
                                </span>
                              )}
                              {reconnecting && (
                                <span className="animate-pulse bg-blue-500 p-1 rounded-full flex items-center justify-center">
                                  <span className="h-3 w-3"></span>
                                </span>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )
                )}
                
                <div className={styles.controlsBar}>
                  <button 
                    onClick={toggleAudio}
                    className={`${styles.controlButton} ${!isAudioEnabled ? styles.endCallButton : ''}`}
                  >
                    {isAudioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
                  </button>
                  <button 
                    onClick={toggleVideo}
                    className={`${styles.controlButton} ${!isVideoEnabled ? styles.endCallButton : ''}`}
                  >
                    {isVideoEnabled ? <FaVideo /> : <FaVideoSlash />}
                  </button>
                  <button 
                    onClick={endCall}
                    className={`${styles.controlButton} ${styles.endCallButton}`}
                  >
                    <FaPhoneSlash />
                  </button>
                </div>
              </div>
            ) : (
              <div className={`p-4 ${isFullScreen ? 'h-[calc(100vh-144px)]' : ''}`}>
                <div className={`grid grid-cols-1 ${isFullScreen ? 'h-full' : ''} ${Object.keys(remoteStreams).length === 0 ? 'md:grid-cols-1' : Object.keys(remoteStreams).length === 1 ? 'md:grid-cols-2' : Object.keys(remoteStreams).length <= 3 ? 'md:grid-cols-2 lg:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'} gap-4`}>
              {/* Local video */}
              <div className="relative bg-gray-700 rounded-lg overflow-hidden aspect-video">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
                />
                {!isVideoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FaUserCircle className="text-gray-400 w-16 h-16" />
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-gray-900 bg-opacity-60 px-2 py-1 rounded-md text-sm">
                  You {!isAudioEnabled && '(Muted)'}
                </div>
                    <button 
                      onClick={() => toggleFullscreen('local')} 
                      className={`${styles.toggleButton} absolute bottom-2 right-2`}
                    >
                      <FaExpand size={14} />
                    </button>
              </div>
              
              {/* Remote videos */}
                  {Object.entries(remoteStreams).map(([userId, { stream, videoDisabled, userName: streamUserName, isReconnecting, lastTrackUpdate }]) => {
                    // Get the latest participant info as source of truth
                    const info = participantInfo[userId] || { 
                      userName: streamUserName || 'Unknown Participant',
                      audioEnabled: true,
                      videoEnabled: true,
                      connected: false
                    };
                    
                    // Use the most reliable name source available
                    const displayName = 
                      (info.userName && info.userName !== 'Unknown' && info.userName !== 'Unknown Participant') ? info.userName :
                      (streamUserName && streamUserName !== 'Unknown' && streamUserName !== 'Unknown Participant') ? streamUserName : 
                      connections[userId]?.userName || 'Unknown Participant';
                    
                    // Check if this connection is currently reconnecting
                    const reconnecting = isReconnecting || info.isReconnecting || false;
                    
                    // Debounce rapid video state changes - only show video if we have a track and it's been stable
                    const now = Date.now();
                    // eslint-disable-next-line no-unused-vars
                    const stableVideoTime = lastTrackUpdate ? now - lastTrackUpdate > 2000 : true;
                    
                    // Store reference to last video state for this user to prevent rapid toggling
                    if (!window._lastVideoState) window._lastVideoState = {};
                    
                    // Calculate if we should show video based on current state and stability
                    let showVideo = !videoDisabled && info.videoEnabled !== false && stream && !reconnecting;
                    
                    // If we have a previous video state and the video just changed recently,
                    // maintain the previous state for stability unless it's been more than 3 seconds
                    if (window._lastVideoState[userId] !== undefined) {
                      const lastUpdate = window._lastVideoState[userId].lastUpdate || 0;
                      const lastState = window._lastVideoState[userId].state;
                      
                      if (now - lastUpdate < 3000) {
                        // Use the last stable state if we've had rapid changes
                        showVideo = lastState;
                      } else {
                        // Update the stored state after the debounce period
                        window._lastVideoState[userId] = {
                          state: showVideo,
                          lastUpdate: now
                        };
                      }
                    } else {
                      // Initialize state tracking
                      window._lastVideoState[userId] = {
                        state: showVideo,
                        lastUpdate: now
                      };
                    }
                    
                    return (
                <div key={userId} className="relative bg-gray-700 rounded-lg overflow-hidden aspect-video">
                        {/* Only render the video element if we should show video */}
                        {showVideo && (
                  <video
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                    ref={el => {
                              if (el && stream) {
                                console.log(`Setting stream for ${displayName} video element`);
                                // Force-refresh the video srcObject
                                if (el.srcObject !== stream) {
                        el.srcObject = stream;
                        el.onloadedmetadata = () => {
                          el.play().catch(e => console.error('Error playing video:', e));
                        };
                                }
                      }
                    }}
                  />
                        )}
                        
                        {/* Show avatar when not showing video */}
                        {!showVideo && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800">
                            <FaUserCircle className="text-gray-400 w-24 h-24 mb-2" />
                            <div className="text-center text-gray-300">
                              {reconnecting ? `${displayName} is reconnecting...` : `${displayName} turned off camera`}
                  </div>
                            {reconnecting && (
                              <div className="animate-pulse mt-4 px-4 py-2 bg-blue-500 bg-opacity-30 rounded-md">
                                Reconnecting...
                </div>
                            )}
            </div>
                        )}
                        
                        <div className="absolute bottom-2 left-2 bg-gray-900 bg-opacity-80 px-2 py-1 rounded-md text-sm flex items-center space-x-2">
                          <span className={reconnecting ? "text-blue-300" : ""}>{displayName}</span>
                          {!info.audioEnabled && (
                            <span className="bg-red-500 p-1 rounded-full flex items-center justify-center">
                              <FaMicrophoneSlash size={10} />
                            </span>
                          )}
                          {reconnecting && (
                            <span className="animate-pulse bg-blue-500 p-1 rounded-full flex items-center justify-center">
                              <span className="h-2 w-2"></span>
                            </span>
                          )}
          </div>
                        
                        <button 
                          onClick={() => toggleFullscreen(userId)} 
                          className={`${styles.toggleButton} absolute bottom-2 right-2`}
                        >
                          <FaExpand size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          
          <div className="p-4 bg-gray-800 flex justify-center">
              <div className={styles.controlsBar} style={{ position: 'relative', transform: 'none', left: 'auto', bottom: 'auto' }}>
              <button 
                onClick={toggleAudio}
                  className={`${styles.controlButton} ${!isAudioEnabled ? styles.endCallButton : ''}`}
              >
                {isAudioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
              </button>
              <button 
                onClick={toggleVideo}
                  className={`${styles.controlButton} ${!isVideoEnabled ? styles.endCallButton : ''}`}
              >
                {isVideoEnabled ? <FaVideo /> : <FaVideoSlash />}
              </button>
              <button 
                onClick={endCall}
                  className={`${styles.controlButton} ${styles.endCallButton}`}
              >
                <FaPhoneSlash />
              </button>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
};

export default VideoCall; 