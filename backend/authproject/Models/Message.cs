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
        public int SenderId { get; set; }

        [Required]
        public string SenderFullName { get; set; } = string.Empty;

        [Required]
        [EmailAddress(ErrorMessage = "Email should be valid.")]
        public string SenderEmail { get; set; } = string.Empty;

        [Required]
        public string Content { get; set; } = string.Empty;

        public DateTime SentAt { get; set; } = DateTime.UtcNow;

        // Optional: If you want to link it directly to your User model
        [ForeignKey("SenderId")]
        public User? User { get; set; }
    }
}
