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
// Retrieve song data from the request
$song_data_encoded = $_POST['song_data'];
$song_data = json_decode(urldecode($song_data_encoded), true);
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
        $song_data_encoded = $data['song_data'];
        $song_data = json_decode(urldecode($song_data_encoded), true);
    }
}

// Create a MySQLi connection
$conn = new mysqli($hostname, $username, $password, $database);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

foreach ($song_data as $song) {
    $isrc = $song['isrc'];
    $name = $song['name'];
    $artist = $song['artist'];
    $album = $song['album'];

    // Check if the song already exists
    $sql_check_duplicate = "SELECT song_id FROM songs WHERE song_id = ?";
    $stmt_check_duplicate = $conn->prepare($sql_check_duplicate);
    $stmt_check_duplicate->bind_param('s', $isrc);
    $stmt_check_duplicate->execute();

    if ($stmt_check_duplicate->fetch() === NULL) {
        // Song does not exist, insert into the database
        $stmt_check_duplicate->close();

        $sql_insert_song = "INSERT INTO songs (song_id, name, artist, album) VALUES (?, ?, ?, ?)";
        $stmt_insert_song = $conn->prepare($sql_insert_song);
        $stmt_insert_song->bind_param('ssss', $isrc, $name, $artist, $album);

        if ($stmt_insert_song->execute()) {
            // Song inserted successfully.
            $stmt_insert_song->close();
        } else {
            // Error handling for inserting songs.
            $stmt_insert_song->close();
        }
    } else {
        // Song already in the database.
        $stmt_check_duplicate->close();
    }
}

$conn->close(); // Close the database connection
?>