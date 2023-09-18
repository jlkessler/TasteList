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

// Retrieve song data from the request
$isrc = $_POST['isrc'];
$name = $_POST['name'];
$artist = $_POST['artist'];
$album = $_POST['album'];
$playlist_id = $_POST['playlist_id'];
$user_id = $_POST['user_id'];

// Create a MySQLi connection
$conn = new mysqli($hostname, $username, $password, $database);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

try {
    // Check if the song already exists
    $sql_check_duplicate = "SELECT song_id FROM songs WHERE song_id = ?";
    $stmt_check_duplicate = $conn->prepare($sql_check_duplicate);
    $stmt_check_duplicate->bind_param('s', $isrc);
    $stmt_check_duplicate->execute();
    
    if ($stmt_check_duplicate->fetch() === NULL) {
        // Song does not exist, insert into the database
        $sql_insert_song = "INSERT INTO songs (song_id, name, artist, album) VALUES (?, ?, ?, ?)";
        $stmt_insert_song = $conn->prepare($sql_insert_song);
        $stmt_insert_song->bind_param('ssss', $isrc, $name, $artist, $album);
        
        if ($stmt_insert_song->execute()) {
            echo "Song inserted successfully.";
        } else {
            echo "Error: " . $stmt_insert_song->error;
        }
    } else {
        echo "Song already in database!";
    }

    // link song to playlist

    // get added_datetime
    $timestamp = time();
    $sqlDateTime = date("Y-m-d H:i:s", $timestamp);

    $sql_link_song = "INSERT INTO playlist_songs (playlist_id, song_id, added_by_user_id, added_datetime) VALUES (?, ?, ?, ?)";
    $stmt_link_song = $conn->prepare($sql_link_song);
    $stmt_link_song->bind_param('isis', $playlist_id, $isrc, $user_id, $sqlDateTime);
        
    if ($stmt_link_song->execute()) {
        echo "Song linked to playlist successfully.";
    } else {
        echo "Error: " . $stmt_link_song->error;
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}

$conn->close(); // Close the database connection
?>