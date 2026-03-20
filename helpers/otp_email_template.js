/**
 * Modern HTML email template for sending OTPs
 * @param {string} otp - The OTP code to include in the email
 * @returns {string} - The HTML string for the email
 */
const otpEmailTemplate = (otp) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset OTP</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #f4f7f6;
        margin: 0;
        padding: 0;
        color: #333;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        background: #ffffff;
        padding: 40px;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.05);
      }
      .header {
        text-align: center;
        margin-bottom: 30px;
      }
      .header h1 {
        color: #007bff;
        font-size: 28px;
        margin: 0;
        font-weight: 700;
      }
      .content {
        text-align: center;
        line-height: 1.6;
      }
      .otp-container {
        margin: 35px 0;
        padding: 20px;
        background-color: #f8f9fa;
        border: 2px dashed #007bff;
        border-radius: 8px;
        display: inline-block;
      }
      .otp-code {
        font-size: 42px;
        font-weight: 800;
        color: #007bff;
        letter-spacing: 10px;
        margin: 0;
      }
      .footer {
        margin-top: 40px;
        text-align: center;
        font-size: 13px;
        color: #888;
        border-top: 1px solid #eee;
        padding-top: 25px;
      }
      .footer p {
        margin: 5px 0;
      }
      .brand {
        font-weight: 600;
        color: #555;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Verify Your Identity</h1>
      </div>
      <div class="content">
        <p>Hello,</p>
        <p>You requested a password reset for your <strong>ECOMMERCE SHOP</strong> account. Use the code below to complete the process. This code is valid for 10 minutes.</p>
        <div class="otp-container">
          <p class="otp-code">${otp}</p>
        </div>
        <p>If you didn't request this, you can safely ignore this email.</p>
      </div>
      <div class="footer">
        <p class="brand">ECOMMERCE SHOP APP</p>
        <p>&copy; ${new Date().getFullYear()} Ecommerce Shop. All rights reserved.</p>
        <p>Need help? <a href="mailto:support@ecommerceshop.com" style="color: #007bff; text-decoration: none;">Contact Support</a></p>
      </div>
    </div>
  </body>
  </html>
  `;
};

module.exports = otpEmailTemplate;
