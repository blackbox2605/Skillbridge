import { createContext, useContext, useState } from 'react';
import axios from 'axios';

const CourseContext = createContext();

export const CourseProvider = ({ children }) => {
  const [courses, setCourses] = useState([]);
  const [course, setCourse] = useState(null);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get all courses
  const getCourses = async (filters = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      let url = 'http://localhost:5000/api/courses';
      
      // Add category filter if provided
      if (filters.category) {
        url += `?category=${filters.category}`;
      }
      
      // Use authentication token if available (for personalized recommendations, etc.)
      const token = localStorage.getItem('token');
      const config = token ? {
        headers: {
          Authorization: `Bearer ${token}`
        }
      } : {};
      
      const response = await axios.get(url, config);
      
      // Ensure we have valid data before setting state
      if (response.data && response.data.data && Array.isArray(response.data.data.courses)) {
        setCourses(response.data.data.courses);
      } else {
        setCourses([]);
      }
      
      setIsLoading(false);
      return response.data.data.courses;
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError(error.response?.data?.message || 'Failed to fetch courses');
      setCourses([]);
      setIsLoading(false);
      return [];
    }
  };

  // Get instructor courses
  const getInstructorCourses = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsLoading(false);
        setCourses([]);
        throw new Error('You must be logged in to view your courses');
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };
      
      const response = await axios.get('http://localhost:5000/api/courses', config);
      
      // Ensure we have valid data before setting state
      if (response.data && response.data.data && Array.isArray(response.data.data.courses)) {
        setCourses(response.data.data.courses);
      } else {
        setCourses([]);
      }
      
      setIsLoading(false);
      return response.data.data.courses;
    } catch (error) {
      console.error('Error fetching instructor courses:', error);
      setError(error.response?.data?.message || 'Failed to fetch your courses');
      setCourses([]);
      setIsLoading(false);
      return [];
    }
  };

  // Get enrolled courses for the current student
  const getEnrolledCourses = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsLoading(false);
        setEnrolledCourses([]);
        throw new Error('You must be logged in to view your enrolled courses');
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };
      
      const response = await axios.get('http://localhost:5000/api/enrollments', config);
      
      if (response.data && response.data.data && Array.isArray(response.data.data.enrollments)) {
        setEnrolledCourses(response.data.data.enrollments);
      } else {
        setEnrolledCourses([]);
      }
      
      setIsLoading(false);
      return response.data.data.enrollments;
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
      setError(error.response?.data?.message || 'Failed to fetch your enrolled courses');
      setEnrolledCourses([]);
      setIsLoading(false);
      return [];
    }
  };

  // Enroll in a course
  const enrollInCourse = async (courseId, paymentInfo = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsLoading(false);
        throw new Error('You must be logged in to enroll in a course');
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };
      
      const response = await axios.post(
        `http://localhost:5000/api/enrollments/${courseId}`,
        { paymentInfo },
        config
      );
      
      setIsLoading(false);
      return response.data.data.enrollment;
    } catch (error) {
      console.error('Error enrolling in course:', error);
      setError(error.response?.data?.message || 'Failed to enroll in course');
      setIsLoading(false);
      throw error;
    }
  };

  // Get sessions for a specific course
  const getCourseSessions = async (courseId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsLoading(false);
        setSessions([]);
        throw new Error('You must be logged in to view course sessions');
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };
      
      const response = await axios.get(
        `http://localhost:5000/api/courses/${courseId}/sessions`,
        config
      );
      
      if (response.data && response.data.data && Array.isArray(response.data.data.sessions)) {
        setSessions(response.data.data.sessions);
      } else {
        setSessions([]);
      }
      
      setIsLoading(false);
      return response.data.data.sessions;
    } catch (error) {
      console.error('Error fetching course sessions:', error);
      setError(error.response?.data?.message || 'Failed to fetch course sessions');
      setSessions([]);
      setIsLoading(false);
      return [];
    }
  };

  // Get upcoming sessions for enrolled courses
  const getUpcomingSessions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsLoading(false);
        setUpcomingSessions([]);
        throw new Error('You must be logged in to view upcoming sessions');
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };
      
      const response = await axios.get(
        `http://localhost:5000/api/sessions/upcoming`,
        config
      );
      
      if (response.data && response.data.data && Array.isArray(response.data.data.sessions)) {
        setUpcomingSessions(response.data.data.sessions);
      } else {
        setUpcomingSessions([]);
      }
      
      setIsLoading(false);
      return response.data.data.sessions;
    } catch (error) {
      console.error('Error fetching upcoming sessions:', error);
      setError(error.response?.data?.message || 'Failed to fetch upcoming sessions');
      setUpcomingSessions([]);
      setIsLoading(false);
      return [];
    }
  };

  // Create a new session for a course (instructor only)
  const createSession = async (courseId, sessionData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsLoading(false);
        throw new Error('You must be logged in to create a session');
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };
      
      const response = await axios.post(
        `http://localhost:5000/api/courses/${courseId}/sessions`,
        sessionData,
        config
      );
      
      // Add new session to state
      setSessions(prevSessions => [response.data.data.session, ...prevSessions]);
      
      setIsLoading(false);
      return response.data.data.session;
    } catch (error) {
      console.error('Error creating session:', error);
      setError(error.response?.data?.message || 'Failed to create session');
      setIsLoading(false);
      throw error;
    }
  };

  // Update an existing session (instructor only)
  const updateSession = async (courseId, sessionId, sessionData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsLoading(false);
        throw new Error('You must be logged in to update a session');
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };
      
      const response = await axios.put(
        `http://localhost:5000/api/courses/${courseId}/sessions/${sessionId}`,
        sessionData,
        config
      );
      
      // Update sessions state with the updated session
      setSessions(prevSessions => 
        prevSessions.map(session => 
          session._id === sessionId ? response.data.data.session : session
        )
      );
      
      setIsLoading(false);
      return response.data.data.session;
    } catch (error) {
      console.error('Error updating session:', error);
      setError(error.response?.data?.message || 'Failed to update session');
      setIsLoading(false);
      throw error;
    }
  };

  // Get a single course
  const getCourse = async (courseId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Return early if no courseId provided
      if (!courseId) {
        setIsLoading(false);
        return null;
      }
      
      // Use authentication token if available 
      const token = localStorage.getItem('token');
      const config = token ? {
        headers: {
          Authorization: `Bearer ${token}`
        }
      } : {};
      
      const response = await axios.get(`http://localhost:5000/api/courses/${courseId}`, config);
      
      if (response.data && response.data.data && response.data.data.course) {
        setCourse(response.data.data.course);
        setIsLoading(false);
        return response.data.data.course;
      } else {
        console.error('Invalid course data format received');
        setCourse(null);
        setIsLoading(false);
        return null;
      }
    } catch (error) {
      console.error('Error fetching course details:', error);
      setError(error.response?.data?.message || 'Failed to fetch course');
      setCourse(null);
      setIsLoading(false);
      return null;
    }
  };

  // Create a new course
  const createCourse = async (courseData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsLoading(false);
        throw new Error('You must be logged in to create a course');
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };
      
      const response = await axios.post(
        'http://localhost:5000/api/courses', 
        courseData,
        config
      );
      
      // Update courses state with the new course
      setCourses(prevCourses => [response.data.data.course, ...prevCourses]);
      setIsLoading(false);
      
      return response.data.data.course;
    } catch (error) {
      console.error('Error creating course:', error);
      setError(error.response?.data?.message || 'Failed to create course');
      setIsLoading(false);
      throw error;
    }
  };

  // Update a course
  const updateCourse = async (courseId, courseData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsLoading(false);
        throw new Error('You must be logged in to update a course');
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };
      
      const response = await axios.put(
        `http://localhost:5000/api/courses/${courseId}`, 
        courseData,
        config
      );
      
      // Update courses state with the updated course
      setCourses(prevCourses => 
        prevCourses.map(course => 
          course._id === courseId ? response.data.data.course : course
        )
      );
      setIsLoading(false);
      
      return response.data.data.course;
    } catch (error) {
      console.error('Error updating course:', error);
      setError(error.response?.data?.message || 'Failed to update course');
      setIsLoading(false);
      throw error;
    }
  };

  // Delete a course
  const deleteCourse = async (courseId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsLoading(false);
        throw new Error('You must be logged in to delete a course');
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };
      
      await axios.delete(
        `http://localhost:5000/api/courses/${courseId}`,
        config
      );
      
      // Update courses state by removing the deleted course
      setCourses(prevCourses => prevCourses.filter(course => course._id !== courseId));
      setIsLoading(false);
      
      return true;
    } catch (error) {
      console.error('Error deleting course:', error);
      setError(error.response?.data?.message || 'Failed to delete course');
      setIsLoading(false);
      throw error;
    }
  };

  // Get materials for a specific course
  const getCourseMaterials = async (courseId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsLoading(false);
        setMaterials([]);
        throw new Error('You must be logged in to view course materials');
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };
      
      const response = await axios.get(
        `http://localhost:5000/api/courses/${courseId}/materials`,
        config
      );
      
      if (response.data && response.data.data && Array.isArray(response.data.data.materials)) {
        setMaterials(response.data.data.materials);
      } else {
        setMaterials([]);
      }
      
      setIsLoading(false);
      return response.data.data.materials;
    } catch (error) {
      console.error('Error fetching course materials:', error);
      setError(error.response?.data?.message || 'Failed to fetch course materials');
      setMaterials([]);
      setIsLoading(false);
      return [];
    }
  };

  // Upload a new material for a course
  const uploadMaterial = async (courseId, formData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsLoading(false);
        throw new Error('You must be logged in to upload materials');
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      };
      
      const response = await axios.post(
        `http://localhost:5000/api/courses/${courseId}/materials`,
        formData,
        config
      );
      
      // Add new material to state
      setMaterials(prevMaterials => [response.data.data.material, ...prevMaterials]);
      
      setIsLoading(false);
      return response.data.data.material;
    } catch (error) {
      console.error('Error uploading material:', error);
      setError(error.response?.data?.message || 'Failed to upload material');
      setIsLoading(false);
      throw error;
    }
  };

  // Delete a material
  const deleteMaterial = async (courseId, materialId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsLoading(false);
        throw new Error('You must be logged in to delete materials');
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };
      
      await axios.delete(
        `http://localhost:5000/api/courses/${courseId}/materials/${materialId}`,
        config
      );
      
      // Remove deleted material from state
      setMaterials(prevMaterials => prevMaterials.filter(material => material._id !== materialId));
      
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Error deleting material:', error);
      setError(error.response?.data?.message || 'Failed to delete material');
      setIsLoading(false);
      throw error;
    }
  };

  // Download a material
  const downloadMaterial = async (courseId, materialId, fileName) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsLoading(false);
        throw new Error('You must be logged in to download materials');
      }

      // Create a download URL with the token as a query parameter
      const downloadUrl = `http://localhost:5000/api/courses/${courseId}/materials/${materialId}/download?token=${token}`;
      
      console.log('Initiating download from:', downloadUrl);
      
      // First check if the file exists/is accessible by making a HEAD request
      const checkResponse = await fetch(downloadUrl, {
        method: 'HEAD',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!checkResponse.ok) {
        const errorText = await checkResponse.text();
        console.error('Download check failed:', checkResponse.status, errorText);
        throw new Error(`Download failed: ${checkResponse.statusText}`);
      }
      
      // If check passes, initiate the download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', fileName || 'download');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Error downloading material:', error);
      setError(error.message || 'Failed to download material');
      setIsLoading(false);
      throw error;
    }
  };

  // Get course enrollment statistics (instructor only)
  const getCourseStats = async (courseId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsLoading(false);
        throw new Error('You must be logged in to view course statistics');
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };
      
      const response = await axios.get(
        `http://localhost:5000/api/courses/${courseId}/stats`,
        config
      );
      
      setIsLoading(false);
      return response.data.data.stats;
    } catch (error) {
      console.error('Error getting course statistics:', error);
      setError(error.response?.data?.message || 'Failed to get course statistics');
      setIsLoading(false);
      throw error;
    }
  };

  const value = {
    courses,
    course,
    enrolledCourses,
    sessions,
    upcomingSessions,
    materials,
    isLoading,
    error,
    getCourses,
    getInstructorCourses,
    getEnrolledCourses,
    enrollInCourse,
    getCourseSessions,
    getUpcomingSessions,
    createSession,
    updateSession,
    getCourse,
    createCourse,
    updateCourse,
    deleteCourse,
    getCourseMaterials,
    uploadMaterial,
    deleteMaterial,
    downloadMaterial,
    getCourseStats
  };

  return <CourseContext.Provider value={value}>{children}</CourseContext.Provider>;
};

export const useCourses = () => {
  return useContext(CourseContext);
};

export default CourseContext; 