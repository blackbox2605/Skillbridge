import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCourses } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { FaUserGraduate, FaArrowLeft, FaBook, FaMoneyBillWave, FaClock, FaTags, FaCalendarAlt } from 'react-icons/fa';
import Navbar from '../components/Navbar';

const categories = [
  'Web Development',
  'Mobile Development',
  'Data Science',
  'Machine Learning',
  'UI/UX Design',
  'Digital Marketing',
  'Business',
  'Language',
  'Music',
  'Photography',
  'Other'
];

const EditCourse = () => {
  const { courseId } = useParams();
  const { getCourse, updateCourse, isLoading, error } = useCourses();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration: '',
    category: '',
    enrollmentDeadline: ''
  });
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Use a ref to track if we're already fetching to prevent re-fetching in a loop
  const [hasFetched, setHasFetched] = useState(false);

  // Fetch course data - completely rewritten to avoid infinite loops
  useEffect(() => {
    // Prevent multiple fetches
    if (hasFetched) return;
    
    async function fetchCourseData() {
      try {
        console.log("Fetching course with ID:", courseId);
        setLoading(true);
        
        // Fetch the course data
        const courseData = await getCourse(courseId);
        console.log("Course data received:", courseData);
        
        if (!courseData) {
          console.log("Course not found");
          setFormError('Course not found');
          setLoading(false);
          setHasFetched(true);
          return;
        }
        
        // Extract IDs for comparison (ensure we have strings)
        const instructorId = String(courseData.instructor._id || courseData.instructor.id);
        const currentUserId = currentUser ? String(currentUser._id || currentUser.id) : null;
        
        console.log("Instructor ID:", instructorId);
        console.log("Current user ID:", currentUserId);
        console.log("User role:", currentUser?.role);
        
        // Check authorization
        if (!currentUser) {
          console.log("No current user, redirecting");
          navigate('/login');
          return;
        }
        
        if (currentUser.role !== 'instructor') {
          console.log("User is not an instructor, redirecting");
          navigate('/dashboard');
          return;
        }
        
        if (instructorId !== currentUserId) {
          console.log("User is not the course owner, redirecting");
          navigate('/dashboard');
          return;
        }
        
        // Format the enrollment deadline date for the input field if it exists
        let formattedDeadline = '';
        if (courseData.enrollmentDeadline) {
          const deadlineDate = new Date(courseData.enrollmentDeadline);
          formattedDeadline = deadlineDate.toISOString().split('T')[0];
        }
        
        // Set form data with course values
        setFormData({
          name: courseData.name || '',
          description: courseData.description || '',
          price: courseData.price || 0,
          duration: courseData.duration || 0,
          category: courseData.category || '',
          enrollmentDeadline: formattedDeadline
        });
        
        console.log("Form data populated successfully");
      } catch (error) {
        console.error("Error fetching course:", error);
        setFormError('Error loading course: ' + (error.message || 'Unknown error'));
      } finally {
        setLoading(false);
        setHasFetched(true);
      }
    }
    
    fetchCourseData();
  }, [courseId, currentUser, getCourse, navigate, hasFetched]);

  const handleChange = (e) => {
    // Handle number inputs
    if (e.target.name === 'price' || e.target.name === 'duration') {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value === '' ? '' : Number(e.target.value)
      });
    } else {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value
      });
    }
    setFormError('');
    setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');

    try {
      // Basic validation
      if (!formData.name || !formData.description || !formData.price || !formData.duration || !formData.category) {
        setFormError('All fields are required except enrollment deadline');
        return;
      }

      // Update the course
      await updateCourse(courseId, formData);
      setSuccessMessage('Course updated successfully!');
      
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      setFormError(error.response?.data?.message || 'Failed to update course. Please try again.');
    }
  };

  // Display loading indicator
  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Display error screen if there's an issue
  if (formError && !formData.name) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
        <div className="bg-white shadow-lg rounded-lg p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Course</h2>
          <p className="text-gray-700 mb-6">{formError}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar showBackButton={true} backUrl="/dashboard" />

      <div className="py-10">
        <header>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900">Edit Course</h1>
          </div>
        </header>
        <main>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white shadow rounded-lg p-6 mt-6">
              {formError && (
                <div className="mb-4 bg-red-50 p-4 rounded-md">
                  <p className="text-sm text-red-700">{formError}</p>
                </div>
              )}
              {successMessage && (
                <div className="mb-4 bg-green-50 p-4 rounded-md">
                  <p className="text-sm text-green-700">{successMessage}</p>
                </div>
              )}
              {error && (
                <div className="mb-4 bg-red-50 p-4 rounded-md">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Course Name
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaBook className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Enter course name"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Course Description
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="description"
                      name="description"
                      rows={4}
                      required
                      value={formData.description}
                      onChange={handleChange}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Describe what students will learn"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                      Price (INR)
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaMoneyBillWave className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="price"
                        name="price"
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={formData.price}
                        onChange={handleChange}
                        className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="999.99"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                      Duration (hours)
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaClock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="duration"
                        name="duration"
                        type="number"
                        min="1"
                        required
                        value={formData.duration}
                        onChange={handleChange}
                        className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="10"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                      Category
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaTags className="h-5 w-5 text-gray-400" />
                      </div>
                      <select
                        id="category"
                        name="category"
                        required
                        value={formData.category}
                        onChange={handleChange}
                        className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        <option value="">Select a category</option>
                        {categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="enrollmentDeadline" className="block text-sm font-medium text-gray-700">
                      Enrollment Deadline (Optional)
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaCalendarAlt className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="enrollmentDeadline"
                        name="enrollmentDeadline"
                        type="date"
                        value={formData.enrollmentDeadline}
                        onChange={handleChange}
                        className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Leave blank for no enrollment deadline</p>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="mr-3 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Updating...' : 'Update Course'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EditCourse; 