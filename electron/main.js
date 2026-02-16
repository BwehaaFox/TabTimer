const { app, BrowserWindow, Tray, Menu, ipcMain, screen } = require('electron');
const path = require('path');
const url = require('url');

// Запрос блокировки одиночного экземпляра приложения
const gotTheLock = app.requestSingleInstanceLock();

// Если не удалось получить блокировку, значит уже запущен другой экземпляр
if (!gotTheLock) {
  app.quit();
  return; // Немедленно завершаем выполнение скрипта
}

// Если это первый экземпляр, слушаем попытку запуска второго
app.on('second-instance', (event, commandLine, workingDirectory) => {
  // Если кто-то пытается запустить второй экземпляр, фокусируем первое окно
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }
});

let mainWindow;
let tray = null;
let isDev = false;

// Проверяем, запускается ли приложение в режиме разработки
if (process.argv.includes('--dev')) {
  isDev = true;
}

function createWindow() {
  // Получаем размеры экрана
  const { width, height } =
    require('electron').screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    transparent: true, // Окно прозрачное
    frame: false, // Без рамки
    alwaysOnTop: true, // Поверх всех окон
    resizable: false, // Нельзя изменять размер
    skipTaskbar: true, // Не показывать в панели задач
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../electron/assets/icon.png'), // Путь к иконке
    hasShadow: false, // Убираем тень окна
  });
  // mainWindow.webContents.openDevTools();
  // Загружаем локальный файл или dev сервер
  if (isDev) {
    mainWindow.loadURL('http://localhost:4987'); // Адрес разработки Ember
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html')); // Путь к билду Ember
  }

  // Делаем окно кликабельным только в области .tabs-container
  mainWindow.setBackgroundColor('#00FFFFFF'); // Полностью прозрачный фон

  // Убираем возможность выделения и скроллинга за пределами нужной области
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.insertCSS(`
      body {
        -webkit-user-select: none;
      }

      /* Создаем прозрачный слой для перетаскивания окна */
      .tab-timer-container::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        -webkit-app-region: drag;
        z-index: 1;
      }

      /* Поднимаем интерактивные элементы над слоем перетаскивания */
      .tabs-container,
      .tab-item,
      .add-tab-button,
      .start-stop-button,
      .settings-button,
      .delete-button {
        position: relative;
        z-index: 2;
        -webkit-app-region: no-drag;
      }
    `);
  });

  // Игнорировать события мыши и пересылать их окнам ниже
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  // Устанавливаем приоритет окна "поверх всех" с более высоким уровнем
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // mainWindow.setFocusable(false);

  // Скрываем окно при закрытии, а не уничтожаем
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Добавляем обработчик для поддержания окна поверх других при активации
  mainWindow.on('blur', () => {
    // Когда окно теряет фокус, через короткое время снова устанавливаем его поверх
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
      }
    }, 100);
  });

  // startMouseTracking();

  // // Установим интервал для периодической проверки, что окно остается поверх других
  // setInterval(() => {
  //   if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
  //     mainWindow.setAlwaysOnTop(true, 'floating');
  //   }
  // }, 2000); // Проверяем каждые 2 секунды
}

function createTray() {
  tray = new Tray(path.join(__dirname, '../electron/assets/icon.png')); // Путь к иконке

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Закрыть приложение',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('TabTimer');

  // При правом клике показываем контекстное меню
  tray.on('right-click', () => {
    tray.popUpContextMenu();
  });

  // При клике на иконку в трее восстанавливаем фокус на приложение
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
      // Убедимся, что окно остается поверх других
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
  const webContents = event.sender;
  const win = BrowserWindow.fromWebContents(webContents);

  // Важно: на Windows/macOS используем forward: true,
  // чтобы события наведения всё равно приходили в JS
  win.setIgnoreMouseEvents(ignore, options);
});
