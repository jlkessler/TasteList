var playlist_id;
const songMap = new Map();

const editPlaylistButton = document.getElementById("editPlaylistButton");

editPlaylistButton.addEventListener("click", () => {
    handleEditPlaylistClick();
});

// Add click event listener to the "Add Song" button
const addSongButton = document.getElementById("addSongButton");
const addSongModal = document.getElementById("addSongModal");
const searchButton = document.getElementById("searchButton");
const searchButtonInput = document.getElementById("songSearchBar");
const searchResultsContainer = document.getElementById("searchResults");
const songList = document.getElementById("songList");
searchResultsContainer.innerHTML = "";

addSongButton.addEventListener("click", () => {
    // Show the add song modal
    addSongModal.style.display = "block";
    searchButtonInput.value = ""; // Clear any previous input
});

searchButton.addEventListener("click", async () => {
    searchResultsContainer.innerHTML = "";
    const songName = searchButtonInput.value;
    processTracks(songName);
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

async function linkPlaylist(external_playlist_id, user_id) {
    return new Promise((resolve, reject) => {

        // Parameters for the POST request
        const paramsObj = {
            user_id: user_id,
            playlist_id: playlist_id,
            external_playlist_id: external_playlist_id
        };

        // Post to the database
        makePostRequest('link_playlist.php', paramsObj, function (error, response) {
            if (error) {
                const customError = new Error('Error creating playlist');
                customError.error = error;
                customError.response = response;
                console.error(customError);
                reject(customError);
            } else {
                // Check if the response contains a playlist_id
                resolve(); // Assuming 'playlist_id' is in the response
            }
        });
    });
}

// CHECK IF ANY COLLABORATORS ARE SPOTIFY. IF NONE, DO ISRC COPY. 
// OK ACTUALLY YOU CAN'T GET PLAYLIST DATA FROM OTHER USERS RELIABLY: HAS TO BE A PUBLIC PLAYLIST. 
// MAYBE ADD LOGIC LATER TO CHECK FIRST FOR IF THE PLAYLIST IS PUBLIC. FOR NOW, DEFAULTS TO ISRC COPY

/*
const matchingCollaborator = collaborators.find(collaborator => collaborator.streaming_service === streaming_service);
if (matchingCollaborator) {
    console.log(matchingCollaborator.id);
    const response = await getExternalConnection(playlist_id, matchingCollaborator.id);
    console.log(response);
    const copy_playlist_id = response.external_playlist_id;
    // Add songs to Spotify to collaborator copy
    await importPlaylistTracks(copy_playlist_id, playlist_id, user_id, true, matchingCollaborator.username);
} else {
    // ISRC COPY
    const isrcCodes = await getISRCs();
    await addSongsToSpotify(isrcCodes, external_playlist_id);
}
*/
async function linkCollaborator() {
    playlist_id = localStorage.getItem('playlist_id');
    const user_id = localStorage.getItem('user_id');
    const playlistInfo = await fetchPlaylistInfo();
    const collaborators = playlistInfo.collaborators;
    const profileID = localStorage.getItem('username');
    const playlistName = playlistInfo.playlist_name;
    const streaming_service = localStorage.getItem('streaming_service');

    // User is not already a collaborator
    if (!collaborators.some(collaborator => parseInt(collaborator.id) === parseInt(user_id))) {
        loadOperation(async () => {
            // Create playlist on Spotify
            if (streaming_service === 'S') {
                const external_playlist_id = await createSpotifyPlaylist(`${playlistName} (TasteList)`, profileID); // Input the rest of the info!!!!!!!!!!!

                // createPlaylist(playlistName, user_id, description, is_public, external_playlist_id) IMPORT ACTUAL INFORMATION
                linkPlaylist(external_playlist_id, user_id);

                // Always do ISRC copy for now I suppose...
                const isrcCodes = await getISRCs();
                addSongsToSpotify(isrcCodes, external_playlist_id);

                // Develop this to sync any missing songs (will get difference of tastelist playlist and external playlist)
                //syncPlaylist();

                // Loading screen close
                const loadingScreen = document.getElementById("modal-container-loading");
                loadingScreen.parentNode.removeChild(loadingScreen);
            }
        });
    } else {
        console.log("Already a collaborator!");
    }
}

function getISRCs() {
    return new Promise((resolve, reject) => {
        try {
            // parameters for GetRequest
            const paramsObj = {
                playlist_id: playlist_id,
            };

            // Get external playlist id from the database for the playlist
            makeGetRequest('get_isrc_codes.php', paramsObj, (error, response) => {
                if (error) {
                    console.error("Error getting ISRC codes:", error);
                    reject(error);
                } else {
                    resolve(response);
                }
            });

        } catch (error) {
            console.error("Error getting ISRC codes:", error);
            reject(error);
        }
    });
}

function validateInviteCode(invite_code, playlistID) {
    return new Promise((resolve, reject) => {
        try {
            // parameters for GetRequest
            const paramsObj = {
                playlist_id: playlistID,
                invite_code: invite_code
            };

            // Get external playlist id from the database for the playlist
            makeGetRequest('validate_invite_code.php', paramsObj, (error, response) => {
                if (error) {
                    console.error("Error validating code:", error);
                    reject(error);
                } else {
                    resolve(response);
                }
            });

        } catch (error) {
            console.error("Error validating code:", error);
            reject(error);
        }
    });
}

const inviteCollaboratorButton = document.getElementById("inviteCollaboratorButton")

// Add a click event listener to the button
function copyInviteLink(invite_code) {
    // Disable the button to prevent further copying
    inviteCollaboratorButton.disabled = true;

    // Create a temporary textarea element to hold the text
    const tempTextArea = document.createElement("textarea");

    // Link to copy
    const link = `https://tastelist.me/editPlaylist.html?invite_code=${encodeURIComponent(invite_code)}&playlist_id=${encodeURIComponent(playlist_id)}`;
    tempTextArea.value = link;

    // Append the textarea to the document
    document.body.appendChild(tempTextArea);

    // Select the text inside the textarea
    tempTextArea.select();
    tempTextArea.setSelectionRange(0, 99999); // For mobile devices

    // Copy the selected text to the clipboard
    document.execCommand("copy");

    // Remove the temporary textarea
    document.body.removeChild(tempTextArea);

    // Optionally, provide user feedback
    inviteCollaboratorButton.innerText = "Invite link copied!";

    // Reset the button text and enable the button after a brief delay
    setTimeout(() => {
        inviteCollaboratorButton.innerText = "Invite Collaborator";
        inviteCollaboratorButton.disabled = false; // Re-enable the button
    }, 3000);
}

/**
 * EDITPLAYLIST.JS FUNCTION
 */
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


/**
 * EDITPLAYLIST.JS FUNCTION
 */
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

                    // Close the add song modal
                    addSongModal.style.display = "none";

                    // Clear any previous input
                    searchButtonInput.value = "";

                    // Clear list
                    while (searchResultsContainer.firstChild) {
                        searchResultsContainer.removeChild(searchResultsContainer.firstChild);
                    }

                    // Create an array of song data objects for the clicked song
                    const songDataArray = [
                        {
                            isrc: clickedIsrcCode,
                            name: clickedSongName,
                            artist: clickedArtistName,
                            album: clickedAlbumName
                        }
                    ];

                    await addSongsToDatabase(songDataArray);
                    linkSongsToPlaylist(songDataArray.map(song => song.isrc), playlist_id, user_id);

                    const paramsObj = {
                        user_id: user_id,
                        playlist_id: playlist_id,
                        song_id: clickedIsrcCode,
                        song_name: clickedSongName,
                        artist: clickedArtistName,
                        action: 'A'
                    };

                    // Post to updates
                    makePostRequest('playlist_updates.php', paramsObj, function (error, response) {
                        if (error) {
                            console.log(response); // Handle the error response
                            reject(error);
                        } else {
                            // Handle the successful response here
                            //console.log(response);
                        }
                    });

                } catch (error) {
                    // Handle any errors that occurred during the addition of the song
                    console.error(error);
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

// Unlink song from playlist
async function deleteSong(song_id) {
    return new Promise((resolve, reject) => {

        // Paramters for post request
        const paramsObj = {
            song_id: song_id,
            playlist_id: playlist_id
        };

        // Post to database
        makePostRequest('unlink_song.php', paramsObj, function (error, response) {
            if (error) {
                const customError = new Error('Error creating playlist');
                customError.error = error;
                customError.response = response;
                console.error(customError);
                reject(customError);
            } else {
                resolve();
            }
        });
    });
}

// Delete song click
function handleDeleteSong(event, song) {
    event.stopPropagation(); // Prevent event propagation to the list item

    // Modal message
    const message = `Do you want to delete the song "${song.song_name}"?`;

    // Create Modal objects
    const yesButton = createButton("Yes", "modal-button modal-button-yes");
    const noButton = createButton("No", "modal-button modal-button-no");

    // Add a click event listener to the "Yes" button
    yesButton.addEventListener("click", async () => {
        // GET EXTERNAL PLAYLIST HERE FROM LOCAL STORAGE HERE INSTEAD, MAKE THIS A SMARTER FUNCTION!
        const user_id = localStorage.getItem('user_id');
        const streaming_service = localStorage.getItem('streaming_service');

        // Unlink song from TasteList playlist
        deleteSong(song.song_id);

        const paramsObj = {
            user_id: user_id,
            playlist_id: playlist_id,
            song_id: song.song_id,
            song_name: song.song_name,
            artist: song.artist,
            action: 'D'
        };

        // Post to updates
        makePostRequest('playlist_updates.php', paramsObj, function (error, response) {
            if (error) {
                console.log(response); // Handle the error response
                reject(error);
            } else {
                // Handle the successful response here
                //console.log(response);
            }
        });

        // Delete the modal
        const modalContainer = document.getElementById("modal-container-id");
        modalContainer.parentNode.removeChild(modalContainer);
    });

    // Add a click event listener to the "No" button
    noButton.addEventListener("click", () => {
        // Delete the modal
        const modalContainer = document.getElementById("modal-container-id");
        modalContainer.parentNode.removeChild(modalContainer);
    });

    // Create modal 
    createModal(message, null, [yesButton, noButton], false);
}

function handleTrashClick(song, event) {
    const user_id = localStorage.getItem('user_id')
    // Only user who added can delete song
    if (parseInt(song.added_by_user_id) === parseInt(user_id)) {
        handleDeleteSong(event, song);
    }
}


async function handleEditPlaylistClick() {
    // Modal message
    const message = `Playlist Details`;

    // Create Modal objects
    const yesButton = createButton("Confirm", "modal-button modal-button-yes");
    const noButton = createButton("Cancel", "modal-button modal-button-no");

    // Create input element for playlist name
    const playlistNameLabel = document.createElement("label");
    playlistNameLabel.textContent = "Playlist Name";
    const playlistNameInput = document.createElement("input");
    playlistNameInput.type = "text";
    playlistNameInput.id = "playlistNameInput";
    playlistNameInput.value = document.getElementById("playlistName").textContent;

    // Create input element for playlist description
    const playlistDescriptionLabel = document.createElement("label");
    playlistDescriptionLabel.textContent = "Playlist Description";
    const playlistDescriptionInput = document.createElement("textarea");
    playlistDescriptionInput.id = "playlistDescriptionInput";
    playlistDescriptionInput.value = document.getElementById("playlistDescription").textContent;

    // Create a checkbox element with label text
    const checkboxLabel = document.createElement("label");
    checkboxLabel.textContent = "Public playlist";
    const publicCheckbox = document.createElement("input");
    publicCheckbox.type = "checkbox";
    publicCheckbox.id = "publicCheckbox";

    if (document.getElementById("playlistPrivacy").textContent === "Public") {
        publicCheckbox.checked = true;
    }

    // Create a container for inputs, checkbox, and labels
    const inputContainer = document.createElement("div");
    inputContainer.className = "input-container";
    inputContainer.appendChild(playlistNameLabel);
    inputContainer.appendChild(playlistNameInput);
    inputContainer.appendChild(playlistDescriptionLabel);
    inputContainer.appendChild(playlistDescriptionInput);
    inputContainer.appendChild(checkboxLabel);
    inputContainer.appendChild(publicCheckbox);

    // Add a click event listener to the "Yes" button
    yesButton.addEventListener("click", async () => {
        loadOperation(() => {
            // Retrieve values from the inputs
            const newName = playlistNameInput.value;
            const newDescription = playlistDescriptionInput.value;
            const isPublic = publicCheckbox.checked ? 1 : 0;
            const user_id = localStorage.getItem('user_id');

            // Delete the modal
            const modalContainer = document.getElementById("modal-container-id");
            modalContainer.parentNode.removeChild(modalContainer);

            const paramsObj = {
                playlist_id: playlist_id,
                playlist_name: newName,
                description: newDescription,
                is_public: isPublic
            };

            // Post to database
            makePostRequest('update_playlist_info.php', paramsObj, function (error, response) {
                (async () => {
                    if (error) {
                        const customError = new Error('Error updating playlist');
                        customError.error = error;
                        customError.response = response;
                        console.error(customError);
                        reject(customError);
                    } else {

                    }
                })();
            });

            const paramsObj2 = {
                user_id: user_id,
                playlist_id: playlist_id,
                song_id: null,
                song_name: null,
                artist: null,
                action: 'E'
            };

            // Post to updates
            makePostRequest('playlist_updates.php', paramsObj2, function (error, response) {
                if (error) {
                    console.log(response); // Handle the error response
                    reject(error);
                } else {
                    // Handle the successful response here
                    //console.log(response);
                }
            });

        });
    });

    // Add a click event listener to the "No" button
    noButton.addEventListener("click", () => {
        // Delete the modal
        const modalContainer = document.getElementById("modal-container-id");
        modalContainer.parentNode.removeChild(modalContainer);
    });

    // Create modal
    createModal(message, [inputContainer], [yesButton, noButton], false);
}

function fetchPlaylistInfo() {
    return new Promise((resolve, reject) => {
        try {
            // parameters for GetRequest
            const paramsObj = {
                playlist_id: playlist_id
            };

            // Get external playlist id from the database for the playlist
            makeGetRequest('get_playlist_info.php', paramsObj, (error, response) => {
                if (error) {
                    console.error("Error fetching playlist info:", error);
                    reject(error);
                } else {
                    resolve(response);
                }
            });

        } catch (error) {
            console.error("Error fetching TasteList playlists:", error);
            reject(error);
        }
    });
}

function displayPlaylistInfo() {
    return new Promise(async (resolve, reject) => {
        try {
            const playlistInfo = await fetchPlaylistInfo();
            document.getElementById("playlistName").textContent = playlistInfo.playlist_name;
            document.getElementById("creatorName").textContent = playlistInfo.creator_display_name;
            const displayNames = playlistInfo.collaborators.map(collaborator => collaborator.display_name);
            const displayNamesText = displayNames.join(', ');
            document.getElementById("collaboratorsList").textContent = displayNamesText;
            document.getElementById("playlistDescription").textContent = playlistInfo.description;
            document.getElementById("playlistPrivacy").textContent = playlistInfo.is_public ? "Public" : "Private";

            resolve(playlistInfo);
        } catch (error) {
            console.error("Error displaying playlist info:", error);
            reject(error);
        }
    });
}

async function displayPlaylist() {
    playlist_id = localStorage.getItem('playlist_id'); // REPLICATE THIS PROCESS OF GLOBAL VARIABLES IN APPFUNCTIONS AND THIS FILE!!!!!!!!!!!
    try {
        loadOperation(async () => {
            // Display playlist information
            const playlist_info = await displayPlaylistInfo();

            inviteCollaboratorButton.addEventListener("click", () => {
                const user_id = localStorage.getItem('user_id');
                const creator_id = playlist_info.creator_id;
                const invite_code = playlist_info.invite_code;

                if (parseInt(user_id) === parseInt(creator_id)) {
                    copyInviteLink(invite_code);
                }
            });

            // Display the playlist's songs
            await displayPlaylistSongs();
        });

         longPoll();
    } catch (error) {
        console.error("Error displaying playlist:", error);
    }
}

/**
 * EDITPLAYLIST.JS FUNCTION
 */

function displayPlaylistSongs() {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await fetch(`/app/get_songs.php?playlist_id=${playlist_id}`);
            if (!response.ok) {
                reject("Error fetching playlist songs: " + response.statusText);
                return;
            }

            const song_details = await response.json();

            // Clear existing list
            const songList = document.getElementById("songList");
            songList.innerHTML = "";

            if (song_details.length === 0) {
                songList.innerHTML = "<tr><td colspan='5'>No songs found.</td></tr>";
            } else {
                song_details.forEach(addSongToList);
            }

            resolve(); // Successfully displayed songs
        } catch (error) {
            reject("Error fetching playlist songs: " + error);
        }
    });
}

function addSongToList(song) {
    const songList = document.getElementById("songList");

    // Create a table row
    const row = document.createElement("tr");

    // Create table cells for song details
    const songNameCell = document.createElement("td");
    songNameCell.textContent = song.song_name;
    row.appendChild(songNameCell);

    const artistsCell = document.createElement("td");
    artistsCell.textContent = song.artist;
    row.appendChild(artistsCell);

    const albumCell = document.createElement("td");
    albumCell.textContent = song.album;
    row.appendChild(albumCell);

    const userCell = document.createElement("td");
    userCell.textContent = song.display_name;
    row.appendChild(userCell);

    const datetimeCell = document.createElement("td");
    datetimeCell.textContent = song.added_datetime;
    row.appendChild(datetimeCell);

    // Create a div to contain the trash can icon
    const trashCanContainer = document.createElement("div");
    trashCanContainer.className = "delete-icon-container";

    // Create an img element for the trash icon
    const deleteIcon = document.createElement("img");
    deleteIcon.src = "src/trash-icon.png";
    deleteIcon.alt = "Delete";
    deleteIcon.className = "delete-icon";

    // Add a click event listener for the trash icon
    deleteIcon.addEventListener("click", function (event) {
        handleTrashClick(song, event)
    });

    // Append the trash can icon to its container
    trashCanContainer.appendChild(deleteIcon);
    row.appendChild(trashCanContainer);

    // Append the row to the songList tbody
    songList.appendChild(row);

    // Map the song ISRC value to its corresponding list item
    songMap.set(song.song_id, row);
}

function fetchSongDetails(songId) {
    return new Promise((resolve, reject) => {
        makeGetRequest('get_playlist_song_by_isrc.php', { song_id: songId, playlist_id: playlist_id }, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}

async function handlePlaylistUpdates(paramsObj, lastUpdateId) {
    try {
        const data = await new Promise((resolve, reject) => {
            makeGetRequest('playlist_updates.php', paramsObj, function (err, responseData) {
                if (err) {
                    reject(err);
                } else {
                    resolve(responseData);
                }
            });
        });

        if (data && Object.keys(data).length > 0) {
            const streaming_service = localStorage.getItem('streaming_service');
            const user_id = localStorage.getItem('user_id');
            const isrcCode = data.song_id;
            if (data.action === 'A') {
                const song = await fetchSongDetails(data.song_id);
                addSongToList(song);
                //console.log(`user ${song.display_name} added ${song.song_name} by ${song.artist}`);
                postSongsToExternalConnection([isrcCode], playlist_id, streaming_service);
            } else if (data.action === 'D') {
                const response = await getExternalConnection(playlist_id, user_id);
                const external_playlist_id = response.external_playlist_id; // PLEASE FIX THIS!!!!!!!! USE GLOBAL VARIABLE, NO NEED FOR FETCH

                if (streaming_service === 'S') {
                    deleteSongFromSpotifyPlaylist([isrcCode], external_playlist_id);
                }

                const row = songMap.get(isrcCode);
                if (row) {
                    row.remove();
                }
                songMap.delete(isrcCode);
            } else if (data.action === 'E') {

                // Display updated playlist info
                const playlistInfo = await displayPlaylistInfo();

                //console.log("displayed new playlist info");

                // Use the Promise to get external connection information
                const response = await getExternalConnection(playlist_id, user_id); // CHANGE THIS!!!!!
                const external_playlist_id = response.external_playlist_id;

                if (streaming_service === 'S') {
                    updateSpotifyPlaylistInfo(playlistInfo.playlist_name, external_playlist_id, playlistInfo.description, playlistInfo.is_public === 1);
                }
            }
            return data.update_id; // return the new update_id for next poll
        }
    } catch (err) {
        console.error(err);
        return lastUpdateId; // in case of an error, consider retrying with the last update_id or handle it differently
    }
}

// Search bar
document.getElementById('searchBar').addEventListener('input', function () {
    let searchValue = this.value.toLowerCase();
    let tableRows = document.querySelectorAll('#songList tr');

    tableRows.forEach(row => {
        let songName = row.cells[0].textContent.toLowerCase();
        let artistName = row.cells[1].textContent.toLowerCase();

        if (songName.includes(searchValue) || artistName.includes(searchValue)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
});

const headers = document.querySelectorAll('#playlistTable th');

// Exclude the last header (delete button) from the headers array
const sortableHeaders = Array.from(headers).slice(0, -1);

let lastSortedColumn = null;
let sortOrder = 0; // 0: original (by Date & Time Added), 1: ascending, 2: descending

sortableHeaders.forEach((header, index) => {
    header.addEventListener('click', function () {
        if (lastSortedColumn === index) {
            sortOrder = (sortOrder + 1) % 3;
        } else {
            lastSortedColumn = index;
            sortOrder = 1; // Start with ascending
        }
        sortTable(index, sortOrder);
    });
});

function sortTable(columnIndex, sortOrder) {
    let rows = Array.from(document.querySelectorAll('#songList tr'));

    if (sortOrder === 1) {
        rows.sort((a, b) => {
            const textA = a.cells[columnIndex].textContent.trim();
            const textB = b.cells[columnIndex].textContent.trim();
            return textA.localeCompare(textB);
        });
    } else if (sortOrder === 2) {
        rows.sort((a, b) => {
            const textA = a.cells[columnIndex].textContent.trim();
            const textB = b.cells[columnIndex].textContent.trim();
            return textB.localeCompare(textA);
        });
    } else {
        // When sortOrder is 0, sort by "Date & Time Added" in ascending order
        rows.sort((a, b) => {
            const textA = a.cells[4].textContent.trim(); // Date & Time Added is the fifth column, index 4
            const textB = b.cells[4].textContent.trim();
            return textA.localeCompare(textB);
        });
    }

    const songList = document.querySelector('#songList');
    songList.innerHTML = ''; // Clear current rows

    // Append rows in their new order
    rows.forEach(row => songList.appendChild(row));
}

let pollingTimeout = null;
let isPolling = false; // Locking mechanism
let shouldContinuePolling = true; 

function getLatestUpdateId(callback) {
    const paramsObj = { playlist_id: playlist_id };

    makeGetRequest('get_latest_update_id.php', paramsObj, function (err, data) {
        if (err) {
            callback(err);
        } else {
            callback(null, data.update_id);
        }
    });
}

function longPoll() {
    if (isPolling) {
        return;
    }

    isPolling = true;

    getLatestUpdateId(async function (err, initialUpdateId) {
        if (err) {
            console.error("Error fetching the latest update ID:", err);
            isPolling = false; // Unlock and allow future polling
            return;
        }

        let latestUpdateId = initialUpdateId;

        async function pollForUpdates() {
            if (!shouldContinuePolling) {
                isPolling = false; // Unlock and allow future polling
                return;
            }

            const paramsObj = {
                playlist_id: playlist_id,
                last_update_id: latestUpdateId
            };

            try {
                const newUpdateId = await handlePlaylistUpdates(paramsObj, latestUpdateId);

                if (newUpdateId > latestUpdateId) { // Ensure we only update if the new ID is greater
                    latestUpdateId = newUpdateId;
                }
            } catch (err) {
                console.error("Error during polling:", err);
            } finally {
                if (shouldContinuePolling) {
                    pollingTimeout = setTimeout(pollForUpdates, 2000);
                } else {
                    isPolling = false; // Unlock and allow future polling
                } 
            }
        }

        pollForUpdates();
    });
}

function stopPolling() {
    shouldContinuePolling = false;
    if (pollingTimeout !== null) {
        clearTimeout(pollingTimeout);
        pollingTimeout = null;
    }
}

window.addEventListener('beforeunload', stopPolling);