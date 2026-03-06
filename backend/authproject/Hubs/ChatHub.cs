using System;
using System.Threading.Tasks;
using authproject.Application;
using authproject.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace authproject.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        // Dependency injection - get ConnectionManager from DI container
        private readonly ConnectionManager _connectionManager;
        private readonly AuthDbContext _dbContext;

        // Constructor
        // ASP.NET Core automatically injects the ConnectionManager instance
        public ChatHub(ConnectionManager connectionManager, AuthDbContext dbContext)
        {
            _connectionManager = connectionManager;
            _dbContext = dbContext;
        }


        public override async Task OnConnectedAsync()
        {
            // ─────────────────────────────────────────────────────────
            // STEP 1: Get Connection Info
            // ─────────────────────────────────────────────────────────

            // Context.ConnectionId - SignalR's unique connection ID
            // Example: "x8s9d7f6-3h2j-4k5l-9m8n-7b6v5c4x3z2a"
            var connectionId = Context.ConnectionId;

            // Context.User - The authenticated user from your login
            // This is the SAME user object you created in your login code:
            //   var claimsIdentity = new ClaimsIdentity(claims, ...);
            //   await HttpContext.SignInAsync(..., new ClaimsPrincipal(claimsIdentity), ...);
            var user = Context.User;

            // ─────────────────────────────────────────────────────────
            // STEP 2: Extract User Info from Claims
            // ─────────────────────────────────────────────────────────

            // Get UserId from claims
            // When you logged in, you added: new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())
            // Now we retrieve it here
            var userId = user?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            // Get FullName from claims
            // When you logged in, you added: new Claim(ClaimTypes.Name, user.FullName)
            var fullName = user?.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value;

            // Get Email from claims
            // When you logged in, you added: new Claim(ClaimTypes.Email, user.Email)
            var email = user?.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;

            // ─────────────────────────────────────────────────────────
            // STEP 3: Validation
            // ─────────────────────────────────────────────────────────

            // Make sure we got the required data
            if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(fullName) || string.IsNullOrEmpty(email))
            {
                Console.WriteLine("⚠️ User connected without valid claims");
                Console.WriteLine($"   UserId: {userId ?? "NULL"}");
                Console.WriteLine($"   FullName: {fullName ?? "NULL"}");
                Console.WriteLine($"   Email: {email ?? "NULL"}");

                // Still call base method
                await base.OnConnectedAsync();
                return;  // Exit early
            }

            // ─────────────────────────────────────────────────────────
            // STEP 4: Add to Connection Manager
            // ─────────────────────────────────────────────────────────

            _connectionManager.AddConnection(userId, connectionId, fullName, email);

            // ─────────────────────────────────────────────────────────
            // STEP 5: Notify All Clients
            // ─────────────────────────────────────────────────────────

            // Send to ALL connected clients (including this one)
            // Event name: "UserConnected"
            // Client will listen for this with: connection.on("UserConnected", ...)
            await Clients.All.SendAsync("UserConnected", fullName, email);

            // ─────────────────────────────────────────────────────────
            // STEP 6: Send Online Users List to New User
            // ─────────────────────────────────────────────────────────

            // Get all currently online users
            var onlineUsers = _connectionManager.GetAllConnectedUsers()
                .Select(c => new
                {
                    UserId = c.UserId,
                    FullName = c.FullName,
                    Email = c.Email,
                    ConnectedAt = c.ConnectedAt
                })
                .ToList();

            // Send only to the user who just connected
            // Clients.Caller = Only the person who called this method
            await Clients.Caller.SendAsync("OnlineUsersList", onlineUsers);

            // ─────────────────────────────────────────────────────────
            // STEP 7: Log for Debugging
            // ─────────────────────────────────────────────────────────

            Console.WriteLine($"✅ User connected:");
            Console.WriteLine($"   UserId: {userId}");
            Console.WriteLine($"   FullName: {fullName}");
            Console.WriteLine($"   Email: {email}");
            Console.WriteLine($"   ConnectionId: {connectionId}");
            Console.WriteLine($"   Total connections: {_connectionManager.GetConnectionCount()}");
            Console.WriteLine($"   Unique users online: {_connectionManager.GetOnlineUserCount()}");

            // ─────────────────────────────────────────────────────────
            // STEP 8: Fetch Chat History
            // ─────────────────────────────────────────────────────────

            // Fetch the last 50 messages from the database
            // Ensure we only load Global messages AND Private messages relevant to the current user
            var chatHistory = _dbContext.Messages
                .Where(m => m.ReceiverId == null || m.SenderId == userId || m.ReceiverId == userId)
                .OrderByDescending(m => m.SentAt)
                .Take(50)
                .OrderBy(m => m.SentAt) // Re-order them chronologically 
                .Select(m => new {
                    id = m.Id,
                    fullName = m.SenderFullName,
                    email = m.SenderEmail,
                    content = m.Content,
                    sentAt = m.SentAt,
                    receiverId = m.ReceiverId,
                    senderId = m.SenderId,
                    isRead = m.IsRead,
                    readAt = m.ReadAt
                })
                .ToList();

            // Send the history ONLY to the specific user who just connected
            await Clients.Caller.SendAsync("LoadChatHistory", chatHistory);

            // ─────────────────────────────────────────────────────────
            // STEP 9: Call Base Method (REQUIRED)
            // ─────────────────────────────────────────────────────────

            // ALWAYS call this - SignalR needs to do internal bookkeeping
            await base.OnConnectedAsync();
        }

        // ═══════════════════════════════════════════════════════════════
        // ON DISCONNECTED - Called automatically when user disconnects
        // ═══════════════════════════════════════════════════════════════
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var connectionId = Context.ConnectionId;

            // Get connection info BEFORE removing it
            var connection = _connectionManager.GetConnection(connectionId);

            if (connection != null)
            {
                // Remove from connection manager
                _connectionManager.RemoveConnection(connectionId);

                // Check if user still has other connections open
                // (They might have multiple tabs/devices)
                var stillConnected = _connectionManager.IsUserOnline(connection.UserId);

                // Only notify if user is COMPLETELY offline
                if (!stillConnected)
                {
                    // User has NO MORE connections - they're fully offline
                    await Clients.All.SendAsync("UserDisconnected", connection.FullName, connection.Email);

                    Console.WriteLine($"❌ User fully disconnected: {connection.FullName} ({connection.Email})");
                }
                else
                {
                    // User still has other connections open
                    Console.WriteLine($"🔌 Connection closed: {connection.FullName}, but user still has other connections");
                }

                // Log connection count
                Console.WriteLine($"   Total connections: {_connectionManager.GetConnectionCount()}");
                Console.WriteLine($"   Unique users online: {_connectionManager.GetOnlineUserCount()}");
            }
            else
            {
                Console.WriteLine($"⚠️ Unknown connection disconnected: {connectionId}");
            }

            // Log exception if connection was lost due to error
            if (exception != null)
            {
                Console.WriteLine($"   Disconnect reason: {exception.Message}");
            }

            // ALWAYS call base method
            await base.OnDisconnectedAsync(exception);
        }

        // ═══════════════════════════════════════════════════════════════
        // SEND MESSAGE - Called by clients to send a message
        // ═══════════════════════════════════════════════════════════════
        public async Task SendMessage(string message, string? receiverId = null)
        {
            var connectionId = Context.ConnectionId;
            var connection = _connectionManager.GetConnection(connectionId);

            if (connection == null)
            {
                Console.WriteLine($"⚠️ Message from unknown connection: {connectionId}");
                return;
            }

            // Get user info from connection
            var fullName = connection.FullName;
            var email = connection.Email;
            var senderId = connection.UserId;

            // 1. Create the database entity
            var dbMessage = new authproject.Models.Message
            {
                SenderId = senderId,
                SenderFullName = fullName,
                SenderEmail = email,
                Content = message,
                SentAt = DateTime.UtcNow,
                ReceiverId = receiverId
            };

            // 2. Save it to SQL Server
            _dbContext.Messages.Add(dbMessage);
            await _dbContext.SaveChangesAsync();

            // 3. Broadcast Logic
            if (string.IsNullOrEmpty(receiverId))
            {
                // GLOBAL MESSAGE
                await Clients.All.SendAsync("ReceiveMessage", fullName, email, message, senderId, null);
                Console.WriteLine($"💬 Global Message from {fullName} ({email}): {message}");
            }
            else
            {
                // PRIVATE MESSAGE
                // Find if the receiver is currently online
                 var onlineUsers = _connectionManager.GetAllConnectedUsers();
                 var receiverConnection = onlineUsers.FirstOrDefault(u => u.UserId == receiverId);

                 if (receiverConnection != null)
                 {
                     // Send to the receiver's specific connection
                     await Clients.Client(receiverConnection.ConnectionId).SendAsync("ReceiveMessage", fullName, email, message, senderId, receiverId);
                 }

                 // ALSO send it back to the Sender's own connection so their UI updates
                 // (We use Client instead of Caller just to be explicit)
                 await Clients.Client(connection.ConnectionId).SendAsync("ReceiveMessage", fullName, email, message, senderId, receiverId);

                 Console.WriteLine($"🔒 Private Message from {fullName} to {receiverId}: {message}");
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // MARK TARGET MESSAGES AS READ
        // ═══════════════════════════════════════════════════════════════
        public async Task MarkMessagesAsRead(string senderId)
        {
            var connectionId = Context.ConnectionId;
            var connection = _connectionManager.GetConnection(connectionId);

            if (connection == null) return;

            var currentUserId = connection.UserId;

            // Find all unread messages where:
            // - The sender is `senderId`
            // - The receiver is the current user (`currentUserId`)
            var unreadMessages = _dbContext.Messages
                .Where(m => m.SenderId == senderId && m.ReceiverId == currentUserId && !m.IsRead)
                .ToList();

            if (unreadMessages.Any())
            {
                var now = DateTime.UtcNow;
                foreach (var msg in unreadMessages)
                {
                    msg.IsRead = true;
                    msg.ReadAt = now;
                }

                await _dbContext.SaveChangesAsync();

                // Alert the original sender that their messages were read
                var onlineUsers = _connectionManager.GetAllConnectedUsers();
                var originalSenderConnection = onlineUsers.FirstOrDefault(u => u.UserId == senderId);

                if (originalSenderConnection != null)
                {
                    // Blast back to the sender
                    await Clients.Client(originalSenderConnection.ConnectionId).SendAsync("MessagesRead", currentUserId);
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // GET ONLINE USERS - Called by clients to get online users list
        // ═══════════════════════════════════════════════════════════════
        public async Task GetOnlineUsers()
        {
            var onlineUsers = _connectionManager.GetAllConnectedUsers()
                .Select(c => new
                {
                    UserId = c.UserId,
                    FullName = c.FullName,
                    Email = c.Email,
                    ConnectedAt = c.ConnectedAt
                })
                .ToList();

            // Send only to the caller
            await Clients.Caller.SendAsync("OnlineUsersList", onlineUsers);
        }

        // ═══════════════════════════════════════════════════════════════
        // TYPING INDICATORS
        // ═══════════════════════════════════════════════════════════════

        public async Task SendTypingIndicator(string? receiverId = null)
        {
            var connection = _connectionManager.GetConnection(Context.ConnectionId);
            if (connection == null) return;

            if (string.IsNullOrEmpty(receiverId))
            {
                // Global Typing
                await Clients.Others.SendAsync("UserTyping", connection.FullName, connection.UserId, null);
            }
            else
            {
                // Private Typing
                var onlineUsers = _connectionManager.GetAllConnectedUsers();
                var receiverConnection = onlineUsers.FirstOrDefault(u => u.UserId == receiverId);
                if (receiverConnection != null)
                {
                    await Clients.Client(receiverConnection.ConnectionId).SendAsync("UserTyping", connection.FullName, connection.UserId, receiverId);
                }
            }
        }

        public async Task StopTypingIndicator(string? receiverId = null)
        {
            var connection = _connectionManager.GetConnection(Context.ConnectionId);
            if (connection == null) return;

            if (string.IsNullOrEmpty(receiverId))
            {
                // Global Typing Stop
                await Clients.Others.SendAsync("UserStoppedTyping", connection.FullName, connection.UserId, null);
            }
            else
            {
                // Private Typing Stop
                var onlineUsers = _connectionManager.GetAllConnectedUsers();
                var receiverConnection = onlineUsers.FirstOrDefault(u => u.UserId == receiverId);
                if (receiverConnection != null)
                {
                    await Clients.Client(receiverConnection.ConnectionId).SendAsync("UserStoppedTyping", connection.FullName, connection.UserId, receiverId);
                }
            }
        }
    }
}
