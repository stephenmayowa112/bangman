import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn(),
    verify: jest.fn(),
  }),
}));

// Mock nodemailer module
const mockTransporter = {
  sendMail: jest.fn(),
  verify: jest.fn(),
};

const mockCreateTransport = jest.fn().mockReturnValue(mockTransporter);

jest.mock('nodemailer', () => ({
  createTransport: mockCreateTransport,
}));

describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;
  let loggerSpy: jest.SpyInstance;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        'SMTP_HOST': 'smtp.test.com',
        'SMTP_PORT': 587,
        'SMTP_USER': 'test@test.com',
        'SMTP_PASS': 'testpass',
        'SMTP_FROM_EMAIL': 'noreply@test.com',
        'SMTP_FROM_NAME': 'Test App',
        'APP_NAME': 'Test App',
        'APP_URL': 'http://test.com',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);
    
    // Spy on logger
    loggerSpy = jest.spyOn(Logger.prototype, 'log');
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendOTP', () => {
    it('should send OTP email successfully', async () => {
      const to = 'test@example.com';
      const otp = '123456';
      
      mockTransporter.sendMail.mockImplementation((mailOptions, callback) => {
        callback(null, { messageId: 'test-message-id' });
      });

      await service.sendOTP(to, otp);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: expect.stringContaining('Test App'),
          to,
          subject: 'Your OTP Code',
          html: expect.stringContaining(otp),
        }),
        expect.any(Function)
      );
    });

    it('should retry on failure', async () => {
      const to = 'test@example.com';
      const otp = '123456';
      const error = new Error('SMTP error');
      
      // First call fails, second succeeds
      mockTransporter.sendMail
        .mockImplementationOnce((mailOptions, callback) => {
          callback(new Error('SMTP error'));
        })
        .mockImplementationOnce((mailOptions, callback) => {
          callback(null, { messageId: 'test-id' });
        });

      await service.sendOTP(to, otp, 2, 0); // 0 delay for testing

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2);
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Email sent successfully')
      );
    });

    it('should log error and continue on final failure', async () => {
      const to = 'test@example.com';
      const otp = '123456';
      
      mockTransporter.sendMail.mockImplementation((mailOptions, callback) => {
        callback(new Error('SMTP error'));
      });

      await service.sendOTP(to, otp, 1); // 1 retry

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2); // Initial + 1 retry
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send email after')
      );
    });

    it('should use default values when config is missing', async () => {
      // Mock config to return undefined for some values
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'SMTP_HOST') return 'smtp.gmail.com';
        if (key === 'SMTP_PORT') return 587;
        if (key === 'SMTP_USER') return 'user@example.com';
        if (key === 'SMTP_PASS') return 'password';
        return undefined;
      });

      const serviceWithDefaults = new EmailService(mockConfigService as any);
      await expect(serviceWithDefaults).toBeDefined();
    });
  });

  describe('sendEmail', () => {
    it('should send email with custom options', async () => {
      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test email</p>',
      };

      mockTransporter.sendMail.mockImplementation((mailOptions, callback) => {
        callback(null, { messageId: 'test-id' });
      });

      await service.sendEmail(emailOptions);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: emailOptions.to,
          subject: emailOptions.subject,
          html: emailOptions.html,
        }),
        expect.any(Function)
      );
    });
  });

  describe('timeout handling', () => {
    it('should timeout after specified time', async () => {
      const to = 'test@example.com';
      const otp = '123456';
      
      mockTransporter.sendMail.mockImplementation((mailOptions, callback) => {
        // Simulate timeout by not calling callback
        // The timeout in the service should handle this
      });

      // Mock setTimeout to advance time
      jest.useFakeTimers();
      
      const sendOTPPromise = service.sendOTP(to, otp, 0, 0, 100); // 100ms timeout
      
      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(150);
      
      await expect(sendOTPPromise).rejects.toThrow('Email sending timed out');
    });
  });
});