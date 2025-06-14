import fs from 'node:fs'
import { createWriteStream } from 'node:fs'
import https from 'node:https'
import os from 'node:os'
import decompress from 'decompress'

const platform = os.platform()
const arch = os.arch()

const options = { headers: { 'User-Agent': 'Node.js' } }

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
    let response = await fetch(url)
    const html = await response.text()
    console.log(`target is ${target}`)
    const regex = new RegExp(`href="([^"]*ffprobe[^"]*${target}[^"]*)"`)
    const match = html.match(regex)

    if (match && match[1]) {
      url = match[1]
      console.log('Found FFProbe Apple Silicon build at:', url)

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
  const downloadUrl = await new Promise((resolve, reject) => {
    https.get(base, options, (res) => {
      let data = ''
      res.on('data', chunk => (data += chunk))
      res.on('end', () => {
        const info = JSON.parse(data)
        const url = info.bin[target].ffprobe
        resolve(url)
      })
    }).on('error', reject)
  })
  await downloadZip(downloadUrl)
}

async function downloadZip(url) {
  https.get(url, (res) => {
    if (res.statusCode === 302 && res.headers.location) {
      url = res.headers.location
    }

    if (res.statusCode !== 200) {
      return
    }

    const disposition = res.headers['content-disposition']
    let fileName = 'ffprobe.zip'

    if (disposition) {
      const match = disposition.match(/filename="?(.+?)"?(\s*;|$)/i)
      if (match && match[1]) {
        fileName = match[1]
      }
    }

    fileString = fileName
    const writeStream = createWriteStream(fileName)

    res.pipe(writeStream)

    writeStream.on('finish', async () => {
      writeStream.close()
      await unzip()

      if (platform === 'win32') {
        fs.copyFileSync('./ffprobe.exe', './ffprobe')
      }
    })

    writeStream.on('error', () => {
      fs.unlinkSync(fileName)
      fs.rmSync('__MACOSX', { recursive: true, force: true })
    })
  }).on('error', (err) => {
    console.error(err)
  })
}

async function unzip() {
  try {
    await decompress(fileString, '.', {
      filter: file => file.path.includes('ffprobe'),
    })
    fs.unlinkSync(fileString)
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
    await downloadFfBinariesFile()
  }
})()
