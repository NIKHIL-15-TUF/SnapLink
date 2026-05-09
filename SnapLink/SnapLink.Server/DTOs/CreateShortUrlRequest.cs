using System.ComponentModel.DataAnnotations;

namespace SnapLink.Server.DTOs
{
    public class CreateShortUrlRequest
    {
        [Required]
        [Url]
        public string OriginalUrl { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? CustomAlias { get; set; }

        public DateTime? ExpiresAt { get; set; }
    }
}
