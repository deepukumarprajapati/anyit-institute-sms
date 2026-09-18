// Seed a complete two-year demo dataset.
// Usage: node seed-db.js [--reset]
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Admin = require("./src/models/Admin");
const Parent = require("./src/models/Parent");
const Student = require("./src/models/Student");
const Teacher = require("./src/models/Teacher");
const Class = require("./src/models/Class");
const Subject = require("./src/models/Subject");
const Attendance = require("./src/models/Attendance");
const AttendanceRecord = require("./src/models/AttendanceRecord");
const Event = require("./src/models/Event");
const { Exam, Result } = require("./src/models/Exam");
const { FeeStructure, FeePayment, Concession } = require("./src/models/Fee");
const Homework = require("./src/models/Homework");
const { Book, BookIssue } = require("./src/models/Library");
const Notice = require("./src/models/Notice");
const Permission = require("./src/models/Permission");
const { Badge, UserBadge, Challenge } = require("./src/models/Badge");
const Conversation = require("./src/models/Conversation");
const Message = require("./src/models/Message");
const ScheduledExam = require("./src/models/ScheduledExam");
const ExamSubject = require("./src/models/ExamSubject");
const Test = require("./src/models/Test");
const SchoolPeriod = require("./src/models/SchoolPeriod");
const StudyMaterial = require("./src/models/StudyMaterial");
const Timetable = require("./src/models/Timetable");
const TimetableEntry = require("./src/models/TimetableEntry");
const BusRoute = require("./src/models/Transport");

const id = () => new mongoose.Types.ObjectId();
const monthsAgo = (months, day = 10) => {
  const date = new Date();
  date.setMonth(date.getMonth() - months, day);
  date.setHours(10, 0, 0, 0);
  return date;
};
const daysFrom = (date, days) => new Date(date.getTime() + days * 86400000);
const pick = (items, index) => items[index % items.length];
const gradeFor = (marks, total) => {
  const percentage = Math.round((marks / total) * 100);
  const grade = percentage >= 90 ? "A+" : percentage >= 80 ? "A" : percentage >= 70 ? "B+" : percentage >= 60 ? "B" : percentage >= 50 ? "C" : percentage >= 33 ? "D" : "F";
  return { percentage, grade, isPassed: marks >= total * 0.33 };
};
const hashPassword = (password) => bcrypt.hash(password, 10);

async function clearDatabase() {
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const collection of collections) await mongoose.connection.db.collection(collection.name).deleteMany({});
}

async function seed() {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/school_db";
  await mongoose.connect(uri);
  console.log(`Connected to ${mongoose.connection.host}/${mongoose.connection.name}`);

  const hasData = await Admin.exists({});
  if (hasData && !process.argv.includes("--reset")) {
    throw new Error("Database already contains data. Re-run with --reset to replace it.");
  }
  if (process.argv.includes("--reset")) {
    await clearDatabase();
    console.log("Existing data cleared.");
  }

  const adminPassword = "Admin@2026";
  const teacherPasswords = ["Teacher@001", "Teacher@002", "Teacher@003", "Teacher@004"];
  const parentPasswords = ["Parent@001", "Parent@002", "Parent@003", "Parent@004"];
  const studentPasswords = Array.from({ length: 12 }, (_, index) => `Student@${String(index + 1).padStart(3, "0")}`);
  const schoolId = id();
  const admin = {
    _id: schoolId, schoolName: "Horizon International School", schoolCode: "SCH-DEMO-2026",
    schoolAddress: "12 Knowledge Avenue", schoolPhone: "+91 98765 43210", schoolEmail: "admin@horizon.demo",
    website: "https://horizon.demo", name: "Anita Sharma", email: "admin@horizon.demo", password: await hashPassword(adminPassword),
    role: "schooladmin", isActive: true, isVerified: true, createdAt: monthsAgo(23), updatedAt: monthsAgo(0),
  };
  await Admin.create(admin);

  const subjectNames = ["Mathematics", "Science", "English", "Social Studies", "Computer Science"];
  const subjectIds = subjectNames.map(() => id());
  const subjects = subjectNames.map((name, index) => ({
    _id: subjectIds[index], school: schoolId, name, code: `SUB-${index + 1}`, description: `${name} curriculum`,
    createdAt: monthsAgo(23), updatedAt: monthsAgo(0),
  }));
  await Subject.insertMany(subjects);

  const teacherIds = [id(), id(), id(), id()];
  const teachers = await Promise.all(["Ravi Kumar", "Meera Joshi", "Daniel Thomas", "Kavita Rao"].map(async (name, index) => ({
    _id: teacherIds[index], name, teacherId: `TCH-DEMO-${String(index + 1).padStart(3, "0")}`, email: `teacher${index + 1}@horizon.demo`, password: await hashPassword(teacherPasswords[index]),
    phone: `+91 90000 1000${index}`, school: schoolId, subjects: [subjectNames[index], subjectNames[(index + 1) % subjectNames.length]],
    classes: index < 2 ? ["8", "9"] : ["10"], qualification: "M.Ed.", experience: `${5 + index} years`,
    designation: index === 0 ? "Senior Teacher" : "Teacher", permissions: {
      canCreateStudent: true, canEditStudent: true, canMarkAttendance: true, canViewAttendance: true,
      canManageFees: index === 0, canCreateExam: true, canEnterMarks: true, canPostNotice: true,
      canAssignHomework: true, canManageLibrary: index === 0, canAwardBadges: true,
    }, points: 20 + index * 10, createdAt: monthsAgo(22 - index), updatedAt: monthsAgo(0),
  })));
  await Teacher.insertMany(teachers);

  const classIds = [id(), id(), id()];
  const classData = ["8", "9", "10"].map((name, index) => ({
    _id: classIds[index], name, section: "A", school: schoolId, room: `Room ${100 + index}`,
    subjects: subjectNames, assignedSubjects: subjectIds, classTeacher: teacherIds[index],
  }));
  await Class.insertMany(classData);
  await Teacher.updateMany({ _id: { $in: teacherIds } }, { $set: { assignedClasses: classIds } });

  const parentIds = [id(), id(), id(), id()];
  await Parent.insertMany(await Promise.all(parentIds.map(async (parentId, index) => ({
    _id: parentId, name: ["Arjun Mehta", "Priya Nair", "Sanjay Patel", "Lina George"][index],
    email: `parent${index + 1}@horizon.demo`, password: await hashPassword(parentPasswords[index]), phone: `+91 91111 2000${index}`, address: "Horizon Residency",
    occupation: ["Engineer", "Doctor", "Designer", "Accountant"][index], relation: index % 2 ? "mother" : "father",
    school: schoolId, createdAt: monthsAgo(22 - index), updatedAt: monthsAgo(0),
  }))));

  const studentIds = Array.from({ length: 12 }, () => id());
  const students = await Promise.all(studentIds.map(async (studentId, index) => ({
    _id: studentId, name: ["Aarav", "Isha", "Vihaan", "Anaya", "Kabir", "Sara", "Reyansh", "Mia", "Advik", "Tara", "Arnav", "Zoya"][index],
    email: `student${index + 1}@horizon.demo`, password: await hashPassword(studentPasswords[index]), phone: `+91 92222 300${String(index).padStart(2, "0")}`,
    studentId: `STU-DEMO-${String(index + 1).padStart(3, "0")}`, school: schoolId, class: String(8 + Math.floor(index / 4)), section: "A",
    rollNumber: String(index + 1), dateOfBirth: new Date(2011 - Math.floor(index / 4), index % 12, 5 + index),
    gender: index % 3 === 0 ? "female" : "male", address: "Horizon Residency", bloodGroup: pick(["A+", "B+", "O+"], index),
    classTeacher: teacherIds[Math.floor(index / 4)], parent: parentIds[Math.floor(index / 3)], points: 40 + index * 7,
    streakDays: 3 + (index % 8), lastAttendance: monthsAgo(0, 8), createdAt: monthsAgo(22 - (index % 8)), updatedAt: monthsAgo(0),
  })));
  await Student.insertMany(students);
  await Parent.bulkWrite(parentIds.map((parentId, index) => ({ updateOne: { filter: { _id: parentId }, update: { $set: { students: studentIds.slice(index * 3, index * 3 + 3) } } } })));

  await Permission.insertMany(teacherIds.map((teacherId, index) => ({
    teacher: teacherId, school: schoolId, assignedBy: schoolId, canCreateStudent: true, canEditStudent: true,
    canMarkAttendance: true, canViewAttendance: true, canViewFees: index === 0, canCreateExam: true,
    canEnterMarks: true, canViewExams: true, canPostNotice: true, canViewNotices: true, canAssignHomework: true,
    canViewHomework: true, canManageLibrary: index === 0, canAwardBadges: true,
  })));

  const attendance = [];
  const attendanceRecords = [];
  for (let month = 0; month < 24; month++) {
    for (let classIndex = 0; classIndex < classIds.length; classIndex++) {
      const date = monthsAgo(month, 5 + classIndex);
      const classStudents = studentIds.slice(classIndex * 4, classIndex * 4 + 4);
      attendance.push({ school: schoolId, class: String(8 + classIndex), section: "A", date, markedBy: teacherIds[classIndex], subject: subjectNames[classIndex], records: classStudents.map((student, index) => ({ student, status: index === month % 4 ? "late" : index === 3 && month % 5 === 0 ? "absent" : "present", remark: "" })) });
      classStudents.forEach((student, index) => attendanceRecords.push({ studentId: student, classId: classIds[classIndex], school: schoolId, date, status: index === month % 5 ? "late" : "present", markedBy: { id: teacherIds[classIndex], role: "teacher", name: teachers[classIndex].name } }));
    }
  }
  await Attendance.insertMany(attendance);
  await AttendanceRecord.insertMany(attendanceRecords);

  const eventData = Array.from({ length: 8 }, (_, index) => {
    const startDate = monthsAgo(index * 3, 15);
    return { school: schoolId, title: pick(["Annual Sports Day", "Parent Teacher Meeting", "Science Exhibition", "Cultural Festival"], index), description: "School community event", startDate, endDate: daysFrom(startDate, 1), eventType: pick(["sports", "meeting", "cultural", "other"], index), location: "Main Campus", createdBy: schoolId };
  });
  await Event.insertMany(eventData);

  const examIds = Array.from({ length: 6 }, () => id());
  await Exam.insertMany(examIds.map((examId, index) => ({ _id: examId, school: schoolId, title: index % 2 ? "Mid Term Examination" : "Unit Test", class: String(8 + index % 3), section: "A", subject: subjectNames[index % subjectNames.length], date: monthsAgo(index * 4, 18), startTime: "09:00", endTime: "11:00", totalMarks: 100, passingMarks: 33, examType: index % 2 ? "mid-term" : "unit-test", createdBy: teacherIds[index % teacherIds.length], instructions: "Bring required stationery.", status: index < 5 ? "completed" : "upcoming" })));
  await Result.insertMany(examIds.slice(0, 5).flatMap((examId, examIndex) => studentIds.slice((examIndex % 3) * 4, (examIndex % 3) * 4 + 4).map((student, studentIndex) => {
    const marksObtained = 58 + ((examIndex + studentIndex) * 7) % 38;
    return { school: schoolId, sourceType: "exam", exam: examId, student, marksObtained, totalMarks: 100, ...gradeFor(marksObtained, 100), remarks: "Good progress", enteredBy: teacherIds[examIndex % 4], isPublished: true, publishedAt: monthsAgo(examIndex * 4, 20) };
  })));

  const feeStructureIds = [id(), id(), id()];
  await FeeStructure.insertMany(feeStructureIds.map((feeId, index) => ({ _id: feeId, school: schoolId, class: String(8 + index), title: pick(["Tuition Fee", "Transport Fee", "Activity Fee"], index), amount: [18000, 6000, 2500][index], dueDate: monthsAgo(-1, 15), frequency: pick(["yearly", "quarterly", "one-time"], index), description: "Demo fee structure", academicYear: "2025-26" })));
  await FeePayment.insertMany(studentIds.map((student, index) => ({ school: schoolId, student, feeStructure: feeStructureIds[index % 3], title: "Tuition Fee", amount: 18000, paidAmount: index % 4 === 0 ? 9000 : 18000, dueDate: monthsAgo(index % 12, 15), paidDate: index % 4 === 0 ? null : monthsAgo(index % 12, 10), status: index % 4 === 0 ? "partial" : "paid", paymentMode: pick(["online", "cash", "cheque"], index), receiptNo: `RCP-DEMO-${String(index + 1).padStart(4, "0")}`, collectedBy: teacherIds[0] })));
  await Concession.insertMany(studentIds.slice(0, 4).map((student, index) => ({ school: schoolId, student, feeStructure: feeStructureIds[0], type: index % 2 ? "Merit" : "Sibling", value: 10 + index * 5, isPct: true, description: "Demo concession" })));

  await Homework.insertMany(Array.from({ length: 12 }, (_, index) => ({ school: schoolId, title: `${subjectNames[index % 5]} Assignment ${index + 1}`, description: "Complete the assigned practice questions.", subject: subjectNames[index % 5], class: String(8 + index % 3), section: "A", dueDate: monthsAgo(index * 2 - 1, 20), assignedBy: teacherIds[index % 4], assignedByModel: "Teacher", maxMarks: 20, submissions: studentIds.slice((index % 3) * 4, (index % 3) * 4 + 4).map((student, studentIndex) => ({ student, submittedAt: monthsAgo(index * 2, 15), status: studentIndex === 3 ? "late" : "graded", marks: 14 + studentIndex, feedback: "Keep practicing." })) })));

  const bookIds = [id(), id(), id(), id()];
  await Book.insertMany(bookIds.map((bookId, index) => ({ _id: bookId, school: schoolId, title: pick(["Mathematics Made Easy", "The Blue Planet", "World History", "JavaScript Basics"], index), author: pick(["R. Singh", "A. Sen", "M. Thomas", "K. Rao"], index), isbn: `97800000000${index}`, category: pick(["Education", "Science", "History", "Technology"], index), totalCopies: 5, availableCopies: index === 0 ? 3 : 5, shelfNumber: `S-${index + 1}`, publishYear: 2020 + index })));
  await BookIssue.insertMany(studentIds.slice(0, 6).map((student, index) => ({ school: schoolId, book: bookIds[index % 4], issuedTo: student, issuedToModel: "Student", issueDate: monthsAgo(index + 1, 3), dueDate: monthsAgo(index, 20), returnDate: index % 2 ? monthsAgo(index, 18) : null, status: index % 2 ? "returned" : "overdue", fine: index % 2 ? 0 : 25, issuedBy: teacherIds[0] })));

  await Notice.insertMany(Array.from({ length: 10 }, (_, index) => ({ school: schoolId, title: pick(["Welcome Back", "Fee Reminder", "Exam Schedule", "Holiday Notice", "Library Update"], index), content: "Please review this important school update.", category: pick(["general", "fee", "exam", "holiday", "event"], index), targetRoles: ["all"], postedBy: index % 3 ? teacherIds[index % 4] : schoolId, postedByModel: index % 3 ? "Teacher" : "Admin", isPinned: index === 0, isUrgent: index === 1, expiryDate: daysFrom(monthsAgo(index * 2), 30), views: 15 + index * 3 })));

  const badgeIds = [id(), id(), id()];
  await Badge.insertMany(badgeIds.map((badgeId, index) => ({ _id: badgeId, school: schoolId, name: pick(["Perfect Attendance", "Math Star", "Helpful Student"], index), description: "Earned through consistent effort.", icon: pick(["calendar-check", "calculator", "heart"], index), color: pick(["#2563EB", "#16A34A", "#EA580C"], index), criteria: "Demonstrate positive learning habits", points: 10 + index * 5 })));
  await UserBadge.insertMany(studentIds.slice(0, 6).map((student, index) => ({ school: schoolId, badge: badgeIds[index % 3], awardedTo: student, awardedToModel: "Student", awardedBy: teacherIds[0], reason: "Outstanding effort", awardedAt: monthsAgo(index + 1, 12) })));
  await Challenge.insertMany(Array.from({ length: 6 }, (_, index) => ({ school: schoolId, class: String(8 + index % 3), section: "A", question: `Daily challenge ${index + 1}: What is ${index + 2} + ${index + 3}?`, answer: String(index * 2 + 5), subject: subjectNames[index % 5], points: 5, postedBy: teacherIds[index % 4], responses: [{ student: studentIds[index % 12], answer: String(index * 2 + 5), isCorrect: true, submittedAt: monthsAgo(index, 13), pointsEarned: 5 }], expiresAt: daysFrom(monthsAgo(index, 10), 7) })));

  const participants = [{ userId: schoolId, role: "schooladmin", name: admin.name }, { userId: teacherIds[0], role: "teacher", name: teachers[0].name }, { userId: studentIds[0], role: "student", name: students[0].name }, { userId: parentIds[0], role: "parent", name: "Arjun Mehta" }];
  const conversationId = id();
  await Conversation.create({ _id: conversationId, school: schoolId, participants, lastMessage: "Thank you for the update.", lastMessageAt: monthsAgo(0, 12), lastSenderId: parentIds[0] });
  await Message.insertMany([{ conversation: conversationId, sender: teacherIds[0], senderRole: "teacher", senderName: teachers[0].name, text: "Your child's attendance report is ready.", school: schoolId, createdAt: monthsAgo(0, 11) }, { conversation: conversationId, sender: parentIds[0], senderRole: "parent", senderName: "Arjun Mehta", text: "Thank you for the update.", school: schoolId, read: true, readAt: monthsAgo(0, 12), createdAt: monthsAgo(0, 12) }]);

  const periodData = ["08:00", "08:45", "09:30", "10:30", "11:15", "12:00"].map((startTime, index) => ({ school: schoolId, label: index === 3 ? "Break" : `Period ${index + 1}`, startTime, endTime: ["08:40", "09:25", "10:10", "11:00", "11:45", "12:45"][index], order: index + 1, periodNumber: index === 3 ? null : index + 1 }));
  await SchoolPeriod.insertMany(periodData);
  await Timetable.insertMany(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].flatMap((day, dayIndex) => classData.map((classItem, classIndex) => ({ school: schoolId, class: classItem.name, section: "A", day, periods: [0, 1, 2, 4].map((period, index) => ({ periodNo: period + 1, subject: subjectNames[(dayIndex + classIndex + index) % 5], teacher: teacherIds[(dayIndex + index) % 4], startTime: periodData[period].startTime, endTime: periodData[period].endTime })) }))));
  await TimetableEntry.insertMany(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].flatMap((day, dayIndex) => classIds.map((classId, classIndex) => [1, 2, 3, 4].map((periodNumber, index) => ({ school: schoolId, classId, day, periodNumber, subject: subjectIds[(dayIndex + classIndex + index) % 5], teacherId: teacherIds[(dayIndex + index) % 4] })))).flat());

  const scheduledExamIds = [id(), id()];
  await ScheduledExam.insertMany(scheduledExamIds.map((scheduledExamId, index) => ({ _id: scheduledExamId, school: schoolId, title: index ? "Annual Examination" : "Midterm Examination", classId: classIds[index], examType: index ? "annual" : "midterm", startDate: monthsAgo(index ? 2 : 8, 1), endDate: monthsAgo(index ? 2 : 8, 5), description: "Scheduled school examination", status: "completed" })));
  await ExamSubject.insertMany(scheduledExamIds.flatMap((examId, examIndex) => subjectIds.slice(0, 3).map((subjectId, subjectIndex) => ({ school: schoolId, examId, subjectId, date: monthsAgo(examIndex ? 2 : 8, 1 + subjectIndex), startTime: "09:00", totalMarks: 100, duration: 120 }))));
  await Test.insertMany(Array.from({ length: 8 }, (_, index) => ({ school: schoolId, title: `${subjectNames[index % 5]} Class Test`, classId: classIds[index % 3], subjectId: subjectIds[index % 5], date: monthsAgo(index * 2, 8), totalMarks: 50, duration: 60, status: index < 7 ? "completed" : "upcoming", createdBy: teacherIds[index % 4] })));

  await StudyMaterial.insertMany(Array.from({ length: 10 }, (_, index) => ({ school: schoolId, title: `${subjectNames[index % 5]} Revision Notes`, description: "Two-year demo study material.", subject: subjectNames[index % 5], class: String(8 + index % 3), fileUrl: `/uploads/study-materials/demo-${index + 1}.pdf`, fileName: `demo-${index + 1}.pdf`, fileType: "pdf", uploadedBy: teacherIds[index % 4], uploaderModel: "Teacher", createdAt: monthsAgo(index * 2), updatedAt: monthsAgo(0) })));
  await BusRoute.insertMany([{ school: schoolId, routeName: "North Campus Route", routeNumber: "R-01", driverName: "Mohan Das", driverPhone: "+91 93333 40001", vehicleNumber: "KA-01-AB-1234", stops: [{ stopName: "North Gate", timing: "07:30", fare: 1200 }, { stopName: "Central Market", timing: "07:45", fare: 1000 }], students: studentIds.slice(0, 6) }, { school: schoolId, routeName: "South Campus Route", routeNumber: "R-02", driverName: "Ramesh Singh", driverPhone: "+91 93333 40002", vehicleNumber: "KA-01-CD-5678", stops: [{ stopName: "South Park", timing: "07:25", fare: 1100 }, { stopName: "Lake Road", timing: "07:40", fare: 900 }], students: studentIds.slice(6) }]);

  const counts = await Promise.all([Admin, Teacher, Student, Parent, Class, Subject, Attendance, AttendanceRecord, Event, Exam, Result, FeeStructure, FeePayment, Concession, Homework, Book, BookIssue, Notice, Permission, Badge, UserBadge, Challenge, Conversation, Message, SchoolPeriod, StudyMaterial, Timetable, TimetableEntry, ScheduledExam, ExamSubject, Test, BusRoute].map(async (model) => [model.modelName, await model.countDocuments()]));
  console.table(Object.fromEntries(counts));
  console.log("\nSeed complete. Development login credentials:");
  console.table([
    { category: "Admin", identifier: admin.email, password: adminPassword },
    ...teachers.map((teacher, index) => ({ category: "Teacher", identifier: teacher.email, password: teacherPasswords[index] })),
    ...students.map((student, index) => ({ category: "Student", identifier: student.studentId, password: studentPasswords[index] })),
    ...parentIds.map((parentId, index) => ({ category: "Parent", identifier: `parent${index + 1}@horizon.demo`, password: parentPasswords[index] })),
  ]);
}

seed().catch((error) => {
  console.error("Seed failed:", error.message);
  process.exitCode = 1;
}).finally(async () => {
  await mongoose.disconnect();
});
