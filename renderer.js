const { ipcRenderer, shell } = require("electron");
const ProgressBar = require("progressbar.js");
const util = require('util')
const child_process = require('child_process')
const exec = util.promisify(child_process.exec)
const execFile = util.promisify(child_process.execFile)

const downloadBtn = document.getElementById("download-btn");
const pauseBtn = document.getElementById("pause-btn");
const resumeBtn = document.getElementById("resume-btn");
const cancelBtn = document.getElementById("cancel-btn");
const openBtn = document.getElementById("open-btn")
const fileBtn = document.getElementById("file-btn")
const url =
  "https://cdn.zoom.us/prod/5.8.0.1780/Zoom.pkg";
  
downloadBtn.addEventListener("click", () => handleDownload(url));
pauseBtn.addEventListener("click", () => handlePause(url));
resumeBtn.addEventListener("click", () => handleResume(url));
cancelBtn.addEventListener("click", () => handleCancel(url));
openBtn.addEventListener("click", () => handleOpen('./tmp/FeiLian_Mac_v2.0.8_t116809_113c11.pkg'))
fileBtn.addEventListener("click", () => handleFile('./tmp/FeiLian_Mac_v2.0.8_t116809_113c11.pkg'))


const progressBar = new ProgressBar.Circle("#process", {
  strokeWidth: 10,
  easing: "easeInOut",
  duration: 1400,
  color: "#FFEA82",
  trailColor: "#eee",
  trailWidth: 8,
  svgStyle: null,
});


function handleDownload(download_url) {
  ipcRenderer.send("download-file", { download_url });
}

async function handleOpen(path) {
  console.log('handle open')
}

async function handleFile(path) {
  console.log('handle file')
  // await execFile(path)
  const { stdout } = await execFile('open', [path]);
  console.log(stdout);
}

function handlePause(url) {
  console.log('handle pause')
  ipcRenderer.send('download-paused', { url })
}

function handleResume(url) {
  console.log('handle resume')
  ipcRenderer.send('download-resumed', { url })
}

function handleCancel(url) {
  console.log('handle cancel')
  ipcRenderer.send('download-cancelled', { url })
}

ipcRenderer.on("progress-update", (event, progress) => {
  console.log(progress);
  progressBar.set(progress);
});

ipcRenderer.on("update-download-state", (event, item)=>{
  console.log(item.state)
})