import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

const CreateCourse = () => {
  const { createCourse, isLoading, error } = useCourses();
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

  // Redirect if user is not an instructor
  if (currentUser && currentUser.role !== 'instructor') {
    navigate('/dashboard');
  }

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

      // Create the course
      await createCourse(formData);
      setSuccessMessage('Course created successfully!');
      
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      setFormError(error.response?.data?.message || 'Failed to create course. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar showBackButton={true} backUrl="/dashboard" />

      <div className="py-10">
        <header>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900">Create a New Course</h1>
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
                    {isLoading ? 'Creating...' : 'Create Course'}
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

export default CreateCourse; 