import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter, createTransport } from 'nodemailer';
import { ConfigService } from '@nestjs/config';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private fromEmail: string;
  private fromName: string;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const secure = this.configService.get<string>('SMTP_SECURE', 'false') === 'true';
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    this.fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL', user);
    this.fromName = this.configService.get<string>('SMTP_FROM_NAME', 'FX Trading Platform');

    this.transporter = createTransport({
      host,
      port,
      secure, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });

    // Verify the connection configuration
    this.transporter.verify((error) => {
      if (error) {
        this.logger.error('SMTP connection error:', error);
      } else {
        this.logger.log('SMTP connection verified');
      }
    });
  }

  /**
   * Send an OTP email with retry logic
   * @param to Recipient email address
   * @param otp The OTP code to send
   * @param maxRetries Number of retry attempts (default: 2)
   * @param retryDelay Delay between retries in milliseconds (default: 5000ms)
   * @param timeoutPerAttempt Timeout per attempt in milliseconds (default: 10000ms)
   */
  async sendOTP(to: string, otp: string, maxRetries = 2, retryDelay = 5000, timeoutPerAttempt = 10000): Promise<void> {
    const html = this.generateOTPEmail(otp);
    const subject = 'Your OTP Code';
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await this.sendEmailWithTimeout({
          to,
          subject,
          html,
        }, timeoutPerAttempt);
        
        this.logger.log(`OTP email sent successfully to ${to} on attempt ${attempt + 1}`);
        return;
      } catch (error) {
        this.logger.error(`Email sending attempt ${attempt + 1} failed:`, error);
        
        if (attempt < maxRetries) {
          this.logger.log(`Retrying in ${retryDelay / 1000} seconds... (Attempt ${attempt + 1}/${maxRetries})`);
          await this.delay(retryDelay);
        } else {
          this.logger.error(`Failed to send OTP email to ${to} after ${maxRetries + 1} attempts`);
          // Don't throw the error to the caller, just log it as per requirements
          this.logger.error('Email sending failed but continuing operation as per requirements');
        }
      }
    }
  }

  /**
   * Send a generic email with retry logic
   */
  async sendEmail(options: EmailOptions, maxRetries = 2, retryDelay = 5000, timeoutPerAttempt = 10000): Promise<void> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await this.sendEmailWithTimeout(options, timeoutPerAttempt);
        return;
      } catch (error) {
        this.logger.error(`Email sending attempt ${attempt + 1} failed:`, error);
        
        if (attempt < maxRetries) {
          this.logger.log(`Retrying in ${retryDelay / 1000} seconds... (Attempt ${attempt + 1}/${maxRetries})`);
          await this.delay(retryDelay);
        } else {
          this.logger.error(`Failed to send email after ${maxRetries + 1} attempts`);
          // Don't throw, just log as per requirements
          this.logger.error('Email sending failed but continuing operation as per requirements');
        }
      }
    }
  }

  /**
   * Send email with timeout
   */
  private async sendEmailWithTimeout(options: EmailOptions, timeoutMs: number): Promise<void> {
    const { to, subject, html } = options;
    
    const mailOptions = {
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to,
      subject,
      html,
    };

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Email sending timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.transporter.sendMail(mailOptions, (error, info) => {
        clearTimeout(timeoutId);
        
        if (error) {
          reject(error);
        } else {
          this.logger.log(`Email sent: ${info.messageId}`);
          resolve();
        }
      });
    });
  }

  /**
   * Generate HTML email template for OTP
   */
  private generateOTPEmail(otp: string): string {
    const appName = this.configService.get<string>('APP_NAME', 'FX Trading Platform');
    const appUrl = this.configService.get<string>('APP_URL', 'https://trading.example.com');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your OTP Code</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .otp { 
            font-size: 32px; 
            font-weight: bold; 
            color: #4CAF50; 
            letter-spacing: 5px; 
            text-align: center;
            margin: 20px 0;
            padding: 15px;
            background: #f0f0f0;
            border-radius: 5px;
            font-family: monospace;
          }
          .footer { 
            margin-top: 20px; 
            padding: 20px; 
            background: #f0f0f0; 
            text-align: center; 
            font-size: 12px; 
            color: #666; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${appName}</h1>
          </div>
          <div class="content">
            <h2>Your One-Time Password</h2>
            <p>Hello,</p>
            <p>Your one-time password for ${appName} is:</p>
            <div class="otp">${otp}</div>
            <p>This OTP is valid for 10 minutes.</p>
            <p>If you didn't request this OTP, please ignore this email.</p>
            <p>Best regards,<br>The ${appName} Team</p>
          </div>
          <div class="footer">
            <p>This email was sent from ${appName} (${appUrl})</p>
            <p>© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Delay function for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}