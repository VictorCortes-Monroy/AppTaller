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

  // ─── Clientes Taller Norte ───────────────────────────────────────────────
  const pelambres = await prisma.cliente.upsert({
    where: { idTaller_nombre: { idTaller: tallerNorte.id, nombre: 'Minera Los Pelambres' } },
    update: {},
    create: {
      idTaller: tallerNorte.id,
      nombre: 'Minera Los Pelambres',
      rut: '76.333.333-3',
      contacto: 'Juan Pérez',
      telefono: '+56 9 1234 5678',
      email: 'contacto@pelambres.cl',
      direccion: 'Ruta 5 Norte Km 200, Salamanca',
    },
  });
  console.log(`  ✓ Cliente: ${pelambres.nombre}`);

  const escondida = await prisma.cliente.upsert({
    where: { idTaller_nombre: { idTaller: tallerNorte.id, nombre: 'Minera Escondida' } },
    update: {},
    create: {
      idTaller: tallerNorte.id,
      nombre: 'Minera Escondida',
      rut: '76.444.444-4',
      contacto: 'María González',
      telefono: '+56 9 8765 4321',
      email: 'operaciones@escondida.cl',
      direccion: 'Desierto de Atacama, Antofagasta',
    },
  });
  console.log(`  ✓ Cliente: ${escondida.nombre}`);

  const collahuasi = await prisma.cliente.upsert({
    where: { idTaller_nombre: { idTaller: tallerSur.id, nombre: 'Minera Collahuasi' } },
    update: {},
    create: {
      idTaller: tallerSur.id,
      nombre: 'Minera Collahuasi',
      rut: '76.555.555-5',
      contacto: 'Carlos Rojas',
    },
  });
  console.log(`  ✓ Cliente Sur: ${collahuasi.nombre}`);

  // ─── Vehículos Taller Norte ────────────────────────────────────────────────
  const vehiculosNorte = [
    { marca: 'Komatsu', modelo: 'PC200', numeroSerie: 'KMTPC200AAA000001', cliente: 'Minera Los Pelambres', idCliente: pelambres.id },
    { marca: 'Komatsu', modelo: 'HD785', numeroSerie: 'KMTHD785BBB000002', cliente: 'Minera Los Pelambres', idCliente: pelambres.id },
    { marca: 'Caterpillar', modelo: '797F', numeroSerie: 'CATF797FCCC000003', cliente: 'Minera Escondida', idCliente: escondida.id },
  ];

  const createdVehiculos: any[] = [];
  for (const v of vehiculosNorte) {
    const vehiculo = await prisma.vehiculo.upsert({
      where: { idTaller_numeroSerie: { idTaller: tallerNorte.id, numeroSerie: v.numeroSerie } },
      update: { idCliente: v.idCliente },
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
    update: { idCliente: collahuasi.id },
    create: {
      idTaller: tallerSur.id,
      idCliente: collahuasi.id,
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
