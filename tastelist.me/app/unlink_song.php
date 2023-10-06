<?php

header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL); // disable these 3 lines in production

// Database connection details
$hostname = "bochat.iad1-mysql-e2-5b.dreamhost.com";
$username = "tastelist";
$password = "gmHjNTVur8Jxt9w4dMU6hy";
$database = "tastelistdatabase"; // Your database name

// Parameters
//$playlist_id = $_POST['playlist_id'];
//$song_id = $_POST['song_id'];

// Retrieve user data from the request (you need to adapt this to your actual data)
// Get the raw JSON data from the request body
$json_data = file_get_contents("php://input");

// Check if data was received
if ($json_data === false) {
    // Handle the error, data wasn't received
    echo "Error: Data not received.";
} else {
    // Parse the JSON data
    $data = json_decode($json_data, true);

    if ($data === null) {
        // Handle JSON parsing error
        echo "Error: Invalid JSON data.";
    } else {
        // Access the values
        $song_id = $data['song_id'];
        $playlist_id = $data['playlist_id'];
    }
}

$conn = new mysqli($hostname, $username, $password, $database);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$successMessage = '';
$errorMessage = '';

try {
    // Delete the song from the playlist_songs table based on playlist_id and song_id
    $sql_delete_song = "DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?";
    $stmt_delete_song = $conn->prepare($sql_delete_song);
    $stmt_delete_song->bind_param('is', $playlist_id, $song_id);
        
    if ($stmt_delete_song->execute()) {
        $stmt_delete_song->close(); // Close the first statement
        
        // Check if the song is linked to any other playlists
        $sql_check_playlists = "SELECT COUNT(*) FROM playlist_songs WHERE song_id = ?";
        $stmt_check_playlists = $conn->prepare($sql_check_playlists);
        $stmt_check_playlists->bind_param('s', $song_id);
        $stmt_check_playlists->execute();
        $stmt_check_playlists->bind_result($playlist_count);
        $stmt_check_playlists->fetch();
        $stmt_check_playlists->close(); // Close the second statement

        
        if ($playlist_count == 0) {
            // If the song is not in any other playlists, delete it from the songs table
            $sql_delete_song_from_songs = "DELETE FROM songs WHERE song_id = ?";
            $stmt_delete_song_from_songs = $conn->prepare($sql_delete_song_from_songs);
            $stmt_delete_song_from_songs->bind_param('s', $song_id);
            $stmt_delete_song_from_songs->execute();
            $stmt_delete_song_from_songs->close(); // Close the third statement
        }

        $successMessage .= "Song deleted successfully.";
    } else {
        $errorMessage = "Error: " . $stmt_delete_song->error;
    }
} catch (Exception $e) {
    $errorMessage = "Error: " . $e->getMessage();
}

$conn->close();

header('Content-Type: application/json');
$response = array('message' => $successMessage, 'error' => $errorMessage);
echo json_encode($response);
?>