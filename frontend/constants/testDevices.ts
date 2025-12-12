// 테스트 기기 ID 목록
// 이 목록에 있는 기기는 "테스트 기기 포함" 체크박스가 해제되면 대시보드에서 숨겨집니다.
export const TEST_DEVICE_IDS: string[] = [
  'eafe6b5994ae3d0ec6dbcbd25fd02f7a',
];

// 테스트 기기인지 확인하는 함수
export function isTestDevice(deviceId: string): boolean {
  return TEST_DEVICE_IDS.includes(deviceId);
}
