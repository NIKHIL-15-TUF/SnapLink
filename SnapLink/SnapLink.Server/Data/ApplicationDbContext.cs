using Microsoft.EntityFrameworkCore;
using SnapLink.Server.Models;

namespace SnapLink.Server.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<ShortUrl> ShortUrls => Set<ShortUrl>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ShortUrl>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.OriginalUrl)
                  .IsRequired();

            entity.Property(e => e.ShortCode)
                  .IsRequired()
                  .HasMaxLength(20);

            entity.HasIndex(e => e.ShortCode)
                  .IsUnique();

            entity.Property(e => e.CustomAlias)
                  .HasMaxLength(50);
        });
    }
}