/**
 * Mock for axios
 * Used for mocking Airtable Meta API calls
 */

// Store for mock responses
let mockResponses = new Map();
let mockErrors = new Map();
let requestHistory = [];

/**
 * Reset all mock state
 */
function resetMocks() {
  mockResponses.clear();
  mockErrors.clear();
  requestHistory = [];
}

/**
 * Set a mock response for a URL
 * @param {string} url - URL to mock (can be partial match)
 * @param {object} response - Response data
 */
function setMockResponse(url, response) {
  mockResponses.set(url, response);
}

/**
 * Set a mock error for a URL
 * @param {string} url - URL to mock
 * @param {Error} error - Error to throw
 */
function setMockError(url, error) {
  mockErrors.set(url, error);
}

/**
 * Get request history
 * @returns {Array} Array of request objects
 */
function getRequestHistory() {
  return [...requestHistory];
}

/**
 * Find matching mock response/error for a URL
 */
function findMock(url, mockMap) {
  // Exact match
  if (mockMap.has(url)) {
    return mockMap.get(url);
  }

  // Partial match
  for (const [mockUrl, value] of mockMap.entries()) {
    if (url.includes(mockUrl)) {
      return value;
    }
  }

  return null;
}

/**
 * Mock axios.get
 */
async function mockGet(url, config = {}) {
  requestHistory.push({ method: 'GET', url, config });

  // Check for error
  const error = findMock(url, mockErrors);

  if (error) {
    throw error;
  }

  // Check for response
  const response = findMock(url, mockResponses);

  if (response) {
    return { data: response, status: 200 };
  }

  // Default: empty response
  return { data: {}, status: 200 };
}

/**
 * Mock axios.post
 */
async function mockPost(url, data, config = {}) {
  requestHistory.push({ method: 'POST', url, data, config });

  const error = findMock(url, mockErrors);

  if (error) {
    throw error;
  }

  const response = findMock(url, mockResponses);

  if (response) {
    return { data: response, status: 200 };
  }

  return { data: {}, status: 200 };
}

const mockAxios = {
  get: jest.fn(mockGet),
  post: jest.fn(mockPost),
  create: jest.fn(() => mockAxios),
  defaults: {
    headers: {
      common: {},
    },
  },
};

module.exports = mockAxios;
module.exports.resetMocks = resetMocks;
module.exports.setMockResponse = setMockResponse;
module.exports.setMockError = setMockError;
module.exports.getRequestHistory = getRequestHistory;
