import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCourses } from '../context/CourseContext';
import { useNavigate, Link } from 'react-router-dom';
import { FaUserGraduate, FaSignOutAlt, FaUserEdit, FaPlus, FaBook, FaClock, FaMoneyBillWave, FaGraduationCap, FaUsers, FaRupeeSign, FaChalkboardTeacher } from 'react-icons/fa';
import Navbar from '../components/Navbar';

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const { 
    courses, 
    getInstructorCourses, 
    getCourses, 
    enrolledCourses, 
    getEnrolledCourses,
    getCourseStats, 
    isLoading 
  } = useCourses();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [courseStats, setCourseStats] = useState({});

  useEffect(() => {
    // Only fetch courses if we have a logged-in user
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const fetchCourses = async () => {
      try {
        if (currentUser.role === 'instructor') {
          await getInstructorCourses();
        } else if (currentUser.role === 'student') {
          await getEnrolledCourses(); // Fetch enrolled courses for students
          await getCourses(); // Also fetch all courses
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
    // Use limited dependencies to prevent re-fetching on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // Fetch stats for instructor courses
  useEffect(() => {
    if (currentUser?.role === 'instructor' && courses.length > 0) {
      const fetchStats = async () => {
        const stats = {};
        
        for (const course of courses) {
          try {
            const courseStats = await getCourseStats(course._id);
            stats[course._id] = courseStats;
          } catch (error) {
            console.error(`Error fetching stats for course ${course._id}:`, error);
            stats[course._id] = { enrolledStudents: 0, totalEarnings: 0 };
          }
        }
        
        setCourseStats(stats);
      };
      
      fetchStats();
    }
  }, [currentUser?.role, courses, getCourseStats]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Only show loading state when both component loading and course loading are true
  const isPageLoading = loading && isLoading;

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar showLogout={true} onLogout={handleLogout} userName={currentUser?.name} />

      <div className="py-10">
        <header>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          </div>
        </header>
        <main>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white shadow rounded-lg p-6 mt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  Your Profile
                </h2>
                <Link
                  to="/edit-profile"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <FaUserEdit className="mr-2" />
                  Edit Profile
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Name</p>
                  <p className="mt-1 text-lg font-medium text-gray-900">
                    {currentUser?.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="mt-1 text-lg font-medium text-gray-900">
                    {currentUser?.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Role</p>
                  <p className="mt-1 text-lg font-medium text-gray-900 capitalize">
                    {currentUser?.role}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Member Since</p>
                  <p className="mt-1 text-lg font-medium text-gray-900">
                    {new Date(currentUser?.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              {/* Skills section */}
              {currentUser?.skills && currentUser.skills.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {currentUser.skills.map((skill, index) => (
                      <span 
                        key={index} 
                        className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-indigo-100 text-indigo-800"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Course Section for Instructors */}
            {currentUser?.role === 'instructor' && (
              <div className="bg-white shadow rounded-lg p-6 mt-6 min-h-[300px]">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">
                    Your Courses
                  </h2>
                  <Link
                    to="/create-course"
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <FaPlus className="mr-2" />
                    Create Course
                  </Link>
                </div>

                {isPageLoading ? (
                  <div className="flex justify-center items-center h-[200px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                  </div>
                ) : courses && courses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course) => (
                      <div key={course._id} className="border rounded-lg overflow-hidden flex flex-col">
                        <Link to={`/course/${course._id}`} className="flex-1">
                          <div className="bg-indigo-100 px-4 py-5 sm:px-6 flex-1 hover:bg-indigo-200 transition-colors">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">{course.name}</h3>
                            <p className="mt-1 max-w-2xl text-sm text-gray-500">{course.category}</p>
                          </div>
                          <div className="px-4 py-5 sm:p-6 hover:bg-gray-50 transition-colors">
                            <p className="text-sm text-gray-500 line-clamp-2">
                              {course.description}
                            </p>
                            <div className="mt-4 flex items-center text-sm text-gray-500">
                              <FaClock className="mr-1.5 h-4 w-4 text-gray-400" />
                              {course.duration} hours
                            </div>
                            <div className="mt-2 flex items-center text-sm text-gray-500">
                              <FaMoneyBillWave className="mr-1.5 h-4 w-4 text-gray-400" />
                              ₹{course.price.toFixed(2)}
                            </div>
                            
                            {/* Enrollment Stats */}
                            {courseStats[course._id] && (
                              <>
                                <div className="mt-4 pt-4 border-t">
                                  <div className="flex items-center text-sm text-gray-500">
                                    <FaUsers className="mr-1.5 h-4 w-4 text-gray-400" />
                                    {courseStats[course._id].enrolledStudents} Student{courseStats[course._id].enrolledStudents !== 1 ? 's' : ''} Enrolled
                                  </div>
                                  <div className="mt-2 flex items-center text-sm text-gray-500">
                                    <FaRupeeSign className="mr-1.5 h-4 w-4 text-gray-400" />
                                    Earnings: ₹{courseStats[course._id].totalEarnings.toFixed(2)}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </Link>
                        <div className="border-t px-4 py-4 sm:px-6 bg-gray-50">
                          <div className="flex justify-between space-x-3">
                            <Link
                              to={`/course/${course._id}`}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              View Details
                            </Link>
                            <Link
                              to={`/edit-course/${course._id}`}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              Edit
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <FaBook className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No courses yet</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new course.</p>
                    <div className="mt-6">
                      <Link
                        to="/create-course"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <FaPlus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                        Create Course
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Enrolled Courses Section for Students */}
            {currentUser?.role === 'student' && (
              <div className="bg-white shadow rounded-lg p-6 mt-6 min-h-[300px]">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">
                    Your Enrolled Courses
                  </h2>
                  <Link
                    to="/explore"
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <FaPlus className="mr-2" />
                    Explore More Courses
                  </Link>
                </div>

                {isPageLoading ? (
                  <div className="flex justify-center items-center h-[200px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                  </div>
                ) : enrolledCourses && enrolledCourses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {enrolledCourses.map((enrollment) => (
                      <div key={enrollment._id} className="border rounded-lg overflow-hidden flex flex-col">
                        <Link to={`/course/${enrollment.course._id}`} className="flex-1">
                          <div className="bg-indigo-100 px-4 py-5 sm:px-6 flex-1 hover:bg-indigo-200 transition-colors">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">{enrollment.course.name}</h3>
                            <p className="mt-1 max-w-2xl text-sm text-gray-500">{enrollment.course.category}</p>
                            <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <FaGraduationCap className="mr-1" />
                              Enrolled
                            </div>
                          </div>
                          <div className="px-4 py-5 sm:p-6 hover:bg-gray-50 transition-colors">
                            <p className="text-sm text-gray-500 line-clamp-2">
                              {enrollment.course.description}
                            </p>
                            <div className="mt-4 flex items-center text-sm text-gray-500">
                              <FaClock className="mr-1.5 h-4 w-4 text-gray-400" />
                              {enrollment.course.duration} hours
                            </div>
                            <div className="mt-2 flex items-center text-sm text-gray-500">
                              <FaMoneyBillWave className="mr-1.5 h-4 w-4 text-gray-400" />
                              ₹{enrollment.course.price.toFixed(2)}
                            </div>
                          </div>
                        </Link>
                        <div className="border-t px-4 py-4 sm:px-6 bg-gray-50">
                          <div className="flex justify-center">
                            <Link
                              to={`/course/${enrollment.course._id}`}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              View Course
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <FaBook className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No enrolled courses yet</h3>
                    <p className="mt-1 text-sm text-gray-500">Explore courses and enroll to start learning.</p>
                    <div className="mt-6">
                      <Link
                        to="/explore"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <FaPlus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                        Explore Courses
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white shadow rounded-lg p-6 mt-6 min-h-[200px]">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                {currentUser?.role === 'student' ? 'Your Learning Journey' : 'Your Teaching Journey'}
              </h2>
              <p className="text-gray-600">
                {currentUser?.role === 'student'
                  ? 'Start exploring skills and connect with instructors to enhance your learning journey.'
                  : 'Share your skills and knowledge with students by creating courses and sessions.'}
              </p>
              {currentUser?.role === 'student' ? (
                <Link
                  to="/explore"
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Explore Skills
                </Link>
              ) : (
                <Link 
                  to="/create-course"
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <FaPlus className="mr-2" />
                  Create a Course
                </Link>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard; 