import { PrismaClient, RolUsuario } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;
const PASSWORD = 'Test1234!';

async function main() {
  console.log('🌱 Seeding database...');

  const passwordHash = await bcrypt.hash(PASSWORD, BCRYPT_ROUNDS);

  // ─── Talleres ──────────────────────────────────────────────────────────────
  const tallerNorte = await prisma.taller.upsert({
    where: { rut: '76.111.111-1' },
    update: {},
    create: {
      nombre: 'Taller Minero Norte',
      rut: '76.111.111-1',
      direccion: 'Av. Industrial 1234, Antofagasta',
    },
  });
  console.log(`  ✓ Taller Norte: ${tallerNorte.id}`);

  const tallerSur = await prisma.taller.upsert({
    where: { rut: '76.222.222-2' },
    update: {},
    create: {
      nombre: 'Taller Minero Sur',
      rut: '76.222.222-2',
      direccion: 'Ruta 5 Sur Km 120, Rancagua',
    },
  });
  console.log(`  ✓ Taller Sur: ${tallerSur.id}`);

  // ─── Usuarios Taller Norte ─────────────────────────────────────────────────
  const usersNorte = [
    { nombre: 'Carlos Jefe', email: 'jefe@tallernorte.cl', rol: RolUsuario.JEFE },
    { nombre: 'María Supervisora', email: 'supervisor@tallernorte.cl', rol: RolUsuario.SUPERVISOR },
    { nombre: 'Pedro Técnico', email: 'tecnico1@tallernorte.cl', rol: RolUsuario.TECNICO },
    { nombre: 'Juan Técnico', email: 'tecnico2@tallernorte.cl', rol: RolUsuario.TECNICO },
    { nombre: 'Ana Bodega', email: 'bodega@tallernorte.cl', rol: RolUsuario.BODEGA },
    { nombre: 'Luis Admin', email: 'admin@tallernorte.cl', rol: RolUsuario.ADMIN },
  ];

  const createdUsersNorte: Record<string, any> = {};
  for (const u of usersNorte) {
    const user = await prisma.usuario.upsert({
      where: { email_idTaller: { email: u.email, idTaller: tallerNorte.id } },
      update: {},
      create: {
        idTaller: tallerNorte.id,
        nombre: u.nombre,
        email: u.email,
        passwordHash,
        rol: u.rol,
      },
    });
    createdUsersNorte[u.email] = user;
    console.log(`  ✓ Usuario: ${u.nombre} (${u.rol})`);
  }

  // ─── Usuario Taller Sur ────────────────────────────────────────────────────
  const jefeSur = await prisma.usuario.upsert({
    where: { email_idTaller: { email: 'jefe@tallersur.cl', idTaller: tallerSur.id } },
    update: {},
    create: {
      idTaller: tallerSur.id,
      nombre: 'Roberto Jefe Sur',
      email: 'jefe@tallersur.cl',
      passwordHash,
      rol: RolUsuario.JEFE,
    },
  });
  console.log(`  ✓ Usuario Sur: ${jefeSur.nombre} (${jefeSur.rol})`);

  // ─── Vehículos Taller Norte ────────────────────────────────────────────────
  const vehiculosNorte = [
    { marca: 'Komatsu', modelo: 'PC200', numeroSerie: 'KMTPC200AAA000001', cliente: 'Minera Los Pelambres' },
    { marca: 'Komatsu', modelo: 'HD785', numeroSerie: 'KMTHD785BBB000002', cliente: 'Minera Los Pelambres' },
    { marca: 'Caterpillar', modelo: '797F', numeroSerie: 'CATF797FCCC000003', cliente: 'Minera Escondida' },
  ];

  const createdVehiculos: any[] = [];
  for (const v of vehiculosNorte) {
    const vehiculo = await prisma.vehiculo.upsert({
      where: { idTaller_numeroSerie: { idTaller: tallerNorte.id, numeroSerie: v.numeroSerie } },
      update: {},
      create: {
        idTaller: tallerNorte.id,
        ...v,
      },
    });
    createdVehiculos.push(vehiculo);
    console.log(`  ✓ Vehículo: ${v.marca} ${v.modelo} (${v.numeroSerie})`);
  }

  // ─── Vehículo Taller Sur ──────────────────────────────────────────────────
  const vehiculoSur = await prisma.vehiculo.upsert({
    where: { idTaller_numeroSerie: { idTaller: tallerSur.id, numeroSerie: 'KMTWA600DDD000004' } },
    update: {},
    create: {
      idTaller: tallerSur.id,
      marca: 'Komatsu',
      modelo: 'WA600',
      numeroSerie: 'KMTWA600DDD000004',
      cliente: 'Minera Collahuasi',
    },
  });
  console.log(`  ✓ Vehículo Sur: ${vehiculoSur.marca} ${vehiculoSur.modelo}`);

  // ─── Resumen ───────────────────────────────────────────────────────────────
  console.log('\n✅ Seed completado!');
  console.log(`   Talleres: 2`);
  console.log(`   Usuarios: ${usersNorte.length + 1}`);
  console.log(`   Vehículos: ${vehiculosNorte.length + 1}`);
  console.log(`\n📋 Credenciales de prueba:`);
  console.log(`   Password universal: ${PASSWORD}`);
  console.log(`   Taller Norte: jefe@tallernorte.cl, supervisor@tallernorte.cl, tecnico1@tallernorte.cl, tecnico2@tallernorte.cl, bodega@tallernorte.cl, admin@tallernorte.cl`);
  console.log(`   Taller Sur: jefe@tallersur.cl`);
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
