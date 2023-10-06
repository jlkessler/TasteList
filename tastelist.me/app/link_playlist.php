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
        $user_id = $data['user_id'];
        $external_playlist_id = $data['external_playlist_id'];
    }
}

$conn = new mysqli($hostname, $username, $password, $database);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$successMessage = '';
$errorMessage = '';

try {
    $sql_link_playlist = "INSERT INTO playlist_collaborators (playlist_id, user_id, external_playlist_id) VALUES (?, ?, ?)";
    $stmt_link_playlist = $conn->prepare($sql_link_playlist);
    $stmt_link_playlist->bind_param('iis', $playlist_id, $user_id, $external_playlist_id);
        
    if ($stmt_link_playlist->execute()) {
        $successMessage .= " Playlist linked successfully.";
    } else {
        $errorMessage = "Error: " . $stmt_link_playlist->error;
    }
}
catch (Exception $e) {
    $errorMessage = "Error: " . $e->getMessage();
}

$conn->close();

header('Content-Type: application/json');
$response = array('message' => $successMessage, 'error' => $errorMessage);
echo json_encode($response);
?>