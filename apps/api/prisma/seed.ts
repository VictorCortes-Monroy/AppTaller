import {
  PrismaClient,
  RolUsuario,
  EstadoOT,
  EstadoOS,
  TipoEventoLog,
  TipoEventoLogOS,
  TipoServicio,
  EstadoRepuesto,
  OrigenRepuesto,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;
const PASSWORD = 'Test1234!';

async function main() {
  console.log('🌱 Seeding database (modelo OS + OT)...');

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
  const jefe = createdUsersNorte['jefe@tallernorte.cl'];
  const supervisor = createdUsersNorte['supervisor@tallernorte.cl'];
  const tecnico1 = createdUsersNorte['tecnico1@tallernorte.cl'];
  const tecnico2 = createdUsersNorte['tecnico2@tallernorte.cl'];

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
  console.log(`  ✓ Usuario Sur: ${jefeSur.nombre}`);

  // ─── Clientes ─────────────────────────────────────────────────────────────
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
    },
  });
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
  console.log(`  ✓ Clientes creados`);

  // ─── Vehículos ────────────────────────────────────────────────────────────
  const vehKomatsuPC200 = await prisma.vehiculo.upsert({
    where: { idTaller_numeroSerie: { idTaller: tallerNorte.id, numeroSerie: 'KMTPC200AAA000001' } },
    update: { idCliente: pelambres.id },
    create: {
      idTaller: tallerNorte.id,
      idCliente: pelambres.id,
      marca: 'Komatsu',
      modelo: 'PC200',
      numeroSerie: 'KMTPC200AAA000001',
      cliente: 'Minera Los Pelambres',
      sucursal: 'Faena Norte',
    },
  });
  const vehKomatsuHD785 = await prisma.vehiculo.upsert({
    where: { idTaller_numeroSerie: { idTaller: tallerNorte.id, numeroSerie: 'KMTHD785BBB000002' } },
    update: { idCliente: pelambres.id },
    create: {
      idTaller: tallerNorte.id,
      idCliente: pelambres.id,
      marca: 'Komatsu',
      modelo: 'HD785',
      numeroSerie: 'KMTHD785BBB000002',
      cliente: 'Minera Los Pelambres',
    },
  });
  const vehCat797F = await prisma.vehiculo.upsert({
    where: { idTaller_numeroSerie: { idTaller: tallerNorte.id, numeroSerie: 'CATF797FCCC000003' } },
    update: { idCliente: escondida.id },
    create: {
      idTaller: tallerNorte.id,
      idCliente: escondida.id,
      marca: 'Caterpillar',
      modelo: '797F',
      numeroSerie: 'CATF797FCCC000003',
      cliente: 'Minera Escondida',
    },
  });
  const vehKomatsuWA600 = await prisma.vehiculo.upsert({
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
  console.log(`  ✓ Vehículos creados`);

  // ─── Helper: numerar OS y OT por taller y año ─────────────────────────────
  const counters: Record<string, { os: number; ot: number }> = {
    [tallerNorte.id]: { os: 0, ot: 0 },
    [tallerSur.id]: { os: 0, ot: 0 },
  };
  const year = new Date().getFullYear();

  const nextOS = (idTaller: string) => {
    counters[idTaller].os += 1;
    return `OS-${year}-${String(counters[idTaller].os).padStart(3, '0')}`;
  };
  const nextOT = (idTaller: string) => {
    counters[idTaller].ot += 1;
    return `OT-${year}-${String(counters[idTaller].ot).padStart(3, '0')}`;
  };

  // ─── OS-001 Norte: Komatsu PC200 — EN_SERVICIO con 3 OTs paralelas ────────
  const os1 = await prisma.ordenServicio.create({
    data: {
      idTaller: tallerNorte.id,
      idVehiculo: vehKomatsuPC200.id,
      numeroOS: nextOS(tallerNorte.id),
      estado: EstadoOS.EN_SERVICIO,
      kilometrajeIngreso: 12450,
      motivoIngreso: 'Mantención 500 horas — revisión integral de equipo',
      fechaIngreso: new Date(Date.now() - 4 * 86_400_000),
    },
  });
  await prisma.logEstadoOS.create({
    data: {
      idOrdenServicio: os1.id,
      idUsuario: supervisor.id,
      tipoEvento: TipoEventoLogOS.CREACION_OS,
      estadoNuevo: EstadoOS.ABIERTA,
      descripcion: `OS creada por ${supervisor.email}`,
      comentario: os1.motivoIngreso,
      fechaEvento: new Date(Date.now() - 4 * 86_400_000),
    },
  });
  await prisma.logEstadoOS.create({
    data: {
      idOrdenServicio: os1.id,
      idUsuario: supervisor.id,
      tipoEvento: TipoEventoLogOS.CAMBIO_ESTADO_OS,
      estadoAnterior: EstadoOS.ABIERTA,
      estadoNuevo: EstadoOS.EN_SERVICIO,
      descripcion: 'Estado de OS recalculado: ABIERTA → EN_SERVICIO',
      fechaEvento: new Date(Date.now() - 3 * 86_400_000),
    },
  });

  // OT 1.1 Motor — EN_EJECUCION
  const ot11 = await prisma.ordenTrabajo.create({
    data: {
      idTaller: tallerNorte.id,
      idOrdenServicio: os1.id,
      idVehiculo: vehKomatsuPC200.id,
      idTecnico: tecnico1.id,
      numeroOT: nextOT(tallerNorte.id),
      estado: EstadoOT.EN_EJECUCION,
      frente: 'Motor',
      tipoServicio: TipoServicio.MANTENCION_PREVENTIVA,
      descripcion: 'Cambio de aceite, filtros y revisión de cabezote',
      kilometraje: 12450,
    },
  });
  await prisma.logEstadoOT.create({
    data: {
      idOT: ot11.id,
      idUsuario: supervisor.id,
      tipoEvento: TipoEventoLog.CREACION_OT,
      estadoNuevo: EstadoOT.INGRESADO,
      descripcion: `OT creada (frente: Motor)`,
      fechaEvento: new Date(Date.now() - 4 * 86_400_000),
    },
  });
  await prisma.logEstadoOT.create({
    data: {
      idOT: ot11.id,
      idUsuario: tecnico1.id,
      tipoEvento: TipoEventoLog.CAMBIO_ESTADO,
      estadoAnterior: EstadoOT.INGRESADO,
      estadoNuevo: EstadoOT.EN_EVALUACION,
      descripcion: 'Iniciada evaluación del motor',
      fechaEvento: new Date(Date.now() - 3 * 86_400_000),
    },
  });
  await prisma.logEstadoOT.create({
    data: {
      idOT: ot11.id,
      idUsuario: tecnico1.id,
      tipoEvento: TipoEventoLog.CAMBIO_ESTADO,
      estadoAnterior: EstadoOT.EN_EVALUACION,
      estadoNuevo: EstadoOT.EN_EJECUCION,
      descripcion: 'Comenzada reparación de motor',
      fechaEvento: new Date(Date.now() - 1 * 86_400_000),
    },
  });

  // OT 1.2 Hidráulico — ESPERANDO_REPUESTOS con 2 repuestos PENDIENTES
  const ot12 = await prisma.ordenTrabajo.create({
    data: {
      idTaller: tallerNorte.id,
      idOrdenServicio: os1.id,
      idVehiculo: vehKomatsuPC200.id,
      idTecnico: tecnico2.id,
      numeroOT: nextOT(tallerNorte.id),
      estado: EstadoOT.ESPERANDO_REPUESTOS,
      frente: 'Hidráulico',
      tipoServicio: TipoServicio.REPARACION_MAYOR,
      descripcion: 'Reemplazo de bomba hidráulica principal y mangueras',
    },
  });
  await prisma.logEstadoOT.create({
    data: {
      idOT: ot12.id,
      idUsuario: supervisor.id,
      tipoEvento: TipoEventoLog.CREACION_OT,
      estadoNuevo: EstadoOT.INGRESADO,
      descripcion: `OT creada (frente: Hidráulico)`,
      fechaEvento: new Date(Date.now() - 4 * 86_400_000),
    },
  });
  await prisma.logEstadoOT.create({
    data: {
      idOT: ot12.id,
      idUsuario: tecnico2.id,
      tipoEvento: TipoEventoLog.CAMBIO_ESTADO,
      estadoAnterior: EstadoOT.INGRESADO,
      estadoNuevo: EstadoOT.EN_EVALUACION,
      descripcion: 'Evaluación del sistema hidráulico',
      fechaEvento: new Date(Date.now() - 3 * 86_400_000),
    },
  });
  await prisma.logEstadoOT.create({
    data: {
      idOT: ot12.id,
      idUsuario: supervisor.id,
      tipoEvento: TipoEventoLog.CAMBIO_ESTADO,
      estadoAnterior: EstadoOT.EN_EVALUACION,
      estadoNuevo: EstadoOT.ESPERANDO_REPUESTOS,
      descripcion: 'Pendiente de repuestos hidráulicos',
      fechaEvento: new Date(Date.now() - 2 * 86_400_000),
    },
  });

  await prisma.repuesto.create({
    data: {
      idOT: ot12.id,
      descripcion: 'Bomba hidráulica principal Komatsu PC200',
      cantidad: 1,
      unidad: 'unidad',
      origen: OrigenRepuesto.KOMATSU,
      estado: EstadoRepuesto.EN_TRANSITO,
    },
  });
  await prisma.repuesto.create({
    data: {
      idOT: ot12.id,
      descripcion: 'Kit de mangueras hidráulicas alta presión',
      cantidad: 4,
      unidad: 'unidad',
      origen: OrigenRepuesto.TALLER,
      costo: 450000,
      estado: EstadoRepuesto.PENDIENTE,
    },
  });

  // OT 1.3 Eléctrico — LISTO_PARA_ENTREGA
  const ot13 = await prisma.ordenTrabajo.create({
    data: {
      idTaller: tallerNorte.id,
      idOrdenServicio: os1.id,
      idVehiculo: vehKomatsuPC200.id,
      idTecnico: tecnico1.id,
      numeroOT: nextOT(tallerNorte.id),
      estado: EstadoOT.LISTO_PARA_ENTREGA,
      frente: 'Eléctrico',
      tipoServicio: TipoServicio.MANTENCION_CORRECTIVA,
      descripcion: 'Reemplazo de baterías y revisión del cableado del arnés',
    },
  });
  await prisma.logEstadoOT.create({
    data: {
      idOT: ot13.id,
      idUsuario: supervisor.id,
      tipoEvento: TipoEventoLog.CREACION_OT,
      estadoNuevo: EstadoOT.INGRESADO,
      descripcion: `OT creada (frente: Eléctrico)`,
      fechaEvento: new Date(Date.now() - 4 * 86_400_000),
    },
  });
  await prisma.logEstadoOT.create({
    data: {
      idOT: ot13.id,
      idUsuario: tecnico1.id,
      tipoEvento: TipoEventoLog.CAMBIO_ESTADO,
      estadoAnterior: EstadoOT.INGRESADO,
      estadoNuevo: EstadoOT.EN_EJECUCION,
      descripcion: 'Reemplazo de baterías iniciado',
      fechaEvento: new Date(Date.now() - 3 * 86_400_000),
    },
  });
  await prisma.logEstadoOT.create({
    data: {
      idOT: ot13.id,
      idUsuario: tecnico1.id,
      tipoEvento: TipoEventoLog.CAMBIO_ESTADO,
      estadoAnterior: EstadoOT.EN_EJECUCION,
      estadoNuevo: EstadoOT.LISTO_PARA_ENTREGA,
      descripcion: 'Frente eléctrico finalizado',
      fechaEvento: new Date(Date.now() - 1 * 86_400_000),
    },
  });

  // Tarea adicional en OT 1.3
  await prisma.tareaAdicional.create({
    data: {
      idOT: ot13.id,
      idUsuario: tecnico1.id,
      descripcion: 'Reemplazo no contemplado de fusibles principales por corrosión',
      componente: 'Sistema Eléctrico',
      tipoTrabajo: 'Reemplazo',
      momentoRegistro: EstadoOT.EN_EJECUCION,
      costo: 85000,
    },
  });
  await prisma.logEstadoOT.create({
    data: {
      idOT: ot13.id,
      idUsuario: tecnico1.id,
      tipoEvento: TipoEventoLog.REGISTRO_TAREA_ADICIONAL,
      descripcion: 'Tarea adicional registrada: reemplazo de fusibles principales',
      fechaEvento: new Date(Date.now() - 2 * 86_400_000),
    },
  });

  console.log(`  ✓ OS-1 creada con 3 OTs paralelas (Komatsu PC200)`);

  // ─── OS-002 Norte: Komatsu HD785 — ABIERTA con 1 OT INGRESADO ─────────────
  const os2 = await prisma.ordenServicio.create({
    data: {
      idTaller: tallerNorte.id,
      idVehiculo: vehKomatsuHD785.id,
      numeroOS: nextOS(tallerNorte.id),
      estado: EstadoOS.ABIERTA,
      kilometrajeIngreso: 38400,
      motivoIngreso: 'Inspección general post-llegada de faena',
      fechaIngreso: new Date(Date.now() - 1 * 86_400_000),
    },
  });
  await prisma.logEstadoOS.create({
    data: {
      idOrdenServicio: os2.id,
      idUsuario: jefe.id,
      tipoEvento: TipoEventoLogOS.CREACION_OS,
      estadoNuevo: EstadoOS.ABIERTA,
      descripcion: `OS creada por ${jefe.email}`,
      comentario: os2.motivoIngreso,
      fechaEvento: new Date(Date.now() - 1 * 86_400_000),
    },
  });
  const ot21 = await prisma.ordenTrabajo.create({
    data: {
      idTaller: tallerNorte.id,
      idOrdenServicio: os2.id,
      idVehiculo: vehKomatsuHD785.id,
      numeroOT: nextOT(tallerNorte.id),
      estado: EstadoOT.INGRESADO,
      frente: 'Inspección general',
      tipoServicio: TipoServicio.INSPECCION,
      descripcion: 'Diagnóstico completo del equipo',
    },
  });
  await prisma.logEstadoOT.create({
    data: {
      idOT: ot21.id,
      idUsuario: jefe.id,
      tipoEvento: TipoEventoLog.CREACION_OT,
      estadoNuevo: EstadoOT.INGRESADO,
      descripcion: 'OT creada (frente: Inspección general)',
      fechaEvento: new Date(Date.now() - 1 * 86_400_000),
    },
  });
  console.log(`  ✓ OS-2 creada (Komatsu HD785, recién ingresada)`);

  // ─── OS-003 Norte: Caterpillar 797F — LISTA_PARA_ENTREGA con 2 OTs ───────
  const os3 = await prisma.ordenServicio.create({
    data: {
      idTaller: tallerNorte.id,
      idVehiculo: vehCat797F.id,
      numeroOS: nextOS(tallerNorte.id),
      estado: EstadoOS.LISTA_PARA_ENTREGA,
      kilometrajeIngreso: 28100,
      motivoIngreso: 'Mantención preventiva 250 horas + revisión frenos',
      fechaIngreso: new Date(Date.now() - 6 * 86_400_000),
    },
  });
  await prisma.logEstadoOS.create({
    data: {
      idOrdenServicio: os3.id,
      idUsuario: supervisor.id,
      tipoEvento: TipoEventoLogOS.CREACION_OS,
      estadoNuevo: EstadoOS.ABIERTA,
      descripcion: `OS creada por ${supervisor.email}`,
      fechaEvento: new Date(Date.now() - 6 * 86_400_000),
    },
  });
  await prisma.logEstadoOS.create({
    data: {
      idOrdenServicio: os3.id,
      idUsuario: supervisor.id,
      tipoEvento: TipoEventoLogOS.CAMBIO_ESTADO_OS,
      estadoAnterior: EstadoOS.EN_SERVICIO,
      estadoNuevo: EstadoOS.LISTA_PARA_ENTREGA,
      descripcion: 'Estado de OS recalculado: EN_SERVICIO → LISTA_PARA_ENTREGA',
      fechaEvento: new Date(Date.now() - 1 * 86_400_000),
    },
  });

  const ot31 = await prisma.ordenTrabajo.create({
    data: {
      idTaller: tallerNorte.id,
      idOrdenServicio: os3.id,
      idVehiculo: vehCat797F.id,
      idTecnico: tecnico1.id,
      numeroOT: nextOT(tallerNorte.id),
      estado: EstadoOT.LISTO_PARA_ENTREGA,
      frente: 'Mantención preventiva',
      tipoServicio: TipoServicio.MANTENCION_PREVENTIVA,
      descripcion: 'Cambio de filtros, lubricantes y revisión general',
    },
  });
  const ot32 = await prisma.ordenTrabajo.create({
    data: {
      idTaller: tallerNorte.id,
      idOrdenServicio: os3.id,
      idVehiculo: vehCat797F.id,
      idTecnico: tecnico2.id,
      numeroOT: nextOT(tallerNorte.id),
      estado: EstadoOT.LISTO_PARA_ENTREGA,
      frente: 'Frenos',
      tipoServicio: TipoServicio.MANTENCION_CORRECTIVA,
      descripcion: 'Reemplazo de pastillas y revisión del sistema de frenos',
    },
  });
  for (const ot of [ot31, ot32]) {
    await prisma.logEstadoOT.create({
      data: {
        idOT: ot.id,
        idUsuario: supervisor.id,
        tipoEvento: TipoEventoLog.CREACION_OT,
        estadoNuevo: EstadoOT.INGRESADO,
        descripcion: `OT creada (frente: ${ot.frente})`,
        fechaEvento: new Date(Date.now() - 6 * 86_400_000),
      },
    });
    await prisma.logEstadoOT.create({
      data: {
        idOT: ot.id,
        idUsuario: ot.idTecnico!,
        tipoEvento: TipoEventoLog.CAMBIO_ESTADO,
        estadoAnterior: EstadoOT.INGRESADO,
        estadoNuevo: EstadoOT.LISTO_PARA_ENTREGA,
        descripcion: `Frente ${ot.frente} finalizado y listo para entrega`,
        fechaEvento: new Date(Date.now() - 1 * 86_400_000),
      },
    });
  }
  console.log(`  ✓ OS-3 creada (Caterpillar 797F, lista para entrega)`);

  // ─── OS-001 Sur: Komatsu WA600 ────────────────────────────────────────────
  const osSur = await prisma.ordenServicio.create({
    data: {
      idTaller: tallerSur.id,
      idVehiculo: vehKomatsuWA600.id,
      numeroOS: nextOS(tallerSur.id),
      estado: EstadoOS.EN_SERVICIO,
      kilometrajeIngreso: 18900,
      motivoIngreso: 'Reparación de transmisión',
      fechaIngreso: new Date(Date.now() - 2 * 86_400_000),
    },
  });
  await prisma.logEstadoOS.create({
    data: {
      idOrdenServicio: osSur.id,
      idUsuario: jefeSur.id,
      tipoEvento: TipoEventoLogOS.CREACION_OS,
      estadoNuevo: EstadoOS.ABIERTA,
      descripcion: `OS creada por ${jefeSur.email}`,
      fechaEvento: new Date(Date.now() - 2 * 86_400_000),
    },
  });
  const otSur = await prisma.ordenTrabajo.create({
    data: {
      idTaller: tallerSur.id,
      idOrdenServicio: osSur.id,
      idVehiculo: vehKomatsuWA600.id,
      numeroOT: nextOT(tallerSur.id),
      estado: EstadoOT.EN_EVALUACION,
      frente: 'Transmisión',
      tipoServicio: TipoServicio.REPARACION_MAYOR,
      descripcion: 'Diagnóstico de falla en transmisión hidromecánica',
    },
  });
  await prisma.logEstadoOT.create({
    data: {
      idOT: otSur.id,
      idUsuario: jefeSur.id,
      tipoEvento: TipoEventoLog.CREACION_OT,
      estadoNuevo: EstadoOT.INGRESADO,
      descripcion: 'OT creada (frente: Transmisión)',
      fechaEvento: new Date(Date.now() - 2 * 86_400_000),
    },
  });
  await prisma.logEstadoOT.create({
    data: {
      idOT: otSur.id,
      idUsuario: jefeSur.id,
      tipoEvento: TipoEventoLog.CAMBIO_ESTADO,
      estadoAnterior: EstadoOT.INGRESADO,
      estadoNuevo: EstadoOT.EN_EVALUACION,
      descripcion: 'Iniciada evaluación de transmisión',
      fechaEvento: new Date(Date.now() - 1 * 86_400_000),
    },
  });
  console.log(`  ✓ OS Sur creada (Komatsu WA600)`);

  // ─── Resumen ───────────────────────────────────────────────────────────────
  console.log('\n✅ Seed completado!');
  console.log(`   Talleres: 2`);
  console.log(`   Usuarios: ${usersNorte.length + 1}`);
  console.log(`   Clientes: 3`);
  console.log(`   Vehículos: 4`);
  console.log(`   Órdenes de Servicio: 4 (3 Norte + 1 Sur)`);
  console.log(`   Órdenes de Trabajo: 7 (6 Norte + 1 Sur)`);
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
