/**
 * Script de migración: crea registros Cliente desde los strings vehiculo.cliente existentes
 * y vincula cada vehículo con su Cliente.
 *
 * Ejecutar: cd apps/api && npx ts-node prisma/migrate-clientes.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Migrando clientes desde vehiculo.cliente...');

  // 1. Obtener combinaciones únicas (idTaller, cliente)
  const distinct = await prisma.$queryRaw<{ id_taller: string; cliente: string }[]>`
    SELECT DISTINCT id_taller, TRIM(cliente) as cliente
    FROM vehiculo
    WHERE cliente IS NOT NULL AND TRIM(cliente) != ''
  `;

  console.log(`  ${distinct.length} clientes únicos encontrados`);

  let created = 0;
  let linked = 0;

  for (const row of distinct) {
    // 2. Crear Cliente si no existe
    const existing = await prisma.cliente.findUnique({
      where: { idTaller_nombre: { idTaller: row.id_taller, nombre: row.cliente } },
    });

    let clienteId: string;
    if (existing) {
      clienteId = existing.id;
    } else {
      const nuevo = await prisma.cliente.create({
        data: { idTaller: row.id_taller, nombre: row.cliente },
      });
      clienteId = nuevo.id;
      created++;
      console.log(`  + Cliente creado: "${row.cliente}"`);
    }

    // 3. Vincular vehículos
    const result = await prisma.vehiculo.updateMany({
      where: {
        idTaller: row.id_taller,
        cliente: row.cliente,
        idCliente: null,
      },
      data: { idCliente: clienteId },
    });
    linked += result.count;
  }

  console.log(`\nMigración completada:`);
  console.log(`  Clientes creados: ${created}`);
  console.log(`  Vehículos vinculados: ${linked}`);
}

main()
  .catch((e) => {
    console.error('Error en migración:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
