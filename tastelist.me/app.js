/**
 * Main
 */
(async function () {
    // Check if a stored access token is available in local storage

    const storedAccessToken = localStorage.getItem('accessToken');
    const streaming_service = localStorage.getItem('streaming_service');

    // ALREADY LOGGED IN
    if (storedAccessToken && streaming_service) {
        // Check the validity of the stored access token
        const isTokenValid = await checkAccessTokenValidity(storedAccessToken, streaming_service);

        if (isTokenValid) {
            const invite_code = localStorage.getItem('invite_code');
            if (invite_code) {
                const editPlaylistURL = `editPlaylist.html`; // ADD A DELAY FOR TESTING
                window.location.href = editPlaylistURL;
            }

            // The stored access token is valid, so fetch and display the profile information
            const profile = await fetchProfile(storedAccessToken, streaming_service);

            displayProfile(profile, streaming_service);
        } else {
            logout();
        }
    }

    // LOGGING IN
    // Check if an access token is present in the query parameters
    const accessTokenParam = getQueryParam("access_token");
    const streamingServiceParam = getQueryParam("streaming_service");

    if (accessTokenParam && streamingServiceParam) {
        // Store the access token in local storage
        localStorage.setItem('accessToken', accessTokenParam);
        localStorage.setItem('streaming_service', streamingServiceParam);

        // Rename website without the access token parameter
        window.history.replaceState({}, document.title, "https://www.tastelist.me/");

        // Fetch user profile (need to configure profile based on streaming service)
        const profile = await fetchProfile(accessTokenParam, streamingServiceParam);
        const profileID = profile.id;
        localStorage.setItem('username', profileID);

        // Attempt to add the user to the database
        await addUserToDatabase(profileID, streamingServiceParam, profile.display_name);

        // Using invite code
        const invite_code = localStorage.getItem('invite_code');
        if (invite_code) {
            const editPlaylistURL = `editPlaylist.html`; // ADD A DELAY FOR TESTING
            window.location.href = editPlaylistURL;
        }

        // Display the profile information
        displayProfile(profile, streamingServiceParam);
    }
})();