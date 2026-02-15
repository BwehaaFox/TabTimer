const { spawn } = require('child_process');
const http = require('http');

console.log('Запуск сервера Ember и Electron...');

// Запускаем сервер Ember
const emberServer = spawn('yarn', ['start'], {
  cwd: __dirname,
  shell: true,
});

let emberReady = false;

emberServer.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(`Ember: ${output}`);

  // Проверяем, готов ли сервер Ember
  if (
    output.includes('Build successful') &&
    output.includes('Serving on http://localhost')
  ) {
    emberReady = true;
    console.log('Сервер Ember готов, запускаем Electron...');
    startElectron();
  }
});

emberServer.stderr.on('data', (data) => {
  console.error(`Ember ошибка: ${data}`);
});

emberServer.on('close', (code) => {
  console.log(`Сервер Ember завершен с кодом ${code}`);
});

let electronStarted = false;

function startElectron() {
  if (!electronStarted && emberReady) {
    electronStarted = true;

    // Запускаем Electron
    const electronApp = spawn('yarn', ['electron-dev'], {
      cwd: __dirname,
      shell: true,
    });

    electronApp.stdout.on('data', (data) => {
      console.log(`Electron: ${data}`);
    });

    electronApp.stderr.on('data', (data) => {
      console.error(`Electron ошибка: ${data}`);
    });

    electronApp.on('close', (code) => {
      console.log(`Electron завершен с кодом ${code}`);
    });

    // При завершении основного процесса завершаем и дочерние процессы
    process.on('exit', () => {
      emberServer.kill();
      electronApp.kill();
    });

    process.on('SIGINT', () => {
      emberServer.kill();
      electronApp.kill();
      process.exit();
    });
  }
}

// Также можем проверить доступность сервера по HTTP
function checkEmberServer() {
  const options = {
    host: 'localhost',
    port: 4201,
    path: '/',
    timeout: 2000,
  };

  const request = http.request(options, (res) => {
    if (res.statusCode === 200 && !emberReady) {
      emberReady = true;
      console.log('Сервер Ember доступен, запускаем Electron...');
      startElectron();
    }
  });

  request.on('error', (err) => {
    // Сервер еще не готов
  });

  request.end();
}

// Периодически проверяем доступность сервера
const checkInterval = setInterval(() => {
  if (!emberReady) {
    checkEmberServer();
  } else {
    clearInterval(checkInterval);
  }
}, 2000);
