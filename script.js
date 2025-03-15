const client = new WebTorrent();
let player;

// Add more trackers
const trackers = [
    'wss://tracker.btorrent.xyz',
    'wss://tracker.openwebtorrent.com',
    'wss://tracker.fastcast.nz',
    'udp://tracker.opentrackr.org:1337/announce' // Fallback UDP tracker
];

// Function to start torrent with additional trackers
function startTorrent(torrentId) {
    if (!torrentId) {
        alert('Invalid torrent identifier. Please provide a valid .torrent file or magnet link.');
        return;
    }

    // Check if torrentId is a valid magnet link or Uint8Array
    if (typeof torrentId === 'string' && !isValidMagnetLink(torrentId)) {
        alert('Invalid magnet link. Please provide a valid magnet link.');
        return;
    } else if (torrentId instanceof Uint8Array && torrentId.length === 0) {
        alert('Invalid .torrent file. Please upload a valid .torrent file.');
        return;
    }

    client.add(torrentId, { announce: trackers }, torrent => {
        displayFiles(torrent);
        updateDownloadProgress(torrent);

        // Prioritize downloading for non-media files
        torrent.files.forEach(file => {
            if (!isMediaFile(file.name)) {
                file.priority = 1; // High priority for non-media files
            }
        });
    }).on('error', err => {
        console.error('Error adding torrent:', err);
        alert('Invalid torrent. Please upload a valid .torrent file or provide a valid magnet link.');
    });
}

// Check if a magnet link is valid
function isValidMagnetLink(link) {
    return link.startsWith('magnet:?');
}

// Check if a file is a media file
function isMediaFile(filename) {
    const mediaExtensions = ['.mp4', '.mkv', '.mp3', '.webm'];
    return mediaExtensions.some(ext => filename.endsWith(ext));
}

// Handle Magnet Link
function startMagnet() {
    const magnetLink = document.getElementById('magnetLink').value;
    if (!isValidMagnetLink(magnetLink)) {
        return alert('Invalid magnet link. Please enter a valid magnet link.');
    }
    startTorrent(magnetLink);
}

// Handle Torrent File Upload
document.getElementById('torrentFile').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (!file || !file.name.endsWith('.torrent')) {
        return alert('Please upload a valid .torrent file.');
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            // Convert the file data to a Uint8Array
            const torrentData = new Uint8Array(e.target.result);

            // Debugging: Log the torrent data
            console.log('Torrent data:', torrentData);

            // Validate the torrent data
            if (torrentData.length === 0) {
                throw new Error('The .torrent file is empty or invalid.');
            }

            // Start the torrent
            startTorrent(torrentData);
        } catch (err) {
            console.error('Error reading .torrent file:', err);
            alert('Error reading .torrent file. Please upload a valid file.');
        }
    };

    reader.onerror = function (err) {
        console.error('FileReader error:', err);
        alert('Error reading the file. Please try again.');
    };

    // Read the file as an ArrayBuffer
    reader.readAsArrayBuffer(file);
});

// Display Files in the Torrent
function displayFiles(torrent) {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = ''; // Clear previous list

    torrent.files.forEach(file => {
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item';

        // File name
        const fileName = document.createElement('span');
        fileName.textContent = file.name;
        listItem.appendChild(fileName);

        // Download button
        const downloadButton = document.createElement('button');
        downloadButton.className = 'btn btn-primary btn-sm';
        downloadButton.innerHTML = '<i class="fas fa-download"></i> Download';
        downloadButton.onclick = () => downloadFile(file);
        listItem.appendChild(downloadButton);

        // Stream button for media files
        if (isMediaFile(file.name)) {
            const streamButton = document.createElement('button');
            streamButton.className = 'btn btn-success btn-sm';
            streamButton.innerHTML = '<i class="fas fa-play"></i> Stream';
            streamButton.onclick = () => streamFile(file);
            listItem.appendChild(streamButton);
        }

        fileList.appendChild(listItem);
    });
}

// Update Download Progress
function updateDownloadProgress(torrent) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    // Update progress every second
    setInterval(() => {
        const percent = (torrent.progress * 100).toFixed(2);
        progressBar.style.width = `${percent}%`; // Update progress bar width

        const downloaded = (torrent.downloaded / 1024 / 1024).toFixed(2);
        const total = (torrent.length / 1024 / 1024).toFixed(2);
        const timeRemaining = torrent.timeRemaining / 1000;
        progressText.textContent = `${downloaded} MB of ${total} MB — ${timeRemaining.toFixed(2)} seconds remaining.`;
    }, 1000); // Update every second
}

// Download File
function downloadFile(file) {
    const blobStream = file.createReadStream(); // Create a readable stream
    const chunks = [];

    blobStream.on('data', chunk => {
        chunks.push(chunk); // Collect chunks of the file
    });

    blobStream.on('end', () => {
        // Combine chunks into a single Blob
        const blob = new Blob(chunks, { type: file.type });

        // Create a download link
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = file.name;
        link.click();

        // Clean up the object URL
        URL.revokeObjectURL(link.href);
    });

    blobStream.on('error', err => {
        console.error('Error downloading file:', err);
        alert('Error downloading file. Please try again.');
    });
}

// Stream File
function streamFile(file) {
    const videoPlayerContainer = document.getElementById('videoPlayer');
    const unmuteButton = document.getElementById('unmuteButton');
    videoPlayerContainer.innerHTML = ''; // Clear previous player

    // Create a new video element
    const videoElement = document.createElement('video');
    videoElement.controls = true; // Add controls to the video element
    videoElement.style.width = '100%'; // Make the video responsive
    videoPlayerContainer.appendChild(videoElement);

    // Render the file to the video element
    file.renderTo(videoElement, { controls: true }, err => {
        if (err) {
            console.error('Error rendering file:', err);
            alert('Error streaming file. Please try again.');
            return;
        }

        // Initialize Plyr
        player = new Plyr(videoElement, {
            controls: ['play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen']
        });

        // Show unmute button
        unmuteButton.style.display = 'block';
        unmuteButton.onclick = () => {
            player.muted = false;
            unmuteButton.style.display = 'none';
        };

        // Handle Plyr errors
        player.on('error', err => {
            console.error('Plyr error:', err);
            alert('Error initializing video player. Please try again.');
        });
    });
}

// Debugging
client.on('error', err => {
    console.error('WebTorrent error:', err);
});

client.on('warning', err => {
    console.warn('WebTorrent warning:', err);
});