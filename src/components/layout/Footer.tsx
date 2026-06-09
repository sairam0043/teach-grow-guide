import { Link } from "react-router-dom";


const Footer = () => {
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

        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Cuvasol Tutor. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
