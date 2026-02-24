// ════════════════════════════════════════════════════════════════
// HELPER: GET JWT TOKEN
// ════════════════════════════════════════════════════════════════

function getAuthToken() {
    // Adjust the key name to match where you store the token
    // Common names: 'authToken', 'jwtToken', 'token', 'access_token'
    return localStorage.getItem('authToken') ||
        sessionStorage.getItem('authToken') ||
        localStorage.getItem('token') ||
        sessionStorage.getItem('token');
}

// ════════════════════════════════════════════════════════════════
// CREATE SIGNALR CONNECTION
// ════════════════════════════════════════════════════════════════

const connection = new signalR.HubConnectionBuilder()
    .withUrl("/chathub", {
        // JWT token is passed here
        accessTokenFactory: () => {
            const token = getAuthToken();

            if (!token) {
                console.error("❌ No authentication token found!");
                console.log("Please log in first");
            }

            return token || "";
        }
    })
    .configureLogging(signalR.LogLevel.Information)
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .build();

// ════════════════════════════════════════════════════════════════
// DOM ELEMENTS
// ════════════════════════════════════════════════════════════════

const sendButton = document.getElementById("sendButton");
const messageInput = document.getElementById("messageInput");
const messagesList = document.getElementById("messagesList");
const statusSpan = document.getElementById("status");
const currentUserSpan = document.getElementById("currentUser");
const onlineUsersList = document.getElementById("onlineUsersList");
const onlineCount = document.getElementById("onlineCount");
const typingIndicator = document.getElementById("typingIndicator");
const typingText = document.getElementById("typingText");

// ════════════════════════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════════════════════════

let typingTimeout = null;
let currentlyTypingUsers = new Set();

// ════════════════════════════════════════════════════════════════
// EVENT LISTENERS FROM SERVER
// ════════════════════════════════════════════════════════════════

connection.on("ReceiveMessage", function (fullName, email, message) {
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

connection.on("UserConnected", function (fullName, email) {
    console.log(`✅ ${fullName} (${email}) joined`);

    const li = document.createElement("li");
    li.className = "system-message";
    li.textContent = `${fullName} joined the chat`;
    messagesList.appendChild(li);

    connection.invoke("GetOnlineUsers").catch(err => console.error(err));
});

connection.on("UserDisconnected", function (fullName, email) {
    console.log(`❌ ${fullName} (${email}) left`);

    const li = document.createElement("li");
    li.className = "system-message";
    li.textContent = `${fullName} left the chat`;
    messagesList.appendChild(li);

    connection.invoke("GetOnlineUsers").catch(err => console.error(err));
});

connection.on("OnlineUsersList", function (users) {
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

connection.on("UserTyping", function (fullName) {
    currentlyTypingUsers.add(fullName);
    updateTypingIndicator();
});

connection.on("UserStoppedTyping", function (fullName) {
    currentlyTypingUsers.delete(fullName);
    updateTypingIndicator();
});

// ════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════

function updateTypingIndicator() {
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
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function updateStatus(message, color) {
    statusSpan.textContent = message;
    statusSpan.style.background = color;
}

// ════════════════════════════════════════════════════════════════
// CONNECTION MANAGEMENT
// ════════════════════════════════════════════════════════════════

connection.start()
    .then(function () {
        console.log("✅ Connected to SignalR hub");
        console.log("Connection ID:", connection.connectionId);

        updateStatus("Connected ✅", "rgba(76, 175, 80, 0.8)");
        sendButton.disabled = false;

        currentUserSpan.textContent = "Connected as authenticated user";
    })
    .catch(function (err) {
        console.error("❌ Connection error:", err.toString());
        updateStatus("Connection Failed ❌", "rgba(244, 67, 54, 0.8)");
        sendButton.disabled = true;

        // Check if it's an authentication error
        if (err.toString().includes("401") ||
            err.toString().includes("Unauthorized") ||
            err.toString().includes("Failed to complete negotiation")) {

            alert("❌ Authentication Error\n\nYou must be logged in to use chat.\n\nPlease log in and try again.");

            // Optional: Redirect to login page
            // window.location.href = "/login";
        }
    });

connection.onreconnecting(error => {
    console.log("🔄 Connection lost. Reconnecting...", error);
    updateStatus("Reconnecting...", "rgba(255, 152, 0, 0.8)");
    sendButton.disabled = true;
});

connection.onreconnected(connectionId => {
    console.log("✅ Reconnected! New connection ID:", connectionId);
    updateStatus("Connected ✅", "rgba(76, 175, 80, 0.8)");
    sendButton.disabled = false;

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
    sendButton.disabled = true;

    if (error) {
        console.error("Close reason:", error);
    }
});

// ════════════════════════════════════════════════════════════════
// SEND MESSAGE
// ════════════════════════════════════════════════════════════════

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

// ════════════════════════════════════════════════════════════════
// TYPING INDICATORS
// ════════════════════════════════════════════════════════════════

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