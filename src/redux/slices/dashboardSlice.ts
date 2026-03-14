import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const fetchAdminStats = createAsyncThunk(
  'dashboard/fetchAdminStats',
  async () => {
    const res = await axios.get(`${API_URL}/dashboard/admin`);
    return res.data;
  }
);

export const fetchTutorStats = createAsyncThunk(
  'dashboard/fetchTutorStats',
  async (tutorId: string) => {
    const res = await axios.get(`${API_URL}/dashboard/tutor/${tutorId}`);
    return res.data;
  }
);

export const updateTutorTimings = createAsyncThunk(
  'dashboard/updateTutorTimings',
  async ({ tutorId, timings }: { tutorId: string; timings: string[] }) => {
    const res = await axios.put(`${API_URL}/dashboard/tutor/${tutorId}/timings`, { availableTimings: timings });
    return res.data;
  }
);

export const fetchStudentStats = createAsyncThunk(
  'dashboard/fetchStudentStats',
  async (studentId: string) => {
    const res = await axios.get(`${API_URL}/dashboard/student/${studentId}`);
    return res.data;
  }
);

interface DashboardState {
  adminStats: { pendingApprovals: number; activeTutors: number; totalBookings: number; totalStudents: number; totalRevenue: number } | null;
  tutorStats: { demoRequests: number; activeStudents: number; upcomingClasses: number; totalEarnings: number; availableTimings: string[] } | null;
  studentStats: { enrolledCourses: number; upcomingClasses: number; completedSessions: number; savedTutors: number } | null;
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  adminStats: null,
  tutorStats: null,
  studentStats: null,
  loading: false,
  error: null,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearDashboard: (state) => {
      state.adminStats = null;
      state.tutorStats = null;
      state.studentStats = null;
    }
  },
  extraReducers: (builder) => {
    // Admin
    builder.addCase(fetchAdminStats.pending, (state) => { state.loading = true; });
    builder.addCase(fetchAdminStats.fulfilled, (state, action) => {
      state.loading = false;
      state.adminStats = action.payload;
    });
    builder.addCase(fetchAdminStats.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || null;
    });

    // Tutor
    builder.addCase(fetchTutorStats.pending, (state) => { state.loading = true; });
    builder.addCase(fetchTutorStats.fulfilled, (state, action) => {
      state.loading = false;
      state.tutorStats = action.payload;
    });
    builder.addCase(fetchTutorStats.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || null;
    });

    // Timings
    builder.addCase(updateTutorTimings.fulfilled, (state, action) => {
      if (state.tutorStats) {
        state.tutorStats.availableTimings = action.payload.availableTimings;
      }
    });

    // Student
    builder.addCase(fetchStudentStats.pending, (state) => { state.loading = true; });
    builder.addCase(fetchStudentStats.fulfilled, (state, action) => {
      state.loading = false;
      state.studentStats = action.payload;
    });
    builder.addCase(fetchStudentStats.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || null;
    });
  }
});

export const { clearDashboard } = dashboardSlice.actions;
export default dashboardSlice.reducer;
