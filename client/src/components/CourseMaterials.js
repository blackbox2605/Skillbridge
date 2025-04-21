import { useState, useEffect, useRef } from 'react';
import { useCourses } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { FaFile, FaFileAlt, FaFilePdf, FaFileImage, FaFileCsv, FaFileExcel, FaFileWord, FaFileCode, FaDownload, FaTrash, FaPlus } from 'react-icons/fa';

const CourseMaterials = ({ courseId, isInstructor }) => {
  const { getCourseMaterials, uploadMaterial, deleteMaterial, downloadMaterial, materials, isLoading } = useCourses();
  const { currentUser } = useAuth();
  
  const [downloadingId, setDownloadingId] = useState(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Fetch materials when component mounts
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        await getCourseMaterials(courseId);
      } catch (error) {
        console.error('Error fetching materials:', error);
      }
    };
    
    fetchMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle file selection
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };
  
  // Handle upload form submission
  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setUploadError('Please select a file to upload');
      return;
    }
    
    try {
      setSubmitting(true);
      setUploadError(null);
      
      const uploadFormData = new FormData();
      uploadFormData.append('title', formData.title);
      uploadFormData.append('description', formData.description);
      uploadFormData.append('file', selectedFile);
      
      await uploadMaterial(courseId, uploadFormData);
      
      // Reset form
      setFormData({ title: '', description: '' });
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setUploadSuccess(true);
      setShowUploadForm(false);
      setSubmitting(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setUploadSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error uploading material:', error);
      setUploadError(error.message || 'Failed to upload material');
      setSubmitting(false);
    }
  };
  
  // Handle download
  const handleDownload = async (materialId, fileName) => {
    setDownloadingId(materialId);
    try {
      await downloadMaterial(courseId, materialId, fileName);
    } catch (error) {
      console.error('Error downloading material:', error);
    } finally {
      setDownloadingId(null);
    }
  };
  
  // Handle material deletion
  const handleDelete = async (materialId) => {
    if (window.confirm('Are you sure you want to delete this material?')) {
      try {
        await deleteMaterial(courseId, materialId);
      } catch (error) {
        console.error('Error deleting material:', error);
      }
    }
  };
  
  // Get appropriate icon based on file type
  const getFileIcon = (fileType) => {
    if (fileType.includes('pdf')) {
      return <FaFilePdf className="text-red-500" />;
    } else if (fileType.includes('image')) {
      return <FaFileImage className="text-green-500" />;
    } else if (fileType.includes('csv')) {
      return <FaFileCsv className="text-green-700" />;
    } else if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
      return <FaFileExcel className="text-green-600" />;
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return <FaFileWord className="text-blue-600" />;
    } else if (fileType.includes('text') || fileType.includes('javascript') || fileType.includes('html') || fileType.includes('css')) {
      return <FaFileCode className="text-gray-700" />;
    } else {
      return <FaFileAlt className="text-gray-500" />;
    }
  };
  
  // Convert bytes to human-readable format
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Course Materials</h2>
        {isInstructor && (
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <FaPlus className="mr-2" />
            Upload Material
          </button>
        )}
      </div>
      
      {/* Upload success message */}
      {uploadSuccess && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Material uploaded successfully!
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Upload form */}
      {showUploadForm && (
        <div className="mb-6 bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Upload Study Material</h3>
          
          {uploadError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">
                    {uploadError}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleUpload}>
            {/* Title */}
            <div className="mb-4">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title*
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            
            {/* Description */}
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            
            {/* File upload */}
            <div className="mb-4">
              <label htmlFor="file" className="block text-sm font-medium text-gray-700">
                File*
              </label>
              <input
                type="file"
                id="file"
                name="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                required
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              <p className="mt-1 text-xs text-gray-500">
                Max file size: 10MB
              </p>
            </div>
            
            {/* Submit button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowUploadForm(false)}
                className="mr-3 inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Materials list */}
      {isLoading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : materials && materials.length > 0 ? (
        <div className="space-y-4">
          {materials.map(material => (
            <div 
              key={material._id} 
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <div className="mr-4 text-xl">
                  {getFileIcon(material.fileType)}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{material.title}</h3>
                  {material.description && (
                    <p className="text-sm text-gray-500 mt-1">{material.description}</p>
                  )}
                  <div className="flex items-center mt-1 text-xs text-gray-500">
                    <span>{material.fileName}</span>
                    <span className="mx-2">•</span>
                    <span>{formatFileSize(material.fileSize)}</span>
                    <span className="mx-2">•</span>
                    <span>{new Date(material.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDownload(material._id, material.fileName)}
                  disabled={downloadingId === material._id}
                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full"
                  title="Download"
                >
                  {downloadingId === material._id ? (
                    <div className="animate-spin h-4 w-4 border-2 border-indigo-500 rounded-full border-t-transparent" />
                  ) : (
                    <FaDownload />
                  )}
                </button>
                {isInstructor && material.uploadedBy === currentUser._id && (
                  <button
                    onClick={() => handleDelete(material._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                    title="Delete"
                  >
                    <FaTrash />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-32 text-gray-500">
          <FaFile className="text-gray-300 text-4xl mb-2" />
          <p>No materials available for this course yet.</p>
          {isInstructor && (
            <button
              onClick={() => setShowUploadForm(true)}
              className="mt-2 text-indigo-600 hover:text-indigo-800"
            >
              Upload your first material
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CourseMaterials; 