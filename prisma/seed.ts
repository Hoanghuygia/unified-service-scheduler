import {
  AppointmentStatus,
  PrismaClient,
  ReservationStatus,
  ServiceType,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { Pool } from 'pg';

const databaseUrl = process.env['DATABASE_URL'];

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run the Prisma seed script');
}

const pool = new Pool({ connectionString: databaseUrl });
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

const WORKING_HOUR_START = 8;
const WORKING_HOUR_END = 17;
const SLOT_INTERVAL_MINUTES = 30;

const DEALERSHIP_NAMES = [
  'Toyota Ho Chi Minh City',
  'Ford Saigon',
  'Hyundai Vietnam',
  'Mazda Hanoi City',
];

const FIRST_NAMES = [
  'Alex',
  'Benjamin',
  'Charlotte',
  'Daniel',
  'Emily',
  'Ethan',
  'Grace',
  'Henry',
  'Isabella',
  'Jacob',
  'Liam',
  'Mia',
  'Noah',
  'Olivia',
  'Samuel',
  'Sophia',
];

const LAST_NAMES = [
  'Anderson',
  'Brown',
  'Carter',
  'Davis',
  'Edwards',
  'Garcia',
  'Johnson',
  'Miller',
  'Robinson',
  'Thompson',
];

type ShiftPreference = 'peak' | 'offPeak' | 'balanced';

type CreateAppointmentInput = {
  dealershipId: string;
  technicianId: string;
  serviceBayId: string;
  serviceTypeIds: string[];
  startTime: Date;
  status?: AppointmentStatus;
};

type ServiceTypeDurationMap = Map<string, number>;

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomItem<T>(array: T[]): T {
  return array[getRandomInt(0, array.length - 1)];
}

function generateVehicleId(): string {
  const value = getRandomInt(100, 999);
  return `CAR-${value}`;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function generateTimeSlots(date: Date): Date[] {
  const dayStart = startOfDay(date);
  const slots: Date[] = [];

  for (
    let minutes = WORKING_HOUR_START * 60;
    minutes <= (WORKING_HOUR_END * 60 - SLOT_INTERVAL_MINUTES);
    minutes += SLOT_INTERVAL_MINUTES
  ) {
    slots.push(addMinutes(dayStart, minutes));
  }

  return slots;
}

function chooseTimeSlotByPreference(
  slots: Date[],
  preference: ShiftPreference,
): Date {
  const peakHours = new Set([9, 10, 14, 15]);

  const peakSlots = slots.filter((slot) => peakHours.has(slot.getHours()));
  const offPeakSlots = slots.filter((slot) => !peakHours.has(slot.getHours()));

  if (preference === 'peak' && peakSlots.length > 0) {
    return getRandomItem(peakSlots);
  }

  if (preference === 'offPeak' && offPeakSlots.length > 0) {
    return getRandomItem(offPeakSlots);
  }

  if (preference === 'balanced') {
    // Slightly bias balanced traffic toward peak periods to mimic real demand.
    const weightedPool = [...peakSlots, ...peakSlots, ...offPeakSlots];
    if (weightedPool.length > 0) {
      return getRandomItem(weightedPool);
    }
  }

  return getRandomItem(slots);
}

function generateRandomDateInWorkingHours(
  days: Date[],
  durationMinutes: number,
  preference: ShiftPreference = 'balanced',
): Date {
  const day = getRandomItem(days);
  const slots = generateTimeSlots(day).filter((slot) => {
    const end = addMinutes(slot, durationMinutes);
    return end.getHours() < WORKING_HOUR_END || (end.getHours() === WORKING_HOUR_END && end.getMinutes() === 0);
  });

  if (slots.length === 0) {
    // Fallback to opening hour if duration is unexpectedly large.
    const fallback = startOfDay(day);
    fallback.setHours(WORKING_HOUR_START, 0, 0, 0);
    return fallback;
  }

  return chooseTimeSlotByPreference(slots, preference);
}

function pickServiceTypes(serviceTypes: ServiceType[]): ServiceType[] {
  const maxCount = Math.min(3, serviceTypes.length);
  const count = getRandomInt(1, maxCount);
  const shuffled = [...serviceTypes].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function sumDuration(serviceTypes: ServiceType[]): number {
  return serviceTypes.reduce((total, item) => total + item.durationMinutes, 0);
}

async function createAppointment(
  input: CreateAppointmentInput,
  serviceTypeDurationMap: ServiceTypeDurationMap,
) {
  const duration = input.serviceTypeIds.reduce((total, serviceTypeId) => {
    return total + (serviceTypeDurationMap.get(serviceTypeId) ?? 0);
  }, 0);

  if (duration <= 0) {
    throw new Error('Appointment duration must be greater than zero');
  }

  const endTime = addMinutes(input.startTime, duration);

  return prisma.appointment.create({
    data: {
      vehicleId: generateVehicleId(),
      startTime: input.startTime,
      endTime,
      totalDurationMinutes: duration,
      status: input.status ?? AppointmentStatus.BOOKED,
      dealershipId: input.dealershipId,
      technicianId: input.technicianId,
      serviceBayId: input.serviceBayId,
      serviceTypes: {
        create: input.serviceTypeIds.map((serviceTypeId) => ({
          serviceType: { connect: { id: serviceTypeId } },
        })),
      },
    },
  });
}

async function clearDatabase() {
  // Delete in dependency order so rerunning the seed always starts from a clean state.
  await prisma.$transaction([
    prisma.reservationServiceType.deleteMany(),
    prisma.appointmentServiceType.deleteMany(),
    prisma.reservation.deleteMany(),
    prisma.appointment.deleteMany(),
    prisma.serviceBay.deleteMany(),
    prisma.technician.deleteMany(),
    prisma.serviceType.deleteMany(),
    prisma.dealership.deleteMany(),
  ]);
}

async function main() {
  // Step 1: Clear existing data first to avoid duplicates on repeated runs.
  await clearDatabase();

  // Step 2: Seed master service types used by appointments and reservations.
  const serviceTypes = await Promise.all([
    prisma.serviceType.create({
      data: { name: 'Oil Change', durationMinutes: 30 },
    }),
    prisma.serviceType.create({
      data: { name: 'Tire Rotation', durationMinutes: 45 },
    }),
    prisma.serviceType.create({
      data: { name: 'Brake Inspection', durationMinutes: 60 },
    }),
    prisma.serviceType.create({
      data: { name: 'Full Service', durationMinutes: 120 },
    }),
    prisma.serviceType.create({
      data: { name: 'Battery Check', durationMinutes: 30 },
    }),
  ]);

  const serviceTypeDurationMap: ServiceTypeDurationMap = new Map(
    serviceTypes.map((serviceType) => [serviceType.id, serviceType.durationMinutes]),
  );

  const serviceTypeByName = new Map(
    serviceTypes.map((serviceType) => [serviceType.name, serviceType]),
  );

  // Step 3: Seed dealerships.
  const dealerships = await Promise.all(
    DEALERSHIP_NAMES.map((name) => prisma.dealership.create({ data: { name } })),
  );

  // Step 4: Seed service bays and technicians per dealership context.
  // Note: The current schema does not directly relate Technician to Dealership,
  // so we keep dealership-specific technician pools in memory for assignment.
  const dealershipPools = new Map<
    string,
    {
      serviceBayIds: string[];
      technicianIds: string[];
    }
  >();

  const usedEmails = new Set<string>();
  let emailCounter = 1;

  for (const dealership of dealerships) {
    const serviceBayCount = getRandomInt(3, 5);
    const technicianCount = getRandomInt(5, 8);

    const bays = await Promise.all(
      Array.from({ length: serviceBayCount }, (_, idx) =>
        prisma.serviceBay.create({
          data: {
            name: `Bay ${idx + 1}`,
            dealershipId: dealership.id,
          },
        }),
      ),
    );

    const technicians = await Promise.all(
      Array.from({ length: technicianCount }).map(async () => {
        const firstName = getRandomItem(FIRST_NAMES);
        const lastName = getRandomItem(LAST_NAMES);

        let email = `${firstName}.${lastName}.${emailCounter}@autocare.vn`
          .toLowerCase()
          .replace(/\s+/g, '');

        while (usedEmails.has(email)) {
          emailCounter += 1;
          email = `${firstName}.${lastName}.${emailCounter}@autocare.vn`
            .toLowerCase()
            .replace(/\s+/g, '');
        }

        usedEmails.add(email);
        emailCounter += 1;

        return prisma.technician.create({
          data: {
            firstName,
            lastName,
            email,
          },
        });
      }),
    );

    dealershipPools.set(dealership.id, {
      serviceBayIds: bays.map((bay) => bay.id),
      technicianIds: technicians.map((tech) => tech.id),
    });
  }

  // Working days around now to mix historical and upcoming schedules.
  const now = new Date();
  const today = startOfDay(now);
  const scheduleDays = Array.from({ length: 12 }, (_, idx) => {
    const day = startOfDay(now);
    day.setDate(day.getDate() + idx - 4);
    return day;
  });
  const pastDays = scheduleDays.filter((day) => day < today);
  const futureDays = scheduleDays.filter((day) => day >= today);

  let totalAppointments = 0;
  let totalReservations = 0;

  // Step 5: Seed realistic appointments with intentional conflict patterns.
  for (const dealership of dealerships) {
    const pool = dealershipPools.get(dealership.id);
    if (!pool) {
      continue;
    }

    const createdAppointmentIds: string[] = [];
    const targetAppointments = getRandomInt(15, 30);
    let dealershipAppointmentsCreated = 0;

    // 5A. Fully book bays at peak windows to mimic high demand.
    const peakDay = scheduleDays[getRandomInt(5, scheduleDays.length - 1)];
    const peakStartTimes = [
      new Date(new Date(peakDay).setHours(9, 0, 0, 0)),
      new Date(new Date(peakDay).setHours(14, 0, 0, 0)),
    ];

    for (const startTime of peakStartTimes) {
      for (const serviceBayId of pool.serviceBayIds) {
        const technicianId = getRandomItem(pool.technicianIds);
        const selected = [serviceTypeByName.get('Brake Inspection') ?? serviceTypes[0]];
        const appointment = await createAppointment({
          dealershipId: dealership.id,
          technicianId,
          serviceBayId,
          serviceTypeIds: selected.map((s) => s.id),
          startTime,
        }, serviceTypeDurationMap);

        createdAppointmentIds.push(appointment.id);
        totalAppointments += 1;
        dealershipAppointmentsCreated += 1;
      }
    }

    // 5B. Create back-to-back bookings for one technician.
    const focusedTechnician = getRandomItem(pool.technicianIds);
    const focusedBay = getRandomItem(pool.serviceBayIds);
    const backToBackDay = scheduleDays[getRandomInt(2, scheduleDays.length - 2)];
    const backToBackStarts = [
      new Date(new Date(backToBackDay).setHours(10, 0, 0, 0)),
      new Date(new Date(backToBackDay).setHours(11, 0, 0, 0)),
      new Date(new Date(backToBackDay).setHours(12, 0, 0, 0)),
    ];

    for (const startTime of backToBackStarts) {
      const selected = [serviceTypeByName.get('Oil Change') ?? serviceTypes[0]];
      const appointment = await createAppointment({
        dealershipId: dealership.id,
        technicianId: focusedTechnician,
        serviceBayId: focusedBay,
        serviceTypeIds: selected.map((s) => s.id),
        startTime,
      }, serviceTypeDurationMap);

      createdAppointmentIds.push(appointment.id);
      totalAppointments += 1;
      dealershipAppointmentsCreated += 1;
    }

    // 5C. Intentional overlaps for conflict testing.
    const overlapDay = scheduleDays[getRandomInt(3, scheduleDays.length - 1)];
    const overlapTech = getRandomItem(pool.technicianIds);
    const overlapBay = getRandomItem(pool.serviceBayIds);

    const overlapA = await createAppointment({
      dealershipId: dealership.id,
      technicianId: overlapTech,
      serviceBayId: overlapBay,
      serviceTypeIds: [
        serviceTypeByName.get('Full Service')?.id ?? serviceTypes[0].id,
      ],
      startTime: new Date(new Date(overlapDay).setHours(10, 0, 0, 0)),
    }, serviceTypeDurationMap);

    const overlapB = await createAppointment({
      dealershipId: dealership.id,
      technicianId: overlapTech,
      serviceBayId: overlapBay,
      serviceTypeIds: [
        serviceTypeByName.get('Brake Inspection')?.id ?? serviceTypes[0].id,
      ],
      startTime: new Date(new Date(overlapDay).setHours(10, 30, 0, 0)),
    }, serviceTypeDurationMap);

    createdAppointmentIds.push(overlapA.id, overlapB.id);
    totalAppointments += 2;
    dealershipAppointmentsCreated += 2;

    // 5D. Fill the rest with weighted random but realistic distribution.
    while (dealershipAppointmentsCreated < targetAppointments) {
      const selectedServiceTypes = pickServiceTypes(serviceTypes);
      const duration = sumDuration(selectedServiceTypes);

      const startTime = generateRandomDateInWorkingHours(
        scheduleDays,
        duration,
        'balanced',
      );

      const appointment = await createAppointment({
        dealershipId: dealership.id,
        technicianId: getRandomItem(pool.technicianIds),
        serviceBayId: getRandomItem(pool.serviceBayIds),
        serviceTypeIds: selectedServiceTypes.map((s) => s.id),
        startTime,
      }, serviceTypeDurationMap);

      createdAppointmentIds.push(appointment.id);
      totalAppointments += 1;
      dealershipAppointmentsCreated += 1;
    }

    // Step 6: Seed reservations with active, expired, and converted mix.
    const targetReservations = getRandomInt(10, 15);
    const convertibleAppointmentIds = [...createdAppointmentIds].sort(() => Math.random() - 0.5);
    const convertedQuota = Math.min(3, convertibleAppointmentIds.length, targetReservations);

    for (let index = 0; index < targetReservations; index += 1) {
      const selectedServiceTypes = pickServiceTypes(serviceTypes);
      const duration = sumDuration(selectedServiceTypes);

      const isConverted = index < convertedQuota;
      const isExpired = !isConverted && index < convertedQuota + Math.floor(targetReservations / 3);
      const status = isConverted
        ? ReservationStatus.CONVERTED
        : isExpired
          ? ReservationStatus.EXPIRED
          : ReservationStatus.ACTIVE;

      let startTime: Date;
      let appointmentId: string | undefined;

      if (isConverted) {
        appointmentId = convertibleAppointmentIds[index];
        const appt = await prisma.appointment.findUniqueOrThrow({
          where: { id: appointmentId },
        });
        startTime = appt.startTime;
      } else {
        startTime = generateRandomDateInWorkingHours(
          isExpired && pastDays.length > 0
            ? pastDays
            : !isExpired && futureDays.length > 0
              ? futureDays
              : scheduleDays,
          duration,
          isExpired ? 'offPeak' : 'peak',
        );
      }

      const endTime = addMinutes(startTime, duration);

      // Expiration is close to start time, with slight variation.
      const expiresOffset = getRandomInt(10, 30);
      const expiresAt = addMinutes(startTime, -expiresOffset);

      await prisma.reservation.create({
        data: {
          vehicleId: generateVehicleId(),
          desiredTime: addMinutes(startTime, getRandomInt(-60, 60)),
          startTime,
          endTime,
          expiresAt: isExpired ? addMinutes(now, -getRandomInt(30, 180)) : expiresAt,
          totalDurationMinutes: duration,
          status,
          dealershipId: dealership.id,
          technicianId: getRandomItem(pool.technicianIds),
          serviceBayId: getRandomItem(pool.serviceBayIds),
          appointmentId,
          serviceTypes: {
            create: selectedServiceTypes.map((serviceType) => ({
              serviceType: { connect: { id: serviceType.id } },
            })),
          },
        },
      });

      totalReservations += 1;
    }
  }

  // Step 7: Final seed summary.
  console.log('Seed completed successfully');
  console.log(`Dealerships: ${dealerships.length}`);
  console.log(`Appointments: ${totalAppointments}`);
  console.log(`Reservations: ${totalReservations}`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
