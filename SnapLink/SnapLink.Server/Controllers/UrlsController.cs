using Microsoft.AspNetCore.Mvc;
using SnapLink.Server.DTOs;
using SnapLink.Server.Services;

namespace SnapLink.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UrlsController : ControllerBase
{
    private readonly IShortUrlService _shortUrlService;

    public UrlsController(IShortUrlService shortUrlService)
    {
        _shortUrlService = shortUrlService;
    }

    [HttpPost]
    public async Task<ActionResult<ShortUrlResponse>> Create(
        CreateShortUrlRequest request)
    {
        try
        {
            var result = await _shortUrlService.CreateShortUrlAsync(request);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}