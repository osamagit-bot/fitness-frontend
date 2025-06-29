import { useEffect, useState } from 'react';
import api from '../../utils/api';

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
      alert('Please fill in both title and content');
      return;
    }

    try {
      const response = await api.post('admin-community/create_announcement/', newAnnouncement);

      setAnnouncements([response.data, ...announcements]);
      setNewAnnouncement({ title: '', content: '' });
      alert('Announcement created successfully!');
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to create announcement.';
      alert(errorMsg);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await api.delete(`admin-community/${id}/delete_announcement/`);
      setAnnouncements(announcements.filter(a => a.id !== id));
    } catch (err) {
      alert('Failed to delete announcement.');
    }
  };

  const handleCreateChallenge = async (e) => {
    e.preventDefault();
    if (!newChallenge.title || !newChallenge.description || !newChallenge.startDate || !newChallenge.endDate) {
      alert('Please fill in all challenge fields');
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
      alert('Challenge created successfully!');
    } catch (err) {
      console.error('Challenge creation error:', err.response?.data);
      const errorMsg = err.response?.data?.detail || 'Failed to create challenge.';
      alert(errorMsg);
    }
  };

  const handleDeleteChallenge = async (id) => {
    if (!window.confirm('Are you sure you want to delete this challenge?')) return;
    try {
      await api.delete(`admin-community/${id}/delete_challenge/`);
      setChallenges(challenges.filter(c => c.id !== id));
    } catch (err) {
      alert('Failed to delete challenge.');
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Community Management</h1>
        <p className="text-gray-600">Create and manage community content for members.</p>
        {error && <p className="mt-2 text-red-500">{error}</p>}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {['announcements', 'challenges', 'posts'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Create New Announcement</h2>
            <form onSubmit={handleCreateAnnouncement}>
              <input
                type="text"
                placeholder="Title"
                className="w-full mb-4 p-2 border rounded"
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
              />
              <textarea
                placeholder="Content"
                className="w-full mb-4 p-2 border rounded"
                value={newAnnouncement.content}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
              />
              <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                Post Announcement
              </button>
            </form>
          </div>

          <div className="space-y-4">
            {loading ? (
              <p>Loading...</p>
            ) : announcements.length > 0 ? (
              announcements.map((announcement) => (
                <div key={announcement.id} className="p-4 bg-white rounded shadow relative">
                  <h3 className="text-xl font-bold">{announcement.title}</h3>
                  <p>{announcement.content}</p>
                  <p className="text-sm text-gray-500">
                    Posted on {new Date(announcement.date_created).toLocaleDateString()}
                  </p>
                  <button
                    onClick={() => handleDeleteAnnouncement(announcement.id)}
                    className="absolute top-2 right-2 text-red-500 hover:underline text-sm"
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
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Create New Challenge</h2>
            <form onSubmit={handleCreateChallenge}>
              <input
                type="text"
                placeholder="Title"
                className="w-full mb-4 p-2 border rounded"
                value={newChallenge.title}
                onChange={(e) => setNewChallenge({ ...newChallenge, title: e.target.value })}
              />
              <textarea
                placeholder="Description"
                className="w-full mb-4 p-2 border rounded"
                value={newChallenge.description}
                onChange={(e) => setNewChallenge({ ...newChallenge, description: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4 mb-4">
                <input
                  type="date"
                  className="p-2 border rounded"
                  value={newChallenge.startDate}
                  onChange={(e) => setNewChallenge({ ...newChallenge, startDate: e.target.value })}
                />
                <input
                  type="date"
                  className="p-2 border rounded"
                  value={newChallenge.endDate}
                  onChange={(e) => setNewChallenge({ ...newChallenge, endDate: e.target.value })}
                />
              </div>
              <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                Create Challenge
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <p>Loading...</p>
            ) : challenges.length > 0 ? (
              challenges.map((challenge) => (
                <div key={challenge.id} className="bg-white rounded shadow p-4 relative">
                  <h3 className="text-xl font-bold">{challenge.title}</h3>
                  <p>{challenge.description}</p>
                  <p className="text-sm text-gray-500">
                    Ends: {new Date(challenge.end_date).toLocaleDateString()}
                  </p>
                  <button
                    onClick={() => handleDeleteChallenge(challenge.id)}
                    className="absolute top-2 right-2 text-red-500 hover:underline text-sm"
                  >
                    Delete
                  </button>
                </div>
              ))
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
              <div key={post.id} className="p-4 bg-white rounded shadow">
                <h3 className="font-bold">{post.title}</h3>
                <p>{post.content}</p>
                <p className="text-sm text-gray-500">
                  Posted by {post.author || 'Unknown'} on{' '}
                  {new Date(post.date_created).toLocaleDateString()}
                </p>
              </div>
            ))
          ) : (
            <p>No member posts yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
 export default AdminCommunityManagement;
 
