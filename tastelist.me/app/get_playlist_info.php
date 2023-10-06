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

// Create a connection to the database
$conn = new mysqli($hostname, $username, $password, $database);

// Check the connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Playlist ID provided as a parameter
$playlist_id = $_GET['playlist_id'];

$sql = "
    SELECT
        playlists.playlist_id,
        playlists.playlist_name,
        playlists.creator_id,
        playlists.description,
        playlists.is_public,
        playlists.invite_code,
        users.display_name AS creator_display_name
    FROM playlists
    LEFT JOIN users ON playlists.creator_id = users.id
    WHERE playlists.playlist_id = ?
";

// Prepare the SQL statement
$stmt = $conn->prepare($sql);

// Bind the playlist_id parameter using "i" for int
$stmt->bind_param('i', $playlist_id);

// Execute the SQL statement
$stmt->execute();

// Bind the result variables
$stmt->bind_result(
    $playlist_id,
    $playlist_name,
    $creator_id,
    $description,
    $is_public,
    $invite_code,
    $creator_display_name
);

// Initialize an empty playlist object
$playlist = array();

if ($stmt->fetch()) {
    // Assign the values to the playlist object
    $playlist = array(
        'playlist_id' => $playlist_id,
        'playlist_name' => $playlist_name,
        'creator_id' => $creator_id,
        'creator_display_name' => $creator_display_name,
        'description' => $description,
        'is_public' => $is_public,
        'invite_code' => $invite_code
    );
}

// Close the first statement
$stmt->close();

// Initialize an empty array to store collaborators with both id and display_name
$collaborators = array();

$sql = "
    SELECT
        users.id,
        users.display_name,
        users.streaming_service,
        users.username
    FROM playlist_collaborators
    LEFT JOIN users ON playlist_collaborators.user_id = users.id
    WHERE playlist_collaborators.playlist_id = ?
";

// Prepare the SQL statement
$stmt = $conn->prepare($sql);
$stmt->bind_param('i', $playlist_id);
$stmt->execute();
$stmt->bind_result($collaborator_id, $collaborator_display_name, $collaborator_streaming_service, $username);

while ($stmt->fetch()) {
    // Create an associative array to store id and display_name
    $collaborator = array(
        'id' => $collaborator_id,
        'display_name' => $collaborator_display_name,
        'streaming_service' => $collaborator_streaming_service,
        'username' => $username
    );
    $collaborators[] = $collaborator;
}

// Close the statement
$stmt->close();

$conn->close();

// Add collaborators to the playlist object
$playlist['collaborators'] = $collaborators;

// Return the playlist data as JSON
header('Content-Type: application/json');
echo json_encode($playlist);
?>