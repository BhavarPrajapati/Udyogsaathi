const express = require('express');
const app = express();

app.use(express.json());

app.get('/api/test', (req, res) => {
  console.log('Test endpoint hit!');
  res.json({ message: 'Test server working!' });
});

app.listen(5001, () => {
  console.log('Test server running on port 5001');
});