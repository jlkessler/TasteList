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
        song_id
    FROM playlist_songs
    WHERE playlist_id = ?
";

// Create a MySQLi connection (Replace with your connection details)
$conn = new mysqli($hostname, $username, $password, $database);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Prepare the SQL statement
$stmt = $conn->prepare($sql);

// Bind the playlist_id parameter using "i" for int
$stmt->bind_param('i', $playlist_id);

// Execute the SQL statement
$stmt->execute();

// Bind the result variable
$stmt->bind_result($song_id);

// Fetch all song_ids into an array
$song_ids = array();

while ($stmt->fetch()) {
    $song_ids[] = $song_id;
}

// Close the database connection
$conn->close();

// Return the song_ids as JSON
header('Content-Type: application/json');
echo json_encode($song_ids);
?>