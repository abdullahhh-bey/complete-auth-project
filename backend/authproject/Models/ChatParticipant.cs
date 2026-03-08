using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace authproject.Models
{
    public class ChatParticipant
    {
        [Required]
        public string ChatId { get; set; } = string.Empty;
        
        [ForeignKey("ChatId")]
        public Chat? Chat { get; set; }

        [Required]
        public string UserId { get; set; } = string.Empty;

        [ForeignKey("UserId")]
        public User? User { get; set; }

        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

        // Could add LastReadMessageId here down the line 
    }
}
