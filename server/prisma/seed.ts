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

  // 선생님 생성
  const teacher1 = await prisma.user.upsert({
    where: { email: 'teacher1@academy.com' },
    update: {},
    create: {
      email: 'teacher1@academy.com',
      password: hashedPassword,
      name: '김선생',
      role: 'TEACHER',
      phone: '010-2222-3333',
    },
  });
  console.log('✅ Teacher created:', teacher1.email);

  const teacher2 = await prisma.user.upsert({
    where: { email: 'teacher2@academy.com' },
    update: {},
    create: {
      email: 'teacher2@academy.com',
      password: hashedPassword,
      name: '박선생',
      role: 'TEACHER',
      phone: '010-3333-4444',
    },
  });
  console.log('✅ Teacher created:', teacher2.email);

  // 학생 생성
  const students = [];
  const studentNames = [
    '이민준', '김서연', '박지호', '최수아', '정예준',
    '강지우', '윤하은', '임도윤', '한서준', '오시우',
    '신지아', '송현우', '유지민', '조은서', '백준서',
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

  // 클래스 생성
  const class1 = await prisma.class.upsert({
    where: { id: 'class-math-a' },
    update: {},
    create: {
      id: 'class-math-a',
      name: '중등 수학 A반',
      description: '중학교 2학년 수학 심화반',
      schedule: '월, 수, 금 14:00-16:00',
      maxStudents: 20,
      teacherId: teacher1.id,
    },
  });
  console.log('✅ Class created:', class1.name);

  const class2 = await prisma.class.upsert({
    where: { id: 'class-english-b' },
    update: {},
    create: {
      id: 'class-english-b',
      name: '고등 영어 B반',
      description: '고등학교 1학년 영어 기초반',
      schedule: '화, 목 18:00-20:00',
      maxStudents: 15,
      teacherId: teacher2.id,
    },
  });
  console.log('✅ Class created:', class2.name);

  // 클래스에 학생 배정
  for (let i = 0; i < 10; i++) {
    await prisma.classMember.upsert({
      where: {
        studentId_classId: {
          studentId: students[i].id,
          classId: class1.id,
        },
      },
      update: {},
      create: {
        studentId: students[i].id,
        classId: class1.id,
      },
    });
  }
  console.log('✅ 10 students assigned to', class1.name);

  for (let i = 5; i < 15; i++) {
    await prisma.classMember.upsert({
      where: {
        studentId_classId: {
          studentId: students[i].id,
          classId: class2.id,
        },
      },
      update: {},
      create: {
        studentId: students[i].id,
        classId: class2.id,
      },
    });
  }
  console.log('✅ 10 students assigned to', class2.name);

  // 좌석 생성 (4x5 = 20석)
  const rows = 4;
  const cols = 5;

  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      await prisma.seat.upsert({
        where: {
          classId_row_col: {
            classId: class1.id,
            row: r,
            col: c,
          },
        },
        update: {},
        create: {
          classId: class1.id,
          row: r,
          col: c,
          label: `${String.fromCharCode(64 + r)}${c}`,
        },
      });
    }
  }
  console.log('✅ Seats created for', class1.name);

  // 좌석 배정 (일부 학생만)
  const seats = await prisma.seat.findMany({
    where: { classId: class1.id },
    orderBy: [{ row: 'asc' }, { col: 'asc' }],
  });

  for (let i = 0; i < Math.min(10, seats.length); i++) {
    await prisma.seat.update({
      where: { id: seats[i].id },
      data: { studentId: students[i].id },
    });
  }
  console.log('✅ Students assigned to seats');

  // 출결 샘플 데이터 생성 (최근 30일)
  const today = new Date();
  const statuses = ['PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'LATE', 'ABSENT', 'SICK_LEAVE'];

  for (let day = 0; day < 30; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() - day);
    
    // 주말 제외
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    for (let i = 0; i < 10; i++) {
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      await prisma.attendance.upsert({
        where: {
          studentId_classId_date: {
            studentId: students[i].id,
            classId: class1.id,
            date: date,
          },
        },
        update: {},
        create: {
          studentId: students[i].id,
          classId: class1.id,
          date: date,
          status: randomStatus as any,
          checkInAt: randomStatus === 'PRESENT' ? date : null,
        },
      });
    }
  }
  console.log('✅ Attendance records created');

  console.log('\n🎉 Seeding completed!');
  console.log('\n📋 Test accounts:');
  console.log('  Admin: admin@academy.com / password123');
  console.log('  Teacher: teacher1@academy.com / password123');
  console.log('  Student: student1@academy.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

