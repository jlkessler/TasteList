// MAIN FUNCTION
(async function () {
    // Check if parameters are present in the query parameters
    const inviteCodeParam = getQueryParam("invite_code");
    const playlistID = getQueryParam("playlist_id");

    if (inviteCodeParam && playlistID) {
        // If both invite code and playlist ID are present, store them in local storage
        localStorage.setItem('invite_code', inviteCodeParam);
        localStorage.setItem('playlist_id', playlistID);
        window.history.replaceState({}, document.title, "https://www.tastelist.me/editPlaylist.html");
    }

    const storedAccessToken = localStorage.getItem('accessToken');
    const streaming_service = localStorage.getItem('streaming_service');
    var isTokenValid = null;
    if (storedAccessToken && streaming_service) {
        isTokenValid = await checkAccessTokenValidity(storedAccessToken, streaming_service);
    }

    if (isTokenValid) {
        // Continue with the rest of your code for a valid access token
        const user_id = localStorage.getItem('user_id');
        const playlist_id = localStorage.getItem('playlist_id');
        const invite_code = localStorage.getItem('invite_code');

        if (invite_code) {
            localStorage.removeItem('invite_code');
            // VALIDATE 
            const response = await validateInviteCode(invite_code, playlist_id);
            if (response.is_invite_valid === true) {
                await linkCollaborator();
            }
        }
        
        if (playlist_id) {
            window.history.replaceState({}, document.title, "https://www.tastelist.me/editPlaylist.html");
            displayPlaylist();
        } else {
            // Handle the case when playlist_id is not available
            window.location.href = "https://www.tastelist.me";
        }
    } else {
        // The stored access token is invalid, so remove it from local storage and redirect to login
        if (storedAccessToken) {
            localStorage.removeItem('accessToken');
        }
        window.location.href = "https://www.tastelist.me";
    }
})();