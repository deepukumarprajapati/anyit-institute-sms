export type UserRole = "school_admin" | "teacher" | "student" | "parent";

export interface MockUser {
  id: string;
  email: string;
  password: string;
  role: UserRole;
  name: string;
  avatar: string;
}

export const mockUsers: MockUser[] = [
  { id: "u2", email: "admin@school.com", password: "admin123", role: "school_admin", name: "Sarah Johnson", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&fit=crop&crop=face" },
  { id: "u3", email: "teacher@school.com", password: "teacher123", role: "teacher", name: "Robert Chen", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=face" },
  { id: "u4", email: "student@school.com", password: "student123", role: "student", name: "Alex Thompson", avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=64&h=64&fit=crop&crop=face" },
  { id: "u5", email: "parent@school.com", password: "parent123", role: "parent", name: "Mary Parker", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop&crop=face" },
];

export interface Student {
  id: string;
  name: string;
  class: string;
  section: string;
  rollNumber: string;
  attendance: number;
  feeStatus: "paid" | "pending" | "overdue";
  avatar: string;
  parentName: string;
  parentPhone: string;
  email: string;
  address: string;
  dateOfBirth: string;
  admissionDate: string;
}

export const mockStudents: Student[] = [
  { id: "s1", name: "Emma Wilson", class: "10", section: "A", rollNumber: "1001", attendance: 96, feeStatus: "paid", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=64&h=64&fit=crop&crop=face", parentName: "John Wilson", parentPhone: "+1 234-567-8901", email: "emma@school.com", address: "123 Oak St", dateOfBirth: "2008-05-15", admissionDate: "2023-04-01" },
  { id: "s2", name: "Liam Johnson", class: "10", section: "B", rollNumber: "1002", attendance: 91, feeStatus: "pending", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=64&h=64&fit=crop&crop=face", parentName: "David Johnson", parentPhone: "+1 234-567-8902", email: "liam@school.com", address: "456 Pine Ave", dateOfBirth: "2008-08-22", admissionDate: "2023-04-01" },
  { id: "s3", name: "Sophia Martinez", class: "9", section: "A", rollNumber: "901", attendance: 88, feeStatus: "overdue", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=face", parentName: "Carlos Martinez", parentPhone: "+1 234-567-8903", email: "sophia@school.com", address: "789 Elm Dr", dateOfBirth: "2009-02-10", admissionDate: "2023-04-01" },
  { id: "s4", name: "Noah Brown", class: "9", section: "B", rollNumber: "902", attendance: 94, feeStatus: "paid", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=64&h=64&fit=crop&crop=face", parentName: "Michael Brown", parentPhone: "+1 234-567-8904", email: "noah@school.com", address: "321 Maple Ln", dateOfBirth: "2009-11-30", admissionDate: "2023-04-01" },
  { id: "s5", name: "Olivia Davis", class: "8", section: "A", rollNumber: "801", attendance: 97, feeStatus: "paid", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=64&h=64&fit=crop&crop=face", parentName: "James Davis", parentPhone: "+1 234-567-8905", email: "olivia@school.com", address: "654 Cedar Ct", dateOfBirth: "2010-07-04", admissionDate: "2023-04-01" },
  { id: "s6", name: "William Garcia", class: "8", section: "B", rollNumber: "802", attendance: 85, feeStatus: "pending", avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=64&h=64&fit=crop&crop=face", parentName: "Luis Garcia", parentPhone: "+1 234-567-8906", email: "william@school.com", address: "987 Birch Rd", dateOfBirth: "2010-01-18", admissionDate: "2023-04-01" },
  { id: "s7", name: "Ava Anderson", class: "7", section: "A", rollNumber: "701", attendance: 92, feeStatus: "paid", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=64&h=64&fit=crop&crop=face", parentName: "Mark Anderson", parentPhone: "+1 234-567-8907", email: "ava@school.com", address: "147 Walnut Bl", dateOfBirth: "2011-09-25", admissionDate: "2024-04-01" },
  { id: "s8", name: "James Lee", class: "7", section: "B", rollNumber: "702", attendance: 89, feeStatus: "overdue", avatar: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=64&h=64&fit=crop&crop=face", parentName: "Kevin Lee", parentPhone: "+1 234-567-8908", email: "james@school.com", address: "258 Spruce Way", dateOfBirth: "2011-03-12", admissionDate: "2024-04-01" },
];

export interface Teacher {
  id: string;
  name: string;
  subject: string;
  email: string;
  phone: string;
  avatar: string;
  classes: string[];
  qualification: string;
  experience: string;
  joinDate: string;
}

export const mockTeachers: Teacher[] = [
  { id: "t1", name: "Dr. Robert Chen", subject: "Mathematics", email: "robert@school.com", phone: "+1 234-567-1001", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=face", classes: ["10A", "10B", "9A"], qualification: "Ph.D. Mathematics", experience: "12 years", joinDate: "2018-08-01" },
  { id: "t2", name: "Ms. Emily Watson", subject: "English", email: "emily@school.com", phone: "+1 234-567-1002", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=64&h=64&fit=crop&crop=face", classes: ["9A", "9B", "8A"], qualification: "M.A. English Literature", experience: "8 years", joinDate: "2020-06-15" },
  { id: "t3", name: "Mr. David Kim", subject: "Physics", email: "david@school.com", phone: "+1 234-567-1003", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=64&h=64&fit=crop&crop=face", classes: ["10A", "10B"], qualification: "M.Sc. Physics", experience: "10 years", joinDate: "2019-01-10" },
  { id: "t4", name: "Ms. Lisa Park", subject: "Chemistry", email: "lisa@school.com", phone: "+1 234-567-1004", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=64&h=64&fit=crop&crop=face", classes: ["9A", "9B", "8B"], qualification: "M.Sc. Chemistry", experience: "6 years", joinDate: "2021-03-20" },
  { id: "t5", name: "Mr. James Taylor", subject: "History", email: "james@school.com", phone: "+1 234-567-1005", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face", classes: ["8A", "8B", "7A"], qualification: "M.A. History", experience: "15 years", joinDate: "2015-07-01" },
  { id: "t6", name: "Ms. Anna Singh", subject: "Biology", email: "anna@school.com", phone: "+1 234-567-1006", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=face", classes: ["7A", "7B"], qualification: "M.Sc. Biology", experience: "5 years", joinDate: "2022-01-15" },
];

export interface ClassData {
  id: string;
  name: string;
  section: string;
  classTeacher: string;
  studentCount: number;
  room: string;
}

export const mockClasses: ClassData[] = [
  { id: "c1", name: "Class 10", section: "A", classTeacher: "Dr. Robert Chen", studentCount: 35, room: "Room 101" },
  { id: "c2", name: "Class 10", section: "B", classTeacher: "Mr. David Kim", studentCount: 33, room: "Room 102" },
  { id: "c3", name: "Class 9", section: "A", classTeacher: "Ms. Emily Watson", studentCount: 38, room: "Room 201" },
  { id: "c4", name: "Class 9", section: "B", classTeacher: "Ms. Lisa Park", studentCount: 36, room: "Room 202" },
  { id: "c5", name: "Class 8", section: "A", classTeacher: "Mr. James Taylor", studentCount: 34, room: "Room 301" },
  { id: "c6", name: "Class 8", section: "B", classTeacher: "Ms. Anna Singh", studentCount: 32, room: "Room 302" },
  { id: "c7", name: "Class 7", section: "A", classTeacher: "Mr. James Taylor", studentCount: 30, room: "Room 401" },
  { id: "c8", name: "Class 7", section: "B", classTeacher: "Ms. Anna Singh", studentCount: 31, room: "Room 402" },
];

export interface Exam {
  id: string;
  name: string;
  class: string;
  subject: string;
  date: string;
  totalMarks: number;
  status: "upcoming" | "ongoing" | "completed";
}

export const mockExams: Exam[] = [
  { id: "e1", name: "Mid-Term Examination", class: "10A", subject: "Mathematics", date: "2026-04-15", totalMarks: 100, status: "upcoming" },
  { id: "e2", name: "Mid-Term Examination", class: "10A", subject: "Physics", date: "2026-04-17", totalMarks: 100, status: "upcoming" },
  { id: "e3", name: "Mid-Term Examination", class: "9A", subject: "English", date: "2026-04-15", totalMarks: 100, status: "upcoming" },
  { id: "e4", name: "Unit Test 3", class: "10A", subject: "Mathematics", date: "2026-03-10", totalMarks: 50, status: "completed" },
  { id: "e5", name: "Unit Test 3", class: "9A", subject: "Chemistry", date: "2026-03-08", totalMarks: 50, status: "completed" },
  { id: "e6", name: "Practical Exam", class: "10B", subject: "Physics", date: "2026-03-20", totalMarks: 30, status: "ongoing" },
];

export interface Notice {
  id: string;
  title: string;
  description: string;
  date: string;
  author: string;
  priority: "low" | "medium" | "high";
  attachment?: string;
}

export const mockNotices: Notice[] = [
  { id: "n1", title: "Annual Sports Day", description: "Annual sports day will be held on April 25th. All students are requested to participate.", date: "2026-03-10", author: "Principal", priority: "high" },
  { id: "n2", title: "Parent-Teacher Meeting", description: "PTM scheduled for March 28th from 10 AM to 2 PM. Parents must attend.", date: "2026-03-08", author: "Admin Office", priority: "high" },
  { id: "n3", title: "Library Book Return", description: "All borrowed library books must be returned by March 20th.", date: "2026-03-05", author: "Librarian", priority: "medium" },
  { id: "n4", title: "Science Fair Registration", description: "Registration for the annual science fair is now open. Last date: April 1st.", date: "2026-03-03", author: "Science Dept.", priority: "medium" },
  { id: "n5", title: "Holiday Notice", description: "School will remain closed on March 14th for a national holiday.", date: "2026-03-01", author: "Admin Office", priority: "low" },
];

export interface Homework {
  id: string;
  title: string;
  subject: string;
  class: string;
  teacher: string;
  dueDate: string;
  description: string;
  status: "active" | "completed" | "overdue";
  submissions: number;
  totalStudents: number;
}

export const mockHomework: Homework[] = [
  { id: "h1", title: "Algebra Worksheet Ch. 5", subject: "Mathematics", class: "10A", teacher: "Dr. Robert Chen", dueDate: "2026-03-18", description: "Complete all exercises from Chapter 5 on quadratic equations.", status: "active", submissions: 28, totalStudents: 35 },
  { id: "h2", title: "Essay: Climate Change", subject: "English", class: "9A", teacher: "Ms. Emily Watson", dueDate: "2026-03-20", description: "Write a 500-word essay on the effects of climate change.", status: "active", submissions: 20, totalStudents: 38 },
  { id: "h3", title: "Physics Lab Report", subject: "Physics", class: "10B", teacher: "Mr. David Kim", dueDate: "2026-03-15", description: "Submit the lab report for the pendulum experiment.", status: "overdue", submissions: 30, totalStudents: 33 },
  { id: "h4", title: "History Timeline Project", subject: "History", class: "8A", teacher: "Mr. James Taylor", dueDate: "2026-03-12", description: "Create a visual timeline of World War II events.", status: "completed", submissions: 34, totalStudents: 34 },
  { id: "h5", title: "Chemical Equations", subject: "Chemistry", class: "9B", teacher: "Ms. Lisa Park", dueDate: "2026-03-22", description: "Balance the chemical equations on page 120-122.", status: "active", submissions: 15, totalStudents: 36 },
];

export const roleLabels: Record<UserRole, string> = {
  school_admin: "School Admin",
  teacher: "Teacher",
  student: "Student",
  parent: "Parent",
};
