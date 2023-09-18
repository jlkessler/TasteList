playlistName = "";
playlist_id = -1;
const streaming_service = 'S';

// Function to get query parameters from the URL
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

async function checkAccessTokenValidity(accessToken) {
    try {
        const response = await fetch('https://api.spotify.com/v1/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        return response.ok;
    } catch (error) {
        //console.error('Error checking access token validity:', error);
        return false;
    }
}

async function addSongToDatabase(isrc, name, artist, album, playlist_id, user_id) {
    return new Promise((resolve, reject) => {
        // Make an AJAX request to the add_song.php file in the app directory
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/app/add_song.php', true); // Update the path here
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    // Resolve the promise with the server response
                    //resolve(xhr.responseText);
                    postSongToExternalConnection(isrc);
                    resolve();
                } else {
                    // Reject the promise with an error message
                    reject(new Error(`Request failed with status ${xhr.status}`));
                }
            }
        };

        const songData = {
            isrc: isrc,
            name: name,
            artist: artist,
            album: album,
            playlist_id: playlist_id,
            user_id: user_id
        };

        const params = `isrc=${songData.isrc}&name=${songData.name}&artist=${songData.artist}&album=${songData.album}&playlist_id=${songData.playlist_id}&user_id=${songData.user_id}`;
        xhr.send(params);
    });
}


async function fetchTracksBySongName(songName) {

    // Construct the URL for searching by song name
    const spotifyAPIEndpoint = 'https://api.spotify.com/v1/search';
    const type = 'track';
    const market = 'US';
    const limit = 50;
    const offset = 0;

    const url = `${spotifyAPIEndpoint}?q=${encodeURIComponent(songName)}&type=${type}&market=${market}&limit=${limit}&offset=${offset}`;
    const accessToken = localStorage.getItem('accessToken');

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const data = await response.json();
        return data.tracks.items;
    } catch (error) {
        // Handle any errors that occur during the request
        console.error('Error:', error);
        throw error; // Rethrow the error to propagate it up
    }
}

async function processTracks(songName) {
    try {
        // Fetch tracks based on the song name
        const tracks = await fetchTracksBySongName(songName);

        // Process each track
        for (const track of tracks) {
            const trackName = track.name;
            const artistName = track.artists.map(artist => artist.name).join(', ');
            const albumName = track.album.name;
            const isrcCode = track.external_ids.isrc;

            // Create a new list item element
            const listItem = document.createElement('li');

            // Set the text content to display the song name
            listItem.textContent = `${trackName} - ${artistName}`;

            // Store the other track information as data attributes
            listItem.setAttribute('data-name', trackName);
            listItem.setAttribute('data-artist', artistName);
            listItem.setAttribute('data-album', albumName);
            listItem.setAttribute('data-isrc', isrcCode);

            listItem.addEventListener('click', async (event) => {
                // Access the stored data attributes
                const clickedSongName = listItem.getAttribute('data-name');
                const clickedArtistName = listItem.getAttribute('data-artist');
                const clickedAlbumName = listItem.getAttribute('data-album');
                const clickedIsrcCode = listItem.getAttribute('data-isrc');

                // Add song to database and playlist
                const user_id = localStorage.getItem('user_id');

                try {
                    await addSongToDatabase(clickedIsrcCode, clickedSongName, clickedArtistName, clickedAlbumName, playlist_id, user_id);

                    // Close the add song modal
                    addSongModal.style.display = "none";

                    // Clear any previous input
                    searchButtonInput.value = "";

                    // Clear list
                    while (searchResultsContainer.firstChild) {
                        searchResultsContainer.removeChild(searchResultsContainer.firstChild);
                    }

                    displayPlaylistSongs();
                } catch (error) {
                    // Handle any errors that occurred during the addition of the song
                    console.error(error);
                    // Optionally, display an error message to the user
                    // You can decide how to handle errors based on your application's requirements
                }
            });


            // Append the list item to the search results container
            searchResultsContainer.appendChild(listItem);
        }

    } catch (error) {
        // Handle any errors that occur during processing
        console.error('Error during processing:', error);
    }
}

// Add click event listener to the "Add Song" button
const addSongButton = document.getElementById("addSongButton");
const addSongModal = document.getElementById("addSongModal");
const searchButton = document.getElementById("searchButton");
const searchButtonInput = document.getElementById("songSearchBar");
const searchResultsContainer = document.getElementById("searchResults");
const songList = document.getElementById("songList");
searchResultsContainer.innerHTML = "";

async function getSpotifyUri(isrcCode, accessToken) {
    // Spotify API endpoint to search for a track by ISRC code
    const searchEndpoint = `https://api.spotify.com/v1/search?q=isrc:${isrcCode}&type=track&limit=1`;

    // Headers with the access token
    const headers = {
        Authorization: `Bearer ${accessToken}`,
    };

    try {
        // Make the GET request to search for the track
        const response = await fetch(searchEndpoint, {
            method: 'GET',
            headers: headers,
        });

        if (response.status === 200) {
            const data = await response.json();
            if (data.tracks && data.tracks.items.length > 0) {
                return data.tracks.items[0].uri;
            } else {
                console.error('Track not found.');
                return null;
            }
        } else {
            console.error('Error searching for track');
            return null;
        }
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function postSongToExternalConnection(isrcCode) {
    try {

        // get user_id
        const user_id = localStorage.getItem('user_id');

        // Make an AJAX request to get_songs.php with playlist_id as a parameter
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `/app/get_external_connection.php?playlist_id=${playlist_id}&user_id=${user_id}`, true); // Pass playlist_id as a parameter
        xhr.setRequestHeader('Content-type', 'application/json');
        xhr.onreadystatechange = async function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    const accessToken = localStorage.getItem('accessToken');
                    let spotifyUri = await getSpotifyUri(isrcCode, accessToken);

                    // Parse the JSON response to get the external_playlist_id
                    const external_playlist_id = JSON.parse(xhr.responseText).external_playlist_id;

                    if (streaming_service === 'S' && spotifyUri) {
                        // Spotify API endpoint to add a track to a playlist
                        const endpoint = `https://api.spotify.com/v1/playlists/${external_playlist_id}/tracks?uris=${encodeURIComponent(spotifyUri)}`;

                        // Headers with the access token and content type
                        const headers = {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        };

                        // Request body
                        const data = JSON.stringify({
                            uris: "string",
                            position: 0, // Specify the position where you want to add the track
                        });

                        try {
                            // Make the POST request using fetch
                            const response = await fetch(endpoint, {
                                method: 'POST',
                                headers: headers,
                                body: data,
                            });

                            if (response.status === 201) {
                                //console.log('Track added to playlist successfully.');
                            } else {
                                console.error('Failed to add the track to the playlist.');
                            }
                        } catch (error) {
                            console.error('Error:', error);
                        }
                    }
                } else {
                    console.error("Error fetching playlist connection:", xhr.statusText);
                }
            }
        };

        xhr.send();
    } catch (error) {
        console.error("Error fetching playlist connection:", error);
    }
}

async function displayPlaylistSongs() {
    try {

        const user_id = localStorage.getItem('user_id');

        // Make an AJAX request to get_songs.php with playlist_id as a parameter
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `/app/get_songs.php?playlist_id=${playlist_id}`, true); // Pass playlist_id as a parameter
        xhr.setRequestHeader('Content-type', 'application/json');
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    // Parse the JSON response
                    //console.log(xhr.responseText);
                    const song_details = JSON.parse(xhr.responseText);

                    // Clear the list
                    songList.innerHTML = "";

                    if (song_details.length === 0) {
                        // Handle case when no songs in playlist
                        songList.innerHTML = "<p>No songs found.</p>";
                    } else {
                        song_details.forEach((song) => {
                            const listItem = document.createElement("li");

                            // Create a string with all the song information
                            const songInfo = `${song.song_name} - ${song.artist}, Album: 
                            ${song.album}, Added by: ${song.username} (${song.streaming_service}), Added on: ${song.added_datetime}`;

                            // Set the text content of the list item to the song information
                            listItem.textContent = songInfo;

                            songList.appendChild(listItem);
                        });
                    }

                } else {
                    console.error("Error fetching playlist songs:", xhr.statusText);
                }
            }
        };

        xhr.send();
    } catch (error) {
        console.error("Error fetching playlist songs:", error);
    }
}

addSongButton.addEventListener("click", () => {
    // Show the add song modal
    addSongModal.style.display = "block";
    searchButtonInput.value = ""; // Clear any previous input
});

searchButton.addEventListener("click", async () => {
    searchResultsContainer.innerHTML = "";
    const songName = searchButtonInput.value;
    await processTracks(songName);
});

// Add click event listener to the "Close" button in the add song modal
document.getElementById("closeAddSongModal").addEventListener("click", () => {
    // Close the add song modal
    addSongModal.style.display = "none";

    // Clear any previous input
    searchButtonInput.value = "";

    // Clear list
    while (searchResultsContainer.firstChild) {
        searchResultsContainer.removeChild(searchResultsContainer.firstChild);
    }
});

// MAIN FUNCTION
(async function () {
    
    // Check if parameters are present in the query parameters
    const playlistIDParam = getQueryParam("playlist_id");
    const playlistNameParam = getQueryParam("playlist_name");

    if (playlistIDParam && playlistNameParam) {
        // Store the access token in local storage
        localStorage.setItem('playlist_id', playlistIDParam);
        localStorage.setItem('playlist_name', playlistNameParam);
        playlist_id = playlistIDParam;
        playlist_name = playlistNameParam; // CHANGE THIS!

        // Display the playlist name on the screen
        document.getElementById("playlistName").textContent = playlistNameParam; // CHANGE THIS TO ACCESS PLAYLIST IN DISPLAYPLAYLIST FUNCTION

        // Rename url
        window.history.pushState({}, document.title, "/editPlaylist.html");

        // Display playlist
        displayPlaylistSongs();
    } else {
        // Check if a stored access token is available in local storage
        const storedAccessToken = localStorage.getItem('accessToken');

        if (storedAccessToken) {
            // Check the validity of the stored access token
            const isTokenValid = await checkAccessTokenValidity(storedAccessToken);

            if (isTokenValid) {
                // Get the playlist name from the URL (you can pass it as a query parameter when navigating to this page)
                playlistName = localStorage.getItem('playlist_name'); // CHANGE THIS TO ACCESS PLAYLIST IN DISPLAYPLAYLIST FUNCTION
                playlist_id = localStorage.getItem('playlist_id');

                // Display the playlist name on the screen
                document.getElementById("playlistName").textContent = playlistName;
                
                // The stored access token is valid, so fetch and display the profile information
                displayPlaylistSongs();

            } else {
                // The stored access token is invalid, so remove it from local storage and redirect to login
                localStorage.removeItem('accessToken');
                window.location.href = "https://www.tastelist.me";
                //localStorage.removeItem('user_id');
                //localStorage.removeItem('playlist_id');
                //localStorage.removeItem('playlist_name');
            }
        } else {
            window.location.href = "https://www.tastelist.me";
        }
    }
})();