import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
        auth: {
          user: config.email.user,
          pass: config.email.password,
        },
      });
    }
    return this.transporter;
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Check if email is configured
      if (!config.email.user || !config.email.password) {
        logger.warn('Email service not configured, skipping email send', {
          to: options.to,
          subject: options.subject,
        });
        // In development, log the email content instead
        if (config.nodeEnv === 'development') {
          logger.info('Email content (dev mode):', {
            to: options.to,
            subject: options.subject,
            html: options.html,
          });
        }
        return true; // Return true in dev mode to not break the flow
      }

      const transporter = this.getTransporter();

      await transporter.sendMail({
        from: config.email.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      logger.info('Email sent successfully', {
        to: options.to,
        subject: options.subject,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to: options.to,
        subject: options.subject,
      });
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, token: string, username: string): Promise<boolean> {
    const resetUrl = `${config.frontend.url}/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Noto Sans KR', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>KyoboDashBoard</h1>
          </div>
          <div class="content">
            <h2>비밀번호 재설정 요청</h2>
            <p>안녕하세요, <strong>${username}</strong>님.</p>
            <p>비밀번호 재설정 요청이 접수되었습니다. 아래 버튼을 클릭하여 새 비밀번호를 설정해주세요.</p>

            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">비밀번호 재설정</a>
            </div>

            <div class="warning">
              <strong>⚠️ 주의사항:</strong>
              <ul>
                <li>이 링크는 1시간 동안만 유효합니다.</li>
                <li>본인이 요청하지 않았다면 이 이메일을 무시해주세요.</li>
              </ul>
            </div>

            <p>버튼이 작동하지 않는 경우, 아래 링크를 복사하여 브라우저에 붙여넣기 해주세요:</p>
            <p style="word-break: break-all; color: #4F46E5;">${resetUrl}</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} KyoboDashBoard. All rights reserved.</p>
            <p>이 이메일은 자동 발송되었습니다.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: '[KyoboDashBoard] 비밀번호 재설정',
      html,
    });
  }

  async sendUsernameReminderEmail(email: string, username: string): Promise<boolean> {
    const loginUrl = `${config.frontend.url}/login`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Noto Sans KR', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .username-box { background: #e0e7ff; border: 2px solid #4F46E5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
          .username { font-size: 24px; font-weight: bold; color: #4F46E5; }
          .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>KyoboDashBoard</h1>
          </div>
          <div class="content">
            <h2>아이디 찾기 결과</h2>
            <p>요청하신 이메일로 등록된 아이디를 찾았습니다.</p>

            <div class="username-box">
              <p style="margin: 0; color: #6b7280;">회원님의 아이디</p>
              <p class="username">${username}</p>
            </div>

            <div style="text-align: center;">
              <a href="${loginUrl}" class="button">로그인 하러 가기</a>
            </div>

            <p style="color: #6b7280; font-size: 14px;">
              비밀번호가 기억나지 않으시면 로그인 페이지에서 "비밀번호 찾기"를 이용해주세요.
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} KyoboDashBoard. All rights reserved.</p>
            <p>이 이메일은 자동 발송되었습니다.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: '[KyoboDashBoard] 아이디 찾기 결과',
      html,
    });
  }
}

export const emailService = new EmailService();
