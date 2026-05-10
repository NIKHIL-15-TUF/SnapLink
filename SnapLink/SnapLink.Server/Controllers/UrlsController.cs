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
        var result = await _shortUrlService.CreateShortUrlAsync(request);
        return Ok(result);
    }

    [HttpGet]
    public async Task<ActionResult<List<ShortUrlResponse>>> GetAll()
    {
        var result = await _shortUrlService.GetAllAsync();
        return Ok(result);
    }
}