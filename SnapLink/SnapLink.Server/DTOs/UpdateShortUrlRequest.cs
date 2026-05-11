using System.ComponentModel.DataAnnotations;

namespace SnapLink.Server.DTOs;

public class UpdateShortUrlRequest
{
    [Required]
    [Url]
    public string OriginalUrl { get; set; } = string.Empty;

    public string? CustomAlias { get; set; }

    public DateTime? ExpiresAt { get; set; }
}