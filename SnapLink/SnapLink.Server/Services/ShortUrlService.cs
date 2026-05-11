using Microsoft.EntityFrameworkCore;
using SnapLink.Server.Data;
using SnapLink.Server.DTOs;
using SnapLink.Server.Models;
using System.Security.Claims;

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
        // Get current logged-in user
        var userId = GetCurrentUserId();

        string shortCode;

        // Check if this user has already shortened the same URL
        var existingUrl = await _context.ShortUrls
            .FirstOrDefaultAsync(x =>
                x.OriginalUrl == request.OriginalUrl &&
                x.UserId == userId &&
                x.IsActive);

        // Build base URL once
        var httpRequest = _httpContextAccessor.HttpContext!.Request;
        var baseUrl = $"{httpRequest.Scheme}://{httpRequest.Host}";

        // If URL already exists for this user, return it
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
            // Generate unique random short code
            shortCode = await GenerateUniqueShortCodeAsync();
        }

        // Create new entity
        var shortUrlEntity = new ShortUrl
        {
            OriginalUrl = request.OriginalUrl,
            ShortCode = shortCode,
            CustomAlias = request.CustomAlias,
            ExpiresAt = request.ExpiresAt,
            UserId = userId
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
        var userId = GetCurrentUserId();

        var urls = await _context.ShortUrls
        .Where(x => x.UserId == userId && x.IsActive)
        .OrderByDescending(x => x.CreatedAt)
        .ToListAsync();


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
    private string GetCurrentUserId()
    {
        var userId = _httpContextAccessor.HttpContext?
            .User
            .FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
            throw new UnauthorizedAccessException("User not authenticated.");

        return userId;
    }
    // Add these methods to ShortUrlService.cs

    public async Task<ShortUrlResponse> UpdateAsync(
        Guid id,
        UpdateShortUrlRequest request)
    {
        var userId = GetCurrentUserId();

        var url = await _context.ShortUrls
            .FirstOrDefaultAsync(x =>
                x.Id == id &&
                x.UserId == userId &&
                x.IsActive);

        if (url == null)
            throw new KeyNotFoundException("URL not found.");

        // If custom alias is changed, ensure uniqueness
        if (!string.IsNullOrWhiteSpace(request.CustomAlias) &&
            request.CustomAlias != url.ShortCode)
        {
            var aliasExists = await _context.ShortUrls
                .AnyAsync(x =>
                    x.ShortCode == request.CustomAlias &&
                    x.Id != id);

            if (aliasExists)
                throw new InvalidOperationException(
                    "Custom alias already exists.");

            url.ShortCode = request.CustomAlias;
            url.CustomAlias = request.CustomAlias;
        }

        // If custom alias is cleared, generate a new short code
        if (string.IsNullOrWhiteSpace(request.CustomAlias) &&
            !string.IsNullOrWhiteSpace(url.CustomAlias))
        {
            url.ShortCode = await GenerateUniqueShortCodeAsync();
            url.CustomAlias = null;
        }

        // Update remaining fields
        url.OriginalUrl = request.OriginalUrl;
        url.ExpiresAt = request.ExpiresAt;

        await _context.SaveChangesAsync();

        var httpRequest = _httpContextAccessor.HttpContext!.Request;
        var baseUrl = $"{httpRequest.Scheme}://{httpRequest.Host}";

        return new ShortUrlResponse
        {
            Id = url.Id,
            OriginalUrl = url.OriginalUrl,
            ShortCode = url.ShortCode,
            ShortUrl = $"{baseUrl}/{url.ShortCode}",
            CreatedAt = url.CreatedAt,
            ClickCount = url.ClickCount
        };
    }

    public async Task DeleteAsync(Guid id)
    {
        var userId = GetCurrentUserId();

        var url = await _context.ShortUrls
            .FirstOrDefaultAsync(x =>
                x.Id == id &&
                x.UserId == userId &&
                x.IsActive);

        if (url == null)
            throw new KeyNotFoundException("URL not found.");

        // Soft delete
        url.IsActive = false;

        await _context.SaveChangesAsync();
    }
}