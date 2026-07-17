<?php
require_once 'config.php';
header('Content-Type: application/json');

$action = $_POST['action'] ?? $_GET['action'] ?? '';

if ($action === 'register') {
    $name     = trim($_POST['name'] ?? '');
    $email    = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $role     = $_POST['role'] ?? 'seeker';

    if (!$name || !$email || !$password) {
        echo json_encode(['success' => false, 'message' => 'All fields are required.']);
        exit;
    }

    $hashed = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $conn->prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("ssss", $name, $email, $hashed, $role);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Registration successful.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Email already exists.']);
    }
    exit;
}

if ($action === 'login') {
    $email    = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    $stmt = $conn->prepare("SELECT id, name, password, role FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();

    if ($user && password_verify($password, $user['password'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['name']    = $user['name'];
        $_SESSION['role']    = $user['role'];
        echo json_encode(['success' => true, 'role' => $user['role'], 'name' => $user['name']]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid email or password.']);
    }
    exit;
}

if ($action === 'logout') {
    session_destroy();
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'check') {
    if (isLoggedIn()) {
        echo json_encode(['loggedIn' => true, 'role' => $_SESSION['role'], 'name' => $_SESSION['name'], 'id' => $_SESSION['user_id']]);
    } else {
        echo json_encode(['loggedIn' => false]);
    }
    exit;
}
?>
