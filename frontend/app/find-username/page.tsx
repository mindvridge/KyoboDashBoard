'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { authApi } from '@/utils/api';
import { User, Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

export default function FindUsernamePage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await authApi.findUsername({ email });

      if (response.success) {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || '요청 처리에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">KyoboDashBoard</h1>
          <p className="text-gray-600 mt-2">VR 로그 수집 대시보드</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-center text-xl">
              <User className="w-5 h-5 mr-2" />
              아이디 찾기
            </CardTitle>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  이메일을 확인해주세요
                </h3>
                <p className="text-gray-600 mb-6">
                  입력하신 이메일 주소로 아이디 정보가 발송되었습니다.
                  <br />
                  메일함을 확인해주세요.
                </p>
                <Link href="/login">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    로그인으로 돌아가기
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <p className="text-gray-600 text-sm mb-6 text-center">
                  가입 시 사용한 이메일 주소를 입력하시면
                  <br />
                  아이디 정보를 보내드립니다.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@kyobo.com"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        처리 중...
                      </div>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        아이디 정보 발송
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6 pt-6 border-t border-gray-200 text-center">
                  <Link
                    href="/login"
                    className="text-primary-600 hover:text-primary-700 hover:underline text-sm flex items-center justify-center"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    로그인으로 돌아가기
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-gray-500 text-sm mt-6">
          © {new Date().getFullYear()} KyoboDashBoard. All rights reserved.
        </p>
      </div>
    </div>
  );
}
