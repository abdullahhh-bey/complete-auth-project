// ========================================
// STEP 1: CREATE SIGNALR CONNECTION
// ========================================

// signalR is available globally from the CDN script we included
// HubConnectionBuilder is a class that helps us create a connection
const connection = new signalR.HubConnectionBuilder()
    // .withUrl() tells SignalR WHERE to connect
    // "/chathub" matches the route we defined in Program.cs: app.MapHub<ChatHub>("/chathub")
    .withUrl("/chathub")

    // .configureLogging() sets up logging level
    // LogLevel.Information shows connection info, errors, etc.
    // Other options: LogLevel.Debug, LogLevel.Error, LogLevel.None
    .configureLogging(signalR.LogLevel.Information)

    // .build() creates the actual connection object
    .build();

// At this point, connection is created but NOT connected yet
// Think of it like: you've written a phone number, but haven't dialed yet

// ========================================
// STEP 2: SET UP EVENT LISTENER
// ========================================

// connection.on() is how we LISTEN for events from the server
// "ReceiveMessage" MUST match the event name in ChatHub.cs
// Remember: await Clients.All.SendAsync("ReceiveMessage", user, message);
connection.on("ReceiveMessage", function (user, message) {
    // This function runs EVERY TIME the server sends a "ReceiveMessage" event

    // user and message are the parameters sent from the server
    // They match the parameters in: SendAsync("ReceiveMessage", user, message)

    // Create a new <li> element for the message
    const li = document.createElement("li");

    // Set the innerHTML with the user and message
    // We use textContent for the actual text to prevent XSS attacks
    // (textContent escapes HTML, so <script> tags won't execute)
    const userSpan = document.createElement("strong");
    userSpan.textContent = user;

    const messageText = document.createTextNode(": " + message);

    li.appendChild(userSpan);
    li.appendChild(messageText);

    // Add the message to the messages list
    document.getElementById("messagesList").appendChild(li);

    // Auto-scroll to the bottom to show the latest message
    const messagesContainer = document.querySelector(".messages-container");
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
});

// ========================================
// STEP 3: START THE CONNECTION
// ========================================

// connection.start() actually connects to the server
// It's asynchronous, so we use .then() and .catch()
connection.start()
    .then(function () {
        // SUCCESS! Connection established
        console.log("✅ Connected to SignalR hub");

        // Update the status indicator
        document.getElementById("status").textContent = "Connected ✅";
        document.getElementById("status").style.background = "rgba(76, 175, 80, 0.8)";

        // Enable the send button
        document.getElementById("sendButton").disabled = false;
    })
    .catch(function (err) {
        // ERROR! Connection failed
        console.error("❌ Connection error:", err.toString());

        // Update the status indicator
        document.getElementById("status").textContent = "Connection Failed ❌";
        document.getElementById("status").style.background = "rgba(244, 67, 54, 0.8)";

        // Keep send button disabled
        document.getElementById("sendButton").disabled = true;
    });

// ========================================
// STEP 4: SEND MESSAGES
// ========================================

// Get references to our HTML elements
const sendButton = document.getElementById("sendButton");
const userInput = document.getElementById("userInput");
const messageInput = document.getElementById("messageInput");

// Disable send button until we're connected
sendButton.disabled = true;

// Handle send button click
sendButton.addEventListener("click", function (event) {
    // Get the values from inputs
    const user = userInput.value.trim();  // .trim() removes whitespace
    const message = messageInput.value.trim();

    // Validation: Make sure both fields have content
    if (user === "" || message === "") {
        alert("Please enter both your name and a message!");
        return;  // Stop here, don't send
    }

    // connection.invoke() calls a method on the server Hub
    // "SendMessage" MUST match the method name in ChatHub.cs
    // Remember: public async Task SendMessage(string user, string message)
    connection.invoke("SendMessage", user, message)
        .then(function () {
            // SUCCESS! Message sent to server
            console.log("✅ Message sent");

            // Clear the message input (but keep the username)
            messageInput.value = "";

            // Focus back on message input for quick typing
            messageInput.focus();
        })
        .catch(function (err) {
            // ERROR! Failed to send message
            console.error("❌ Send error:", err.toString());
            alert("Failed to send message. Please try again.");
        });

    // Prevent form submission if this was in a form
    event.preventDefault();
});

// ========================================
// STEP 5: HANDLE ENTER KEY
// ========================================

// Allow sending messages by pressing Enter
messageInput.addEventListener("keypress", function (event) {
    // event.key is the key that was pressed
    // Check if it's the Enter key
    if (event.key === "Enter") {
        // Trigger the send button click
        sendButton.click();

        // Prevent default behavior (like form submission)
        event.preventDefault();
    }
});

// ========================================
// STEP 6: HANDLE DISCONNECTION
// ========================================

// This event fires when the connection is lost
connection.onclose(function (err) {
    console.log("🔌 Connection closed");

    // Update UI
    document.getElementById("status").textContent = "Disconnected ❌";
    document.getElementById("status").style.background = "rgba(244, 67, 54, 0.8)";
    sendButton.disabled = true;

    if (err) {
        console.error("Disconnect reason:", err);
    }

    // Optional: Attempt to reconnect after 5 seconds
    setTimeout(function () {
        console.log("🔄 Attempting to reconnect...");
        connection.start()
            .then(function () {
                console.log("✅ Reconnected!");
                document.getElementById("status").textContent = "Connected ✅";
                document.getElementById("status").style.background = "rgba(76, 175, 80, 0.8)";
                sendButton.disabled = false;
            })
            .catch(function (err) {
                console.error("❌ Reconnection failed:", err);
            });
    }, 5000);  // 5000 milliseconds = 5 seconds
});