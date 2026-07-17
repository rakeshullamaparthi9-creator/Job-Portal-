<?php
require_once 'config.php';
header('Content-Type: application/json');

$action = $_POST['action'] ?? $_GET['action'] ?? '';

// Get all open jobs (with optional search)
if ($action === 'list') {
    $search   = '%' . trim($_GET['search'] ?? '') . '%';
    $location = '%' . trim($_GET['location'] ?? '') . '%';
    $type     = $_GET['type'] ?? '';

    $sql = "SELECT j.*, u.name as employer_name FROM jobs j 
            JOIN users u ON j.employer_id = u.id 
            WHERE j.status = 'open' AND (j.title LIKE ? OR j.company LIKE ? OR j.description LIKE ?) 
            AND j.location LIKE ?";
    $params = [$search, $search, $search, $location];
    $types  = "ssss";

    if ($type) {
        $sql .= " AND j.type = ?";
        $params[] = $type;
        $types .= "s";
    }

    $sql .= " ORDER BY j.posted_at DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    echo json_encode(['success' => true, 'jobs' => $rows]);
    exit;
}

// Get single job
if ($action === 'get') {
    $id = intval($_GET['id'] ?? 0);
    $stmt = $conn->prepare("SELECT j.*, u.name as employer_name FROM jobs j JOIN users u ON j.employer_id = u.id WHERE j.id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $job = $stmt->get_result()->fetch_assoc();
    echo json_encode(['success' => true, 'job' => $job]);
    exit;
}

// Post a job (employer only)
if ($action === 'post') {
    if (!isLoggedIn() || $_SESSION['role'] !== 'employer') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']); exit;
    }
    $employer_id  = $_SESSION['user_id'];
    $title        = trim($_POST['title'] ?? '');
    $company      = trim($_POST['company'] ?? '');
    $location     = trim($_POST['location'] ?? '');
    $type         = $_POST['type'] ?? 'Full-time';
    $salary       = trim($_POST['salary'] ?? '');
    $description  = trim($_POST['description'] ?? '');
    $requirements = trim($_POST['requirements'] ?? '');

    if (!$title || !$company || !$description) {
        echo json_encode(['success' => false, 'message' => 'Title, company and description are required.']); exit;
    }

    $stmt = $conn->prepare("INSERT INTO jobs (employer_id, title, company, location, type, salary, description, requirements) VALUES (?,?,?,?,?,?,?,?)");
    $stmt->bind_param("isssssss", $employer_id, $title, $company, $location, $type, $salary, $description, $requirements);
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Job posted successfully.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to post job.']);
    }
    exit;
}

// Employer's own jobs
if ($action === 'my_jobs') {
    if (!isLoggedIn() || $_SESSION['role'] !== 'employer') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']); exit;
    }
    $id = $_SESSION['user_id'];
    $stmt = $conn->prepare("SELECT j.*, (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) as app_count FROM jobs j WHERE j.employer_id = ? ORDER BY j.posted_at DESC");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    echo json_encode(['success' => true, 'jobs' => $rows]);
    exit;
}

// Toggle job status
if ($action === 'toggle_status') {
    if (!isLoggedIn() || $_SESSION['role'] !== 'employer') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']); exit;
    }
    $job_id = intval($_POST['job_id'] ?? 0);
    $stmt = $conn->prepare("UPDATE jobs SET status = IF(status='open','closed','open') WHERE id = ? AND employer_id = ?");
    $stmt->bind_param("ii", $job_id, $_SESSION['user_id']);
    $stmt->execute();
    echo json_encode(['success' => true]);
    exit;
}

// Get applicants for a job
if ($action === 'applicants') {
    if (!isLoggedIn() || $_SESSION['role'] !== 'employer') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']); exit;
    }
    $job_id = intval($_GET['job_id'] ?? 0);
    $stmt = $conn->prepare("SELECT a.*, u.name, u.email FROM applications a JOIN users u ON a.seeker_id = u.id WHERE a.job_id = ? ORDER BY a.applied_at DESC");
    $stmt->bind_param("i", $job_id);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    echo json_encode(['success' => true, 'applicants' => $rows]);
    exit;
}

// Update application status
if ($action === 'update_status') {
    if (!isLoggedIn() || $_SESSION['role'] !== 'employer') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']); exit;
    }
    $app_id = intval($_POST['app_id'] ?? 0);
    $status = $_POST['status'] ?? '';
    $allowed = ['pending','reviewed','shortlisted','rejected','hired'];
    if (!in_array($status, $allowed)) {
        echo json_encode(['success' => false, 'message' => 'Invalid status']); exit;
    }
    $stmt = $conn->prepare("UPDATE applications SET status = ? WHERE id = ?");
    $stmt->bind_param("si", $status, $app_id);
    $stmt->execute();
    echo json_encode(['success' => true]);
    exit;
}
?>
