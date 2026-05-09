export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const headers = new Headers(init?.headers);

  if (token && token !== 'undefined' && token !== 'null') {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const method = init?.method?.toUpperCase() || 'GET';
  if (!headers.has('Content-Type') && init?.body && method !== 'GET' && method !== 'DELETE') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody?.message || errorBody?.title || JSON.stringify(errorBody) || errorMessage;
    } catch {
      try {
        const text = await response.text();
        if (text) errorMessage = text;
      } catch {}
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return null as unknown as T;
  }

  try {
    const text = await response.text();
    if (!text) return null as unknown as T;
    return JSON.parse(text) as T;
  } catch (err) {
    return null as unknown as T;
  }
}
