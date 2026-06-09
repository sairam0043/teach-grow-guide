export type TutorCategory = "Academic" | "Extracurricular";
export type TeachingMode = "Online" | "Offline" | "Both";
export type ApprovalStatus = "Pending" | "Approved" | "Rejected";

export interface DemoSlot {
  id: string;
  date: string;
  time: string;
  available: boolean;
}

export interface Tutor {
  id: string;
  name: string;
  email: string;
  phone: string;
  photo: string;
  qualification: string;
  experience: number;
  bio: string;
  category: TutorCategory;
  subjects: string[];
  mode: TeachingMode;
  city: string;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  approvalStatus: ApprovalStatus;
  demoSlots: DemoSlot[];
  availability?: { day: string; startTime: string; endTime: string }[];
}

export const mockTutors: Tutor[] = [
  {
    id: "1",
    name: "Priya Sharma",
    email: "priya@example.com",
    phone: "+91 98765 43210",
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face",
    qualification: "M.Sc. Mathematics, IIT Delhi",
    experience: 8,
    bio: "Passionate mathematics educator with 8 years of experience preparing students for competitive exams. I believe every student can excel with the right guidance and practice.",
    category: "Academic",
    subjects: ["Mathematics", "Physics"],
    mode: "Both",
    city: "Delhi",
    rating: 4.9,
    reviewCount: 124,
    hourlyRate: 800,
    approvalStatus: "Approved",
    demoSlots: [
      { id: "d1", date: "2026-03-12", time: "10:00 AM", available: true },
      { id: "d2", date: "2026-03-12", time: "2:00 PM", available: true },
      { id: "d3", date: "2026-03-13", time: "11:00 AM", available: true },
    ],
  },
  {
    id: "2",
    name: "Rahul Verma",
    email: "rahul@example.com",
    phone: "+91 98765 43211",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
    qualification: "B.Tech Computer Science, NIT",
    experience: 5,
    bio: "Full-stack developer turned educator. I teach coding with real-world projects and help students build portfolios that stand out.",
    category: "Academic",
    subjects: ["Coding", "Mathematics"],
    mode: "Online",
    city: "Bangalore",
    rating: 4.7,
    reviewCount: 89,
    hourlyRate: 1000,
    approvalStatus: "Approved",
    demoSlots: [
      { id: "d4", date: "2026-03-12", time: "4:00 PM", available: true },
      { id: "d5", date: "2026-03-14", time: "10:00 AM", available: true },
    ],
  },
  {
    id: "3",
    name: "Ananya Krishnan",
    email: "ananya@example.com",
    phone: "+91 98765 43212",
    photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face",
    qualification: "MA English Literature, JNU",
    experience: 6,
    bio: "English language specialist focused on communication skills, creative writing, and literature appreciation. Making language learning fun and effective.",
    category: "Academic",
    subjects: ["English"],
    mode: "Both",
    city: "Mumbai",
    rating: 4.8,
    reviewCount: 67,
    hourlyRate: 700,
    approvalStatus: "Approved",
    demoSlots: [
      { id: "d6", date: "2026-03-13", time: "3:00 PM", available: true },
      { id: "d7", date: "2026-03-15", time: "11:00 AM", available: true },
    ],
  },
  {
    id: "4",
    name: "Vikram Singh",
    email: "vikram@example.com",
    phone: "+91 98765 43213",
    photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
    qualification: "Diploma in Western Classical Music, Trinity College",
    experience: 12,
    bio: "Professional musician and music educator. Teaching guitar, piano, and music theory to students of all ages. Let music transform your life!",
    category: "Extracurricular",
    subjects: ["Music"],
    mode: "Both",
    city: "Pune",
    rating: 4.9,
    reviewCount: 156,
    hourlyRate: 900,
    approvalStatus: "Approved",
    demoSlots: [
      { id: "d8", date: "2026-03-12", time: "5:00 PM", available: true },
      { id: "d9", date: "2026-03-14", time: "3:00 PM", available: true },
    ],
  },
  {
    id: "5",
    name: "Meera Patel",
    email: "meera@example.com",
    phone: "+91 98765 43214",
    photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face",
    qualification: "BFA in Fine Arts, MS University",
    experience: 7,
    bio: "Visual artist specializing in watercolor, sketching, and digital art. I help students discover their artistic voice through personalized guidance.",
    category: "Extracurricular",
    subjects: ["Art"],
    mode: "Offline",
    city: "Ahmedabad",
    rating: 4.6,
    reviewCount: 43,
    hourlyRate: 600,
    approvalStatus: "Approved",
    demoSlots: [
      { id: "d10", date: "2026-03-13", time: "10:00 AM", available: true },
      { id: "d11", date: "2026-03-15", time: "2:00 PM", available: true },
    ],
  },
  {
    id: "6",
    name: "Arjun Nair",
    email: "arjun@example.com",
    phone: "+91 98765 43215",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face",
    qualification: "M.Sc. Chemistry, IISC Bangalore",
    experience: 10,
    bio: "Chemistry made simple! I use visual demonstrations and real-world examples to make complex concepts click. Specializing in organic and physical chemistry.",
    category: "Academic",
    subjects: ["Chemistry", "Biology"],
    mode: "Online",
    city: "Chennai",
    rating: 4.8,
    reviewCount: 98,
    hourlyRate: 850,
    approvalStatus: "Approved",
    demoSlots: [
      { id: "d12", date: "2026-03-12", time: "9:00 AM", available: true },
      { id: "d13", date: "2026-03-14", time: "1:00 PM", available: true },
    ],
  },
];
