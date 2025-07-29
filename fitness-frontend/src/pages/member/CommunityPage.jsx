import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import AppToastContainer from "../../components/ui/ToastContainer";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { useCommunityFeed } from "../../hooks/useCommunityFeed";
import api from "../../utils/api";
import { formatDate, getDateFromObject } from "../../utils/dateUtils";
import { getRelativeTime } from "../../utils/timeUtils";
import { showToast } from "../../utils/toast";

function MemberCommunityPage() {
  const { communityId } = useParams();
  const { 
    posts, 
    setPosts,
    loading: postsLoading, 
    createPost, 
    toggleLike, 
    loadMore, 
    hasMore,
    updatePost,
    deletePost,
    addComment,
    updateComment,
    deleteComment
  } = useCommunityFeed();
  const [announcements, setAnnouncements] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState({ title: "", content: "", image: null });
  const [imagePreview, setImagePreview] = useState(null);
  const [activeTab, setActiveTab] = useState("feed");
  const [error, setError] = useState(null);
  const [newComments, setNewComments] = useState({});
  const [editingComments, setEditingComments] = useState({});
  const [editingPosts, setEditingPosts] = useState({});
  const [actionLoading, setActionLoading] = useState({});
  const [showComments, setShowComments] = useState({});
  const [showReplies, setShowReplies] = useState({});
  const [showReplyInput, setShowReplyInput] = useState({});
  const [replyText, setReplyText] = useState({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null, id: null, title: '', message: '' });

  const memberName = localStorage.getItem("member_name") || "Member";
  const userName = localStorage.getItem("member_username") || "Member";
  const memberID = localStorage.getItem("member_id");
  const token = localStorage.getItem("member_access_token");

  // Debug logging
  console.log("Current user info:", {
    memberName,
    userName,
    memberID,
    token: token ? "exists" : "missing",
  });
  
  // Debug localStorage contents
  console.log("All localStorage keys:", Object.keys(localStorage));
  console.log("localStorage contents:", {
    name: localStorage.getItem("name"),
    username: localStorage.getItem("username"),
    user: localStorage.getItem("user"),
    member: localStorage.getItem("member"),
    memberId: localStorage.getItem("memberId"),
  });

  useEffect(() => {
    if (!token) {
      setError("User not authenticated. Please login.");
      setLoading(false);
      return;
    }
    
    const fetchAnnouncementsAndChallenges = async () => {
      setLoading(true);
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };

        const [announcementsResponse, challengesResponse] = await Promise.all([
          api.get("community/announcements/", config),
          api.get("community/challenges/", config),
        ]);

        setAnnouncements(
          Array.isArray(announcementsResponse.data) ? announcementsResponse.data : []
        );
        setChallenges(
          Array.isArray(challengesResponse.data) ? challengesResponse.data : []
        );
        setError(null);
      } catch (err) {
        console.error("Error fetching community data:", err);
        setError("Failed to load community content. Please try again later.");
      }
      setLoading(false);
    };

    fetchAnnouncementsAndChallenges();
  }, [token]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast.error("Image size should be less than 5MB");
        return;
      }
      setNewPost({ ...newPost, image: file });
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setNewPost({ ...newPost, image: null });
    setImagePreview(null);
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();

    if (!newPost.title.trim() || !newPost.content.trim()) {
      showToast.warn("Please fill in both title and content");
      return;
    }
    if (!memberID) {
      showToast.error("Member ID not found. Please login again.");
      return;
    }

    setActionLoading(prev => ({ ...prev, createPost: true }));
    try {
      if (newPost.image) {
        // Handle image upload with FormData
        const formData = new FormData();
        formData.append('title', newPost.title);
        formData.append('content', newPost.content);
        formData.append('memberID', memberID);
        formData.append('image', newPost.image);

        const response = await api.post('community/posts/', formData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });

        // Update posts state immediately with the new post
        const newPostData = { ...response.data, comments_list: [] };
        setPosts(prev => [newPostData, ...prev]);
        showToast.success('Post created successfully!');
      } else {
        // Use hook for text-only posts
        await createPost(newPost);
      }
      
      setNewPost({ title: "", content: "", image: null });
      setImagePreview(null);
      setShowCreateForm(false);
    } catch (err) {
      console.error('Post creation error:', err);
      showToast.error('Failed to create post');
    } finally {
      setActionLoading(prev => ({ ...prev, createPost: false }));
    }
  };

  // Post editing functions
  const handleEditPostStart = (postId, currentTitle, currentContent) => {
    setEditingPosts((prev) => ({
      ...prev,
      [postId]: { title: currentTitle, content: currentContent },
    }));
  };

  const handleEditPostCancel = (postId) => {
    setEditingPosts((prev) => {
      const copy = { ...prev };
      delete copy[postId];
      return copy;
    });
  };

  const handleEditPostChange = (postId, field, value) => {
    setEditingPosts((prev) => ({
      ...prev,
      [postId]: { ...prev[postId], [field]: value },
    }));
  };

  const handleEditPostSave = async (postId) => {
    const editedPost = editingPosts[postId];
    if (!editedPost?.title?.trim() || !editedPost?.content?.trim()) {
      showToast.warn("Title and content cannot be empty.");
      return;
    }

    setActionLoading(prev => ({ ...prev, [`editPost_${postId}`]: true }));
    try {
      await api.put(
        `community/posts/${postId}/`,
        {
          postId: postId,
          title: editedPost.title,
          content: editedPost.content,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      updatePost(postId, { title: editedPost.title, content: editedPost.content });
      handleEditPostCancel(postId);
      showToast.success("Post updated successfully.");
    } catch (err) {
      if (err.response?.status === 403) {
        showToast.error("You can only edit your own posts.");
      } else {
        showToast.error("Failed to update post. Please try again.");
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [`editPost_${postId}`]: false }));
    }
  };

  const handleDeletePost = (postId) => {
    setConfirmModal({
      isOpen: true,
      action: 'deletePost',
      id: postId,
      title: 'Delete Post',
      message: 'Are you sure you want to delete this post? This action cannot be undone.'
    });
  };

  const executeDeletePost = async (postId) => {

    setActionLoading(prev => ({ ...prev, [`deletePost_${postId}`]: true }));
    try {
      await api.delete(
        `community/posts/${postId}/`,
        { postId: postId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      deletePost(postId);
      showToast.success("Post deleted successfully.");
    } catch (err) {
      if (err.response?.status === 403) {
        showToast.error("You can only delete your own posts.");
      } else {
        showToast.error("Failed to delete post. Please try again.");
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [`deletePost_${postId}`]: false }));
    }
  };
  const handleLike = useCallback(async (postId) => {
    setActionLoading(prev => ({ ...prev, [`like_${postId}`]: true }));
    try {
      await toggleLike(postId);
    } finally {
      setActionLoading(prev => ({ ...prev, [`like_${postId}`]: false }));
    }
  }, [toggleLike]);


  const joinChallenge = async (challengeId) => {
    if (!memberID) {
      showToast.error("Member ID not found. Please login again.");
      return;
    }

    try {
      await api.post(
        `community/${challengeId}/join_challenge/`,
        {
          challengeID: challengeId,
          memberID: memberID,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setChallenges(
        challenges.map((challenge) =>
          challenge.id === challengeId
            ? { ...challenge, participants: (challenge.participants || 0) + 1 }
            : challenge
        )
      );

      showToast.success("You have joined the challenge!");
    } catch (err) {
      console.error("Join challenge error:", err);
      const errorMessage = err.response?.data?.error || "Failed to join challenge. Please try again.";
      showToast.error(errorMessage);
    }
  };

  const handleCommentChange = (postId, text) => {
    setNewComments((prev) => ({ ...prev, [postId]: text }));
  };

  const toggleComments = (postId) => {
    setShowComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const toggleReplies = (commentId) => {
    setShowReplies(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const toggleReplyInput = (commentId) => {
    setShowReplyInput(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const handleReplySubmit = async (e, postId, commentId) => {
    e.preventDefault();
    const reply = replyText[commentId]?.trim();
    if (!reply) {
      showToast.warn("Reply cannot be empty.");
      return;
    }

    setActionLoading(prev => ({ ...prev, [`reply_${commentId}`]: true }));
    try {
      const response = await api.post(
        `community/posts/${postId}/comments/`,
        { content: reply, parent_comment: commentId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Ensure the reply has the parent_comment field set
      const replyData = {
        ...response.data,
        parent_comment: commentId
      };
      
      addComment(postId, replyData);
      setReplyText(prev => ({ ...prev, [commentId]: "" }));
      setShowReplyInput(prev => ({ ...prev, [commentId]: false }));
      showToast.success("Reply added successfully!");
    } catch (err) {
      showToast.error("Failed to submit reply. Please try again.");
    } finally {
      setActionLoading(prev => ({ ...prev, [`reply_${commentId}`]: false }));
    }
  };

  // Updated to use correct API endpoint
  const handleCommentSubmit = async (e, postId) => {
    e.preventDefault();
    const commentText = newComments[postId]?.trim();
    if (!commentText) {
      showToast.warn("Comment cannot be empty.");
      return;
    }
    if (!memberID) {
      showToast.error("Member ID not found. Please login again.");
      return;
    }

    setActionLoading(prev => ({ ...prev, [`comment_${postId}`]: true }));
    try {
      const response = await api.post(
        `community/posts/${postId}/comments/`,
        { content: commentText },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      addComment(postId, response.data);
      setNewComments((prev) => ({ ...prev, [postId]: "" }));
      showToast.success("Comment added successfully!");
    } catch (err) {
      console.error('Comment submission error:', err.response?.data || err.message);
      showToast.error("Failed to submit comment. Please try again.");
    } finally {
      setActionLoading(prev => ({ ...prev, [`comment_${postId}`]: false }));
    }
  };

  const handleDeleteComment = (postId, commentId) => {
    setConfirmModal({
      isOpen: true,
      action: 'deleteComment',
      id: { postId, commentId },
      title: 'Delete Comment',
      message: 'Are you sure you want to delete this comment? This action cannot be undone.'
    });
  };

  const executeDeleteComment = async (postId, commentId) => {

    setActionLoading(prev => ({ ...prev, [`deleteComment_${commentId}`]: true }));
    try {
      await api.delete(
        `community/posts/${postId}/comments/${commentId}/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      deleteComment(postId, commentId);
      showToast.success("Comment deleted successfully.");
    } catch (err) {
      if (err.response?.status === 403) {
        showToast.error("You can only delete your own comments.");
      } else {
        showToast.error("Failed to delete comment. Please try again.");
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [`deleteComment_${commentId}`]: false }));
    }
  };

  // Start editing comment
  const handleEditCommentStart = (commentId, currentContent) => {
    setEditingComments((prev) => ({ ...prev, [commentId]: currentContent }));
  };

  // Cancel editing comment
  const handleEditCommentCancel = (commentId) => {
    setEditingComments((prev) => {
      const copy = { ...prev };
      delete copy[commentId];
      return copy;
    });
  };

  // Change edited comment text
  const handleEditCommentChange = (commentId, text) => {
    setEditingComments((prev) => ({ ...prev, [commentId]: text }));
  };

  const handleEditCommentSave = async (postId, commentId) => {
    const editedContent = editingComments[commentId]?.trim();
    if (!editedContent) {
      showToast.warn("Comment cannot be empty.");
      return;
    }

    setActionLoading(prev => ({ ...prev, [`editComment_${commentId}`]: true }));
    try {
      await api.put(
        `community/posts/${postId}/comments/${commentId}/`,
        { content: editedContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      updateComment(postId, commentId, { content: editedContent });
      handleEditCommentCancel(commentId);
      showToast.success("Comment updated successfully.");
    } catch (err) {
      if (err.response?.status === 403) {
        showToast.error("You can only edit your own comments.");
      } else {
        showToast.error("Failed to update comment. Please try again.");
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [`editComment_${commentId}`]: false }));
    }
  };



  // Enhanced ownership check function with debugging
  const isOwner = (post, comment = null) => {
    if (comment) {
      console.log("Comment ownership check:", {
        commentAuthor: comment.author,
        memberName: memberName,
        userName: userName,
        isMatchName: comment.author === memberName,
        isMatchUsername: comment.author === userName,
      });
      return comment.author === memberName || comment.author === userName;
    } else {
      console.log("Post ownership check:", {
        postAuthor: post.author,
        memberName: memberName,
        userName: userName,
        isMatchName: post.author === memberName,
        isMatchUsername: post.author === userName,
      });
      return post.author === memberName || post.author === userName;
    }
  };

  const handleConfirmAction = async () => {
    const { action, id } = confirmModal;
    setConfirmModal({ isOpen: false, action: null, id: null, title: '', message: '' });
    
    if (action === 'deletePost') {
      await executeDeletePost(id);
    } else if (action === 'deleteComment') {
      await executeDeleteComment(id.postId, id.commentId);
    }
  };

  const handleCancelAction = () => {
    setConfirmModal({ isOpen: false, action: null, id: null, title: '', message: '' });
  };

  if (loading && postsLoading) {
    return (
      <motion.div
        className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-800 via-gray-800 to-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="text-center p-6 sm:p-10 min-h-screen bg-gradient-to-br from-gray-800 via-gray-800 to-black flex items-center justify-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <div className="text-red-400 mb-4 text-sm sm:text-base">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-yellow-600 text-black rounded hover:bg-yellow-700 text-sm sm:text-base"
          >
            Retry
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <AppToastContainer />
      <motion.div
        className="container mx-auto p-3 sm:p-4 max-w-6xl min-h-screen bg-gradient-to-br from-gray-800 via-gray-800 to-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
      <motion.div
        className="mb-6 sm:mb-8"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">
          Fitness Community
        </h1>
        <p className="text-sm sm:text-base text-gray-300">
          Connect with fellow gym members and stay updated with gym news.
        </p>
      </motion.div>

      <motion.div
        className="border-b border-gray-600 mb-4 sm:mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <nav className="flex space-x-4 sm:space-x-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab("feed")}
            className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
              activeTab === "feed"
                ? "border-yellow-500 text-yellow-400"
                : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500"
            }`}
          >
            Community Feed
          </button>
          <button
            onClick={() => setActiveTab("announcements")}
            className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
              activeTab === "announcements"
                ? "border-yellow-500 text-yellow-400"
                : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500"
            }`}
          >
            Announcements
          </button>
          <button
            onClick={() => setActiveTab("challenges")}
            className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
              activeTab === "challenges"
                ? "border-yellow-500 text-yellow-400"
                : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500"
            }`}
          >
            Challenges
          </button>
        </nav>
      </motion.div>

      <AnimatePresence mode="wait">
        {activeTab === "feed" && (
          <motion.div
            key="feed"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="mb-4 sm:mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black px-4 py-2 rounded hover:from-yellow-600 hover:to-yellow-700 text-sm sm:text-base font-medium transition-all duration-300"
              >
                {showCreateForm ? 'Cancel' : 'Create New Post'}
              </button>
              
              <motion.div
                className="overflow-hidden"
                initial={false}
                animate={{ height: showCreateForm ? 'auto' : 0, opacity: showCreateForm ? 1 : 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <div className="bg-gray-700 rounded-lg shadow-md p-4 sm:p-6 mt-4 border border-gray-600">
                  <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-white">
                    Create New Post
                  </h2>
                  <form onSubmit={handlePostSubmit} className="space-y-3">
                    <input
                      type="text"
                      placeholder="Title"
                      className="w-full p-2 sm:p-3 border border-gray-600 bg-gray-600 text-white rounded text-sm sm:text-base"
                      value={newPost.title}
                      onChange={(e) =>
                        setNewPost({ ...newPost, title: e.target.value })
                      }
                      required
                    />
                    <textarea
                      placeholder="Content"
                      className="w-full p-2 sm:p-3 border border-gray-600 bg-gray-600 text-white rounded text-sm sm:text-base"
                      rows={3}
                      value={newPost.content}
                      onChange={(e) =>
                        setNewPost({ ...newPost, content: e.target.value })
                      }
                      required
                    />
                    
                    <div className="space-y-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="w-full p-2 border border-gray-600 bg-gray-600 text-white rounded text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-yellow-500 file:text-black hover:file:bg-yellow-600"
                      />
                      
                      {imagePreview && (
                        <div className="relative">
                          <img src={imagePreview} alt="Preview" className="w-full max-w-md h-48 object-cover rounded" />
                          <button
                            type="button"
                            onClick={removeImage}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={actionLoading.createPost}
                      className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black px-4 py-2 rounded hover:from-yellow-600 hover:to-yellow-700 text-sm sm:text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading.createPost ? 'Posting...' : 'Post'}
                    </button>
                  </form>
                </div>
              </motion.div>
            </motion.div>

            {posts.length === 0 && !postsLoading ? (
              <p className="text-gray-400 text-sm sm:text-base">No posts yet.</p>
            ) : (
              <>
                {posts.map((post) => (
                  <motion.div
                    key={post.id}
                    className="bg-gray-700 rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-600"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                  <div className="flex flex-col sm:flex-row justify-between items-start mb-3 sm:mb-4 gap-3 sm:gap-0">
                    <div className="flex-1 min-w-0">
                      {editingPosts[post.id] ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            className="w-full p-2 border border-gray-600 bg-gray-600 text-white rounded font-bold text-base sm:text-lg"
                            value={editingPosts[post.id].title}
                            onChange={(e) =>
                              handleEditPostChange(
                                post.id,
                                "title",
                                e.target.value
                              )
                            }
                          />
                          <textarea
                            className="w-full p-2 border border-gray-600 bg-gray-600 text-white rounded text-sm sm:text-base"
                            rows={3}
                            value={editingPosts[post.id].content}
                            onChange={(e) =>
                              handleEditPostChange(
                                post.id,
                                "content",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      ) : (
                        <>
                          <h3 className="text-base sm:text-lg font-bold mb-1 text-white break-words">
                            {post.title}
                          </h3>
                          <p className="text-sm sm:text-base text-gray-300 mb-2 whitespace-pre-wrap break-words">
                            {post.content}
                          </p>
                          {post.image && (
                            <img 
                              src={post.image} 
                              alt="Post" 
                              className="w-48 h-32 object-cover rounded-lg mb-2 cursor-pointer hover:opacity-80 transition-opacity" 
                              onClick={() => setSelectedImage(post.image)}
                            />
                          )}
                        </>
                      )}
                      <div className="text-xs sm:text-sm text-gray-400 mb-2">
                        By {post.author || "Unknown"} • {getRelativeTime(getDateFromObject(post))} • {formatDate(getDateFromObject(post))}
                      </div>
                    </div>

                    {isOwner(post) && (
                      <div className="flex space-x-2 sm:ml-4 flex-shrink-0">
                        {editingPosts[post.id] ? (
                          <>
                            <button
                              onClick={() => handleEditPostSave(post.id)}
                              className="text-xs sm:text-sm text-green-400 hover:underline px-2 py-1"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => handleEditPostCancel(post.id)}
                              className="text-xs sm:text-sm text-gray-300 hover:underline px-2 py-1"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() =>
                                handleEditPostStart(
                                  post.id,
                                  post.title,
                                  post.content
                                )
                              }
                              className="text-xs sm:text-sm text-yellow-400 hover:underline px-2 py-1"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="text-xs sm:text-sm text-red-400 hover:underline px-2 py-1"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {!editingPosts[post.id] && (
                    <>
                      <div className="flex items-center space-x-6 mb-4 pb-3 border-b border-gray-600">
                        <button
                          onClick={() => handleLike(post.id)}
                          disabled={actionLoading[`like_${post.id}`]}
                          className={`flex items-center space-x-2 text-sm transition-colors ${
                            post.liked ? 'text-yellow-300' : 'text-gray-400 hover:text-yellow-300'
                          } disabled:opacity-50`}
                          aria-label={`Like post titled ${post.title}`}
                        >
                          <span>{post.liked ? '❤️' : '🤍'}</span>
                          <span>{actionLoading[`like_${post.id}`] ? 'Loading...' : `Like ${post.likes || 0 > 0 ? `(${post.likes})` : ''}`}</span>
                        </button>

                        <button
                          onClick={() => toggleComments(post.id)}
                          className="flex items-center space-x-2 text-sm text-gray-400 hover:text-yellow-300 transition-colors"
                        >
                          <span>💬</span>
                          <span>Comment {(post.comments || 0) > 0 ? `(${post.comments})` : ''}</span>
                        </button>
                      </div>

                      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        showComments[post.id] ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
                      }`}>
                        <div className="space-y-4 pt-4">

                          {/* Comment Input */}
                          <form onSubmit={(e) => handleCommentSubmit(e, post.id)} className="mb-4">
                            <div className="flex space-x-3">
                              <div className="flex-1">
                                <textarea
                                  placeholder="Write a comment..."
                                  className="w-full p-3 border border-gray-600 bg-gray-600 text-white rounded-lg text-sm resize-none focus:outline-none focus:border-yellow-500"
                                  rows={2}
                                  value={newComments[post.id] || ""}
                                  onChange={(e) => handleCommentChange(post.id, e.target.value)}
                                />
                              </div>
                              <button
                                type="submit"
                                disabled={actionLoading[`comment_${post.id}`] || !newComments[post.id]?.trim()}
                                className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed self-end"
                              >
                                {actionLoading[`comment_${post.id}`] ? 'Posting...' : 'Post'}
                              </button>
                            </div>
                          </form>

                          {/* Comments List */}
                          <div className="space-y-3">
                            {(post.comments_list || []).filter(comment => !comment.parent_comment && comment.parent_comment !== 0).map((comment) => (
                              <div key={comment.id} className="space-y-2">
                                {/* Main Comment */}
                                <div className="flex space-x-3">
                                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-black font-bold text-sm">{comment.author?.charAt(0)?.toUpperCase()}</span>
                                  </div>
                                  <div className="flex-1">
                                    <div className="bg-gray-600 rounded-lg p-3">
                                      <div className="flex justify-between items-start mb-2">
                                        <div>
                                          <span className="font-semibold text-white text-sm">{comment.author}</span>
                                          <span className="text-gray-400 text-xs ml-2">{getRelativeTime(getDateFromObject(comment))}</span>
                                        </div>
                                        {isOwner(post, comment) && (
                                          <div className="flex space-x-2">
                                            {!editingComments[comment.id] ? (
                                              <>
                                                <button
                                                  onClick={() => handleEditCommentStart(comment.id, comment.content)}
                                                  className="text-xs text-gray-400 hover:text-yellow-400"
                                                >
                                                  Edit
                                                </button>
                                                <button
                                                  onClick={() => handleDeleteComment(post.id, comment.id)}
                                                  className="text-xs text-gray-400 hover:text-red-400"
                                                  disabled={actionLoading[`deleteComment_${comment.id}`]}
                                                >
                                                  {actionLoading[`deleteComment_${comment.id}`] ? 'Deleting...' : 'Delete'}
                                                </button>
                                              </>
                                            ) : (
                                              <>
                                                <button
                                                  onClick={() => handleEditCommentSave(post.id, comment.id)}
                                                  className="text-xs text-blue-400 hover:underline"
                                                  disabled={actionLoading[`editComment_${comment.id}`]}
                                                >
                                                  {actionLoading[`editComment_${comment.id}`] ? 'Saving...' : 'Save'}
                                                </button>
                                                <button
                                                  onClick={() => handleEditCommentCancel(comment.id)}
                                                  className="text-xs text-gray-400 hover:underline"
                                                >
                                                  Cancel
                                                </button>
                                              </>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      {editingComments[comment.id] ? (
                                        <textarea
                                          className="w-full p-2 border border-gray-500 bg-gray-500 text-white rounded text-sm resize-none"
                                          rows={2}
                                          value={editingComments[comment.id]}
                                          onChange={(e) => handleEditCommentChange(comment.id, e.target.value)}
                                        />
                                      ) : (
                                        <p className="text-white text-sm whitespace-pre-wrap break-words">
                                          {comment.content}
                                        </p>
                                      )}
                                    </div>
                                    
                                    {/* Action Buttons */}
                                    <div className="flex items-center space-x-4 mt-1 ml-3">
                                      {comment.author !== memberName && comment.author !== userName && (
                                        <button
                                          onClick={() => toggleReplyInput(comment.id)}
                                          className="text-xs text-gray-400 hover:text-red-400 font-medium"
                                        >
                                          Reply
                                        </button>
                                      )}
                                      {(post.comments_list || []).filter(reply => reply.parent_comment === comment.id).length > 0 && (
                                        <button
                                          onClick={() => toggleReplies(comment.id)}
                                          className="text-xs text-gray-500 hover:text-yellow-400"
                                        >
                                          {showReplies[comment.id] ? 'Hide' : 'View'} {(post.comments_list || []).filter(reply => reply.parent_comment === comment.id).length} replies
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Reply Input */}
                                {showReplyInput[comment.id] && (
                                  <div className="ml-11 mt-2">
                                    <form onSubmit={(e) => handleReplySubmit(e, post.id, comment.id)} className="flex space-x-2">
                                      <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-black font-bold text-xs">{memberName?.charAt(0)?.toUpperCase()}</span>
                                      </div>
                                      <div className="flex-1 flex space-x-2">
                                        <input
                                          type="text"
                                          placeholder={`Reply to ${comment.author}...`}
                                          className="flex-1 p-2 border border-gray-600 bg-gray-600 text-white rounded-full text-sm focus:outline-none focus:border-yellow-500"
                                          value={replyText[comment.id] || ""}
                                          onChange={(e) => setReplyText(prev => ({ ...prev, [comment.id]: e.target.value }))}
                                        />
                                        <button
                                          type="submit"
                                          disabled={actionLoading[`reply_${comment.id}`] || !replyText[comment.id]?.trim()}
                                          className="bg-yellow-500 hover:bg-yellow-600 text-black px-3 py-1 rounded-full text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          {actionLoading[`reply_${comment.id}`] ? '...' : '→'}
                                        </button>
                                      </div>
                                    </form>
                                  </div>
                                )}

                                {/* Replies */}
                                <div className={`ml-11 space-y-2 overflow-hidden transition-all duration-300 ease-in-out ${
                                  showReplies[comment.id] ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
                                }`}>
                                  {(post.comments_list || []).filter(reply => reply.parent_comment === comment.id || reply.parent_comment == comment.id).map((reply) => (
                                    <div key={reply.id} className="flex space-x-2">
                                      <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-black font-bold text-xs">{reply.author?.charAt(0)?.toUpperCase()}</span>
                                      </div>
                                      <div className="flex-1">
                                        <div className="bg-gray-600 rounded-2xl px-3 py-2">
                                          <div className="flex items-center space-x-2 mb-1">
                                            <span className="font-semibold text-white text-xs">{reply.author}</span>
                                            <span className="text-gray-400 text-xs">{getRelativeTime(getDateFromObject(reply))}</span>
                                          </div>
                                          {editingComments[reply.id] ? (
                                            <div className="space-y-2">
                                              <textarea
                                                className="w-full p-2 border border-gray-500 bg-gray-500 text-white rounded text-xs resize-none"
                                                rows={2}
                                                value={editingComments[reply.id]}
                                                onChange={(e) => handleEditCommentChange(reply.id, e.target.value)}
                                              />
                                              <div className="flex space-x-2">
                                                <button
                                                  onClick={() => handleEditCommentSave(post.id, reply.id)}
                                                  className="text-xs text-blue-400 hover:underline"
                                                  disabled={actionLoading[`editComment_${reply.id}`]}
                                                >
                                                  {actionLoading[`editComment_${reply.id}`] ? 'Saving...' : 'Save'}
                                                </button>
                                                <button
                                                  onClick={() => handleEditCommentCancel(reply.id)}
                                                  className="text-xs text-gray-400 hover:underline"
                                                >
                                                  Cancel
                                                </button>
                                              </div>
                                            </div>
                                          ) : (
                                            <p className="text-white text-xs whitespace-pre-wrap break-words">
                                              {reply.content}
                                            </p>
                                          )}
                                        </div>
                                        <div className="flex items-center space-x-4 mt-1 ml-3">
                                          {reply.author !== memberName && reply.author !== userName && (
                                            <button 
                                              onClick={() => toggleReplies(reply.id)}
                                              className="text-xs text-gray-400 hover:text-red-400 font-medium"
                                            >
                                              Reply
                                            </button>
                                          )}
                                          {isOwner(post, reply) && (
                                            <>
                                              <button 
                                                onClick={() => handleEditCommentStart(reply.id, reply.content)}
                                                className="text-xs text-gray-400 hover:text-yellow-400"
                                              >
                                                Edit
                                              </button>
                                              <button 
                                                onClick={() => handleDeleteComment(post.id, reply.id)}
                                                disabled={actionLoading[`deleteComment_${reply.id}`]}
                                                className="text-xs text-gray-400 hover:text-red-400"
                                              >
                                                {actionLoading[`deleteComment_${reply.id}`] ? 'Deleting...' : 'Delete'}
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                    </>
                  )}
                  </motion.div>
                ))}
                
                {/* Load More Button */}
                {hasMore && (
                  <motion.div 
                    className="text-center py-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <button
                      onClick={loadMore}
                      disabled={postsLoading}
                      className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black px-6 py-3 rounded-lg hover:from-yellow-600 hover:to-yellow-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {postsLoading ? 'Loading...' : 'Load More Posts'}
                    </button>
                  </motion.div>
                )}
                
                {postsLoading && posts.length > 0 && (
                  <motion.div 
                    className="text-center py-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-yellow-500 mx-auto"></div>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        )}

        {activeTab === "announcements" && (
          <motion.div
            key="announcements"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {announcements.length === 0 ? (
              <p className="text-gray-400 text-sm sm:text-base">No announcements available.</p>
            ) : (
              announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="bg-gray-700 rounded-lg shadow-md p-4 sm:p-6 border border-gray-600"
                >
                  <h3 className="text-base sm:text-lg font-bold mb-2 text-white break-words">
                    {announcement.title}
                  </h3>
                  <p className="mb-2 whitespace-pre-wrap text-gray-300 text-sm sm:text-base break-words">
                    {announcement.content}
                  </p>
                  <div className="text-xs sm:text-sm text-gray-400">
                    Posted on {formatDate(getDateFromObject(announcement))}
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === "challenges" && (
          <motion.div
            key="challenges"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {challenges.length === 0 ? (
              <p className="text-gray-400 text-sm sm:text-base">No challenges available.</p>
            ) : (
              challenges.map((challenge) => (
                <div
                  key={challenge.id}
                  className="bg-gray-700 rounded-lg shadow-md p-4 sm:p-6 border border-gray-600"
                >
                  <h3 className="text-base sm:text-lg font-bold mb-2 text-white break-words">{challenge.title}</h3>
                  <p className="mb-2 whitespace-pre-wrap text-gray-300 text-sm sm:text-base break-words">
                    {challenge.description}
                  </p>
                  <div className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">
                    Participants: {challenge.participants || 0}
                  </div>
                  <button
                    onClick={() => joinChallenge(challenge.id)}
                    className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded hover:bg-green-700 text-sm sm:text-base"
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
      
      {/* Image Popup Modal */}
      {selectedImage && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelectedImage(null)}
        >
          <motion.div
            className="relative max-w-6xl max-h-full"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.8 }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage}
              alt="Full size"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl hover:bg-opacity-70 transition-all"
            >
              ×
            </button>
          </motion.div>
        </motion.div>
      )}
      
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={handleCancelAction}
        onConfirm={handleConfirmAction}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </>
  );
}

export default MemberCommunityPage;
