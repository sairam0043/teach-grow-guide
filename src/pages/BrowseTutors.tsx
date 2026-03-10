import { useState, useMemo } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageLayout from "@/components/layout/PageLayout";
import TutorCard from "@/components/tutors/TutorCard";
import { mockTutors, type TutorCategory, type TeachingMode } from "@/data/mockTutors";

const allSubjects = Array.from(new Set(mockTutors.flatMap((t) => t.subjects)));
const allCities = Array.from(new Set(mockTutors.map((t) => t.city)));

const BrowseTutors = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [subject, setSubject] = useState<string>("all");
  const [mode, setMode] = useState<string>("all");
  const [city, setCity] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    return mockTutors
      .filter((t) => t.approvalStatus === "Approved")
      .filter((t) => {
        if (search) {
          const q = search.toLowerCase();
          return (
            t.name.toLowerCase().includes(q) ||
            t.subjects.some((s) => s.toLowerCase().includes(q)) ||
            t.city.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .filter((t) => category === "all" || t.category === category)
      .filter((t) => subject === "all" || t.subjects.includes(subject))
      .filter((t) => mode === "all" || t.mode === mode || t.mode === "Both")
      .filter((t) => city === "all" || t.city === city);
  }, [search, category, subject, mode, city]);

  const clearFilters = () => {
    setSearch("");
    setCategory("all");
    setSubject("all");
    setMode("all");
    setCity("all");
  };

  const hasFilters = search || category !== "all" || subject !== "all" || mode !== "all" || city !== "all";

  return (
    <PageLayout>
      <section className="bg-primary py-12">
        <div className="container text-center">
          <h1 className="mb-4 text-3xl font-bold text-primary-foreground md:text-4xl">Find Your Perfect Tutor</h1>
          <p className="mb-6 text-primary-foreground/80">Browse expert tutors across academics and extracurriculars</p>
          <div className="mx-auto flex max-w-xl items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, subject, or city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-card pl-10"
              />
            </div>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="container">
          {/* Filters */}
          <div className={`mb-8 flex flex-wrap gap-3 ${showFilters ? "" : "hidden md:flex"}`}>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Academic">Academic</SelectItem>
                <SelectItem value="Extracurricular">Extracurricular</SelectItem>
              </SelectContent>
            </Select>

            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {allSubjects.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="Online">Online</SelectItem>
                <SelectItem value="Offline">Offline</SelectItem>
              </SelectContent>
            </Select>

            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {allCities.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" onClick={clearFilters} className="text-sm">
                Clear filters
              </Button>
            )}
          </div>

          {/* Results */}
          <div className="mb-4 text-sm text-muted-foreground">
            {filtered.length} tutor{filtered.length !== 1 ? "s" : ""} found
          </div>

          {filtered.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((tutor) => (
                <TutorCard key={tutor.id} tutor={tutor} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <p className="text-lg text-muted-foreground">No tutors found matching your criteria.</p>
              <Button variant="outline" onClick={clearFilters} className="mt-4">Clear filters</Button>
            </div>
          )}
        </div>
      </section>
    </PageLayout>
  );
};

export default BrowseTutors;
