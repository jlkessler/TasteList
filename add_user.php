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

// Create a database connection
$conn = new mysqli($hostname, $username, $password, $database);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Retrieve user data from the request (you need to adapt this to your actual data)
$username = $_POST['username']; // You should adjust this based on your form field names
$streaming_service = 'S'; // Assuming it's always 'S' for Spotify

// Check if the user already exists (based on a unique identifier like username)
$sql_check_duplicate = "SELECT * FROM users WHERE username = '$username'";
$result_check_duplicate = $conn->query($sql_check_duplicate);

header('Content-Type: application/json'); // Set the Content-Type header to indicate JSON response

if ($result_check_duplicate->num_rows == 0) {
    // User does not exist, insert into the database
    $sql_insert_user = "INSERT INTO users (username, streaming_service) VALUES ('$username', '$streaming_service')";
    
    if ($conn->query($sql_insert_user) === TRUE) {
        $user_id = $conn->insert_id; // Get the user_id of the newly inserted user
        $response = array("success" => true, "message" => "User added successfully.", "user_id" => $user_id);
        echo json_encode($response);
    } else {
        $response = array("success" => false, "message" => "Error: " . $sql_insert_user . "<br>" . $conn->error);
        echo json_encode($response);
    }
} else {
    // User already exists, retrieve the user_id
    $sql_get_user_id = "SELECT id FROM users WHERE username = '$username'";
    $result_get_user_id = $conn->query($sql_get_user_id);

    if ($result_get_user_id->num_rows > 0) {
        $row = $result_get_user_id->fetch_assoc();
        $user_id = $row["id"];
        $response = array("success" => true, "message" => "User already exists.", "user_id" => $user_id);
        echo json_encode($response);
    } else {
        $response = array("success" => false, "message" => "Error retrieving user_id.");
        echo json_encode($response);
    }
}

// Close the database connection
$conn->close();
?>