namespace authproject.Models
{
    public class UserConnection
    {
        // The User.Id from your Users table
        // Example: 123, 456, 789 (if int) or "abc-def-ghi" (if Guid)
        public string UserId { get; set; } = string.Empty;

        // The SignalR ConnectionId (temporary, changes on reconnect)
        // Example: "x8s9d7f6-3h2j-4k5l-9m8n-7b6v5c4x3z2a"
        public string ConnectionId { get; set; } = string.Empty;

        // User's full name for display (from User.FullName)
        // Example: "John Doe"
        public string FullName { get; set; } = string.Empty;

        // User's email for display (from User.Email)
        // Example: "john@example.com"
        public string Email { get; set; } = string.Empty;

        // When this connection was established
        public DateTime ConnectedAt { get; set; } = DateTime.UtcNow;
    }
}
