namespace SnapLink.Server.Models;

public class ShortUrl
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string OriginalUrl { get; set; } = string.Empty;

    public string ShortCode { get; set; } = string.Empty;

    public string? CustomAlias { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ExpiresAt { get; set; }

    public bool IsActive { get; set; } = true;

    public int ClickCount { get; set; } = 0;
}