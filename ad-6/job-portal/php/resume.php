<?php
require_once 'config.php';
header('Content-Type: application/json');

$action = $_POST['action'] ?? $_GET['action'] ?? '';

// Save or update resume
if ($action === 'save') {
    if (!isLoggedIn() || $_SESSION['role'] !== 'seeker') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']); exit;
    }
    $user_id    = $_SESSION['user_id'];
    $full_name  = trim($_POST['full_name'] ?? '');
    $phone      = trim($_POST['phone'] ?? '');
    $email      = trim($_POST['email'] ?? '');
    $address    = trim($_POST['address'] ?? '');
    $summary    = trim($_POST['summary'] ?? '');
    $skills     = trim($_POST['skills'] ?? '');
    $education  = trim($_POST['education'] ?? '');
    $experience = trim($_POST['experience'] ?? '');

    // Check if resume exists
    $check = $conn->prepare("SELECT id FROM resumes WHERE user_id = ?");
    $check->bind_param("i", $user_id);
    $check->execute();
    $exists = $check->get_result()->num_rows > 0;

    if ($exists) {
        $stmt = $conn->prepare("UPDATE resumes SET full_name=?,phone=?,email=?,address=?,summary=?,skills=?,education=?,experience=? WHERE user_id=?");
        $stmt->bind_param("ssssssssi", $full_name, $phone, $email, $address, $summary, $skills, $education, $experience, $user_id);
    } else {
        $stmt = $conn->prepare("INSERT INTO resumes (user_id,full_name,phone,email,address,summary,skills,education,experience) VALUES (?,?,?,?,?,?,?,?,?)");
        $stmt->bind_param("issssssss", $user_id, $full_name, $phone, $email, $address, $summary, $skills, $education, $experience);
    }

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Resume saved successfully.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to save resume.']);
    }
    exit;
}

// Get resume
if ($action === 'get') {
    if (!isLoggedIn()) { echo json_encode(['success' => false, 'message' => 'Unauthorized']); exit; }
    $user_id = $_SESSION['user_id'];
    $stmt = $conn->prepare("SELECT * FROM resumes WHERE user_id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $resume = $stmt->get_result()->fetch_assoc();
    echo json_encode(['success' => true, 'resume' => $resume]);
    exit;
}

// Get resume by seeker id (for employer view)
if ($action === 'view') {
    if (!isLoggedIn() || $_SESSION['role'] !== 'employer') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']); exit;
    }
    $seeker_id = intval($_GET['seeker_id'] ?? 0);
    $stmt = $conn->prepare("SELECT r.*, u.name FROM resumes r JOIN users u ON r.user_id = u.id WHERE r.user_id = ?");
    $stmt->bind_param("i", $seeker_id);
    $stmt->execute();
    $resume = $stmt->get_result()->fetch_assoc();
    echo json_encode(['success' => true, 'resume' => $resume]);
    exit;
}
?>
