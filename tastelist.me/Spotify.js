var disabled = false;
var previousMessageIndex = -1; // Initialize with an invalid index

function generateLoadingMessage(song_name, artist, album) {
    const loadingScreen = document.getElementById("modal-container-loading");

    if (loadingScreen && !disabled) {
        const messageElement = loadingScreen.querySelector("p");

        // Generate a random funny message based on the song details
        const funnyMessages = [
            `I see you have ${song_name} by ${artist} in here... interesting...`,
            `I should really get around to listening to ${album}...`,
            `How many times have you listened to the album ${album} in full?`,
            `Bro, ${song_name} is fire asf`,
            `${artist} never misses!`,
            `Do your friends listen to ${artist} too?`,
            `You listen to ${artist}? You have good taste!!!`,
            `I should listen to ${artist} more often...`,
            `${song_name} is a certified banger!!`,
            `Is ${song_name} ${artist}'s best song?`,
            `I remember where I was the first time I heard ${song_name}...`,
        ];

        // Ensure the next message is different from the previous one
        let randomMessageIndex;
        do {
            randomMessageIndex = Math.floor(Math.random() * funnyMessages.length);
        } while (randomMessageIndex === previousMessageIndex);

        const randomMessage = funnyMessages[randomMessageIndex];

        // Update the message in the loadingScreen modal
        messageElement.textContent = randomMessage;

        // Update the previous message index
        previousMessageIndex = randomMessageIndex;

        // Disable new message
        disabled = true;

        // Set a minimum display time of 3 seconds (3000 milliseconds)
        const minimumDisplayTime = 3000;

        // Delay the replacement of the message
        setTimeout(() => {
            disabled = false;
        }, minimumDisplayTime);
    }
}

function addSongsToSpotify(isrcCodes, playlistID) {
    return new Promise(async (resolve, reject) => {
        try {
            const accessToken = localStorage.getItem('accessToken');
            const chunkSize = 50; // Set the chunk size

            const urisObject = await getSpotifyUris(isrcCodes, accessToken); // THIS IS A JSON OBJECT
            const uris = urisObject.uris; // Access the uris array within the JSON object
            const totalUris = uris.length;

            // Spotify API endpoint to add tracks to a playlist
            const endpoint = `https://api.spotify.com/v1/playlists/${playlistID}/tracks`;

            // Headers with the access token and content type
            const headers = {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            };

            let startIndex = 0;
            let endIndex = Math.min(chunkSize, totalUris);

            while (startIndex < totalUris) {
                const chunkUris = uris.slice(startIndex, endIndex);

                // Request body for the current chunk
                const data = JSON.stringify({
                    uris: chunkUris,
                    position: 0, // Specify the position where you want to add the tracks
                });

                // Make the POST request using fetch
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: headers,
                    body: data,
                });

                console.log(response.status);
                if (response.status !== 201) {
                    // If any batch fails, reject with an error message
                    reject('Failed to add tracks to the playlist.');
                    return;
                }

                // Move to the next chunk
                startIndex = endIndex;
                endIndex = Math.min(startIndex + chunkSize, totalUris);
            }

            // If all batches are successful, resolve with a success message
            resolve('Tracks added to the playlist successfully.');
        } catch (error) {
            // Reject with the error
            reject(error);
        }
    });
}

function importSongsToSpotify(tracks, playlistID) {
    return new Promise(async (resolve, reject) => {
        try {

            const accessToken = localStorage.getItem('accessToken');
            const chunkSize = 100;

            // Split the tracks into chunks
            for (let i = 0; i < tracks.length; i += chunkSize) {
                const chunk = tracks.slice(i, i + chunkSize);

                // Spotify API endpoint to add tracks to a playlist
                const endpoint = `https://api.spotify.com/v1/playlists/${playlistID}/tracks`;

                // Headers with the access token and content type
                const headers = {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                };

                // Request body
                const data = JSON.stringify({
                    uris: chunk,
                    position: 0, // Specify the position where you want to add the tracks
                });

                // Make the POST request using fetch
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: headers,
                    body: data,
                });

                console.log(response.status);
                if (response.status !== 201) {
                    // If any batch fails, reject with an error message
                    reject('Failed to add tracks to the playlist.');
                    return;
                }
            }

            // If all batches are successful, resolve with a success message
            resolve('Tracks added to the playlist successfully.');
        } catch (error) {
            // Reject with the error
            reject(error);
        }
    });
}

function deleteSongFromSpotifyPlaylist(isrcCodes, playlistID) {
    return new Promise(async (resolve, reject) => {
        try {
            const accessToken = localStorage.getItem('accessToken');
            let uris = await getSpotifyUris(isrcCodes, accessToken);

            // Spotify API endpoint to add a track to a playlist
            const endpoint = `https://api.spotify.com/v1/playlists/${playlistID}/tracks`;

            // Headers with the access token and content type
            const headers = {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            };

            // Request body
            const urisArray = uris; // Assuming 'uris' is your array of URIs
            const data = JSON.stringify({
                ...urisArray
            });
            //console.log(data);

            // Make the DELETE request using fetch
            const response = await fetch(endpoint, {
                method: 'DELETE',
                headers: headers,
                body: data,
            });

            console.log(response.status);
            if (response.status === 200) {
                // Resolve with a success message
                resolve('Track deleted from playlist successfully.');
            } else {
                // Reject with an error message
                reject('Failed to delete the track from the playlist.');
            }
        } catch (error) {
            // Reject with the error
            reject(error);
        }
    });
}


/**
 * Returns the Spotify URI for a track 
 * given an ISRC code
 */

/*
async function getSpotifyUri(isrcCode, accessToken) {
    // Spotify API endpoint to search for a track by ISRC code
    const searchEndpoint = `https://api.spotify.com/v1/search?q=isrc:${isrcCode}&type=track&limit=50`;

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

        console.log(response.status);
        if (response.status === 200) {
            const data = await response.json();
            if (data.tracks && data.tracks.items.length > 0) {
                

                return data.tracks.items[0].uri;
            } else {
                return null;
            }
        } else {
            console.error(`Error searching for track with ISRC code ${isrcCode}`);
            return null;
        }
    } catch (error) {
        const customError = new Error(`Track with ISRC code ${isrcCode} not found.`);
        customError.error = error;
        console.error(customError);
        return null;
    }
}
*/
/**
 * Returns an array of Spotify URIs for tracks 
 * given an array of ISRC codes
 */
/*
async function getSpotifyUris(isrcCodes, accessToken) {
    const uris = [];

    // Loop through each ISRC code and fetch the Spotify URI
    for (const isrcCode of isrcCodes) {
        const uri = await getSpotifyUri(isrcCode, accessToken);
        if (uri) {
            uris.push(uri);
        }
    }

    // Return the array of Spotify URIs as a JSON object
    return { uris };
}
*/

/**
 * Posts a call to create a Spotify playlist and
 * returns the ID of the created playlist
 * given a playlist name
 */

function createSpotifyPlaylist(name, userID, description, is_public) {
    return new Promise(async (resolve, reject) => {
        // Define the playlist data
        const playlistData = {
            name: name,
            description: description,
            public: is_public === 1
        };

        // Get your Spotify access token
        const storedAccessToken = localStorage.getItem('accessToken');

        // Define the Spotify API endpoint
        const url = `https://api.spotify.com/v1/users/${userID}/playlists`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${storedAccessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(playlistData),
            });

            console.log(response.status);
            if (response.status === 201) {
                // Successfully created playlist
                const jsonResponse = await response.json();
                const external_playlist_id = jsonResponse.id;
                resolve(external_playlist_id);
            } else {
                const customError = new Error('Error creating playlist');
                customError.error = error;
                customError.response = response;
                console.error(customError);
                reject(customError);
            }
        } catch (error) {
            console.error('Error:', error);
            reject(error);
        }
    });
}

async function getSpotifyUri(isrcCode, accessToken) {
    const searchEndpoint = `https://api.spotify.com/v1/search?q=isrc:${isrcCode}&type=track&limit=1`;

    const headers = {
        Authorization: `Bearer ${accessToken}`,
    };

    try {
        const response = await fetch(searchEndpoint, {
            method: 'GET',
            headers: headers,
        });

        if (response.status === 200) {
            const data = await response.json();
            if (data.tracks && data.tracks.items.length > 0) {
                // Generate a random number between 0 and 99 (inclusive)
                const randomNumber = Math.floor(Math.random() * 100);
                
                // If the random number is less than 5 (5% chance), call generateLoadingMessage
                if (randomNumber < 5) {
                    generateLoadingMessage(data.tracks.items[0].name, data.tracks.items[0].artists[0].name, data.tracks.items[0].album.name);
                }

                return data.tracks.items[0].uri;
            }
        }
        // If the track is not found, return null.
        return null;
    } catch (error) {
        console.error(`Error searching for track with ISRC code ${isrcCode}: ${error.message}`);
        return null;
    }
}

async function getSpotifyUris(isrcCodes, accessToken) {
    const uris = [];

    const batchSize = 10;
    for (let i = 0; i < isrcCodes.length; i += batchSize) {
        const batch = isrcCodes.slice(i, i + batchSize);
        
        // Adjusted this part to capture errors for individual promises
        const promises = batch.map(isrcCode => 
            getSpotifyUri(isrcCode, accessToken).catch(error => {
                console.error(`Failed for ISRC code ${isrcCode}:`, error.message);
                return null;
            })
        );

        const batchUris = await Promise.all(promises);
        uris.push(...batchUris.filter(uri => uri !== null));
    }
    return { uris };
}


/**
 * Posts a call to update a Spotify playlist and
 * given playlist id and info
 */
async function updateSpotifyPlaylistInfo(name, playlist_id, description, is_public) {
    // Define the playlist data
    const playlistData = {
        name: name,
        description: description,
        public: is_public
    };

    // Get your Spotify access token
    const storedAccessToken = localStorage.getItem('accessToken');

    // Define the Spotify API endpoint
    const url = `https://api.spotify.com/v1/playlists/${playlist_id}`;

    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${storedAccessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(playlistData),
        });

        console.log(response.status);
        if (response.status !== 200) {
            const customError = new Error('Error updating playlist');
            customError.response = response;
            console.error(customError);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

/**
 * Posts a call to create a Spotify playlist and
 * to delete a playlist
 * given a playlist_id
 */
function deleteSpotifyPlaylist(playlist_id) {
    return new Promise(async (resolve, reject) => {
        try {
            // Check Spotify access token
            const storedAccessToken = localStorage.getItem('accessToken');
            if (!checkSpotifyAccessTokenValidity(storedAccessToken)) {
                // Handle invalid token here if needed
                logout();
            }

            // Define the Spotify API endpoint
            const url = `https://api.spotify.com/v1/playlists/${playlist_id}/followers`;

            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${storedAccessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            console.log(response.status);
            if (response.status === 200) {
                // Successfully deleted playlist
                resolve();
            } else {
                const customError = new Error('Error deleting playlist');
                customError.response = response;
                console.error(customError);
                reject(customError);
            }
        } catch (error) {
            console.error('Error:', error);
            reject(error);
        }
    });
}
/*
function fetchSpotifyPlaylistSongs(playlistID) {
    return new Promise(async (resolve, reject) => {
        try {
            const accessToken = localStorage.getItem('accessToken');
            if (checkSpotifyAccessTokenValidity(accessToken) === false) {
                logout();
                reject("Invalid Spotify access token");
            }

            const limit = 50; // Adjust the limit as needed
            const offset = 0; // Starting offset

            // Construct the URL for the playlist tracks
            const url = `https://api.spotify.com/v1/playlists/${playlistID}/tracks?limit=${limit}&offset=${offset}`;

            const result = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            const response = await result.json();
            resolve(response);
        } catch (error) {
            console.error("Error fetching playlist songs:", error); // put custom error here
            reject(error);
        }
    });
}

function fetchSpotifyPlaylistSnapshot(playlistID) {
    return new Promise(async (resolve, reject) => {
        try {
            const accessToken = localStorage.getItem('accessToken');
            if (checkSpotifyAccessTokenValidity(accessToken) === false) {
                logout();
                reject("Invalid Spotify access token");
            }

            const url = `https://api.spotify.com/v1/playlists/${playlistID}`;

            const result = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            const response = await result.json();
            resolve(response);
        } catch (error) {
            console.error("Error fetching playlist:", error); // put custom error here
            reject(error);
        }
    });
}

function fetchSpotifyPlaylistSongs(playlistID, snapshotID, cur_offset) {
    return new Promise(async (resolve, reject) => {
        try {
            const accessToken = localStorage.getItem('accessToken');
            if (checkSpotifyAccessTokenValidity(accessToken) === false) {
                logout();
                reject("Invalid Spotify access token");
            }

            const limit = 50; // Adjust the limit as needed
            const offset = cur_offset; // Starting offset

            // Construct the URL for the playlist tracks
            const url = `https://api.spotify.com/v1/playlists/${playlistID}/tracks?limit=${limit}&offset=${offset}&snapshot_id=${snapshotID}`;

            const result = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            const response = await result.json();
            resolve(response);
        } catch (error) {
            console.error("Error fetching playlist songs:", error); // put custom error here
            reject(error);
        }
    });
}
*/

function fetchSpotifyPlaylistSnapshot(playlistID) {
    return new Promise(async (resolve, reject) => {
        try {
            const accessToken = localStorage.getItem('accessToken');
            if (checkSpotifyAccessTokenValidity(accessToken) === false) {
                logout();
                reject("Invalid Spotify access token");
            }

            const url = `https://api.spotify.com/v1/playlists/${playlistID}`;

            const result = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            const response = await result.json();
            resolve(response);
        } catch (error) {
            console.error("Error fetching playlist:", error); // put custom error here
            reject(error);
        }
    });
}

const getSpotifyPlaylistTracks = (accessToken, playlistID, snapshotID, offset = 0, limit = 50, accumulatedTracks = []) => {
    const playlistTracksUrl = `https://api.spotify.com/v1/playlists/${playlistID}/tracks?offset=${offset}&limit=${limit}&snapshot_id=${snapshotID}`;

    return fetch(playlistTracksUrl, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    })
        .then(response => response.json())
        .then(tracksData => {
            // Process and use the playlist tracks data here
            const currentBatch = tracksData.items;

            // If the random number is less than 30 (30% chance), call generateLoadingMessage
            if (currentBatch[0].track.artists[0] && currentBatch[0].track.album) {
                const randomNumber = Math.floor(Math.random() * 100);
                if (randomNumber < 30) {
                    generateLoadingMessage(currentBatch[0].track.name, currentBatch[0].track.artists[0].name, currentBatch[0].track.album.name);
                }
            }

            accumulatedTracks = accumulatedTracks.concat(currentBatch);

            // Check if there are more tracks to fetch
            if (tracksData.next) {
                const nextOffset = offset + limit;
                // Recursively fetch the next batch of tracks
                return getSpotifyPlaylistTracks(accessToken, playlistID, snapshotID, nextOffset, limit, accumulatedTracks);
            } else {
                // No more tracks to fetch, return all accumulated tracks
                return accumulatedTracks;
            }
        });
}

function fetchSpotifyPlaylistTracks(snapshotID, username) {
    return new Promise((resolve, reject) => {
        const accessToken = localStorage.getItem('accessToken');
        if (checkSpotifyAccessTokenValidity(accessToken) === false) {
            logout();
            reject("Invalid Spotify access token");
            return; // Exit the function early
        }

        fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        })
            .then(response => response.json())
            .then(data => {

                const playlist = data.items.find(item => item.snapshot_id === snapshotID);

                if (playlist) {
                    const playlistId = playlist.id;
                    // Return the promise returned by getSpotifyPlaylistTracks
                    return getSpotifyPlaylistTracks(accessToken, playlistId, snapshotID)
                        .then(allTracks => {
                            // Process the tracks and return the arrays
                            const isrcCodes = []; // Initialize an array to store ISRC codes
                            const songDataArray = [];
                            const externalTracks = [];
                            let counter = 0;
                            allTracks.forEach((track) => {
                                const trackName = track.track.name;
                                const artistName = track.track.artists.map(artist => artist.name).join(', ');
                                const firstArtist = track.track.artists[0].name;
                                const albumName = track.track.album.name;
                                const isrcCode = track.track.external_ids.isrc;

                                if (typeof isrcCode === 'undefined') {
                                    console.log(`Track with no ISRC code found: ${trackName}`);
                                    return;
                                }

                                // Create an object with song data
                                const songData = {
                                    isrc: isrcCode,
                                    name: trackName,
                                    artist: artistName,
                                    album: albumName
                                };

                                externalTracks.push(track.track.uri);

                                // Push the song data object into the array
                                songDataArray.push(songData);

                                // Add the ISRC code to the isrcCodes array if needed
                                isrcCodes.push(isrcCode);

                            });

                            // Resolve the promise with the arrays
                            resolve([externalTracks, songDataArray, isrcCodes]);
                        })
                        .catch(error => reject(error)); // Reject the promise if there's an error in getSpotifyPlaylistTracks
                } else {
                    console.log('Playlist with snapshot_id not found.');
                    reject('Playlist not found'); // Reject the promise if the playlist is not found
                }
            })
            .catch(error => {
                console.error(error);
                reject(error); // Reject the promise if there's an error in the fetch request
            });
    });
}

/**
 * Fetches the user's Spotify playlists
 * and displays them
 * given a username
 */
function fetchSpotifyPlaylists(username) {
    return new Promise(async (resolve, reject) => {
        try {
            const storedAccessToken = localStorage.getItem('accessToken');
            if (checkSpotifyAccessTokenValidity(storedAccessToken) === false) {
                logout();
                reject("Invalid Spotify access token");
            }

            const limit = 50; // Number of playlists to fetch
            const offset = 0; // Starting offset (you can change this value)

            // Construct the URL with query parameters
            const url = `https://api.spotify.com/v1/users/${username}/playlists?limit=${limit}&offset=${offset}`;

            const result = await fetch(url, {
                method: "GET",
                headers: { Authorization: `Bearer ${storedAccessToken}` }
            });

            if (!result.ok) {
                // Handle non-OK responses here
                reject(`Error fetching playlists: ${result.status} ${result.statusText}`);
                return;
            }

            const response = await result.json();
            resolve(response);
        } catch (error) {
            console.error("Error fetching playlists:", error);
            reject(error);
        }
    });
}

function fetchSpotifyProfile(token) {
    return new Promise(async (resolve, reject) => {
        try {
            const result = await fetch("https://api.spotify.com/v1/me", {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!result.ok) {
                // Handle non-OK responses here
                reject(`Error fetching profile: ${result.status} ${result.statusText}`);
                return;
            }

            const response = await result.json();
            resolve(response);
        } catch (error) {
            console.error("Error fetching profile:", error);
            reject(error);
        }
    });
}

async function checkSpotifyAccessTokenValidity(accessToken) {
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

async function fetchSpotifyTracksBySongName(songName) {

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

async function importSpotifyPlaylistTracks(playlistID, accessToken) {
    try {
        const limit = 50; // Adjust the limit as needed
        const offset = 0; // Starting offset

        // Construct the URL for the playlist tracks
        const url = `https://api.spotify.com/v1/playlists/${playlistID}/tracks?limit=${limit}&offset=${offset}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const tracks = data.items;
            const isrcCodes = []; // Initialize an array to store ISRC codes

            // Process the tracks as needed
            const songDataArray = [];

            tracks.forEach((track) => {
                const trackName = track.track.name;
                const artistName = track.track.artists.map(artist => artist.name).join(', ');
                const albumName = track.track.album.name;
                const isrcCode = track.track.external_ids.isrc;

                // Create an object with song data
                const songData = {
                    isrc: isrcCode,
                    name: trackName,
                    artist: artistName,
                    album: albumName
                };

                // Push the song data object into the array
                songDataArray.push(songData);

                // Add the ISRC code to the isrcCodes array if needed
                isrcCodes.push(isrcCode);
            });

            const playlistData = {
                songData: songDataArray,
                isrcCodes: isrcCodes
            }
            return (playlistData);

        } else {
            console.error('Failed to fetch playlist tracks:', response.statusText);
        }
    } catch (error) {
        console.error('Error importing playlist tracks:', error);
    }
}