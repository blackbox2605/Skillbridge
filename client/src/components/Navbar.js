import { useNavigate } from 'react-router-dom';
import { FaUserGraduate, FaArrowLeft, FaSignOutAlt } from 'react-icons/fa';

const Navbar = ({ showBackButton = false, backUrl = '/dashboard', showLogout = false, onLogout, userName = null }) => {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate('/dashboard');
  };

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div 
            className="flex items-center cursor-pointer" 
            onClick={handleLogoClick}
            aria-label="Go to dashboard"
          >
            <FaUserGraduate className="h-8 w-8 text-indigo-600" />
            <span className="ml-2 text-xl font-bold text-gray-900">SkillBridge</span>
          </div>
          <div className="flex items-center space-x-4">
            {userName && (
              <span className="text-gray-700">
                Welcome, {userName}
              </span>
            )}
            {showBackButton && (
              <button
                onClick={() => navigate(backUrl)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <FaArrowLeft className="mr-2" />
                Back
              </button>
            )}
            {showLogout && (
              <button
                onClick={onLogout}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <FaSignOutAlt className="mr-2" />
                Logout
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 