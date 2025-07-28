import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import AppToastContainer from "../../components/ui/ToastContainer";
import api from "../../utils/api";
import { formatDate, getDateFromObject } from "../../utils/dateUtils";
import { showToast } from "../../utils/toast";

function MemberCommunityPage() {
  const { communityId } = useParams();
  const [posts, setPosts] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState({ title: "", content: "" });
  const [activeTab, setActiveTab] = useState("feed");
  const [error, setError] = useState(null);
  const [newComments, setNewComments] = useState({});
  const [editingComments, setEditingComments] = useState({}); // key: commentId, value: edit text
  const [editingPosts, setEditingPosts] = useState({}); // key: postId, value: { title, content }

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
    const fetchCommunityData = async () => {
      setLoading(true);
      try {
        const config = {
          headers: { Authorization: `Bearer ${token}` },
        };

        const [announcementsResponse, challengesResponse, postsResponse] =
          await Promise.all([
            api.get("community/announcements/", config),
            api.get("community/challenges/", config),
            api.get("community/posts/", config),
          ]);

        setAnnouncements(
          Array.isArray(announcementsResponse.data)
            ? announcementsResponse.data
            : []
        );
        setChallenges(
          Array.isArray(challengesResponse.data) ? challengesResponse.data : []
        );

        const postsData = Array.isArray(postsResponse.data)
          ? postsResponse.data.map((post) => ({
              ...post,
              comments_list: post.comments_list || [], // Ensure comments array
            }))
          : [];

        console.log("Fetched posts:", postsData);
        setPosts(postsData);
        setError(null);
      } catch (err) {
        console.error("Error fetching community data:", err);
        setError("Failed to load community content. Please try again later.");
      }
      setLoading(false);
    };

    fetchCommunityData();
  }, [token]);

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

    try {
      const response = await api.post(
        "community/posts/",
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
      setNewPost({ title: "", content: "" });
      showToast.success("Post created successfully!");
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Failed to create post";
      showToast.error(`Failed to create post: ${errorMsg}. Please try again.`);
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

  // Updated to use correct API endpoint
  const handleEditPostSave = async (postId) => {
    const editedPost = editingPosts[postId];
    if (!editedPost?.title?.trim() || !editedPost?.content?.trim()) {
      showToast.warn("Title and content cannot be empty.");
      return;
    }

    try {
      const response = await api.put(
        `community/posts/${postId}/`,
        {
          postId: postId,
          title: editedPost.title,
          content: editedPost.content,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setPosts(
        posts.map((post) =>
          post.id === postId
            ? { ...post, title: editedPost.title, content: editedPost.content }
            : post
        )
      );

      handleEditPostCancel(postId);
      showToast.success("Post updated successfully.");
    } catch (err) {
      console.error("Error updating post:", err);
      if (err.response?.status === 403) {
        showToast.error("You can only edit your own posts.");
      } else {
        showToast.error("Failed to update post. Please try again.");
      }
    }
  };

  // Updated to use correct API endpoint
  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    try {
      await api.delete(
        `community/posts/${postId}/`,
        { postId: postId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setPosts(posts.filter((post) => post.id !== postId));
      showToast.success("Post deleted successfully.");
    } catch (err) {
      console.error("Error deleting post:", err);
      if (err.response?.status === 403) {
        showToast.error("You can only delete your own posts.");
      } else {
        showToast.error("Failed to delete post. Please try again.");
      }
    }
  };
const handleLike = async (postId) => {
  try {
    const response = await api.post(`community/posts/${postId}/like/`, null, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("member_access_token")}`,
      },
    });

    const { liked, likes_count } = response.data;

    // Update the specific post with new like count and liked status
    setPosts(
      posts.map((post) =>
        post.id === postId ? { ...post, likes: likes_count, liked } : post
      )
    );
  } catch (err) {
    showToast.error("Failed to toggle like. Please try again.");
    console.error(err);
  }
};


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
      showToast.error("Failed to join challenge. Please try again.");
    }
  };

  const handleCommentChange = (postId, text) => {
    setNewComments((prev) => ({ ...prev, [postId]: text }));
  };

  // Updated to use correct API endpoint
  const handleCommentSubmit = async (e, postId) => {
    e.preventDefault();
    const commentText = newComments[postId]?.trim();
    if (!commentText) {
      alert("Comment cannot be empty.");
      return;
    }
    if (!memberID) {
      alert("Member ID not found. Please login again.");
      return;
    }

    try {
      const response = await api.post(
        `community/posts/${postId}/comments/`,
        {
          
          content: commentText,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setPosts(
        posts.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments_list: [...(post.comments_list || []), response.data],
                comments: (post.comments || 0) + 1,
              }
            : post
        )
      );
      setNewComments((prev) => ({ ...prev, [postId]: "" }));
    } catch (err) {
      console.error(
        "Error submitting comment:",
        err.response?.data || err.message
      );

      alert("Failed to submit comment. Please try again.");
    }
  };

  // Updated to use correct API endpoint (assuming similar pattern)
  const handleDeleteComment = async (postId, commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?"))
      return;

    try {
      await api.delete(
        `community/posts/${postId}/comments/${commentId}/`,
        {
          commentId: commentId,
          postId: postId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setPosts(
        posts.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments_list: (post.comments_list || []).filter(
                  (c) => c.id !== commentId
                ),
                comments: (post.comments || 1) - 1,
              }
            : post
        )
      );
      showToast.success("Comment deleted successfully.");
    } catch (err) {
      console.error("Error deleting comment:", err);
      if (err.response?.status === 403) {
        showToast.error("You can only delete your own comments.");
      } else {
        showToast.error("Failed to delete comment. Please try again.");
      }
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

  // Updated to use correct API endpoint (assuming similar pattern)
  const handleEditCommentSave = async (postId, commentId) => {
    const editedContent = editingComments[commentId]?.trim();
    if (!editedContent) {
      alert("Comment cannot be empty.");
      return;
    }

    try {
      const response = await api.put(
        `community/posts/${postId}/comments/${commentId}/`,
        {
          content: editedContent,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setPosts(
        posts.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments_list: post.comments_list.map((c) =>
                  c.id === commentId ? { ...c, content: editedContent } : c
                ),
              }
            : post
        )
      );

      handleEditCommentCancel(commentId);
      alert("Comment updated successfully.");
    } catch (err) {
      console.error("Error updating comment:", err);
      if (err.response?.status === 403) {
        alert("You can only edit your own comments.");
      } else {
        alert("Failed to update comment. Please try again.");
      }
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
          className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </motion.div>
    );
  }

  return (
    <>
      <AppToastContainer />
      <motion.div
        className="container mx-auto p-4 max-w-6xl min-h-screen bg-gradient-to-br from-gray-800 via-gray-800 to-black"
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
        <h1 className="text-3xl font-bold text-white mb-2">
          Fitness Community
        </h1>
        <p className="text-gray-300">
          Connect with fellow gym members and stay updated with gym news.
        </p>
      </motion.div>

      <motion.div
        className="border-b border-gray-600 mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab("feed")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "feed"
                ? "border-yellow-500 text-yellow-400"
                : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500"
            }`}
          >
            Community Feed
          </button>
          <button
            onClick={() => setActiveTab("announcements")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "announcements"
                ? "border-yellow-500 text-yellow-400"
                : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500"
            }`}
          >
            Announcements
          </button>
          <button
            onClick={() => setActiveTab("challenges")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
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
              className="bg-gray-700 rounded-lg shadow-md p-6 mb-6 border border-gray-600"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-xl font-semibold mb-4 text-white">
                Create New Post
              </h2>
              <form onSubmit={handlePostSubmit}>
                <input
                  type="text"
                  placeholder="Title"
                  className="w-full mb-2 p-2 border border-gray-600 bg-gray-600 text-white rounded"
                  value={newPost.title}
                  onChange={(e) =>
                    setNewPost({ ...newPost, title: e.target.value })
                  }
                  required
                />
                <textarea
                  placeholder="Content"
                  className="w-full mb-2 p-2 border border-gray-600 bg-gray-600 text-white rounded"
                  rows={4}
                  value={newPost.content}
                  onChange={(e) =>
                    setNewPost({ ...newPost, content: e.target.value })
                  }
                  required
                />
                <button
                  type="submit"
                  className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black px-4 py-2 rounded hover:from-yellow-600 hover:to-yellow-700"
                >
                  Post
                </button>
              </form>
            </motion.div>

            {posts.length === 0 ? (
              <p className="text-gray-400">No posts yet.</p>
            ) : (
              posts.map((post) => (
                <motion.div
                  key={post.id}
                  className="bg-gray-700 rounded-lg shadow-md p-6 mb-6 border border-gray-600"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      {editingPosts[post.id] ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            className="w-full p-2 border border-gray-600 bg-gray-600 text-white rounded font-bold text-lg"
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
                            className="w-full p-2 border border-gray-600 bg-gray-600 text-white rounded"
                            rows={4}
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
                          <h3 className="text-lg font-bold mb-1 text-white">
                            {post.title}
                          </h3>
                          <p className="text-gray-300 mb-2 whitespace-pre-wrap">
                            {post.content}
                          </p>
                        </>
                      )}
                      <div className="text-sm text-gray-400 mb-2">
                        By {post.author || "Unknown"} on {formatDate(getDateFromObject(post))}
                      </div>
                    </div>

                    {isOwner(post) && (
                      <div className="ml-4 space-x-2">
                        {editingPosts[post.id] ? (
                          <>
                            <button
                              onClick={() => handleEditPostSave(post.id)}
                              className="text-sm text-green-400 hover:underline"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => handleEditPostCancel(post.id)}
                              className="text-sm text-gray-300 hover:underline"
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
                              className="text-sm text-yellow-400 hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="text-sm text-red-400 hover:underline"
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
                      <button
                        onClick={() => handleLike(post.id)}
                        className="text-yellow-400 hover:underline mb-4"
                        aria-label={`Like post titled ${post.title}`}
                      >
                        Like ({post.likes || 0})
                      </button>

                      <div className="border-t border-gray-600 pt-4">
                        <h4 className="font-semibold mb-2 text-white">
                          Comments ({post.comments || 0})
                        </h4>

                        {(post.comments_list || []).map((comment) => (
                          <div
                            key={comment.id}
                            className="border border-gray-600 rounded p-3 mb-2 bg-gray-600"
                          >
                            <div className="flex justify-between items-center mb-1">
                              <div>
                                <span className="font-semibold">
                                  {comment.author}
                                </span>{" "}
                                <span className="text-gray-500 text-xs">
                                  • {formatDate(getDateFromObject(comment))}
                                </span>
                              </div>
                              {isOwner(post, comment) && (
                                <div className="space-x-2">
                                  {!editingComments[comment.id] ? (
                                    <>
                                      <button
                                        onClick={() =>
                                          handleEditCommentStart(
                                            comment.id,
                                            comment.content
                                          )
                                        }
                                        className="text-sm text-green-600 hover:underline"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleDeleteComment(
                                            post.id,
                                            comment.id
                                          )
                                        }
                                        className="text-sm text-red-600 hover:underline"
                                      >
                                        Delete
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() =>
                                          handleEditCommentSave(
                                            post.id,
                                            comment.id
                                          )
                                        }
                                        className="text-sm text-blue-600 hover:underline"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleEditCommentCancel(comment.id)
                                        }
                                        className="text-sm text-gray-600 hover:underline"
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
                                className="w-full p-2 border border-gray-300 rounded"
                                rows={2}
                                value={editingComments[comment.id]}
                                onChange={(e) =>
                                  handleEditCommentChange(
                                    comment.id,
                                    e.target.value
                                  )
                                }
                              />
                            ) : (
                              <p className="whitespace-pre-wrap">
                                {comment.content}
                              </p>
                            )}
                          </div>
                        ))}

                        <form onSubmit={(e) => handleCommentSubmit(e, post.id)}>
                          <textarea
                            placeholder="Add a comment..."
                            className="w-full p-2 border border-gray-300 rounded mb-2"
                            rows={2}
                            value={newComments[post.id] || ""}
                            onChange={(e) =>
                              handleCommentChange(post.id, e.target.value)
                            }
                          />
                          <button
                            type="submit"
                            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                          >
                            Submit
                          </button>
                        </form>
                      </div>
                    </>
                  )}
                </motion.div>
              ))
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
              <p className="text-gray-400">No announcements available.</p>
            ) : (
              announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="bg-gray-700 rounded-lg shadow-md p-6 border border-gray-600"
                >
                  <h3 className="text-lg font-bold mb-2 text-white">
                    {announcement.title}
                  </h3>
                  <p className="mb-2 whitespace-pre-wrap text-gray-300">
                    {announcement.content}
                  </p>
                  <div className="text-sm text-gray-400">
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
              <p className="text-gray-500">No challenges available.</p>
            ) : (
              challenges.map((challenge) => (
                <div
                  key={challenge.id}
                  className="bg-white rounded-lg shadow-md p-6"
                >
                  <h3 className="text-lg font-bold mb-2">{challenge.title}</h3>
                  <p className="mb-2 whitespace-pre-wrap">
                    {challenge.description}
                  </p>
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
    </>
  );
}

export default MemberCommunityPage;
