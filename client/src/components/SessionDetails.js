import { useState, useEffect } from 'react';
import { FaCalendarAlt, FaClock, FaVideo, FaVideoSlash, FaEdit } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import VideoCall from './VideoCall';

const SessionDetails = ({ session, courseId }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  
  // Check if the session is currently active or how much time until it starts
  useEffect(() => {
    if (!session) return;
    
    const checkSessionStatus = () => {
      const now = new Date();
      const startTime = new Date(session.startDate);
      const endTime = new Date(session.endDate);
      
      // Session is currently active
      if (now >= startTime && now <= endTime) {
        setIsSessionActive(true);
        setTimeRemaining('');
      } 
      // Session is in the future
      else if (now < startTime) {
        setIsSessionActive(false);
        
        // Calculate time remaining
        const diffMs = startTime - now;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHrs = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (diffDays > 0) {
          setTimeRemaining(`Starts in ${diffDays} days, ${diffHrs} hours`);
        } else if (diffHrs > 0) {
          setTimeRemaining(`Starts in ${diffHrs} hours, ${diffMins} minutes`);
        } else {
          setTimeRemaining(`Starts in ${diffMins} minutes`);
        }
      } 
      // Session is in the past
      else {
        setIsSessionActive(false);
        setTimeRemaining('Session has ended');
      }
    };
    
    // Check status immediately
    checkSessionStatus();
    
    // Update every minute
    const interval = setInterval(checkSessionStatus, 60000);
    
    return () => clearInterval(interval);
  }, [session]);
  
  const formatDate = (dateString) => {
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  const handleJoinVideoCall = () => {
    setShowVideoCall(true);
  };
  
  const handleEndVideoCall = () => {
    setShowVideoCall(false);
  };

  const handleEditSession = () => {
    navigate(`/course/${courseId}/session/${session._id}/edit`);
  };
  
  if (!session) return null;
  
  // Check if user is an instructor
  const isInstructor = currentUser && currentUser.role === 'instructor';

  // Add unconditional Edit Session button for testing purposes
  // This will help us check if the routing works properly
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Show video call if active */}
      {showVideoCall ? (
        <VideoCall 
          sessionId={session._id} 
          participants={[]} 
          onEndCall={handleEndVideoCall} 
        />
      ) : (
        <>
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{session.title}</h2>
            <p className="text-gray-600 mb-6">{session.description}</p>
            
            <div className="space-y-4">
              <div className="flex items-center text-gray-700">
                <FaCalendarAlt className="w-5 h-5 text-indigo-500 mr-2" />
                <span>
                  {formatDate(session.startDate)} to {new Date(session.endDate).toLocaleTimeString()}
                </span>
              </div>
              
              <div className="flex items-center text-gray-700">
                <FaClock className="w-5 h-5 text-indigo-500 mr-2" />
                <span>
                  Duration: {Math.round((new Date(session.endDate) - new Date(session.startDate)) / (1000 * 60))} minutes
                </span>
              </div>
            </div>
            
            {timeRemaining && (
              <div className="mt-4 text-sm font-medium text-indigo-600">
                {timeRemaining}
              </div>
            )}
            
            <div className="mt-8 flex space-x-4">
              {isSessionActive ? (
                <button
                  onClick={handleJoinVideoCall}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <FaVideo className="mr-2" />
                  Join Video Call
                </button>
              ) : (
                <button
                  disabled
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-400 cursor-not-allowed"
                >
                  <FaVideoSlash className="mr-2" />
                  {new Date(session.startDate) > new Date() ? 'Session Not Started Yet' : 'Session Has Ended'}
                </button>
              )}
              
              {/* Edit Session button for instructors */}
              {isInstructor && (
                <button
                  onClick={handleEditSession}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-white border-indigo-500 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <FaEdit className="mr-2" />
                  Edit Session
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SessionDetails; 