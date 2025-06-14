# ffprobe-baron
Downloads ffprobe for use in npm/npx scripts

- Downloads the latest version of ffprobe

````
"scripts": {
    "ffprobe:version": "ffprobe -version",
    "ffprobe:tags": "ffprobe -show_format -print_format json music.mp3"
}
````
