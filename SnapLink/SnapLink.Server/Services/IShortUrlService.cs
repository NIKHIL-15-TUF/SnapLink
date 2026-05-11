using SnapLink.Server.DTOs;

namespace SnapLink.Server.Services;

public interface IShortUrlService
{
    Task<ShortUrlResponse> CreateShortUrlAsync(CreateShortUrlRequest request);
    Task<string?> GetOriginalUrlAsync(string shortCode);
    Task<List<ShortUrlResponse>> GetAllAsync();

    Task<ShortUrlResponse> UpdateAsync(
        Guid id,
        UpdateShortUrlRequest request);

    Task DeleteAsync(Guid id);
}