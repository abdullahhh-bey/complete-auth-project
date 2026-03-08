using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace authproject.Models
{
    public class Message
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string SenderId { get; set; } = string.Empty;

        [Required]
        public string SenderFullName { get; set; } = string.Empty;

        [Required]
        [EmailAddress(ErrorMessage = "Email shold be valid.")]
        public string SenderEmail { get; set; } = string.Empty;

        [Required]
        public string Content { get; set; } = string.Empty;

        public DateTime SentAt { get; set; } = DateTime.UtcNow;

        // Link to the unified Chat model (Nullable for Global Chat)
        public string? ChatId { get; set; }

        [ForeignKey("ChatId")]
        public Chat? Chat { get; set; }

        // Read receipt tracking
        public bool IsRead { get; set; } = false;
        public DateTime? ReadAt { get; set; }
        //to link the user model to the message table ( 1 to many )
        [ForeignKey("SenderId")]
        public User? User { get; set; }
    }
}
