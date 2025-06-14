# ffprobe-baron
Downloads a platform-specific static ffprobe binary for use in npm/npx scripts

- Downloads the latest version of ffprobe
- Downloads from https://www.osxexperts.net for darwin platform
- Downloads from https://ffbinaries.com/api/v1/version/latest for other platforms

````
"scripts": {
    "ffprobe:version": "ffprobe -version",
    "ffprobe:tags": "ffprobe -show_format -print_format json music.mp3"
}
````
