// Visual tests: every docs example, in light and dark, screenshotted in
// Google Chrome (set PW_CHANNEL=msedge to use Edge instead).
const { defineConfig } = require("@playwright/test");

const PORT = 3012;

module.exports = defineConfig({
  testDir: "test",
  snapshotPathTemplate:
    "{testDir}/visual/__screenshots__/{projectName}/{arg}{ext}",
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
  expect: {
    toHaveScreenshot: { animations: "disabled", maxDiffPixelRatio: 0.01 },
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: process.env.PW_CHANNEL || "chrome",
    viewport: { width: 1000, height: 800 },
    deviceScaleFactor: 1,
  },
  projects: [
    { name: "build", testMatch: /build\.spec\.js/ },
    {
      name: "light",
      testMatch: /visual\/.*\.spec\.js/,
      use: { colorScheme: "light" },
    },
    {
      name: "dark",
      testMatch: /visual\/.*\.spec\.js/,
      use: { colorScheme: "dark" },
    },
  ],
  webServer: {
    command: `node test/serve.js ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
  },
});
