const express = require('express');
const vm = require('vm');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());


app.post('/execute', (req, res) => {
  const code = req.body.code;
  console.log(code)

  // Cria um contexto de execução isolado
  const sandbox = { console: {} };
  sandbox.console.log = function (message) {
    // Armazena a saída do console em uma variável para retornar ao cliente
    if (!sandbox.output) {
      sandbox.output = message;
    } else {
      sandbox.output += '\n' + message;
    }
  };

  try {
    // Executa o código no contexto isolado
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);

    const output = sandbox.output || '';
    res.status(200).json({ output });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});