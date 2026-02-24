using authproject.Models;
using System.Collections.Concurrent;

namespace authproject.Application
{
    public class ConnectionManager
    {
        // Thread-safe dictionary to store connections
        // Key = ConnectionId (SignalR's unique ID)
        // Value = UserConnection object (our data)
        //
        // Why ConcurrentDictionary?
        // - Multiple users can connect at the SAME TIME
        // - Regular Dictionary would crash with race conditions
        // - ConcurrentDictionary handles concurrent reads/writes safely
        private readonly ConcurrentDictionary<string, UserConnection> _connections;

        // Constructor
        public ConnectionManager()
        {
            _connections = new ConcurrentDictionary<string, UserConnection>();
        }

        // ═══════════════════════════════════════════════════════════════
        // ADD CONNECTION
        // Called when a user connects to SignalR
        // ═══════════════════════════════════════════════════════════════
        public void AddConnection(string userId, string connectionId, string fullName, string email)
        {
            // Create the connection object
            var connection = new UserConnection
            {
                UserId = userId,
                ConnectionId = connectionId,
                FullName = fullName,
                Email = email,
                ConnectedAt = DateTime.UtcNow
            };

            // TryAdd: Thread-safe method to add
            // Returns true if added successfully
            // Returns false if connectionId already exists (shouldn't happen)
            if (_connections.TryAdd(connectionId, connection))
            {
                Console.WriteLine($"✅ Connection added: {fullName} ({email}) - ConnectionId: {connectionId}");
            }
            else
            {
                // This shouldn't happen, but log it if it does
                Console.WriteLine($"⚠️ Connection already exists: {connectionId}");
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // REMOVE CONNECTION
        // Called when a user disconnects from SignalR
        // ═══════════════════════════════════════════════════════════════
        public void RemoveConnection(string connectionId)
        {
            // TryRemove: Thread-safe method to remove
            // out var connection: Gets the removed value
            // Returns true if removed successfully
            // Returns false if connectionId doesn't exist
            if (_connections.TryRemove(connectionId, out var connection))
            {
                Console.WriteLine($"❌ Connection removed: {connection.FullName} - ConnectionId: {connectionId}");
            }
            else
            {
                Console.WriteLine($"⚠️ Connection not found: {connectionId}");
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // GET CONNECTION BY CONNECTION ID
        // Get connection info for a specific ConnectionId
        // ═══════════════════════════════════════════════════════════════
        public UserConnection? GetConnection(string connectionId)
        {
            // TryGetValue: Thread-safe method to get value
            // Returns true if found, false if not found
            // out var connection: Receives the value if found
            _connections.TryGetValue(connectionId, out var connection);

            // connection will be null if not found
            return connection;
        }

        // ═══════════════════════════════════════════════════════════════
        // GET CONNECTIONS BY USER ID
        // A user can have MULTIPLE connections (multiple tabs/devices)
        // This gets ALL connections for a specific user
        // ═══════════════════════════════════════════════════════════════
        public List<UserConnection> GetConnectionsByUserId(string userId)
        {
            // LINQ: Filter all connections where UserId matches
            return _connections.Values
                .Where(c => c.UserId == userId)  // Filter condition
                .ToList();  // Convert IEnumerable to List
        }

        // ═══════════════════════════════════════════════════════════════
        // GET CONNECTION IDS BY USER ID
        // Get only the ConnectionIds for a user (not full objects)
        // Useful for sending messages to all of a user's devices
        // ═══════════════════════════════════════════════════════════════
        public List<string> GetConnectionIdsByUserId(string userId)
        {
            return _connections.Values
                .Where(c => c.UserId == userId)
                .Select(c => c.ConnectionId)  // Extract only ConnectionId
                .ToList();
        }

        // ═══════════════════════════════════════════════════════════════
        // GET ALL CONNECTED USERS
        // Returns one UserConnection per unique user
        // Even if they have multiple tabs open
        // ═══════════════════════════════════════════════════════════════
        public List<UserConnection> GetAllConnectedUsers()
        {
            // Example scenario:
            // User "1" has 3 tabs open → 3 connections
            // User "2" has 2 tabs open → 2 connections
            // Total: 5 connections, but only 2 unique users
            //
            // GroupBy(UserId) groups connections by user
            // Select(g => g.First()) takes first connection from each group
            // Result: 2 UserConnection objects (one per user)

            return _connections.Values
                .GroupBy(c => c.UserId)        // Group by UserId
                .Select(g => g.First())        // Take first from each group
                .OrderBy(c => c.FullName)      // Sort alphabetically
                .ToList();
        }

        // ═══════════════════════════════════════════════════════════════
        // IS USER ONLINE?
        // Check if a user has at least one active connection
        // ═══════════════════════════════════════════════════════════════
        public bool IsUserOnline(string userId)
        {
            // .Any() returns true if at least one connection matches
            // More efficient than .Count() > 0 (stops at first match)
            return _connections.Values.Any(c => c.UserId == userId);
        }

        // ═══════════════════════════════════════════════════════════════
        // GET ONLINE USER COUNT
        // How many unique users are online?
        // ═══════════════════════════════════════════════════════════════
        public int GetOnlineUserCount()
        {
            return _connections.Values
                .Select(c => c.UserId)  // Get all UserIds
                .Distinct()             // Remove duplicates
                .Count();               // Count unique users
        }

        // ═══════════════════════════════════════════════════════════════
        // GET ALL CONNECTION IDS
        // Get all ConnectionIds (useful for broadcasting)
        // ═══════════════════════════════════════════════════════════════
        public List<string> GetAllConnectionIds()
        {
            // .Keys returns all keys from the dictionary
            // In our case, keys are ConnectionIds
            return _connections.Keys.ToList();
        }

        // ═══════════════════════════════════════════════════════════════
        // GET CONNECTION COUNT
        // Total number of active connections (not unique users)
        // ═══════════════════════════════════════════════════════════════
        public int GetConnectionCount()
        {
            return _connections.Count;
        }
    }
}
