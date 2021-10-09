const { app, BrowserWindow, Menu, ipcMain, session } = require("electron");
const path = require("path");

let mainWindow;
const cacheDownloadItem = {}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  mainWindow.webContents.session.on(
    "will-download",
    (event, item, webContents) => {
      try {
        // 无需对话框提示， 直接将文件保存到路径
        const url = item.getURL()
        let cacheItem = cacheDownloadItem[url] || { notSend: true }
        const totalBytes = item.getTotalBytes();
        const fileName = item.getFilename();
        item.setSavePath(`./tmp/${fileName}`);
        

        cacheItem._downloadItem = item//下载对象
        cacheItem.path = item.getSavePath();//保存地址
        cacheItem.eTag = item.getETag();//资源标识
        cacheItem.urlChain = item.getURLChain();//下载地址
        cacheItem.length = totalBytes//资源大小
        cacheItem.lastModified = item.getLastModifiedTime()//资源最后一次更新的时间
        cacheItem.startTime = item.getStartTime();

        let lastBytes = 0

        item.on("updated", (event, state) => {
          if (state === "interrupted") { // 是否下载中断
            cacheItem.state = 'interrupted'
            console.log("Download is interrupted but can be resumed");
          } else if (state === "progressing") {
            if (item.isPaused()) {
              cacheItem.state = 'paused'
              console.log("Download is paused");
            } else {
              // 保存当前下载行为
              let offset = item.getReceivedBytes();
              cacheItem.state = 'downloading'
              cacheItem.speedBytes = offset - lastBytes;//下载速度
              cacheItem.progress = offset / totalBytes
              cacheItem.offset = offset//已经下载
              lastBytes = offset

              webContents.send(
                "progress-update",
                cacheItem.progress
              );
              console.log(`Received bytes: ${item.getReceivedBytes()}`);
            }
          }
          cacheItem && !cacheItem.notSend && webContents.send('update-download-state', JSON.parse(JSON.stringify(cacheItem)))
        });

        // 下载完成
        item.once("done", (event, state) => {
          cacheItem.done = 'end';
          switch (state) {
            case 'interrupted':
              cacheItem.state = 'interrupted-err';
              console.log(`Download failed: ${cacheItem.state}`);
              break;
            case 'cancelled':
              cacheItem.state = 'cancelled';
              console.log(`Download failed: ${cacheItem.state}`);
              break;
            default:
              cacheItem.state = 'completed';
              console.log("Download successfully");
              // 删除缓存
              // delete cacheDownloadItem[url]
              // cacheItem = null
              // item = null
              break;
          }
          cacheItem && !cacheItem.notSend && webContents.send('update-download-state', JSON.parse(JSON.stringify(cacheItem)));

          // 向后端提交文件状态

          // 删除缓存
          delete cacheDownloadItem[url]
          cacheItem = null
          item = null
        });

        // 恢复
        if (item.canResume) {
          item.resume()
        }
      } catch (error) {
        console.log(error)
      }
    }
  );

  mainWindow.webContents.openDevTools();
  mainWindow.loadFile("index.html");
  // mainWindow.loadURL('http://localhost:3000');
}

const dockMenu = Menu.buildFromTemplate([
  {
    label: "New Window",
    click() {
      console.log("new window");
    },
  },
  {
    label: "New Window with Settings",
    submenu: [{ label: "Basic" }, { label: "Pro" }],
  },
  { label: "New Command..." },
]);

app
  .whenReady()
  .then(() => {
    console.log(process.platform);
    if (process.platform === "darwin") {
      app.dock.setMenu(dockMenu);
    }
  })
  .then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

//下载
ipcMain.on('download-file', (e, data) => {
  const { download_url } = data
  if (!cacheDownloadItem[download_url]) {
    cacheDownloadItem[download_url] = { ...data }
    downloadFile(download_url);
  } else {
    // e.sender('down-file', '文件正在下载')
    console.log('文件正在下载');
  }
})

const downloadFile = (url) => {
  mainWindow.webContents.downloadURL(url);
  // session.defaultSession.downloadURL(url);
}

// 暂停
ipcMain.on('download-paused', (e, data) => {
  const { url } = data;
  const t = cacheDownloadItem[url]; // 拿到缓存上的当前下载参数
  if (t) {
    t._downloadItem.pause();
  }
  console.log('download-paused');
})

// 断点恢复下载
ipcMain.on('download-resumed', (e, data) => {
  const { url } = data
  const t = cacheDownloadItem[url]
  if (t) {
    t._downloadItem.resume()
  } else {
    cacheDownloadItem[url] = { ...data }
    resumeDownload(data)
  }
  console.log('download-resumed');
})

// 恢复下载
const resumeDownload = (obj = {}) => {
  const { path = '', urlChain = [], offset = 0, length = 0, lastModified, eTag, startTime } = obj
  if (!path || urlChain.length === 0 || length === 0) {
    return
  }
  session.defaultSession.createInterruptedDownload({
    path, urlChain, offset, length, lastModified, eTag, startTime
  })
}

ipcMain.on('download-cancelled', (e, data) => {
  const { url } = data;
  const t = cacheDownloadItem[url];
  if (t) {
    t._downloadItem.cancel();
    // delete cacheDownloadItem[url]
  } else {
    // 删除未下载完成文件
  }
  console.log('download-cancelled')
})


// 断点续传对象示例
const a = {
  path: './tmp/FeiLian_Mac_v2.0.8_t116809_113c11.pkg',
  eTag: '"113c11a9911be8ff35fbd6abc3d677ed"',
  urlChain: [
    'https://oss-s3.ifeilian.com/mac/FeiLian_Mac_v2.0.8_t116809_113c11.pkg'
  ],
  length: 140659816,
  lastModified: 'Mon, 27 Sep 2021 12:56:15 GMT',
  startTime: 1632992629.608696,
  speedBytes: 8370620,
  offset: 8370620
}