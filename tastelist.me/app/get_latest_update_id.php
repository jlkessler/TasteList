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

$mysqli = new mysqli($hostname, $username, $password, $database);

if ($mysqli->connect_error) {
    http_response_code(500);
    echo json_encode(['error' => 'Connection failed: ' . $mysqli->connect_error]);
    exit();
}

// Allow the script to detect client disconnection
ignore_user_abort(true);

$playlistId = $_GET['playlist_id'];

$sql = "SELECT MAX(update_id) as latest_update_id FROM playlist_updates WHERE playlist_id = ?";
$stmt = $mysqli->prepare($sql);

if (!$stmt) {
    http_response_code(500);
    echo json_encode(['error' => 'Error preparing statement: ' . $mysqli->error]);
    $mysqli->close();
    exit();
}

$stmt->bind_param("i", $playlistId);
$stmt->execute();

// Check if client disconnected after the execute statement
if (connection_aborted()) {
    $stmt->close();
    $mysqli->close();
    exit();
}

$result = $stmt->get_result();

if (!$result) {
    http_response_code(500);
    echo json_encode(['error' => 'Error executing statement: ' . $stmt->error]);
    $stmt->close();
    $mysqli->close();
    exit();
}

$row = $result->fetch_assoc();

$stmt->close();
$mysqli->close();

echo json_encode(['update_id' => $row['latest_update_id']]);
?>