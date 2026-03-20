-- Normalize legacy DateTime values that were written before TIMESTAMPTZ migration.
-- Existing rows were effectively persisted with a +07:00 offset and interpreted as UTC.
-- Shift them back by 7 hours to preserve the originally intended UTC instants.

UPDATE "Appointment"
SET
    "startTime" = "startTime" - INTERVAL '7 hours',
    "endTime" = "endTime" - INTERVAL '7 hours',
    "createdAt" = "createdAt" - INTERVAL '7 hours',
    "updatedAt" = "updatedAt" - INTERVAL '7 hours';

UPDATE "Reservation"
SET
    "desiredTime" = "desiredTime" - INTERVAL '7 hours',
    "startTime" = "startTime" - INTERVAL '7 hours',
    "endTime" = "endTime" - INTERVAL '7 hours',
    "expiresAt" = "expiresAt" - INTERVAL '7 hours',
    "createdAt" = "createdAt" - INTERVAL '7 hours',
    "updatedAt" = "updatedAt" - INTERVAL '7 hours';

UPDATE "Dealership"
SET
    "createdAt" = "createdAt" - INTERVAL '7 hours',
    "updatedAt" = "updatedAt" - INTERVAL '7 hours';

UPDATE "Technician"
SET
    "createdAt" = "createdAt" - INTERVAL '7 hours',
    "updatedAt" = "updatedAt" - INTERVAL '7 hours';

UPDATE "ServiceBay"
SET
    "createdAt" = "createdAt" - INTERVAL '7 hours',
    "updatedAt" = "updatedAt" - INTERVAL '7 hours';

UPDATE "ServiceType"
SET
    "createdAt" = "createdAt" - INTERVAL '7 hours',
    "updatedAt" = "updatedAt" - INTERVAL '7 hours';

UPDATE "AppointmentServiceType"
SET
    "createdAt" = "createdAt" - INTERVAL '7 hours';

UPDATE "ReservationServiceType"
SET
    "createdAt" = "createdAt" - INTERVAL '7 hours';
