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

    // FIX: static shared Random — creating new Random() in a loop produces
    // identical seeds (same timestamp), causing duplicate short codes.
    private static readonly Random _random = new();

    public ShortUrlService(
        ApplicationDbContext context,
        IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<ShortUrlResponse> CreateShortUrlAsync(CreateShortUrlRequest request)
    {
        var userId = GetCurrentUserId();
        var baseUrl = GetBaseUrl();

        var existingUrl = await _context.ShortUrls
            .FirstOrDefaultAsync(x =>
                x.OriginalUrl == request.OriginalUrl &&
                x.UserId == userId &&
                x.IsActive);

        if (existingUrl != null)
        {
            return MapToResponse(existingUrl, baseUrl);
        }

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

        var entity = new ShortUrl
        {
            OriginalUrl = request.OriginalUrl,
            ShortCode = shortCode,
            CustomAlias = request.CustomAlias,
            ExpiresAt = request.ExpiresAt,
            UserId = userId
        };

        _context.ShortUrls.Add(entity);
        await _context.SaveChangesAsync();

        return MapToResponse(entity, baseUrl);
    }

    public async Task<string?> GetOriginalUrlAsync(string shortCode)
    {
        var shortUrl = await _context.ShortUrls
            .FirstOrDefaultAsync(x => x.ShortCode == shortCode && x.IsActive);

        if (shortUrl == null)
            return null;

        if (shortUrl.ExpiresAt.HasValue && shortUrl.ExpiresAt.Value < DateTime.UtcNow)
            return null;

        shortUrl.ClickCount++;
        await _context.SaveChangesAsync();

        return shortUrl.OriginalUrl;
    }

    public async Task<List<ShortUrlResponse>> GetAllAsync()
    {
        var userId = GetCurrentUserId();
        var baseUrl = GetBaseUrl();

        // FIX: The original code had TWO bugs:
        // 1. It fetched user-filtered URLs into a local variable, then ignored
        //    it and ran a SECOND query with NO user/active filter — leaking
        //    every user's links to the caller.
        // 2. The second query tried to use string interpolation (baseUrl) inside
        //    an EF Core .Select() — EF cannot translate that to SQL and throws.
        // Solution: single filtered query, map to DTOs in memory.
        var urls = await _context.ShortUrls
            .Where(x => x.UserId == userId && x.IsActive)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();

        return urls.Select(x => MapToResponse(x, baseUrl)).ToList();
    }

    public async Task<ShortUrlResponse> UpdateAsync(Guid id, UpdateShortUrlRequest request)
    {
        var userId = GetCurrentUserId();

        var url = await _context.ShortUrls
            .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId && x.IsActive);

        if (url == null)
            throw new KeyNotFoundException("URL not found.");

        if (!string.IsNullOrWhiteSpace(request.CustomAlias) &&
            request.CustomAlias != url.ShortCode)
        {
            var aliasExists = await _context.ShortUrls
                .AnyAsync(x => x.ShortCode == request.CustomAlias && x.Id != id);

            if (aliasExists)
                throw new InvalidOperationException("Custom alias already exists.");

            url.ShortCode = request.CustomAlias;
            url.CustomAlias = request.CustomAlias;
        }

        if (string.IsNullOrWhiteSpace(request.CustomAlias) &&
            !string.IsNullOrWhiteSpace(url.CustomAlias))
        {
            url.ShortCode = await GenerateUniqueShortCodeAsync();
            url.CustomAlias = null;
        }

        url.OriginalUrl = request.OriginalUrl;
        url.ExpiresAt = request.ExpiresAt;

        await _context.SaveChangesAsync();

        return MapToResponse(url, GetBaseUrl());
    }

    public async Task DeleteAsync(Guid id)
    {
        var userId = GetCurrentUserId();

        var url = await _context.ShortUrls
            .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId && x.IsActive);

        if (url == null)
            throw new KeyNotFoundException("URL not found.");

        url.IsActive = false;
        await _context.SaveChangesAsync();
    }

    // --- Helpers ---

    private static ShortUrlResponse MapToResponse(ShortUrl url, string baseUrl) =>
        new ShortUrlResponse
        {
            Id = url.Id,
            OriginalUrl = url.OriginalUrl,
            ShortCode = url.ShortCode,
            // FIX: short URLs must route through /r/{code} to hit RedirectController
            ShortUrl = $"{baseUrl}/r/{url.ShortCode}",
            CreatedAt = url.CreatedAt,
            ClickCount = url.ClickCount
        };

    private string GetBaseUrl()
    {
        var req = _httpContextAccessor.HttpContext!.Request;
        return $"{req.Scheme}://{req.Host}";
    }

    private string GetCurrentUserId()
    {
        var userId = _httpContextAccessor.HttpContext?
            .User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
            throw new UnauthorizedAccessException("User not authenticated.");

        return userId;
    }

    private async Task<string> GenerateUniqueShortCodeAsync()
    {
        string code;
        do { code = GenerateShortCode(); }
        while (await _context.ShortUrls.AnyAsync(x => x.ShortCode == code));
        return code;
    }

    private static string GenerateShortCode(int length = 6)
    {
        return new string(
            Enumerable.Range(0, length)
                .Select(_ => Base62Chars[_random.Next(Base62Chars.Length)])
                .ToArray());
    }
}
