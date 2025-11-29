/**
 * 클래스 스케줄 관련 유틸리티 함수
 */

// 요일 한글 매핑
const DAYS_KR = ['일', '월', '화', '수', '목', '금', '토'];
const DAYS_EN = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export interface ScheduleTime {
  days: string[]; // ['월', '수', '금']
  startTime: string; // '14:00'
  endTime: string; // '16:00'
}

/**
 * 스케줄 문자열을 파싱
 * 예: "월,수,금 14:00-16:00" -> { days: ['월', '수', '금'], startTime: '14:00', endTime: '16:00' }
 */
export function parseSchedule(schedule: string | null | undefined): ScheduleTime | null {
  if (!schedule || !schedule.trim()) {
    return null;
  }

  const trimmed = schedule.trim();
  
  // 요일과 시간 분리
  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) {
    return null;
  }

  // 요일 파싱
  const daysStr = parts[0].replace(/,/g, ' ').trim();
  const days = daysStr.split(/\s+/).filter(d => d.length > 0);
  
  // 시간 파싱 (예: "14:00-16:00")
  const timeStr = parts.slice(1).join(' ');
  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  
  if (!timeMatch) {
    return null;
  }

  const startTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
  const endTime = `${timeMatch[3].padStart(2, '0')}:${timeMatch[4]}`;

  return {
    days: days,
    startTime,
    endTime,
  };
}

/**
 * 시간 문자열을 분 단위로 변환
 * 예: "14:00" -> 840 (14 * 60)
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * 두 시간대가 겹치는지 확인
 */
function isTimeOverlapping(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const start1Min = timeToMinutes(start1);
  const end1Min = timeToMinutes(end1);
  const start2Min = timeToMinutes(start2);
  const end2Min = timeToMinutes(end2);

  // 시간대가 겹치는 경우: start1 < end2 && start2 < end1
  return start1Min < end2Min && start2Min < end1Min;
}

/**
 * 요일이 겹치는지 확인
 */
function hasOverlappingDays(days1: string[], days2: string[]): boolean {
  // 요일 정규화 (한글/영문 모두 처리)
  const normalizeDay = (day: string): string => {
    const lower = day.toLowerCase().trim();
    const index = DAYS_KR.findIndex(d => d === day);
    if (index >= 0) {
      return DAYS_EN[index];
    }
    return lower;
  };

  const normalizedDays1 = days1.map(normalizeDay);
  const normalizedDays2 = days2.map(normalizeDay);

  return normalizedDays1.some(d => normalizedDays2.includes(d));
}

/**
 * 두 스케줄이 충돌하는지 확인
 * 충돌 조건: 같은 요일이고 시간대가 겹치는 경우
 */
export function isScheduleConflict(
  schedule1: string | null | undefined,
  schedule2: string | null | undefined
): boolean {
  const parsed1 = parseSchedule(schedule1);
  const parsed2 = parseSchedule(schedule2);

  // 둘 중 하나라도 스케줄이 없으면 충돌 없음
  if (!parsed1 || !parsed2) {
    return false;
  }

  // 요일이 겹치지 않으면 충돌 없음
  if (!hasOverlappingDays(parsed1.days, parsed2.days)) {
    return false;
  }

  // 요일이 겹치고 시간대도 겹치면 충돌
  return isTimeOverlapping(
    parsed1.startTime,
    parsed1.endTime,
    parsed2.startTime,
    parsed2.endTime
  );
}



