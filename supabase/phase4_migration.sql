ALTER TABLE public.service_logs 
ADD COLUMN is_oil_filter BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN is_air_filter BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN is_cabin_filter BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN is_fuel_filter BOOLEAN NOT NULL DEFAULT false;
