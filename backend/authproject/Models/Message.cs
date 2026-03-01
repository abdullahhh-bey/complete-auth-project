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
        [EmailAddress(ErrorMessage = "Email should be valid.")]
        public string SenderEmail { get; set; } = string.Empty;

        [Required]
        public string Content { get; set; } = string.Empty;

        public DateTime SentAt { get; set; } = DateTime.UtcNow;

        // Nullable ReceiverId for private messages. If null, it's a global message.
        public string? ReceiverId { get; set; }
        //to link the user model to the message table ( 1 to many )
        [ForeignKey("SenderId")]
        public User? User { get; set; }
    }
}
