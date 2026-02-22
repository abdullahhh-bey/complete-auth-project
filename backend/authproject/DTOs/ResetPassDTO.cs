using System.ComponentModel.DataAnnotations;

namespace authproject.DTOs
{
    public class ResetPassDTO
    {
        [Required]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string ResetToken { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;

    }
}
