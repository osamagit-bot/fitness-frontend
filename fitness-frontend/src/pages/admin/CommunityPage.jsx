import { useEffect, useState } from 'react';
import AppToastContainer from "../../components/ui/ToastContainer";
import api from "../../utils/api";
import { formatDate, formatDateTime, getDateFromObject } from "../../utils/dateUtils";
import { showToast } from "../../utils/toast";

function AdminCommunityManagement() {
  const [posts, setPosts] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [activeTab, setActiveTab] = useState('announcements');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' });
  const [newChallenge, setNewChallenge] = useState({ title: '', description: '', startDate: '', endDate: '' });

  const fetchCommunityData = async () => {
    setLoading(true);
    try {
      try {
        const announcementsResponse = await api.get('admin-community/announcements/');
        setAnnouncements(announcementsResponse.data);
      } catch (err) {
        console.error('Announcements API failed:', err);
      }
      try {
        const challengesResponse = await api.get('admin-community/challenges/');
        setChallenges(challengesResponse.data);
      } catch (err) {
        console.log('Challenges API not available:', err);
      }

      try {
        const postsResponse = await api.get('admin-community/community_posts/');
        setPosts(postsResponse.data);
      } catch (err) {
        console.log('Community posts API not available:', err);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Some community management features are currently unavailable.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunityData();
  }, []);

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      showToast.warn('Please fill in both title and content');
      return;
    }

    try {
      const response = await api.post('admin-community/create_announcement/', newAnnouncement);

      setAnnouncements([response.data, ...announcements]);
      setNewAnnouncement({ title: '', content: '' });
      showToast.success('Announcement created successfully!');
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to create announcement.';
      showToast.error(errorMsg);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await api.delete(`admin-community/${id}/delete_announcement/`);
      setAnnouncements(announcements.filter(a => a.id !== id));
    } catch (err) {
      showToast.error('Failed to delete announcement.');
    }
  };

  const handleCreateChallenge = async (e) => {
    e.preventDefault();
    if (!newChallenge.title || !newChallenge.description || !newChallenge.startDate || !newChallenge.endDate) {
      showToast.warn('Please fill in all challenge fields');
      return;
    }

    const payload = {
      title: newChallenge.title,
      description: newChallenge.description,
      start_date: newChallenge.startDate,
      end_date: newChallenge.endDate,
    };

    try {
      const response = await api.post('admin-community/create_challenge/', payload);

      setChallenges([response.data, ...challenges]);
      setNewChallenge({ title: '', description: '', startDate: '', endDate: '' });
      showToast.success('Challenge created successfully!');
    } catch (err) {
      console.error('Challenge creation error:', err.response?.data);
      const errorMsg = err.response?.data?.detail || 'Failed to create challenge.';
      showToast.error(errorMsg);
    }
  };

  const handleDeleteChallenge = async (id) => {
    if (!window.confirm('Are you sure you want to delete this challenge?')) return;
    try {
      await api.delete(`admin-community/${id}/delete_challenge/`);
      setChallenges(challenges.filter(c => c.id !== id));
    } catch (err) {
      showToast.error('Failed to delete challenge.');
    }
  };

  return (
    <>
      <div className="container mx-auto p-2 sm:p-4 max-w-6xl">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Community Management</h1>
        <p className="text-gray-300 text-sm sm:text-base">Create and manage community content for members.</p>
        {error && <p className="mt-2 text-red-500 text-sm">{error}</p>}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4 sm:mb-6">
        <nav className="flex space-x-4 sm:space-x-8 overflow-x-auto">
          {['announcements', 'challenges', 'posts'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === tab
                  ? 'border-yellow-500 text-yellow-500'
                  : 'border-transparent text-gray-300 hover:text-white hover:border-gray-500'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Announcements Tab */}
      {activeTab === 'announcements' && (
        <div>
          <div className="bg-gray-700 rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Create New Announcement</h2>
            <form onSubmit={handleCreateAnnouncement}>
              <input
                type="text"
                placeholder="Title"
                className="w-full mb-3 sm:mb-4 p-2 sm:p-3 border border-gray-600 rounded bg-gray-800 text-white placeholder-gray-400 text-sm sm:text-base"
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
              />
              <textarea
                placeholder="Content"
                rows="3"
                className="w-full mb-3 sm:mb-4 p-2 sm:p-3 border border-gray-600 rounded bg-gray-800 text-white placeholder-gray-400 text-sm sm:text-base"
                value={newAnnouncement.content}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
              />
              <button type="submit" className="w-full sm:w-auto bg-gradient-to-r from-yellow-500 to-yellow-600 text-black px-4 py-2 rounded hover:from-yellow-600 hover:to-yellow-700 transition-all duration-300 text-sm sm:text-base font-medium">
                Post Announcement
              </button>
            </form>
          </div>

          <div className="space-y-4">
            {loading ? (
              <p>Loading...</p>
            ) : announcements.length > 0 ? (
              announcements.map((announcement) => (
                <div key={announcement.id} className="p-3 sm:p-4 bg-gray-700 rounded shadow relative">
                  <h3 className="text-lg sm:text-xl font-bold text-white pr-12">{announcement.title}</h3>
                  <p className="text-gray-300 text-sm sm:text-base mt-2">{announcement.content}</p>
                  <p className="text-xs sm:text-sm text-gray-400 mt-2">
                    Posted on {formatDate(getDateFromObject(announcement))}
                  </p>
                  <button
                    onClick={() => handleDeleteAnnouncement(announcement.id)}
                    className="absolute top-2 right-2 text-red-500 hover:underline text-xs sm:text-sm"
                  >
                    Delete
                  </button>
                </div>
              ))
            ) : (
              <p>No announcements available.</p>
            )}
          </div>
        </div>
      )}

      {/* Challenges Tab */}
      {activeTab === 'challenges' && (
        <div>
          <div className="bg-gray-700 rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Create New Challenge</h2>
            <form onSubmit={handleCreateChallenge}>
              <input
                type="text"
                placeholder="Title"
                className="w-full mb-3 sm:mb-4 p-2 sm:p-3 border border-gray-600 rounded bg-gray-800 text-white placeholder-gray-400 text-sm sm:text-base"
                value={newChallenge.title}
                onChange={(e) => setNewChallenge({ ...newChallenge, title: e.target.value })}
              />
              <textarea
                placeholder="Description"
                rows="3"
                className="w-full mb-3 sm:mb-4 p-2 sm:p-3 border border-gray-600 rounded bg-gray-800 text-white placeholder-gray-400 text-sm sm:text-base"
                value={newChallenge.description}
                onChange={(e) => setNewChallenge({ ...newChallenge, description: e.target.value })}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1 sm:hidden">Start Date</label>
                  <input
                    type="date"
                    className="w-full p-2 sm:p-3 border border-gray-600 rounded bg-gray-800 text-white text-sm sm:text-base"
                    value={newChallenge.startDate}
                    onChange={(e) => setNewChallenge({ ...newChallenge, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1 sm:hidden">End Date</label>
                  <input
                    type="date"
                    className="w-full p-2 sm:p-3 border border-gray-600 rounded bg-gray-800 text-white text-sm sm:text-base"
                    value={newChallenge.endDate}
                    onChange={(e) => setNewChallenge({ ...newChallenge, endDate: e.target.value })}
                  />
                </div>
              </div>
              <button type="submit" className="w-full sm:w-auto bg-gradient-to-r from-yellow-500 to-yellow-600 text-black px-4 py-2 rounded hover:from-yellow-600 hover:to-yellow-700 transition-all duration-300 text-sm sm:text-base font-medium">
                Create Challenge
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {loading ? (
              <p>Loading...</p>
            ) : challenges.length > 0 ? (
              challenges.map((challenge) => {
                console.log('Challenge data:', challenge); // Debug log
                return (
                <div key={challenge.id} className="bg-gray-700 rounded shadow p-3 sm:p-4 relative">
                  <h3 className="text-lg sm:text-xl font-bold text-white pr-12">{challenge.title}</h3>
                  <p className="mb-2 text-gray-300 text-sm sm:text-base">{challenge.description}</p>
                  <div className="text-xs sm:text-sm text-gray-400 space-y-1">
                    <p>Participants: {challenge.participants || 0}</p>
                    <p>Ends: {challenge.end_date ? new Date(challenge.end_date).toLocaleDateString() : 'No end date'}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteChallenge(challenge.id)}
                    className="absolute top-2 right-2 text-red-500 hover:underline text-xs sm:text-sm"
                  >
                    Delete
                  </button>
                </div>
              );
              })
            ) : (
              <p>No challenges available.</p>
            )}
          </div>
        </div>
      )}

      {/* Posts Tab */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          {loading ? (
            <p>Loading...</p>
          ) : posts.length > 0 ? (
            posts.map((post) => (
              <div key={post.id} className="p-3 sm:p-4 bg-gray-700 rounded shadow border border-gray-600">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-base sm:text-lg text-white">{post.title}</h3>
                    <p className="text-gray-300 mt-2 text-sm sm:text-base">{post.content}</p>
                  </div>
                </div>
                
                <div className="border-t pt-3 mt-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 text-xs sm:text-sm text-gray-400">
                    <p>
                      Posted by <span className="font-medium">{post.author || 'Unknown'}</span> on{' '}
                      {formatDate(getDateFromObject(post))}
                    </p>
                    <div className="flex items-center gap-3 sm:gap-4">
                      <span className="flex items-center gap-1">
                        👍 {post.likes || 0} likes
                      </span>
                      <span className="flex items-center gap-1">
                        💬 {post.comments || 0} comments
                      </span>
                    </div>
                  </div>
                </div>

                {/* Comments Section */}
                {post.comments_list && post.comments_list.length > 0 && (
                  <div className="mt-3 sm:mt-4 border-t pt-3 sm:pt-4">
                    <h4 className="font-semibold text-white mb-2 sm:mb-3 text-sm sm:text-base">Comments:</h4>
                    <div className="space-y-2 sm:space-y-3">
                      {post.comments_list.map((comment, index) => (
                        <div key={index} className="bg-gray-600 p-2 sm:p-3 rounded-lg border border-gray-500">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-1 sm:mb-2 gap-1 sm:gap-0">
                            <span className="font-medium text-xs sm:text-sm text-white">
                              {comment.author || 'Unknown'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatDateTime(getDateFromObject(comment))}
                            </span>
                          </div>
                          <p className="text-gray-300 text-xs sm:text-sm">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className='text-gray-300'>No member posts yet.</p>
          )}
        </div>
      )}
      </div>
      <AppToastContainer />
    </>
  );
}
 export default AdminCommunityManagement;
 
