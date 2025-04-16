import https from 'https';
import fs from 'fs';
import os from 'os';
import decompress from 'decompress';
import { createWriteStream } from 'fs';

const platform = os.platform();
const arch = os.arch();

const options = { headers: { 'User-Agent': 'Node.js' } };

let fileString = '';

const getLatestReleaseUrl = () => {
  const base = 'https://ffbinaries.com/api/v1/version/latest';
  return new Promise((resolve, reject) => {
    https.get(base, options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        const info = JSON.parse(data);
        let target;

        if (platform === 'win32') {
          target = arch === 'x64' ? 'windows-64' : 'windows-32';
        } else if (platform === 'darwin') {
          target = arch === 'arm64' ? 'osx-arm64' : 'osx-64';
        } else if (platform === 'linux') {
          target = arch === 'x64' ? 'linux-64' : 'linux-32';
        } else {
          reject(new Error('Unsupported platform/architecture.'));
          return;
        }

        const url = info.bin[target].ffprobe;
        resolve(url);
      });
    }).on('error', reject);
  });
};

function downloadFile(downloadUrl) {
  https.get(downloadUrl, res => {
    if (res.statusCode === 302 && res.headers.location) {
      console.log('Redirected. Following to:', res.headers.location);
      return downloadFile(res.headers.location); // follow redirect
    }

    if (res.statusCode !== 200) {
      console.error(`Failed to download. HTTP status code: ${res.statusCode}`);
      return;
    }

    const disposition = res.headers['content-disposition'];
    let fileName = 'ffprobe.zip';

    if (disposition) {
      const match = disposition.match(/filename="?(.+?)"?(\s*;|$)/i);
      if (match && match[1]) {
        fileName = match[1];
      }
    }

    fileString = fileName;
    const writeStream = createWriteStream(fileName);

    res.pipe(writeStream);

    writeStream.on('finish', async () => {
      writeStream.close();
      console.log(`Download complete: ${fileName}`);
      await unzip();

      if (platform === 'win32') {
        fs.copyFileSync('./ffprobe.exe', './ffprobe')
      }

    });

    writeStream.on('error', err => {
      fs.unlinkSync(fileName);
      console.error('Error writing file:', err);
    });
  }).on('error', err => {
    console.error('Request error:', err);
  });
}


async function unzip() {
  try {
    await decompress(fileString, '.', {
      filter: file => file.path.includes('ffprobe'),
    });
    fs.unlinkSync(fileString);
    console.log('Extraction complete. Cleaned up archive.');
  }
  catch (err) {
    console.error('Error extracting ffprobe:', err);
  }
}

const downloadUrl = await getLatestReleaseUrl();
console.log(`Downloading ffprobe from ${downloadUrl}`);
await downloadFile(downloadUrl);
