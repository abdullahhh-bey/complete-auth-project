using System.ComponentModel.DataAnnotations;

//Our first model after break
namespace authproject.Models
{
    public class User
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [EmailAddress(ErrorMessage = "Must be a valid email address.")]
        public string Email { get; set; } = string.Empty;

        [Required]
        [StringLength(100, MinimumLength = 8, ErrorMessage = "Password must be between 8 and 100 characters.")]
        public string PasswordHash { get; set; } = string.Empty;

        public string? ResetToken { get; set; }

        public DateTime? ResetTokenExpiry { get; set; }

    }
}
