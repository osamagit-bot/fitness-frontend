/**
 * Utility functions for date formatting
 */

export const formatDate = (dateString) => {
  if (!dateString || dateString === 'null' || dateString === 'undefined') {
    return 'No date';
  }
  
  try {
    // Handle different date formats
    let date;
    
    if (typeof dateString === 'string') {
      // Handle empty strings
      if (dateString.trim() === '') return 'No date';
      
      // Replace any malformed date strings but keep valid characters
      const cleanedDateString = dateString.replace(/[^\d-:.TZ\s+]/g, '');
      if (cleanedDateString.length < 4) return 'No date'; // Too short to be a valid date
      
      date = new Date(cleanedDateString);
    } else if (dateString instanceof Date) {
      date = dateString;
    } else {
      date = new Date(dateString);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime()) || date.getFullYear() < 1900 || date.getFullYear() > 2100) {
      console.warn('Invalid date detected:', dateString);
      return 'No date';
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Date formatting error:', error, 'for input:', dateString);
    return 'No date';
  }
};

export const formatDateTime = (dateString) => {
  if (!dateString || dateString === 'null' || dateString === 'undefined') {
    return 'No date';
  }
  
  try {
    // Handle different date formats
    let date;
    
    if (typeof dateString === 'string') {
      // Handle empty strings
      if (dateString.trim() === '') return 'No date';
      
      // Replace any malformed date strings but keep valid characters
      const cleanedDateString = dateString.replace(/[^\d-:.TZ\s+]/g, '');
      if (cleanedDateString.length < 4) return 'No date';
      
      date = new Date(cleanedDateString);
    } else if (dateString instanceof Date) {
      date = dateString;
    } else {
      date = new Date(dateString);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime()) || date.getFullYear() < 1900 || date.getFullYear() > 2100) {
      console.warn('Invalid datetime detected:', dateString);
      return 'No date';
    }
    
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('DateTime formatting error:', error, 'for input:', dateString);
    return 'No date';
  }
};

/**
 * Helper function to extract date from object with multiple possible field names
 */
export const getDateFromObject = (obj) => {
  if (!obj) return null;
  
  // Try common date field names in order of preference
  const dateFields = ['date_created', 'created_at', 'date', 'timestamp', 'createdAt'];
  
  for (const field of dateFields) {
    if (obj[field]) {
      return obj[field];
    }
  }
  
  return null;
};

export const formatRelativeTime = (dateString) => {
  if (!dateString) return 'No date';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    const intervals = [
      { label: 'year', seconds: 31536000 },
      { label: 'month', seconds: 2592000 },
      { label: 'week', seconds: 604800 },
      { label: 'day', seconds: 86400 },
      { label: 'hour', seconds: 3600 },
      { label: 'minute', seconds: 60 }
    ];
    
    for (const interval of intervals) {
      const count = Math.floor(diffInSeconds / interval.seconds);
      if (count > 0) {
        return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`;
      }
    }
    
    return 'Just now';
  } catch (error) {
    console.error('Relative time formatting error:', error);
    return 'Invalid date';
  }
};
