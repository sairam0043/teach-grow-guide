import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PageLayout from "@/components/layout/PageLayout";
import { Eye, EyeOff, Calendar, Clock, PlusCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { GoogleLogin } from "@react-oauth/google";

import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";
import API_URL from "@/config/api";

const academicSubjects = [
  "Mathematics", 
  "Physics", 
  "Chemistry", 
  "Biology", 
  "Coding / Computer Science", 
  "English", 
  "History", 
  "Geography", 
  "Economics & Finance", 
  "Foreign Languages", 
  "Other"
];
const extracurricularSubjects = [
  "Music (Vocal/Instruments)", 
  "Dance", 
  "Fine Arts & Drawing", 
  "Chess", 
  "Yoga & Meditation", 
  "Public Speaking & Debate", 
  "Creative Writing", 
  "Photography & Video", 
  "Other"
];

const RegisterTutor = () => {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [qualification, setQualification] = useState("");
  const [experience, setExperience] = useState("");
  const [category, setCategory] = useState("");
  const [teachingMode, setTeachingMode] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [otherSubjectText, setOtherSubjectText] = useState("");
  const [bio, setBio] = useState("");
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const [availability, setAvailability] = useState<{ day: string; selected: boolean; slots: { startTime: string; endTime: string }[] }[]>(
    DAYS.map(day => ({ day, selected: false, slots: [{ startTime: '09:00', endTime: '17:00' }] }))
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [userTimezone] = useState(
  Intl.DateTimeFormat().resolvedOptions().timeZone
);

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB.");
        return;
      }
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    } else {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
      setPhotoFile(null);
      setPhotoPreview("");
    }
  };
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docName, setDocName] = useState<string>("");

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Document must be less than 10MB.");
        return;
      }
      setDocFile(file);
      setDocName(file.name);
    } else {
      setDocFile(null);
      setDocName("");
    }
  };

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signUp, googleSignIn } = useAuth();

  const navigate = useNavigate();

  const subjects = category === "Academic" ? academicSubjects : category === "Extracurricular" ? extracurricularSubjects : [];

  const toggleSubject = (s: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !teachingMode) {
      toast.error("Please select category and teaching mode.");
      return;
    }

    let finalSubjects = selectedSubjects.filter(s => s !== "Other");
    if (selectedSubjects.includes("Other") && otherSubjectText.trim()) {
      const customList = otherSubjectText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      finalSubjects = [...finalSubjects, ...customList];
    }

    if (finalSubjects.length === 0) {
      toast.error("Please select at least one subject.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Password and confirm password must match.");
      return;
    }

    const selectedDays = availability.filter(a => a.selected);
    for (const day of selectedDays) {
      for (const slot of day.slots) {
        if (!slot.startTime || !slot.endTime) {
           toast.error(`Please set valid times for ${day.day}.`);
           return;
        }
        if (slot.endTime <= slot.startTime) {
           toast.error(`End time must be later than start time for ${day.day}.`);
           return;
        }
      }
    }

    setLoading(true);

    let photoUrl: string | undefined;
    if (photoFile) {
      try {
        const formData = new FormData();
        formData.append("photo", photoFile);
        const uploadRes = await axios.post(`${API_URL}/upload/photo`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        photoUrl = uploadRes.data?.url;
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to upload photo.";
        toast.error(msg);
        setLoading(false);
        return;
      }
    }

    let docUrl: string | undefined;
    if (docFile) {
      try {
        const formData = new FormData();
        formData.append("document", docFile);
        const uploadRes = await axios.post(`${API_URL}/upload/document`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        docUrl = uploadRes.data?.url;
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to upload verification document.";
        toast.error(msg);
        setLoading(false);
        return;
      }
    }

    const { error } = await signUp(email, password, {
      full_name: name,
      phone,
      role: "tutor",
      category: category.toLowerCase(),
      subjects: JSON.stringify(finalSubjects),
      bio,
      experience,
      qualification,
      city,
      teaching_mode: teachingMode.toLowerCase(),
      availability: JSON.stringify(selectedDays.flatMap(dayObj => 
        dayObj.slots.map(slot => ({ day: dayObj.day, startTime: slot.startTime, endTime: slot.endTime }))
      )),
      ...(photoUrl && { photo: photoUrl }),
      ...(docUrl && { verificationDocument: docUrl })
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("Application submitted! Please check your email to confirm your account. Your application will be reviewed by our team.");
    setLoading(false);
    navigate("/login");
  };

  return (
    <PageLayout>
      <div className="flex items-center justify-center py-12">
        <Card className="w-full max-w-2xl shadow-card">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-16 w-auto items-center justify-center">
              <img src="/logo.png" alt="Logo" className="h-16 w-auto" />
            </div>
            <CardTitle className="text-2xl">Tutor Registration</CardTitle>
            <CardDescription>Join the Cuvasol Tutor community of expert educators</CardDescription>
          </CardHeader>
          <CardContent>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" required maxLength={100} value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="qualification">Qualification</Label>
                  <Input id="qualification" required maxLength={200} value={qualification} onChange={(e) => setQualification(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experience">Years of Experience</Label>
                  <Input id="experience" type="number" min={0} max={50} required value={experience} onChange={(e) => setExperience(e.target.value)} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={(v) => { setCategory(v); setSelectedSubjects([]); }}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Academic">Academic</SelectItem>
                      <SelectItem value="Extracurricular">Extracurricular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Teaching Mode</Label>
                  <Select value={teachingMode} onValueChange={setTeachingMode}>
                    <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Online">Online</SelectItem>
                      <SelectItem value="Offline">Offline</SelectItem>
                      <SelectItem value="Both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {subjects.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Subjects / Skills</Label>
                  <div className="flex flex-wrap gap-2">
                    {subjects.map((s) => (
                      <label
                        key={s}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all hover:bg-secondary/80 ${
                          selectedSubjects.includes(s) ? "border-primary bg-primary/5 text-foreground font-medium" : "text-muted-foreground"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSubjects.includes(s)}
                          onChange={() => toggleSubject(s)}
                          className="accent-primary h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        {s}
                      </label>
                    ))}
                  </div>

                  {selectedSubjects.includes("Other") && (
                    <div className="space-y-2 mt-3 p-4 border rounded-xl bg-secondary/5 animate-in fade-in slide-in-from-top-2 duration-200">
                      <Label htmlFor="custom-subjects" className="text-xs font-semibold text-muted-foreground block mb-1">
                        Specify Your Other Subject(s)
                      </Label>
                      <Input
                        id="custom-subjects"
                        required
                        placeholder="e.g. Sanskrit, Artificial Intelligence, German (comma-separated)"
                        value={otherSubjectText}
                        onChange={(e) => setOtherSubjectText(e.target.value)}
                        className="bg-background shadow-sm text-sm"
                      />
                      <p className="text-xs text-muted-foreground">Type any custom subjects separated by commas.</p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
  <Label className="text-base font-semibold flex items-center gap-2">
    <Calendar className="h-4 w-4 text-primary" />
    Available Demo Timings
  </Label>

  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
    <p className="text-sm font-medium text-blue-700">
      All times are saved in your timezone:
      <span className="font-bold ml-1">
        {userTimezone === "Asia/Calcutta"
          ? "India Standard Time (IST)"
          : userTimezone}
      </span>
    </p>
  </div>

  <div className="grid gap-3">
    {availability.map((dayObj, i) => (
      <div
        key={dayObj.day}
        className="flex flex-col sm:flex-row sm:items-center gap-4 p-3 border rounded-lg bg-secondary/5 hover:bg-secondary/10 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-[120px]">
          <Checkbox
            id={`day-${dayObj.day}`}
            checked={dayObj.selected}
            onCheckedChange={(checked) => {
              const newAvail = [...availability];
              newAvail[i].selected = checked === true;
              setAvailability(newAvail);
            }}
          />
          <Label
            htmlFor={`day-${dayObj.day}`}
            className="font-medium cursor-pointer"
          >
            {dayObj.day}
          </Label>
        </div>

        {dayObj.selected && (
          <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
            {dayObj.slots.map((slot, slotIdx) => (
              <div key={slotIdx} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <Input
                    type="time"
                    className="w-[130px] h-8 text-xs"
                    value={slot.startTime}
                    onChange={(e) => {
                      const newAvail = [...availability];
                      newAvail[i].slots[slotIdx].startTime = e.target.value;
                      setAvailability(newAvail);
                    }}
                  />
                </div>

                <span className="text-muted-foreground text-xs">to</span>

                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    className="w-[130px] h-8 text-xs"
                    value={slot.endTime}
                    onChange={(e) => {
                      const newAvail = [...availability];
                      newAvail[i].slots[slotIdx].endTime = e.target.value;
                      setAvailability(newAvail);
                    }}
                  />
                </div>

                {dayObj.slots.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newAvail = [...availability];
                      newAvail[i].slots = newAvail[i].slots.filter(
                        (_, idx) => idx !== slotIdx
                      );
                      setAvailability(newAvail);
                    }}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <PlusCircle className="h-4 w-4 rotate-45" />
                  </button>
                )}
              </div>
            ))}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit text-xs h-7 gap-1"
              onClick={() => {
                const newAvail = [...availability];
                newAvail[i].slots.push({
                  startTime: "09:00",
                  endTime: "17:00",
                });
                setAvailability(newAvail);
              }}
            >
              <PlusCircle className="h-3 w-3" />
              Add Slot
            </Button>
          </div>
        )}
      </div>
    ))}
  </div>

  <p className="text-xs text-muted-foreground">
    Select the days and times you are generally available for demo sessions.
    These times are saved in your local timezone and can be converted for
    students in different countries.
  </p>
</div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" rows={4} maxLength={500} placeholder="Tell students about yourself and your teaching style..." required value={bio} onChange={(e) => setBio(e.target.value)} />
              </div>

              <div className="space-y-3">
                <Label htmlFor="photo" className="text-sm font-semibold">Profile Photo</Label>
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border rounded-xl bg-secondary/5">
                  <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-primary/20 bg-secondary/30 flex items-center justify-center shrink-0">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Profile Preview"
                        className="w-full h-full object-cover animate-in fade-in zoom-in-95 duration-200"
                      />
                    ) : (
                      <div className="text-center p-2 text-[10px] text-muted-foreground font-medium">
                        No Photo
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2 w-full">
                    <Input
                      id="photo"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handlePhotoChange}
                      className="cursor-pointer file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
                    />
                    <p className="text-xs text-muted-foreground">Upload a photo from your device (JPEG, PNG, GIF or WebP, max 5MB). Shown when students browse tutors.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="document" className="text-sm font-semibold">Verification Credentials (KYC)</Label>
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border rounded-xl bg-secondary/5">
                  <div className="flex-1 space-y-2 w-full">
                    <Input
                      id="document"
                      type="file"
                      accept="application/pdf,image/jpeg,image/jpg,image/png"
                      onChange={handleDocChange}
                      className="cursor-pointer file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
                    />
                    <p className="text-xs text-muted-foreground">Upload credential verification PDF, PNG, or JPEG (Max 10MB). E.g., professional degrees, ID proof, teaching certifications.</p>
                    {docName && (
                      <p className="text-xs text-emerald-600 font-semibold mt-1">✓ File selected: {docName}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Submitting..." : "Submit Application"}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account? <Link to="/login" className="text-primary hover:underline">Log in</Link>
              <br />
              Want to learn? <Link to="/register/student" className="text-primary hover:underline">Register as Student</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default RegisterTutor;
