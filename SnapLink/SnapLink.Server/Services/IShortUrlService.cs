using SnapLink.Server.DTOs;

namespace SnapLink.Server.Services;

public interface IShortUrlService
{
    Task<ShortUrlResponse> CreateShortUrlAsync(CreateShortUrlRequest request);
}