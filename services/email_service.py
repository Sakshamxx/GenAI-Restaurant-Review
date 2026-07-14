"""
ReviewFlow AI — Email Notification Service

Sends email alerts to restaurant owners when a customer submits negative feedback.
Uses the Resend API. Configure Email_API_Key in .env
"""

import os
import resend
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Clean up email key if needed
api_key = os.getenv("Email_API_Key")
if api_key:
    api_key = api_key.strip('"').strip("'").strip("”").strip("“")

resend.api_key = api_key


def send_feedback_notification(
    restaurant_name: str,
    rating: str,
    feedback_message: str,
    owner_email: str,
) -> bool:
    """
    Send an email notification to the restaurant owner when negative feedback is submitted.

    Args:
        restaurant_name: Name of the restaurant
        rating: Rating given by the customer (e.g. "Food: 2/5, Service: 3/5, Ambience: 1/5")
        feedback_message: The customer's feedback message
        owner_email: Email address of the restaurant owner (restaurant.owner_email)

    Returns:
        True if email sent successfully, False otherwise
    """
    if not api_key:
        print("[email_service] Error: Resend Email_API_Key is not configured.")
        return False

    timestamp = datetime.now().strftime("%B %d, %Y at %I:%M %p")

    html_body = f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed,#4c1d95);padding:28px 32px;">
              <p style="margin:0;color:#ddd6fe;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">ReviewFlow AI</p>
              <h1 style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:700;">⚠️ New Negative Feedback</h1>
              <p style="margin:6px 0 0;color:#c4b5fd;font-size:13px;">Customer submitted private feedback for {restaurant_name}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 32px;">
              
              <!-- Meta Info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:12px;padding:0;overflow:hidden;margin-bottom:20px;border:1px solid #334155;">
                <tr>
                  <td style="padding:14px 20px;border-bottom:1px solid #1e293b;">
                    <span style="color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Restaurant</span><br>
                    <span style="color:#f1f5f9;font-size:15px;font-weight:600;">{restaurant_name}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 20px;border-bottom:1px solid #1e293b;">
                    <span style="color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Customer Ratings</span><br>
                    <span style="color:#f1f5f9;font-size:15px;font-weight:600;">{rating}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 20px;">
                    <span style="color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Submitted At</span><br>
                    <span style="color:#f1f5f9;font-size:15px;font-weight:600;">{timestamp}</span>
                  </td>
                </tr>
              </table>

              <!-- Feedback Message -->
              <div style="background:#0f172a;border-radius:12px;padding:20px;border:1px solid #334155;border-left:4px solid #ef4444;">
                <p style="margin:0 0 8px;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Customer Message</p>
                <p style="margin:0;color:#e2e8f0;font-size:14px;line-height:1.7;">{feedback_message}</p>
              </div>

              <!-- Action Note -->
              <p style="margin:20px 0 0;color:#64748b;font-size:12px;line-height:1.6;">
                This feedback was submitted privately and was NOT posted publicly. 
                Please review and follow up with your team as appropriate.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0f172a;padding:16px 32px;border-top:1px solid #1e293b;">
              <p style="margin:0;color:#475569;font-size:11px;text-align:center;">
                Sent by ReviewFlow AI · Automated Feedback Alert System
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    try:
        # Standard sandbox alerts email setup
        result = resend.Emails.send({
            "from": "ReviewFlow AI <alerts@reviewflow.ai>",
            "to": [owner_email],
            "subject": "New Negative Feedback Received",
            "html": html_body,
        })
        print(f"[email_service] Email sent successfully to {owner_email}: {result}")
        return True
    except Exception as e:
        print(f"[email_service] Failed to send email: {e}")
        return False
