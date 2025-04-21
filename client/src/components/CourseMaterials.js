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
  const [localMaterials, setLocalMaterials] = useState([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(true);
  const [materialsError, setMaterialsError] = useState(null);
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const materialsLoaded = useRef(false);
  
  // Fetch materials when component mounts
  useEffect(() => {
    // Only fetch materials once
    if (materialsLoaded.current) return;
    
    const fetchMaterials = async () => {
      setIsLoadingMaterials(true);
      setMaterialsError(null);
      
      try {
        const fetchedMaterials = await getCourseMaterials(courseId);
        if (fetchedMaterials) {
          setLocalMaterials(fetchedMaterials);
          materialsLoaded.current = true;
        }
      } catch (error) {
        console.error('Error fetching materials:', error);
        setMaterialsError('Failed to load course materials');
      } finally {
        setIsLoadingMaterials(false);
      }
    };
    
    fetchMaterials();
    // Remove getCourseMaterials from dependencies to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);
  
  // Update local materials when the context materials change
  useEffect(() => {
    if (materials && materials.length > 0) {
      setLocalMaterials(materials);
    }
  }, [materials]);
  
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
      
      const newMaterial = await uploadMaterial(courseId, uploadFormData);
      
      // Update local materials
      if (newMaterial) {
        setLocalMaterials(prevMaterials => [newMaterial, ...prevMaterials]);
      }
      
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
        // Update local materials state
        setLocalMaterials(prevMaterials => 
          prevMaterials.filter(material => material._id !== materialId)
        );
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
      {materialsError ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-md">
          {materialsError}
        </div>
      ) : isLoadingMaterials ? (
        <div className="bg-white p-4 text-center">
          <p className="text-gray-600">Loading materials...</p>
        </div>
      ) : localMaterials.length === 0 ? (
        <div className="bg-gray-50 p-8 text-center rounded-lg">
          <FaFile className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No materials yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            {isInstructor 
              ? 'Get started by uploading study materials for your students.' 
              : 'No study materials have been uploaded yet.'}
          </p>
          {isInstructor && (
            <div className="mt-6">
              <button
                onClick={() => setShowUploadForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <FaPlus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                Upload Material
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">File</th>
                <th scope="col" className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 sm:table-cell">Description</th>
                <th scope="col" className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 sm:table-cell">Size</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {localMaterials.map((material) => (
                <tr key={material._id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center">
                        {getFileIcon(material.fileType)}
                      </div>
                      <div className="ml-4">
                        <div className="font-medium text-gray-900">{material.title}</div>
                        <div className="text-gray-500">{material.filename}</div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-4 text-sm text-gray-500 sm:table-cell">
                    {material.description || 'No description provided'}
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-4 text-sm text-gray-500 sm:table-cell">
                    {formatFileSize(material.fileSize)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDownload(material._id, material.filename)}
                        disabled={downloadingId === material._id}
                        className="text-indigo-600 hover:text-indigo-900 flex items-center disabled:opacity-50"
                      >
                        <FaDownload className="mr-1" />
                        {downloadingId === material._id ? 'Downloading...' : 'Download'}
                      </button>
                      {isInstructor && (
                        <button
                          onClick={() => handleDelete(material._id)}
                          className="text-red-600 hover:text-red-900 flex items-center"
                        >
                          <FaTrash className="mr-1" />
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CourseMaterials; 