import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Config';
import ConfirmModal from './ui/ConfirmModal';

const CheckInPhotoReview = () => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, photoId: null, memberName: '' });

  useEffect(() => {
    fetchPhotos();
  }, [days]);

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}checkin_photos/?days=${days}`);
      const data = await response.json();
      
      if (response.ok) {
        setPhotos(data.photos || []);
      } else {
        console.error('Failed to fetch photos:', data.error);
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const showDeleteModal = (photoId, memberName) => {
    setDeleteModal({ isOpen: true, photoId, memberName });
  };

  const deletePhoto = async () => {
    const { photoId } = deleteModal;
    setDeleteModal({ isOpen: false, photoId: null, memberName: '' });
    
    setDeleting(photoId);
    try {
      const response = await fetch(`${API_BASE_URL}checkin_photos/${photoId}/delete/`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setPhotos(photos.filter(p => p.id !== photoId));
      } else {
        console.error('Failed to delete photo');
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-gray-400">Loading photos...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-white">Check-in Photo Review</h3>
        <div className="flex items-center gap-4">
          <label className="text-gray-300">Last:</label>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="bg-gray-700 text-white px-3 py-1 rounded border border-gray-600"
          >
            <option value={1}>1 day</option>
            <option value={3}>3 days</option>
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
          </select>
        </div>
      </div>
      
      <div className="mb-6 p-3 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
        <p className="text-yellow-300 text-sm">
          📝 <strong>Note:</strong> Check-in images are automatically deleted after 24 hours for privacy and storage management.
        </p>
      </div>

      {photos.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          No check-in photos found for the selected period
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className={`bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-yellow-500 transition-colors cursor-pointer ${deleting === photo.id ? 'opacity-50' : ''}`}
              onClick={() => setSelectedPhoto(photo)}
            >
              <div className="aspect-video bg-gray-600 rounded mb-3 overflow-hidden relative group">
                {photo.photo_url ? (
                  <img
                    src={`http://127.0.0.1:8000${photo.photo_url}`}
                    alt={`Check-in photo for ${photo.member_name}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.log('Image load error:', photo.photo_url);
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className="w-full h-full flex items-center justify-center text-gray-400" style={{display: photo.photo_url ? 'none' : 'flex'}}>
                  {photo.photo_url ? 'Image failed to load' : 'No photo'}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    showDeleteModal(photo.id, photo.member_name);
                  }}
                  className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete photo"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-1">
                <div className="font-medium text-white">{photo.member_name}</div>
                <div className="text-sm text-gray-300">ID: {photo.member_id}</div>
                <div className="text-sm text-gray-300">
                  {formatDate(photo.date)} at {formatTime(photo.check_in_time)}
                </div>
                <div className="text-xs text-yellow-400">{photo.verification_method}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-xl font-semibold text-white">Check-in Details</h4>
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="aspect-video bg-gray-700 rounded overflow-hidden">
                  {selectedPhoto.photo_url ? (
                    <img
                      src={`http://127.0.0.1:8000${selectedPhoto.photo_url}`}
                      alt={`Check-in photo for ${selectedPhoto.member_name}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No photo available
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Member:</span>
                    <div className="text-white font-medium">{selectedPhoto.member_name}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">ID:</span>
                    <div className="text-white">{selectedPhoto.member_id}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Date:</span>
                    <div className="text-white">{formatDate(selectedPhoto.date)}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Time:</span>
                    <div className="text-white">{formatTime(selectedPhoto.check_in_time)}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Method:</span>
                    <div className="text-yellow-400">{selectedPhoto.verification_method}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Photo Taken:</span>
                    <div className="text-white">{formatTime(selectedPhoto.created_at)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, photoId: null, memberName: '' })}
        onConfirm={deletePhoto}
        title="Delete Check-in Photo"
        message={`Are you sure you want to delete the check-in photo for ${deleteModal.memberName}? This action cannot be undone.`}
      />
    </div>
  );
};

export default CheckInPhotoReview;