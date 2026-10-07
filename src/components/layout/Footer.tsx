import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import axios from "axios";
import API_URL from "@/config/api";

const Footer = () => {
  const [visitorCount, setVisitorCount] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchAndTrackVisitor = async () => {
      try {
        const hasVisitedSession = sessionStorage.getItem("has_visited_cuvasol");
        let response;
        if (!hasVisitedSession) {
          // New session -> increment counter in backend
          response = await axios.post(`${API_URL}/visitors/increment`);
          sessionStorage.setItem("has_visited_cuvasol", "true");
        } else {
          // Existing session -> fetch current counter
          response = await axios.get(`${API_URL}/visitors`);
        }

        if (isMounted && response.data && typeof response.data.count === "number") {
          setVisitorCount(response.data.count);
          localStorage.setItem("cached_visitor_count", response.data.count.toString());
        }
      } catch (err) {
        console.error("Failed to fetch visitor count:", err);
        // Fallback to cached count or baseline count
        const cached = localStorage.getItem("cached_visitor_count");
        if (isMounted) {
          setVisitorCount(cached ? parseInt(cached, 10) : 1250);
        }
      }
    };

    fetchAndTrackVisitor();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <footer className="border-t bg-card">
      <div className="container py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src="/logo.png" alt="Logo" className="h-8 w-auto" />
              <span className="font-serif text-lg text-foreground">Cuvasol Tutor</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Connecting students with expert tutors for personalized learning experiences.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/tutors" className="hover:text-foreground transition-colors">Browse Tutors</Link></li>
              <li><Link to="/register/tutor" className="hover:text-foreground transition-colors">Become a Tutor</Link></li>
              <li><Link to="/about" className="hover:text-foreground transition-colors">About Us</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
              <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms & Conditions</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">Categories</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/tutors?category=Academic" className="hover:text-foreground transition-colors">Academic</Link></li>
              <li><Link to="/tutors?category=Extracurricular" className="hover:text-foreground transition-colors">Extracurricular</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div>
            © {new Date().getFullYear()} Cuvasol Tutor. All rights reserved.
          </div>

          {/* Visitor Counter */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-muted/60 border border-border/80 shadow-xs backdrop-blur-xs text-xs font-medium text-foreground">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Users className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">Visitors:</span>
            <span className="font-bold text-primary tracking-wider font-mono">
              {visitorCount !== null ? visitorCount.toLocaleString() : "..."}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
