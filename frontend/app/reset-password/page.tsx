'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { authApi } from '@/utils/api';
import { KeyRound, Lock, AlertCircle, CheckCircle, ArrowLeft, XCircle } from 'lucide-react';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsValidating(false);
        return;
      }

      try {
        const response = await authApi.verifyToken({ token });
        setIsValidToken(response.success && response.valid);
      } catch {
        setIsValidToken(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      setError('비밀번호는 대문자, 소문자, 숫자를 포함해야 합니다.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authApi.resetPassword({ token: token!, password });

      if (response.success) {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || '비밀번호 재설정에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4" />
            <p className="text-gray-600">토큰 확인 중...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!token || !isValidToken) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">유효하지 않은 링크</h3>
            <p className="text-gray-600 mb-6">
              비밀번호 재설정 링크가 만료되었거나 유효하지 않습니다.
              <br />
              다시 비밀번호 찾기를 진행해주세요.
            </p>
            <Link href="/forgot-password">
              <Button className="w-full">
                <KeyRound className="w-4 h-4 mr-2" />
                비밀번호 찾기 다시하기
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-center text-xl">
          <KeyRound className="w-5 h-5 mr-2" />
          비밀번호 재설정
        </CardTitle>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              비밀번호가 변경되었습니다
            </h3>
            <p className="text-gray-600 mb-6">
              새 비밀번호로 로그인해주세요.
            </p>
            <Link href="/login">
              <Button className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                로그인하러 가기
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <p className="text-gray-600 text-sm mb-6 text-center">
              새로운 비밀번호를 입력해주세요.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  새 비밀번호
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="새 비밀번호 입력"
                    className="pl-10"
                    required
                    minLength={8}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  8자 이상, 대문자, 소문자, 숫자 포함
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  비밀번호 확인
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="비밀번호 재입력"
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
                    <KeyRound className="w-4 h-4 mr-2" />
                    비밀번호 변경
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
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">KyoboDashBoard</h1>
          <p className="text-gray-600 mt-2">VR 로그 수집 대시보드</p>
        </div>

        <Suspense
          fallback={
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4" />
                  <p className="text-gray-600">로딩 중...</p>
                </div>
              </CardContent>
            </Card>
          }
        >
          <ResetPasswordContent />
        </Suspense>

        <p className="text-center text-gray-500 text-sm mt-6">
          © {new Date().getFullYear()} KyoboDashBoard. All rights reserved.
        </p>
      </div>
    </div>
  );
}
