namespace SnapLink.Server.DTOs
{
    public class ShortUrlResponse
    {
        public Guid Id { get; set; }

        public string OriginalUrl { get; set; } = string.Empty;

        public string ShortCode { get; set; } = string.Empty;

        public string ShortUrl { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }

        public int ClickCount { get; set; }
    }
}
