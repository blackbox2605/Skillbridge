import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CourseProvider } from './context/CourseContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import EditProfile from './pages/EditProfile';
import CreateCourse from './pages/CreateCourse.js';
import EditCourse from './pages/EditCourse';
import ExploreSkills from './pages/ExploreSkills';
import CourseDetails from './pages/CourseDetails';
import ScheduleSession from './pages/ScheduleSession';
import EditSession from './pages/EditSession';

function App() {
  return (
    <Router>
      <AuthProvider>
        <CourseProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/edit-profile" 
              element={
                <ProtectedRoute>
                  <EditProfile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/create-course" 
              element={
                <ProtectedRoute>
                  <CreateCourse />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/edit-course/:courseId" 
              element={
                <ProtectedRoute>
                  <EditCourse />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/explore" 
              element={
                <ProtectedRoute>
                  <ExploreSkills />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/course/:courseId" 
              element={
                <ProtectedRoute>
                  <CourseDetails />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/course/:courseId/schedule-session" 
              element={
                <ProtectedRoute>
                  <ScheduleSession />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/course/:courseId/session/:sessionId/edit" 
              element={
                <ProtectedRoute>
                  <EditSession />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </CourseProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;