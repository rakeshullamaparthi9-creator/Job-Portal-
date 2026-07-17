<?php
require_once 'config.php';
header('Content-Type: application/json');

$action = $_POST['action'] ?? $_GET['action'] ?? '';

// Submit application
if ($action === 'submit') {
    if (!isLoggedIn() || $_SESSION['role'] !== 'seeker') {
        echo json_encode(['success' => false, 'message' => 'Login as job seeker to apply.']); exit;
    }
    $job_id       = intval($_POST['job_id'] ?? 0);
    $seeker_id    = $_SESSION['user_id'];
    $cover_letter = trim($_POST['cover_letter'] ?? '');

    $stmt = $conn->prepare("INSERT INTO applications (job_id, seeker_id, cover_letter) VALUES (?,?,?)");
    $stmt->bind_param("iis", $job_id, $seeker_id, $cover_letter);
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Application submitted successfully.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'You have already applied for this job.']);
    }
    exit;
}

// Get seeker's applications
if ($action === 'my_applications') {
    if (!isLoggedIn() || $_SESSION['role'] !== 'seeker') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']); exit;
    }
    $seeker_id = $_SESSION['user_id'];
    $stmt = $conn->prepare("SELECT a.*, j.title, j.company, j.location, j.type FROM applications a JOIN jobs j ON a.job_id = j.id WHERE a.seeker_id = ? ORDER BY a.applied_at DESC");
    $stmt->bind_param("i", $seeker_id);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    echo json_encode(['success' => true, 'applications' => $rows]);
    exit;
}

// Check if already applied
if ($action === 'check') {
    if (!isLoggedIn()) { echo json_encode(['applied' => false]); exit; }
    $job_id    = intval($_GET['job_id'] ?? 0);
    $seeker_id = $_SESSION['user_id'];
    $stmt = $conn->prepare("SELECT id FROM applications WHERE job_id = ? AND seeker_id = ?");
    $stmt->bind_param("ii", $job_id, $seeker_id);
    $stmt->execute();
    $result = $stmt->get_result();
    echo json_encode(['applied' => $result->num_rows > 0]);
    exit;
}
?>
