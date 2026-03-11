import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PageLayout from "@/components/layout/PageLayout";
import { GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const academicSubjects = ["Mathematics", "Physics", "Chemistry", "Biology", "Coding", "English"];
const extracurricularSubjects = ["Music", "Dance", "Art", "Chess", "Yoga", "Public Speaking"];

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
  const [bio, setBio] = useState("");
  const [password, setPassword] = useState("");
  const { signUp } = useAuth();
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
    if (selectedSubjects.length === 0) {
      toast.error("Please select at least one subject.");
      return;
    }
    setLoading(true);

    const { error } = await signUp(email, password, {
      full_name: name,
      phone,
      role: "tutor",
      category: category.toLowerCase(),
      subjects: JSON.stringify(selectedSubjects),
      bio,
      experience,
      qualification,
      city,
      teaching_mode: teachingMode.toLowerCase(),
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
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
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
                <div className="space-y-2">
                  <Label>Subjects / Skills</Label>
                  <div className="flex flex-wrap gap-2">
                    {subjects.map((s) => (
                      <label
                        key={s}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-secondary ${
                          selectedSubjects.includes(s) ? "border-primary bg-primary/5" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSubjects.includes(s)}
                          onChange={() => toggleSubject(s)}
                          className="accent-primary"
                        />
                        {s}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" rows={4} maxLength={500} placeholder="Tell students about yourself and your teaching style..." required value={bio} onChange={(e) => setBio(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
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
