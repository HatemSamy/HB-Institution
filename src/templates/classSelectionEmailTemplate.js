/**
 * Class selection confirmation email template
 */

export const generateClassSelectionEmailTemplate = (studentName, courseTitle, instructorName, level, groupCode, schedule, status) => {
  const scheduleItems = schedule.map(s => 
    `<li style="margin: 8px 0; padding: 8px; background: #f8f9fa; border-radius: 4px;">
      <strong>${s.dayOfWeek}:</strong> ${s.startTime} - ${s.endTime} 
      <span style="color: #666; font-size: 14px;">(${s.timezone})</span>
    </li>`
  ).join('');

  const statusColor = status === 'confirmed' ? '#4caf50' : status === 'pending' ? '#ff9800' : '#f44336';
  const statusIcon = status === 'confirmed' ? '✅' : status === 'pending' ? '⏳' : '❌';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Class Selection Confirmation - HB Institution</title>
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
            background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
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
        
        .confirmation-message {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .confirmation-message h2 {
            color: #333;
            font-size: 24px;
            margin-bottom: 15px;
        }
        
        .confirmation-message p {
            color: #666;
            font-size: 16px;
            line-height: 1.6;
        }
        
        .status-badge {
            display: inline-block;
            background-color: ${statusColor};
            color: white;
            padding: 8px 20px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: 600;
            margin: 20px 0;
        }
        
        .course-details {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 30px;
            margin: 30px 0;
        }
        
        .course-details h3 {
            color: #333;
            font-size: 20px;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .detail-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .detail-item:last-child {
            border-bottom: none;
        }
        
        .detail-label {
            font-weight: 600;
            color: #555;
            flex: 1;
        }
        
        .detail-value {
            color: #333;
            flex: 2;
            text-align: right;
        }
        
        .schedule-section {
            margin: 30px 0;
        }
        
        .schedule-section h4 {
            color: #333;
            font-size: 18px;
            margin-bottom: 15px;
            text-align: center;
        }
        
        .schedule-list {
            list-style: none;
            padding: 0;
        }
        
        .schedule-list li {
            margin: 8px 0;
            padding: 12px;
            background: #f8f9fa;
            border-radius: 6px;
            border-left: 4px solid #4caf50;
        }
        
        .next-steps {
            background-color: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 20px;
            margin: 30px 0;
            border-radius: 4px;
        }
        
        .next-steps h3 {
            color: #1976d2;
            font-size: 18px;
            margin-bottom: 15px;
        }
        
        .next-steps ul {
            color: #555;
            padding-left: 20px;
        }
        
        .next-steps li {
            margin: 8px 0;
            line-height: 1.5;
        }
        
        .contact-info {
            background-color: #fff3e0;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
            text-align: center;
        }
        
        .contact-info h4 {
            color: #f57c00;
            margin-bottom: 10px;
        }
        
        .contact-info p {
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
            color: #4caf50;
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
            
            .confirmation-message h2 {
                font-size: 20px;
            }
            
            .course-details {
                padding: 20px;
            }
            
            .detail-item {
                flex-direction: column;
                align-items: flex-start;
                gap: 5px;
            }
            
            .detail-value {
                text-align: left;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <h1>📚 HB Institution</h1>
            <p>Class Selection Confirmation</p>
        </div>
        
        <!-- Main Content -->
        <div class="content">
            <div class="confirmation-message">
                <h2>Congratulations, ${studentName}! 🎉</h2>
                <p>Your class selection has been successfully processed.</p>
                <div class="status-badge">
                    ${statusIcon} Status: ${status.charAt(0).toUpperCase() + status.slice(1)}
                </div>
            </div>
            
            <div class="course-details">
                <h3>📖 Course Details</h3>
                
                <div class="detail-item">
                    <span class="detail-label">📚 Course:</span>
                    <span class="detail-value"><strong>${courseTitle}</strong></span>
                </div>
                
                <div class="detail-item">
                    <span class="detail-label">👨‍🏫 Instructor:</span>
                    <span class="detail-value">${instructorName}</span>
                </div>
                
                <div class="detail-item">
                    <span class="detail-label">📊 Level:</span>
                    <span class="detail-value">${level}</span>
                </div>
                
                <div class="detail-item">
                    <span class="detail-label">👥 Group Code:</span>
                    <span class="detail-value"><strong>${groupCode}</strong></span>
                </div>
            </div>
            
            <div class="schedule-section">
                <h4>🗓️ Class Schedule</h4>
                <ul class="schedule-list">
                    ${scheduleItems}
                </ul>
            </div>
            
            <div class="next-steps">
                <h3>🚀 What's Next?</h3>
                <ul>
                    <li><strong>Check your dashboard</strong> for course materials and updates</li>
                    <li><strong>Join the first class</strong> according to the schedule above</li>
                    <li><strong>Prepare any required materials</strong> as specified by your instructor</li>
                    <li><strong>Set up notifications</strong> to receive meeting reminders</li>
                </ul>
            </div>
            
            <div class="contact-info">
                <h4>📞 Need Help?</h4>
                <p>
                    If you have any questions about your class selection or need assistance, 
                    please contact our support team at 
                    <a href="mailto:support@hb-institution.com" style="color: #f57c00;">support@hb-institution.com</a>
                </p>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p><strong>HB Institution</strong></p>
            <p>Empowering minds, shaping futures</p>
            <p>
                Visit your dashboard: 
                <a href="${process.env.FRONTEND_URL || '#'}">Student Portal</a>
            </p>
            
            <p style="font-size: 12px; margin-top: 20px; opacity: 0.6;">
                © 2024 HB Institution. All rights reserved.<br>
                This email confirms your class selection.
            </p>
        </div>
    </div>
</body>
</html>
  `;
};
