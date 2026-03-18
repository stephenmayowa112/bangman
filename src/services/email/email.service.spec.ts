import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

// Mock nodemailer
jest.mock('nodemailer', () => {
  const mockTransporter = {
    sendMail: jest.fn(),
    verify: jest.fn(),
  };
  
  return {
    createTransport: jest.fn().mockReturnValue(mockTransporter)
  };
});

describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;
  let mockTransporter: any;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        'SMTP_HOST': 'smtp.test.com',
        'SMTP_PORT': 587,
        'SMTP_USER': 'test@example.com',
        'SMTP_PASS': 'password',
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
    
    // Get the mock transporter
    const nodemailer = require('nodemailer');
    mockTransporter = nodemailer.createTransport();
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
          to,
          subject: 'Your OTP Code',
        }),
        expect.any(Function)
      );
    });

    it('should retry on failure', async () => {
      const to = 'test@example.com';
      const otp = '123456';
      
      // First call fails, second succeeds
      mockTransporter.sendMail
        .mockImplementationOnce((mailOptions, callback) => {
          callback(new Error('SMTP Error'));
        })
        .mockImplementationOnce((mailOptions, callback) => {
          callback(null, { messageId: 'test-id' });
        });

      await service.sendOTP(to, otp, 1, 0); // 1 retry, 0 delay for test

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2);
    });

    it('should log error and continue on final failure', async () => {
      const to = 'test@example.com';
      const otp = '123456';
      
      mockTransporter.sendMail.mockImplementation((mailOptions, callback) => {
        callback(new Error('SMTP Error'));
      });

      const loggerSpy = jest.spyOn(Logger.prototype, 'error');
      
      await service.sendOTP(to, otp, 0); // No retries

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send email'),
        expect.any(Object)
      );
    });
  });
});