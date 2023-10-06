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
$database = "tastelistdatabase";

//$playlist_id = $_POST['playlist_id'];

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
    // Delete the playlist with the specified ID
    $sql_delete_playlist = "DELETE FROM playlists WHERE playlist_id = ?";
    $stmt_delete_playlist = $conn->prepare($sql_delete_playlist);
    $stmt_delete_playlist->bind_param('i', $playlist_id);

    if ($stmt_delete_playlist->execute()) {
        $stmt_delete_playlist->close();
        // Now, let's check if any songs are no longer linked to any playlist
        $sql_delete_unused_songs = "DELETE FROM songs WHERE song_id NOT IN (SELECT DISTINCT song_id FROM playlist_songs)";
        $stmt_delete_unused_songs = $conn->prepare($sql_delete_unused_songs);

        if ($stmt_delete_unused_songs->execute()) {
            $successMessage = "Playlist deleted successfully, and unused songs removed.";
        } else {
            $errorMessage = "Error removing unused songs: " . $stmt_delete_unused_songs->error;
        }
        $stmt_delete_unused_songs->close();
    } else {
        $errorMessage = "Error deleting playlist: " . $stmt_delete_playlist->error;
    }

} catch (Exception $e) {
    $errorMessage = "Error: " . $e->getMessage();
}

$conn->close();

header('Content-Type: application/json');
$response = array('message' => $successMessage, 'error' => $errorMessage);
echo json_encode($response);
?>