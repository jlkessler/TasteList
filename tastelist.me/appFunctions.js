
const createPlaylistButton = document.getElementById("createPlaylistButton");

createPlaylistButton.addEventListener("click", () => {
    handleCreatePlaylistButtonClick();
});

/**
 * Checks if a user exists in the database 
 * and adds them if they do not exist and
 * returns the TasteList user_id
 * given a user's username
 */
async function addUserToDatabase(username, streaming_service, display_name) {
    return new Promise((resolve, reject) => {

        // Paramters for post request ADD_USER
        const paramsObj = {
            username: username,
            streaming_service: streaming_service,
            display_name: display_name
        };

        // Post to database
        makePostRequest('add_user.php', paramsObj, function (error, response) {
            if (error) {
                //console.error("Error adding playlist to the database:", error);
                reject(console.log(response));
            } else {
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
            }
        });
    });
}

/**
 * Displays import playlist options
 * given a playlist name, id, and id of the owner of the playlist
 */
function displayImportConfirmation(playlistName, playlistID, playlistOwnerID) {

    // Modal message
    const message = `Do you want to import the playlist "${playlistName}" to TasteList?`;

    // Create Modal objects
    const yesButton = createButton("Yes", "modal-button modal-button-yes");
    const copyButton = createButton("Copy", "modal-button modal-button-copy");
    const noButton = createButton("No", "modal-button modal-button-no");

    // Add a click event listener to the "Yes" button
    yesButton.addEventListener("click", async () => {
        importDirectPlaylistClick(playlistName, playlistID, playlistOwnerID);
    });

    // Add a click event listener to the "No" button
    noButton.addEventListener("click", () => {
        handleNoClick();
    });

    // Add a click event listener to the "Copy" button
    copyButton.addEventListener("click", async () => {
        handleCopyClick(playlistName, playlistID);
    })

    // Create modal 
    createModal(message, null, [yesButton, copyButton, noButton], false);
}


// Yes playlist click
async function importDirectPlaylistClick(playlistName, playlistID, playlistOwnerID) {
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
        await importPlaylistTracks(playlistID, playlist_id, userID);
    } catch (error) {
        console.error("Error during playlist import:", error);
    }

    // Close the modal
    const modalContainer = document.getElementById("modal-container-id");
    modalContainer.parentNode.removeChild(modalContainer);

}

// No Playlist click
async function handleNoClick() {
    // Remove the modal
    const modalContainer = document.getElementById("modal-container-id");
    modalContainer.parentNode.removeChild(modalContainer);
}

// Copy playlist click
async function handleCopyClick(playlistName, playlistID) {
    try {
        const storedAccessToken = localStorage.getItem('accessToken');
        const streaming_service = localStorage.getItem('streaming_service');
        const profileID = localStorage.getItem('username');

        loadOperation(async () => {
            // Create playlist on Spotify
            const external_playlist_id = await createSpotifyPlaylist(`${playlistName} (TasteList)`, profileID); // Input the rest of the info!!!!!!!!!!!

            // Add playlist to the database
            const user_id = localStorage.getItem('user_id');

            // createPlaylist(playlistName, user_id, description, is_public, external_playlist_id) IMPORT ACTUAL INFORMATION
            const playlist_id = await createPlaylist(playlistName, user_id, "description", true, external_playlist_id);

            // Add songs from Spotify to imported copy
            await importPlaylistTracks(playlistID, playlist_id, user_id, true);

            // Fetch and display TasteList playlists (JUST APPEND LIST ITEM!!!!)
            await fetchAndDisplayTasteListPlaylists(user_id, streaming_service);

            // Fetch and display Spotify playlists
            await fetchAndDisplayPlaylists(profileID, streaming_service);

            // Close the modal
            const modalContainer = document.getElementById("modal-container-id");
            modalContainer.parentNode.removeChild(modalContainer);
        });


    } catch (error) {
        console.error('An error occurred:', error);
    }
}

async function handleCreatePlaylistButtonClick() {
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

    // Create input element for playlist description
    const playlistDescriptionLabel = document.createElement("label");
    playlistDescriptionLabel.textContent = "Playlist Description";
    const playlistDescriptionInput = document.createElement("textarea");
    playlistDescriptionInput.id = "playlistDescriptionInput";

    // Create a checkbox element with label text
    const checkboxLabel = document.createElement("label");
    checkboxLabel.textContent = "Public playlist";
    const publicCheckbox = document.createElement("input");
    publicCheckbox.type = "checkbox";
    publicCheckbox.id = "publicCheckbox";
    publicCheckbox.checked = true;

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
        handleCreatePlaylistConfirmButtonClick(playlistNameInput.value, playlistDescriptionInput.value, publicCheckbox.checked ? 1 : 0);
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

// Delete playlist click
function handleDeletePlaylist(event, playlist_id, playlist_name, external_playlist_id, creator_id) {
    event.stopPropagation(); // Prevent event propagation to the list item

    // Create Modal objects
    var message;
    const yesButton = createButton("Yes", "modal-button modal-button-yes");
    const noButton = createButton("No", "modal-button modal-button-no");

    // Create a checkbox element with label text
    const checkboxLabel = document.createElement("label");
    checkboxLabel.textContent = "Delete streaming platform version of the playlist";
    const deleteCheckbox = document.createElement("input");
    deleteCheckbox.type = "checkbox";
    deleteCheckbox.id = "deleteCheckbox";
    // Create a container for checkbox and label
    const checkboxContainer = document.createElement("div");
    checkboxContainer.className = "checkbox-container";
    checkboxContainer.appendChild(checkboxLabel);
    checkboxContainer.appendChild(deleteCheckbox);

    const user_id = localStorage.getItem('user_id');

    if (parseInt(user_id) !== parseInt(creator_id)) {

        // Modal message
        message = `Do you want to remove "${playlist_name}" from your playlists?`;

        // Add a click event listener to the "Yes" button
        yesButton.addEventListener("click", async () => {

            // Check to delete external playlist
            const deleteStreamingPlatform = deleteCheckbox.checked;
            if (deleteStreamingPlatform) {
                // get external connection and delete
                const streaming_service = localStorage.getItem('streaming_service');
                if (streaming_service === 'S') {
                    const username = localStorage.getItem('username');
                    await deleteSpotifyPlaylist(external_playlist_id);
                    await fetchAndDisplayPlaylists(username, 'S'); // JUST DELETE LIST ITEM IN THE FUTURE!!!!
                }
            }

            // Delete TasteList playlist
            await unlinkPlaylist(playlist_id);

            // Display playlists (please only delete the list item in the future...)
            const user_id = localStorage.getItem('user_id');
            await fetchAndDisplayTasteListPlaylists(user_id);

            // Delete the modal
            const modalContainer = document.getElementById("modal-container-id");
            modalContainer.parentNode.removeChild(modalContainer);
        });
    } else {
        // Modal message
        message = `Do you want to delete the playlist "${playlist_name}"?`;

        // Add a click event listener to the "Yes" button
        yesButton.addEventListener("click", async () => {

            // Check to delete external playlist
            const deleteStreamingPlatform = deleteCheckbox.checked;
            if (deleteStreamingPlatform) {
                // get external connection and delete
                const streaming_service = localStorage.getItem('streaming_service');
                if (streaming_service === 'S') {
                    const username = localStorage.getItem('username');
                    await deleteSpotifyPlaylist(external_playlist_id);
                    await fetchAndDisplayPlaylists(username, 'S'); // JUST DELETE LIST ITEM IN THE FUTURE!!!!
                }
            }

            // Delete TasteList playlist
            await deletePlaylist(playlist_id);

            // Display playlists (please only delete the list item in the future...)
            const user_id = localStorage.getItem('user_id');
            await fetchAndDisplayTasteListPlaylists(user_id);

            // Delete the modal
            const modalContainer = document.getElementById("modal-container-id");
            modalContainer.parentNode.removeChild(modalContainer);
        });
    }

    // Add a click event listener to the "No" button
    noButton.addEventListener("click", () => {
        // Delete the modal
        const modalContainer = document.getElementById("modal-container-id");
        modalContainer.parentNode.removeChild(modalContainer);
    });

    // Create modal 
    createModal(message, [checkboxContainer], [yesButton, noButton], false);
}

async function handleCreatePlaylistConfirmButtonClick(playlistName, description, is_public) {
    // Get the playlist name from the input field
    const username = localStorage.getItem('username');

    // Check if the playlist name is not empty

    // Create playlist on Spotify
    const external_playlist_id = await createSpotifyPlaylist(playlistName, username, description, is_public);

    // Add playlist to the database
    const user_id = localStorage.getItem('user_id');
    await createPlaylist(playlistName, user_id, description, is_public, external_playlist_id);

    // Update playlist display (JUST APPEND A LIST ITEM!!!!!)
    fetchAndDisplayPlaylists(username, 'S'); // UPDATE TO ACCOUNT FOR STREAMING SERVICE!!!!!!!!
    fetchAndDisplayTasteListPlaylists(user_id);

    // Delete the modal
    const modalContainer = document.getElementById("modal-container-id");
    modalContainer.parentNode.removeChild(modalContainer);
}

/**
 * Displays a user's information
 * given a profile object
 */
async function displayProfile(profile, streaming_service) {
    loadOperation(async () => {
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
        await fetchAndDisplayPlaylists(profile.id, streaming_service);

        // Fetch and display TasteList playlists
        const userID = localStorage.getItem('user_id');
        await fetchAndDisplayTasteListPlaylists(userID);
    });
}


function addTasteListPlaylistListItem(playlist) {
    const tastelistPlaylistList = document.getElementById("tastelistPlaylistList");

    const listItem = document.createElement("li");
    listItem.textContent = playlist.playlist_name;

    // Create an img element for the trash icon
    var deleteIcon = document.createElement("img");
    deleteIcon.src = "src/trash-icon.png";
    deleteIcon.alt = "Delete";
    deleteIcon.className = "delete-icon";

    // Add a click event listener for the trash icon
    deleteIcon.addEventListener("click", function (event) {
        handleTrashClick(playlist, event)
    });

    // Navigate to edit playlist when clicked
    listItem.addEventListener("click", () => {
        handleEditPlayistClick(playlist.playlist_id);
    });

    // Append the text and trash icon to the list item
    listItem.appendChild(deleteIcon);

    tastelistPlaylistList.appendChild(listItem);
}


/**
 * fetchAndDisplayTasteListPlaylists Helper Function
 */
function displayTasteListPlaylists(playlists) {
    // Clear the list
    const tastelistPlaylistList = document.getElementById("tastelistPlaylistList");
    tastelistPlaylistList.innerHTML = "";

    if (playlists.length === 0) {
        // Handle case when no TasteList playlists are available
        tastelistPlaylistList.innerHTML = "<p>No TasteList playlists found.</p>";
    } else {
        playlists.forEach((playlist) => {
            addTasteListPlaylistListItem(playlist);
        });
    }
}

function handleEditPlayistClick(playlist_id) {
    // Store which playlist to show
    localStorage.setItem('playlist_id', playlist_id);

    // Navigate to the editPlaylist.html page with query parameters
    const editPlaylistURL = `editPlaylist.html`;
    window.location.href = editPlaylistURL;
}

function handleTrashClick(playlist, event) {
    const playlistId = playlist.playlist_id;
    const playlistName = playlist.playlist_name;
    const external_playlist_id = playlist.external_playlist;
    const creator_id = playlist.creator_id;
    handleDeletePlaylist(event, playlistId, playlistName, external_playlist_id, creator_id);
}

function addPlaylistListItem(playlist) {
    const playlistList = document.getElementById("playlistList");

    const listItem = document.createElement("li");
    listItem.textContent = playlist.name;

    // Add a click event listener to the playlist item
    listItem.addEventListener("click", () => {
        displayImportConfirmation(playlist.name, playlist.id, playlist.owner.id);
    });

    playlistList.appendChild(listItem);
}

/**
 * Fetches the user's streaming service playlists
 * and displays them
 * given a username
 */
async function fetchAndDisplayPlaylists(username, streaming_service) {
    try {
        const storedAccessToken = localStorage.getItem('accessToken');
        if (checkAccessTokenValidity(storedAccessToken, streaming_service) === false) {
            logout(); // DO MORE HERE
        }

        let playlists;

        if (streaming_service === 'S') {
            try {
                // Get Spotify playlists
                const playlistsItems = await fetchSpotifyPlaylists(username);
                playlists = playlistsItems.items;
            } catch (error) {
                console.error("Error fetching and displaying playlists:", error);
            }
        }

        // Clear the playlist display list (MAKE THIS UNNECESSARY)
        const playlistList = document.getElementById("playlistList");
        playlistList.innerHTML = "";

        // Display each playlist
        playlists.forEach((playlist) => {
            addPlaylistListItem(playlist);
        });

    } catch (error) {
        console.error("Error fetching playlists:", error);
    }
}

function fetchAndDisplayTasteListPlaylists(user_id) {
    return new Promise((resolve, reject) => {
        try {
            // parameters for GetRequest
            const paramsObj = {
                user_id: user_id
            };

            // Get external playlist id from the database for the playlist
            makeGetRequest('get_playlists.php', paramsObj, (error, response) => {
                if (error) {
                    console.error("Error fetching playlist connection:", error);
                    reject(error);
                } else {
                    displayTasteListPlaylists(response);
                    resolve(response);
                }
            });

        } catch (error) {
            console.error("Error fetching TasteList playlists:", error);
            reject(error);
        }
    });
}

// I DONT LIKE HOW THIS IS NAMED
/**
 * Creates a playlist on both TasteList and the streaming service
 * returns the TasteList playlist_id
 */
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

/**
 * Gets a user's profile information
 * using an API call to their streaming servce and
 * returns the profile information
 */
function fetchProfile(token, streaming_service) {
    return new Promise(async (resolve, reject) => {
        if (streaming_service === 'S') {
            try {
                const profile = await fetchSpotifyProfile(token);
                resolve(profile);
            } catch (error) {
                reject(error);
            }
        }
    });
}

function deletePlaylist(playlist_id) {
    return new Promise((resolve, reject) => {

        // Paramters for post request
        const paramsObj = {
            playlist_id: playlist_id,
        };

        // Post to database
        makePostRequest('delete_playlist.php', paramsObj, function (error, response) {
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

function unlinkPlaylist(playlist_id) {
    return new Promise((resolve, reject) => {

        const user_id = localStorage.getItem('user_id');

        // Paramters for post request
        const paramsObj = {
            playlist_id: playlist_id,
            user_id: user_id
        };

        // Post to database
        makePostRequest('unlink_playlist.php', paramsObj, function (error, response) {
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

async function importPlaylistTracks(playlistID, playlist_id, user_id, copying) {
    try {
        const playlist = await fetchSpotifyPlaylistSnapshot(playlistID);
        if (playlist === null) {
            console.error('Failed to fetch playlist snapshot:', response.statusText);
        }
        const snapshotID = playlist.snapshot_id;

        const result = await fetchSpotifyPlaylistTracks(snapshotID);
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
 * Creates a new playlist in the TasteList database
 * using inputted playlist information
 * and links it to the creator user
 * given playlist information, and a creator_id (user)
 * returns the newly created playlist_id
 */
async function createPlaylist(playlistName, user_id, description, is_public, external_playlist_id) {
    return new Promise((resolve, reject) => {

        // Paramters for post request
        const paramsObj = {
            name: playlistName,
            creator_id: user_id,
            external_playlist_id: external_playlist_id,
            description: description,
            is_public: is_public
        };

        // Post to database
        makePostRequest('create_playlist.php', paramsObj, function (error, response) {
            if (error) {
                const customError = new Error('Error creating playlist');
                customError.error = error;
                customError.response = response;
                console.error(customError);
                reject(customError);
            } else {
                // Check if the response contains a playlist_id
                if (response.playlist_id) {
                    // Resolve the Promise with the playlist ID
                    resolve(response.playlist_id);
                } else {
                    // Create a custom error object with both error and response
                    const customError = new Error('Error creating playlist');
                    customError.error = error;
                    customError.response = response;
                    console.error(customError);
                    reject(customError);
                }
            }
        });
    });
}