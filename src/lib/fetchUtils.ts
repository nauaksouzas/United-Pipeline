
/**
 * A safe fetch wrapper that reads response as text first to handle non-JSON errors gracefully.
 * This prevents "Unexpected token <" errors and provides better debugging info.
 */
export async function safeFetch(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    // Default to include credentials for AI Studio environment
    credentials: options.credentials || 'include',
  });

  const text = await response.text();
  
  // Log non-JSON or error responses for debugging
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    if (text.includes('Cookie check')) {
      console.warn('[safeFetch] Intercepted by Platform Cookie Check');
      throw new Error("Action required: Your browser is blocking a security cookie. Please open in a new tab.");
    }
    console.error(`[safeFetch] Received non-JSON response from ${url}:`, text.substring(0, 500));
    throw new Error(`Server returned non-JSON response (${response.status})`);
  }

  try {
    const data = JSON.parse(text);
    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }
    return data;
  } catch (e) {
    console.error(`[safeFetch] Failed to parse JSON from ${url}. Body:`, text);
    throw new Error("Failed to process server response.");
  }
}
