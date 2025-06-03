import { useState, useEffect } from 'react';
import axios from 'axios';

function AdminCommunityManagement() {
  const [posts, setPosts] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [activeTab, setActiveTab] = useState('announcements');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Form states
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' });
  const [newChallenge, setNewChallenge] = useState({ 
    title: '', 
    description: '', 
    startDate: '', 
    endDate: ''
  });
  
  const token = localStorage.getItem('token');
  
  const fetchCommunityData = async () => {
    setLoading(true);
    try {
      const config = {
        headers: { 'Authorization': `Bearer ${token}` }
      };
      
      // Try to fetch data, handle errors gracefully
      try {
        const announcementsResponse = await axios.get('http://127.0.0.1:8000/api/admin/announcements/', config);
        setAnnouncements(announcementsResponse.data);
      } catch (err) {
        console.log('Announcements API not available yet:', err);
      }
      
      try {
        const challengesResponse = await axios.get('http://127.0.0.1:8000/api/admin/challenges/', config);
        setChallenges(challengesResponse.data);
      } catch (err) {
        console.log('Challenges API not available yet:', err);
      }
      
      try {
        const postsResponse = await axios.get('http://127.0.0.1:8000/api/admin/community-posts/', config);
        setPosts(postsResponse.data);
      } catch (err) {
        console.log('Community posts API not available yet:', err);
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
      const response = await axios.post('http://127.0.0.1:8000/api/admin/announcements/create/', newAnnouncement, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setAnnouncements([response.data, ...announcements]);
      setNewAnnouncement({ title: '', content: '' });
      alert('Announcement created successfully!');
    } catch (err) {
      console.error('Error creating announcement:', err);
      alert('This feature is not fully implemented yet. Please try again later.');
    }
  };
  
  const handleCreateChallenge = async (e) => {
    e.preventDefault();
    
    if (!newChallenge.title.trim() || !newChallenge.description.trim() || 
        !newChallenge.startDate || !newChallenge.endDate) {
      alert('Please fill in all challenge fields');
      return;
    }
    
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/admin/challenges/create/', newChallenge, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setChallenges([response.data, ...challenges]);
      setNewChallenge({ title: '', description: '', startDate: '', endDate: '' });
      alert('Challenge created successfully!');
    } catch (err) {
      console.error('Error creating challenge:', err);
      alert('This feature is not fully implemented yet. Please try again later.');
    }
  };
  
  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Community Management</h1>
        <p className="text-gray-600">Create and manage community content for members.</p>
        {error && <p className="mt-2 text-amber-600">{error}</p>}
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('announcements')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'announcements'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Announcements
          </button>
          <button
            onClick={() => setActiveTab('challenges')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'challenges'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Challenges
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'posts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Member Posts
          </button>
        </nav>
      </div>
      
      {/* Content based on active tab */}
      {activeTab === 'announcements' && (
        <div>
          {/* Create Announcement Form */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Create New Announcement</h2>
            <form onSubmit={handleCreateAnnouncement}>
              <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  id="title"
                  type="text"
                  placeholder="Announcement title"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                />
              </div>
              <div className="mb-4">
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  id="content"
                  placeholder="Announcement content..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="4"
                  value={newAnnouncement.content}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                ></textarea>
              </div>
              <div className="text-right">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Post Announcement
                </button>
              </div>
            </form>
          </div>
          
          {/* Announcements List */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Current Announcements</h2>
            {loading ? (
              <div className="text-center p-4">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                <p className="mt-2 text-gray-600">Loading announcements...</p>
              </div>
            ) : announcements.length > 0 ? (
              announcements.map(announcement => (
                <div key={announcement.id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                  <h2 className="text-xl font-semibold mb-2">{announcement.title}</h2>
                  <p className="text-gray-700 mb-2">{announcement.content}</p>
                  <p className="text-sm text-gray-500">Posted on {new Date(announcement.date_created).toLocaleDateString()}</p>
                </div>
              ))
            ) : (
              <div className="text-center p-10 bg-white rounded-lg shadow">
                <p className="text-gray-500">No announcements available.</p>
                <p className="text-sm text-gray-400 mt-2">Create your first announcement above.</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {activeTab === 'challenges' && (
        <div>
          {/* Create Challenge Form */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Create New Challenge</h2>
            <form onSubmit={handleCreateChallenge}>
              <div className="mb-4">
                <label htmlFor="challenge-title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  id="challenge-title"
                  type="text"
                  placeholder="Challenge title"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newChallenge.title}
                  onChange={(e) => setNewChallenge({ ...newChallenge, title: e.target.value })}
                />
              </div>
              <div className="mb-4">
                <label htmlFor="challenge-description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  id="challenge-description"
                  placeholder="Challenge description..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="4"
                  value={newChallenge.description}
                  onChange={(e) => setNewChallenge({ ...newChallenge, description: e.target.value })}
                ></textarea>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    id="start-date"
                    type="date"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newChallenge.startDate}
                    onChange={(e) => setNewChallenge({ ...newChallenge, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    id="end-date"
                    type="date"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newChallenge.endDate}
                    onChange={(e) => setNewChallenge({ ...newChallenge, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="text-right">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Create Challenge
                </button>
              </div>
            </form>
          </div>
          
          {/* Challenges List */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Current Challenges</h2>
            {loading ? (
              <div className="text-center p-4">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                <p className="mt-2 text-gray-600">Loading challenges...</p>
              </div>
            ) : challenges.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {challenges.map(challenge => (
                  <div key={challenge.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4">
                      <h2 className="text-xl font-bold text-white">{challenge.title}</h2>
                    </div>
                    <div className="p-6">
                      <p className="text-gray-700 mb-4">{challenge.description}</p>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">
                          {challenge.participants ? 
                            <><strong>{challenge.participants}</strong> participants</> : 
                            'No participants yet'}
                        </span>
                        <span className="text-gray-500">
                          Ends: {challenge.end_date ? new Date(challenge.end_date).toLocaleDateString() : 'TBD'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-10 bg-white rounded-lg shadow">
                <p className="text-gray-500">No challenges available.</p>
                <p className="text-sm text-gray-400 mt-2">Create your first challenge above.</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {activeTab === 'posts' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Member Posts</h2>
          {loading ? (
            <div className="text-center p-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-2 text-gray-600">Loading member posts...</p>
            </div>
          ) : posts.length > 0 ? (
            <div className="space-y-6">
              {posts.map(post => (
                <div key={post.id} className={`bg-white rounded-lg shadow-md p-6 ${post.hidden ? 'opacity-50' : ''}`}>
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full flex items-center justify-center font-bold text-white">
                      {post.author ? post.author.charAt(0) : 'U'}
                    </div>
                    <div className="ml-3">
                      <h3 className="font-medium">{post.author || 'Unknown user'}</h3>
                      <p className="text-xs text-gray-500">{post.date_created ? new Date(post.date_created).toLocaleDateString() : 'Unknown date'}</p>
                    </div>
                  </div>
                  
                  <h2 className="text-lg font-semibold mb-2">{post.title || 'Untitled Post'}</h2>
                  <p className="text-gray-700 mb-4">{post.content || 'No content'}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-10 bg-white rounded-lg shadow">
              <p className="text-gray-500">No member posts available.</p>
              <p className="text-sm text-gray-400 mt-2">Members haven't posted anything yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminCommunityManagement;
