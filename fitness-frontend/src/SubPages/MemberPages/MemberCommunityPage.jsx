// src/SubPages/MemberPages/MemberCommunityPage.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

function MemberCommunityPage() {
  const [posts, setPosts] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [activeTab, setActiveTab] = useState('feed');
  const [error, setError] = useState(null);

  const memberName = localStorage.getItem('name') || 'Member';
  const memberID = localStorage.getItem('memberID');
  const token = localStorage.getItem('token');

  useEffect(() => {
    // Fetch community data
    const fetchCommunityData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const config = {
          headers: { 
            'Authorization': `Bearer ${token}`
          }
        };

        const announcementsResponse = await axios.get('fitness-frontend-0ri3.onrender.com/api/community/announcements/', config);
        setAnnouncements(announcementsResponse.data);

        const challengesResponse = await axios.get('fitness-frontend-0ri3.onrender.com/api/community/challenges/', config);
        setChallenges(challengesResponse.data);

        const postsResponse = await axios.get('fitness-frontend-0ri3.onrender.com/api/community/posts/', config);
        setPosts(postsResponse.data);

        setError(null);
      } catch (err) {
        setError('Failed to load community content. Please try again later.');
      }
      setLoading(false);
    };

    fetchCommunityData();
  }, [token]);

  const handlePostSubmit = async (e) => {
    e.preventDefault();

    if (!newPost.title.trim() || !newPost.content.trim()) {
      alert('Please fill in both title and content');
      return;
    }

    try {
      if (!memberID) {
        alert('Member ID not found. Please login again.');
        return;
      }

      // Submit new post to API
      const response = await axios.post('fitness-frontend-0ri3.onrender.com/api/community/posts/create/', {
        title: newPost.title,
        content: newPost.content,
        memberID: memberID
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Add the new post to the state (with data from API response)
      setPosts([response.data, ...posts]);
      setNewPost({ title: '', content: '' });
      alert('Post created successfully!');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to create post';
      alert(`Failed to create post: ${errorMsg}. Please try again.`);
    }
  };

  const handleLike = async (postId) => {
    try {
      // Send like to API
      await axios.post(`fitness-frontend-0ri3.onrender.com/api/community/posts/${postId}/like/`, {
        memberID
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Update like count in UI
      setPosts(posts.map(post => 
        post.id === postId ? { ...post, likes: post.likes + 1 } : post
      ));
    } catch (err) {
      alert('Failed to like post. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const joinChallenge = async (challengeId) => {
    try {
      // Send join request to API
      await axios.post(`fitness-frontend-0ri3.onrender.com/api/community/challenges/${challengeId}/join/`, {
        memberID
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Update participant count in UI
      setChallenges(challenges.map(challenge => 
        challenge.id === challengeId ? { ...challenge, participants: challenge.participants + 1 } : challenge
      ));

      alert('You have joined the challenge!');
    } catch (err) {
      alert('Failed to join challenge. Please try again.');
    }
  };

  if (loading) {
    return (
      <motion.div
        className="flex items-center justify-center min-h-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="text-center p-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-red-500 mb-4">{error}</div>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="container mx-auto p-4 max-w-6xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Fitness Community</h1>
        <p className="text-gray-600">Connect with fellow gym members and stay updated with gym news.</p>
      </motion.div>
      
      {/* Tabs */}
      <motion.div
        className="border-b border-gray-200 mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('feed')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'feed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Community Feed
          </button>
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
        </nav>
      </motion.div>
      
      {/* Content based on active tab */}
      <AnimatePresence mode="wait">
        {activeTab === 'feed' && (
          <motion.div
            key="feed"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
          >
            {/* New Post Form */}
            <motion.div
              className="bg-white rounded-lg shadow-md p-6 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-lg font-semibold mb-4">Share with the community</h2>
              <form onSubmit={handlePostSubmit}>
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Title"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  />
                </div>
                <div className="mb-4">
                  <textarea
                    placeholder="Share your fitness journey, ask questions, or post updates..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="4"
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  ></textarea>
                </div>
                <div className="text-right">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Post
                  </button>
                </div>
              </form>
            </motion.div>
            
            {/* Posts */}
            <div className="space-y-6">
              <AnimatePresence>
                {posts.length > 0 ? (
                  posts.map((post, idx) => (
                    <motion.div
                      key={post.id}
                      className="bg-white rounded-lg shadow-md p-6"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -30 }}
                      transition={{ delay: 0.05 * idx }}
                    >
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full flex items-center justify-center font-bold text-white">
                          {post.author.charAt(0)}
                        </div>
                        <div className="ml-3">
                          <h3 className="font-medium">{post.author}</h3>
                          <p className="text-xs text-gray-500">{formatDate(post.date_created)}</p>
                        </div>
                        {post.isCoach && (
                          <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Coach</span>
                        )}
                      </div>
                      
                      <h2 className="text-lg font-semibold mb-2">{post.title}</h2>
                      <p className="text-gray-700 mb-4">{post.content}</p>
                      
                      <div className="flex items-center text-sm text-gray-500">
                        <button 
                          onClick={() => handleLike(post.id)}
                          className="flex items-center hover:text-blue-500"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                          </svg>
                          {post.likes} Likes
                        </button>
                        <span className="mx-4">•</span>
                        <span className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
                          </svg>
                          {post.comments || 0} Comments
                        </span>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <motion.div
                    className="text-center p-10 bg-white rounded-lg shadow"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                  >
                    <p className="text-gray-500">No posts yet. Be the first to share with the community!</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {activeTab === 'announcements' && (
          <motion.div
            key="announcements"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <AnimatePresence>
              {announcements.length > 0 ? (
                announcements.map((announcement, idx) => (
                  <motion.div
                    key={announcement.id}
                    className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ delay: 0.05 * idx }}
                  >
                    <div className="flex justify-between items-start">
                      <h2 className="text-xl font-semibold mb-2">{announcement.title}</h2>
                      <span className="text-sm text-gray-500">{formatDate(announcement.date_created)}</span>
                    </div>
                    <p className="text-gray-700">{announcement.content}</p>
                  </motion.div>
                ))
              ) : (
                <motion.div
                  className="text-center p-10 bg-white rounded-lg shadow"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                >
                  <p className="text-gray-500">No announcements at this time.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {activeTab === 'challenges' && (
          <motion.div
            key="challenges"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <AnimatePresence>
              {challenges.length > 0 ? (
                challenges.map((challenge, idx) => (
                  <motion.div
                    key={challenge.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ delay: 0.05 * idx }}
                  >
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4">
                      <h2 className="text-xl font-bold text-white">{challenge.title}</h2>
                    </div>
                    <div className="p-6">
                      <p className="text-gray-700 mb-4">{challenge.description}</p>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">
                          <strong>{challenge.participants}</strong> participants
                        </span>
                        <span className="text-gray-500">
                          Ends: {formatDate(challenge.endDate)}
                        </span>
                      </div>
                      <button
                        onClick={() => joinChallenge(challenge.id)}
                        className="mt-4 w-full py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity"
                      >
                        Join Challenge
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <motion.div
                  className="text-center p-10 bg-white rounded-lg shadow md:col-span-2"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                >
                  <p className="text-gray-500">No challenges available at this time.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default MemberCommunityPage;
