using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using authproject.Data;
using Microsoft.Extensions.Configuration;
using System.IO;

var builder = new ConfigurationBuilder()
    .SetBasePath(Directory.GetCurrentDirectory())
    .AddJsonFile("appsettings.json");
var configuration = builder.Build();

var optionsBuilder = new DbContextOptionsBuilder<AuthDbContext>();
optionsBuilder.UseSqlServer(configuration.GetConnectionString("DefaultConnection"));

using (var db = new AuthDbContext(optionsBuilder.Options))
{
    Console.WriteLine("Executing query...");
    try
    {
        var userId = "test-user-id";
        
        var chatHistory = db.Messages
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
            
        Console.WriteLine($"Query successful. Loaded {chatHistory.Count} messages.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"EXCEPTION THROWN:\n{ex}");
    }
}
