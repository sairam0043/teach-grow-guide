
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'student', 'tutor');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- has_role security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Admin can view all roles
CREATE POLICY "Admins can view all roles" ON public.user_roles
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Tutors table
CREATE TABLE public.tutors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('academic', 'extracurricular')),
  subjects TEXT[] NOT NULL DEFAULT '{}',
  bio TEXT,
  experience INTEGER NOT NULL DEFAULT 0,
  qualification TEXT,
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  city TEXT,
  teaching_mode TEXT NOT NULL DEFAULT 'online' CHECK (teaching_mode IN ('online', 'offline', 'both')),
  demo_availability JSONB DEFAULT '[]',
  weekly_availability JSONB DEFAULT '[]',
  hourly_rate NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tutors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved tutors visible to all" ON public.tutors FOR SELECT USING (approval_status = 'approved' OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Tutors can update own profile" ON public.tutors FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Tutors can insert own profile" ON public.tutors FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_tutors_updated_at BEFORE UPDATE ON public.tutors
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Students table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  grade TEXT,
  interests TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view own" ON public.students FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Students can update own" ON public.students FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Students can insert own" ON public.students FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Demo bookings table
CREATE TABLE public.demo_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  time_slot TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
  tutor_confirmed BOOLEAN DEFAULT false,
  student_confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.demo_bookings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.owns_demo_booking(_user_id UUID, _booking_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.demo_bookings db
    JOIN public.tutors t ON db.tutor_id = t.id
    JOIN public.students s ON db.student_id = s.id
    WHERE db.id = _booking_id AND (t.user_id = _user_id OR s.user_id = _user_id)
  )
$$;

CREATE POLICY "Users can view own demo bookings" ON public.demo_bookings FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.tutors t WHERE t.id = tutor_id AND t.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Students can create demo bookings" ON public.demo_bookings FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));
CREATE POLICY "Participants can update demo bookings" ON public.demo_bookings FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.tutors t WHERE t.id = tutor_id AND t.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())
);

CREATE TRIGGER update_demo_bookings_updated_at BEFORE UPDATE ON public.demo_bookings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Class bookings table
CREATE TABLE public.class_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  weekly_hours INTEGER NOT NULL DEFAULT 8,
  schedule JSONB NOT NULL DEFAULT '[]',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.class_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own class bookings" ON public.class_bookings FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.tutors t WHERE t.id = tutor_id AND t.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Students can create class bookings" ON public.class_bookings FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));
CREATE POLICY "Participants can update class bookings" ON public.class_bookings FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.tutors t WHERE t.id = tutor_id AND t.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE TRIGGER update_class_bookings_updated_at BEFORE UPDATE ON public.class_bookings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_booking_id UUID REFERENCES public.class_bookings(id),
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  razorpay_payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.tutors t WHERE t.id = tutor_id AND t.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Students can create payments" ON public.payments FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));

-- Pricing tiers table (admin configurable)
CREATE TABLE public.pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_students INTEGER NOT NULL DEFAULT 1,
  max_students INTEGER NOT NULL DEFAULT 1,
  label TEXT NOT NULL DEFAULT 'Standard',
  rate_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view pricing tiers" ON public.pricing_tiers FOR SELECT USING (true);
CREATE POLICY "Admins can manage pricing tiers" ON public.pricing_tiers FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default pricing tiers
INSERT INTO public.pricing_tiers (min_students, max_students, label, rate_multiplier) VALUES
  (1, 1, 'Premium (1:1)', 1.0),
  (2, 2, 'Medium (1:2)', 0.75),
  (3, 5, 'Discounted (1:3-5)', 0.5);

-- Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email
  );
  -- Auto-assign role from metadata
  IF NEW.raw_user_meta_data ->> 'role' = 'tutor' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'tutor');
  ELSIF NEW.raw_user_meta_data ->> 'role' = 'student' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
