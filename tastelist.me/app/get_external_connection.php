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

// Get the user_id and playlist_id provided as parameters
$user_id = $_GET['user_id'];
$playlist_id = $_GET['playlist_id'];

$sql = "
    SELECT external_playlist_id
    FROM playlist_collaborators
    WHERE user_id = ? AND playlist_id = ?
";

// Prepare the SQL statement
$stmt = $conn->prepare($sql);

// Bind the parameters using "ii" for two integers
$stmt->bind_param('ii', $user_id, $playlist_id);

// Execute the SQL statement
$stmt->execute();

// Bind the result variable
$stmt->bind_result($external_playlist_id);

// Fetch the external_playlist_id
$stmt->fetch();

$conn->close();

// Return the external_playlist_id as JSON
header('Content-Type: application/json');
echo json_encode(['external_playlist_id' => $external_playlist_id]);
?>