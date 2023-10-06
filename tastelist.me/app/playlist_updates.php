<?php
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header('Content-Type: application/json');

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL); // disable these 3 lines in production

// Database connection details
$hostname = "bochat.iad1-mysql-e2-5b.dreamhost.com";
$username = "tastelist";
$password = "gmHjNTVur8Jxt9w4dMU6hy";
$database = "tastelistdatabase";

$successMessage = '';
$errorMessage = '';

// Database connection
$mysqli = new mysqli($hostname, $username, $password, $database);

if ($mysqli->connect_error) {
    die("Connection failed: " . $mysqli->connect_error);
}

// Handle incoming POST request
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $json_data = file_get_contents("php://input");

    if ($json_data === false) {
        $errorMessage = "Error: Data not received.";
    } else {
        $data = json_decode($json_data, true);

        if ($data === null) {
            $errorMessage = "Error: Invalid JSON data.";
        } else {
            // Ensure the expected keys exist in $data
            $playlistId = $data['playlist_id'];
            $userId = $data['user_id'];
            $songId = $data['song_id'];
            $songName = $data['song_name'];
            $artist = $data['artist'];
            $action = $data['action'];
            $updateTime = date("Y-m-d H:i:s"); // Current datetime

            // Insert data into the playlist_updates table
            $sql = "INSERT INTO playlist_updates (user_id, playlist_id, song_id, song_name, artist, action, update_time)
                    VALUES (?, ?, ?, ?, ?, ?, ?)";
            $stmt = $mysqli->prepare($sql);
            $stmt->bind_param("iisssss", $userId, $playlistId, $songId, $songName, $artist, $action, $updateTime);

            if ($stmt->execute()) {
                $successMessage = "Update processed successfully";
            } else {
                $errorMessage = "Error: Update processing failed.";
            }

            // Close the database connection
            $stmt->close();
        }
    }
}
// Handle incoming GET request for long polling
elseif ($_SERVER["REQUEST_METHOD"] === "GET" && isset($_GET['playlist_id']) && isset($_GET['last_update_id'])) {
    // Allow the script to continue executing even if the client disconnects
    ignore_user_abort(true);
    
    // If you're using PHP sessions, close them before beginning the long polling loop
    if (session_id()) {
        session_write_close();
    }
    
    // Flush any existing output buffers
    while (ob_get_level()) {
        ob_end_flush();
    }

    $playlistId = $_GET['playlist_id'];
    $lastUpdateId = $_GET['last_update_id'];
    $timeout = time() + 15;  // Reduced timeout to 30 seconds

    while (time() < $timeout) {
        $sql = "SELECT * FROM playlist_updates WHERE playlist_id = ? AND update_id > ? LIMIT 1";
        $stmt = $mysqli->prepare($sql);
        $stmt->bind_param("ii", $playlistId, $lastUpdateId);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();

        // Check if client has disconnected right after the potentially time-consuming DB call
        if (connection_status() != CONNECTION_NORMAL) {
            if (isset($stmt)) {
                $stmt->close();
            }
            exit;
        }

        if ($result) {
            echo json_encode($result);
            $stmt->close();
            exit;
        }

        sleep(2);  // Sleep for 2 seconds and then check again
    }

    // Return empty response if no updates after timeout
    echo json_encode([]);
    if (isset($stmt)) {
        $stmt->close();
    }
}