const API_BASE_URL = "https://oiycfmrihj.execute-api.us-east-1.amazonaws.com/prod";

async function parseApiResponse(response) {
    let data = await response.json();

    if (data.body) {
        return JSON.parse(data.body);
    }

    return data;
}

async function login() {
    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;

    if (email === "" || password === "") {
        alert("Please enter email and password");
        return;
    }

    try {
        let response = await fetch(`${API_BASE_URL}/loginUser`, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain"
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        let result = await parseApiResponse(response);

        if (!response.ok) {
            alert(result.message || "Login failed");
            return;
        }

        localStorage.setItem("email", result.email);
        localStorage.setItem("role", result.role);

        window.location.href = "dashboard.html";

    } catch (error) {
        console.log(error);
        alert("Login error. Check console.");
    }
}

async function loadDashboard() {
    let role = localStorage.getItem("role");
    let email = localStorage.getItem("email");

    if (!role || !email) {
        window.location.href = "index.html";
        return;
    }

    document.getElementById("userRoleText").innerText =
        "Logged in as: " + role + " | " + email;

    document.getElementById("adminSection").style.display = "none";
    document.getElementById("teacherSection").style.display = "none";
    document.getElementById("studentSection").style.display = "none";
    document.getElementById("notesSection").style.display = "none";
    document.getElementById("teacherAssignmentsSection").style.display = "none";

    if (role === "admin") {
        document.getElementById("adminSection").style.display = "block";
    }

    if (role === "teacher") {
        document.getElementById("teacherSection").style.display = "block";
        document.getElementById("notesSection").style.display = "block";
        document.getElementById("teacherAssignmentsSection").style.display = "block";
        await displayNotes();
        await displayAssignments();
    }

    if (role === "student") {
        document.getElementById("studentSection").style.display = "block";
        document.getElementById("notesSection").style.display = "block";
        await displayNotes();
    }
}

async function createUser() {
    let email = document.getElementById("newUserEmail").value;
    let password = document.getElementById("newUserPassword").value;
    let role = document.getElementById("newUserRole").value;

    if (email === "" || password === "" || role === "") {
        alert("Please fill all user details");
        return;
    }

    try {
        let response = await fetch(`${API_BASE_URL}/createUser`, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain"
            },
            body: JSON.stringify({
                email: email,
                password: password,
                role: role
            })
        });

        let result = await parseApiResponse(response);

        if (!response.ok) {
            alert(result.message || "User creation failed");
            console.log(result);
            return;
        }

        alert(result.message || "User created successfully");

        document.getElementById("newUserEmail").value = "";
        document.getElementById("newUserPassword").value = "";
        document.getElementById("newUserRole").value = "teacher";

    } catch (error) {
        console.log(error);
        alert("Error creating user. Check console.");
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        let reader = new FileReader();

        reader.onload = function () {
            let base64String = reader.result.split(",")[1];
            resolve(base64String);
        };

        reader.onerror = function () {
            reject("File could not be read");
        };

        reader.readAsDataURL(file);
    });
}

async function uploadNote() {
    let title = document.getElementById("noteTitle").value;
    let subject = document.getElementById("subject").value;
    let fileInput = document.getElementById("noteFile");
    let email = localStorage.getItem("email");

    if (title === "" || subject === "" || fileInput.files.length === 0) {
        alert("Please fill all note details");
        return;
    }

    try {
        let file = fileInput.files[0];
        let fileContent = await fileToBase64(file);

        let payload = {
            title: title,
            subject: subject,
            fileName: file.name,
            fileContent: fileContent,
            uploadedBy: email
        };

        let response = await fetch(`${API_BASE_URL}/uploadNote`, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify(payload)
        });

        let result = await parseApiResponse(response);

        if (!response.ok) {
            alert("Upload failed");
            console.log(result);
            return;
        }

        alert(result.message || "Note uploaded successfully");

        document.getElementById("noteTitle").value = "";
        document.getElementById("subject").value = "";
        document.getElementById("noteFile").value = "";

        await displayNotes();

    } catch (error) {
        console.log(error);
        alert("Error uploading note. Check console.");
    }
}

async function displayNotes() {
    let notesList = document.getElementById("notesList");
    let role = localStorage.getItem("role");

    if (!notesList) return;

    notesList.innerHTML = "<p>Loading notes...</p>";

    try {
        let response = await fetch(`${API_BASE_URL}/listNotes`);
        let result = await parseApiResponse(response);

        let notes = result.notes || [];

        notesList.innerHTML = "";

        if (notes.length === 0) {
            notesList.innerHTML = "<p>No notes available yet.</p>";
            return;
        }

        notes.forEach(note => {
            let noteCard = document.createElement("div");
            noteCard.className = "note-card";

            noteCard.innerHTML = `
                <h3>${note.title}</h3>
                <p><strong>Subject:</strong> ${note.subject}</p>
                <p><strong>File:</strong> ${note.fileName}</p>
                <p><strong>Uploaded By:</strong> ${note.uploadedBy || "Teacher"}</p>
                <p><strong>Uploaded:</strong> ${note.uploadedAt || "N/A"}</p>

                <button onclick="downloadNote('${note.downloadUrl}')">Download</button>

                ${
                    role === "teacher"
                    ? `<button onclick="deleteNote('${note.noteId}')">Delete</button>`
                    : ""
                }
            `;

            notesList.appendChild(noteCard);
        });

    } catch (error) {
        console.log(error);
        notesList.innerHTML = "<p>Error loading notes.</p>";
    }
}

function downloadNote(downloadUrl) {
    if (!downloadUrl) {
        alert("Download link not available");
        return;
    }

    window.open(downloadUrl, "_blank");
}

async function deleteNote(noteId) {
    if (!noteId) {
        alert("Note ID not found");
        return;
    }

    let confirmDelete = confirm("Are you sure you want to delete this note?");
    if (!confirmDelete) return;

    try {
        let response = await fetch(`${API_BASE_URL}/deleteNote`, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({ noteId: noteId })
        });

        let result = await parseApiResponse(response);

        if (!response.ok) {
            alert("Delete failed");
            console.log(result);
            return;
        }

        alert(result.message || "Note deleted successfully");
        await displayNotes();

    } catch (error) {
        console.log(error);
        alert("Error deleting note. Check console.");
    }
}

async function submitAssignment() {
    let title = document.getElementById("assignmentTitle").value;
    let fileInput = document.getElementById("assignmentFile");
    let email = localStorage.getItem("email");

    if (title === "" || fileInput.files.length === 0) {
        alert("Please fill assignment details");
        return;
    }

    try {
        let file = fileInput.files[0];
        let fileContent = await fileToBase64(file);

        let payload = {
            title: title,
            fileName: file.name,
            fileContent: fileContent,
            submittedBy: email
        };

        let response = await fetch(`${API_BASE_URL}/submitAssignment`, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify(payload)
        });

        let result = await parseApiResponse(response);

        if (!response.ok) {
            alert("Assignment submission failed");
            console.log(result);
            return;
        }

        alert(result.message || "Assignment submitted successfully");

        document.getElementById("assignmentTitle").value = "";
        document.getElementById("assignmentFile").value = "";

    } catch (error) {
        console.log(error);
        alert("Error submitting assignment. Check console.");
    }
}

async function displayAssignments() {
    let role = localStorage.getItem("role");
    let assignmentList = document.getElementById("assignmentList");

    if (!assignmentList) return;

    if (role !== "teacher") {
        assignmentList.innerHTML = "";
        return;
    }

    assignmentList.innerHTML = "<p>Loading assignments...</p>";

    try {
        let response = await fetch(`${API_BASE_URL}/listAssignments`);
        let result = await parseApiResponse(response);

        let assignments = result.assignments || [];

        assignmentList.innerHTML = "";

        if (assignments.length === 0) {
            assignmentList.innerHTML = "<p>No assignments submitted yet.</p>";
            return;
        }

        assignments.forEach(assignment => {
            let assignmentCard = document.createElement("div");
            assignmentCard.className = "note-card";

            assignmentCard.innerHTML = `
                <h3>${assignment.title}</h3>
                <p><strong>Submitted By:</strong> ${assignment.submittedBy}</p>
                <p><strong>File:</strong> ${assignment.fileName}</p>
                <p><strong>Submitted:</strong> ${assignment.submittedAt || "N/A"}</p>

                <button onclick="downloadAssignment('${assignment.downloadUrl}')">Download Assignment</button>
                <button onclick="deleteAssignment('${assignment.assignmentId}')">Delete Assignment</button>
            `;

            assignmentList.appendChild(assignmentCard);
        });

    } catch (error) {
        console.log(error);
        assignmentList.innerHTML = "<p>Error loading assignments.</p>";
    }
}

function downloadAssignment(downloadUrl) {
    if (!downloadUrl) {
        alert("Download link not available");
        return;
    }

    window.open(downloadUrl, "_blank");
}

async function deleteAssignment(assignmentId) {
    if (!assignmentId) {
        alert("Assignment ID not found");
        return;
    }

    let confirmDelete = confirm("Are you sure you want to delete this assignment?");
    if (!confirmDelete) return;

    try {
        let response = await fetch(`${API_BASE_URL}/deleteAssignment`, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({ assignmentId: assignmentId })
        });

        let result = await parseApiResponse(response);

        if (!response.ok) {
            alert("Delete failed");
            console.log(result);
            return;
        }

        alert(result.message || "Assignment deleted successfully");
        await displayAssignments();

    } catch (error) {
        console.log(error);
        alert("Error deleting assignment. Check console.");
    }
}

function logout() {
    localStorage.removeItem("email");
    localStorage.removeItem("role");

    window.location.href = "index.html";
}

if (window.location.pathname.includes("dashboard.html")) {
    loadDashboard();
}