/** @type {import("jest").Config} **/
export default {
  testEnvironment: "node",
  preset: "ts-jest",
  moduleFileExtensions: ["ts", "js", "json"],
  testMatch: ["**/*.test.ts"],
  testTimeout: 120000, // 2 minutes for migration tests
  bail: 1, // Stop after first test failure
  verbose: true, // Show individual test results
  silent: false, // Don't suppress console output
  collectCoverage: false, // Disable coverage to reduce noise
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
};
