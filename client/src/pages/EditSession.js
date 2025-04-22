import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCourses } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { FaCalendarAlt, FaArrowLeft, FaUserGraduate } from 'react-icons/fa';
import Navbar from '../components/Navbar';

const EditSession = () => {
  const { courseId, sessionId } = useParams();
  const { updateSession, getCourseSessions, sessions, getCourse } = useCourses();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    meetingLink: ''
  });
  const [errors, setErrors] = useState({});
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Format date for datetime-local input
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Format as YYYY-MM-DDThh:mm
    return date.toISOString().slice(0, 16);
  };

  // Fetch course and session details
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch the course
        const courseData = await getCourse(courseId);
        
        if (!courseData || !currentUser || 
            currentUser.role !== 'instructor' || 
            courseData.instructor._id !== currentUser._id) {
          navigate('/dashboard');
          return;
        }
        
        // Fetch the sessions if not already loaded
        if (!sessions || sessions.length === 0) {
          await getCourseSessions(courseId);
        }
        
        if (isMounted) {
          setCourse(courseData);
          
          // Find the specific session to edit
          const sessionToEdit = sessions.find(s => s._id === sessionId);
          
          if (!sessionToEdit) {
            navigate(`/course/${courseId}`);
            return;
          }
          
          // Format dates for form input
          setFormData({
            title: sessionToEdit.title || '',
            description: sessionToEdit.description || '',
            startDate: formatDateForInput(sessionToEdit.startDate),
            endDate: formatDateForInput(sessionToEdit.endDate),
            meetingLink: sessionToEdit.meetingLink || ''
          });
          
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        if (isMounted) {
          setLoading(false);
          navigate('/dashboard');
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, sessionId, currentUser, sessions.length]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear the error for this field when the user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // Validate form data
  const validateForm = () => {
    const newErrors = {};
    
    // Title validation
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    // Start date validation
    if (!formData.startDate) {
      newErrors.startDate = 'Start date and time are required';
    }
    
    // End date validation
    if (!formData.endDate) {
      newErrors.endDate = 'End date and time are required';
    } else if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      newErrors.endDate = 'End time must be after start time';
    }
    
    // Meeting link validation is optional
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSubmitting(true);
      
      await updateSession(courseId, sessionId, formData);
      
      setSubmitting(false);
      setSubmitSuccess(true);
      
      // Redirect back to course details after a short delay
      setTimeout(() => {
        navigate(`/course/${courseId}`);
      }, 2000);
    } catch (error) {
      console.error('Error updating session:', error);
      setSubmitting(false);
      setErrors(prev => ({
        ...prev,
        submit: error.message || 'Failed to update session. Please try again.'
      }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar showBackButton={true} backUrl={`/course/${courseId}`} />

      <div className="py-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="bg-indigo-100 px-6 py-4">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <FaCalendarAlt className="mr-2 text-indigo-600" />
                Edit Session for {course?.name}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Update the details of your scheduled session
              </p>
            </div>

            <div className="px-6 py-6">
              {/* Success message */}
              {submitSuccess && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">
                        Session updated successfully! Redirecting...
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error message */}
              {errors.submit && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-800">
                        {errors.submit}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Session Title */}
                <div className="mb-4">
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Session Title*
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${errors.title ? 'border-red-300' : ''}`}
                    placeholder="Introduction to React Hooks"
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                  )}
                </div>

                {/* Session Description */}
                <div className="mb-4">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description*
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${errors.description ? 'border-red-300' : ''}`}
                    placeholder="We'll cover the basics of React Hooks, including useState and useEffect..."
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                  )}
                </div>

                {/* Session Date/Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Start Date/Time */}
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                      Start Date and Time*
                    </label>
                    <input
                      type="datetime-local"
                      id="startDate"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${errors.startDate ? 'border-red-300' : ''}`}
                    />
                    {errors.startDate && (
                      <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
                    )}
                  </div>

                  {/* End Date/Time */}
                  <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                      End Date and Time*
                    </label>
                    <input
                      type="datetime-local"
                      id="endDate"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleChange}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${errors.endDate ? 'border-red-300' : ''}`}
                    />
                    {errors.endDate && (
                      <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
                    )}
                  </div>
                </div>

                {/* Meeting Link */}
                <div className="mb-6">
                  <label htmlFor="meetingLink" className="block text-sm font-medium text-gray-700">
                    Meeting Link (Zoom, Google Meet, etc.)
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="url"
                      id="meetingLink"
                      name="meetingLink"
                      value={formData.meetingLink}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="https://zoom.us/j/example or https://meet.google.com/example"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Provide a link where students can join your live session. You can create a meeting link using services like 
                    <a href="https://zoom.us" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline"> Zoom</a> or 
                    <a href="https://meet.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline"> Google Meet</a>.
                  </p>
                </div>

                {/* Submit Button */}
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => navigate(`/course/${courseId}`)}
                    className="mr-4 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || submitSuccess}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Updating...' : 'Update Session'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditSession; 