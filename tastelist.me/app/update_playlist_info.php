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

/*
$playlist_id = $_POST['playlist_id'];
$playlist_name = $_POST['playlist_name'];
$description = $_POST['description'];
$is_public = $_POST['is_public'];
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
        $playlist_id = $data['playlist_id'];
        $playlist_name = $data['playlist_name'];
        $description = $data['description'];
        $is_public = $data['is_public'];
    }
}

$conn = new mysqli($hostname, $username, $password, $database);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$successMessage = '';
$errorMessage = '';

try {
    $sql_update_playlist = "UPDATE playlists SET playlist_name = ?, description = ?, is_public = ? WHERE playlist_id = ?";
    $stmt_update_playlist = $conn->prepare($sql_update_playlist);
    $stmt_update_playlist->bind_param('ssii', $playlist_name, $description, $is_public, $playlist_id);
        
    if ($stmt_update_playlist->execute()) {
        $successMessage .= "Playlist updated successfully. Playlist ID: " . $playlist_id;
    } else {
        $errorMessage = "Error: " . $stmt_update_playlist->error;
    }
} catch (Exception $e) {
    $errorMessage = "Error: " . $e->getMessage();
}

$conn->close();

header('Content-Type: application/json');
$response = array('message' => $successMessage, 'error' => $errorMessage);
echo json_encode($response);
?>