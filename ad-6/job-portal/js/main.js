
// ===== UTILITY =====
const api = (url, data = null) => {
    const opts = data
        ? { method: 'POST', body: new URLSearchParams(data) }
        : { method: 'GET' };
    return fetch(url, opts).then(r => r.json());
};

function showAlert(id, msg, type = 'success') {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = `alert alert-${type} show`;
    el.textContent = msg;
    setTimeout(() => el.classList.remove('show'), 4000);
}

function statusBadge(status) {
    const map = {
        pending:     'badge-yellow',
        reviewed:    'badge-blue',
        shortlisted: 'badge-purple',
        rejected:    'badge-red',
        hired:       'badge-green',
        open:        'badge-green',
        closed:      'badge-gray'
    };
    return `<span class="badge ${map[status] || 'badge-gray'}">${status}</span>`;
}

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr);
    const d = Math.floor(diff / 86400000);
    if (d === 0) return 'Today';
    if (d === 1) return 'Yesterday';
    if (d < 30) return `${d} days ago`;
    return new Date(dateStr).toLocaleDateString();
}

// ===== AUTH CHECK =====
async function checkAuth() {
    const res = await api('php/auth.php?action=check');
    return res;
}

// ===== NAVBAR USER STATE =====
async function initNav() {
    const auth = await checkAuth();
    const navAuth = document.getElementById('nav-auth');
    if (!navAuth) return;
    if (auth.loggedIn) {
        const dash = auth.role === 'employer' ? 'dashboard-employer.html' : 'dashboard-seeker.html';
        navAuth.innerHTML = `
            <a href="${dash}" class="btn btn-outline btn-sm">Dashboard</a>
            <button onclick="logout()" class="btn btn-primary btn-sm">Logout</button>`;
    } else {
        navAuth.innerHTML = `
            <a href="login.html" class="btn btn-outline btn-sm">Login</a>
            <a href="register.html" class="btn btn-primary btn-sm">Register</a>`;
    }
}

async function logout() {
    await api('php/auth.php?action=logout');
    window.location.href = 'index.html';
}

// ===== LOGIN =====
function initLogin() {
    const form = document.getElementById('login-form');
    if (!form) return;
    form.addEventListener('submit', async e => {
        e.preventDefault();
        const res = await api('php/auth.php', {
            action: 'login',
            email: form.email.value,
            password: form.password.value
        });
        if (res.success) {
            window.location.href = res.role === 'employer' ? 'dashboard-employer.html' : 'dashboard-seeker.html';
        } else {
            showAlert('login-alert', res.message, 'error');
        }
    });
}

// ===== REGISTER =====
function initRegister() {
    const form = document.getElementById('register-form');
    if (!form) return;

    // Role toggle
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('role-input').value = btn.dataset.role;
        });
    });

    form.addEventListener('submit', async e => {
        e.preventDefault();
        if (form.password.value !== form.confirm.value) {
            showAlert('reg-alert', 'Passwords do not match.', 'error'); return;
        }
        const res = await api('php/auth.php', {
            action: 'register',
            name: form.fullname.value,
            email: form.email.value,
            password: form.password.value,
            role: document.getElementById('role-input').value
        });
        if (res.success) {
            showAlert('reg-alert', 'Registered! Redirecting to login...', 'success');
            setTimeout(() => window.location.href = 'login.html', 1500);
        } else {
            showAlert('reg-alert', res.message, 'error');
        }
    });
}

// ===== JOBS LIST PAGE =====
async function initJobs() {
    const grid = document.getElementById('jobs-grid');
    if (!grid) return;

    const auth = await checkAuth();

    async function loadJobs() {
        const search   = document.getElementById('search-input')?.value || '';
        const location = document.getElementById('location-input')?.value || '';
        const type     = document.getElementById('type-filter')?.value || '';
        grid.innerHTML = '<p style="color:var(--gray)">Loading jobs...</p>';
        const res = await api(`php/jobs.php?action=list&search=${encodeURIComponent(search)}&location=${encodeURIComponent(location)}&type=${encodeURIComponent(type)}`);
        if (!res.jobs || res.jobs.length === 0) {
            grid.innerHTML = '<p style="color:var(--gray)">No jobs found.</p>'; return;
        }
        grid.innerHTML = res.jobs.map(j => `
            <div class="card job-card">
                <h3>${j.title}</h3>
                <div class="company">🏢 ${j.company}</div>
                <div class="job-meta">
                    <span>📍 ${j.location || 'Remote'}</span>
                    <span>💼 ${j.type}</span>
                    ${j.salary ? `<span>💰 ${j.salary}</span>` : ''}
                    <span>🕒 ${timeAgo(j.posted_at)}</span>
                </div>
                <p style="font-size:.88rem;color:var(--gray);margin-bottom:1rem">${j.description.substring(0,120)}...</p>
                <div style="display:flex;gap:.5rem;flex-wrap:wrap">
                    <button class="btn btn-outline btn-sm" onclick="openJobModal(${j.id})">View Details</button>
                    ${auth.loggedIn && auth.role === 'seeker'
                        ? `<button class="btn btn-primary btn-sm" onclick="openApplyModal(${j.id}, '${j.title}', '${j.company}')">Apply Now</button>`
                        : ''}
                </div>
            </div>`).join('');
    }

    document.getElementById('search-btn')?.addEventListener('click', loadJobs);
    document.getElementById('type-filter')?.addEventListener('change', loadJobs);
    loadJobs();
}

// ===== JOB DETAIL MODAL =====
async function openJobModal(id) {
    const res = await api(`php/jobs.php?action=get&id=${id}`);
    const j = res.job;
    document.getElementById('modal-body').innerHTML = `
        <h2 style="margin-bottom:.3rem">${j.title}</h2>
        <p style="color:var(--gray);margin-bottom:1rem">🏢 ${j.company} &nbsp;|&nbsp; 📍 ${j.location || 'Remote'}</p>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1.2rem">
            <span class="badge badge-blue">${j.type}</span>
            ${j.salary ? `<span class="badge badge-green">💰 ${j.salary}</span>` : ''}
            ${statusBadge(j.status)}
        </div>
        <h4 style="margin-bottom:.5rem">Description</h4>
        <p style="color:var(--gray);white-space:pre-line;margin-bottom:1rem">${j.description}</p>
        ${j.requirements ? `<h4 style="margin-bottom:.5rem">Requirements</h4><p style="color:var(--gray);white-space:pre-line">${j.requirements}</p>` : ''}`;
    document.getElementById('job-modal').classList.add('show');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('show');
}

// ===== APPLY MODAL =====
function openApplyModal(jobId, title, company) {
    document.getElementById('apply-job-id').value = jobId;
    document.getElementById('apply-modal-title').textContent = `Apply for: ${title} at ${company}`;
    document.getElementById('apply-modal').classList.add('show');
}

async function submitApplication() {
    const jobId = document.getElementById('apply-job-id').value;
    const cover = document.getElementById('cover-letter').value;
    const res = await api('php/apply.php', { action: 'submit', job_id: jobId, cover_letter: cover });
    closeModal('apply-modal');
    showAlert('jobs-alert', res.message, res.success ? 'success' : 'error');
}

// ===== SEEKER DASHBOARD =====
async function initSeekerDashboard() {
    const dash = document.getElementById('seeker-dash');
    if (!dash) return;
    const auth = await checkAuth();
    if (!auth.loggedIn || auth.role !== 'seeker') { window.location.href = 'login.html'; return; }
    document.getElementById('user-name').textContent = auth.name;

    const appsRes = await api('php/apply.php?action=my_applications');
    const apps = appsRes.applications || [];

    const counts = { pending: 0, shortlisted: 0, hired: 0 };
    apps.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++; });

    document.getElementById('stat-total').textContent   = apps.length;
    document.getElementById('stat-pending').textContent = counts.pending;
    document.getElementById('stat-short').textContent   = counts.shortlisted;
    document.getElementById('stat-hired').textContent   = counts.hired;

    const tbody = document.getElementById('apps-table');
    tbody.innerHTML = apps.length === 0
        ? '<tr><td colspan="5" style="text-align:center;color:var(--gray)">No applications yet. <a href="jobs.html">Browse jobs</a></td></tr>'
        : apps.map(a => `
            <tr>
                <td><strong>${a.title}</strong></td>
                <td>${a.company}</td>
                <td>${a.location || 'Remote'}</td>
                <td>${statusBadge(a.status)}</td>
                <td>${timeAgo(a.applied_at)}</td>
            </tr>`).join('');
}

// ===== EMPLOYER DASHBOARD =====
async function initEmployerDashboard() {
    const dash = document.getElementById('employer-dash');
    if (!dash) return;
    const auth = await checkAuth();
    if (!auth.loggedIn || auth.role !== 'employer') { window.location.href = 'login.html'; return; }
    document.getElementById('user-name').textContent = auth.name;

    const jobsRes = await api('php/jobs.php?action=my_jobs');
    const jobs = jobsRes.jobs || [];

    document.getElementById('stat-jobs').textContent  = jobs.length;
    document.getElementById('stat-open').textContent  = jobs.filter(j => j.status === 'open').length;
    document.getElementById('stat-apps').textContent  = jobs.reduce((s, j) => s + parseInt(j.app_count), 0);

    const tbody = document.getElementById('jobs-table');
    tbody.innerHTML = jobs.length === 0
        ? '<tr><td colspan="5" style="text-align:center;color:var(--gray)">No jobs posted yet.</td></tr>'
        : jobs.map(j => `
            <tr>
                <td><strong>${j.title}</strong></td>
                <td>${j.location || 'Remote'}</td>
                <td>${statusBadge(j.status)}</td>
                <td>${j.app_count} applicants</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="viewApplicants(${j.id}, '${j.title}')">View</button>
                    <button class="btn btn-sm btn-danger" onclick="toggleJob(${j.id}, this)">${j.status === 'open' ? 'Close' : 'Reopen'}</button>
                </td>
            </tr>`).join('');
}

async function toggleJob(jobId, btn) {
    await api('php/jobs.php', { action: 'toggle_status', job_id: jobId });
    initEmployerDashboard();
}

async function viewApplicants(jobId, title) {
    const res = await api(`php/jobs.php?action=applicants&job_id=${jobId}`);
    const list = res.applicants || [];
    document.getElementById('modal-body').innerHTML = `
        <h3 style="margin-bottom:1rem">Applicants for: ${title}</h3>
        ${list.length === 0 ? '<p style="color:var(--gray)">No applicants yet.</p>' : `
        <table style="width:100%">
            <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Applied</th><th>Action</th></tr></thead>
            <tbody>${list.map(a => `
                <tr>
                    <td>${a.name}</td>
                    <td>${a.email}</td>
                    <td id="app-status-${a.id}">${statusBadge(a.status)}</td>
                    <td>${timeAgo(a.applied_at)}</td>
                    <td>
                        <select onchange="updateAppStatus(${a.id}, this.value)" class="form-control" style="padding:.3rem;font-size:.8rem">
                            ${['pending','reviewed','shortlisted','rejected','hired'].map(s =>
                                `<option value="${s}" ${a.status===s?'selected':''}>${s}</option>`).join('')}
                        </select>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`}`;
    document.getElementById('job-modal').classList.add('show');
}

async function updateAppStatus(appId, status) {
    await api('php/jobs.php', { action: 'update_status', app_id: appId, status });
    document.getElementById(`app-status-${appId}`).innerHTML = statusBadge(status);
}

// ===== RESUME BUILDER =====
async function initResumeBuilder() {
    const form = document.getElementById('resume-form');
    if (!form) return;
    const auth = await checkAuth();
    if (!auth.loggedIn || auth.role !== 'seeker') { window.location.href = 'login.html'; return; }
    document.getElementById('user-name').textContent = auth.name;

    // Load existing resume
    const res = await api('php/resume.php?action=get');
    if (res.resume) {
        const r = res.resume;
        ['full_name','phone','email','address','summary','skills','education','experience'].forEach(f => {
            if (form[f]) form[f].value = r[f] || '';
        });
        renderPreview(r);
    }

    form.addEventListener('input', () => {
        const data = Object.fromEntries(new FormData(form));
        renderPreview(data);
    });

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form));
        data.action = 'save';
        const result = await api('php/resume.php', data);
        showAlert('resume-alert', result.message, result.success ? 'success' : 'error');
    });
}

function renderPreview(r) {
    document.getElementById('preview-name').textContent    = r.full_name || 'Your Name';
    document.getElementById('preview-phone').textContent   = r.phone || '';
    document.getElementById('preview-email').textContent   = r.email || '';
    document.getElementById('preview-address').textContent = r.address || '';
    document.getElementById('preview-summary').textContent = r.summary || '';
    document.getElementById('preview-skills').textContent  = r.skills || '';
    document.getElementById('preview-edu').innerHTML       = (r.education || '').replace(/\n/g, '<br>');
    document.getElementById('preview-exp').innerHTML       = (r.experience || '').replace(/\n/g, '<br>');
}

function printResume() { window.print(); }

// ===== POST JOB =====
async function initPostJob() {
    const form = document.getElementById('post-job-form');
    if (!form) return;
    const auth = await checkAuth();
    if (!auth.loggedIn || auth.role !== 'employer') { window.location.href = 'login.html'; return; }
    document.getElementById('user-name').textContent = auth.name;

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form));
        data.action = 'post';
        const res = await api('php/jobs.php', data);
        showAlert('post-alert', res.message, res.success ? 'success' : 'error');
        if (res.success) form.reset();
    });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initLogin();
    initRegister();
    initJobs();
    initSeekerDashboard();
    initEmployerDashboard();
    initResumeBuilder();
    initPostJob();
});
