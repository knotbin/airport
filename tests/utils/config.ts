/**
 * Test configuration and environment setup
 */

export const TEST_CONFIG = {
  // Airport application URL
  airportUrl: process.env.AIRPORT_URL || "http://127.0.0.1:8000",
  handle: `migration-source.test`,
  targetHandle: `migration-target.test`,
  email: "testuser@example.com",
  password: "testpassword",
  timeout: 60_000,
};
