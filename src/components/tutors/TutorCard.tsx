import { Link } from "react-router-dom";
import { Star, MapPin, Monitor, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Tutor } from "@/data/mockTutors";

interface TutorCardProps {
  tutor: Tutor;
}

const TutorCard = ({ tutor }: TutorCardProps) => {
  const photoSrc = tutor.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.name)}&background=random&size=400`;
  return (
    <div className="group overflow-hidden rounded-xl border bg-card shadow-card transition-shadow hover:shadow-card-hover">
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        <img
          src={photoSrc}
          alt={tutor.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <Badge className="absolute left-3 top-3 bg-primary text-primary-foreground">
          {tutor.category}
        </Badge>
      </div>

      <div className="p-5">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <h3 className="font-serif text-lg text-card-foreground">{tutor.name}</h3>
            <p className="text-sm text-muted-foreground">{tutor.experience} years experience</p>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <Star className="h-4 w-4 fill-warning text-warning" />
            <span className="font-medium text-card-foreground">{tutor.rating}</span>
            <span className="text-muted-foreground">({tutor.reviewCount})</span>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {tutor.subjects.map((subject) => (
            <Badge key={subject} variant="secondary" className="text-xs">
              {subject}
            </Badge>
          ))}
        </div>

        <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {tutor.city}
          </span>
          <span className="flex items-center gap-1">
            <Monitor className="h-3.5 w-3.5" />
            {tutor.mode}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-foreground">₹{tutor.hourlyRate}<span className="text-sm font-normal text-muted-foreground">/hr</span></span>
          <Button size="sm" asChild>
            <Link to={`/tutors/${tutor.id}`}>Book Demo</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TutorCard;
