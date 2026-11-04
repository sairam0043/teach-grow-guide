import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  BookOpen,
  User,
  GraduationCap,
  Award,
  RefreshCw,
  UserCheck,
  UserX,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import API_URL from "@/config/api";

interface AttendanceRecord {
  _id: string;
  tutorId: string;
  tutorName: string;
  studentId: string;
  studentName: string;
  subject: string;
  bookingId?: string;
  sessionIndex?: number;
  classDate: string;
  classTime?: string;
  status: "Present" | "Absent" | "Late" | "Excused";
  topicCovered?: string;
  remarks?: string;
  durationMinutes?: number;
  markedAt?: string;
  lastEditedAt?: string;
  createdAt?: string;
}

interface AttendanceStats {
  totalClasses: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  attendedCount: number;
  attendancePercentage: number;
}

interface StudentAttendanceViewerProps {
  studentId: string;
  studentName?: string;
  studentTimezone?: string;
}

export const StudentAttendanceViewer: React.FC<StudentAttendanceViewerProps> = ({
  studentId,
  studentName = "Student",
  studentTimezone = "Asia/Kolkata"
}) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    totalClasses: 0,
    presentCount: 0,
    lateCount: 0,
    absentCount: 0,
    excusedCount: 0,
    attendedCount: 0,
    attendancePercentage: 100
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tutorFilter, setTutorFilter] = useState("all");

  const fetchAttendance = async (isManual = false) => {
    if (!studentId) return;
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await axios.get(`${API_URL}/attendance/student/${studentId}`);
      setRecords(res.data?.records || []);
      if (res.data?.stats) {
        setStats(res.data.stats);
      }
    } catch (err: any) {
      console.error("[StudentAttendance] Failed to fetch records:", err);
      toast.error("Failed to load your attendance history.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [studentId]);

  // Unique tutors for filter
  const uniqueTutors = Array.from(new Set(records.map(r => r.tutorName).filter(Boolean)));

  // Filter records
  const filteredRecords = records.filter(rec => {
    const matchesSearch =
      rec.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.tutorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.topicCovered?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.classDate?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || rec.status === statusFilter;
    const matchesTutor = tutorFilter === "all" || rec.tutorName === tutorFilter;

    return matchesSearch && matchesStatus && matchesTutor;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Present":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-bold text-xs py-0.5 px-2.5">
            <CheckCircle className="h-3 w-3" /> Present
          </Badge>
        );
      case "Late":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1 font-bold text-xs py-0.5 px-2.5">
            <Clock className="h-3 w-3" /> Late
          </Badge>
        );
      case "Absent":
        return (
          <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1 font-bold text-xs py-0.5 px-2.5">
            <UserX className="h-3 w-3" /> Absent
          </Badge>
        );
      case "Excused":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1 font-bold text-xs py-0.5 px-2.5">
            <AlertCircle className="h-3 w-3" /> Excused
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPercentageColor = (rate: number) => {
    if (rate >= 85) return "text-emerald-600 dark:text-emerald-400";
    if (rate >= 70) return "text-amber-600 dark:text-amber-400";
    return "text-rose-600 dark:text-rose-400";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner Card */}
      <Card className="shadow-md border-border/60 bg-gradient-to-r from-card via-card to-primary/5">
        <CardHeader className="p-6 pb-4 border-b border-border/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-black flex items-center gap-2.5 text-foreground">
                <span className="p-2 rounded-xl bg-primary/10 text-primary">
                  <UserCheck className="h-6 w-6" />
                </span>
                My Class Attendance
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-1">
                View your complete class attendance history, teacher remarks, and topic coverage logged by your tutors.
              </CardDescription>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAttendance(true)}
              disabled={refreshing || loading}
              className="font-medium h-10 px-3.5 border-border/70 self-start md:self-auto"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh Attendance
            </Button>
          </div>
        </CardHeader>

        {/* Stats Row */}
        <CardContent className="p-6 pt-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Overall Rate */}
            <div className="p-4 rounded-xl border border-border/60 bg-card/60 shadow-sm flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Attendance Rate</p>
                <p className={`text-2xl font-black ${getPercentageColor(stats.attendancePercentage)}`}>
                  {stats.totalClasses > 0 ? `${stats.attendancePercentage}%` : "100%"}
                </p>
              </div>
            </div>

            {/* Total Classes */}
            <div className="p-4 rounded-xl border border-border/60 bg-card/60 shadow-sm flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Classes</p>
                <p className="text-2xl font-black text-foreground">{stats.totalClasses}</p>
              </div>
            </div>

            {/* Classes Attended */}
            <div className="p-4 rounded-xl border border-border/60 bg-card/60 shadow-sm flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Classes Attended</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {stats.presentCount + stats.lateCount}
                </p>
              </div>
            </div>

            {/* Classes Missed */}
            <div className="p-4 rounded-xl border border-border/60 bg-card/60 shadow-sm flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Missed Classes</p>
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{stats.absentCount}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance History Records */}
      <Card className="shadow-md border-border/60">
        <CardHeader className="p-6 pb-4 border-b border-border/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Attendance Log Records
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Sessions marked by your tutors after class completion.
              </CardDescription>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search subject, tutor..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[125px] h-9 text-xs rounded-xl">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Present">Present</SelectItem>
                  <SelectItem value="Absent">Absent</SelectItem>
                  <SelectItem value="Late">Late</SelectItem>
                  <SelectItem value="Excused">Excused</SelectItem>
                </SelectContent>
              </Select>

              {uniqueTutors.length > 1 && (
                <Select value={tutorFilter} onValueChange={setTutorFilter}>
                  <SelectTrigger className="w-[140px] h-9 text-xs rounded-xl">
                    <SelectValue placeholder="All Tutors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tutors</SelectItem>
                    {uniqueTutors.map(tName => (
                      <SelectItem key={tName} value={tName}>
                        {tName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground bg-secondary/5">
              <UserCheck className="mx-auto mb-3 h-12 w-12 opacity-30 text-primary" />
              <h4 className="text-base font-semibold text-foreground">No Attendance Records Yet</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                {records.length === 0
                  ? "Your tutor will record attendance after your class session is completed. Your attendance logs will appear right here."
                  : "No attendance records match your current filter."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/40 bg-secondary/30 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-4">Class Date & Time</th>
                    <th className="py-3 px-4">Tutor</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Attendance Status</th>
                    <th className="py-3 px-4">Topics Covered & Teacher Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-xs">
                  {filteredRecords.map(rec => (
                    <tr key={rec._id} className="hover:bg-secondary/15 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-foreground flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                          {rec.classDate}
                        </div>
                        {rec.classTime && (
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" />
                            {rec.classTime}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          {rec.tutorName}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-medium text-foreground bg-primary/10 text-primary px-2 py-0.5 rounded-md inline-block">
                          {rec.subject}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(rec.status)}
                      </td>

                      <td className="py-3.5 px-4 max-w-md">
                        {rec.topicCovered ? (
                          <p className="font-medium text-foreground" title={rec.topicCovered}>
                            <BookOpen className="inline h-3 w-3 mr-1 text-primary/70" />
                            {rec.topicCovered}
                          </p>
                        ) : (
                          <span className="text-muted-foreground italic">Regular lesson</span>
                        )}
                        {rec.remarks && (
                          <p className="text-[11px] text-muted-foreground mt-0.5" title={rec.remarks}>
                            <span className="font-semibold">Note:</span> {rec.remarks}
                          </p>
                        )}
                        {rec.lastEditedAt && (
                          <span className="inline-block text-[10px] text-muted-foreground bg-secondary/50 px-1.5 py-0.2 rounded mt-1">
                            Verified by Tutor
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentAttendanceViewer;

