/** @type {import("jest").Config} */
module.exports = {
  testEnvironment: "node",

  // only transform typescript files using ts-jest
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },

  // allow both .ts and .js tests
  moduleFileExtensions: ["ts", "js"],

  // match both backend and frontend tests
  testMatch: [
    "**/__tests__/**/*.test.(js|ts)",
    "**/?(*.)+(test).(js|ts)",
  ],

  // stop ts-jest from touching JS files
  transformIgnorePatterns: ["^.+\\.js$"],
};
