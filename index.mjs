import fs from 'node:fs'
import { createWriteStream } from 'node:fs'
import os from 'node:os'
import { pipeline } from 'node:stream/promises'
import decompress from 'decompress'

const platform = os.platform()
const arch = os.arch()
const macosxDir = './__MACOSX'
let fileString = ''
let target = ''

function getArch() {
  if (platform === 'win32') {
    target = arch === 'x64' ? 'windows-64' : 'windows-32'
  }
  else if (platform === 'darwin') {
    target = arch === 'arm64' ? 'arm' : 'intel'
  }
  else if (platform === 'linux') {
    target = arch === 'x64' ? 'linux-64' : 'linux-32'
  }
  else {
    console.error('Unsupported platform/architecture.')
  }
}

async function downloadOsxExpertsBinariesFile() {
  try {
    let url = 'https://www.osxexperts.net'
    const response = await fetch(url)
    const html = await response.text()
    const regex = new RegExp(`href="([^"]*ffprobe[^"]*${target}[^"]*)"`)
    const match = html.match(regex)

    if (match && match[1]) {
      url = match[1]

      await downloadZip(url)
    }
    else {
      console.error('Could not find Apple Silicon build for FFProbe.')
    }
  }
  catch (error) {
    console.error('Error fetching FFProbe build:', error)
  }
}

async function downloadFfBinariesFile() {
  const url = 'https://ffbinaries.com/api/v1/version/latest'
  let downloadUrl = ''
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Error fetching download URL: ${response.status}`)
    }
    const json = await response.json()
    if (json.bin && json.bin[target] && json.bin[target].ffprobe) {
      downloadUrl = json.bin[target].ffprobe
    }
    else {
      throw new Error('ffprobe not found at ffbinaries.com')
    }
  }
  catch (error) {
    console.error('Error fetching download URL:', error.message)
  }
  await downloadZip(downloadUrl)
}

async function downloadZip(url) {
  try {
    const response = await fetch(url, { redirect: 'follow' })

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`)
    }

    const fileName = 'ffprobe.zip'
    const writeStream = createWriteStream(fileName)

    await pipeline(response.body, writeStream)

    fileString = fileName
    await unzip()

    if (platform === 'win32') {
      fs.copyFileSync('./ffprobe.exe', './ffprobe')
    }
  }
  catch (err) {
    console.error('Error downloading zip:', err)
    fs.unlinkSync('ffprobe.zip')
    fs.rmSync(macosxDir, { recursive: true, force: true })
  }
}

async function unzip() {
  try {
    await decompress(fileString, '.', {
      filter: file => file.path.includes('ffprobe'),
    })
    fs.unlinkSync(fileString)
    if (fs.existsSync(macosxDir)) {
      fs.rmSync(macosxDir, { recursive: true, force: true })
    }
  }
  catch (err) {
    console.error(err)
  }
}

(async () => {
  await getArch()
  if (platform === 'darwin') {
    downloadOsxExpertsBinariesFile()
  }
  else {
    downloadFfBinariesFile()
  }
})()
