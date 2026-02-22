using authproject.Application.EmailService;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

public class EmailService : IEmailService
{
    private readonly EmailSettings _emailSettings;

    public EmailService(IConfiguration configuration)
    {
        _emailSettings = configuration
            .GetSection("EmailSettings")
            .Get<EmailSettings>();
    }

    public async Task SendEmailAsync(string to, string subject, string body)
    {
        var email = new MimeMessage();

        email.From.Add(new MailboxAddress(
            _emailSettings.FromName,
            _emailSettings.Email
        ));

        email.To.Add(MailboxAddress.Parse(to));

        email.Subject = subject;

        email.Body = new TextPart("html")
        {
            Text = body
        };

        using var smtp = new SmtpClient();

        await smtp.ConnectAsync(
            _emailSettings.Host,
            _emailSettings.Port,
            SecureSocketOptions.StartTls
        );

        await smtp.AuthenticateAsync(
            _emailSettings.Email,
            _emailSettings.Password
        );

        await smtp.SendAsync(email);

        await smtp.DisconnectAsync(true);
    }
}