/**
 * 출석률 계산 유틸리티 함수
 */

/**
 * 지각 3번을 결석 1번으로 계산하여 출석률 계산
 * @param attendances 출석 기록 배열
 * @returns { total, present, absent, late, adjustedAbsent, rate }
 */
export function calculateAttendanceRate(attendances: Array<{ status: string }>) {
  const total = attendances.length;
  
  // 기본 통계
  const present = attendances.filter((a) => a.status === 'PRESENT').length;
  const late = attendances.filter((a) => a.status === 'LATE').length;
  const absent = attendances.filter((a) => a.status === 'ABSENT').length;
  
  // 지각 3번 = 결석 1번으로 계산
  const lateToAbsent = Math.floor(late / 3);
  const adjustedAbsent = absent + lateToAbsent;
  
  // 출석률 계산: (출석 + 지각) / 전체
  // 지각 3번 = 결석 1번으로 계산하되, 출석률은 여전히 (출석 + 지각) / 전체로 계산
  // 단, 조정된 결석 횟수(adjustedAbsent)는 경고 계산에 사용
  const effectiveTotal = total; // 전체 수업 수는 그대로
  const effectivePresent = present + late; // 출석 + 지각은 모두 출석으로 간주
  const rate = effectiveTotal > 0 ? Math.round((effectivePresent / effectiveTotal) * 100) : 100;
  
  return {
    total,
    present,
    absent,
    late,
    lateToAbsent, // 지각으로 인한 결석 횟수
    adjustedAbsent, // 조정된 결석 횟수 (기본 결석 + 지각으로 인한 결석)
    effectivePresent, // 유효 출석 횟수
    rate,
  };
}

