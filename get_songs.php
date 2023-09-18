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

// Start a transaction
$conn->begin_transaction();

// Playlist ID provided as a parameter
$playlist_id = $_GET['playlist_id'];

$sql = "
    SELECT
        songs.name AS song_name,
        songs.artist,
        songs.album,
        users.username,
        users.streaming_service,
        playlist_songs.added_datetime
    FROM playlist_songs
    INNER JOIN songs ON playlist_songs.song_id = songs.song_id
    INNER JOIN users ON playlist_songs.added_by_user_id = users.id
    WHERE playlist_songs.playlist_id = ?
";

// Prepare the SQL statement
$stmt = $conn->prepare($sql);

// Bind the playlist_id parameter using "i" for int
$stmt->bind_param('i', $playlist_id);

// Execute the SQL statement
$stmt->execute();

// Bind the result variables
$stmt->bind_result($song_name, $artist, $album, $username, $streaming_service, $added_datetime);

// Fetch all song details into an array
$song_details = array();

while ($stmt->fetch()) {
    $song_details[] = array(
        'song_name' => $song_name,
        'artist' => $artist,
        'album' => $album,
        'username' => $username,
        'streaming_service' => $streaming_service,
        'added_datetime' => $added_datetime
    );
}

// Commit the transaction to save the changes
$conn->commit();

$conn->close();

// Return the song details as JSON
header('Content-Type: application/json');
echo json_encode($song_details);
?>