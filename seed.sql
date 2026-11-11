-- LAME D'OR - Données initiales de démonstration / amorçage
-- Salon LAME D'OR, Bamako, Mali

-- 1. Barbiers initiaux du salon
INSERT INTO public.barbers (id, full_name, phone, active) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Ibrahim Diallo', '+223 76 12 34 56', true),
  ('a2222222-2222-2222-2222-222222222222', 'Mamadou Traoré', '+223 65 98 76 54', true),
  ('a3333333-3333-3333-3333-333333333333', 'Oumar Koné', '+223 70 45 67 89', true),
  ('a4444444-4444-4444-4444-444444444444', 'Bakary Coulibaly', '+223 79 11 22 33', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Prestations initiales (tarifs en FCFA)
INSERT INTO public.services (id, name, description, current_price, active) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'Coupe Homme Classique', 'Dégradé américain ou ciseaux, finition rasoir', 3000, true),
  ('b2222222-2222-2222-2222-222222222222', 'Coupe + Barbe Prestige', 'Coupe complète, traçage barbe et serviette chaude', 5000, true),
  ('b3333333-3333-3333-3333-333333333333', 'Taille & Soin de Barbe', 'Traçage barbe sculptée, huile nourrissante et baume', 2500, true),
  ('b4444444-4444-4444-4444-444444444444', 'Coupe Enfant / Junior', 'Pour enfants de moins de 12 ans', 2000, true),
  ('b5555555-5555-5555-5555-555555555555', 'Teinture & Coloration Barbe/Cheveux', 'Coloration noire naturelle anti-taches', 6000, true),
  ('b6666666-6666-6666-6666-666666666666', 'Soin Visage & Gommage Royal', 'Nettoyage vapeur, gommage et masque purifiant', 8000, true)
ON CONFLICT (id) DO NOTHING;
