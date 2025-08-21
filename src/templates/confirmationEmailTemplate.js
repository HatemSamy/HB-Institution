/**
 * Email confirmation template for new user registration
 */

export const generateConfirmationEmailTemplate = (userName, confirmationLink) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirm Your Email - HB Institution</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
            font-weight: 600;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .welcome-message {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .welcome-message h2 {
            color: #333;
            font-size: 24px;
            margin-bottom: 15px;
        }
        
        .welcome-message p {
            color: #666;
            font-size: 16px;
            line-height: 1.6;
        }
        
        .confirmation-section {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
        }
        
        .confirmation-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 15px 40px;
            border-radius: 50px;
            font-size: 16px;
            font-weight: 600;
            transition: transform 0.2s ease;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        
        .confirmation-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
        }
        
        .info-box {
            background-color: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 20px;
            margin: 30px 0;
            border-radius: 4px;
        }
        
        .info-box h3 {
            color: #1976d2;
            font-size: 18px;
            margin-bottom: 10px;
        }
        
        .info-box p {
            color: #555;
            font-size: 14px;
            line-height: 1.5;
        }
        
        .features {
            margin: 30px 0;
        }
        
        .features h3 {
            color: #333;
            font-size: 20px;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .feature-list {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            justify-content: center;
        }
        
        .feature-item {
            flex: 1;
            min-width: 200px;
            text-align: center;
            padding: 20px;
            background-color: #f8f9fa;
            border-radius: 8px;
        }
        
        .feature-icon {
            font-size: 30px;
            margin-bottom: 10px;
        }
        
        .feature-item h4 {
            color: #333;
            font-size: 16px;
            margin-bottom: 8px;
        }
        
        .feature-item p {
            color: #666;
            font-size: 14px;
        }
        
        .footer {
            background-color: #333;
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .footer p {
            margin-bottom: 10px;
            opacity: 0.8;
        }
        
        .footer a {
            color: #667eea;
            text-decoration: none;
        }
        
        .social-links {
            margin-top: 20px;
        }
        
        .social-links a {
            display: inline-block;
            margin: 0 10px;
            color: #667eea;
            font-size: 20px;
            text-decoration: none;
        }
        
        @media (max-width: 600px) {
            .email-container {
                margin: 10px;
                border-radius: 5px;
            }
            
            .header, .content, .footer {
                padding: 20px;
            }
            
            .header h1 {
                font-size: 24px;
            }
            
            .welcome-message h2 {
                font-size: 20px;
            }
            
            .confirmation-section {
                padding: 20px;
            }
            
            .confirmation-button {
                padding: 12px 30px;
                font-size: 14px;
            }
            
            .feature-list {
                flex-direction: column;
            }
            
            .feature-item {
                min-width: auto;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <h1>🎓 HB Institution</h1>
            <p>Welcome to Your Learning Journey</p>
        </div>
        
        <!-- Main Content -->
        <div class="content">
            <div class="welcome-message">
                <h2>Welcome, ${userName}! 👋</h2>
                <p>Thank you for joining HB Institution. We're excited to have you as part of our learning community!</p>
            </div>
            
            <div class="confirmation-section">
                <h3 style="color: #333; margin-bottom: 15px;">📧 Confirm Your Email Address</h3>
                <p style="color: #666; margin-bottom: 25px;">
                    To get started and access all features, please confirm your email address by clicking the button below:
                </p>
                <a href="${confirmationLink}" class="confirmation-button">
                    ✅ Confirm Email Address
                </a>
            </div>
            
            <div class="info-box">
                <h3>🔒 Security Notice</h3>
                <p>
                    This confirmation link will expire in 24 hours for security reasons. 
                    If you didn't create an account with HB Institution, please ignore this email.
                </p>
            </div>
            
            <div class="features">
                <h3>What's Next? 🚀</h3>
                <div class="feature-list">
                    <div class="feature-item">
                        <div class="feature-icon">📚</div>
                        <h4>Access Courses</h4>
                        <p>Browse and enroll in our comprehensive course catalog</p>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">👨‍🏫</div>
                        <h4>Meet Instructors</h4>
                        <p>Connect with expert instructors and join live sessions</p>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">🎯</div>
                        <h4>Track Progress</h4>
                        <p>Monitor your learning journey and achievements</p>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p><strong>HB Institution</strong></p>
            <p>Empowering minds, shaping futures</p>
            <p>
                Need help? Contact us at 
                <a href="mailto:support@hb-institution.com">support@hb-institution.com</a>
            </p>
            
            <div class="social-links">
                <a href="#" title="Facebook">📘</a>
                <a href="#" title="Twitter">🐦</a>
                <a href="#" title="LinkedIn">💼</a>
                <a href="#" title="Instagram">📷</a>
            </div>
            
            <p style="font-size: 12px; margin-top: 20px; opacity: 0.6;">
                © 2024 HB Institution. All rights reserved.<br>
                This email was sent to confirm your registration.
            </p>
        </div>
    </div>
</body>
</html>
  `;
};
