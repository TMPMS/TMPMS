using System.ComponentModel.DataAnnotations;

namespace TMPMS.DTOs
{
    public class UpdateProfileDTO
    {
        [Required]
        [MaxLength(100)]
        public string Username { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [Phone]
        public string Phone { get; set; } = string.Empty;
    }
}
