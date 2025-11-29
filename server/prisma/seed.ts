import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 비밀번호 해시 (공통: "password123")
  const hashedPassword = await bcrypt.hash('password123', 12);

  // 슈퍼 관리자 생성
  const admin = await prisma.user.upsert({
    where: { email: 'admin@academy.com' },
    update: {},
    create: {
      email: 'admin@academy.com',
      password: hashedPassword,
      name: '관리자',
      role: 'SUPER_ADMIN',
      phone: '010-1234-5678',
    },
  });
  console.log('✅ Admin created:', admin.email);

  // 선생님 생성 (4명) - 1년 운영된 학원 기준
  const teachers = [];
  const teacherNames = ['김선생', '박선생', '이선생', '최선생'];
  const teacherPhones = ['010-2222-3333', '010-3333-4444', '010-4444-5555', '010-5555-6666'];
  // 입사일: 1년 전부터 최근까지 다양하게 설정
  const joinedDates = [
    new Date(new Date().setFullYear(new Date().getFullYear() - 1, 0, 1)), // 1년 전 1월 1일
    new Date(new Date().setFullYear(new Date().getFullYear() - 1, 3, 15)), // 1년 전 4월 15일
    new Date(new Date().setFullYear(new Date().getFullYear() - 1, 6, 1)), // 1년 전 7월 1일
    new Date(new Date().setFullYear(new Date().getFullYear() - 1, 9, 1)), // 1년 전 10월 1일
  ];
  // 연차: 입사일 기준으로 계산 (1년차 15일, 이후 매년 1일씩 증가, 최대 25일)
  const annualLeaves = [15, 16, 17, 15]; // 각 선생님의 연차
  // 월차: 매월 1일씩 (현재 월 기준으로 남은 월차)
  const monthlyLeaves = [1, 1, 1, 1]; // 각 선생님의 월차

  for (let i = 0; i < teacherNames.length; i++) {
    const teacher = await prisma.user.upsert({
      where: { email: `teacher${i + 1}@academy.com` },
      update: {
        joinedDate: joinedDates[i],
        annualLeave: annualLeaves[i],
        monthlyLeave: monthlyLeaves[i],
      },
      create: {
        email: `teacher${i + 1}@academy.com`,
        password: hashedPassword,
        name: teacherNames[i],
        role: 'TEACHER',
        phone: teacherPhones[i],
        joinedDate: joinedDates[i],
        annualLeave: annualLeaves[i],
        monthlyLeave: monthlyLeaves[i],
      },
    });
    teachers.push(teacher);
    console.log('✅ Teacher created:', teacher.email, 'joinedDate:', joinedDates[i], 'annualLeave:', annualLeaves[i]);
  }

  // 학생 생성 (32명 - 2배)
  const students = [];
  const studentNames = [
    '이민준', '김서연', '박지호', '최수아', '정예준',
    '강지우', '윤하은', '임도윤', '한서준', '오시우',
    '신지아', '송현우', '유지민', '조은서', '백준서',
    '김나래', '권희나', '권영호', '조민수', '이하늘',
    '박준혁', '최민지', '정수진', '강동현', '윤서아',
    '임태현', '한소희', '오민석', '신유진', '송준호',
    '유서연', '조민호',
  ];

  for (let i = 0; i < studentNames.length; i++) {
    const student = await prisma.user.upsert({
      where: { email: `student${i + 1}@academy.com` },
      update: {},
      create: {
        email: `student${i + 1}@academy.com`,
        password: hashedPassword,
        name: studentNames[i],
        role: 'STUDENT',
        phone: `010-${String(5000 + i).padStart(4, '0')}-${String(1000 + i).padStart(4, '0')}`,
      },
    });
    students.push(student);
  }
  console.log(`✅ ${students.length} students created`);

  // 클래스 생성 (8개 - 다양한 상태 포함)
  const classes = [];
  const classDataArray = [
    {
      id: 'class-math-a',
      name: '중등 수학 A반',
      description: '중학교 2학년 수학 심화반',
      schedule: '월, 수, 금 14:00-16:00',
      maxStudents: 20,
      teacherIndex: 0,
      status: 'ACTIVE', // 개강
      startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
      periodDays: 30,
    },
    {
      id: 'class-english-b',
      name: '고등 영어 B반',
      description: '고등학교 1학년 영어 기초반',
      schedule: '화, 목 18:00-20:00',
      maxStudents: 15,
      teacherIndex: 1,
      status: 'PREPARING', // 개강 준비
      startDate: null,
      periodDays: 30,
    },
    {
      id: 'class-korean-c',
      name: '중등 국어 C반',
      description: '중학교 1학년 국어 기초반',
      schedule: '월, 화, 목 16:00-18:00',
      maxStudents: 18,
      teacherIndex: 2,
      status: 'ACTIVE', // 개강
      startDate: new Date(new Date().setDate(new Date().getDate() - 15)),
      periodDays: 30,
    },
    {
      id: 'class-science-d',
      name: '고등 과학 D반',
      description: '고등학교 2학년 과학 심화반',
      schedule: '수, 금 15:00-17:00',
      maxStudents: 16,
      teacherIndex: 3,
      status: 'COMPLETED', // 수료
      startDate: new Date(new Date().setDate(new Date().getDate() - 90)),
      periodDays: 30,
    },
    {
      id: 'class-physics-e',
      name: '고등 물리 E반',
      description: '고등학교 3학년 물리 심화반',
      schedule: '월, 수, 금 19:00-21:00',
      maxStudents: 12,
      teacherIndex: 0,
      status: 'ACTIVE', // 개강
      startDate: new Date(new Date().setDate(new Date().getDate() - 10)),
      periodDays: 30,
    },
    {
      id: 'class-chemistry-f',
      name: '중등 화학 F반',
      description: '중학교 3학년 화학 기초반',
      schedule: '화, 목 15:00-17:00',
      maxStudents: 14,
      teacherIndex: 1,
      status: 'PREPARING', // 개강 준비
      startDate: null,
      periodDays: 30,
    },
    {
      id: 'class-history-g',
      name: '고등 역사 G반',
      description: '고등학교 1학년 한국사 심화반',
      schedule: '월, 화, 목 17:00-19:00',
      maxStudents: 18,
      teacherIndex: 2,
      status: 'CANCELLED', // 폐강
      startDate: new Date(new Date().setDate(new Date().getDate() - 60)),
      periodDays: 30,
    },
    {
      id: 'class-biology-h',
      name: '중등 생물 H반',
      description: '중학교 2학년 생물 기초반',
      schedule: '수, 금 16:00-18:00',
      maxStudents: 16,
      teacherIndex: 3,
      status: 'ACTIVE', // 개강
      startDate: new Date(new Date().setDate(new Date().getDate() - 5)),
      periodDays: 30,
    },
  ];

  for (const classInfo of classDataArray) {
    const classItem = await prisma.class.upsert({
      where: { id: classInfo.id },
      update: {},
      create: {
        id: classInfo.id,
        name: classInfo.name,
        description: classInfo.description,
        schedule: classInfo.schedule,
        maxStudents: classInfo.maxStudents,
        teacherId: teachers[classInfo.teacherIndex].id,
        status: classInfo.status as any,
        startDate: classInfo.startDate,
        periodDays: classInfo.periodDays,
      },
    });
    classes.push(classItem);
    console.log(`✅ Class created: ${classItem.name} (${classInfo.status})`);
  }

  // 클래스에 학생 배정 (골고루 분포)
  // 각 클래스에 6-10명씩 분산 배정
  const studentAssignments = [
    { classIndex: 0, studentIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] }, // 수학 A반: 10명
    { classIndex: 1, studentIndices: [4, 5, 6, 7, 8, 9, 10, 11] }, // 영어 B반: 8명 (개강 준비)
    { classIndex: 2, studentIndices: [10, 11, 12, 13, 14, 15, 16, 17, 18] }, // 국어 C반: 9명
    { classIndex: 3, studentIndices: [18, 19, 20, 21, 22, 23] }, // 과학 D반: 6명 (수료)
    { classIndex: 4, studentIndices: [24, 25, 26, 27, 28, 29, 30] }, // 물리 E반: 7명
    { classIndex: 5, studentIndices: [0, 1, 2, 3, 4, 5] }, // 화학 F반: 6명 (개강 준비)
    { classIndex: 6, studentIndices: [6, 7, 8, 9, 10, 11, 12, 13] }, // 역사 G반: 8명 (폐강)
    { classIndex: 7, studentIndices: [14, 15, 16, 17, 18, 19, 20, 21, 22, 23] }, // 생물 H반: 10명
  ];

  for (const assignment of studentAssignments) {
    for (const studentIdx of assignment.studentIndices) {
      if (studentIdx < students.length) {
        await prisma.classMember.upsert({
          where: {
            studentId_classId: {
              studentId: students[studentIdx].id,
              classId: classes[assignment.classIndex].id,
            },
          },
          update: {},
          create: {
            studentId: students[studentIdx].id,
            classId: classes[assignment.classIndex].id,
          },
        });
      }
    }
    console.log(`✅ ${assignment.studentIndices.length} students assigned to ${classes[assignment.classIndex].name}`);
  }

  // 좌석 생성 (각 클래스마다)
  for (const classItem of classes) {
    const rows = 4;
    const cols = 5;

    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        await prisma.seat.upsert({
          where: {
            classId_row_col: {
              classId: classItem.id,
              row: r,
              col: c,
            },
          },
          update: {},
          create: {
            classId: classItem.id,
            row: r,
            col: c,
            label: `${String.fromCharCode(64 + r)}${c}`,
          },
        });
      }
    }
    console.log('✅ Seats created for', classItem.name);
  }

  // 좌석 배정 (각 클래스의 학생들에게)
  for (let classIdx = 0; classIdx < classes.length; classIdx++) {
    const seats = await prisma.seat.findMany({
      where: { classId: classes[classIdx].id, studentId: null },
      orderBy: [{ row: 'asc' }, { col: 'asc' }],
    });

    const classMembers = await prisma.classMember.findMany({
      where: { classId: classes[classIdx].id },
      select: { studentId: true },
    });

    // 이미 좌석이 배정된 학생 제외
    const assignedStudentIds = await prisma.seat.findMany({
      where: { 
        classId: classes[classIdx].id,
        studentId: { not: null },
      },
      select: { studentId: true },
    });
    const assignedIds = new Set(assignedStudentIds.map(s => s.studentId).filter(Boolean));

    const unassignedMembers = classMembers.filter(m => !assignedIds.has(m.studentId));

    for (let i = 0; i < Math.min(unassignedMembers.length, seats.length); i++) {
      await prisma.seat.update({
        where: { id: seats[i].id },
        data: { studentId: unassignedMembers[i].studentId },
      });
    }
    console.log(`✅ ${Math.min(unassignedMembers.length, seats.length)} students assigned to seats for ${classes[classIdx].name}`);
  }

  // 출결 샘플 데이터 생성 (클래스 상태에 따라 다르게)
  const today = new Date();
  const statuses = ['PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'LATE', 'ABSENT', 'SICK_LEAVE'];

  for (const classItem of classes) {
    const classInfo = classDataArray.find(c => c.id === classItem.id);
    const classStatus = classInfo?.status || 'ACTIVE';
    
    const classMembers = await prisma.classMember.findMany({
      where: { classId: classItem.id },
      select: { studentId: true },
    });

    // ACTIVE 클래스만 출석 데이터 생성
    if (classStatus === 'ACTIVE') {
      const daysToGenerate = classInfo?.startDate 
        ? Math.floor((today.getTime() - new Date(classInfo.startDate).getTime()) / (1000 * 60 * 60 * 24))
        : 30;
      const maxDays = Math.min(daysToGenerate, 30);

      for (let day = 0; day < maxDays; day++) {
        const date = new Date(today);
        date.setDate(date.getDate() - day);
        
        // 주말 제외
        if (date.getDay() === 0 || date.getDay() === 6) continue;

        for (const member of classMembers) {
          const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
          
          await prisma.attendance.upsert({
            where: {
              studentId_classId_date: {
                studentId: member.studentId,
                classId: classItem.id,
                date: date,
              },
            },
            update: {},
            create: {
              studentId: member.studentId,
              classId: classItem.id,
              date: date,
              status: randomStatus as any,
              checkInAt: randomStatus === 'PRESENT' ? date : null,
            },
          });
        }
      }
      console.log(`✅ Attendance records created for ${classItem.name} (${maxDays} days)`);
    } else if (classStatus === 'COMPLETED') {
      // 수료된 클래스는 과거 데이터만 생성
      for (let day = 30; day < 60; day++) {
        const date = new Date(today);
        date.setDate(date.getDate() - day);
        
        if (date.getDay() === 0 || date.getDay() === 6) continue;

        for (const member of classMembers) {
          const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
          
          await prisma.attendance.upsert({
            where: {
              studentId_classId_date: {
                studentId: member.studentId,
                classId: classItem.id,
                date: date,
              },
            },
            update: {},
            create: {
              studentId: member.studentId,
              classId: classItem.id,
              date: date,
              status: randomStatus as any,
              checkInAt: randomStatus === 'PRESENT' ? date : null,
            },
          });
        }
      }
      console.log(`✅ Past attendance records created for ${classItem.name} (completed)`);
    } else {
      console.log(`⏭️  Skipped attendance records for ${classItem.name} (${classStatus})`);
    }
  }

  console.log('\n🎉 Seeding completed!');
  console.log('\n📋 Test accounts:');
  console.log('  Admin: admin@academy.com / password123');
  console.log('  Teachers: teacher1@academy.com ~ teacher4@academy.com / password123');
  console.log('  Students: student1@academy.com ~ student32@academy.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

