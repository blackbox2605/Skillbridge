import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourses } from '../context/CourseContext';
import { FaUserGraduate, FaArrowLeft, FaSearch, FaFilter, FaClock, FaMoneyBillWave, FaChalkboardTeacher } from 'react-icons/fa';

const categories = [
  'All Categories',
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

const ExploreSkills = () => {
  const { getCourses, isLoading } = useCourses();
  const navigate = useNavigate();
  
  const [allCourses, setAllCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [priceRange, setPriceRange] = useState(500);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Fetch all courses on component mount
  useEffect(() => {
    let isMounted = true;
    
    const fetchCourses = async () => {
      try {
        const coursesData = await getCourses();
        if (isMounted) {
          setAllCourses(coursesData || []);
          setFilteredCourses(coursesData || []);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
        if (isMounted) {
          setAllCourses([]);
          setFilteredCourses([]);
        }
      }
    };

    fetchCourses();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply filters when search term, category, or price range changes
  useEffect(() => {
    filterCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedCategory, priceRange, allCourses]);

  // Filter courses based on search term, category, and price range
  const filterCourses = () => {
    let filtered = [...allCourses];

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        course => 
          course.name.toLowerCase().includes(search) || 
          course.description.toLowerCase().includes(search)
      );
    }

    // Apply category filter
    if (selectedCategory !== 'All Categories') {
      filtered = filtered.filter(course => course.category === selectedCategory);
    }

    // Apply price filter
    filtered = filtered.filter(course => course.price <= priceRange);

    setFilteredCourses(filtered);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
  };

  const handlePriceChange = (e) => {
    setPriceRange(Number(e.target.value));
  };

  const toggleFilterPanel = () => {
    setIsFilterOpen(!isFilterOpen);
  };

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
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <FaArrowLeft className="mr-2" />
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="py-10">
        <header>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900">Explore Skills</h1>
            <p className="mt-2 text-sm text-gray-600">
              Discover courses taught by expert instructors in various fields
            </p>
          </div>
        </header>
        <main>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Search for courses..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>

              {/* Filter Toggle Button */}
              <button
                onClick={toggleFilterPanel}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <FaFilter className="mr-2" />
                {isFilterOpen ? 'Hide Filters' : 'Show Filters'}
              </button>
            </div>

            {/* Filter Panel */}
            {isFilterOpen && (
              <div className="bg-white shadow rounded-lg p-4 mt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                      Category
                    </label>
                    <select
                      id="category"
                      name="category"
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                      value={selectedCategory}
                      onChange={handleCategoryChange}
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                      Max Price: ₹{priceRange}
                    </label>
                    <input
                      type="range"
                      id="price"
                      name="price"
                      min="0"
                      max="500"
                      step="10"
                      className="mt-1 block w-full"
                      value={priceRange}
                      onChange={handlePriceChange}
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>₹0</span>
                      <span>₹500</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Course Grid */}
            <div className="mt-6">
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                </div>
              ) : filteredCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCourses.map((course) => (
                    <div key={course._id} className="bg-white shadow overflow-hidden rounded-lg hover:shadow-lg transition-shadow">
                      <div className="bg-indigo-100 px-4 py-5 sm:px-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">{course.name}</h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">{course.category}</p>
                      </div>
                      <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                        <p className="text-sm text-gray-500 mb-4 line-clamp-3">
                          {course.description}
                        </p>
                        <div className="mt-4 flex flex-col space-y-2">
                          <div className="flex items-center text-sm text-gray-500">
                            <FaChalkboardTeacher className="mr-1.5 h-4 w-4 text-gray-400" />
                            {course.instructor ? course.instructor.name : 'Unknown Instructor'}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <FaClock className="mr-1.5 h-4 w-4 text-gray-400" />
                            {course.duration} hours
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <FaMoneyBillWave className="mr-1.5 h-4 w-4 text-gray-400" />
                            ₹{course.price.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 px-4 py-4 sm:px-6">
                        <button
                          onClick={() => navigate(`/course/${course._id}`)}
                          className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-lg shadow">
                  <FaSearch className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No courses found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Try adjusting your search or filter criteria.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ExploreSkills; 