const express = require('express');
const { exec } = require('child_process');

const app = express();
const cors = require('cors');

app.use(express.json());
app.use(cors());


app.post('/execute', (req, res) => {
  const code = req.body.code;
  console.log(code)
  
  exec(code, (error, stdout, stderr) => {
    console.log(error)
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    if (stderr) {
      res.status(200).json({ output: stderr });
      return;
    }

    res.status(200).json({ output: stdout });
  });
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});