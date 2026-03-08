using authproject.Data;
using authproject.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace authproject.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ChatController : ControllerBase
    {
        private readonly AuthDbContext _context;

        public ChatController(AuthDbContext context)
        {
            _context = context;
        }

        // DTO for creating a group
        public class CreateGroupRequest
        {
            public string Name { get; set; } = string.Empty;
            public List<string> UserIds { get; set; } = new();
        }

        // DTO for starting a private chat
        public class StartPrivateChatRequest
        {
            public string TargetUserId { get; set; } = string.Empty;
        }

        [HttpGet]
        public async Task<IActionResult> GetMyChats()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            // Fetch all chats where this user is a participant
            var chats = await _context.Chats
                .Include(c => c.Participants)
                .ThenInclude(p => p.User)
                .Where(c => c.Participants.Any(p => p.UserId == userId))
                .OrderByDescending(c => c.CreatedAt)
                .Select(c => new
                {
                    Id = c.Id,
                    Type = c.Type,
                    Name = c.Name,
                    AdminId = c.AdminId,
                    CreatedAt = c.CreatedAt,
                    // If it's a private chat, get the name of the *other* person.
                    // If it's a group chat, use the Group Name.
                    DisplayName = c.Type == 1 
                        ? (c.Participants.FirstOrDefault(p => p.UserId != userId)?.User?.FullName ?? "Unknown User")
                        : c.Name,
                    Participants = c.Participants.Select(p => new
                    {
                        UserId = p.UserId,
                        FullName = p.User!.FullName,
                        Email = p.User.Email
                    })
                })
                .ToListAsync();

            return Ok(chats);
        }

        [HttpPost("private")]
        public async Task<IActionResult> GetOrCreatePrivateChat([FromBody] StartPrivateChatRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            if (userId == request.TargetUserId)
                return BadRequest("Cannot create a private chat with yourself.");

            // Check if private chat already exists between these two specifically
            var existingChat = await _context.Chats
                .Include(c => c.Participants)
                .Where(c => c.Type == 1 && c.Participants.Count == 2)
                .FirstOrDefaultAsync(c => c.Participants.Any(p => p.UserId == userId) 
                                       && c.Participants.Any(p => p.UserId == request.TargetUserId));

            if (existingChat != null)
            {
                return Ok(new { ChatId = existingChat.Id });
            }

            // Create new private chat
            var newChat = new Chat
            {
                Type = 1,
                Participants = new List<ChatParticipant>
                {
                    new ChatParticipant { UserId = userId },
                    new ChatParticipant { UserId = request.TargetUserId }
                }
            };

            _context.Chats.Add(newChat);
            await _context.SaveChangesAsync();

            return Ok(new { ChatId = newChat.Id });
        }

        [HttpPost("group")]
        public async Task<IActionResult> CreateGroupChat([FromBody] CreateGroupRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest("Group name is required.");

            // Ensure the creator is in the group
            if (!request.UserIds.Contains(userId))
            {
                request.UserIds.Add(userId);
            }

            var newChat = new Chat
            {
                Type = 2,
                Name = request.Name,
                AdminId = userId,
                Participants = request.UserIds.Select(id => new ChatParticipant { UserId = id }).ToList()
            };

            _context.Chats.Add(newChat);
            await _context.SaveChangesAsync();

            return Ok(new { ChatId = newChat.Id, Name = newChat.Name });
        }
    }
}
