using System.ComponentModel.DataAnnotations;

namespace authproject.DTOs
{
    public class ForgotPassDTO
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
    }
}
