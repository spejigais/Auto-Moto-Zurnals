-- Auto Moto Journal Database Schema & RLS

-- Create vehicles table
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Auto', 'Moto')),
    brand_model VARCHAR(255) NOT NULL,
    plate_number VARCHAR(100) NOT NULL,
    engine_drive_type VARCHAR(50) DEFAULT 'Zobsiksna',
    inspection_date DATE NOT NULL,
    oil_interval_km INT NOT NULL,
    oil_interval_months INT NOT NULL,
    belt_interval_km INT NOT NULL,
    belt_interval_months INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for vehicles
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Vehicles Policies
CREATE POLICY "Users can view own vehicles" 
    ON public.vehicles FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vehicles" 
    ON public.vehicles FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vehicles" 
    ON public.vehicles FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vehicles" 
    ON public.vehicles FOR DELETE 
    USING (auth.uid() = user_id);


-- Create service_logs table
CREATE TABLE IF NOT EXISTS public.service_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    mileage INT NOT NULL,
    is_oil_changed BOOLEAN NOT NULL DEFAULT false,
    is_belt_changed BOOLEAN NOT NULL DEFAULT false,
    is_oil_filter BOOLEAN NOT NULL DEFAULT false,
    is_air_filter BOOLEAN NOT NULL DEFAULT false,
    is_cabin_filter BOOLEAN NOT NULL DEFAULT false,
    is_fuel_filter BOOLEAN NOT NULL DEFAULT false,
    description TEXT,
    cost DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for service_logs
ALTER TABLE public.service_logs ENABLE ROW LEVEL SECURITY;

-- Service Logs Policies
CREATE POLICY "Users can view service logs of own vehicles" 
    ON public.service_logs FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.vehicles 
        WHERE vehicles.id = service_logs.vehicle_id 
        AND vehicles.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert service logs for own vehicles" 
    ON public.service_logs FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.vehicles 
        WHERE vehicles.id = service_logs.vehicle_id 
        AND vehicles.user_id = auth.uid()
    ));

CREATE POLICY "Users can update service logs of own vehicles" 
    ON public.service_logs FOR UPDATE 
    USING (EXISTS (
        SELECT 1 FROM public.vehicles 
        WHERE vehicles.id = service_logs.vehicle_id 
        AND vehicles.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete service logs of own vehicles" 
    ON public.service_logs FOR DELETE 
    USING (EXISTS (
        SELECT 1 FROM public.vehicles 
        WHERE vehicles.id = service_logs.vehicle_id 
        AND vehicles.user_id = auth.uid()
    ));
