const API_URL = 'http://localhost:5000/api';

export const apiFetch = async (endpoint, options = {}) => {
  const token = JSON.parse(localStorage.getItem('sekawan-auth-storage'))?.state?.token;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Network error');
  }

  return response.json();
};
