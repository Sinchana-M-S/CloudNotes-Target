const app = require('./app');

// VULNERABILITY #4: Prototype Pollution (CVE-2021-44906)
// minimist@1.2.5 is vulnerable to prototype pollution.
// An attacker can inject properties via __proto__ in CLI arguments.
const argv = require('minimist')(process.argv.slice(2), { ignoreUnknown: true });
const PORT = argv.port || process.env.PORT || 3000;

// Wait for DB to be ready before starting the server
app.dbReady.then(() => {
  app.listen(PORT, () => {
    console.log(`CloudNotes server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
