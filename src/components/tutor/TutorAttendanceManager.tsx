import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Calendar, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Search, 
  Filter, 
  PlusCircle, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  BookOpen, 
  FileText, 
  GraduationCap, 
  UserCheck, 
  UserX,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import API_URL from "@/config/api";

interface StudentEntry {
  studentId: string;
  studentName: string;
  studentEmail?: string;
  studentPhone?: string;
  studentClass?: string;
  avatar?: string;
  subjects: string[];
  bookings: any[];
  totalClassesConducted: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  attendanceRate: number;
}

interface AttendanceRecord {
  _id: string;
  tutorId: string;
  tutorName: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
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
  updatedAt?: string;
}

interface TutorAttendanceManagerProps {
  tutorId: string;
  tutorName: string;
  tutorTimezone?: string;
}

export const TutorAttendanceManager: React.FC<TutorAttendanceManagerProps> = ({
  tutorId,
  tutorName,
  tutorTimezone = "Asia/Kolkata"
}) => {
  const [students, setStudents] = useState<StudentEntry[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [studentFilter, setStudentFilter] = useState<string>("all");

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [formStudentId, setFormStudentId] = useState("");
  const [formStudentName, setFormStudentName] = useState("");
  const [formStudentEmail, setFormStudentEmail] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formClassDate, setFormClassDate] = useState("");
  const [formClassTime, setFormClassTime] = useState("");
  const [formStatus, setFormStatus] = useState<"Present" | "Absent" | "Late" | "Excused">("Present");
  const [formTopic, setFormTopic] = useState("");
  const [formRemarks, setFormRemarks] = useState("");
  const [formDuration, setFormDuration] = useState(60);
  const [formBookingId, setFormBookingId] = useState("");
  const [formSessionIndex, setFormSessionIndex] = useState(-1);

  // Edit Modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editStatus, setEditStatus] = useState<"Present" | "Absent" | "Late" | "Excused">("Present");
  const [editClassDate, setEditClassDate] = useState("");
  const [editClassTime, setEditClassTime] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editTopic, setEditTopic] = useState("");
  const [editRemarks, setEditRemarks] = useState("");
  const [editDuration, setEditDuration] = useState(60);

  // Delete Confirm Dialog
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const fetchData = async (isManualRefresh = false) => {
    if (!tutorId) return;
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [recordsRes, studentsRes] = await Promise.all([
        axios.get(`${API_URL}/attendance/tutor/${tutorId}`),
        axios.get(`${API_URL}/attendance/tutor/${tutorId}/registered-students`)
      ]);

      setRecords(recordsRes.data || []);
      setStudents(studentsRes.data || []);
    } catch (err: any) {
      console.error("[AttendanceManager] Failed to fetch data:", err);
      toast.error("Failed to load attendance records.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tutorId]);

  // Open Create Modal
  const handleOpenCreateModal = (presetStudent?: StudentEntry) => {
    const todayStr = getTodayDateString();
    setFormClassDate(todayStr);
    setFormClassTime("10:00 AM - 11:00 AM");
    setFormStatus("Present");
    setFormTopic("");
    setFormRemarks("");
    setFormDuration(60);
    setFormBookingId("");
    setFormSessionIndex(-1);

    if (presetStudent) {
      setFormStudentId(presetStudent.studentId);
      setFormStudentName(presetStudent.studentName);
      setFormStudentEmail(presetStudent.studentEmail || "");
      setFormSubject(presetStudent.subjects[0] || "General Class");
    } else if (students.length > 0) {
      const first = students[0];
      setFormStudentId(first.studentId);
      setFormStudentName(first.studentName);
      setFormStudentEmail(first.studentEmail || "");
      setFormSubject(first.subjects[0] || "General Class");
    } else {
      setFormStudentId("");
      setFormStudentName("");
      setFormStudentEmail("");
      setFormSubject("");
    }

    setIsCreateOpen(true);
  };

  // Student selection in Create Modal
  const handleStudentSelectChange = (sId: string) => {
    setFormStudentId(sId);
    const found = students.find(s => s.studentId === sId);
    if (found) {
      setFormStudentName(found.studentName);
      setFormStudentEmail(found.studentEmail || "");
      if (found.subjects && found.subjects.length > 0) {
        setFormSubject(found.subjects[0]);
      }
    }
  };

  // Submit new attendance record
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStudentId || !formStudentName) {
      toast.error("Please select a registered student.");
      return;
    }
    if (!formClassDate) {
      toast.error("Please select the class date.");
      return;
    }
    if (!formSubject) {
      toast.error("Please specify the subject.");
      return;
    }

    setCreateSubmitting(true);
    try {
      const payload = {
        tutorId,
        tutorName,
        studentId: formStudentId,
        studentName: formStudentName,
        studentEmail: formStudentEmail,
        subject: formSubject,
        classDate: formClassDate,
        classTime: formClassTime,
        status: formStatus,
        topicCovered: formTopic.trim(),
        remarks: formRemarks.trim(),
        durationMinutes: formDuration,
        bookingId: formBookingId || undefined,
        sessionIndex: formSessionIndex !== -1 ? formSessionIndex : undefined
      };

      const res = await axios.post(`${API_URL}/attendance`, payload);
      toast.success(res.data?.message || "Attendance recorded successfully!");
      setIsCreateOpen(false);
      await fetchData(true);
    } catch (err: any) {
      console.error("[AttendanceManager] Record submit error:", err);
      toast.error(err.response?.data?.message || "Failed to submit attendance.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (rec: AttendanceRecord) => {
    setEditingRecord(rec);
    setEditStatus(rec.status);
    setEditClassDate(rec.classDate);
    setEditClassTime(rec.classTime || "");
    setEditSubject(rec.subject);
    setEditTopic(rec.topicCovered || "");
    setEditRemarks(rec.remarks || "");
    setEditDuration(rec.durationMinutes || 60);
    setIsEditOpen(true);
  };

  // Save edit attendance
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    if (!editClassDate) {
      toast.error("Please specify the class date.");
      return;
    }

    setEditSubmitting(true);
    try {
      const payload = {
        status: editStatus,
        classDate: editClassDate,
        classTime: editClassTime,
        subject: editSubject,
        topicCovered: editTopic.trim(),
        remarks: editRemarks.trim(),
        durationMinutes: editDuration
      };

      const res = await axios.put(`${API_URL}/attendance/${editingRecord._id}`, payload);
      toast.success(res.data?.message || "Attendance record updated successfully!");
      setIsEditOpen(false);
      setEditingRecord(null);
      await fetchData(true);
    } catch (err: any) {
      console.error("[AttendanceManager] Edit submit error:", err);
      toast.error(err.response?.data?.message || "Failed to update attendance.");
    } finally {
      setEditSubmitting(false);
    }
  };

  // Delete attendance record
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      await axios.delete(`${API_URL}/attendance/${deleteConfirmId}`);
      toast.success("Attendance record deleted successfully.");
      setDeleteConfirmId(null);
      await fetchData(true);
    } catch (err: any) {
      console.error("[AttendanceManager] Delete error:", err);
      toast.error(err.response?.data?.message || "Failed to delete record.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate summary metrics
  const totalRecords = records.length;
  const presentCount = records.filter(r => r.status === "Present").length;
  const lateCount = records.filter(r => r.status === "Late").length;
  const absentCount = records.filter(r => r.status === "Absent").length;
  const excusedCount = records.filter(r => r.status === "Excused").length;
  const overallRate = totalRecords > 0 ? Math.round(((presentCount + lateCount) / totalRecords) * 100) : 100;

  // Filter records
  const filteredRecords = records.filter(rec => {
    const matchesSearch = 
      rec.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.topicCovered?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.classDate?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || rec.status === statusFilter;
    const matchesStudent = studentFilter === "all" || rec.studentId === studentFilter;

    return matchesSearch && matchesStatus && matchesStudent;
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
                Student Attendance Manager
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-1">
                Record attendance after completed classes, track student regularity, and edit records if mistakes occur.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchData(true)}
                disabled={refreshing || loading}
                className="font-medium h-10 px-3.5 border-border/70"
              >
                <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                onClick={() => handleOpenCreateModal()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md h-10 px-4 flex items-center gap-2 rounded-xl"
              >
                <PlusCircle className="h-4 w-4" />
                Enter Class Attendance
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Attendance Summary Stat Cards */}
        <CardContent className="p-6 pt-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-border/60 bg-card/60 shadow-sm flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Classes</p>
                <p className="text-2xl font-black text-foreground">{totalRecords}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border/60 bg-card/60 shadow-sm flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Attendance Rate</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{overallRate}%</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border/60 bg-card/60 shadow-sm flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Present Classes</p>
                <p className="text-2xl font-black text-foreground">{presentCount + lateCount}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border/60 bg-card/60 shadow-sm flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Missed / Absent</p>
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{absentCount}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registered Students Section */}
      <Card className="shadow-md border-border/60">
        <CardHeader className="p-6 pb-3 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-indigo-500" />
                Registered Students ({students.length})
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Quickly record attendance for any student who has booked or enrolled in classes with you.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
          ) : students.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground bg-secondary/10 rounded-2xl border border-dashed">
              <Users className="mx-auto mb-3 h-10 w-10 opacity-30 text-indigo-500" />
              <h4 className="text-sm font-semibold text-foreground">No Registered Students Found</h4>
              <p className="text-xs mt-1">Students will appear here once they book demo or regular classes with you.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.map(std => {
                const isHighAttendance = std.attendanceRate >= 80;
                return (
                  <div
                    key={std.studentId}
                    className="p-4 rounded-xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center shrink-0 text-sm">
                          {std.studentName.charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-bold text-sm text-foreground truncate">{std.studentName}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {std.subjects.length > 0 ? std.subjects.join(", ") : "Enrolled Student"}
                          </p>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={`text-[11px] font-bold px-2 py-0.5 border ${
                          isHighAttendance
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        }`}
                      >
                        {std.attendanceRate}% Attendance
                      </Badge>
                    </div>

                    <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{std.totalClassesConducted} Classes Logged</span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenCreateModal(std)}
                        className="h-8 text-xs font-semibold px-2.5 rounded-lg text-primary hover:bg-primary/10"
                      >
                        <PlusCircle className="h-3.5 w-3.5 mr-1" />
                        Mark Attendance
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance History Records Table */}
      <Card className="shadow-md border-border/60">
        <CardHeader className="p-6 pb-4 border-b border-border/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Attendance Log & Records
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                View submitted class attendances. Click "Edit" on any row to rectify any mistakes.
              </CardDescription>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search student, subject..."
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

              {students.length > 0 && (
                <Select value={studentFilter} onValueChange={setStudentFilter}>
                  <SelectTrigger className="w-[145px] h-9 text-xs rounded-xl">
                    <SelectValue placeholder="All Students" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    {students.map(s => (
                      <SelectItem key={s.studentId} value={s.studentId}>
                        {s.studentName}
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
              <h4 className="text-base font-semibold text-foreground">No Attendance Records Found</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                {records.length === 0
                  ? "You have not recorded attendance for any completed classes yet. Click 'Enter Class Attendance' to get started."
                  : "No records match your search or filter criteria."}
              </p>
              {records.length === 0 && (
                <Button
                  onClick={() => handleOpenCreateModal()}
                  className="mt-4 font-semibold text-xs h-9 rounded-xl"
                >
                  <PlusCircle className="h-4 w-4 mr-1.5" />
                  Take Attendance Now
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/40 bg-secondary/30 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-4">Class Date & Time</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Topics Covered & Notes</th>
                    <th className="py-3 px-4 text-right">Actions</th>
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
                        <div className="font-semibold text-foreground">{rec.studentName}</div>
                        {rec.studentEmail && (
                          <div className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                            {rec.studentEmail}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-medium text-foreground bg-primary/10 text-primary px-2 py-0.5 rounded-md inline-block">
                          {rec.subject}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(rec.status)}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        {rec.topicCovered ? (
                          <p className="font-medium text-foreground truncate" title={rec.topicCovered}>
                            <BookOpen className="inline h-3 w-3 mr-1 text-primary/70" />
                            {rec.topicCovered}
                          </p>
                        ) : (
                          <span className="text-muted-foreground italic">No topic noted</span>
                        )}
                        {rec.remarks && (
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5" title={rec.remarks}>
                            {rec.remarks}
                          </p>
                        )}
                        {rec.lastEditedAt && (
                          <span className="inline-block text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.2 rounded mt-1">
                            Edited
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditModal(rec)}
                            className="h-8 px-2.5 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/10 rounded-lg"
                            title="Edit attendance if mistake happened"
                          >
                            <Edit3 className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteConfirmId(rec._id)}
                            className="h-8 px-2 text-xs font-semibold text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 rounded-lg"
                            title="Delete record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE ATTENDANCE MODAL */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden border border-border/80 shadow-2xl rounded-2xl bg-card">
          <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 pb-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shrink-0">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                  Record Class Attendance
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Enter student attendance after a class has been conducted.
                </DialogDescription>
              </div>
            </div>
          </div>

          <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
            {/* Student Select */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Registered Student *</Label>
              {students.length > 0 ? (
                <Select value={formStudentId} onValueChange={handleStudentSelectChange}>
                  <SelectTrigger className="h-10 text-xs rounded-xl">
                    <SelectValue placeholder="Select registered student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map(s => (
                      <SelectItem key={s.studentId} value={s.studentId}>
                        {s.studentName} {s.studentEmail ? `(${s.studentEmail})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Student Name"
                  value={formStudentName}
                  onChange={e => {
                    setFormStudentName(e.target.value);
                    if (!formStudentId) setFormStudentId(`student_${Date.now()}`);
                  }}
                  className="h-10 text-xs rounded-xl"
                  required
                />
              )}
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Subject *</Label>
              <Input
                placeholder="e.g. Mathematics, Physics, English"
                value={formSubject}
                onChange={e => setFormSubject(e.target.value)}
                className="h-10 text-xs rounded-xl"
                required
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Class Date *</Label>
                <Input
                  type="date"
                  value={formClassDate}
                  onChange={e => setFormClassDate(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Class Timing</Label>
                <Input
                  placeholder="e.g. 10:00 AM - 11:00 AM"
                  value={formClassTime}
                  onChange={e => setFormClassTime(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Attendance Status Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Attendance Status *</Label>
              <div className="grid grid-cols-4 gap-2">
                {(["Present", "Absent", "Late", "Excused"] as const).map(st => {
                  const isSelected = formStatus === st;
                  let borderStyle = "";
                  let textStyle = "";
                  if (st === "Present") {
                    borderStyle = isSelected ? "border-emerald-500 bg-emerald-500/15" : "hover:border-emerald-400";
                    textStyle = "text-emerald-600 dark:text-emerald-400";
                  } else if (st === "Absent") {
                    borderStyle = isSelected ? "border-rose-500 bg-rose-500/15" : "hover:border-rose-400";
                    textStyle = "text-rose-600 dark:text-rose-400";
                  } else if (st === "Late") {
                    borderStyle = isSelected ? "border-amber-500 bg-amber-500/15" : "hover:border-amber-400";
                    textStyle = "text-amber-600 dark:text-amber-400";
                  } else {
                    borderStyle = isSelected ? "border-blue-500 bg-blue-500/15" : "hover:border-blue-400";
                    textStyle = "text-blue-600 dark:text-blue-400";
                  }

                  return (
                    <button
                      type="button"
                      key={st}
                      onClick={() => setFormStatus(st)}
                      className={`p-2.5 rounded-xl border font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all ${borderStyle}`}
                    >
                      {st === "Present" && <CheckCircle className={`h-4 w-4 ${textStyle}`} />}
                      {st === "Absent" && <UserX className={`h-4 w-4 ${textStyle}`} />}
                      {st === "Late" && <Clock className={`h-4 w-4 ${textStyle}`} />}
                      {st === "Excused" && <AlertCircle className={`h-4 w-4 ${textStyle}`} />}
                      <span className={textStyle}>{st}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Topic Covered */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Topic Covered / Class Summary</Label>
              <Input
                placeholder="e.g. Chapter 4: Quadratic Equations & Practice Questions"
                value={formTopic}
                onChange={e => setFormTopic(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            {/* Remarks / Feedback */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Teacher Remarks / Homework</Label>
              <Textarea
                placeholder="Optional feedback for the student (e.g. Great participation, solve exercise 4.2)"
                value={formRemarks}
                onChange={e => setFormRemarks(e.target.value)}
                rows={2}
                className="text-xs rounded-xl resize-none"
              />
            </div>

            {/* Modal Actions */}
            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="h-10 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createSubmitting}
                className="h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md"
              >
                {createSubmitting ? "Submitting..." : "Submit Attendance"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT ATTENDANCE MODAL (If mistakes happened) */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden border border-border/80 shadow-2xl rounded-2xl bg-card">
          <div className="bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent p-6 pb-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shrink-0">
                <Edit3 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                  Edit Student Attendance
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Update status, date, or remarks if a mistake was made during submission.
                </DialogDescription>
              </div>
            </div>
          </div>

          <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
            {/* Student Preview Info */}
            <div className="p-3 bg-secondary/30 rounded-xl border border-border/50 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Student</span>
                <span className="font-bold text-sm text-foreground">{editingRecord?.studentName}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Subject</span>
                <span className="font-semibold text-xs text-primary">{editingRecord?.subject}</span>
              </div>
            </div>

            {/* Attendance Status Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Rectify Attendance Status *</Label>
              <div className="grid grid-cols-4 gap-2">
                {(["Present", "Absent", "Late", "Excused"] as const).map(st => {
                  const isSelected = editStatus === st;
                  let borderStyle = "";
                  let textStyle = "";
                  if (st === "Present") {
                    borderStyle = isSelected ? "border-emerald-500 bg-emerald-500/15" : "hover:border-emerald-400";
                    textStyle = "text-emerald-600 dark:text-emerald-400";
                  } else if (st === "Absent") {
                    borderStyle = isSelected ? "border-rose-500 bg-rose-500/15" : "hover:border-rose-400";
                    textStyle = "text-rose-600 dark:text-rose-400";
                  } else if (st === "Late") {
                    borderStyle = isSelected ? "border-amber-500 bg-amber-500/15" : "hover:border-amber-400";
                    textStyle = "text-amber-600 dark:text-amber-400";
                  } else {
                    borderStyle = isSelected ? "border-blue-500 bg-blue-500/15" : "hover:border-blue-400";
                    textStyle = "text-blue-600 dark:text-blue-400";
                  }

                  return (
                    <button
                      type="button"
                      key={st}
                      onClick={() => setEditStatus(st)}
                      className={`p-2.5 rounded-xl border font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all ${borderStyle}`}
                    >
                      {st === "Present" && <CheckCircle className={`h-4 w-4 ${textStyle}`} />}
                      {st === "Absent" && <UserX className={`h-4 w-4 ${textStyle}`} />}
                      {st === "Late" && <Clock className={`h-4 w-4 ${textStyle}`} />}
                      {st === "Excused" && <AlertCircle className={`h-4 w-4 ${textStyle}`} />}
                      <span className={textStyle}>{st}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Class Date *</Label>
                <Input
                  type="date"
                  value={editClassDate}
                  onChange={e => setEditClassDate(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Class Timing</Label>
                <Input
                  placeholder="e.g. 10:00 AM - 11:00 AM"
                  value={editClassTime}
                  onChange={e => setEditClassTime(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Subject</Label>
              <Input
                value={editSubject}
                onChange={e => setEditSubject(e.target.value)}
                className="h-10 text-xs rounded-xl"
                required
              />
            </div>

            {/* Topic Covered */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Topic Covered</Label>
              <Input
                placeholder="Topic explained during the class"
                value={editTopic}
                onChange={e => setEditTopic(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            {/* Remarks */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Remarks / Notes</Label>
              <Textarea
                placeholder="Teacher notes or feedback"
                value={editRemarks}
                onChange={e => setEditRemarks(e.target.value)}
                rows={2}
                className="text-xs rounded-xl resize-none"
              />
            </div>

            {/* Modal Actions */}
            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                className="h-10 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editSubmitting}
                className="h-10 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md"
              >
                {editSubmitting ? "Updating..." : "Save Corrections"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={!!deleteConfirmId} onOpenChange={open => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-rose-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Attendance Record?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Are you sure you want to delete this attendance entry? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-3 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              className="h-9 text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="h-9 text-xs font-bold rounded-xl"
            >
              {isDeleting ? "Deleting..." : "Yes, Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TutorAttendanceManager;

