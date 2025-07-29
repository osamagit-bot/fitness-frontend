import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { showToast } from '../utils/toast';

export const useCommunityFeed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const token = localStorage.getItem("member_access_token");
  const memberID = localStorage.getItem("member_id");

  const fetchPosts = useCallback(async (pageNum = 1, reset = false) => {
    try {
      const response = await api.get(`community/posts/?page=${pageNum}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const newPosts = response.data.results || response.data;
      
      if (reset) {
        setPosts(newPosts);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
      }
      
      setHasMore(response.data.next !== null);
      setError(null);
    } catch (err) {
      setError('Failed to load posts');
      showToast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const createPost = async (postData) => {
    try {
      const response = await api.post('community/posts/', {
        ...postData,
        memberID
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setPosts(prev => [{ ...response.data, comments_list: [] }, ...prev]);
      showToast.success('Post created successfully!');
      return response.data;
    } catch (err) {
      showToast.error('Failed to create post');
      throw err;
    }
  };

  const toggleLike = async (postId) => {
    // Optimistic update
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, likes: (post.likes || 0) + (post.liked ? -1 : 1), liked: !post.liked }
        : post
    ));

    try {
      const response = await api.post(`community/posts/${postId}/like/`, null, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update with server response
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, likes: response.data.likes_count, liked: response.data.liked }
          : post
      ));
    } catch (err) {
      // Revert optimistic update
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, likes: (post.likes || 0) + (post.liked ? 1 : -1), liked: !post.liked }
          : post
      ));
      showToast.error('Failed to toggle like');
    }
  };

  const updatePost = (postId, updates) => {
    setPosts(prev => prev.map(post => 
      post.id === postId ? { ...post, ...updates } : post
    ));
  };

  const deletePost = (postId) => {
    setPosts(prev => prev.filter(post => post.id !== postId));
  };

  const addComment = (postId, comment) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { 
            ...post, 
            comments_list: [...(post.comments_list || []), comment],
            comments: (post.comments || 0) + 1
          }
        : post
    ));
  };

  const updateComment = (postId, commentId, updates) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? {
            ...post,
            comments_list: post.comments_list.map(comment => 
              comment.id === commentId ? { ...comment, ...updates } : comment
            )
          }
        : post
    ));
  };

  const deleteComment = (postId, commentId) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? {
            ...post,
            comments_list: (post.comments_list || []).filter(comment => 
              comment.id !== commentId && comment.parent_comment !== commentId
            ),
            comments: Math.max((post.comments || 1) - 1, 0)
          }
        : post
    ));
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      setLoading(true);
      setPage(prev => prev + 1);
      fetchPosts(page + 1);
    }
  };

  useEffect(() => {
    if (token) {
      fetchPosts(1, true);
    }
  }, [fetchPosts, token]);

  return {
    posts,
    setPosts,
    loading,
    error,
    hasMore,
    createPost,
    toggleLike,
    loadMore,
    updatePost,
    deletePost,
    addComment,
    updateComment,
    deleteComment,
    refetch: () => fetchPosts(1, true)
  };
};