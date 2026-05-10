using Microsoft.EntityFrameworkCore;
using SnapLink.Server.Data;
using SnapLink.Server.DTOs;
using SnapLink.Server.Models;

namespace SnapLink.Server.Services;

public class ShortUrlService : IShortUrlService
{
    private readonly ApplicationDbContext _context;
    private readonly IHttpContextAccessor _httpContextAccessor;

    private const string Base62Chars =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    public ShortUrlService(
        ApplicationDbContext context,
        IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<ShortUrlResponse> CreateShortUrlAsync(
        CreateShortUrlRequest request)
    {
        string shortCode;

        if (!string.IsNullOrWhiteSpace(request.CustomAlias))
        {
            var aliasExists = await _context.ShortUrls
                .AnyAsync(x => x.ShortCode == request.CustomAlias);

            if (aliasExists)
                throw new InvalidOperationException("Custom alias already exists.");

            shortCode = request.CustomAlias;
        }
        else
        {
            shortCode = await GenerateUniqueShortCodeAsync();
        }

        var shortUrlEntity = new ShortUrl
        {
            OriginalUrl = request.OriginalUrl,
            ShortCode = shortCode,
            CustomAlias = request.CustomAlias,
            ExpiresAt = request.ExpiresAt
        };

        _context.ShortUrls.Add(shortUrlEntity);
        await _context.SaveChangesAsync();

        var requestContext = _httpContextAccessor.HttpContext!.Request;
        var baseUrl = $"{requestContext.Scheme}://{requestContext.Host}";

        return new ShortUrlResponse
        {
            Id = shortUrlEntity.Id,
            OriginalUrl = shortUrlEntity.OriginalUrl,
            ShortCode = shortUrlEntity.ShortCode,
            ShortUrl = $"{baseUrl}/{shortUrlEntity.ShortCode}",
            CreatedAt = shortUrlEntity.CreatedAt,
            ClickCount = shortUrlEntity.ClickCount
        };
    }

    private async Task<string> GenerateUniqueShortCodeAsync()
    {
        string code;

        do
        {
            code = GenerateShortCode();
        }
        while (await _context.ShortUrls.AnyAsync(x => x.ShortCode == code));

        return code;
    }

    private static string GenerateShortCode(int length = 6)
    {
        var random = new Random();

        return new string(
            Enumerable.Range(0, length)
                .Select(_ => Base62Chars[random.Next(Base62Chars.Length)])
                .ToArray());
    }
}