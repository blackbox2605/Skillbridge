import { Link } from 'react-router-dom';
import { FaUserGraduate, FaBookOpen, FaUsers, FaLaptopCode } from 'react-icons/fa';

const Home = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 md:pr-8">
              <h1 className="text-4xl md:text-5xl font-extrabold mb-6">
                Share & Learn Skills with SkillBridge
              </h1>
              <p className="text-xl mb-8">
                A platform that connects students with instructors in a community of learning and skill-sharing.
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Link
                  to="/register"
                  className="px-8 py-4 bg-white text-indigo-700 rounded-md font-bold text-center hover:bg-gray-100 transition duration-200"
                >
                  Get Started
                </Link>
                <Link
                  to="/login"
                  className="px-8 py-4 bg-transparent border-2 border-white rounded-md font-bold text-center hover:bg-indigo-600 transition duration-200"
                >
                  Sign In
                </Link>
              </div>
            </div>
            <div className="md:w-1/2 mt-8 md:mt-0">
              <div className="bg-indigo-800 p-8 rounded-lg shadow-xl">
                <FaUserGraduate className="h-16 w-16 mb-4 text-indigo-300" />
                <h2 className="text-2xl font-bold mb-2">Start your journey today</h2>
                <p className="text-indigo-200">
                  Whether you want to learn or teach, SkillBridge provides the tools and community to help you succeed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              How SkillBridge Works
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Our platform makes it easy to connect, learn, and grow
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 border border-gray-200 rounded-lg text-center">
              <div className="h-12 w-12 mx-auto mb-4 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-full">
                <FaUsers className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                Connect
              </h3>
              <p className="text-gray-600">
                Join our community of learners and instructors to find the perfect skill-sharing match.
              </p>
            </div>

            <div className="p-6 border border-gray-200 rounded-lg text-center">
              <div className="h-12 w-12 mx-auto mb-4 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-full">
                <FaBookOpen className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                Learn
              </h3>
              <p className="text-gray-600">
                Access a wide range of skills taught by experienced instructors passionate about sharing knowledge.
              </p>
            </div>

            <div className="p-6 border border-gray-200 rounded-lg text-center">
              <div className="h-12 w-12 mx-auto mb-4 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-full">
                <FaLaptopCode className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                Grow
              </h3>
              <p className="text-gray-600">
                Track your progress, build your portfolio, and advance your skills to reach new heights.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-indigo-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-indigo-700 rounded-lg shadow-xl overflow-hidden">
            <div className="px-6 py-12 md:py-16 md:px-12 text-center">
              <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                Ready to start your journey?
              </h2>
              <p className="mt-4 text-lg text-indigo-100">
                Join SkillBridge today and discover the power of knowledge sharing.
              </p>
              <div className="mt-8 flex justify-center">
                <Link
                  to="/register"
                  className="px-8 py-3 bg-white text-indigo-700 rounded-md font-medium hover:bg-gray-100 transition duration-200"
                >
                  Sign Up Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <FaUserGraduate className="h-8 w-8 text-indigo-400 mr-2" />
              <span className="text-xl font-bold">SkillBridge</span>
            </div>
            <div className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} SkillBridge. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home; 