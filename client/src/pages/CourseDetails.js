import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCourses } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { FaUserGraduate, FaArrowLeft, FaClock, FaMoneyBillWave, FaChalkboardTeacher, FaCalendarAlt, FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaUsers, FaRupeeSign } from 'react-icons/fa';
import CourseMaterials from '../components/CourseMaterials';
import SessionDetails from '../components/SessionDetails';

// Add script for Razorpay
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

const CourseDetails = () => {
  const { courseId } = useParams();
  const { getCourse, getEnrolledCourses, enrollInCourse, getCourseSessions, getCourseStats, sessions, isLoading: apiLoading, error: apiError } = useCourses();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Data states
  const [course, setCourse] = useState(null);
  const [courseStats, setCourseStats] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollmentDeadlinePassed, setEnrollmentDeadlinePassed] = useState(false);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollmentSuccess, setEnrollmentSuccess] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [paymentError, setPaymentError] = useState('');
  
  // Single data loading function
  useEffect(() => {
    let isMounted = true;
    
    const loadAllData = async () => {
      try {
        // Step 1: Fetch course data
        const courseData = await getCourse(courseId);
        
        if (!isMounted) return;
        if (!courseData) {
          setError('Course not found');
          setLoading(false);
          return;
        }
        
        setCourse(courseData);
        
        // Step 2: Check enrollment deadline
        if (courseData.enrollmentDeadline) {
          const deadlineDate = new Date(courseData.enrollmentDeadline);
          const now = new Date();
          setEnrollmentDeadlinePassed(now > deadlineDate);
        }
        
        // Step 3: For students, check enrollment status
        let enrollmentStatus = false;
        if (currentUser && currentUser.role === 'student') {
          try {
            const enrollments = await getEnrolledCourses();
            if (isMounted) {
              enrollmentStatus = enrollments.some(enrollment => enrollment.course._id === courseId);
              setIsEnrolled(enrollmentStatus);
            }
          } catch (err) {
            console.error('Error checking enrollment:', err);
          }
        }
        
        // Step 4: For instructors, fetch statistics
        if (currentUser && 
            currentUser.role === 'instructor' && 
            courseData.instructor && 
            currentUser._id === courseData.instructor._id) {
          try {
            const stats = await getCourseStats(courseId);
            if (isMounted) {
              setCourseStats(stats);
            }
          } catch (err) {
            console.error('Error fetching course statistics:', err);
            if (isMounted) {
              setCourseStats({ enrolledStudents: 0, totalEarnings: 0 });
            }
          }
        }
        
        // Step 5: Fetch sessions if needed
        if ((enrollmentStatus || 
            (currentUser?.role === 'instructor' && 
             courseData.instructor._id === currentUser._id)) &&
            isMounted) {
          try {
            await getCourseSessions(courseId);
          } catch (err) {
            console.error('Error fetching sessions:', err);
          }
        }
        
        // All data loaded
        if (isMounted) {
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading course data:', err);
        if (isMounted) {
          setError(err.message || 'Failed to load course data');
          setLoading(false);
        }
      }
    };
    
    // Start loading data
    setLoading(true);
    loadAllData();
    
    // Cleanup
    return () => {
      isMounted = false;
    };
  }, [courseId, currentUser?.role, currentUser?._id]);
  
  // Handle enrollment (Razorpay payment)
  const handleEnroll = async () => {
    try {
      setEnrolling(true);
      setPaymentError('');
      
      // Load Razorpay script
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        setPaymentError('Failed to load payment gateway. Please try again.');
        setEnrolling(false);
        return;
      }
      
      // Calculate amount in paise (Razorpay uses smallest currency unit)
      const amountInPaise = Math.round(course.price * 100);
      
      const options = {
        key: "rzp_test_ISqzm3OSAUq0YW",
        amount: amountInPaise.toString(),
        currency: "INR",
        name: "SkillBridge",
        description: `Enrollment fee for ${course.name}`,
        image: "https://yourdomain.com/logo.png",
        handler: async function (response) {
          try {
            // Payment successful, now enroll in the course
            await enrollInCourse(courseId, {
              paymentId: response.razorpay_payment_id,
              amount: course.price
            });
            
            setEnrolling(false);
            setEnrollmentSuccess(true);
            setIsEnrolled(true);
            
            // Fetch sessions after enrollment
            getCourseSessions(courseId);
            
            // Reset success message after 3 seconds
            setTimeout(() => {
              setEnrollmentSuccess(false);
            }, 3000);
          } catch (error) {
            console.error('Error enrolling in course after payment:', error);
            setPaymentError('Payment successful but enrollment failed. Please contact support.');
            setEnrolling(false);
          }
        },
        prefill: {
          name: currentUser?.name || '',
          email: currentUser?.email || '',
          contact: currentUser?.phone || ''
        },
        theme: {
          color: "#4F46E5"
        },
        modal: {
          ondismiss: function() {
            setEnrolling(false);
          }
        }
      };
      
      const razorpay = new window.Razorpay(options);
      razorpay.open();
      
    } catch (error) {
      console.error('Error initiating payment:', error);
      setPaymentError('Failed to initiate payment. Please try again.');
      setEnrolling(false);
    }
  };

  const handleSelectSession = (session) => {
    setSelectedSession(session);
  };

  // Display loading state or error
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Loading course details...</h2>
          <p className="text-gray-600">Please wait while we fetch the course information.</p>
        </div>
      </div>
    );
  }

  if (error || apiError || !course) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
        <div className="bg-white shadow-lg rounded-lg p-8 max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Course Not Found</h2>
          <p className="text-gray-600 mb-6">The course you're looking for doesn't exist or may have been removed.</p>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <FaArrowLeft className="mr-2" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <FaUserGraduate className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">SkillBridge</span>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <FaArrowLeft className="mr-2" />
                Back
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {/* Course Header */}
            <div className="bg-indigo-100 px-6 py-8">
              <h1 className="text-3xl font-bold text-gray-900">{course.name}</h1>
              <p className="mt-2 text-sm text-indigo-700 font-medium">{course.category}</p>
              
              {/* Enrollment Status */}
              {isEnrolled && (
                <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <FaCheckCircle className="mr-1.5 h-4 w-4" />
                  Enrolled
                </div>
              )}
              
              {/* Enrollment Deadline Status */}
              {course.enrollmentDeadline && (
                <div className={`mt-4 ml-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  enrollmentDeadlinePassed 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {enrollmentDeadlinePassed ? (
                    <>
                      <FaTimesCircle className="mr-1.5 h-4 w-4" />
                      Enrollment Closed
                    </>
                  ) : (
                    <>
                      <FaExclamationTriangle className="mr-1.5 h-4 w-4" />
                      Enrollment Deadline: {new Date(course.enrollmentDeadline).toLocaleDateString()}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Course Info */}
            <div className="px-6 py-8">
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center text-sm text-gray-500 bg-gray-100 rounded-full px-4 py-2">
                  <FaChalkboardTeacher className="mr-2 h-4 w-4 text-gray-400" />
                  {course.instructor ? course.instructor.name : 'Unknown Instructor'}
                </div>
                <div className="flex items-center text-sm text-gray-500 bg-gray-100 rounded-full px-4 py-2">
                  <FaClock className="mr-2 h-4 w-4 text-gray-400" />
                  {course.duration} hours
                </div>
                <div className="flex items-center text-sm text-gray-500 bg-gray-100 rounded-full px-4 py-2">
                  <FaMoneyBillWave className="mr-2 h-4 w-4 text-gray-400" />
                  ₹{course.price.toFixed(2)}
                </div>
                {course.enrollmentDeadline && (
                  <div className="flex items-center text-sm text-gray-500 bg-gray-100 rounded-full px-4 py-2">
                    <FaCalendarAlt className="mr-2 h-4 w-4 text-gray-400" />
                    Enrollment Ends: {new Date(course.enrollmentDeadline).toLocaleDateString()}
                  </div>
                )}
              </div>

              {/* Course Statistics for Instructors */}
              {currentUser?.role === 'instructor' && currentUser?._id === course.instructor?._id && courseStats && (
                <div className="mb-6 bg-indigo-50 border border-indigo-100 rounded-md p-4">
                  <h3 className="text-lg font-medium text-indigo-800 mb-2">Course Statistics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <div className="bg-indigo-100 rounded-full p-3 mr-3">
                        <FaUsers className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Enrolled Students</p>
                        <p className="text-lg font-semibold text-gray-800">{courseStats.enrolledStudents}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="bg-indigo-100 rounded-full p-3 mr-3">
                        <FaRupeeSign className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Total Earnings</p>
                        <p className="text-lg font-semibold text-gray-800">₹{courseStats.totalEarnings.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">About This Course</h2>
                <p className="text-gray-700 whitespace-pre-line">
                  {course.description}
                </p>
              </div>

              {/* Enrollment deadline warning */}
              {course.enrollmentDeadline && !enrollmentDeadlinePassed && !isEnrolled && currentUser?.role === 'student' && (
                <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <FaExclamationTriangle className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-yellow-800">
                        Enrollment for this course closes on {new Date(course.enrollmentDeadline).toLocaleDateString()}. Enroll now to secure your spot!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Enrollment deadline passed message */}
              {enrollmentDeadlinePassed && !isEnrolled && currentUser?.role === 'student' && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <FaTimesCircle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-800">
                        Enrollment deadline for this course has passed on {new Date(course.enrollmentDeadline).toLocaleDateString()}. You can no longer enroll in this course.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Enrollment success message */}
              {enrollmentSuccess && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <FaCheckCircle className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">
                        Successfully enrolled in this course!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Error message */}
              {paymentError && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <FaTimesCircle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-800">
                        {paymentError}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Course Materials section - only visible to enrolled students and course instructors */}
              {(isEnrolled || (currentUser?.role === 'instructor' && currentUser?._id === course.instructor?._id)) && (
                <CourseMaterials 
                  courseId={courseId} 
                  isInstructor={currentUser?.role === 'instructor' && currentUser?._id === course.instructor?._id} 
                />
              )}
              
              {/* Sessions section - only visible to enrolled students and course instructors */}
              {(isEnrolled || (currentUser?.role === 'instructor' && currentUser?._id === course.instructor?._id)) && (
                <div className="mb-8 mt-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Course Sessions</h2>
                  
                  {selectedSession ? (
                    <div className="mb-6">
                      <button
                        onClick={() => setSelectedSession(null)}
                        className="mb-4 inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <FaArrowLeft className="mr-2" />
                        Back to sessions list
                      </button>
                      
                      <SessionDetails
                        session={selectedSession}
                        courseId={courseId}
                      />
                    </div>
                  ) : (
                    <>
                      {sessions && sessions.length > 0 ? (
                        <div className="space-y-4">
                          {sessions.map(session => (
                            <div 
                              key={session._id} 
                              className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                              onClick={() => handleSelectSession(session)}
                            >
                              <h3 className="font-semibold text-lg text-gray-900">{session.title}</h3>
                              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{session.description}</p>
                              <div className="flex items-center text-sm text-gray-700">
                                <FaCalendarAlt className="mr-2 h-4 w-4 text-gray-400" />
                                {new Date(session.startDate).toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <p className="text-gray-500">No sessions scheduled yet.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Schedule Session button for instructors */}
              {currentUser?.role === 'instructor' && currentUser?._id === course.instructor?._id && !selectedSession && (
                <div className="mt-8">
                  <button 
                    onClick={() => navigate(`/course/${course._id}/schedule-session`)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <FaCalendarAlt className="mr-2" />
                    Schedule New Session
                  </button>
                </div>
              )}

              {/* Enroll Button for Students */}
              {currentUser?.role === 'student' && !isEnrolled && !enrollmentDeadlinePassed && (
                <div className="mt-8">
                  <button 
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="w-full md:w-auto inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {enrolling ? 'Enrolling...' : `Enroll Now for ₹${course.price.toFixed(2)}`}
                  </button>
                  <p className="mt-2 text-sm text-gray-500">
                    Gain full access to all course materials and instructor support.
                  </p>
                </div>
              )}

              {/* Edit Button for Course Owner */}
              {currentUser?.role === 'instructor' && currentUser?._id === course.instructor?._id && (
                <div className="mt-8">
                  <button 
                    onClick={() => navigate(`/edit-course/${course._id}`)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Edit Course
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetails; 