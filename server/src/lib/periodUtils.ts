import { addDays, format, isBefore, isAfter, startOfDay } from 'date-fns';

/**
 * 클래스의 개강일자와 기간 단위를 기반으로 현재 날짜가 속한 기간의 시작일과 종료일을 계산
 * @param startDate 클래스 개강일자
 * @param periodDays 기간 단위 (일수)
 * @param targetDate 기준 날짜 (기본값: 오늘)
 * @returns { startDate: Date, endDate: Date, periodNumber: number } 기간의 시작일, 종료일, 기간 번호
 */
export function calculatePeriod(
  startDate: Date | null | undefined,
  periodDays: number,
  targetDate: Date = new Date()
): { startDate: Date; endDate: Date; periodNumber: number } {
  // startDate가 없으면 기본값으로 오늘부터 시작
  if (!startDate) {
    const today = startOfDay(targetDate);
    return {
      startDate: today,
      endDate: addDays(today, periodDays - 1),
      periodNumber: 1,
    };
  }

  const classStartDate = startOfDay(startDate);
  const currentDate = startOfDay(targetDate);

  // 현재 날짜가 개강일자보다 이전이면 첫 번째 기간
  if (isBefore(currentDate, classStartDate)) {
    return {
      startDate: classStartDate,
      endDate: addDays(classStartDate, periodDays - 1),
      periodNumber: 1,
    };
  }

  // 개강일자부터 현재까지의 일수 계산
  const daysDiff = Math.floor(
    (currentDate.getTime() - classStartDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // 현재 기간 번호 계산 (0부터 시작하므로 +1)
  const periodNumber = Math.floor(daysDiff / periodDays) + 1;

  // 현재 기간의 시작일 계산
  const periodStartDate = addDays(classStartDate, (periodNumber - 1) * periodDays);

  // 현재 기간의 종료일 계산
  const periodEndDate = addDays(periodStartDate, periodDays - 1);

  return {
    startDate: periodStartDate,
    endDate: periodEndDate,
    periodNumber,
  };
}

/**
 * 특정 기간 번호의 시작일과 종료일을 계산
 * @param startDate 클래스 개강일자
 * @param periodDays 기간 단위 (일수)
 * @param periodNumber 기간 번호 (1부터 시작)
 * @returns { startDate: Date, endDate: Date } 기간의 시작일, 종료일
 */
export function calculatePeriodByNumber(
  startDate: Date | null | undefined,
  periodDays: number,
  periodNumber: number
): { startDate: Date; endDate: Date } {
  if (!startDate) {
    const today = startOfDay(new Date());
    return {
      startDate: addDays(today, (periodNumber - 1) * periodDays),
      endDate: addDays(today, periodNumber * periodDays - 1),
    };
  }

  const classStartDate = startOfDay(startDate);
  const periodStartDate = addDays(classStartDate, (periodNumber - 1) * periodDays);
  const periodEndDate = addDays(periodStartDate, periodDays - 1);

  return {
    startDate: periodStartDate,
    endDate: periodEndDate,
  };
}

/**
 * 기간의 라벨 생성 (예: "1기간 (2024-03-15 ~ 2024-04-13)")
 */
export function formatPeriodLabel(
  startDate: Date,
  endDate: Date,
  periodNumber: number
): string {
  return `${periodNumber}기간 (${format(startDate, 'yyyy-MM-dd')} ~ ${format(endDate, 'yyyy-MM-dd')})`;
}



