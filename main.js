const { app, globalShortcut } = require("electron");
const { Menu, BrowserWindow, ipcMain } = require("electron/main");
const path = require("path");
const os = require("os");
const log = require("electron-log");

const imageMin = require("imagemin");
// allows access to folder
const { shell } = require("electron");
const imageMinMozJpeg = require("imagemin-mozjpeg");
const imageMinQuant = require("imagemin-pngquant");
const slash = require("slash");
let win;

const createWindow = () => {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    title: "Image compressor",
    resizable: true,
    backgroundColor: "#f4f4f4",
    // use the renderer script from frontend
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile("./app/index.html");
};

//handle event of opening the desktop window

app.whenReady().then(() => {
  createWindow();
  // receive data from renderer
  ipcMain.on("image:minimize", (e, options) => {
    // since options is an object attach the destination
    options.dest = path.join(os.homedir(), "imagecompressor");

    CompressImage(options);
  });

  //   handle compression
  async function CompressImage({ imgPath, quality, dest }) {
    try {
      const pngQuality = quality / 100;
      const files = await imageMin([slash(imgPath)], {
        destination: dest,
        plugins: [
          imageMinMozJpeg({ quality }),
          imageMinQuant({
            quality: [pngQuality, pngQuality],
          }),
        ],
      });
      log.info(files);
      shell.openPath(dest);

      // send to the renderer (main process to the renderer)
      win.webContents.send("image:done");
    } catch (error) {
      console.log(error);
    }
  }

  //setup menu
  const menu = [
    {
      label: "File",
      submenu: [
        {
          label: "Quit",
          //   add shortcut to menu
          accelerator:
            process.platform === "darwin" ? "Command + w" : "Ctrl + w",
          click: () => app.quit(),
        },
      ],
    },
  ];

  //build the menu
  const mainMenu = Menu.buildFromTemplate(menu);

  //   set the application menu to the main menu
  Menu.setApplicationMenu(mainMenu);

  //   toggle dev tools automatically on development
  win.webContents.openDevTools();

  //   add some global shortcuts
  //   {reload shortcut Ctrl + R}
  globalShortcut.register("CmdOrCtrl+R", () => win.reload());
  //   {reload shortcut Ctrl + Shift + D}
  globalShortcut.register("Ctrl + D", () => win.toggleDevTools());
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
