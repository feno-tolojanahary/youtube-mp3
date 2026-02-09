# MP3You Downloader

A command-line tool for downloading YouTube videos and playlists as MP3 audio files. It includes a download history to prevent re-downloading content.

## Features

- **YouTube to MP3**: Convert and download YouTube videos to MP3 format.
- **Playlist Support**: Download entire playlists. The tool intelligently skips videos that are already in your download history.
- **Download History**: Automatically keeps a log of downloaded videos in a `history.json` file to avoid duplicates.
- **Custom Naming**: Specify a custom name for single downloads or a custom album name for playlists.
- **Custom Output**: Choose where to save your downloaded files.

## Prerequisites

- [Node.js](https://nodejs.org/) (which includes npm)

This tool comes bundled with its own versions of `yt-dlp` and `ffmpeg`, so no external installation of these is required.

## Installation

1.  Clone or download this repository.
2.  Open a terminal in the project directory.
3.  Install the necessary dependencies:
    ```bash
    npm install
    ```

## Usage

The script is run from the command line using Node.js.

```bash
node index.js <url> [options]
```

### Options

| Flag                 | Description                                                  | Default         |
| -------------------- | ------------------------------------------------------------ | --------------- |
| `-o, --output <dir>` | Specifies the output directory for downloads.                | `./downloads`   |
| `-n, --name <name>`  | Sets a custom file name for a single video or an album name for a playlist. | YouTube Title   |
| `-p, --playlist`     | Enables playlist mode. Required when downloading a playlist. | `false`         |
| `-k, --skip-existing`| Skip download if the file already exists in the output directory. | `false`         |

---

## Examples

### 1. Download a Single Video

This will download the video to the `downloads` folder, using the video's title as the filename.

```bash
node index.js "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

### 2. Download a Single Video with a Custom Name

This will download the video as `My Song.mp3` in the `downloads` folder.

```bash
node index.js "https://www.youtube.com/watch?v=dQw4w9WgXcQ" -n "My Song"
```

### 3. Download a Playlist

This will download all videos from the playlist that are not already in your history. It uses the playlist title as the folder name.

```bash
node index.js "https://www.youtube.com/playlist?list=PL..." -p
```

### 4. Download a Playlist to a Specific Directory

This will download new videos from the playlist into `C:/MyMusic/My Cool Album/`.

```bash
node index.js "https://www.youtube.com/playlist?list=PL..." -p -o "C:/MyMusic" -n "My Cool Album"
```

## How the History Feature Works

The script creates and maintains a `history.json` file in the root directory.

- **For single videos**: If you try to download a video URL that is already in the history, the script will prompt you to confirm if you want to download it again.
- **For playlists**: When you download a playlist, the script fetches the URLs of all videos in it. It then compares them against the history and only downloads the ones that are not listed, effectively skipping duplicates. Each video is added to the history upon successful download.
