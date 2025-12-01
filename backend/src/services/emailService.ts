import { config } from '../config';
import { logger } from '../utils/logger';

interface EmailOptions {
  to: string;
  subject: string;
  message: string;
}

const WEB3FORMS_API_URL = 'https://api.web3forms.com/submit';

class EmailService {
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const response = await fetch(WEB3FORMS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          access_key: config.web3forms.accessKey,
          to: options.to,
          subject: options.subject,
          message: options.message,
          from_name: 'KyoboDashBoard',
        }),
      });

      const result = await response.json();

      if (result.success) {
        logger.info('Email sent successfully via Web3Forms', {
          to: options.to,
          subject: options.subject,
        });
        return true;
      } else {
        logger.error('Web3Forms API error', {
          error: result.message,
          to: options.to,
          subject: options.subject,
        });
        return false;
      }
    } catch (error) {
      logger.error('Failed to send email via Web3Forms', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to: options.to,
        subject: options.subject,
      });
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, token: string, username: string): Promise<boolean> {
    const resetUrl = `${config.frontend.url}/reset-password?token=${token}`;

    const message = `
[KyoboDashBoard] 비밀번호 재설정 요청

안녕하세요, ${username}님.

비밀번호 재설정 요청이 접수되었습니다.
아래 링크를 클릭하여 새 비밀번호를 설정해주세요.

비밀번호 재설정 링크:
${resetUrl}

주의사항:
- 이 링크는 1시간 동안만 유효합니다.
- 본인이 요청하지 않았다면 이 이메일을 무시해주세요.

---
© ${new Date().getFullYear()} KyoboDashBoard. All rights reserved.
이 이메일은 자동 발송되었습니다.
    `.trim();

    return this.sendEmail({
      to: email,
      subject: '[KyoboDashBoard] 비밀번호 재설정',
      message,
    });
  }

  async sendUsernameReminderEmail(email: string, username: string): Promise<boolean> {
    const loginUrl = `${config.frontend.url}/login`;

    const message = `
[KyoboDashBoard] 아이디 찾기 결과

요청하신 이메일로 등록된 아이디를 찾았습니다.

회원님의 아이디: ${username}

로그인 페이지:
${loginUrl}

비밀번호가 기억나지 않으시면 로그인 페이지에서 "비밀번호 찾기"를 이용해주세요.

---
© ${new Date().getFullYear()} KyoboDashBoard. All rights reserved.
이 이메일은 자동 발송되었습니다.
    `.trim();

    return this.sendEmail({
      to: email,
      subject: '[KyoboDashBoard] 아이디 찾기 결과',
      message,
    });
  }
}

export const emailService = new EmailService();
