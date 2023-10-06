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

/*
// Retrieve song IDs from the request
$song_ids = $_POST['song_ids'];
$user_id = $_POST['user_id'];
$playlist_id = $_POST['playlist_id'];
*/

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
        $song_ids = $data['song_ids'];
        $user_id = $data['user_id'];
        $playlist_id = $data['playlist_id'];
    }
}

// Create a MySQLi connection
$conn = new mysqli($hostname, $username, $password, $database);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Link songs to the specified playlist
foreach ($song_ids as $song_id) {
    // Check if the song exists in the songs table
    $sql_check_song = "SELECT song_id FROM songs WHERE song_id = ?";
    $stmt_check_song = $conn->prepare($sql_check_song);
    $stmt_check_song->bind_param('s', $song_id);
    $stmt_check_song->execute();
    $result = $stmt_check_song->get_result();

    if ($result->num_rows > 0) {
        // The song exists in the songs table, so link it to the playlist
        $timestamp = time();
        $sqlDateTime = date("Y-m-d H:i:s", $timestamp);

        $sql_link_song = "INSERT INTO playlist_songs (playlist_id, song_id, added_by_user_id, added_datetime) VALUES (?, ?, ?, ?)";
        $stmt_link_song = $conn->prepare($sql_link_song);
        $stmt_link_song->bind_param('isis', $playlist_id, $song_id, $user_id, $sqlDateTime);

        if ($stmt_link_song->execute()) {
            // Song linked to playlist successfully.
        } else {
            // Error handling for linking songs to playlists.
        }

        $stmt_link_song->close();
    } else {
        // Handle the case where the song does not exist in the songs table.
    }

    $stmt_check_song->close();
}

$conn->close(); // Close the database connection
?>