/**
 * Test configuration and environment setup
 */

export const TEST_CONFIG = {
  // Airport application URL
  airportUrl: "http://localhost:8000",
  handle: `migration-source.test`,
  targetHandle: `migration-target.test`,
  email: "testuser@example.com",
  password: "testpassword",
  timeout: 60_000,
};
