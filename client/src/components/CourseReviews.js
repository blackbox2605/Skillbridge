import { useState, useEffect } from 'react';
import { FaStar, FaTrash, FaUserCircle } from 'react-icons/fa';
import { useCourses } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';

const CourseReviews = ({ courseId, isEnrolled }) => {
  const { getCourseReviews, addReview, deleteReview, getCourseAverageRating, isLoading, error } = useCourses();
  const { currentUser } = useAuth();
  
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [userReview, setUserReview] = useState(null);
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [fetchError, setFetchError] = useState('');

  // Fetch reviews and average rating
  useEffect(() => {
    const fetchReviewData = async () => {
      try {
        // Fetch all reviews
        const reviewsData = await getCourseReviews(courseId);
        setReviews(reviewsData || []);
        
        // Check if current user has a review
        if (currentUser) {
          const userReviewData = reviewsData.find(
            review => review.student._id === currentUser._id
          );
          setUserReview(userReviewData || null);
        }
        
        // Fetch average rating
        const ratingData = await getCourseAverageRating(courseId);
        setAverageRating(ratingData.averageRating || 0);
        setReviewCount(ratingData.reviewCount || 0);
        
        setFetchError('');
      } catch (error) {
        console.error('Error fetching review data:', error);
        setFetchError('Failed to load reviews. Please try again later.');
      }
    };
    
    fetchReviewData();
  }, [courseId, currentUser, getCourseReviews, getCourseAverageRating]);

  // Handle rating change
  const handleRatingChange = (rating) => {
    setNewReview({ ...newReview, rating });
  };

  // Handle comment change
  const handleCommentChange = (e) => {
    setNewReview({ ...newReview, comment: e.target.value });
  };

  // Submit review
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    if (!newReview.comment.trim()) {
      setReviewError('Please write a comment for your review');
      return;
    }
    
    try {
      setSubmitting(true);
      setReviewError('');
      
      const result = await addReview(courseId, newReview);
      
      // Update reviews list
      if (userReview) {
        // If updating an existing review
        setReviews(reviews.map(review => 
          review._id === result._id ? result : review
        ));
      } else {
        // If adding a new review
        setReviews([result, ...reviews]);
      }
      
      setUserReview(result);
      
      // Reset form
      setNewReview({
        rating: 5,
        comment: ''
      });
      
      // Refresh average rating
      const ratingData = await getCourseAverageRating(courseId);
      setAverageRating(ratingData.averageRating || 0);
      setReviewCount(ratingData.reviewCount || 0);
      
      setSubmitting(false);
    } catch (error) {
      console.error('Error submitting review:', error);
      setReviewError(error.response?.data?.message || 'Failed to submit review. Please try again.');
      setSubmitting(false);
    }
  };

  // Delete a review
  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete your review?')) {
      return;
    }
    
    try {
      await deleteReview(courseId, reviewId);
      
      // Remove review from list
      setReviews(reviews.filter(review => review._id !== reviewId));
      
      // Reset user review
      setUserReview(null);
      
      // Refresh average rating
      const ratingData = await getCourseAverageRating(courseId);
      setAverageRating(ratingData.averageRating || 0);
      setReviewCount(ratingData.reviewCount || 0);
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('Failed to delete review. Please try again.');
    }
  };

  // Render star rating
  const renderStars = (rating) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <FaStar 
            key={star} 
            className={`w-5 h-5 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`} 
          />
        ))}
      </div>
    );
  };

  // Render interactive star rating for review form
  const renderInteractiveStars = () => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <FaStar 
            key={star} 
            className={`w-6 h-6 cursor-pointer ${star <= newReview.rating ? 'text-yellow-400' : 'text-gray-300'}`}
            onClick={() => handleRatingChange(star)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="mb-8 mt-8">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Student Reviews</h2>
      
      {/* Average Rating */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <div className="flex mr-2">
            {renderStars(averageRating)}
          </div>
          <span className="text-lg font-semibold">{averageRating.toFixed(1)}</span>
          <span className="ml-2 text-sm text-gray-500">({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})</span>
        </div>
      </div>
      
      {/* Review Form - Only for enrolled students who haven't reviewed yet */}
      {currentUser && currentUser.role === 'student' && isEnrolled && (
        <div className="bg-white rounded-lg border p-4 mb-6">
          <h3 className="text-lg font-semibold mb-3">
            {userReview ? 'Update Your Review' : 'Leave a Review'}
          </h3>
          
          {reviewError && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md mb-3">
              {reviewError}
            </div>
          )}
          
          <form onSubmit={handleSubmitReview}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
              {renderInteractiveStars()}
            </div>
            
            <div className="mb-4">
              <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
                Your Review
              </label>
              <textarea
                id="comment"
                rows="4"
                value={newReview.comment}
                onChange={handleCommentChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Share your experience with this course..."
              ></textarea>
            </div>
            
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : (userReview ? 'Update Review' : 'Submit Review')}
            </button>
          </form>
        </div>
      )}
      
      {/* Reviews List */}
      {fetchError ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-md">
          {fetchError}
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review._id} className="bg-white rounded-lg border p-4">
              <div className="flex justify-between items-start">
                <div className="flex items-start">
                  <FaUserCircle className="w-10 h-10 text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium">{review.student?.name || 'Anonymous Student'}</p>
                    <div className="flex items-center mt-1">
                      {renderStars(review.rating)}
                      <span className="ml-2 text-sm text-gray-500">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Delete button - Only visible to the review author */}
                {currentUser && currentUser._id === review.student?._id && (
                  <button 
                    onClick={() => handleDeleteReview(review._id)}
                    className="text-red-500 hover:text-red-700"
                    title="Delete review"
                  >
                    <FaTrash />
                  </button>
                )}
              </div>
              
              <p className="mt-3 text-gray-700">{review.comment}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No reviews yet. Be the first to review this course!</p>
        </div>
      )}
    </div>
  );
};

export default CourseReviews; 