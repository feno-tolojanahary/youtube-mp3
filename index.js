#!/usr/bin/env node
import { Command } from "commander";
import { spawn, exec, execSync } from "child_process";
import path from "path";
import fs from "fs";
import readline from "readline";
import { fileURLToPath } from "url";

const program = new Command();

// Common paths and constants
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HISTORY_FILE = path.join(__dirname, "history.json");
const FFMPEG_LOCATION = path.join(__dirname, "bin/ffmpeg/bin");
const YT_DLP = path.join(__dirname, "bin/yt-dlp.exe");

// --- History Functions ---

function getHistory() {
  if (fs.existsSync(HISTORY_FILE)) {
    try {
      const data = fs.readFileSync(HISTORY_FILE, "utf8");
      return JSON.parse(data);
    } catch (e) {
      console.error("Could not read or parse history file. Starting fresh.");
      return [];
    }
  }
  return [];
}

function addToHistory(url) {
  const history = getHistory();
  if (!history.some(entry => entry.url === url)) {
    history.push({ url, downloadedAt: new Date().toISOString() });
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
    console.log(`URL added to download history: ${url}`);
  }
}

// --- Download Functions ---

/**
 * Downloads a single video/audio from a given URL.
 * @param {string} urlToDownload The direct URL to the video.
 * @param {object} opts The command-line options.
 * @returns {Promise<void>} A promise that resolves when the download is complete.
 */
function downloadSingle(urlToDownload, opts) {
  const { output, name, playlist, skipExisting } = opts;
  return new Promise((resolve, reject) => {
    let outputTemplate;
    if (playlist) {
      outputTemplate = name
        ? `${output}/${name}/%(playlist_index)s - %(title)s.%(ext)s`
        : `${output}/%(playlist_title)s/%(playlist_index)s - %(title)s.%(ext)s`;
    } else {
      outputTemplate = name ? `${output}/${name}.%(ext)s` : `${output}/%(title)s.%(ext)s`;
    }

    const args = [
      "-x",
      "--ffmpeg-location", FFMPEG_LOCATION,
      "--audio-format", "mp3",
      "--restrict-filenames",
      "-o", outputTemplate,
      urlToDownload,
    ];

    if (skipExisting) {
      args.push("--no-overwrites");
    }

    const yt = spawn(YT_DLP, args, { stdio: "inherit" });

    yt.on("close", code => {
      if (code === 0) {
        console.log(`\nSuccessfully downloaded: ${urlToDownload}`);
        addToHistory(urlToDownload);
        resolve();
      } else {
        console.log(`\nDownload failed with code ${code} for: ${urlToDownload}`);
        reject(new Error(`Download failed with code ${code}`));
      }
    });

    yt.on("error", err => {
      console.error(`\nError spawning yt-dlp for: ${urlToDownload}`, err);
      reject(err);
    });
  });
}

/**
 * Fetches all individual video URLs from a playlist URL.
 * @param {string} playlistUrl The URL of the playlist.
 * @returns {string[]} An array of individual video URLs.
 */
function getPlaylistVideoUrls(playlistUrl) {
  console.log("Fetching video URLs from playlist...");
  try {
    const command = `"${YT_DLP}" --flat-playlist -j "${playlistUrl}"`;
    const output = execSync(command, { encoding: "utf8" });
    const urls = output
      .split("\n")
      .filter(line => line.trim())
      .map(line => JSON.parse(line).url);
    console.log(`Found ${urls.length} videos in the playlist.`);
    return urls;
  } catch (error) {
    console.error("Failed to fetch playlist videos. Please ensure the URL is correct and yt-dlp is working.", error);
    return [];
  }
}

/**
 * Handles the entire process for downloading a playlist.
 * @param {string} playlistUrl The URL of the playlist.
 * @param {object} opts The command-line options.
 */
async function handlePlaylist(playlistUrl, opts) {
  const allVideoUrls = getPlaylistVideoUrls(playlistUrl);
  if (allVideoUrls.length === 0) {
    return;
  }

  const history = getHistory();
  const urlsToDownload = allVideoUrls.filter(url => !history.some(entry => entry.url === url));

  if (urlsToDownload.length === 0) {
    console.log("All videos in this playlist are already in your download history.");
    return;
  }

  console.log(`\nFound ${urlsToDownload.length} new videos to download.`);
  let successCount = 0;
  let failCount = 0;

  for (const [index, videoUrl] of urlsToDownload.entries()) {
    console.log(`\n[${index + 1}/${urlsToDownload.length}] Starting download for: ${videoUrl}`);
    try {
      await downloadSingle(videoUrl, { ...opts, playlist: true }); // Force playlist naming scheme
      successCount++;
    } catch (error) {
      failCount++;
      console.log(`Skipping to next video due to error.`);
    }
  }

  console.log(`\nPlaylist processing complete. ${successCount} successful downloads, ${failCount} failures.`);
  if (successCount > 0) {
    exec(`start "" "${path.resolve(opts.output)}"`);
  }
}

// --- Main Execution ---

function main() {
  program
    .argument("<url>")
    .option("-o, --output <dir>", "output directory", "./downloads")
    .option("-n, --name <name>", "base file or album name")
    .option("-p, --playlist", "force playlist mode")
    .option("-k, --skip-existing", "Skip download if file already exists")
    .parse();

  const opts = program.opts();
  const url = program.args[0];

  // Ensure output folder exists
  if (!fs.existsSync(opts.output)) {
    fs.mkdirSync(opts.output, { recursive: true });
  }

  if (opts.playlist) {
    handlePlaylist(url, opts);
  } else {
    // Standard single video download flow
    const history = getHistory();
    if (history.some(entry => entry.url === url)) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question("This URL is already in your download history. Download again? (y/n) ", answer => {
        rl.close();
        if (answer.toLowerCase() === "y") {
          console.log("Re-downloading...");
          downloadSingle(url, opts).then(() => {
            console.log("Download finished.");
            exec(`start "" "${path.resolve(opts.output)}"`);
          });
        } else {
          console.log("Download skipped.");
        }
      });
    } else {
      downloadSingle(url, opts).then(() => {
        console.log("Download finished.");
        exec(`start "" "${path.resolve(opts.output)}"`);
      });
    }
  }
}

main();
