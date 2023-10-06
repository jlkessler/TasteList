// Function for making GET requests
function makeGetRequest(fileName, paramsObj, callback) {
    const url = buildUrlWithParams(fileName, paramsObj);
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Content-type', 'application/json');
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                console.log(xhr.responseText); // debugging, comment out
                callback(null, JSON.parse(xhr.responseText)); // DONT PARSE HERE!
            } else {
                callback(`Error: ${xhr.statusText}`);
            }
        }
    };
    xhr.send();
}

// Function for making POST requests
function makePostRequest(fileName, paramsObj, callback) {
    const url = `/app/${fileName}`;
    const data = JSON.stringify(paramsObj); // Convert paramsObj to a JSON string
    //console.log(data);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-type', 'application/json'); // Set JSON content type
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                console.log(xhr.responseText); // debugging, comment out
                if (xhr.responseText) {
                    callback(null, JSON.parse(xhr.responseText)); // Parse JSON response
                } else {
                    callback(null, xhr.responseText);
                }
            } else {
                callback(`Error: ${xhr.statusText}`);
            }
        }
    };
    xhr.send(data);
}

// Helper function to build URL with parameters
function buildUrlWithParams(fileName, paramsObj) {
    const url = `/app/${fileName}?${buildParamsString(paramsObj)}`;
    return url;
}

// Helper function to build parameter string
function buildParamsString(paramsObj) {
    const params = Object.entries(paramsObj)
        .map(([key, value]) => {
            if (Array.isArray(value)) {
                // If the value is an array, repeat the key for each item in the array
                return value.map(item => `${encodeURIComponent(key)}[]=${encodeURIComponent(item)}`).join('&');
            } else {
                return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
            }
        })
        .join('&');
    return params;
}

async function importPlaylistTracks(playlistID, playlist_id, user_id, copying, username) {
    try {
        const playlist = await fetchSpotifyPlaylistSnapshot(playlistID);
        if (playlist === null) {
            console.error('Failed to fetch playlist snapshot:', response.statusText);
        }
        const snapshotID = playlist.snapshot_id;

        const result = await fetchSpotifyPlaylistTracks(snapshotID, username);
        const externalTracks = result[0];
        const songDataArray = result[1];
        const isrcCodes = result[2];

        // Set the chunk size
        const chunkSize = 50;

        // Calculate the number of chunks
        const numberOfChunks = Math.ceil(songDataArray.length / chunkSize);

        // Process the data in chunks
        for (let i = 0; i < numberOfChunks; i++) {
            // Calculate the start and end indices for the current chunk
            const start = i * chunkSize;
            const end = start + chunkSize;

            // Extract the current chunk of data
            const currentChunk = songDataArray.slice(start, end);

            // Call addSongsToDatabase with the songDataArray
            await addSongsToDatabase(currentChunk);
        }

        // After all songs are added, link them to the playlist
        await linkSongsToPlaylist(isrcCodes, playlist_id, user_id);

        if (copying === true) {
            await importSongsToExternalConnection(externalTracks, playlist_id, 'S'); // S is for streaming service, change this!!!!
        }
    }
    catch (error) {
        console.error('Error importing playlist tracks:', error);
    }
}

/**
 * Posts an array of songs to an external playlist
 * given an array of ISRC codes and a TasteList playlist
 */
function postSongsToExternalConnection(isrcCodes, playlist_id, streaming_service) {
    return new Promise(async (resolve, reject) => {
        try {
            const user_id = localStorage.getItem('user_id');

            // Use the Promise to get external connection information
            const response = await getExternalConnection(playlist_id, user_id);

            // Parse the JSON response to get the external_playlist_id
            const external_playlist_id = response.external_playlist_id;

            if (streaming_service === 'S') {
                await addSongsToSpotify(isrcCodes, external_playlist_id);
            }

            resolve(external_playlist_id);
        } catch (error) {
            reject(error); // Reject with the error
        }
    });
}

/**
 * Posts an array of songs to an external playlist
 * given an array of ISRC codes and a TasteList playlist
 */
function importSongsToExternalConnection(tracks, playlist_id, streaming_service) {
    return new Promise(async (resolve, reject) => {
        try {
            const user_id = localStorage.getItem('user_id');

            // Use the Promise to get external connection information
            const response = await getExternalConnection(playlist_id, user_id);

            // Parse the JSON response to get the external_playlist_id
            const external_playlist_id = response.external_playlist_id;

            if (streaming_service === 'S') {
                await importSongsToSpotify(tracks, external_playlist_id);
            }

            resolve(external_playlist_id);
        } catch (error) {
            reject(error); // Reject with the error
        }
    });
}

// Create a function that returns a Promise for the GetRequest
function getExternalConnection(playlist_id, user_id) {
    return new Promise((resolve, reject) => {
        const paramsObj = {
            playlist_id: playlist_id,
            user_id: user_id
        };
        makeGetRequest('get_external_connection.php', paramsObj, (error, response) => {
            if (error) {
                // Create a custom error object with both error and response
                const customError = new Error('Error fetching playlist connection');
                customError.error = error;
                customError.response = response;
                reject(customError);
            } else {
                resolve(response);
            }
        });
    });
}

/**
 * Checks if a song exists in the database 
 * and adds it if it does not and
 * adds a song to a TasteList playlist
 * given song information, a playlist_id, and a user_id
 */
function addSongsToDatabase(songDataArray) {
    return new Promise((resolve, reject) => {
        // Parameters for the POST request
        const paramsObj = {
            song_data: JSON.stringify(songDataArray), // Pass an array of song data pairs
        };

        const song = songDataArray[0];
        const songName = song.name;
        const songID = song.isrc;
        const songArtist = song.artist;
        const songAlbum = song.album;

        // If the random number is less than 20 (20% chance), call generateLoadingMessage
        const randomNumber = Math.floor(Math.random() * 100);
        if (randomNumber < 20) {
            generateLoadingMessage(songName, songArtist, songAlbum);
        }

        // Post to database
        makePostRequest('add_songs.php', paramsObj, function (error, response) {
            if (error) {
                console.log(response); // Handle the error response
                reject(error);
            } else {
                // Handle the successful response here
                resolve(response);
            }
        });
    });
}

function loadOperation(func) {
    createModal("Loading...", null, null, true);

    // Wrap the given function inside a promise
    return new Promise((resolve, reject) => {
        try {
            const result = func(); // Execute the function
            resolve(result); // Resolve the promise with the function's result
        } catch (error) {
            reject(error); // Reject the promise with the error
        }
    }).finally(() => {
        // Close the loading screen after the function has finished
        const loadingScreen = document.getElementById("modal-container-loading");
        if (loadingScreen) {
            loadingScreen.parentNode.removeChild(loadingScreen);
        }
    });
}

function createModal(messageText, inputs, buttons, loading) {
    // Create a modal container
    const modalContainer = document.createElement("div");
    modalContainer.className = "modal-container";
    modalContainer.id = "modal-container-id";

    // Create the modal square
    const modalSquare = document.createElement("div");
    modalSquare.className = "modal-square";

    // Create the message
    const message = document.createElement("p");
    message.textContent = messageText;

    // Append elements to the modal square
    modalSquare.appendChild(message);

    // Append inputs to the modal square
    if (inputs) {
        inputs.forEach((input) => {
            modalSquare.appendChild(input);
        });
    }

    // Append custom buttons to the modal square
    if (buttons) {
        buttons.forEach((button) => {
            modalSquare.appendChild(button);
        });
    }

    // Append modal square to the modal container
    modalContainer.appendChild(modalSquare);

    // Append the modal container to the body
    document.body.appendChild(modalContainer);

    // Display the modal
    modalContainer.style.display = "flex"; // Use flex to center the modal

    // Close the modal when clicking outside of it if not loading screen
    if (!loading) {
        modalContainer.addEventListener("click", (e) => {
            if (e.target === modalContainer) {
                modalContainer.parentNode.removeChild(modalContainer);
            }
        });
    } else {
        modalContainer.id = "modal-container-loading";
    }
}

/***
 * 
 */
function linkSongsToPlaylist(songISRCArray, playlist_id, user_id) {
    return new Promise((resolve, reject) => {
        // Parameters for the POST request
        const paramsObj = {
            song_ids: songISRCArray, // Extract ISRC codes from song data
            playlist_id: playlist_id,
            user_id: user_id
        };

        // Post to server-side script for linking songs to the playlist
        makePostRequest('link_songs.php', paramsObj, function (error, response) {
            if (error) {
                console.log(response); // Handle the error response
                reject(error);
            } else {
                // Handle the successful response here
                resolve(response);
            }
        });
    });
}

/**
 * Returns if the user's access token is valid
 * given the access token
 */
function checkAccessTokenValidity(accessToken, streaming_service) {
    return new Promise(async (resolve, reject) => {
        if (streaming_service === 'S') {
            try {
                const isValid = await checkSpotifyAccessTokenValidity(accessToken);
                resolve(isValid);
            } catch (error) {
                reject(error);
            }
        }
    });
}

/**
 * Creates a new button element
 * given text and a class name
 * returns the newly created button
 */
function createButton(text, className) {
    const button = document.createElement("button");
    button.textContent = text;
    button.className = className;
    return button;
}

/**
 * returns a parameter value from the url
 * given a parameter
 */
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

/**
 * Clear access token and refresh page
 */
function logout() {
    // Clear the stored access token from local storage
    localStorage.removeItem('accessToken');

    // Redirect to the main website without the access token parameter
    window.location.href = "https://tastelist.me";
}