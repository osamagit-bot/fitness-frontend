import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import api from '../../utils/api';






function MemberCommunityPage() {
  const { communityId } = useParams(); 
  const [posts, setPosts] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [activeTab, setActiveTab] = useState('feed');
  const [error, setError] = useState(null);
  const [newComments, setNewComments] = useState({});
  const [editingComments, setEditingComments] = useState({}); // key: commentId, value: edit text

  const memberName = localStorage.getItem('name') || 'Member';
  const memberID = localStorage.getItem('memberId');
 
  const token = localStorage.getItem('access_token');



  useEffect(() => {
    if (!token) {
      setError('User not authenticated. Please login.');
      setLoading(false);
      return;
    }
    const fetchCommunityData = async () => {
      setLoading(true);
      try {
        const config = {
          headers: { Authorization: `Bearer ${token}` },
        };

        const [announcementsResponse, challengesResponse, postsResponse] = await Promise.all([
          api.get('community/announcements/', config),
          api.get('community/challenges/', config),
          api.get('community/posts/', config),
        ]);

        setAnnouncements(Array.isArray(announcementsResponse.data) ? announcementsResponse.data : []);
        setChallenges(Array.isArray(challengesResponse.data) ? challengesResponse.data : []);
        setPosts(
          Array.isArray(postsResponse.data)
            ? postsResponse.data.map(post => ({
                ...post,
                comments_list: post.comments_list || [], // Ensure comments array
              }))
            : []
        );

        setError(null);
      } catch (err) {
        setError('Failed to load community content. Please try again later.');
      }
      setLoading(false);
    };

    fetchCommunityData();
  }, [token]);

  const handlePostSubmit = async e => {
    e.preventDefault();

    if (!newPost.title.trim() || !newPost.content.trim()) {
      alert('Please fill in both title and content');
      return;
    }
    if (!memberID) {
      alert('Member ID not found. Please login again.');
      return;
    }

    try {
      const response = await api.post(
        'community/posts/create/',
        {
          title: newPost.title,
          content: newPost.content,
          memberID: memberID,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setPosts([{ ...response.data, comments_list: [] }, ...posts]);
      setNewPost({ title: '', content: '' });
      alert('Post created successfully!');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to create post';
      alert(`Failed to create post: ${errorMsg}. Please try again.`);
    }
  };

  const handleLike = async postId => {
    try {
      await api.post(
        `community/posts/${postId}/like/`,
        null,
        { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }
      );

      setPosts(
        posts.map(post => (post.id === postId ? { ...post, likes: (post.likes || 0) + 1 } : post))
      );
    } catch (err) {
      if (err.response && err.response.status === 400) {
        alert('You have already liked this post.');
      } else {
        alert('Failed to like post. Please try again.');
      }
    }
  };
  

  const joinChallenge = async (challengeId) => {
    if (!communityId) {
      alert('Community ID not found. Please login again.');
      return;
    }
  
    if (!communityId) {
      console.error('Community ID is missing!');
      alert('Community ID is missing. Please try again later.');
      return;
    }
  
    try {
      await api.post(
        `community/${communityId}/join_challenge/`,
        {
          challengeID: challengeId,  // make sure this key matches your backend
          memberID: memberID,
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
  
      // Optional: update UI
      setChallenges(
        challenges.map(challenge =>
          challenge.id === challengeId
            ? { ...challenge, participants: (challenge.participants || 0) + 1 }
            : challenge
        )
      );
  
      alert('You have joined the challenge!');
    } catch (err) {
      console.error('Join challenge error:', err);
      alert('Failed to join challenge. Please try again.');
    }
  };
  
  const handleCommentChange = (postId, text) => {
    setNewComments(prev => ({ ...prev, [postId]: text }));
  };

  const handleCommentSubmit = async (e, postId) => {
    e.preventDefault();
    const commentText = newComments[postId]?.trim();
    if (!commentText) {
      alert('Comment cannot be empty.');
      return;
    }
    if (!memberID) {
      alert('Member ID not found. Please login again.');
      return;
    }

    try {
      const response = await api.post(
        `community/posts/${postId}/comments/`,
        {
          post: postId,
          author: memberName,
          content: commentText,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setPosts(
        posts.map(post =>
          post.id === postId
            ? {
                ...post,
                comments_list: [...(post.comments_list || []), response.data],
                comments: (post.comments || 0) + 1,
              }
            : post
        )
      );
      setNewComments(prev => ({ ...prev, [postId]: '' }));
    } catch {
      alert('Failed to submit comment. Please try again.');
    }
  };

  // Delete comment handler
  const handleDeleteComment = async (postId, commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      await api.delete(
        `community/posts/${postId}/comments/${commentId}/`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setPosts(
        posts.map(post =>
          post.id === postId
            ? {
                ...post,
                comments_list: (post.comments_list || []).filter(c => c.id !== commentId),
                comments: (post.comments || 1) - 1,
              }
            : post
        )
      );
      alert('Comment deleted successfully.');
    } catch {
      alert('Failed to delete comment. Please try again.');
    }
  };

  // Start editing comment
  const handleEditCommentStart = (commentId, currentContent) => {
    setEditingComments(prev => ({ ...prev, [commentId]: currentContent }));
  };

  // Cancel editing comment
  const handleEditCommentCancel = commentId => {
    setEditingComments(prev => {
      const copy = { ...prev };
      delete copy[commentId];
      return copy;
    });
  };

  // Change edited comment text
  const handleEditCommentChange = (commentId, text) => {
    setEditingComments(prev => ({ ...prev, [commentId]: text }));
  };

  // Save edited comment
  const handleEditCommentSave = async (postId, commentId) => {
    const editedContent = editingComments[commentId]?.trim();
    if (!editedContent) {
      alert('Comment cannot be empty.');
      return;
    }
    try {
      const response = await axios.api(
        `community/posts/${postId}/comments/${commentId}/`,
        {   content: editedContent,
          post: postId,
          author: memberName, },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setPosts(
        posts.map(post =>
          post.id === postId
            ? {
                ...post,
                comments_list: post.comments_list.map(c =>
                  c.id === commentId ? response.data : c
                ),
              }
            : post
        )
      );

      // Remove from editing state
      handleEditCommentCancel(commentId);
      alert('Comment updated successfully.');
    } catch {
      alert('Failed to update comment. Please try again.');
    }
  };

  const formatDate = dateString => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
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
        <p className="text-gray-600">
          Connect with fellow gym members and stay updated with gym news.
        </p>
      </motion.div>

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

      <AnimatePresence mode="wait">
        {activeTab === 'feed' && (
          <motion.div
            key="feed"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="bg-white rounded-lg shadow-md p-6 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Create New Post</h2>
              <form onSubmit={handlePostSubmit}>
                <input
                  type="text"
                  placeholder="Title"
                  className="w-full mb-2 p-2 border border-gray-300 rounded"
                  value={newPost.title}
                  onChange={e => setNewPost({ ...newPost, title: e.target.value })}
                  required
                />
                <textarea
                  placeholder="Content"
                  className="w-full mb-2 p-2 border border-gray-300 rounded"
                  rows={4}
                  value={newPost.content}
                  onChange={e => setNewPost({ ...newPost, content: e.target.value })}
                  required
                />
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Post
                </button>
              </form>
            </motion.div>

            {posts.length === 0 ? (
              <p className="text-gray-500">No posts yet.</p>
            ) : (
              posts.map(post => (
                <motion.div
                  key={post.id}
                  className="bg-white rounded-lg shadow-md p-6 mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <h3 className="text-lg font-bold mb-1">{post.title}</h3>
                  <p className="text-gray-700 mb-2 whitespace-pre-wrap">{post.content}</p>
                  <div className="text-sm text-gray-500 mb-2">
                    By {post.member_name || 'Unknown'} on {formatDate(post.created_at)}
                  </div>
                  <button
                    onClick={() => handleLike(post.id)}
                    className="text-blue-600 hover:underline mb-4"
                    aria-label={`Like post titled ${post.title}`}
                  >
                    Like ({post.likes || 0})
                  </button>

                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-semibold mb-2">Comments ({post.comments || 0})</h4>

                    {(post.comments_list || []).map(comment => (
                      <div
                        key={comment.id}
                        className="border border-gray-100 rounded p-3 mb-2 bg-gray-50"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <div>
                            <span className="font-semibold">{comment.author}</span>{' '}
                            <span className="text-gray-500 text-xs">
                              • {formatDate(comment.created_at)}
                            </span>
                          </div>
                          <div className="space-x-2">
                            {!editingComments[comment.id] ? (
                              <>
                                {(comment.author === memberName) && (
                                  <>
                                    <button
                                      onClick={() =>
                                        handleEditCommentStart(comment.id, comment.content)
                                      }
                                      className="text-sm text-green-600 hover:underline"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteComment(post.id, comment.id)}
                                      className="text-sm text-red-600 hover:underline"
                                    >
                                      Delete
                                    </button>
                                  </>
                                )}
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEditCommentSave(post.id, comment.id)}
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => handleEditCommentCancel(comment.id)}
                                  className="text-sm text-gray-600 hover:underline"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {editingComments[comment.id] ? (
                          <textarea
                            className="w-full p-2 border border-gray-300 rounded"
                            rows={2}
                            value={editingComments[comment.id]}
                            onChange={e =>
                              handleEditCommentChange(comment.id, e.target.value)
                            }
                          />
                        ) : (
                          <p className="whitespace-pre-wrap">{comment.content}</p>
                        )}
                      </div>
                    ))}

                    <form onSubmit={e => handleCommentSubmit(e, post.id)}>
                      <textarea
                        placeholder="Add a comment..."
                        className="w-full p-2 border border-gray-300 rounded mb-2"
                        rows={2}
                        value={newComments[post.id] || ''}
                        onChange={e => handleCommentChange(post.id, e.target.value)}
                      />
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      >
                        Submit
                      </button>
                    </form>
                  </div>
                </motion.div>
              ))
            )}
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
            {announcements.length === 0 ? (
              <p className="text-gray-500">No announcements available.</p>
            ) : (
              announcements.map(announcement => (
                <div
                  key={announcement.id}
                  className="bg-white rounded-lg shadow-md p-6"
                >
                  <h3 className="text-lg font-bold mb-2">{announcement.title}</h3>
                  <p className="mb-2 whitespace-pre-wrap">{announcement.content}</p>
                  <div className="text-sm text-gray-500">
                    Posted on {formatDate(announcement.created_at)}
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'challenges' && (
          <motion.div
            key="challenges"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {challenges.length === 0 ? (
              <p className="text-gray-500">No challenges available.</p>
            ) : (
              challenges.map(challenge => (
                <div
                  key={challenge.id}
                  className="bg-white rounded-lg shadow-md p-6"
                >
                  <h3 className="text-lg font-bold mb-2">{challenge.title}</h3>
                  <p className="mb-2 whitespace-pre-wrap">{challenge.description}</p>
                  <div className="text-sm text-gray-500 mb-4">
                    Participants: {challenge.participants || 0}
                  </div>
                  <button
                    onClick={() => joinChallenge(challenge.id)}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Join Challenge
                  </button>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default MemberCommunityPage;  
