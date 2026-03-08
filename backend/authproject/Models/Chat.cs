using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace authproject.Models
{
    public class Chat
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        // 1 = Private, 2 = Group
        [Required]
        public int Type { get; set; } = 1;

        // Nullable because private chats do not have explicit names
        public string? Name { get; set; }

        // Nullable because private chats do not have an admin
        public string? AdminId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("AdminId")]
        public User? Admin { get; set; }

        // Navigation properties
        public ICollection<ChatParticipant> Participants { get; set; } = new List<ChatParticipant>();
        public ICollection<Message> Messages { get; set; } = new List<Message>();
    }
}
