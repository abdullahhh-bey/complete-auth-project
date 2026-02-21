using authproject.Data;
using authproject.DTOs;
using authproject.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace authproject.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class authController : ControllerBase
    {
        private readonly AuthDbContext _context;
        private readonly TokenService _tokenservice;

        public authController(AuthDbContext context, TokenService tokenservice)
        {
            _context = context;
            _tokenservice = tokenservice;
        }   


       [HttpGet]
       public IActionResult GetUsers()
       {
            var users = _context.Consumers.ToList();
            if ( users.Count == 0)
            {
                return NotFound("No users yet");
            }
            return Ok(users);
       }


        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterDTO dto)
        {
            //password confirmatrion
            if(dto.Password != dto.ConfirmPassword)
            {
                return BadRequest("Passwords do not match");
            }

            //user email check
            var userCheck = _context.Consumers.FirstOrDefault(u => u.Email == dto.Email);
            if(userCheck != null)
            {
                return BadRequest("Email already exists");
            }

            //add the user
            var user = new User
            {
                FullName = dto.FullName,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password) 
            };

            _context.Consumers.Add(user);
            await _context.SaveChangesAsync();

            //return response
            return Ok("User registered successfully");
        }



        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDTO dto)
        {
            //check for email 
            var user = _context.Consumers
                .FirstOrDefault(x => x.Email == dto.Email);

            if (user == null)
                return BadRequest("Invalid credentials ( No user with this email )");

            //decrypt and compare password hashes
            bool isPasswordValid = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);

            if (!isPasswordValid)
                return BadRequest("Invalid credentials");

            //if matches, generate token 
            var token = _tokenservice.CreateToken(user);


            //return response
            return Ok(new ResponseTokenDTO
            {
                message = "Login successful",
                Token = token
            });
        }



    }
}
