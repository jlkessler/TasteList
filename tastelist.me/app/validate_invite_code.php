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

$playlist_id = $_GET['playlist_id'];
$invite_code = $_GET['invite_code'];

$conn = new mysqli($hostname, $username, $password, $database);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$successMessage = '';
$errorMessage = '';
$isInviteValid = false; // Initialize to false

try {
    // Prepare a SQL statement to select the invite_code for the given playlist_id
    $sql_select_invite = "SELECT invite_code FROM playlists WHERE playlist_id = ?";
    $stmt_select_invite = $conn->prepare($sql_select_invite);
    $stmt_select_invite->bind_param('i', $playlist_id);

    // Execute the SQL statement
    $stmt_select_invite->execute();

    // Bind the result variable
    $stmt_select_invite->bind_result($db_invite_code);

    // Fetch the result
    if ($stmt_select_invite->fetch()) {
        // Check if the provided invite_code matches the one from the database
        if ($invite_code === $db_invite_code) {
            $isInviteValid = true;
        }
    } else {
        $errorMessage = "Playlist not found.";
    }

    // Close the statement for selecting invite_code
    $stmt_select_invite->close();
} catch (Exception $e) {
    $errorMessage = "Exception caught: " . get_class($e) . " at " . $e->getFile() . ":" . $e->getLine() . " - " . $e->getMessage();
}

$conn->close();

header('Content-Type: application/json');
$response = array('is_invite_valid' => $isInviteValid, 'error' => $errorMessage);
echo json_encode($response);
?>