const buildHeaders = ({ token, headers, hasBody }) => {
  const next = { ...(headers || {}) };
  if (hasBody && !next['Content-Type']) {
    next['Content-Type'] = 'application/json';
  }
  if (token) {
    next.Authorization = `Bearer ${token}`;
  }
  return next;
};

export async function apiRequest(path, { method = 'GET', body, token, headers } = {}) {
  const response = await fetch(path, {
    method,
    headers: buildHeaders({ token, headers, hasBody: body !== undefined }),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data.message || data.error || 'Request failed';
    const error = new Error(typeof msg === 'string' ? msg : 'Request failed');
    error.status = response.status;
    throw error;
  }
  return data;
}

export const apiGet = (path, options = {}) => apiRequest(path, { ...options, method: 'GET' });
export const apiPost = (path, body, options = {}) => apiRequest(path, { ...options, method: 'POST', body });
export const apiPut = (path, body, options = {}) => apiRequest(path, { ...options, method: 'PUT', body });
export const apiDelete = (path, options = {}) => apiRequest(path, { ...options, method: 'DELETE' });
