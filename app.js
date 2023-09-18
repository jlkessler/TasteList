// Function to get query parameters from the URL
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Function to handle the Log Out button click
function logout() {
    // Clear the stored access token and user_id from local storage
    localStorage.removeItem('accessToken');
    //localStorage.removeItem('user_id');

    // Hide the information container
    document.getElementById("informationContainer").style.display = "none";

    // Show the login button
    document.getElementById("loginButton").style.display = "block";

    // Redirect to the main website without the access token parameter
    window.history.replaceState({}, document.title, "https://www.tastelist.me/");
}

// ... (Other functions grouped accordingly)

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
                console.error(`Track with ISRC code ${isrcCode} not found.`);
                return null;
            }
        } else {
            console.error(`Error searching for track with ISRC code ${isrcCode}`);
            return null;
        }
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function postSongsToExternalConnection(isrcCodes, playlist_id, streaming_service) {
    try {

        // get user_id
        const user_id = localStorage.getItem('user_id');

        // Make an AJAX request to get_external_connection.php with playlist_id as a parameter
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `/app/get_external_connection.php?playlist_id=${playlist_id}&user_id=${user_id}`, true); // Pass playlist_id as a parameter
        xhr.setRequestHeader('Content-type', 'application/json');
        xhr.onreadystatechange = async function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    const accessToken = localStorage.getItem('accessToken');
                    let uris = await getSpotifyUris(isrcCodes, accessToken);
                    //console.log(uris);

                    // Parse the JSON response to get the external_playlist_id
                    const external_playlist_id = JSON.parse(xhr.responseText).external_playlist_id;

                    if (streaming_service === 'S' && uris) {
                        // Spotify API endpoint to add a track to a playlist
                        const endpoint = `https://api.spotify.com/v1/playlists/${external_playlist_id}/tracks`;

                        // Headers with the access token and content type
                        const headers = {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        };

                        // Request body
                        const urisArray = uris; // Assuming 'uris' is your array of URIs
                        const data = JSON.stringify({
                            ...urisArray,
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

async function createSpotifyPlaylist(name) {
    // Define the playlist data
    const playlistData = {
        name: name,
        description: "",
        public: true,
    };

    // Define your Spotify access token
    const storedAccessToken = localStorage.getItem('accessToken');
    const profile = await fetchProfile(storedAccessToken);
    const userID = profile.id;

    // Define the Spotify API endpoint
    const url = `https://api.spotify.com/v1/users/${userID}/playlists`;

    let external_playlist_id; // Declare it here

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${storedAccessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(playlistData),
        });

        if (response.status === 201) {
            // Successfully created playlist
            const jsonResponse = await response.json();
            const external_playlist_id = jsonResponse.id;
            return external_playlist_id;
        } else {
            console.error('Error creating playlist:', response.statusText);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Select the button and modal elements
const createPlaylistButton = document.getElementById("createPlaylistButton");
const createPlaylistModal = document.getElementById("createPlaylistModal");
const createPlaylistConfirmButton = document.getElementById("createPlaylistConfirm");
const createPlaylistCancelButton = document.getElementById("createPlaylistCancel");
const playlistNameInput = document.getElementById("playlistName");
createPlaylistModal.style.display = "none";

// Add a click event listener to the "Create New Playlist" button
createPlaylistButton.addEventListener("click", () => {
    // Show the create playlist modal
    createPlaylistModal.style.display = "flex";
    playlistNameInput.value = ""; // Clear any previous input
});

// Add a click event listener to the "Create" button in the modal
createPlaylistConfirmButton.addEventListener("click", async () => { // Mark the event handler as async
    // Get the playlist name from the input field
    const playlistName = playlistNameInput.value;

    // Check if the playlist name is not empty
    if (playlistName.trim() !== "") {
        // Create playlist on Spotify
        const external_playlist_id = await createSpotifyPlaylist(playlistName);

        // Add playlist to the database
        const user_id = localStorage.getItem('user_id');
        await createPlaylist(playlistName, user_id, external_playlist_id);

        // Update playlist display
        const storedAccessToken = localStorage.getItem('accessToken');
        const username = localStorage.getItem('username');
        fetchAndDisplayPlaylists(username);
        fetchAndDisplayTasteListPlaylists(user_id);

        // Close the modal after creating the playlist
        createPlaylistModal.style.display = "none";
    } else {
        // Display an error message or prevent playlist creation if the name is empty
        alert("Please enter a valid playlist name.");
    }
});

// Add a click event listener to the "Cancel" button in the modal
createPlaylistCancelButton.addEventListener("click", () => {
    // Close the modal without creating a playlist
    createPlaylistModal.style.display = "none";
});

async function fetchAndDisplayTasteListPlaylists(user_id) {
    try {
        // Make an AJAX request to get_playlists.php with user_id as a parameter
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `/app/get_playlists.php?user_id=${user_id}`, true); // Pass user_id as a parameter
        xhr.setRequestHeader('Content-type', 'application/json');
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    // Parse the JSON response
                    const playlists = JSON.parse(xhr.responseText);

                    // Display each TasteList playlist
                    const tastelistPlaylistList = document.getElementById("tastelistPlaylistList");
                    tastelistPlaylistList.innerHTML = ""; // Clear the list

                    if (playlists.length === 0) {
                        // Handle case when no TasteList playlists are available
                        tastelistPlaylistList.innerHTML = "<p>No TasteList playlists found.</p>";
                    } else {
                        playlists.forEach((playlist) => {
                            const listItem = document.createElement("li");
                            listItem.textContent = playlist.playlist_name;

                            // Navigate to edit playlist when clicked
                            listItem.addEventListener("click", () => {
                                // Extract playlist ID and name from the clicked item's text content
                                const playlistId = playlist.playlist_id;
                                const playlistName = playlist.playlist_name;

                                // Construct URL with query parameters for playlist ID and name
                                const editPlaylistURL = `editPlaylist.html?playlist_id=${encodeURIComponent(playlistId)}&playlist_name=${encodeURIComponent(playlistName)}`;

                                // Navigate to the editPlaylist.html page with query parameters
                                window.location.href = editPlaylistURL;
                            });

                            tastelistPlaylistList.appendChild(listItem);
                        });
                    }
                }
                else {
                    console.error("Error fetching TasteList playlists:", xhr.statusText);
                }
            }
        };

        xhr.send();
    } catch (error) {
        console.error("Error fetching TasteList playlists:", error);
    }
}

// Function to fetch and display user's playlists with pagination
async function fetchAndDisplayPlaylists(username) {
    try {
        const storedAccessToken = localStorage.getItem('accessToken');
        if (!storedAccessToken) {
            return;
        }

        const limit = 50; // Number of playlists to fetch
        const offset = 0; // Starting offset (you can change this value)

        // Construct the URL with query parameters
        const url = `https://api.spotify.com/v1/users/${username}/playlists?limit=${limit}&offset=${offset}`;

        const result = await fetch(url, {
            method: "GET",
            headers: { Authorization: `Bearer ${storedAccessToken}` }
        });

        const playlists = await result.json();
        const playlistList = document.getElementById("playlistList");

        // Clear the playlist list
        playlistList.innerHTML = "";

        // Display each playlist
        playlists.items.forEach((playlist) => {
            const listItem = document.createElement("li");
            listItem.textContent = playlist.name;

            // Add a click event listener to the playlist item
            listItem.addEventListener("click", () => {
                displayImportConfirmation(playlist.name, playlist.id, playlist.owner.id);
            });

            playlistList.appendChild(listItem);
        });
    } catch (error) {
        console.error("Error fetching playlists:", error);
    }
}

async function displayProfile(profile) {
    // Display profile information
    document.getElementById("profileId").textContent = profile.id;
    document.getElementById("profileEmail").textContent = profile.email;
    document.getElementById("profileDisplayName").textContent = profile.display_name;

    // Display the profile image if available
    const profileImage = document.getElementById("profileImage");
    if (profile.images && profile.images.length > 0) {
        profileImage.src = profile.images[0].url;
    } else {
        // Leave the image blank if no image is available
        profileImage.src = '';
    }

    // Show the information container
    document.getElementById("informationContainer").style.display = "block";

    // Hide the login button
    document.getElementById("loginButton").style.display = "none";

    // Fetch and display the user's playlists
    fetchAndDisplayPlaylists(profile.id);

    // Fetch and display TasteList playlists
    const userID = localStorage.getItem('user_id');
    fetchAndDisplayTasteListPlaylists(userID);
}

async function fetchProfile(token) {
    try {
        const result = await fetch("https://api.spotify.com/v1/me", {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` }
        });

        return await result.json();
    } catch (error) {
        console.error("Error fetching profile:", error);
        throw error;
    }
}

async function importPlaylist(playlistName, user_id, external_playlist_id) {
    try {
        // Add a playlist to the database
        const playlist_id = await createPlaylist(playlistName, user_id, external_playlist_id);

        // Fetch and display TasteList playlists
        await fetchAndDisplayTasteListPlaylists(user_id);

        return playlist_id;
    } catch (error) {
        console.error("Error:", error);
    }
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

async function addUserToDatabase(username) {
    return new Promise((resolve, reject) => {
        // Make an AJAX request to the add_user.php file in the app directory
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/app/add_user.php', true); // Update the path here
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    // The request was successful
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        // User added successfully or already exists
                        if (response.user_id) {

                            // Store user_id in local storage
                            localStorage.setItem('user_id', response.user_id);
                            resolve(); // Resolve the Promise when the operation is complete
                        }
                    } else {
                        console.error(response.message);
                    }
                } else {
                    console.error('Failed to add user to the database.');
                }
            }
        };

        const userData = {
            username: username
        };

        const params = `username=${userData.username}`;
        xhr.send(params);
    });
}

function addSongToDatabase(isrc, name, artist, album, playlist_id, user_id) {
    // Make an AJAX request to the add_song.php file in the app directory
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/app/add_song.php', true); // Update the path here
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            // You can handle the response from the server here
            //const response = JSON.parse(xhr.responseText);
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
}

async function createPlaylist(playlistName, creator_id, external_playlist_id) {
    return new Promise((resolve, reject) => {
        // Make an AJAX request to the create_playlist.php file in the app directory
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/app/create_playlist.php', true);
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    // Parse the JSON response
                    const response = JSON.parse(xhr.responseText);

                    // Check if the response contains a playlist_id
                    if (response.playlist_id) {
                        // Resolve the Promise with the playlist ID
                        resolve(response.playlist_id);
                    } else {
                        console.error("Error creating playlist: Playlist ID not found in response");
                        reject(new Error("Error creating playlist"));
                    }
                } else {
                    console.error("Error creating playlist:", xhr.statusText);
                    reject(new Error("Error creating playlist"));
                }
            }
        };

        const playlistData = {
            name: playlistName,
            creator_id: creator_id,
            external_playlist_id: external_playlist_id,
        };

        const params = `name=${playlistData.name}&creator_id=${playlistData.creator_id}&external_playlist_id=${playlistData.external_playlist_id}`;
        xhr.send(params);
    });
}

function displayImportConfirmation(playlistName, playlistID, playlistOwnerID) {
    // Create a modal container
    const modalContainer = document.createElement("div");
    modalContainer.className = "modal-container";

    // Create the modal square
    const modalSquare = document.createElement("div");
    modalSquare.className = "modal-square";

    // Create buttons for Yes, No, and Copy
    const yesButton = createButton("Yes", "modal-button modal-button-yes");
    const copyButton = createButton("Copy", "modal-button modal-button-copy");
    const noButton = createButton("No", "modal-button modal-button-no");

    // Create the message
    const message = document.createElement("p");
    message.textContent = `Do you want to import the playlist "${playlistName}" to TasteList?`;

    // Append elements to the modal square
    modalSquare.appendChild(message);
    modalSquare.appendChild(yesButton);
    modalSquare.appendChild(copyButton);
    modalSquare.appendChild(noButton);

    // Append modal square to the modal container
    modalContainer.appendChild(modalSquare);

    // Append the modal container to the body
    document.body.appendChild(modalContainer);

    // Display the modal
    modalContainer.style.display = "flex"; // Use flex to center the modal

    // Close the modal when clicking outside of it
    modalContainer.addEventListener("click", (e) => {
        if (e.target === modalContainer) {
            modalContainer.style.display = "none";
        }
    });

    // Add a click event listener to the "Yes" button
    yesButton.addEventListener("click", async () => {
        // Handle playlist import logic here
        const storedAccessToken = localStorage.getItem('accessToken');
        const userID = localStorage.getItem('user_id');

        try {

            // Check if they own the playlist
            const profileID = localStorage.getItem('username');
            if (playlistOwnerID !== profileID) {
                // Does not own the playlist, alert and exit function
                alert("You cannot directly import this playlist because you do not have ownership of it. Please consider making a copy of it.");
                return;
            }

            const playlist_id = await importPlaylist(playlistName, userID, playlistID);
            await importPlaylistTracks(playlistID, storedAccessToken, playlist_id, userID);
        } catch (error) {
            console.error("Error during playlist import:", error);
        }

        // Close the modal
        modalContainer.style.display = "none";
    });

    // Add a click event listener to the "No" button
    noButton.addEventListener("click", async () => {
        // Close the modal
        modalContainer.style.display = "none";
    });

    // Add a click event listener to the "Copy" button
    copyButton.addEventListener("click", async () => {

        const storedAccessToken = localStorage.getItem('accessToken');

        // Create playlist on Spotify
        const external_playlist_id = await createSpotifyPlaylist(`${playlistName} (TasteList)`);

        // Add playlist to the database
        const user_id = localStorage.getItem('user_id');
        const playlist_id = await createPlaylist(playlistName, user_id, external_playlist_id);

        // Add songs from Spotify to imported copy
        await importPlaylistTracks(playlistID, storedAccessToken, playlist_id, user_id, true);

        // Fetch and display TasteList playlists
        await fetchAndDisplayTasteListPlaylists(user_id);

        // Fetch and display Spotify playlists
        const profileID = localStorage.getItem('username');
        await fetchAndDisplayPlaylists(profileID);

        // Close the modal
        modalContainer.style.display = "none";
    });
}

// Function to create a button element
function createButton(text, className) {
    const button = document.createElement("button");
    button.textContent = text;
    button.className = className;
    return button;
}

async function importPlaylistTracks(playlistID, accessToken, playlist_id, user_id, copying) {
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
            tracks.forEach((track) => {
                const trackName = track.track.name;
                const artistName = track.track.artists.map(artist => artist.name).join(', ');
                const albumName = track.track.album.name;
                const isrcCode = track.track.external_ids.isrc;

                // Here, you can do something with the track information
                addSongToDatabase(isrcCode, trackName, artistName, albumName, playlist_id, user_id);

                // Add the ISRC code to the isrcCodes array
                isrcCodes.push(isrcCode);
            });

            if (copying === true) {
                postSongsToExternalConnection(isrcCodes, playlist_id, 'S'); // S is for streaming service, change this!!!!
            }
        } else {
            console.error('Failed to fetch playlist tracks:', response.statusText);
        }
    } catch (error) {
        console.error('Error importing playlist tracks:', error);
    }
}

// MAIN FUNCTION
(async function () {
    // Check if a stored access token is available in local storage
    const storedAccessToken = localStorage.getItem('accessToken');

    if (storedAccessToken) {
        // Check the validity of the stored access token
        const isTokenValid = await checkAccessTokenValidity(storedAccessToken);

        if (isTokenValid) {
            // The stored access token is valid, so fetch and display the profile information
            const profile = await fetchProfile(storedAccessToken);

            displayProfile(profile);
        } else {
            // The stored access token is invalid, so remove it from local storage
            localStorage.removeItem('accessToken');
             window.location.href = "https://tastelist.me";
            //localStorage.removeItem('user_id');
        }
    }

    // Check if an access token is present in the query parameters
    const accessTokenParam = getQueryParam("access_token");

    if (accessTokenParam) {
        // Store the access token in local storage
        localStorage.setItem('accessToken', accessTokenParam);

        // Redirect to the main website without the access token parameter
        window.history.replaceState({}, document.title, "https://www.tastelist.me/");

        // Fetch user profile
        const profile = await fetchProfile(accessTokenParam);
        const profileID = profile.id;
        localStorage.setItem('username', profileID);

        // Attempt to add the user to the database
        await addUserToDatabase(profileID);

        // Display the profile information
        displayProfile(profile);
    }
})();