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

function getLatestReleaseUrl() {
  if (platform === 'win32') {
    target = arch === 'x64' ? 'windows-64' : 'windows-32'
  }
  else if (platform === 'darwin') {
    target = arch === 'arm64' ? 'osx-arm64' : 'osx-64'
  }
  else if (platform === 'linux') {
    target = arch === 'x64' ? 'linux-64' : 'linux-32'
  }
  else {
    console.error('Unsupported platform/architecture.')
    return
  }
  if (target === 'osx-arm64') {
    console.warn('darwin arm64')
  }
  else {
    const base = 'https://ffbinaries.com/api/v1/version/latest'
    return new Promise((resolve, reject) => {
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
  }
}

function downloadFfBinariesFile(downloadUrl) {
  https.get(downloadUrl, (res) => {
    if (res.statusCode === 302 && res.headers.location) {
      return downloadFile(res.headers.location)
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
  const downloadUrl = await getLatestReleaseUrl()
  if (downloadUrl !== undefined)
    if (target === 'osx-arm64') {
      console.warn('download darwin arm64')
    } else {
      await downloadFfBinariesFile(downloadUrl)
    }
})()
