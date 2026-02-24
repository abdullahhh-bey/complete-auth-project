// ════════════════════════════════════════════════════════════════
// HELPER: GET JWT TOKEN
// ════════════════════════════════════════════════════════════════

function getAuthToken() {
    // 1. Check cookies first (shared from React app on localhost)
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith('authToken=')) {
            return cookie.substring('authToken='.length);
        }
    }

    // 2. Fallback to storage
    return localStorage.getItem('authToken') ||
        sessionStorage.getItem('authToken') ||
        localStorage.getItem('token') ||
        sessionStorage.getItem('token');
}

// ════════════════════════════════════════════════════════════════
// ENFORCE AUTHENTICATION IMMEDIATELY
// ════════════════════════════════════════════════════════════════

const token = getAuthToken();
if (!token) {
    console.warn("No authentication token found. Redirecting to login...");
    window.location.href = "http://localhost:5173/login"; // Redirect back to Vite frontend
}

// ════════════════════════════════════════════════════════════════
// CREATE SIGNALR CONNECTION
// ════════════════════════════════════════════════════════════════

const connection = new signalR.HubConnectionBuilder()
    .withUrl("/chathub", {
        accessTokenFactory: () => getAuthToken() || ""
    })
    .configureLogging(signalR.LogLevel.Information)
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .build();

// ════════════════════════════════════════════════════════════════
// DOM ELEMENTS & INITIALIZATION
// ════════════════════════════════════════════════════════════════

// Define variables in global scope so event listeners can use them
let sendButton, messageInput, messagesList, statusSpan, currentUserSpan;
let onlineUsersList, onlineCount, typingIndicator, typingText;

// State
let typingTimeout = null;
let currentlyTypingUsers = new Set();

document.addEventListener("DOMContentLoaded", () => {
    // Initialize DOM elements safely after DOM is ready
    sendButton = document.getElementById("sendButton");
    messageInput = document.getElementById("messageInput");
    messagesList = document.getElementById("messagesList");
    statusSpan = document.getElementById("status");
    currentUserSpan = document.getElementById("currentUser");
    onlineUsersList = document.getElementById("onlineUsersList") || document.getElementById("onlineuserslist"); // fallback for casing
    onlineCount = document.getElementById("onlineCount");
    typingIndicator = document.getElementById("typingIndicator");
    typingText = document.getElementById("typingText");

    // Now start the connection since DOM is ready
    setupSignalREvents();
    startConnection();
    setupEventListeners();
});

function setupSignalREvents() {
    connection.on("receivemessage", function (fullName, email, message) {
        const li = document.createElement("li");

        const senderSpan = document.createElement("span");
        senderSpan.className = "message-sender";
        senderSpan.textContent = fullName;

        const emailSpan = document.createElement("span");
        emailSpan.className = "message-email";
        emailSpan.textContent = `(${email})`;

        const messageSpan = document.createElement("span");
        messageSpan.className = "message-text";
        messageSpan.textContent = `: ${message}`;

        li.appendChild(senderSpan);
        li.appendChild(emailSpan);
        li.appendChild(messageSpan);

        messagesList.appendChild(li);
        scrollToBottom();
    });

    connection.on("userconnected", function (fullName, email) {
        console.log(`✅ ${fullName} (${email}) joined`);

        const li = document.createElement("li");
        li.className = "system-message";
        li.textContent = `${fullName} joined the chat`;
        messagesList.appendChild(li);

        connection.invoke("GetOnlineUsers").catch(err => console.error(err));
    });

    connection.on("userdisconnected", function (fullName, email) {
        console.log(`❌ ${fullName} (${email}) left`);

        const li = document.createElement("li");
        li.className = "system-message";
        li.textContent = `${fullName} left the chat`;
        messagesList.appendChild(li);

        connection.invoke("GetOnlineUsers").catch(err => console.error(err));
    });

    connection.on("onlineuserslist", function (users) {
        if (!onlineUsersList) return;
        onlineUsersList.innerHTML = "";
        onlineCount.textContent = users.length;

        users.forEach(user => {
            const li = document.createElement("li");

            const nameDiv = document.createElement("div");
            nameDiv.className = "user-name";
            nameDiv.textContent = user.FullName;

            const emailDiv = document.createElement("div");
            emailDiv.className = "user-email";
            emailDiv.textContent = user.Email;

            li.appendChild(nameDiv);
            li.appendChild(emailDiv);

            const connectedTime = new Date(user.ConnectedAt);
            li.title = `Connected at ${connectedTime.toLocaleTimeString()}`;

            onlineUsersList.appendChild(li);
        });
    });

    connection.on("usertyping", function (fullName) {
        currentlyTypingUsers.add(fullName);
        updateTypingIndicator();
    });

    connection.on("userstoppedtyping", function (fullName) {
        currentlyTypingUsers.delete(fullName);
        updateTypingIndicator();
    });

    connection.onreconnecting(error => {
        console.log("🔄 Connection lost. Reconnecting...", error);
        updateStatus("Reconnecting...", "rgba(255, 152, 0, 0.8)");
        if (sendButton) sendButton.disabled = true;
    });

    connection.onreconnected(connectionId => {
        console.log("✅ Reconnected! New connection ID:", connectionId);
        updateStatus("Connected ✅", "rgba(76, 175, 80, 0.8)");
        if (sendButton) sendButton.disabled = false;

        connection.invoke("GetOnlineUsers").catch(err => console.error(err));

        const li = document.createElement("li");
        li.className = "system-message";
        li.textContent = "Reconnected to chat";
        messagesList.appendChild(li);
        scrollToBottom();
    });

    connection.onclose(error => {
        console.log("🔌 Connection closed", error);
        updateStatus("Disconnected ❌", "rgba(244, 67, 54, 0.8)");
        if (sendButton) sendButton.disabled = true;

        if (error) {
            console.error("Close reason:", error);
        }
    });
}

// ════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════

function updateTypingIndicator() {
    if (!typingIndicator || !typingText) return;

    if (currentlyTypingUsers.size === 0) {
        typingIndicator.classList.remove("visible");
        typingIndicator.style.display = "none";
    } else {
        typingIndicator.classList.add("visible");
        typingIndicator.style.display = "block";

        const users = Array.from(currentlyTypingUsers);
        if (users.length === 1) {
            typingText.textContent = `${users[0]} is typing...`;
        } else if (users.length === 2) {
            typingText.textContent = `${users[0]} and ${users[1]} are typing...`;
        } else {
            typingText.textContent = `${users.length} people are typing...`;
        }
    }
}

function scrollToBottom() {
    const messagesContainer = document.querySelector(".messages-container");
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

function updateStatus(message, color) {
    if (statusSpan) {
        statusSpan.textContent = message;
        statusSpan.style.background = color;
    }
}

// ════════════════════════════════════════════════════════════════
// CONNECTION MANAGEMENT
// ════════════════════════════════════════════════════════════════

function startConnection() {
    connection.start()
        .then(function () {
            console.log("✅ Connected to SignalR hub");
            console.log("Connection ID:", connection.connectionId);

            updateStatus("Connected ✅", "rgba(76, 175, 80, 0.8)");
            if (sendButton) sendButton.disabled = false;

            if (currentUserSpan) currentUserSpan.textContent = "Connected as authenticated user";
        })
        .catch(function (err) {
            console.error("❌ Connection error:", err.toString());
            updateStatus("Connection Failed ❌", "rgba(244, 67, 54, 0.8)");
            if (sendButton) sendButton.disabled = true;

            // Check if it's an authentication error
            if (err.toString().includes("401") ||
                err.toString().includes("Unauthorized") ||
                err.toString().includes("Failed to complete negotiation")) {

                alert("❌ Authentication Error\n\nYou must be logged in to use chat.\n\nPlease log in and try again.");
                window.location.href = "http://localhost:5173/login"; // Redirect to Vite frontend
            }
        });
}

// ════════════════════════════════════════════════════════════════
// DOM EVENT LISTENERS (Call after DOM load)
// ════════════════════════════════════════════════════════════════

function setupEventListeners() {
    if (!sendButton || !messageInput) return;

    sendButton.addEventListener("click", function (event) {
        const message = messageInput.value.trim();

        if (message === "") {
            return;
        }

        sendButton.disabled = true;

        connection.invoke("SendMessage", message)
            .then(function () {
                console.log("✅ Message sent");
                messageInput.value = "";
                sendButton.disabled = false;
                messageInput.focus();
                connection.invoke("StopTypingIndicator");
            })
            .catch(function (err) {
                console.error("❌ Send error:", err.toString());
                alert("Failed to send message. Please try again.");
                sendButton.disabled = false;
            });

        event.preventDefault();
    });

    messageInput.addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            sendButton.click();
            event.preventDefault();
        }
    });

    messageInput.addEventListener("input", function () {
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }

        if (messageInput.value.trim() !== "") {
            connection.invoke("SendTypingIndicator")
                .catch(err => console.error("Typing indicator error:", err));

            typingTimeout = setTimeout(() => {
                connection.invoke("StopTypingIndicator")
                    .catch(err => console.error("Stop typing error:", err));
            }, 2000);
        } else {
            connection.invoke("StopTypingIndicator")
                .catch(err => console.error("Stop typing error:", err));
        }
    });

    messageInput.addEventListener("blur", function () {
        connection.invoke("StopTypingIndicator")
            .catch(err => console.error("Stop typing error:", err));

        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }
    });
}