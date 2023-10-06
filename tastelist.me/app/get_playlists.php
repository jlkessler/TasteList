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

// User ID provided as a parameter
$user_id = $_GET['user_id'];

$sql = "
    SELECT 
        playlists.playlist_id, 
        playlists.playlist_name,
        playlists.creator_id,
        playlists.description,
        playlists.is_public,
        playlist_collaborators.external_playlist_id
    FROM playlist_collaborators
    INNER JOIN users ON playlist_collaborators.user_id = users.id
    INNER JOIN playlists ON playlist_collaborators.playlist_id = playlists.playlist_id
    WHERE users.id = ?
";

// Prepare the SQL statement
$stmt = $conn->prepare($sql);

// Bind the user_id parameter using "i" for int
$stmt->bind_param('i', $user_id);

// Execute the SQL statement
$stmt->execute();

// Bind the result variables
$stmt->bind_result(
    $playlist_id,
    $playlist_name,
    $creator_id,
    $description,
    $is_public,
    $external_playlist
);

// Fetch all playlist data into an array
$playlists = array();

while ($stmt->fetch()) {
    $playlists[] = array(
        'playlist_id' => $playlist_id,
        'playlist_name' => $playlist_name,
        'creator_id' => $creator_id,
        'description' => $description,
        'is_public' => $is_public,
        'external_playlist' => $external_playlist
    );
}

$conn->close();

// Return the playlists as JSON
header('Content-Type: application/json');
echo json_encode($playlists);
?>