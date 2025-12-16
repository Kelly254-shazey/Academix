// Re-export the canonical API client from services so all imports
// referencing `src/utils/apiClient.js` will receive the authoritative
// `src/services/apiClient.js` implementation without changing imports.
import apiClient from '../services/apiClient';
export default apiClient;