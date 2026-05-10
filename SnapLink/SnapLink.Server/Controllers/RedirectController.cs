using Microsoft.AspNetCore.Mvc;
using SnapLink.Server.Services;

namespace SnapLink.Server.Controllers;

[ApiController]
public class RedirectController : ControllerBase
{
    private readonly IShortUrlService _shortUrlService;

    public RedirectController(IShortUrlService shortUrlService)
    {
        _shortUrlService = shortUrlService;
    }

    [HttpGet("{shortCode}")]
    public async Task<IActionResult> RedirectToOriginal(string shortCode)
    {
        var originalUrl =
            await _shortUrlService.GetOriginalUrlAsync(shortCode);

        if (originalUrl == null)
            return NotFound("Short URL not found.");

        return Redirect(originalUrl);
    }
}