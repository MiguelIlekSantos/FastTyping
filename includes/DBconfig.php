<?php

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "fasttypingdb";
$conn = "";

try {
    $conn = mysqli_connect($servername, $username, $password, $dbname);
} catch (mysqli_sql_exception $e) {
    echo "Could not connect! <br>";
    exit(); // Saia se a conexão falhar
}

