
-- Update the handle_new_user trigger to also create tutor/student records
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data ->> 'phone'
  );

  -- Assign role and create role-specific record
  IF NEW.raw_user_meta_data ->> 'role' = 'tutor' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'tutor');
    INSERT INTO public.tutors (
      user_id, category, subjects, bio, experience, qualification, city, teaching_mode
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'category', 'academic'),
      COALESCE(
        (SELECT array_agg(elem::text) FROM jsonb_array_elements_text(
          CASE WHEN NEW.raw_user_meta_data ->> 'subjects' IS NOT NULL 
               THEN (NEW.raw_user_meta_data ->> 'subjects')::jsonb 
               ELSE '[]'::jsonb END
        ) AS elem),
        '{}'::text[]
      ),
      COALESCE(NEW.raw_user_meta_data ->> 'bio', ''),
      COALESCE((NEW.raw_user_meta_data ->> 'experience')::integer, 0),
      COALESCE(NEW.raw_user_meta_data ->> 'qualification', ''),
      NEW.raw_user_meta_data ->> 'city',
      COALESCE(NEW.raw_user_meta_data ->> 'teaching_mode', 'online')
    );
  ELSIF NEW.raw_user_meta_data ->> 'role' = 'student' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
    INSERT INTO public.students (user_id) VALUES (NEW.id);
  END IF;

  RETURN NEW;
END;
$$;
