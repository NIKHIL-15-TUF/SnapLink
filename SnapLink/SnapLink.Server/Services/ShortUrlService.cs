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

        // Check if the URL already exists
        var existingUrl = await _context.ShortUrls
            .FirstOrDefaultAsync(x =>
                x.OriginalUrl == request.OriginalUrl &&
                x.IsActive);

        // Build base URL only once
        var httpRequest = _httpContextAccessor.HttpContext!.Request;
        var baseUrl = $"{httpRequest.Scheme}://{httpRequest.Host}";

        // If URL already exists, return existing short URL
        if (existingUrl != null)
        {
            return new ShortUrlResponse
            {
                Id = existingUrl.Id,
                OriginalUrl = existingUrl.OriginalUrl,
                ShortCode = existingUrl.ShortCode,
                ShortUrl = $"{baseUrl}/{existingUrl.ShortCode}",
                CreatedAt = existingUrl.CreatedAt,
                ClickCount = existingUrl.ClickCount
            };
        }

        // Handle custom alias
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
            // Generate random short code
            shortCode = await GenerateUniqueShortCodeAsync();
        }

        // Create new entity
        var shortUrlEntity = new ShortUrl
        {
            OriginalUrl = request.OriginalUrl,
            ShortCode = shortCode,
            CustomAlias = request.CustomAlias,
            ExpiresAt = request.ExpiresAt
        };

        // Save to database
        _context.ShortUrls.Add(shortUrlEntity);
        await _context.SaveChangesAsync();

        // Return response
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
    public async Task<string?> GetOriginalUrlAsync(string shortCode)
    {
        var shortUrl = await _context.ShortUrls
            .FirstOrDefaultAsync(x => x.ShortCode == shortCode && x.IsActive);

        if (shortUrl == null)
            return null;

        if (shortUrl.ExpiresAt.HasValue &&
            shortUrl.ExpiresAt.Value < DateTime.UtcNow)
        {
            return null;
        }

        shortUrl.ClickCount++;
        await _context.SaveChangesAsync();

        return shortUrl.OriginalUrl;
    }
    public async Task<List<ShortUrlResponse>> GetAllAsync()
    {
        var request = _httpContextAccessor.HttpContext!.Request;
        var baseUrl = $"{request.Scheme}://{request.Host}";

        return await _context.ShortUrls
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new ShortUrlResponse
            {
                Id = x.Id,
                OriginalUrl = x.OriginalUrl,
                ShortCode = x.ShortCode,
                ShortUrl = $"{baseUrl}/{x.ShortCode}",
                CreatedAt = x.CreatedAt,
                ClickCount = x.ClickCount
            })
            .ToListAsync();
    }
}