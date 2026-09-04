const app = require('./app');

const PORT = process.env.PORT || 3000;

// Wait for DB to be ready before starting the server
app.dbReady.then(() => {
  app.listen(PORT, () => {
    console.log(`CloudNotes server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
