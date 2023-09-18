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

// Retrieve playlist data from the request
$name = $_POST['name'];
$creator_id = $_POST['creator_id'];
$external_playlist_id = $_POST['external_playlist_id'];
$streaming_service = 'S'; // Only Spotify for now!!!!!!!

// Create a MySQLi connection
$conn = new mysqli($hostname, $username, $password, $database);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

try {
    // create playlist
    $sql_create_playlist = "INSERT INTO playlists (playlist_name, creator_id) VALUES (?, ?)";
    $stmt_create_playlist = $conn->prepare($sql_create_playlist);
    $stmt_create_playlist->bind_param('si', $name, $creator_id);
        
    if ($stmt_create_playlist->execute()) {
        $playlist_id = $conn->insert_id; // Get the auto-generated playlist_id
        //echo "Playlist created successfully.";
    } else {
        //echo "Error: " . $stmt_create_playlist->error;
    }
}
catch (Exception $e) {
    //echo "Error: " . $e->getMessage();
}

try {
    // link creator to playlist
    $sql_link_playlist = "INSERT INTO playlist_collaborators (playlist_id, user_id, external_playlist_id) VALUES (?, ?, ?)";
    $stmt_link_playlist = $conn->prepare($sql_link_playlist);
    $stmt_link_playlist->bind_param('iis', $playlist_id, $creator_id, $external_playlist_id);
        
    if ($stmt_link_playlist->execute()) {
        //echo "Playlist linked successfully.";
    } else {
        //echo "Error: " . $stmt_link_playlist->error;
    }
}
catch (Exception $e) {
    //echo "Error: " . $e->getMessage();
}

$conn->close(); // Close the database connection

$response = array('playlist_id' => $playlist_id);
header('Content-Type: application/json');
echo json_encode($response);
?>